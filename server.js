#!/usr/bin/env node
/* =====================================================================
   NexaGuard · servidor
   - Sirve la web (public/index.html) y el panel (public/panel.html)
   - Escáner público  POST /scan
   - Cuentas, roles (administrador / cliente) y paneles  /api/*
   Sin dependencias: necesita Node.js 18 o superior.

   Uso:  node server.js
   Variables de entorno principales (todas opcionales):
     PORT, ADMIN_EMAIL, ADMIN_PASSWORD, DATA_DIR, SECURE_COOKIE, TRUST_PROXY,
     ALLOWED_ORIGINS, SAFE_BROWSING_KEY, DNS_SERVERS  (ver LEEME.md)
   ===================================================================== */
'use strict';

const http = require('http');
const fs = require('fs');
const path = require('path');
const scanner = require('./scanner.js');
const { CFG, runScan, parseTarget } = scanner;
const { createStore } = require('./store.js');
const { createApp } = require('./app.js');

const MIME = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript', '.css': 'text/css', '.png': 'image/png', '.jpg': 'image/jpeg', '.svg': 'image/svg+xml', '.ico': 'image/x-icon', '.txt': 'text/plain; charset=utf-8' };
const SEC = { 'X-Content-Type-Options': 'nosniff', 'X-Frame-Options': 'DENY', 'Referrer-Policy': 'same-origin' };
// Se permite el dominio de PayPal (para su botón de pago) aunque no esté configurado:
// si no hay credenciales, la página nunca carga ese script, así que no baja la seguridad.
const PANEL_CSP = "default-src 'self'; script-src 'self' 'unsafe-inline' https://www.paypal.com https://www.paypalobjects.com; " +
  "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com https://www.paypalobjects.com; font-src https://fonts.gstatic.com; " +
  "img-src 'self' data: https://www.paypalobjects.com; connect-src 'self' https://www.paypal.com; frame-src https://www.paypal.com; " +
  "frame-ancestors 'none'; base-uri 'none'; form-action 'self'";

function createServer(opts = {}) {
  const staticDir = opts.staticDir || CFG.staticDir;
  const store = opts.store;
  if (!store) throw new Error('Falta opts.store. Usa createStore() + await store.load() antes de crear el servidor.');
  const app = createApp({
    store, scanner,
    config: {
      trustProxy: CFG.trustProxy, maxConcurrent: CFG.maxConcurrent,
      secureCookie: process.env.SECURE_COOKIE === '1' ? true : process.env.SECURE_COOKIE === '0' ? false : null,
      adminEmail: opts.adminEmail || process.env.ADMIN_EMAIL, adminPassword: opts.adminPassword || process.env.ADMIN_PASSWORD,
      schedulerMs: opts.schedulerMs, cooldownMs: opts.cooldownMs,
      paypal: opts.paypal || {
        clientId: process.env.PAYPAL_CLIENT_ID || '', clientSecret: process.env.PAYPAL_CLIENT_SECRET || '',
        mode: process.env.PAYPAL_MODE || 'sandbox', apiBase: process.env.PAYPAL_API_BASE || ''
      },
      mailer: opts.mailer || {
        host: process.env.SMTP_HOST || 'smtp.titan.email',
        port: process.env.SMTP_PORT || 465,
        user: process.env.SMTP_USER || 'contacto@nexaguards.com',
        pass: process.env.SMTP_PASS || process.env.EMAIL_PASS || '',
        to: process.env.CONTACT_TO_EMAIL || process.env.ADMIN_EMAIL || 'asbeldev8@gmail.com'
      }
    }
  });

  /* ---- Escáner público (sin cuenta) ---- */
  const hits = new Map(); let running = 0;
  setInterval(() => { const cut = Date.now() - 3600e3; for (const [k, v] of hits) { const n = v.filter(t => t > cut); n.length ? hits.set(k, n) : hits.delete(k); } }, 600e3).unref();
  const clientIp = req => (CFG.trustProxy && req.headers['x-forwarded-for']) ? String(req.headers['x-forwarded-for']).split(',')[0].trim() : (req.socket.remoteAddress || '0');
  function corsOk(req, res) {
    const o = req.headers.origin;
    if (!o) return true;
    const self = ['http://' + req.headers.host, 'https://' + req.headers.host];
    if (CFG.allowedOrigins.includes('*') || CFG.allowedOrigins.includes(o) || self.includes(o)) {
      res.setHeader('Access-Control-Allow-Origin', o); res.setHeader('Vary', 'Origin');
      res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS'); res.setHeader('Access-Control-Allow-Headers', 'Content-Type, X-Requested-With');
      return true;
    }
    return false;
  }
  const sendJson = (res, code, obj) => { res.writeHead(code, Object.assign({ 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store' }, SEC)); res.end(JSON.stringify(obj)); };

  function serveStatic(req, res) {
    if (!staticDir || !fs.existsSync(staticDir)) return sendJson(res, 404, { error: 'No encontrado' });
    let p;
    try { p = decodeURIComponent(req.url.split('?')[0]); } catch { return sendJson(res, 400, { error: 'Petición no válida' }); }
    if (p === '/panel' || p === '/panel/') p = '/panel.html';
    if (p.endsWith('/')) p += 'index.html';
    const file = path.normalize(path.join(staticDir, p));
    if (!file.startsWith(path.normalize(staticDir))) return sendJson(res, 403, { error: 'Prohibido' });
    fs.readFile(file, (err, data) => {
      if (err) return sendJson(res, 404, { error: 'No encontrado' });
      const h = Object.assign({ 'Content-Type': MIME[path.extname(file)] || 'application/octet-stream' }, SEC);
      if (path.basename(file) === 'panel.html') { h['Content-Security-Policy'] = PANEL_CSP; h['Cache-Control'] = 'no-store'; }
      res.writeHead(200, h); res.end(data);
    });
  }

  const server = http.createServer(async (req, res) => {
    const url = req.url.split('?')[0];
    if (url.startsWith('/api/')) { if (req.method === 'OPTIONS') { res.writeHead(204); return res.end(); } return app.handle(req, res); }
    if (req.method === 'OPTIONS') { if (!corsOk(req, res)) return sendJson(res, 403, { error: 'Origen no permitido' }); res.writeHead(204); return res.end(); }
    if (req.method === 'GET' && url === '/health') return sendJson(res, 200, { ok: true });
    if (req.method === 'GET' || req.method === 'HEAD') return serveStatic(req, res);
    if (req.method !== 'POST' || url !== '/scan') return sendJson(res, 404, { error: 'No encontrado' });
    if (!corsOk(req, res)) return sendJson(res, 403, { t: 'error', message: 'Origen no permitido.' });

    let raw = '';
    req.on('data', d => { raw += d; if (raw.length > 4096) req.destroy(); });
    req.on('end', async () => {
      let body; try { body = JSON.parse(raw || '{}'); } catch { return sendJson(res, 400, { t: 'error', message: 'Petición no válida.' }); }
      if (body.consent !== true) return sendJson(res, 400, { t: 'error', message: 'Debes confirmar que eres el propietario del sitio o que tienes autorización para analizarlo.' });
      const target = parseTarget(body.url);
      if (target.error) return sendJson(res, 400, { t: 'error', message: target.error });
      const ip = clientIp(req), list = (hits.get(ip) || []).filter(t => t > Date.now() - 3600e3);
      if (list.length >= CFG.ratePerHour) return sendJson(res, 429, { t: 'error', message: 'Alcanzaste el límite de análisis por hora. Inténtalo más tarde.' });
      if (running >= CFG.maxConcurrent) return sendJson(res, 503, { t: 'error', message: 'El escáner está ocupado. Inténtalo de nuevo en un minuto.' });
      list.push(Date.now()); hits.set(ip, list); running++;
      res.writeHead(200, Object.assign({ 'Content-Type': 'application/x-ndjson; charset=utf-8', 'Cache-Control': 'no-store', 'X-Accel-Buffering': 'no' }, SEC));
      let aborted = false; res.on('close', () => { if (!res.writableEnded) aborted = true; });
      const emit = o => { if (!aborted && !res.writableEnded) res.write(JSON.stringify(o) + '\n'); };
      emit({ t: 'hello', target: target.base });
      try { await runScan(target, emit, () => aborted); }
      catch (e) { if (e.message !== 'aborted') { console.error('scan error:', e); emit({ t: 'error', message: 'Ocurrió un error inesperado durante el análisis.' }); } }
      finally { running--; if (!res.writableEnded) res.end(); }
    });
  });
  server.requestTimeout = 0; server.headersTimeout = 20000; server.keepAliveTimeout = 5000;
  return { server, app, store };
}

/* ---- Latido (keep-alive) ---- */
function startHeartbeat(store) {
  // Render: auto-ping cada 14 min para evitar que el servicio se duerma
  const selfUrl = process.env.RENDER_EXTERNAL_URL || process.env.SELF_URL;
  if (selfUrl) {
    const url = selfUrl.replace(/\/$/, '') + '/health';
    setInterval(async () => { try { await fetch(url); } catch {} }, 14 * 60 * 1000).unref();
    console.log('  Latido Render:   cada 14 min → ' + url);
  } else {
    console.log('  Latido Render:   inactivo (define RENDER_EXTERNAL_URL o SELF_URL)');
  }
  // Supabase: ping cada 4 h para evitar pausa por inactividad (free tier)
  setInterval(() => { store.ping().catch(() => {}); }, 4 * 3600 * 1000).unref();
  console.log('  Latido Supabase: cada 4 h');
}

if (require.main === module) {
  process.on('uncaughtException', e => console.error('uncaught:', e));
  process.on('unhandledRejection', e => console.error('unhandled:', e));
  (async () => {
    /* ---- Conectar a Supabase y cargar datos ---- */
    let store;
    try {
      store = createStore();
      console.log('Conectando con Supabase…');
      await store.load();
      console.log('  Datos cargados (' + store.db.users.length + ' usuarios, ' + store.db.sites.length + ' sitios).\n');
    } catch (e) { console.error('\n✗ ' + e.message + '\n'); process.exit(1); }

    let s;
    try { s = createServer({ store }); } catch (e) { console.error('\n✗ ' + e.message + '\n'); process.exit(1); }
    const created = await s.app.ensureAdmin();
    s.server.listen(CFG.port, CFG.host, () => {
      console.log('NexaGuard escuchando en http://' + CFG.host + ':' + CFG.port);
      console.log('  Web:    http://localhost:' + CFG.port + '/');
      console.log('  Panel:  http://localhost:' + CFG.port + '/panel');
      if (created) {
        console.log('\n  ┌─ CUENTA DE ADMINISTRADOR CREADA ─────────────────────────');
        console.log('  │  Correo:      ' + created.email);
        console.log('  │  Contraseña:  ' + (created.password || '(la que definiste en ADMIN_PASSWORD)'));
        if (created.password) console.log('  │  Guárdala ahora: no se volverá a mostrar. Cámbiala al entrar.');
        console.log('  └───────────────────────────────────────────────────────────\n');
      }
      if (s.app.PLANS && process.env.PAYPAL_CLIENT_ID) console.log('  Pago con PayPal: activo (modo ' + (process.env.PAYPAL_MODE || 'sandbox') + ')');
      else console.log('  Pago con PayPal: no configurado (los planes se activan a mano). Ver LEEME.md.');
      if (process.env.SMTP_PASS || process.env.EMAIL_PASS) {
        console.log('  Correo corporativo: activo (' + (process.env.SMTP_USER || 'contacto@nexaguards.com') + ' → ' + (process.env.CONTACT_TO_EMAIL || process.env.ADMIN_EMAIL || 'admin') + ')');
      } else {
        console.log('  Correo corporativo: pendiente (configura SMTP_PASS en variables de entorno)');
      }
      startHeartbeat(store);
      console.log('');
      s.app.startScheduler();
    });

    /* ---- Cierre limpio: guardar en Supabase antes de salir ---- */
    const onShutdown = async (sig) => {
      console.log('\n' + sig + ': guardando datos en Supabase…');
      try { await store.shutdown(); } catch (e) { console.error('Error al guardar:', e.message); }
      process.exit(0);
    };
    process.on('SIGTERM', () => onShutdown('SIGTERM'));
    process.on('SIGINT', () => onShutdown('SIGINT'));
  })();
} else {
  module.exports = { createServer };
}

