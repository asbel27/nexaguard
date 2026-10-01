/* =====================================================================
   NexaGuard · Escáner remoto de sitios WordPress (SOLO LECTURA)
   ---------------------------------------------------------------------
   - Sin dependencias: necesita Node.js 18 o superior.
   - Cada resultado sale de una petición real al sitio analizado.
     Si una comprobación no se puede hacer, se informa como "no verificada".
   - No modifica nada, no prueba contraseñas ni ejecuta exploits.
   - Un escáner remoto solo ve lo que es público. NO puede leer los archivos
     dentro del servidor (eso lo hace un plugin instalado, como Wordfence).

   Módulo del escáner (lo usa server.js). Variables de entorno: ver bloque CFG.
   ===================================================================== */
'use strict';

const http = require('http');
const https = require('https');
const dns = require('dns').promises;
const net = require('net');
const tls = require('tls');
const fs = require('fs');
const path = require('path');

const CFG = {
  port: +process.env.PORT || 8787,
  host: process.env.HOST || '0.0.0.0',
  // Orígenes (páginas web) autorizados a usar el escáner. Ej: "https://tudominio.com,https://www.tudominio.com"
  // El propio dominio donde corre este servidor siempre está permitido. Usa "*" para permitir todos.
  allowedOrigins: (process.env.ALLOWED_ORIGINS || '').split(',').map(s => s.trim()).filter(Boolean),
  ratePerHour: +process.env.RATE_PER_HOUR || 8,        // análisis por IP y hora
  maxConcurrent: +process.env.MAX_CONCURRENT || 4,     // análisis simultáneos
  safeBrowsingKey: process.env.SAFE_BROWSING_KEY || '', // clave de Google Safe Browsing (opcional)
  enableDnsbl: process.env.ENABLE_DNSBL !== '0',        // consulta Spamhaus DBL
  trustProxy: process.env.TRUST_PROXY === '1',          // usar X-Forwarded-For (detrás de nginx/Cloudflare)
  wpApi: (process.env.WP_API_BASE || 'https://api.wordpress.org').replace(/\/$/, ''),
  staticDir: process.env.STATIC_DIR || path.join(__dirname, 'public'),
  allowPrivate: process.env.PARCHE_ALLOW_PRIVATE === '1', // SOLO para pruebas locales. No activar en producción.
  // DNS público para resolver los dominios (ignora el DNS, VPN o archivo hosts de este equipo). Usa DNS_SERVERS=off para desactivarlo.
  dnsServers: (process.env.DNS_SERVERS || '1.1.1.1,8.8.8.8').split(',').map(x => x.trim()).filter(x => x && x !== 'off'),
  timeoutMs: 12000,
  maxBody: 1500000,
  totalBudgetMs: 110000
};

const UA_CHROME = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36';
const UA_BOT = 'Mozilla/5.0 (compatible; Googlebot/2.1; +http://www.google.com/bot.html)';
const UA_SCAN = 'NexaGuardScanner/1.0';

/* ============================ Red segura ============================ */
const BLOCK = new net.BlockList();
[['0.0.0.0', 8], ['10.0.0.0', 8], ['100.64.0.0', 10], ['127.0.0.0', 8], ['169.254.0.0', 16], ['172.16.0.0', 12],
 ['192.0.0.0', 24], ['192.0.2.0', 24], ['192.88.99.0', 24], ['192.168.0.0', 16], ['198.18.0.0', 15],
 ['198.51.100.0', 24], ['203.0.113.0', 24], ['224.0.0.0', 4], ['240.0.0.0', 4]]
  .forEach(([a, p]) => BLOCK.addSubnet(a, p, 'ipv4'));
[['::', 128], ['::1', 128], ['fc00::', 7], ['fe80::', 10], ['ff00::', 8], ['2001:db8::', 32],
 ['64:ff9b::', 96], ['2002::', 16], ['2001::', 32]]
  .forEach(([a, p]) => BLOCK.addSubnet(a, p, 'ipv6'));

/* Extrae la IPv4 de una dirección IPv6 "mapeada" (::ffff:a.b.c.d o ::ffff:7f00:1). */
function unmapIp(ip) {
  const v = String(ip).toLowerCase();
  let m = /^::ffff:(\d{1,3}(?:\.\d{1,3}){3})$/.exec(v);
  if (m) return m[1];
  m = /^(?:0:0:0:0:0:ffff|::ffff):([0-9a-f]{1,4}):([0-9a-f]{1,4})$/.exec(v);
  if (m) { const a = parseInt(m[1], 16), b = parseInt(m[2], 16); return [a >> 8, a & 255, b >> 8, b & 255].join('.'); }
  return ip;
}

function isPublicIp(ip) {
  if (CFG.allowPrivate) return true;
  ip = unmapIp(ip);
  const f = net.isIP(ip);
  if (!f) return false;
  return !BLOCK.check(ip, f === 4 ? 'ipv4' : 'ipv6');
}

const publicResolver = (() => {
  if (!CFG.dnsServers.length) return null;
  try { const r = new dns.Resolver({ timeout: 2500, tries: 1 }); r.setServers(CFG.dnsServers); return r; } catch { return null; }
})();
const dnsCache = new Map();

/* Devuelve { addrs: [públicas], blocked: [privadas] }. Solo se conectará a las públicas. */
async function resolveHost(host) {
  if (net.isIP(host)) { const ok = isPublicIp(host); return { addrs: ok ? [{ address: host, family: net.isIP(host) }] : [], blocked: ok ? [] : [host] }; }
  const c = dnsCache.get(host);
  if (c && Date.now() - c.t < 300000) return c.v;
  let all = [];
  if (publicResolver && !CFG.allowPrivate) {
    const [a4, a6] = await Promise.allSettled([publicResolver.resolve4(host), publicResolver.resolve6(host)]);
    if (a4.status === 'fulfilled') all.push(...a4.value.map(address => ({ address, family: 4 })));
    if (a6.status === 'fulfilled') all.push(...a6.value.map(address => ({ address, family: 6 })));
  }
  if (!all.length) all = await dns.lookup(host, { all: true });   // sin respuesta del DNS público: usamos el del sistema
  if (!all.length) { const e = new Error('nodata'); e.code = 'ENODATA'; throw e; }
  const addrs = all.filter(a => isPublicIp(a.address)).sort((a, b) => a.family - b.family);
  const blocked = all.filter(a => !isPublicIp(a.address)).map(a => a.address);
  const v = { addrs, blocked };
  dnsCache.set(host, { t: Date.now(), v });
  if (dnsCache.size > 500) dnsCache.delete(dnsCache.keys().next().value);
  return v;
}

function privateMsg(host, ips) {
  const local = host === 'localhost' || net.isIP(host) || /\.(local|localhost|test|internal|lan|home|corp|invalid)$/i.test(host);
  const list = ips && ips.length ? ' (' + [...new Set(ips)].slice(0, 3).join(', ') + ')' : '';
  if (local) return 'Esa dirección es de una red privada o de tu propio equipo' + list + '. El escáner solo analiza sitios públicos en internet. Si es un WordPress local (XAMPP, Local, Laragon…), publícalo primero o prueba con un sitio que ya esté en línea.';
  return 'El dominio ' + host + ' apunta a una dirección privada' + list + ', por eso no es accesible desde internet. Si el sitio es público, revisa que el DNS del dominio apunte a la IP correcta de su servidor.';
}

const TLS_ERRS = new Set(['CERT_HAS_EXPIRED', 'DEPTH_ZERO_SELF_SIGNED_CERT', 'SELF_SIGNED_CERT_IN_CHAIN', 'UNABLE_TO_VERIFY_LEAF_SIGNATURE',
  'UNABLE_TO_GET_ISSUER_CERT_LOCALLY', 'ERR_TLS_CERT_ALTNAME_INVALID', 'CERT_NOT_YET_VALID', 'CERT_UNTRUSTED', 'HOSTNAME_MISMATCH']);

function parseTarget(raw) {
  raw = String(raw || '').trim();
  if (!raw || raw.length > 255) return { error: 'La dirección no es válida.' };
  const assumed = !/^[a-z][a-z0-9+.-]*:\/\//i.test(raw);
  if (assumed) raw = 'https://' + raw;
  let u;
  try { u = new URL(raw); } catch { return { error: 'La dirección no es válida.' }; }
  if (!['http:', 'https:'].includes(u.protocol)) return { error: 'Solo se permiten direcciones http o https.' };
  if (u.username || u.password) return { error: 'La dirección no puede incluir usuario ni contraseña.' };
  const port = u.port ? +u.port : (u.protocol === 'https:' ? 443 : 80);
  if (!CFG.allowPrivate && ![80, 443].includes(port)) return { error: 'Solo se permiten los puertos 80 y 443.' };
  const host = u.hostname.toLowerCase().replace(/\.$/, '');
  const domainOk = /^(?=.{1,253}$)([a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?\.)+[a-z0-9-]{2,63}$/.test(host);
  if (host === 'localhost' && !CFG.allowPrivate) return { error: privateMsg(host, []) };
  if (!net.isIP(host) && !domainOk && !(CFG.allowPrivate && host === 'localhost')) return { error: 'El dominio no parece válido.' };
  let p = u.pathname.replace(/\/+$/, '');
  if (!/^(\/[A-Za-z0-9._~%-]+)*$/.test(p) || p.includes('..')) p = '';
  const origin = u.protocol + '//' + u.host;
  return { scheme: u.protocol, host, port, origin, base: origin + p, path: p, assumed };
}

/* Una petición HTTP con IP validada y fijada (evita SSRF y DNS rebinding). */
async function requestOnce(urlStr, o) {
  const out = { status: 0, headers: {}, buf: Buffer.alloc(0), body: '', truncated: false, ms: 0, ttfb: 0, error: null, tlsError: null, url: urlStr };
  const t0 = Date.now();
  let u;
  try { u = new URL(urlStr); } catch { out.error = 'URL inválida'; return out; }
  if (!['http:', 'https:'].includes(u.protocol) || u.username || u.password) { out.error = 'URL no permitida'; return out; }
  const port = u.port ? +u.port : (u.protocol === 'https:' ? 443 : 80);
  if (!CFG.allowPrivate && ![80, 443].includes(port)) { out.error = 'Puerto no permitido'; return out; }
  const hostname = u.hostname.replace(/^\[|\]$/g, '');
  let rr;
  try { rr = await resolveHost(hostname); } catch (e) {
    out.error = (e.code === 'ENOTFOUND' || e.code === 'ENODATA') ? 'El dominio no existe o no se puede resolver' : 'Error de DNS (' + (e.code || e.message) + ')';
    return out;
  }
  if (!rr.addrs.length) { out.error = 'La dirección apunta a una red privada o no permitida'; out.blocked = true; out.blockedIps = rr.blocked; return out; }
  const a = rr.addrs[0];
  const lib = u.protocol === 'https:' ? https : http;
  const headers = Object.assign({
    'User-Agent': o.ua || UA_CHROME,
    'Accept': o.accept || 'text/html,application/xhtml+xml,*/*;q=0.8',
    'Accept-Language': 'es-ES,es;q=0.9,en;q=0.8',
    'Accept-Encoding': 'identity',
    'Connection': 'close'
  }, o.headers || {});
  if (o.referer) headers.Referer = o.referer;
  if (o.range) headers.Range = 'bytes=' + o.range[0] + '-' + o.range[1];
  if (o.body) headers['Content-Length'] = Buffer.byteLength(o.body);
  const timeout = o.timeoutMs || CFG.timeoutMs;
  const max = o.max || CFG.maxBody;

  return new Promise(resolve => {
    const chunks = []; let size = 0, finished = false, req;
    const finish = () => {
      if (finished) return; finished = true; clearTimeout(kill);
      out.buf = Buffer.concat(chunks); out.body = out.buf.toString('utf8'); out.ms = Date.now() - t0; resolve(out);
    };
    const kill = setTimeout(() => { out.error = out.error || 'Tiempo de espera agotado'; try { req.destroy(); } catch {} finish(); }, timeout + 3000);
    req = lib.request({
      method: o.method || 'GET', hostname, port, path: u.pathname + u.search, headers,
      rejectUnauthorized: o.verify !== false, servername: net.isIP(hostname) ? undefined : hostname, timeout,
      lookup: (h, op, cb) => (op && op.all) ? cb(null, [{ address: a.address, family: a.family }]) : cb(null, a.address, a.family)
    }, res => {
      out.status = res.statusCode; out.ttfb = Date.now() - t0;
      for (const [k, v] of Object.entries(res.headers)) out.headers[k] = Array.isArray(v) ? v.join(', ') : String(v);
      res.on('data', d => {
        size += d.length;
        if (size > max) { chunks.push(d.subarray(0, d.length - (size - max))); out.truncated = true; res.destroy(); finish(); return; }
        chunks.push(d);
      });
      res.on('end', finish); res.on('close', finish);
      res.on('error', e => { if (!out.truncated) out.error = e.code || e.message; finish(); });
    });
    req.on('timeout', () => { out.error = 'Tiempo de espera agotado'; req.destroy(); });
    req.on('error', e => {
      if (!out.truncated) { out.error = e.code || e.message; if (TLS_ERRS.has(e.code)) out.tlsError = e.code; }
      finish();
    });
    if (o.body) req.write(o.body);
    req.end();
  });
}

async function request(urlStr, o = {}) {
  o = Object.assign({}, o);
  const hops = []; let cur = urlStr, r, tlsProblem = null;
  const maxR = o.redirects || 0;
  for (let i = 0; i <= maxR; i++) {
    r = await requestOnce(cur, o);
    if (r.tlsError && o.verify !== false) {   // certificado inválido: seguimos sin verificar, pero lo anotamos
      tlsProblem = r.tlsError; o.verify = false; r = await requestOnce(cur, o);
    }
    if (r.error || ![301, 302, 303, 307, 308].includes(r.status) || !r.headers.location) break;
    let next; try { next = new URL(r.headers.location, cur).toString(); } catch { break; }
    hops.push({ from: cur, status: r.status, to: next });
    cur = next;
  }
  r.hops = hops; r.final = cur; r.tlsProblem = tlsProblem;
  return r;
}

function certInfo(host, ip) {
  return new Promise(resolve => {
    let done = false;
    const fin = v => { if (!done) { done = true; try { sock.destroy(); } catch {} resolve(v); } };
    const sock = tls.connect({ host: ip, port: 443, servername: host, rejectUnauthorized: false, timeout: 8000 }, () => {
      try {
        const c = sock.getPeerCertificate();
        if (!c || !c.valid_to) return fin({ ok: false, error: 'sin certificado' });
        fin({
          ok: true, authorized: sock.authorized, authError: sock.authorizationError ? String(sock.authorizationError.code || sock.authorizationError) : null,
          validTo: new Date(c.valid_to), validFrom: new Date(c.valid_from),
          issuer: (c.issuer && (c.issuer.O || c.issuer.CN)) || '', cn: (c.subject && c.subject.CN) || ''
        });
      } catch (e) { fin({ ok: false, error: e.message }); }
    });
    sock.on('error', e => fin({ ok: false, error: e.code || e.message }));
    sock.on('timeout', () => fin({ ok: false, error: 'timeout' }));
  });
}

/* ============================ Utilidades HTML ============================ */
function parseAttrs(str) {
  const attrs = {}, re = /([a-zA-Z_:][-a-zA-Z0-9_:.]*)\s*(?:=\s*(?:"([^"]*)"|'([^']*)'|([^\s"'>]+)))?/g;
  let m;
  while ((m = re.exec(str))) attrs[m[1].toLowerCase()] = m[2] !== undefined ? m[2] : (m[3] !== undefined ? m[3] : (m[4] !== undefined ? m[4] : ''));
  return attrs;
}
function tagsOf(html, name) {
  const out = [], re = new RegExp('<' + name + '\\b([^>]*)>', 'gi'); let m;
  while ((m = re.exec(html))) out.push({ attrs: parseAttrs(m[1]), index: m.index });
  return out;
}
function scriptsOf(html) {
  const out = [], re = /<script\b([^>]*)>([\s\S]*?)<\/script>/gi; let m;
  while ((m = re.exec(html))) { const a = parseAttrs(m[1]); out.push({ src: a.src || '', inline: a.src ? '' : m[2], attrs: a }); }
  return out;
}
function textOf(html) {
  return html.replace(/<!--[\s\S]*?-->/g, ' ').replace(/<(script|style|noscript)\b[\s\S]*?<\/\1>/gi, ' ').replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/g, ' ').replace(/&amp;/g, '&').replace(/&quot;/g, '"').replace(/&#0?39;/g, "'").replace(/\s+/g, ' ').trim();
}
function titleOf(html) { const m = /<title[^>]*>([\s\S]*?)<\/title>/i.exec(html); return m ? textOf(m[1]) : ''; }
function metaOf(html, name) {
  for (const t of tagsOf(html, 'meta')) if ((t.attrs.name || t.attrs.property || '').toLowerCase() === name) return t.attrs.content || '';
  return '';
}
function langOf(html) { const m = /<html[^>]*\blang\s*=\s*["']?([a-zA-Z-]+)/i.exec(html); return m ? m[1].toLowerCase() : ''; }
function hostOf(u, base) { try { return new URL(u, base).hostname.toLowerCase(); } catch { return ''; } }
const sameSite = (h, site) => h.replace(/^www\./, '') === site.replace(/^www\./, '');
function snippet(s, n = 140) { return String(s).replace(/[\u0000-\u001f\u007f]+/g, ' ').replace(/\s+/g, ' ').trim().slice(0, n); }

function hiddenBlocks(html) {   // bloques ocultos (display:none, fuera de pantalla…) con su contenido
  const blocks = [];
  const re = /<(div|span|p|ul|ol|section|aside|footer|nav|li|font|center|small)\b([^>]*style\s*=\s*["'][^"']*(?:display\s*:\s*none|visibility\s*:\s*hidden|left\s*:\s*-\d{3,}|top\s*:\s*-\d{3,}|text-indent\s*:\s*-\d{3,}|height\s*:\s*0(?:px)?\s*;[^"']*overflow\s*:\s*hidden)[^"']*["'][^>]*)>/gi;
  let m, guard = 0;
  while ((m = re.exec(html)) && guard++ < 60) {
    const tag = m[1].toLowerCase(), start = re.lastIndex, openRe = new RegExp('<' + tag + '\\b', 'gi'), closeRe = new RegExp('</' + tag + '\\s*>', 'gi');
    let depth = 1, pos = start, end = Math.min(html.length, start + 30000);
    while (depth > 0 && pos < end) {
      openRe.lastIndex = pos; closeRe.lastIndex = pos;
      const o = openRe.exec(html), c = closeRe.exec(html);
      if (!c) { pos = end; break; }
      if (o && o.index < c.index) { depth++; pos = o.index + 1; } else { depth--; pos = c.index + 1; if (depth === 0) end = c.index; }
    }
    blocks.push(html.slice(start, Math.min(end, start + 30000)));
  }
  return blocks;
}

/* ============================ Firmas ============================ */
const SPAM_TERMS = ['viagra', 'cialis', 'levitra', 'kamagra', 'casino', 'poker', 'sportsbook', 'slot gacor', 'slot online', 'judi online', 'togel',
  'situs slot', 'maxwin', 'porn', 'xxx video', 'escort', 'payday loan', 'replica watches', 'fake rolex', 'cheap jerseys', 'weight loss pills',
  'keto gummies', 'forex robot', 'canadian pharmacy', 'online pharmacy', 'buy cheap', 'essay writing service', 'apuestas online', 'tragamonedas'];
const DEFACE_RE = /\b(hacked\s+by|defaced\s+by|owned\s+by\s+\w+|h4ck(?:3d|ed)\s+by|pwned\s+by|hacked\s+by\s+\w+)/i;
const CJK_RE = /[\u3040-\u30ff\u3400-\u4dbf\u4e00-\u9fff\uac00-\ud7af]/g;
const MINER_RE = /coinhive|coin-hive|cryptoloot|crypto-loot|authedmine|webminepool|minero\.cc|coinimp|jsecoin|monerominer|ppoi\.org|cryptonight/i;
const BAD_TLDS = /\.(xyz|top|tk|ml|ga|cf|gq|click|work|buzz|rest|monster|icu|cyou|zip|mov)$/i;
const KNOWN_HOSTS = ['google.com', 'googletagmanager.com', 'google-analytics.com', 'gstatic.com', 'googleapis.com', 'googleadservices.com', 'googlesyndication.com',
  'doubleclick.net', 'facebook.net', 'facebook.com', 'fbcdn.net', 'cloudflare.com', 'cloudflareinsights.com', 'jsdelivr.net', 'unpkg.com', 'jquery.com',
  'bootstrapcdn.com', 'fontawesome.com', 'wp.com', 'wordpress.com', 'wordpress.org', 'w.org', 'gravatar.com', 'youtube.com', 'youtube-nocookie.com', 'ytimg.com',
  'vimeo.com', 'hotjar.com', 'stripe.com', 'paypal.com', 'paypalobjects.com', 'recaptcha.net', 'hcaptcha.com', 'twitter.com', 'x.com', 'linkedin.com',
  'licdn.com', 'tiktok.com', 'pinterest.com', 'instagram.com', 'mailchimp.com', 'list-manage.com', 'hubspot.com', 'hs-scripts.com', 'hsforms.net', 'tawk.to',
  'crisp.chat', 'calendly.com', 'zdassets.com', 'klaviyo.com', 'shopify.com', 'cookiebot.com', 'consensu.org', 'trustpilot.com', 'jwpcdn.com', 'addthis.com',
  'sharethis.com', 'clarity.ms', 'bing.com', 'microsoft.com', 'typekit.net', 'adobe.com', 'akamaihd.net', 'cdn77.org', 'bunnycdn.com', 'b-cdn.net',
  'sentry.io', 'intercom.io', 'intercomcdn.com', 'segment.com', 'cdn.jsdelivr.net', 'stackpath.bootstrapcdn.com', 'elementor.com', 'wpengine.com'];
const isKnownHost = h => KNOWN_HOSTS.some(k => h === k || h.endsWith('.' + k));

function scanCode(code, label, inline) {
  const hits = [];
  const add = (sev, title, ev, detail) => hits.push({ sev, title, evidence: snippet(ev), detail, label });
  let m;
  if ((m = MINER_RE.exec(code))) add('crit', 'Minero de criptomonedas en el código', code.slice(Math.max(0, m.index - 30), m.index + 90), 'Se detectó una referencia a un servicio de minería de criptomonedas en el navegador. Es una infección habitual.');
  if ((m = /eval\s*\(\s*(?:atob|unescape)\s*\(|eval\s*\(\s*String\.fromCharCode/i.exec(code))) add('crit', 'Código oculto que se ejecuta con eval()', code.slice(m.index, m.index + 130), 'El código decodifica texto oculto y lo ejecuta. Es una técnica típica de malware inyectado.');
  const dw = /document\.write\s*\(\s*unescape\s*\(\s*(["'])((?:%[0-9a-fA-F]{2}){20,})\1/i.exec(code);
  if (dw) {
    let dec = ''; try { dec = decodeURIComponent(dw[2]); } catch {}
    if (!/google-analytics|googletagmanager/i.test(dec)) add(/<iframe|<script/i.test(dec) ? 'crit' : 'warn', 'Contenido codificado escrito en la página', dec || dw[0], 'Se escribe en la página un bloque de HTML codificado con unescape(). Suele usarse para esconder iframes o scripts.');
  }
  if (/eval\s*\(\s*function\s*\(\s*p\s*,\s*a\s*,\s*c\s*,\s*k\s*,\s*e\s*,\s*[dr]\s*\)/i.test(code)) add('warn', 'JavaScript empaquetado (packer)', 'eval(function(p,a,c,k,e,d)…', 'Código comprimido con packer. Existe en librerías legítimas, pero también lo usa el malware para esconderse.');
  const hexv = (code.match(/_0x[a-f0-9]{4,6}/g) || []);
  if (new Set(hexv).size >= 30) add('warn', 'JavaScript muy ofuscado', hexv.slice(0, 4).join(', ') + '…', 'Nombres de variables tipo _0x1a2b en gran cantidad: código ofuscado. Puede ser legítimo (protección de un tema) o malicioso.');
  if (/String\.fromCharCode\((?:\s*\d+\s*,){25,}/.test(code)) add('warn', 'Texto construido con códigos numéricos', 'String.fromCharCode(…)', 'Una lista larga de códigos de carácter arma texto en tiempo de ejecución: técnica usada para ocultar direcciones o código.');
  if (((code.match(/\\x[0-9a-fA-F]{2}/g) || []).length) >= 80) add('warn', 'Texto en hexadecimal (\\x..) en gran cantidad', '\\x…', 'Cadenas codificadas en hexadecimal: puede ocultar direcciones o instrucciones.');
  if (/atob\(\s*["'][A-Za-z0-9+/=]{300,}["']\s*\)/.test(code)) add('warn', 'Bloque grande en base64', 'atob("…")', 'Un bloque largo en base64 se decodifica en el navegador.');
  if (/document\.referrer/.test(code) && /(google|bing|yahoo|baidu|yandex)/i.test(code) && /(?:window\.|document\.|top\.|self\.)?location(?:\.href)?\s*=(?!=)|location\.(?:replace|assign)\s*\(/.test(code)) {
    const sev = (inline || code.length < 4000) ? 'crit' : 'warn';
    add(sev, 'Redirección condicionada al origen de la visita', 'document.referrer + location', 'El código redirige solo a quien llega desde buscadores. Así se esconde la infección del propietario.');
  }
  if (/<script[^>]+src\s*=\s*["']https?:\/\/\d{1,3}(?:\.\d{1,3}){3}/i.test(code)) add('warn', 'Script cargado desde una dirección IP', 'src="http://x.x.x.x/…"', 'Los scripts legítimos casi nunca se cargan desde una IP directa.');
  return hits;
}

/* ============================ Versiones y API de WordPress ============================ */
const cache = new Map();
async function apiJson(url) {
  const c = cache.get(url);
  if (c && Date.now() - c.t < 6 * 3600e3) return c.v;
  const r = await request(url, { timeoutMs: 9000, accept: 'application/json', ua: UA_SCAN });
  let v = null;
  if (!r.error && r.status === 200) { try { v = JSON.parse(r.body); } catch { v = null; } }
  cache.set(url, { t: Date.now(), v }); return v;
}
function vparts(v) { return String(v).match(/\d+/g)?.map(Number) || []; }
function vcmp(a, b) {
  const x = vparts(a), y = vparts(b), n = Math.max(x.length, y.length);
  for (let i = 0; i < n; i++) { const d = (x[i] || 0) - (y[i] || 0); if (d) return d < 0 ? -1 : 1; }
  return 0;
}
function parseWpDate(s) { const d = new Date(String(s || '').replace(/(\d)(am|pm)/i, '$1 $2')); return isNaN(d) ? null : d; }

/* ============================ Contexto de resultados ============================ */
function mkCtx(emit, isAborted) {
  const ctx = { emit, isAborted, cur: null, stageMax: {}, counts: { crit: 0, warn: 0, info: 0, ok: 0 }, infCrit: 0, infWarn: 0, meta: {}, partial: false };
  return ctx;
}
const SEVN = { ok: 0, info: 1, warn: 2, crit: 3 };
function stage(ctx, id, label) { if (ctx.isAborted()) throw new Error('aborted'); ctx.cur = id; ctx.stageMax[id] = -1; ctx.emit({ t: 'stage', id, label }); }
function endStage(ctx, forced) {
  const m = ctx.stageMax[ctx.cur], state = forced || (m < 0 ? 'ok' : ['ok', 'info', 'warn', 'crit'][m]);
  ctx.emit({ t: 'stage_done', id: ctx.cur, state });
}
function finding(ctx, sev, title, detail = '', fix = '', extra = {}) {
  const cat = extra.cat || 'risk';
  ctx.counts[sev]++; ctx.stageMax[ctx.cur] = Math.max(ctx.stageMax[ctx.cur], SEVN[sev]);
  if (cat === 'infection') { if (sev === 'crit') ctx.infCrit++; if (sev === 'warn') ctx.infWarn++; }
  ctx.emit({ t: 'finding', stage: ctx.cur, sev, cat, title, detail, fix, evidence: extra.evidence || '' });
}
const log = (ctx, msg) => ctx.emit({ t: 'log', msg });

/* ============================ ESCANEO ============================ */
async function runScan(target, emit, isAborted) {
  const ctx = mkCtx(emit, isAborted), T0 = Date.now();
  const over = () => Date.now() - T0 > CFG.totalBudgetMs;
  let base = target.base, scheme = target.scheme;
  const host = target.host;
  const get = (p, o = {}) => request(base + p, Object.assign({ timeoutMs: 6000 }, o));

  /* ---- 1. Conexión ---- */
  stage(ctx, 'reach', 'Conexión y respuesta');
  log(ctx, 'GET ' + base + '/');
  let main = await request(base + '/', { redirects: 5 });
  if (main.error && !main.status && !main.blocked && target.assumed && scheme === 'https:') {
    log(ctx, 'HTTPS no respondió (' + main.error + '). Probando con HTTP…');
    base = 'http://' + host + target.path; scheme = 'http:';
    emit({ t: 'hello', target: base });
    log(ctx, 'GET ' + base + '/');
    main = await request(base + '/', { redirects: 5 });
  }
  if (main.blocked) { emit({ t: 'error', message: privateMsg(host, main.blockedIps) }); return; }
  if (main.error && !main.status) { emit({ t: 'error', message: 'No pudimos conectar con el sitio: ' + main.error + '.' }); return; }
  log(ctx, '← HTTP ' + main.status + ' en ' + main.ms + ' ms');
  const html = main.body, finalHost = hostOf(main.final, base), finalUrl = main.final;
  ctx.meta.final_url = finalUrl;
  if (main.status >= 200 && main.status < 300) {
    finding(ctx, 'ok', 'El sitio responde (HTTP ' + main.status + ')', 'Tiempo total ' + (main.ms / 1000).toFixed(2) + ' s · primer byte ' + (main.ttfb / 1000).toFixed(2) + ' s.', '', { cat: 'info' });
  } else if ([401, 403, 406, 429, 503].includes(main.status)) {
    ctx.partial = true;
    finding(ctx, 'info', 'El sitio bloqueó o limitó al escáner (HTTP ' + main.status + ')', 'Un firewall (WAF) o una protección anti-bots puede estar impidiendo el análisis. Los resultados serán parciales.', 'Si eres el propietario, permite temporalmente al escáner en tu firewall.', { cat: 'info' });
  } else if (main.status === 404) {
    finding(ctx, 'warn', 'La página principal devuelve 404', 'El sitio responde, pero no encuentra su portada.', 'Revisa los enlaces permanentes y el archivo .htaccess.');
  } else if (main.status >= 500) {
    finding(ctx, 'warn', 'El sitio responde con error del servidor (HTTP ' + main.status + ')', 'Puede ser un error de PHP, un plugin en conflicto o un problema del hosting.', 'Activa el modo depuración y revisa el registro de errores.');
  }
  if (main.hops.length) {
    finding(ctx, 'info', 'Redirecciones (' + main.hops.length + ')', main.hops.map(h => h.status + ' → ' + h.to).join('\n'), '', { cat: 'info' });
    if (!sameSite(finalHost, host)) {
      finding(ctx, 'warn', 'La dirección termina en otro dominio (' + finalHost + ')', 'Tu dirección redirige a un dominio distinto. Si no lo configuraste tú, puede ser una redirección maliciosa.',
        'Revisa .htaccess, wp-config.php y las opciones siteurl/home en la base de datos.', { cat: 'infection' });
    }
  }
  const srv = (main.headers['server'] || '').toLowerCase();
  if (main.headers['cf-ray'] || srv.includes('cloudflare')) finding(ctx, 'info', 'El sitio está detrás de Cloudflare', '', '', { cat: 'info' });
  else if (main.headers['x-sucuri-id'] || main.headers['x-sucuri-cache']) finding(ctx, 'info', 'El sitio está detrás de un firewall Sucuri', '', '', { cat: 'info' });
  if (main.ttfb > 3000) finding(ctx, 'info', 'Respuesta lenta', 'El servidor tardó ' + (main.ttfb / 1000).toFixed(1) + ' s en empezar a responder.', 'Una respuesta lenta puede deberse a caché ausente, plugins pesados o procesos maliciosos.', { cat: 'info' });
  if (main.headers['content-type'] && !/html/i.test(main.headers['content-type'])) finding(ctx, 'info', 'La portada no es una página HTML', 'Tipo de contenido: ' + main.headers['content-type'], '', { cat: 'info' });
  endStage(ctx);

  /* ---- 2. HTTPS ---- */
  stage(ctx, 'tls', 'HTTPS y certificado');
  try {
    const finalHttps = finalUrl.startsWith('https:');
    if (net.isIP(host)) { finding(ctx, 'info', 'Se analizó una dirección IP', 'No se comprueba el certificado.', '', { cat: 'info' }); }
    else if (target.port !== 443 && CFG.allowPrivate) { finding(ctx, 'info', 'Puerto no estándar en modo de pruebas', '', '', { cat: 'info' }); }
    else {
      log(ctx, 'Comprobando certificado de ' + host + ':443');
      let ips = null; try { ips = await resolveHost(host); } catch {}
      const ci = ips && ips.addrs.length ? await certInfo(host, ips.addrs[0].address) : { ok: false, error: 'dns' };
      if (!ci.ok) {
        if (!finalHttps) finding(ctx, 'warn', 'El sitio no usa HTTPS', 'No hay un certificado SSL utilizable. Los navegadores marcan el sitio como "No seguro" y Google lo penaliza.', 'Instala un certificado gratuito (Let\'s Encrypt) y fuerza la redirección a HTTPS.');
        else finding(ctx, 'info', 'No pudimos leer el certificado', 'Motivo: ' + ci.error, '', { cat: 'info' });
      } else {
        const days = Math.floor((ci.validTo - Date.now()) / 864e5);
        const errMap = { CERT_HAS_EXPIRED: 'está vencido', DEPTH_ZERO_SELF_SIGNED_CERT: 'es autofirmado', SELF_SIGNED_CERT_IN_CHAIN: 'la cadena incluye un certificado autofirmado', ERR_TLS_CERT_ALTNAME_INVALID: 'no corresponde a este dominio', UNABLE_TO_VERIFY_LEAF_SIGNATURE: 'la cadena está incompleta', UNABLE_TO_GET_ISSUER_CERT_LOCALLY: 'no se reconoce la entidad emisora' };
        if (!ci.authorized) finding(ctx, 'crit', 'Certificado SSL no válido', 'El certificado ' + (errMap[ci.authError] || ('falló la verificación (' + ci.authError + ')')) + '. Los visitantes ven una advertencia de seguridad.', 'Renueva o reinstala el certificado en tu hosting.');
        else if (days < 0) finding(ctx, 'crit', 'Certificado SSL vencido', 'Venció el ' + ci.validTo.toISOString().slice(0, 10) + '.', 'Renueva el certificado en tu hosting.');
        else if (days < 14) finding(ctx, 'warn', 'El certificado vence en ' + days + ' días', 'Fecha de vencimiento: ' + ci.validTo.toISOString().slice(0, 10) + '.', 'Verifica que la renovación automática funcione.');
        else finding(ctx, 'ok', 'Certificado SSL válido', 'Emisor: ' + (ci.issuer || 'desconocido') + ' · vence en ' + days + ' días (' + ci.validTo.toISOString().slice(0, 10) + ').', '', { cat: 'info' });
        if (!finalHttps && scheme === 'http:') finding(ctx, 'warn', 'El sitio no redirige a HTTPS', 'Se puede entrar por http:// sin cifrado aunque el certificado existe.', 'Activa la redirección 301 de http a https.');
      }
    }
  } catch (e) { finding(ctx, 'info', 'No se pudo completar esta comprobación', e.message, '', { cat: 'info' }); }
  endStage(ctx);

  /* ---- 3. WordPress ---- */
  stage(ctx, 'wp', 'WordPress y versión');
  let isWP = /\/wp-(?:content|includes)\//i.test(html) || /<meta[^>]+name=["']generator["'][^>]+WordPress/i.test(html) || /api\.w\.org/i.test(html);
  let wpVer = '';
  try {
    if (!isWP && !ctx.partial) {
      log(ctx, 'GET /wp-json/');
      const wj = await get('/wp-json/', { max: 60000 });
      log(ctx, '← HTTP ' + wj.status);
      if (wj.status === 200 && /"namespaces"\s*:\s*\[[^\]]*"wp\/v2"/.test(wj.body)) isWP = true;
    }
    if (isWP) {
      let m = /<meta[^>]+name=["']generator["'][^>]+content=["']WordPress\s*([0-9][0-9.]*)/i.exec(html);
      if (m) { wpVer = m[1]; ctx.wpVerFromMeta = true; }
      if (!wpVer && (m = /wp-includes\/(?:js\/wp-(?:embed|emoji-release)\.min\.js|css\/dist\/block-library\/style\.min\.css|css\/classic-themes\.min\.css)\?ver=(\d+(?:\.\d+){1,2})/i.exec(html))) wpVer = m[1];
      if (!wpVer) {
        log(ctx, 'GET /readme.html');
        const rd = await get('/readme.html', { max: 30000 });
        log(ctx, '← HTTP ' + rd.status);
        if (rd.status === 200 && /wordpress/i.test(rd.body) && (m = /Version\s+(\d+\.\d+(?:\.\d+)?)/i.exec(rd.body))) wpVer = m[1];
      }
      ctx.meta.wp_version = wpVer || null;
      finding(ctx, 'ok', 'WordPress detectado' + (wpVer ? ' (versión ' + wpVer + ')' : ''), wpVer ? '' : 'No se pudo determinar la versión desde fuera.', '', { cat: 'info' });
      if (wpVer) {
        log(ctx, 'Consultando la última versión en api.wordpress.org');
        const j = await apiJson(CFG.wpApi + '/core/version-check/1.7/');
        const latest = j && j.offers && j.offers[0] && j.offers[0].current;
        if (!latest) finding(ctx, 'info', 'No se pudo comprobar si WordPress está actualizado', 'No hubo respuesta de api.wordpress.org.', '', { cat: 'info' });
        else {
          ctx.meta.wp_latest = latest;
          const cmp = vcmp(wpVer, latest), p1 = vparts(wpVer), p2 = vparts(latest);
          if (cmp >= 0) finding(ctx, 'ok', 'WordPress está actualizado', 'Versión instalada ' + wpVer + ' · última versión ' + latest + '.', '', { cat: 'info' });
          else if (p1[0] !== p2[0] || p1[1] !== p2[1]) finding(ctx, 'warn', 'WordPress desactualizado (' + wpVer + ')', 'La última versión es ' + latest + '. Las versiones antiguas acumulan vulnerabilidades conocidas.', 'Haz una copia de seguridad y actualiza WordPress.');
          else finding(ctx, 'info', 'Hay una actualización menor de WordPress', 'Instalada ' + wpVer + ' · disponible ' + latest + '.', 'Las actualizaciones menores suelen incluir parches de seguridad.', { cat: 'info' });
        }
        if (ctx.wpVerFromMeta) finding(ctx, 'info', 'La versión de WordPress es visible públicamente', 'Aparece en la etiqueta generator del código de la página.', 'Ocultarla no reemplaza actualizar, pero le quita información al atacante.', { cat: 'info' });
      }
    } else {
      finding(ctx, 'info', 'No parece un sitio WordPress', 'No encontramos rastros de WordPress. Se omiten las comprobaciones específicas y se mantienen las generales.', '', { cat: 'info' });
    }
  } catch (e) { finding(ctx, 'info', 'No se pudo completar esta comprobación', e.message, '', { cat: 'info' }); }
  ctx.meta.is_wordpress = isWP;
  endStage(ctx);

  /* ---- 4. Plugins y temas ---- */
  stage(ctx, 'plugins', 'Plugins y temas');
  if (!isWP) { finding(ctx, 'info', 'Omitido: el sitio no parece WordPress', '', '', { cat: 'info' }); endStage(ctx, 'skipped'); }
  else {
    try {
      const plugins = [...new Set([...html.matchAll(/\/wp-content\/plugins\/([a-z0-9_-]+)\//gi)].map(m => m[1].toLowerCase()))].slice(0, 15);
      const themes = [...new Set([...html.matchAll(/\/wp-content\/themes\/([a-z0-9_-]+)\//gi)].map(m => m[1].toLowerCase()))].slice(0, 3);
      ctx.meta.plugins = []; ctx.meta.themes = [];
      let okCount = 0, unknown = 0;
      const stale = (d) => d && (Date.now() - d) > 730 * 864e5;
      for (const slug of plugins) {
        if (over()) break;
        log(ctx, 'Plugin detectado: ' + slug);
        let ver = '', how = '';
        const rd = await get('/wp-content/plugins/' + slug + '/readme.txt', { max: 8000, range: [0, 7999] });
        log(ctx, 'GET …/plugins/' + slug + '/readme.txt → ' + rd.status);
        let m = (rd.status === 200 || rd.status === 206) ? /^\s*Stable tag:\s*([0-9][0-9a-z.\-]*)/im.exec(rd.body) : null;
        if (m) { ver = m[1]; how = 'readme'; }
        else if ((m = new RegExp('/wp-content/plugins/' + slug + '/[^"\'\\s>]*?\\?ver=([0-9][0-9A-Za-z.\\-]*)', 'i').exec(html))) { ver = m[1]; how = 'aparente'; }
        const j = await apiJson(CFG.wpApi + '/plugins/info/1.0/' + slug + '.json');
        const entry = { slug, version: ver || null, latest: null };
        ctx.meta.plugins.push(entry);
        if (!j || j.error || !j.version) { unknown++; log(ctx, slug + ': no está en el repositorio oficial (no se puede verificar)'); continue; }
        entry.latest = j.version;
        const upd = parseWpDate(j.last_updated), name = j.name || slug;
        let bad = false;
        if (ver && vcmp(ver, j.version) < 0) {
          bad = true;
          finding(ctx, 'warn', 'Plugin desactualizado: ' + name, 'Versión ' + (how === 'aparente' ? 'aparente ' : 'instalada ') + ver + ' · última ' + j.version + '.', 'Actualiza el plugin (o elimínalo si no lo usas). Los plugins desactualizados son la puerta de entrada más común.');
        }
        if (stale(upd)) {
          bad = true;
          finding(ctx, 'warn', 'Plugin sin actualizaciones desde hace más de 2 años: ' + name, 'Última actualización: ' + upd.toISOString().slice(0, 10) + '.', 'Busca una alternativa mantenida: un plugin abandonado no recibe parches de seguridad.');
        }
        if (!bad) okCount++;
        if (!ver) log(ctx, slug + ': versión instalada no visible desde fuera');
      }
      for (const slug of themes) {
        if (over()) break;
        log(ctx, 'Tema detectado: ' + slug);
        const st = await get('/wp-content/themes/' + slug + '/style.css', { max: 8000, range: [0, 7999] });
        log(ctx, 'GET …/themes/' + slug + '/style.css → ' + st.status);
        const m = (st.status === 200 || st.status === 206) ? /^\s*(?:\/\*\s*)?Version:\s*([0-9][0-9a-z.\-]*)/im.exec(st.body) : null;
        const ver = m ? m[1] : '';
        const j = await apiJson(CFG.wpApi + '/themes/info/1.2/?action=theme_information&request[slug]=' + slug);
        ctx.meta.themes.push({ slug, version: ver || null, latest: (j && j.version) || null });
        if (!j || j.error || !j.version) { unknown++; continue; }
        if (ver && vcmp(ver, j.version) < 0) finding(ctx, 'warn', 'Tema desactualizado: ' + (j.name || slug), 'Versión instalada ' + ver + ' · última ' + j.version + '.', 'Actualiza el tema.');
        else okCount++;
      }
      const total = plugins.length + themes.length;
      if (!total) finding(ctx, 'info', 'No se detectaron plugins ni temas en el código público', 'Puede que el sitio use caché agresiva o que oculte las rutas.', '', { cat: 'info' });
      else finding(ctx, 'ok', total + ' componentes detectados (' + plugins.length + ' plugins, ' + themes.length + ' temas)',
        okCount + ' al día según el repositorio oficial' + (unknown ? ' · ' + unknown + ' no verificables (premium, a medida o sin versión visible)' : '') + '. Solo se comparan versiones; una versión al día no garantiza que no tenga fallos desconocidos.', '', { cat: 'info' });
    } catch (e) { finding(ctx, 'info', 'No se pudo completar esta comprobación', e.message, '', { cat: 'info' }); }
    endStage(ctx);
  }

  /* ---- 5. Código malicioso ---- */
  stage(ctx, 'malware', 'Código malicioso');
  try {
    const seen = new Set(), report = (h) => {
      const key = h.title + '|' + h.label; if (seen.has(key)) return; seen.add(key);
      finding(ctx, h.sev, h.title + (h.label ? ' — ' + h.label : ''), h.detail, 'Restaura el archivo desde una copia limpia o pídenos una limpieza. Cambia todas las contraseñas.', { cat: 'infection', evidence: h.evidence });
    };
    const scripts = scriptsOf(html);
    let filesScanned = 0;
    log(ctx, 'Analizando ' + scripts.filter(s => !s.src).length + ' scripts en línea');
    scripts.filter(s => !s.src && s.inline.trim()).forEach((s, i) => scanCode(s.inline, 'script en línea #' + (i + 1), true).forEach(report));
    const ext = [...new Set(scripts.filter(s => s.src).map(s => { try { return new URL(s.src, finalUrl).toString(); } catch { return ''; } }).filter(Boolean))];
    ext.forEach(u => { if (MINER_RE.test(u)) report({ sev: 'crit', title: 'Minero de criptomonedas en el código', label: hostOf(u), evidence: u, detail: 'La página carga un script de un servicio de minería de criptomonedas. Es una infección habitual.' }); });
    const own = ext.filter(u => sameSite(hostOf(u), finalHost) || sameSite(hostOf(u), host)).slice(0, 8);
    const third = ext.filter(u => !own.includes(u) && !isKnownHost(hostOf(u))).slice(0, 4);
    for (const u of [...own, ...third]) {
      if (over()) break;
      const r = await request(u, { timeoutMs: 8000, max: 400000, accept: '*/*', redirects: 2 });
      log(ctx, 'GET ' + u.replace(/^https?:\/\//, '').slice(0, 70) + ' → ' + (r.status || r.error));
      if (r.status === 200) { filesScanned++; scanCode(r.body, u.replace(/^https?:\/\/[^/]+/, '').slice(0, 60), false).forEach(report); }
    }
    // Recursos de otros dominios
    const hosts = new Map();
    ext.forEach(u => { const h = hostOf(u); if (h && !sameSite(h, finalHost) && !sameSite(h, host)) hosts.set(h, (hosts.get(h) || 0) + 1); });
    const odd = [...hosts.keys()].filter(h => !isKnownHost(h));
    const bad = odd.filter(h => BAD_TLDS.test(h) || net.isIP(h));
    if (bad.length) finding(ctx, 'warn', 'Scripts cargados desde dominios de riesgo', bad.join('\n'), 'Comprueba si los agregaste tú. Si no, elimínalos y limpia el sitio.', { cat: 'infection' });
    const rest = odd.filter(h => !bad.includes(h));
    if (rest.length) finding(ctx, 'info', 'Scripts de terceros para revisar (' + rest.length + ')', rest.join('\n'), 'No son necesariamente maliciosos. Confirma que reconoces cada uno.', { cat: 'info' });
    // Iframes, meta refresh, bloques ocultos
    for (const t of tagsOf(html, 'iframe')) {
      const src = t.attrs.src || '', h = hostOf(src, finalUrl), st = (t.attrs.style || '').toLowerCase();
      const hidden = /display\s*:\s*none|visibility\s*:\s*hidden|left\s*:\s*-\d{3,}|top\s*:\s*-\d{3,}|opacity\s*:\s*0(?![.\d])/.test(st) || +t.attrs.width <= 5 && t.attrs.width !== undefined || +t.attrs.height <= 5 && t.attrs.height !== undefined;
      if (/^data:text\/html/i.test(src)) report({ sev: 'crit', title: 'Iframe con contenido incrustado', label: '', evidence: src.slice(0, 100), detail: 'Un iframe carga HTML incrustado en la propia dirección: se usa para ocultar código.' });
      else if (hidden && h && !sameSite(h, finalHost) && !sameSite(h, host)) report({ sev: 'crit', title: 'Iframe oculto hacia otro dominio', label: h, evidence: src, detail: 'Hay un marco invisible que carga contenido de ' + h + '. Es la firma clásica de una inyección de malware o de spam.' });
    }
    for (const t of tagsOf(html, 'meta')) {
      if ((t.attrs['http-equiv'] || '').toLowerCase() === 'refresh') {
        const m = /url\s*=\s*['"]?([^'"\s>]+)/i.exec(t.attrs.content || '');
        if (m) { const h = hostOf(m[1], finalUrl); if (h && !sameSite(h, finalHost)) report({ sev: 'crit', title: 'Redirección automática a otro dominio', label: h, evidence: t.attrs.content, detail: 'La página se redirige sola a ' + h + '.' }); }
      }
    }
    for (const b of hiddenBlocks(html)) {
      const links = tagsOf(b, 'a').filter(a => { const h = hostOf(a.attrs.href || '', finalUrl); return /^https?:/i.test(a.attrs.href || '') && h && !sameSite(h, finalHost) && !sameSite(h, host); });
      if (links.length >= 3) {
        const spam = SPAM_TERMS.some(t => b.toLowerCase().includes(t));
        report({ sev: spam ? 'crit' : 'warn', title: 'Bloque oculto con ' + links.length + ' enlaces externos', label: '', evidence: links.slice(0, 3).map(l => l.attrs.href).join('  '), detail: 'Hay enlaces escondidos con CSS que apuntan a otros sitios' + (spam ? ' y usan palabras de spam' : '') + '. Se usan para inflar el posicionamiento de terceros.' });
      }
    }
    if (!seen.size && !bad.length) finding(ctx, 'ok', 'No se encontró código malicioso conocido', 'Se revisó la portada, ' + scripts.filter(s => !s.src).length + ' scripts en línea y ' + filesScanned + ' archivos JavaScript. Esto solo cubre lo visible desde fuera.', '', { cat: 'info' });
  } catch (e) { finding(ctx, 'info', 'No se pudo completar esta comprobación', e.message, '', { cat: 'info' }); }
  endStage(ctx);

  /* ---- 6. SEO spam y cloaking ---- */
  stage(ctx, 'seo', 'SEO spam y cloaking');
  try {
    const analyze = (h) => {
      const title = titleOf(h), desc = metaOf(h, 'description'), text = textOf(h), lower = (title + ' ' + desc + ' ' + text).toLowerCase();
      const terms = SPAM_TERMS.filter(t => lower.includes(t));
      const cjk = ((title + ' ' + text).match(CJK_RE) || []).length;
      return { title, terms, cjk, len: h.length, deface: DEFACE_RE.exec(title + ' ' + text) };
    };
    const lang = langOf(html), a = analyze(html), asianSite = /^(ja|zh|ko)/.test(lang);
    if (a.deface) finding(ctx, 'crit', 'Posible defacement (página modificada por atacantes)', 'La página contiene el texto "' + snippet(a.deface[0], 60) + '".', 'Restaura desde una copia limpia y cierra la vulnerabilidad de entrada.', { cat: 'infection', evidence: a.deface[0] });
    if (a.terms.length) finding(ctx, a.terms.length >= 3 ? 'crit' : 'warn', 'Palabras típicas de spam en la portada (' + a.terms.length + ')', a.terms.join(', '),
      'Si tu sitio NO trata de estos temas, es una señal de infección (spam SEO). Si trata de ellos legítimamente, ignora este aviso.', { cat: 'infection' });
    if (!asianSite && a.cjk >= 6) finding(ctx, 'crit', 'Texto en japonés/chino/coreano inesperado', a.cjk + ' caracteres CJK en un sitio que no está en ese idioma.', 'Es la firma del "Japanese keyword hack". Requiere limpieza a fondo.', { cat: 'infection', evidence: a.title });

    if (!ctx.partial) {
      log(ctx, 'Pidiendo la portada como Googlebot');
      const bot = await request(base + '/', { redirects: 5, ua: UA_BOT, timeoutMs: 9000 });
      log(ctx, '← HTTP ' + bot.status + ' (Googlebot)');
      log(ctx, 'Pidiendo la portada como visitante que llega desde Google');
      const ref = await request(base + '/', { redirects: 5, referer: 'https://www.google.com/', timeoutMs: 9000 });
      log(ctx, '← HTTP ' + ref.status + ' (visita desde Google)');
      let cloak = false;
      for (const [who, r] of [['Googlebot', bot], ['visitantes que llegan desde Google', ref]]) {
        if (r.error || !r.status) continue;
        const rh = hostOf(r.final, base);
        if (!sameSite(rh, finalHost)) { cloak = true; finding(ctx, 'crit', 'Redirección solo para ' + who, 'Para ' + who + ' el sitio redirige a ' + rh + ', pero a un visitante normal no.', 'Es una infección que se esconde del propietario. Revisa .htaccess, functions.php y la base de datos.', { cat: 'infection', evidence: r.final }); continue; }
        if (r.status >= 200 && r.status < 300) {
          const b = analyze(r.body), newTerms = b.terms.filter(t => !a.terms.includes(t));
          if (newTerms.length) { cloak = true; finding(ctx, 'crit', 'Cloaking: contenido de spam solo para ' + who, 'Solo ' + who + ' ve estas palabras: ' + newTerms.join(', ') + '.', 'El sitio muestra contenido distinto a buscadores que a personas. Hay que limpiarlo a fondo.', { cat: 'infection' }); }
          else if (!asianSite && b.cjk >= 6 && a.cjk < 6) { cloak = true; finding(ctx, 'crit', 'Cloaking: texto asiático solo para ' + who, b.cjk + ' caracteres CJK que un visitante normal no ve.', 'Firma del "Japanese keyword hack".', { cat: 'infection', evidence: b.title }); }
          else if (b.len > 2000 && a.len > 2000 && Math.abs(b.len - a.len) / Math.max(b.len, a.len) > 0.6) finding(ctx, 'warn', 'El contenido para ' + who + ' es muy distinto', 'Tamaño de la página: ' + a.len + ' bytes (normal) frente a ' + b.len + ' bytes.', 'Puede ser una diferencia legítima (caché o carga diferida) o cloaking. Conviene revisarlo.', { cat: 'infection' });
        }
      }
      if (!cloak) finding(ctx, 'ok', 'Sin diferencias entre visitantes y buscadores', 'La portada se ve igual para un visitante normal, para Googlebot y para quien llega desde Google.', '', { cat: 'info' });
    }

    if (!over()) {
      let locs = [], src = '';
      for (const p of ['/wp-sitemap.xml', '/sitemap_index.xml', '/sitemap.xml']) {
        const r = await get(p, { max: 500000 });
        log(ctx, 'GET ' + p + ' → ' + r.status);
        if (r.status === 200 && /<loc>/i.test(r.body)) { src = p; locs = [...r.body.matchAll(/<loc>\s*([^<\s]+)\s*<\/loc>/gi)].map(m => m[1]); break; }
      }
      if (src) {
        const subs = locs.filter(u => /\.xml(\?|$)/i.test(u)).slice(0, 3);
        if (subs.length) { locs = locs.filter(u => !subs.includes(u)); for (const s of subs) { if (over()) break; const r = await request(s, { max: 500000, timeoutMs: 8000 }); log(ctx, 'GET sub-sitemap → ' + r.status); if (r.status === 200) locs.push(...[...r.body.matchAll(/<loc>\s*([^<\s]+)\s*<\/loc>/gi)].map(m => m[1])); } }
        const urls = locs.slice(0, 500);
        const bad = urls.filter(u => { let d = u; try { d = decodeURIComponent(u); } catch {} d = d.toLowerCase().replace(/[-_+]/g, ' '); return SPAM_TERMS.some(t => d.includes(t)) || ((d.match(CJK_RE) || []).length >= 4 && !asianSite); });
        if (bad.length >= 3) finding(ctx, 'crit', bad.length + ' URLs de spam en el sitemap', bad.slice(0, 4).join('\n'), 'Hay páginas basura creadas por un atacante. Elimínalas y limpia el sitio.', { cat: 'infection' });
        else if (bad.length) finding(ctx, 'warn', bad.length + ' URL sospechosa(s) en el sitemap', bad.join('\n'), 'Revísala(s).', { cat: 'infection' });
        else finding(ctx, 'ok', 'Sitemap revisado (' + urls.length + ' URLs) sin spam evidente', 'Archivo: ' + src, '', { cat: 'info' });
      } else finding(ctx, 'info', 'No se encontró un sitemap público', 'No se pudo revisar la lista de páginas indexables.', '', { cat: 'info' });
    }
  } catch (e) { finding(ctx, 'info', 'No se pudo completar esta comprobación', e.message, '', { cat: 'info' }); }
  endStage(ctx);

  /* ---- 7. Archivos y rutas expuestas ---- */
  stage(ctx, 'exposed', 'Archivos expuestos');
  try {
    const R = (re) => (r) => re.test(r.body);
    const zip = (r) => r.buf.length > 4 && r.buf[0] === 0x50 && r.buf[1] === 0x4b && r.buf[2] === 3 && r.buf[3] === 4;
    const gz = (r) => r.buf.length > 3 && r.buf[0] === 0x1f && r.buf[1] === 0x8b;
    const sql = R(/(?:^--\s*(?:MySQL|MariaDB) dump|CREATE TABLE|INSERT INTO\s+[`"']?\w+)/im);
    const cfg = R(/DB_PASSWORD|DB_NAME|define\s*\(\s*['"]AUTH_KEY/);
    const errlog = R(/PHP (?:Warning|Notice|Fatal error|Deprecated|Parse error)|^\[\d{2}-[A-Za-z]{3}-\d{4}/m);
    const PROBES = [
      ['/.git/HEAD', R(/^ref:\s*refs\//m), 'crit', 'Repositorio .git expuesto', 'Cualquiera puede descargar el código fuente y, a veces, contraseñas.', 'Bloquea el acceso a /.git o elimina la carpeta del servidor público.'],
      ['/.env', (r) => /^[A-Z][A-Z0-9_]{2,}\s*=.+/m.test(r.body) && /(DB_|APP_KEY|PASSWORD|SECRET|API_KEY|TOKEN)/.test(r.body), 'crit', 'Archivo .env expuesto', 'Contiene variables de configuración y posiblemente contraseñas.', 'Elimínalo del servidor público y cambia todas las claves.'],
      ['/wp-config.php.bak', cfg, 'crit', 'Copia de wp-config.php expuesta', 'Muestra en texto plano la contraseña de la base de datos.', 'Borra la copia y cambia las credenciales de la base de datos.'],
      ['/wp-config.php.old', cfg, 'crit', 'Copia de wp-config.php expuesta', 'Muestra en texto plano la contraseña de la base de datos.', 'Borra la copia y cambia las credenciales de la base de datos.'],
      ['/wp-config.php~', cfg, 'crit', 'Copia de wp-config.php expuesta', 'Muestra en texto plano la contraseña de la base de datos.', 'Borra la copia y cambia las credenciales de la base de datos.'],
      ['/wp-config.txt', cfg, 'crit', 'Copia de wp-config expuesta', 'Muestra en texto plano la contraseña de la base de datos.', 'Borra la copia y cambia las credenciales de la base de datos.'],
      ['/wp-config.php', cfg, 'crit', 'wp-config.php se muestra como texto', 'PHP no se está ejecutando en ese archivo y se ven las credenciales.', 'Corrige la configuración de PHP del servidor de inmediato y cambia las credenciales.'],
      ['/wp-content/debug.log', errlog, 'warn', 'Registro de errores de WordPress expuesto (debug.log)', 'Revela rutas del servidor y detalles internos útiles para un atacante.', 'Desactiva WP_DEBUG_LOG o bloquea el acceso y borra el archivo.'],
      ['/error_log', errlog, 'warn', 'Registro de errores del servidor expuesto (error_log)', 'Revela rutas y errores internos.', 'Bloquea el acceso y borra el archivo.'],
      ['/wp-content/error_log', errlog, 'warn', 'Registro de errores expuesto (error_log)', 'Revela rutas y errores internos.', 'Bloquea el acceso y borra el archivo.'],
      ['/backup.zip', zip, 'crit', 'Copia de seguridad descargable (backup.zip)', 'Cualquiera puede bajar tu sitio completo, incluida la configuración.', 'Elimínala del servidor público y guarda las copias fuera de la web.'],
      ['/site.zip', zip, 'crit', 'Copia de seguridad descargable (site.zip)', 'Cualquiera puede bajar tu sitio completo.', 'Elimínala del servidor público.'],
      ['/wordpress.zip', zip, 'crit', 'Copia de seguridad descargable (wordpress.zip)', 'Cualquiera puede bajar tu sitio completo.', 'Elimínala del servidor público.'],
      ['/backup.tar.gz', gz, 'crit', 'Copia de seguridad descargable (backup.tar.gz)', 'Cualquiera puede bajar tu sitio completo.', 'Elimínala del servidor público.'],
      ['/backup.sql', sql, 'crit', 'Volcado de base de datos descargable (backup.sql)', 'Incluye usuarios, correos y contraseñas cifradas.', 'Elimínalo y cambia todas las contraseñas.'],
      ['/dump.sql', sql, 'crit', 'Volcado de base de datos descargable (dump.sql)', 'Incluye usuarios, correos y contraseñas cifradas.', 'Elimínalo y cambia todas las contraseñas.'],
      ['/db.sql', sql, 'crit', 'Volcado de base de datos descargable (db.sql)', 'Incluye usuarios, correos y contraseñas cifradas.', 'Elimínalo y cambia todas las contraseñas.'],
      ['/database.sql', sql, 'crit', 'Volcado de base de datos descargable (database.sql)', 'Incluye usuarios, correos y contraseñas cifradas.', 'Elimínalo y cambia todas las contraseñas.'],
      ['/phpinfo.php', R(/phpinfo\(\)|PHP Version\s*<\/?[a-z]/i), 'warn', 'phpinfo() público', 'Muestra la configuración completa del servidor.', 'Elimina el archivo.'],
      ['/info.php', R(/phpinfo\(\)|PHP Version\s*<\/?[a-z]/i), 'warn', 'phpinfo() público', 'Muestra la configuración completa del servidor.', 'Elimina el archivo.'],
      ['/.htaccess', R(/RewriteEngine|<IfModule|# BEGIN WordPress/i), 'warn', '.htaccess legible desde el navegador', 'Expone reglas internas del servidor.', 'Bloquea el acceso a archivos que empiezan por punto.']
    ];
    for (const [p, test, sev, title, detail, fix] of PROBES) {
      if (over()) { log(ctx, 'Tiempo máximo alcanzado: se omiten las comprobaciones restantes'); break; }
      if (ctx.partial) break;
      const r = await get(p, { max: 8192, range: [0, 8191], timeoutMs: 6000 });
      log(ctx, 'GET ' + p + ' → ' + (r.status || r.error));
      if ((r.status === 200 || r.status === 206) && test(r)) finding(ctx, sev, title, detail + ' (' + p + ')', fix, { cat: sev === 'crit' ? 'infection' : 'risk' });
    }
    // Listados de directorios
    for (const dir of ['/wp-content/uploads/', '/wp-content/plugins/', '/wp-content/themes/']) {
      if (over() || ctx.partial || (!isWP && dir.startsWith('/wp-content'))) continue;
      const r = await get(dir, { max: 200000 });
      log(ctx, 'GET ' + dir + ' → ' + (r.status || r.error));
      if (r.status === 200 && /<title>\s*Index of|<h1>\s*Index of/i.test(r.body)) {
        finding(ctx, 'warn', 'Listado de directorio activo en ' + dir, 'Cualquiera puede ver los archivos de esa carpeta.', 'Desactiva el listado (Options -Indexes en .htaccess).');
        if (dir === '/wp-content/uploads/') {
          let php = [...r.body.matchAll(/href="([^"?#]+\.(?:php\d?|phtml|phar))"/gi)].map(m => m[1]);
          const years = [...new Set([...r.body.matchAll(/href="((?:19|20)\d\d\/)"/g)].map(m => m[1]))].slice(-3);
          for (const y of years) {
            if (over()) break;
            const s = await get(dir + y, { max: 200000 });
            log(ctx, 'GET ' + dir + y + ' → ' + s.status);
            if (s.status === 200) php.push(...[...s.body.matchAll(/href="([^"?#]+\.(?:php\d?|phtml|phar))"/gi)].map(m => y + m[1]));
          }
          if (php.length) finding(ctx, 'crit', 'Archivos PHP dentro de uploads (' + php.length + ')', php.slice(0, 6).join('\n'), 'Esa carpeta solo debería contener imágenes y documentos. Un PHP ahí suele ser una webshell: elimínalo y limpia el sitio.', { cat: 'infection' });
        }
      }
    }
    if (isWP && !over() && !ctx.partial) {
      const ins = await get('/wp-admin/install.php', { max: 60000 });
      log(ctx, 'GET /wp-admin/install.php → ' + ins.status);
      if (ins.status === 200 && /id=["']setup["']|WordPress\s*(?:&rsaquo;|›)\s*Installation/i.test(ins.body) && !/already installed|ya est[áa] instalado/i.test(ins.body))
        finding(ctx, 'crit', 'El instalador de WordPress está accesible', 'Un atacante podría reinstalar el sitio con sus propios datos.', 'Revisa la base de datos y el wp-config.php de inmediato.');
      const us = await get('/wp-json/wp/v2/users', { max: 60000, accept: 'application/json' });
      log(ctx, 'GET /wp-json/wp/v2/users → ' + us.status);
      if (us.status === 200) { try { const arr = JSON.parse(us.body); if (Array.isArray(arr) && arr.length && arr[0].slug) finding(ctx, 'info', 'La lista de usuarios es pública (' + arr.length + ')', 'Nombres de usuario visibles: ' + arr.slice(0, 5).map(u => u.slug).join(', ') + '.', 'Restringe el acceso a /wp-json/wp/v2/users para que no faciliten ataques de fuerza bruta.', { cat: 'risk' }); } catch {} }
      const xr = await get('/xmlrpc.php', { max: 4000 });
      log(ctx, 'GET /xmlrpc.php → ' + xr.status);
      if (xr.status === 405 || /XML-RPC server accepts POST requests only/i.test(xr.body)) finding(ctx, 'info', 'XML-RPC está activo', 'Se usa en ataques de fuerza bruta y de denegación de servicio.', 'Desactívalo si no usas la app móvil ni Jetpack.', { cat: 'risk' });
    }
    if (ctx.stageMax.exposed < 2) finding(ctx, 'ok', 'No se encontraron archivos sensibles expuestos', 'Se probaron ' + PROBES.length + ' rutas comunes y los listados de carpetas.', '', { cat: 'info' });
  } catch (e) { finding(ctx, 'info', 'No se pudo completar esta comprobación', e.message, '', { cat: 'info' }); }
  endStage(ctx);

  /* ---- 8. Cabeceras ---- */
  stage(ctx, 'headers', 'Cabeceras de seguridad');
  try {
    const h = main.headers, missing = [];
    if (finalUrl.startsWith('https:') && !h['strict-transport-security']) missing.push('Strict-Transport-Security (HSTS)');
    if (!h['x-frame-options'] && !/frame-ancestors/i.test(h['content-security-policy'] || '')) missing.push('X-Frame-Options / frame-ancestors (protección contra clickjacking)');
    if (!/nosniff/i.test(h['x-content-type-options'] || '')) missing.push('X-Content-Type-Options');
    if (!h['referrer-policy']) missing.push('Referrer-Policy');
    if (missing.length) finding(ctx, 'info', 'Faltan cabeceras de seguridad (' + missing.length + ')', missing.join('\n'), 'Son mejoras de blindaje: no indican infección.', { cat: 'risk' });
    else finding(ctx, 'ok', 'Cabeceras de seguridad principales presentes', '', '', { cat: 'info' });
    const leak = [h['x-powered-by'], /\d/.test(h['server'] || '') ? h['server'] : ''].filter(Boolean);
    if (leak.length) finding(ctx, 'info', 'El servidor revela versiones de software', leak.join('\n'), 'Ocultar versiones dificulta ataques dirigidos.', { cat: 'risk' });
  } catch (e) { finding(ctx, 'info', 'No se pudo completar esta comprobación', e.message, '', { cat: 'info' }); }
  endStage(ctx);

  /* ---- 9. Reputación ---- */
  stage(ctx, 'rep', 'Listas de reputación');
  let checked = 0;
  try {
    if (CFG.safeBrowsingKey) {
      log(ctx, 'Consultando Google Safe Browsing');
      const body = JSON.stringify({ client: { clientId: 'nexaguard', clientVersion: '1.0' }, threatInfo: { threatTypes: ['MALWARE', 'SOCIAL_ENGINEERING', 'UNWANTED_SOFTWARE', 'POTENTIALLY_HARMFUL_APPLICATION'], platformTypes: ['ANY_PLATFORM'], threatEntryTypes: ['URL'], threatEntries: [{ url: 'https://' + host + '/' }, { url: 'http://' + host + '/' }] } });
      const r = await request('https://safebrowsing.googleapis.com/v4/threatMatches:find?key=' + encodeURIComponent(CFG.safeBrowsingKey), { method: 'POST', body, headers: { 'Content-Type': 'application/json' }, accept: 'application/json', timeoutMs: 9000 });
      log(ctx, '← HTTP ' + r.status);
      if (r.status === 200) {
        checked++;
        let j = {}; try { j = JSON.parse(r.body); } catch {}
        if (j.matches && j.matches.length) finding(ctx, 'crit', 'Google Safe Browsing marca este sitio como peligroso', [...new Set(j.matches.map(m => m.threatType))].join(', '), 'Limpia el sitio y solicita la revisión en Google Search Console.', { cat: 'infection' });
        else finding(ctx, 'ok', 'Google Safe Browsing: sin alertas', '', '', { cat: 'info' });
      } else finding(ctx, 'info', 'No se pudo consultar Google Safe Browsing', 'HTTP ' + (r.status || r.error), '', { cat: 'info' });
    }
    if (CFG.enableDnsbl && !net.isIP(host)) {
      log(ctx, 'Consultando Spamhaus DBL');
      let ans = null;
      try { ans = await dns.resolve4(host + '.dbl.spamhaus.org'); } catch (e) { ans = (e.code === 'ENOTFOUND' || e.code === 'ENODATA') ? [] : null; }
      if (ans === null) log(ctx, 'Spamhaus DBL: consulta no disponible');
      else if (ans.some(a => a.startsWith('127.255.255.'))) log(ctx, 'Spamhaus DBL rechazó la consulta (resolvedor no autorizado): no verificado');
      else if (!ans.length) { checked++; finding(ctx, 'ok', 'Spamhaus DBL: dominio no listado', '', '', { cat: 'info' }); }
      else { checked++; finding(ctx, 'crit', 'El dominio figura en la lista de Spamhaus DBL', 'Respuesta: ' + ans.join(', '), 'Limpia el sitio y solicita la exclusión en Spamhaus.', { cat: 'infection' }); }
    }
    if (!checked) finding(ctx, 'info', 'No se comprobaron listas de reputación', 'Este servidor no tiene configurada ninguna fuente de reputación disponible. Puedes revisarlo manualmente en Google Search Console.', '', { cat: 'info' });
  } catch (e) { finding(ctx, 'info', 'No se pudo completar esta comprobación', e.message, '', { cat: 'info' }); }
  endStage(ctx, checked ? undefined : 'skipped');

  const verdict = ctx.infCrit > 0 ? 'infected' : ctx.infWarn > 0 ? 'suspicious' : (ctx.counts.crit + ctx.counts.warn > 0 ? 'risk' : (ctx.partial ? 'limited' : 'clean'));
  ctx.meta.duration_ms = Date.now() - T0; ctx.meta.partial = ctx.partial;
  emit({ t: 'done', verdict, counts: ctx.counts, meta: ctx.meta });
}


module.exports = { CFG, runScan, parseTarget, resolveHost, isPublicIp, privateMsg };
