'use strict';
/* Cuentas, roles (administrador / cliente), planes y API de los paneles. Sin dependencias. */
const crypto = require('crypto');
const { createPayPalClient } = require('./paypal.js');
const { createMailer } = require('./mailer.js');

const DAY = 864e5;

/* ---------- Planes: aquí defines qué incluye cada uno ---------- */
const PLANS = {
  security_pro: {
    id: 'security_pro', tier: 1, name: 'Plan NexaGuard Security Pro', price: 9.99, currency: 'USD', period: 'al mes', type: 'subscription',
    sites: 1, scansPerMonth: null, scheduled: true, scanEveryHours: 12, priority: true, afterDeliveryDays: 0, response: 'inmediata',
    features: ['Licencia Oficial NexaGuard Security PRO para WordPress', 'Sistema de Vigilancia 24 Horas contra amenazas activo', 'Auditoría forense y erradicación de malware con 1 clic', 'Sincronización en tiempo real con NexaGuard Threat Cloud', 'Actualizaciones continuas de firmas Zero-Day']
  },
  rescate: {
    id: 'rescate', tier: 2, name: 'Rescate', price: 99, currency: 'USD', period: 'pago único', type: 'oneoff',
    sites: 1, scansPerMonth: 3, scheduled: false, priority: false, afterDeliveryDays: 14, response: '24 a 48 horas',
    features: ['Limpieza forense humana de archivos y base de datos', 'Plugin NexaGuard Security incluido para análisis interno', 'Reparación de errores críticos del sitio', 'Informe detallado de intrusiones', '3 análisis del escáner web por mes']
  },
  blindaje: {
    id: 'blindaje', tier: 3, name: 'Rescate + Blindaje', price: 199, currency: 'USD', period: 'pago único', type: 'oneoff',
    sites: 1, scansPerMonth: 10, scheduled: false, priority: true, afterDeliveryDays: 365, response: 'menos de 24 horas',
    features: ['Todo lo del plan Rescate', '1 Año Completo de Licencia NexaGuard Security PRO incluida', 'Firewall (WAF) y 2FA configurados por expertos', 'wp-config y permisos endurecidos', 'Revisión y deslistado de Google Safe Browsing', 'Garantía de 30 días y atención prioritaria']
  },
  guardian: {
    id: 'guardian', tier: 4, name: 'Guardián', price: 39, currency: 'USD', period: 'al mes', type: 'subscription',
    sites: 1, scansPerMonth: null, scheduled: true, scanEveryHours: 24, priority: true, afterDeliveryDays: 0, response: 'menos de 24 horas',
    features: ['Licencia NexaGuard Security PRO siempre activa', 'Sistema de Vigilancia 24 Horas continuo', 'Monitoreo automático diario con el escáner', 'Backups diarios y actualizaciones probadas asistidas', 'Limpiezas y soporte prioritario incluidos']
  }
};
const STAGES = ['Triage y diagnóstico', 'Copia y aislamiento', 'Limpieza quirúrgica', 'Blindaje y garantía'];
const ONEOFF_STATUS = ['pending_payment', 'in_progress', 'delivered', 'cancelled'];
const SUB_STATUS = ['pending_payment', 'active', 'cancelled'];
const TICKET_STATUS = ['open', 'answered', 'closed'];
const DEFAULT_PAYMENT_TEXT = 'Para activar tu plan, escríbenos y te indicamos las formas de pago disponibles. En cuanto registremos tu pago, tu panel se activa.';

/* ---------- Contraseñas (scrypt) ---------- */
const scrypt = (pw, salt) => new Promise((res, rej) => crypto.scrypt(pw, salt, 64, (e, k) => e ? rej(e) : res(k)));
async function hashPw(pw) { const salt = crypto.randomBytes(16); return { salt: salt.toString('hex'), hash: (await scrypt(pw, salt)).toString('hex') }; }
async function checkPw(pw, rec) {
  const h = await scrypt(pw, Buffer.from(rec.salt, 'hex')), want = Buffer.from(rec.hash, 'hex');
  return h.length === want.length && crypto.timingSafeEqual(h, want);
}
const sha = s => crypto.createHash('sha256').update(s).digest('hex');
const tempPassword = () => crypto.randomBytes(9).toString('base64').replace(/[+/=]/g, 'x').slice(0, 12);

function createApp({ store, scanner, config }) {
  const { db, save, id } = store;
  const cfg = Object.assign({ trustProxy: false, secureCookie: null, maxConcurrent: 4, schedulerMs: 15 * 60e3, cooldownMs: 45e3 }, config || {});
  let running = 0, dummy = null;
  const pp = createPayPalClient(cfg.paypal || {});
  const mailer = createMailer(cfg.mailer || {});

  const buckets = new Map();   // límites de intentos

  /* ---------- Utilidades ---------- */
  const T = () => Date.now();
  const iso = t => (t ? new Date(t).toISOString() : null);
  const clean = (v, max) => String(v == null ? '' : v).replace(/[\u0000-\u0008\u000b\u000c\u000e-\u001f]/g, '').trim().slice(0, max);
  const isEmail = e => /^[^\s@]{1,64}@[^\s@]{1,255}\.[^\s@]{2,}$/.test(e) && e.length <= 254;
  const publicUser = u => ({ id: u.id, email: u.email, name: u.name, phone: u.phone || '', company: u.company || '', role: u.role, active: u.active !== false, createdAt: iso(u.createdAt), mustChangePassword: !!u.mustChangePassword });
  function record(actor, userId, text, kind) {
    db.activity.push({ id: id('act'), at: T(), actor: actor || 'sistema', userId: userId || null, text: clean(text, 300), kind: kind || 'info' });
    if (db.activity.length > 1500) db.activity.splice(0, db.activity.length - 1500);
  }
  function clientIp(req) {
    if (cfg.trustProxy && req.headers['x-forwarded-for']) return String(req.headers['x-forwarded-for']).split(',')[0].trim();
    return req.socket.remoteAddress || '0';
  }
  function limited(key, max, windowMs) {
    const now = T(), list = (buckets.get(key) || []).filter(t => t > now - windowMs);
    buckets.set(key, list);
    return list.length >= max;
  }
  const hit = key => { const l = buckets.get(key) || []; l.push(T()); buckets.set(key, l); };
  setInterval(() => { const cut = T() - 3600e3; for (const [k, v] of buckets) { const n = v.filter(t => t > cut); n.length ? buckets.set(k, n) : buckets.delete(k); } db.sessions = db.sessions.filter(s => s.exp > T()); }, 600e3).unref();

  function send(res, code, obj, headers) {
    res.writeHead(code, Object.assign({ 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store', 'X-Content-Type-Options': 'nosniff' }, headers || {}));
    res.end(JSON.stringify(obj));
  }
  const fail = (res, code, message) => send(res, code, { error: message });
  function readBody(req, max = 65536) {
    return new Promise((resolve, reject) => {
      let raw = '';
      req.on('data', d => { raw += d; if (raw.length > max) { reject(Object.assign(new Error('Petición demasiado grande'), { code: 413 })); req.destroy(); } });
      req.on('end', () => { if (!raw) return resolve({}); try { const j = JSON.parse(raw); resolve(j && typeof j === 'object' ? j : {}); } catch { reject(Object.assign(new Error('JSON no válido'), { code: 400 })); } });
      req.on('error', reject);
    });
  }
  function parseCookies(req) {
    const out = {};
    String(req.headers.cookie || '').split(';').forEach(p => { const i = p.indexOf('='); if (i > 0) out[p.slice(0, i).trim()] = decodeURIComponent(p.slice(i + 1).trim()); });
    return out;
  }
  const isHttps = req => req.socket.encrypted || (cfg.trustProxy && /https/i.test(req.headers['x-forwarded-proto'] || ''));
  function cookie(req, value, maxAgeSec) {
    const secure = cfg.secureCookie === null ? isHttps(req) : cfg.secureCookie;
    return 'pw_sid=' + value + '; HttpOnly; SameSite=Lax; Path=/; Max-Age=' + maxAgeSec + (secure ? '; Secure' : '');
  }
  function startSession(req, res, userId) {
    const sid = crypto.randomBytes(32).toString('hex');
    db.sessions.push({ h: sha(sid), userId, at: T(), exp: T() + 7 * DAY });
    save();
    return { 'Set-Cookie': cookie(req, sid, 7 * 86400) };
  }
  function sessionUser(req) {
    const sid = parseCookies(req).pw_sid;
    if (!sid) return null;
    const h = sha(sid), s = db.sessions.find(x => x.h === h && x.exp > T());
    if (!s) return null;
    const u = db.users.find(x => x.id === s.userId);
    return u && u.active !== false ? u : null;
  }

  /* ---------- Planes y derechos de cada cliente ---------- */
  const ordersOf = uid => db.orders.filter(o => o.userId === uid).sort((a, b) => b.createdAt - a.createdAt);
  function orderInfo(o) {
    const p = PLANS[o.plan], t = T();
    let access = false, accessUntil = null, overdue = false;
    if (o.status === 'cancelled') return { access, accessUntil, overdue };
    if (p.type === 'subscription') {
      if (o.status === 'active' && o.nextBilling) { accessUntil = o.nextBilling + 5 * DAY; access = t <= accessUntil; overdue = t > o.nextBilling; }
    } else {
      if (o.status === 'in_progress') access = true;
      else if (o.status === 'delivered') {
        const delAt = o.deliveredAt || o.createdAt || t;
        accessUntil = delAt + (p.afterDeliveryDays || 30) * DAY;
        access = t <= accessUntil;
      } else if (o.stage && o.stage >= 1) {
        access = true;
      }
    }
    return { access, accessUntil, overdue };
  }
  function monthStart() { const d = new Date(); return Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), 1); }
  function entitlement(uid) {
    const list = ordersOf(uid).map(o => ({ o, plan: PLANS[o.plan], info: orderInfo(o) }));
    const active = list.filter(x => x.info.access).sort((a, b) => b.plan.tier - a.plan.tier);
    const pending = list.find(x => x.o.status === 'pending_payment' && (!x.o.stage || x.o.stage < 1));
    const used = db.scans.filter(s => s.userId === uid && s.trigger === 'manual' && s.at >= monthStart()).length;
    let level = 'none', limits = { sites: 0, scans: 0, unlimited: false, scheduled: false, priority: false };
    if (active.length) {
      level = 'active';
      limits = {
        sites: Math.max(...active.map(x => x.plan.sites)),
        unlimited: active.some(x => x.plan.scansPerMonth === null),
        scans: Math.max(...active.map(x => x.plan.scansPerMonth === null ? 0 : x.plan.scansPerMonth)),
        scheduled: active.some(x => x.plan.scheduled), priority: active.some(x => x.plan.priority)
      };
    } else if (pending) { level = 'pending'; limits.sites = pending.plan.sites; }
    else if (list.length) level = 'ended';
    return { level, limits, scansUsed: used, best: active[0] || null, list };
  }
  function orderView(o) {
    const p = PLANS[o.plan], info = orderInfo(o);
    return {
      id: o.id, plan: o.plan, planName: p.name, type: p.type, status: o.status, stage: o.stage || 0, amount: o.amount, currency: p.currency, period: p.period,
      createdAt: iso(o.createdAt), paidAt: iso(o.paidAt), deliveredAt: iso(o.deliveredAt), nextBilling: iso(o.nextBilling), notes: o.notes || '',
      access: info.access, accessUntil: iso(info.accessUntil), overdue: info.overdue,
      licenseKey: o.licenseKey || null
    };
  }
  const planView = p => ({ id: p.id, name: p.name, price: p.price, currency: p.currency, period: p.period, type: p.type, sites: p.sites, scansPerMonth: p.scansPerMonth, scheduled: p.scheduled, priority: p.priority, response: p.response, features: p.features, afterDeliveryDays: p.afterDeliveryDays });
  const siteView = s => ({ id: s.id, url: s.url, host: s.host, label: s.label || '', monitoring: s.monitoring !== false, createdAt: iso(s.createdAt), lastScan: s.lastScan ? { id: s.lastScan.id, at: iso(s.lastScan.at), verdict: s.lastScan.verdict, counts: s.lastScan.counts, trigger: s.lastScan.trigger } : null });
  const scanRow = s => ({ id: s.id, siteId: s.siteId, host: (db.sites.find(x => x.id === s.siteId) || {}).host || '(sitio eliminado)', at: iso(s.at), trigger: s.trigger, verdict: s.verdict, counts: s.counts });
  const ticketRow = t => ({ id: t.id, userId: t.userId, subject: t.subject, status: t.status, priority: t.priority, createdAt: iso(t.createdAt), updatedAt: iso(t.updatedAt), messages: t.messages.length, last: t.messages.length ? t.messages[t.messages.length - 1].from : null });
  const ticketFull = t => Object.assign(ticketRow(t), { siteId: t.siteId || null, thread: t.messages.map(m => ({ id: m.id, from: m.from, name: m.name, text: m.text, at: iso(m.at) })) });
  const paymentView = p => ({ id: p.id, orderId: p.orderId, amount: p.amount, currency: p.currency, method: p.method, reference: p.reference, at: iso(p.at) });

  function dashboardFor(u) {
    const ent = entitlement(u.id), orders = ordersOf(u.id).map(orderView);
    const sites = db.sites.filter(s => s.userId === u.id).sort((a, b) => a.createdAt - b.createdAt);
    const tickets = db.tickets.filter(t => t.userId === u.id).sort((a, b) => b.updatedAt - a.updatedAt);
    const current = ent.best ? orderView(ent.best.o) : (orders.find(o => o.status === 'pending_payment') || orders[0] || null);
    return {
      user: publicUser(u), level: ent.level, current,
      plan: current ? planView(PLANS[current.plan]) : null,
      limits: Object.assign({}, ent.limits, { scansUsed: ent.scansUsed }),
      orders, sites: sites.map(siteView),
      scans: db.scans.filter(s => s.userId === u.id).sort((a, b) => b.at - a.at).slice(0, 60).map(scanRow),
      tickets: tickets.map(ticketRow),
      payments: db.payments.filter(p => p.userId === u.id).sort((a, b) => b.at - a.at).map(paymentView),
      stages: STAGES, paymentText: (db.settings && db.settings.paymentInstructions) || DEFAULT_PAYMENT_TEXT
    };
  }

  /* ---------- Escaneo con guardado (manual y automático) ---------- */
  function saveScan(site, userId, trigger, findings, doneEv) {
    const prev = site.lastScan && site.lastScan.verdict;
    const rec = {
      id: id('scan'), siteId: site.id, userId, at: T(), trigger, verdict: doneEv.verdict, counts: doneEv.counts,
      findings: findings.slice(0, 120), meta: { wp_version: doneEv.meta.wp_version || null, wp_latest: doneEv.meta.wp_latest || null, duration_ms: doneEv.meta.duration_ms, final_url: doneEv.meta.final_url || null, is_wordpress: !!doneEv.meta.is_wordpress }
    };
    db.scans.push(rec);
    const mine = db.scans.filter(s => s.siteId === site.id);
    if (mine.length > 40) { const drop = new Set(mine.sort((a, b) => a.at - b.at).slice(0, mine.length - 40).map(s => s.id)); db.scans = db.scans.filter(s => !drop.has(s.id)); }
    site.lastScan = { id: rec.id, at: rec.at, verdict: rec.verdict, counts: rec.counts, trigger };
    const bad = v => v === 'infected' || v === 'suspicious';
    if (bad(rec.verdict) && !bad(prev)) record(trigger === 'auto' ? 'monitoreo' : 'escáner', userId, 'ALERTA: ' + site.host + ' ahora figura como ' + (rec.verdict === 'infected' ? 'INFECTADO' : 'con señales sospechosas'), 'alert');
    save();
    return rec;
  }
  async function runAndCollect(site, emit, isAborted) {
    const target = scanner.parseTarget(site.url);
    if (target.error) throw new Error(target.error);
    const findings = []; let doneEv = null, errMsg = null;
    await scanner.runScan(target, o => {
      if (o.t === 'finding') findings.push({ stage: o.stage, sev: o.sev, cat: o.cat, title: o.title, detail: o.detail, fix: o.fix, evidence: o.evidence });
      if (o.t === 'done') doneEv = o;
      if (o.t === 'error') errMsg = o.message;
      if (emit) emit(o);
    }, isAborted || (() => false));
    return { findings, doneEv, errMsg };
  }

  /* Monitoreo automático (plan Guardián) */
  async function schedulerTick() {
    if (cfg._sched) return 0;
    cfg._sched = true; let n = 0;
    try {
      const byUser = new Map();
      for (const s of db.sites.slice().sort((a, b) => a.createdAt - b.createdAt)) { if (!byUser.has(s.userId)) byUser.set(s.userId, []); byUser.get(s.userId).push(s); }
      for (const [uid, sites] of byUser) {
        const u = db.users.find(x => x.id === uid);
        if (!u || u.active === false) continue;
        const ent = entitlement(uid);
        if (!ent.limits.scheduled) continue;
        const every = (ent.best ? PLANS[ent.best.o.plan].scanEveryHours : 24) || 24;
        for (const site of sites.slice(0, ent.limits.sites)) {
          if (site.monitoring === false) continue;
          if (site.nextTry && site.nextTry > T()) continue;
          if (site.lastScan && T() - site.lastScan.at < every * 3600e3) continue;
          if (running >= cfg.maxConcurrent) return n;
          running++;
          try {
            const r = await runAndCollect(site, null);
            if (r.doneEv) { saveScan(site, uid, 'auto', r.findings, r.doneEv); site.lastAutoError = null; n++; }
            else { site.lastAutoError = { at: T(), message: r.errMsg || 'sin resultado' }; site.nextTry = T() + 3600e3; save(); }
          } catch (e) { site.lastAutoError = { at: T(), message: e.message }; site.nextTry = T() + 3600e3; save(); }
          finally { running--; }
        }
      }
    } finally { cfg._sched = false; }
    return n;
  }
  let schedTimer = null;
  const startScheduler = () => { if (!schedTimer) { schedTimer = setInterval(() => schedulerTick().catch(e => console.error('monitoreo:', e.message)), cfg.schedulerMs); schedTimer.unref(); setTimeout(() => schedulerTick().catch(() => {}), 5000).unref(); } };

  /* ---------- Cuenta de administrador inicial ---------- */
  async function ensureAdmin() {
    if (db.users.some(u => u.role === 'admin')) return null;
    const email = clean(cfg.adminEmail || 'admin@localhost.local', 254).toLowerCase();
    const pw = cfg.adminPassword || tempPassword() + 'A1';
    db.users.push({ id: id('usr'), email, name: 'Administrador', role: 'admin', pass: await hashPw(pw), createdAt: T(), active: true, mustChangePassword: !cfg.adminPassword });
    record('sistema', null, 'Cuenta de administrador creada: ' + email);
    save(); await store.flush();
    return { email, password: cfg.adminPassword ? null : pw };
  }

  /* ---------- Rutas ---------- */
  const routes = [];
  const route = (method, pattern, role, fn) => routes.push({ method, re: new RegExp('^' + pattern.replace(/:[a-z]+/gi, '([^/]+)') + '$'), role, fn });

  // Públicas
  route('GET', '/api/plans', null, (ctx) => send(ctx.res, 200, { plans: Object.values(PLANS).map(planView), paymentText: (db.settings && db.settings.paymentInstructions) || DEFAULT_PAYMENT_TEXT }));
  route('GET', '/api/me', null, (ctx) => {
    if (!ctx.user) return send(ctx.res, 200, { user: null });
    send(ctx.res, 200, { user: publicUser(ctx.user) });
  });
  // Formulario de contacto seguro con notificación al correo corporativo / Gmail
  route('POST', '/api/contact', null, async (ctx) => {
    const { req, res, body } = ctx, ip = clientIp(req);
    if (limited('contact|' + ip, 6, 10 * 60e3)) {
      return fail(res, 429, 'Has enviado varios mensajes recientemente. Por favor espera unos minutos antes de intentar de nuevo.');
    }
    const nombre = clean(body.nombre, 80);
    const apellido = clean(body.apellido, 80);
    const telefono = clean(body.telefono, 35);
    const correo = clean(body.correo, 254).toLowerCase();
    const asunto = clean(body.asunto, 150);
    const mensaje = clean(body.mensaje, 4000);

    if (!nombre || nombre.length < 2) return fail(res, 400, 'Por favor escribe tu nombre.');
    if (!correo || !isEmail(correo)) return fail(res, 400, 'Por favor escribe un correo electrónico válido.');
    if (!asunto || asunto.length < 3) return fail(res, 400, 'Por favor escribe el asunto de tu consulta.');
    if (!mensaje || mensaje.length < 5) return fail(res, 400, 'Por favor escribe tu mensaje o consulta.');

    hit('contact|' + ip);
    try {
      await mailer.sendContactEmail({ nombre, apellido, telefono, correo, asunto, mensaje, ip });
      record(nombre, null, 'Mensaje de contacto recibido de ' + nombre + (apellido ? ' ' + apellido : '') + ' (' + correo + '): ' + asunto);
      save();
      send(res, 200, { ok: true, message: '¡Mensaje enviado con éxito! Te responderemos muy pronto a tu correo.' });
    } catch (err) {
      console.error('Error al enviar correo de contacto:', err.message);
      return fail(res, 500, err.message || 'No se pudo enviar el correo en este momento. Inténtalo de nuevo.');
    }
  });
  route('POST', '/api/register', null, async (ctx) => {
    const { req, res, body } = ctx, ip = clientIp(req);
    if (limited('reg|' + ip, 6, 3600e3)) return fail(res, 429, 'Demasiados registros desde esta conexión. Inténtalo más tarde.');
    const name = clean(body.name, 80), email = clean(body.email, 254).toLowerCase(), pw = String(body.password || ''), phone = clean(body.phone, 30);
    const plan = body.plan ? clean(body.plan, 20) : '';
    if (name.length < 2) return fail(res, 400, 'Escribe tu nombre.');
    if (!isEmail(email)) return fail(res, 400, 'Escribe un correo válido.');
    if (pw.length < 8 || pw.length > 200) return fail(res, 400, 'La contraseña debe tener al menos 8 caracteres.');
    if (pw.toLowerCase() === email || /^(12345678|password|contraseña|qwertyui)/i.test(pw)) return fail(res, 400, 'Elige una contraseña menos predecible.');
    if (body.accept !== true) return fail(res, 400, 'Debes aceptar el tratamiento de tus datos para crear la cuenta.');
    if (plan && !PLANS[plan]) return fail(res, 400, 'Plan no válido.');
    hit('reg|' + ip);
    if (db.users.some(u => u.email === email)) return fail(res, 409, 'Ya existe una cuenta con ese correo. Ingresa con tu contraseña.');
    const u = { id: id('usr'), email, name, phone, role: 'client', pass: await hashPw(pw), createdAt: T(), active: true };
    db.users.push(u);
    if (plan) db.orders.push({ id: id('ord'), userId: u.id, plan, status: 'pending_payment', stage: 0, amount: PLANS[plan].price, createdAt: T() });
    record(u.name, u.id, 'Se registró' + (plan ? ' y eligió el plan ' + PLANS[plan].name : ''));
    const headers = startSession(req, res, u.id);
    send(res, 201, { user: publicUser(u) }, headers);
  });
  route('POST', '/api/login', null, async (ctx) => {
    const { req, res, body } = ctx, ip = clientIp(req), email = clean(body.email, 254).toLowerCase(), pw = String(body.password || '');
    const key = 'login|' + ip + '|' + email;
    if (limited(key, 6, 15 * 60e3) || limited('loginip|' + ip, 30, 15 * 60e3)) return fail(res, 429, 'Demasiados intentos. Espera unos minutos e inténtalo de nuevo.');
    const u = db.users.find(x => x.email === email);
    if (!dummy) dummy = await hashPw('no-existe');
    const ok = await checkPw(pw.slice(0, 200), u ? u.pass : dummy);
    if (!u || !ok || u.active === false) { hit(key); hit('loginip|' + ip); return fail(res, 401, 'Correo o contraseña incorrectos.'); }
    buckets.delete(key);
    record(u.name, u.id, 'Inició sesión');
    send(res, 200, { user: publicUser(u) }, startSession(req, res, u.id));
  });
  route('POST', '/api/logout', null, (ctx) => {
    const sid = parseCookies(ctx.req).pw_sid;
    if (sid) { db.sessions = db.sessions.filter(s => s.h !== sha(sid)); save(); }
    send(ctx.res, 200, { ok: true }, { 'Set-Cookie': cookie(ctx.req, '', 0) });
  });

  // NexaGuard Real-Time Cloud Threat Intelligence Feed
  route('GET', '/api/threat-intel', null, (ctx) => {
    send(ctx.res, 200, {
      status: 'active',
      cloud: 'NexaGuard Global Threat Intelligence',
      feed_version: '2026.10.02',
      updated_at: new Date().toISOString(),
      threat_signatures: [
        { id: 'clearfake_bsc', name: 'ClearFake / EtherHiding Smart Contract', chain: 97, pattern: '0xA1decFB' },
        { id: 'clearfake_bsc_2', name: 'ClearFake / EtherHiding Smart Contract', chain: 97, pattern: '0x46790e2' },
        { id: 'hseo_trojan', name: 'HSEO Trojan / Rogue Backdoor Plugin', pattern: 'wp-content/plugins/hseo/' },
        { id: 'clickfix_ps', name: 'ClickFix PowerShell Execution', pattern: 'powershell -e' }
      ],
      whitelisted_frameworks: [
        'uploads/redux/',
        'uploads/elementor/',
        'uploads/elementor-widget/',
        'uploads/et-cache/',
        'uploads/astra-addon/',
        'wp-content/plugins/fluentform/',
        'wp-content/plugins/wp-file-manager/',
        'wp-content/plugins/elementskit/'
      ]
    });
  });

  // Cuenta (cliente y administrador)
  route('PATCH', '/api/me', 'any', (ctx) => {
    const { user, body, res } = ctx;
    if (body.name !== undefined) { const n = clean(body.name, 80); if (n.length < 2) return fail(res, 400, 'Escribe tu nombre.'); user.name = n; }
    if (body.phone !== undefined) user.phone = clean(body.phone, 30);
    if (body.company !== undefined) user.company = clean(body.company, 80);
    save(); send(res, 200, { user: publicUser(user) });
  });
  route('POST', '/api/me/password', 'any', async (ctx) => {
    const { user, body, res, req } = ctx, key = 'pw|' + user.id;
    if (limited(key, 6, 15 * 60e3)) return fail(res, 429, 'Demasiados intentos. Espera unos minutos.');
    const cur = String(body.current || ''), nw = String(body.password || '');
    if (!(await checkPw(cur.slice(0, 200), user.pass))) { hit(key); return fail(res, 400, 'La contraseña actual no es correcta.'); }
    if (nw.length < 8 || nw.length > 200) return fail(res, 400, 'La nueva contraseña debe tener al menos 8 caracteres.');
    if (nw === cur) return fail(res, 400, 'La nueva contraseña debe ser distinta.');
    user.pass = await hashPw(nw); user.mustChangePassword = false;
    const keep = sha(parseCookies(req).pw_sid || '');
    db.sessions = db.sessions.filter(s => s.userId !== user.id || s.h === keep);   // cierra las demás sesiones
    record(user.name, user.id, 'Cambió su contraseña'); save(); send(res, 200, { ok: true });
  });

  // Panel del cliente
  route('GET', '/api/dashboard', 'client', (ctx) => send(ctx.res, 200, dashboardFor(ctx.user)));
  route('POST', '/api/orders', 'client', (ctx) => {   // el cliente elige (o cambia a) otro plan
    const { user, body, res } = ctx, plan = clean(body.plan, 20);
    if (!PLANS[plan]) return fail(res, 400, 'Plan no válido.');
    if (ordersOf(user.id).some(o => o.plan === plan && o.status === 'pending_payment')) return fail(res, 409, 'Ya tienes ese plan pendiente de pago.');
    if (ordersOf(user.id).filter(o => o.status === 'pending_payment').length >= 3) return fail(res, 409, 'Ya tienes varios pedidos pendientes de pago.');
    const o = { id: id('ord'), userId: user.id, plan, status: 'pending_payment', stage: 0, amount: PLANS[plan].price, createdAt: T() };
    db.orders.push(o); record(user.name, user.id, 'Solicitó el plan ' + PLANS[plan].name); save();
    send(res, 201, { order: orderView(o) });
  });
  route('POST', '/api/sites', 'client', (ctx) => {
    const { user, body, res } = ctx, ent = entitlement(user.id);
    if (body.ownership !== true) return fail(res, 400, 'Confirma que eres el propietario del sitio o que tienes autorización.');
    if (ent.limits.sites <= 0) return fail(res, 403, 'Elige un plan para poder agregar sitios.');
    const mine = db.sites.filter(s => s.userId === user.id);
    if (mine.length >= ent.limits.sites) return fail(res, 403, 'Tu plan permite ' + ent.limits.sites + ' sitio' + (ent.limits.sites > 1 ? 's' : '') + '. Cambia de plan para agregar más.');
    const t = scanner.parseTarget(body.url);
    if (t.error) return fail(res, 400, t.error);
    if (mine.some(s => s.host === t.host)) return fail(res, 409, 'Ese sitio ya está en tu panel.');
    const s = { id: id('site'), userId: user.id, url: t.assumed ? t.host + t.path : t.base, host: t.host, label: clean(body.label, 60), monitoring: true, createdAt: T(), ownership: { at: T() } };
    db.sites.push(s); record(user.name, user.id, 'Agregó el sitio ' + s.host); save();
    send(res, 201, { site: siteView(s) });
  });
  route('PATCH', '/api/sites/:id', 'client', (ctx) => {
    const s = db.sites.find(x => x.id === ctx.params[0] && x.userId === ctx.user.id);
    if (!s) return fail(ctx.res, 404, 'Sitio no encontrado.');
    if (ctx.body.monitoring !== undefined) s.monitoring = !!ctx.body.monitoring;
    if (ctx.body.label !== undefined) s.label = clean(ctx.body.label, 60);
    save(); send(ctx.res, 200, { site: siteView(s) });
  });
  route('DELETE', '/api/sites/:id', 'client', (ctx) => {
    const s = db.sites.find(x => x.id === ctx.params[0] && x.userId === ctx.user.id);
    if (!s) return fail(ctx.res, 404, 'Sitio no encontrado.');
    db.sites = db.sites.filter(x => x.id !== s.id); db.scans = db.scans.filter(x => x.siteId !== s.id);
    record(ctx.user.name, ctx.user.id, 'Eliminó el sitio ' + s.host); save(); send(ctx.res, 200, { ok: true });
  });
  route('POST', '/api/sites/:id/scan', 'client', async (ctx) => {
    const { req, res, user } = ctx, s = db.sites.find(x => x.id === ctx.params[0] && x.userId === user.id);
    if (!s) return fail(res, 404, 'Sitio no encontrado.');
    const ent = entitlement(user.id);
    if (ent.level !== 'active') return fail(res, 403, ent.level === 'pending' ? 'Tu plan está pendiente de pago. Cuando registremos tu pago podrás analizar tus sitios.' : 'No tienes un plan activo para analizar sitios.');
    if (!ent.limits.unlimited && ent.scansUsed >= ent.limits.scans) return fail(res, 403, 'Alcanzaste el límite de ' + ent.limits.scans + ' análisis de este mes en tu plan.');
    if (s.lastScan && T() - s.lastScan.at < cfg.cooldownMs) return fail(res, 429, 'Este sitio se analizó hace un momento. Espera unos segundos.');
    if (running >= cfg.maxConcurrent) return fail(res, 503, 'El escáner está ocupado. Inténtalo en un minuto.');
    running++;
    res.writeHead(200, { 'Content-Type': 'application/x-ndjson; charset=utf-8', 'Cache-Control': 'no-store', 'X-Accel-Buffering': 'no' });
    let aborted = false; res.on('close', () => { if (!res.writableEnded) aborted = true; });
    const write = o => { if (!aborted && !res.writableEnded) res.write(JSON.stringify(o) + '\n'); };
    try {
      write({ t: 'hello', target: s.url });
      const r = await runAndCollect(s, write, () => aborted);
      if (r.doneEv && !aborted) { const rec = saveScan(s, user.id, 'manual', r.findings, r.doneEv); write({ t: 'saved', scanId: rec.id }); }
    } catch (e) { if (e.message !== 'aborted') write({ t: 'error', message: e.message || 'Error inesperado durante el análisis.' }); }
    finally { running--; if (!res.writableEnded) res.end(); }
  });
  route('GET', '/api/scans/:id', 'client', (ctx) => {
    const sc = db.scans.find(x => x.id === ctx.params[0] && x.userId === ctx.user.id);
    if (!sc) return fail(ctx.res, 404, 'Análisis no encontrado.');
    send(ctx.res, 200, Object.assign(scanRow(sc), { findings: sc.findings, meta: sc.meta }));
  });
  route('POST', '/api/tickets', 'client', (ctx) => {
    const { user, body, res } = ctx, subject = clean(body.subject, 120), text = clean(body.text, 4000);
    if (subject.length < 4) return fail(res, 400, 'Escribe un asunto (mínimo 4 caracteres).');
    if (!text) return fail(res, 400, 'Escribe tu mensaje.');
    if (db.tickets.filter(t => t.userId === user.id && t.status !== 'closed').length >= 10) return fail(res, 429, 'Tienes muchas solicitudes abiertas. Cierra alguna antes de crear otra.');
    if (limited('tk|' + user.id, 8, 3600e3)) return fail(res, 429, 'Demasiadas solicitudes en poco tiempo.');
    hit('tk|' + user.id);
    const ent = entitlement(user.id), siteId = body.siteId && db.sites.some(s => s.id === body.siteId && s.userId === user.id) ? body.siteId : null;
    const t = { id: id('tk'), userId: user.id, subject, status: 'open', priority: ent.limits.priority ? 'priority' : 'normal', siteId, createdAt: T(), updatedAt: T(), messages: [{ id: id('m'), from: 'client', name: user.name, text, at: T() }] };
    db.tickets.push(t); record(user.name, user.id, 'Abrió una solicitud: ' + subject); save();
    send(res, 201, { ticket: ticketFull(t) });
  });
  const ownTicket = ctx => db.tickets.find(t => t.id === ctx.params[0] && t.userId === ctx.user.id);
  route('GET', '/api/tickets/:id', 'client', (ctx) => { const t = ownTicket(ctx); t ? send(ctx.res, 200, { ticket: ticketFull(t) }) : fail(ctx.res, 404, 'Solicitud no encontrada.'); });
  route('POST', '/api/tickets/:id/messages', 'client', (ctx) => {
    const t = ownTicket(ctx); if (!t) return fail(ctx.res, 404, 'Solicitud no encontrada.');
    const text = clean(ctx.body.text, 4000); if (!text) return fail(ctx.res, 400, 'Escribe tu mensaje.');
    if (t.messages.length >= 300) return fail(ctx.res, 429, 'Esta solicitud llegó a su límite de mensajes. Abre una nueva.');
    t.messages.push({ id: id('m'), from: 'client', name: ctx.user.name, text, at: T() }); t.status = 'open'; t.updatedAt = T(); save();
    send(ctx.res, 201, { ticket: ticketFull(t) });
  });
  route('POST', '/api/tickets/:id/close', 'client', (ctx) => { const t = ownTicket(ctx); if (!t) return fail(ctx.res, 404, 'Solicitud no encontrada.'); t.status = 'closed'; t.updatedAt = T(); save(); send(ctx.res, 200, { ticket: ticketFull(t) }); });

  // Panel del administrador
  const clientsAll = () => db.users.filter(u => u.role === 'client');
  function clientSummary(u) {
    const ent = entitlement(u.id), ords = ordersOf(u.id), cur = ent.best ? ent.best.o : (ords.find(o => o.status === 'pending_payment') || ords[0] || null);
    const sites = db.sites.filter(s => s.userId === u.id);
    const worst = sites.map(s => s.lastScan && s.lastScan.verdict).filter(Boolean);
    return {
      id: u.id, name: u.name, email: u.email, phone: u.phone || '', company: u.company || '', active: u.active !== false, createdAt: iso(u.createdAt),
      level: ent.level, plan: cur ? cur.plan : null, planName: cur ? PLANS[cur.plan].name : null, orderStatus: cur ? cur.status : null, overdue: cur ? orderInfo(cur).overdue : false,
      sites: sites.length, openTickets: db.tickets.filter(t => t.userId === u.id && t.status !== 'closed').length,
      health: worst.includes('infected') ? 'infected' : worst.includes('suspicious') ? 'suspicious' : worst.includes('risk') ? 'risk' : worst.length ? 'clean' : null
    };
  }
  route('GET', '/api/admin/overview', 'admin', (ctx) => {
    const cl = clientsAll(), sums = cl.map(clientSummary), t = T(), m0 = monthStart();
    const byPlan = {}; Object.keys(PLANS).forEach(k => byPlan[k] = 0);
    sums.forEach(s => { if (s.level === 'active' && s.plan) byPlan[s.plan]++; });
    const revTotal = db.payments.reduce((a, p) => a + p.amount, 0), revMonth = db.payments.filter(p => p.at >= m0).reduce((a, p) => a + p.amount, 0);
    const problemSites = db.sites.filter(s => s.lastScan && (s.lastScan.verdict === 'infected' || s.lastScan.verdict === 'suspicious')).map(s => ({ id: s.id, host: s.host, verdict: s.lastScan.verdict, at: iso(s.lastScan.at), userId: s.userId, client: (db.users.find(u => u.id === s.userId) || {}).name || '' }));
    const waiting = db.tickets.filter(x => x.status === 'open').sort((a, b) => (a.priority === 'priority' ? -1 : 1) - (b.priority === 'priority' ? -1 : 1) || a.updatedAt - b.updatedAt).slice(0, 8).map(x => Object.assign(ticketRow(x), { client: (db.users.find(u => u.id === x.userId) || {}).name || '' }));
    send(ctx.res, 200, {
      kpis: {
        clients: cl.length, pendingPayment: sums.filter(s => s.level === 'pending').length, active: sums.filter(s => s.level === 'active').length,
        overdue: sums.filter(s => s.overdue).length, openTickets: db.tickets.filter(x => x.status === 'open').length, sites: db.sites.length,
        scansWeek: db.scans.filter(s => s.at > t - 7 * DAY).length, revenueMonth: revMonth, revenueTotal: revTotal, currency: 'USD'
      },
      byPlan: Object.keys(PLANS).map(k => ({ id: k, name: PLANS[k].name, count: byPlan[k] })), problemSites, waiting,
      activity: db.activity.slice(-25).reverse().map(a => ({ at: iso(a.at), actor: a.actor, text: a.text, kind: a.kind, userId: a.userId }))
    });
  });
  route('GET', '/api/admin/clients', 'admin', (ctx) => {
    const q = clean(ctx.query.get('q') || '', 80).toLowerCase(), plan = ctx.query.get('plan') || '', level = ctx.query.get('level') || '';
    let list = clientsAll().map(clientSummary);
    if (q) list = list.filter(c => (c.name + ' ' + c.email + ' ' + c.company).toLowerCase().includes(q));
    if (plan) list = list.filter(c => c.plan === plan);
    if (level) list = list.filter(c => c.level === level);
    list.sort((a, b) => (b.createdAt > a.createdAt ? 1 : -1));
    send(ctx.res, 200, { clients: list.slice(0, 500) });
  });
  const clientById = ctx => db.users.find(u => u.id === ctx.params[0] && u.role === 'client');
  route('GET', '/api/admin/clients/:id', 'admin', (ctx) => {
    const u = clientById(ctx); if (!u) return fail(ctx.res, 404, 'Cliente no encontrado.');
    const d = dashboardFor(u);
    send(ctx.res, 200, Object.assign(d, { summary: clientSummary(u), notes: u.notes || '', tickets: db.tickets.filter(t => t.userId === u.id).sort((a, b) => b.updatedAt - a.updatedAt).map(ticketRow), activity: db.activity.filter(a => a.userId === u.id).slice(-30).reverse().map(a => ({ at: iso(a.at), actor: a.actor, text: a.text, kind: a.kind })) }));
  });
  route('POST', '/api/admin/clients', 'admin', async (ctx) => {
    const { body, res, user } = ctx, name = clean(body.name, 80), email = clean(body.email, 254).toLowerCase(), plan = body.plan ? clean(body.plan, 20) : '';
    if (name.length < 2 || !isEmail(email)) return fail(res, 400, 'Nombre y correo válidos son obligatorios.');
    if (plan && !PLANS[plan]) return fail(res, 400, 'Plan no válido.');
    if (db.users.some(u => u.email === email)) return fail(res, 409, 'Ya existe una cuenta con ese correo.');
    const pw = tempPassword() + 'a1';
    const u = { id: id('usr'), email, name, phone: clean(body.phone, 30), company: clean(body.company, 80), role: 'client', pass: await hashPw(pw), createdAt: T(), active: true, mustChangePassword: true };
    db.users.push(u);
    if (plan) db.orders.push({ id: id('ord'), userId: u.id, plan, status: 'pending_payment', stage: 0, amount: PLANS[plan].price, createdAt: T() });
    record(user.name, u.id, 'Creó la cuenta del cliente ' + u.name); save();
    send(res, 201, { client: clientSummary(u), tempPassword: pw });
  });
  route('PATCH', '/api/admin/clients/:id', 'admin', (ctx) => {
    const u = clientById(ctx); if (!u) return fail(ctx.res, 404, 'Cliente no encontrado.');
    const b = ctx.body;
    if (b.name !== undefined) { const n = clean(b.name, 80); if (n.length < 2) return fail(ctx.res, 400, 'Nombre no válido.'); u.name = n; }
    if (b.phone !== undefined) u.phone = clean(b.phone, 30);
    if (b.company !== undefined) u.company = clean(b.company, 80);
    if (b.notes !== undefined) u.notes = clean(b.notes, 2000);
    if (b.active !== undefined) { u.active = !!b.active; if (!u.active) db.sessions = db.sessions.filter(s => s.userId !== u.id); record(ctx.user.name, u.id, u.active ? 'Reactivó la cuenta' : 'Desactivó la cuenta'); }
    save(); send(ctx.res, 200, { client: clientSummary(u) });
  });
  route('POST', '/api/admin/clients/:id/reset-password', 'admin', async (ctx) => {
    const u = clientById(ctx); if (!u) return fail(ctx.res, 404, 'Cliente no encontrado.');
    const pw = tempPassword() + 'a1'; u.pass = await hashPw(pw); u.mustChangePassword = true;
    db.sessions = db.sessions.filter(s => s.userId !== u.id);
    record(ctx.user.name, u.id, 'Restableció la contraseña de ' + u.name); save(); send(ctx.res, 200, { tempPassword: pw });
  });
  route('DELETE', '/api/admin/clients/:id', 'admin', (ctx) => {
    const u = clientById(ctx); if (!u) return fail(ctx.res, 404, 'Cliente no encontrado.');
    if (ctx.body.confirm !== u.email) return fail(ctx.res, 400, 'Para borrar, escribe el correo del cliente como confirmación.');
    db.users = db.users.filter(x => x.id !== u.id);
    ['orders', 'sites', 'scans', 'tickets', 'payments', 'sessions'].forEach(k => db[k] = db[k].filter(x => x.userId !== u.id));
    record(ctx.user.name, null, 'Eliminó al cliente ' + u.name + ' y todos sus datos'); save(); send(ctx.res, 200, { ok: true });
  });
  route('POST', '/api/admin/clients/:id/orders', 'admin', (ctx) => {
    const u = clientById(ctx); if (!u) return fail(ctx.res, 404, 'Cliente no encontrado.');
    const plan = clean(ctx.body.plan, 20); if (!PLANS[plan]) return fail(ctx.res, 400, 'Plan no válido.');
    const o = { id: id('ord'), userId: u.id, plan, status: 'pending_payment', stage: 0, amount: PLANS[plan].price, createdAt: T() };
    db.orders.push(o); record(ctx.user.name, u.id, 'Creó un pedido del plan ' + PLANS[plan].name); save(); send(ctx.res, 201, { order: orderView(o) });
  });
  route('PATCH', '/api/admin/orders/:id', 'admin', (ctx) => {
    const o = db.orders.find(x => x.id === ctx.params[0]); if (!o) return fail(ctx.res, 404, 'Pedido no encontrado.');
    const p = PLANS[o.plan], b = ctx.body;
    let hasPay = db.payments.some(x => x.orderId === o.id);

    if (b.stage !== undefined && p.type === 'oneoff') {
      const s = Math.max(0, Math.min(4, parseInt(b.stage, 10) || 0));
      if (s !== (o.stage || 0)) record(ctx.user.name, o.userId, 'Avance del servicio: ' + s + ' de 4');
      o.stage = s;
      if (s === 4) {
        o.status = 'delivered';
        o.deliveredAt = o.deliveredAt || T();
        if (!hasPay) {
          applyPayment(o, o.amount, p.currency, 'manual', 'Completado por administrador', ctx.user.name);
          hasPay = true;
        }
      } else if (s >= 1 && o.status === 'pending_payment') {
        o.status = 'in_progress';
        if (!hasPay) {
          applyPayment(o, o.amount, p.currency, 'manual', 'Iniciado por administrador', ctx.user.name);
          hasPay = true;
        }
      }
    }

    if (b.status !== undefined) {
      const allowed = p.type === 'subscription' ? SUB_STATUS : ONEOFF_STATUS;
      if (!allowed.includes(b.status)) return fail(ctx.res, 400, 'Estado no válido para este plan.');
      if (o.status === 'pending_payment' && (b.status === 'in_progress' || b.status === 'delivered' || b.status === 'active') && !hasPay) {
        applyPayment(o, o.amount, p.currency, 'manual', 'Confirmado por administrador', ctx.user.name);
        hasPay = true;
      }
      const prev = o.status; o.status = b.status;
      if (b.status === 'delivered') { o.deliveredAt = o.deliveredAt || T(); o.stage = 4; }
      if (b.status === 'in_progress' && prev === 'delivered') { o.deliveredAt = null; if (o.stage === 4) o.stage = 3; }
      if (b.status === 'in_progress' && (o.stage === 0 || o.stage === undefined)) o.stage = 1;
      const L = { pending_payment: 'pendiente de pago', in_progress: 'en progreso', delivered: 'entregado', active: 'activo', cancelled: 'cancelado' };
      if (prev !== b.status) record(ctx.user.name, o.userId, 'Pedido ' + p.name + ': ' + L[prev] + ' → ' + L[b.status]);
    }

    if (b.notes !== undefined) o.notes = clean(b.notes, 1000);
    if (b.nextBilling !== undefined && p.type === 'subscription') { const t = Date.parse(b.nextBilling); if (!isNaN(t)) o.nextBilling = t; }
    save(); send(ctx.res, 200, { order: orderView(o) });
  });
  /**
   * Aplica un pago a un pedido: crea el registro de pago y avanza el estado del pedido
   * (pendiente → en progreso / activo). La usan tanto el administrador (pago manual)
   * como la confirmación de PayPal, para que el efecto sea siempre el mismo.
   */
  function applyPayment(o, amount, currency, method, reference, by) {
    const p = PLANS[o.plan];
    const pay = { id: id('pay'), userId: o.userId, orderId: o.id, amount: Math.round(amount * 100) / 100, currency: currency || p.currency, method: method || 'manual', reference: reference || '', at: T(), by: by || 'sistema' };
    db.payments.push(pay);
    if (!o.licenseKey) {
      const pfx = (p.type === 'subscription') ? 'NXG-PRO' : (p.id === 'blindaje' ? 'NXG-ANNUAL' : 'NXG-LIC');
      o.licenseKey = pfx + '-' + crypto.randomBytes(3).toString('hex').toUpperCase() + '-' + crypto.randomBytes(3).toString('hex').toUpperCase();
    }
    if (o.status === 'pending_payment') { o.paidAt = T(); if (p.type === 'subscription') { o.status = 'active'; o.nextBilling = T() + 30 * DAY; } else o.status = 'in_progress'; }
    else if (p.type === 'subscription' && o.status === 'active') o.nextBilling = Math.max(o.nextBilling || 0, T()) + 30 * DAY;
    return pay;
  }

  route('POST', '/api/admin/orders/:id/payments', 'admin', (ctx) => {
    const o = db.orders.find(x => x.id === ctx.params[0]); if (!o) return fail(ctx.res, 404, 'Pedido no encontrado.');
    const amount = Number(ctx.body.amount);
    if (!(amount > 0) || amount > 1e7) return fail(ctx.res, 400, 'Escribe un monto válido.');
    const p = PLANS[o.plan], pay = applyPayment(o, amount, p.currency, clean(ctx.body.method, 40) || 'manual', clean(ctx.body.reference, 80), ctx.user.name);
    record(ctx.user.name, o.userId, 'Registró un pago de ' + pay.amount + ' ' + pay.currency + ' (' + p.name + ')'); save();
    send(ctx.res, 201, { payment: paymentView(pay), order: orderView(o) });
  });

  /* ---------- Pago con PayPal (automático) ---------- */
  route('GET', '/api/payment/config', null, (ctx) => {
    send(ctx.res, 200, { paypal: pp.enabled ? { clientId: cfg.paypal.clientId, mode: pp.mode } : null });
  });
  route('POST', '/api/checkout/paypal/orders', null, async (ctx) => {
    const { req, res, body } = ctx, ip = clientIp(req);
    if (!pp.enabled) return fail(res, 503, 'El pago con PayPal no está configurado.');
    if (limited('pp-c|' + ip, 20, 3600e3)) return fail(res, 429, 'Demasiados intentos. Espera un momento.');
    const planId = clean(body.plan, 20), plan = PLANS[planId];
    if (!plan) return fail(res, 400, 'Plan no válido.');
    hit('pp-c|' + ip);
    try {
      const order = await pp.createOrder({ amount: plan.price.toFixed(2), currency: plan.currency, referenceId: planId, description: plan.name + ' · NexaGuard', requestId: id('ppreq') });
      send(res, 201, { id: order.id });
    } catch (e) { console.error('paypal createOrder:', e.message); fail(res, 502, 'No se pudo iniciar el pago con PayPal. Inténtalo de nuevo.'); }
  });
  route('POST', '/api/checkout/paypal/orders/:id/capture', null, async (ctx) => {
    const { req, res, user } = ctx, ip = clientIp(req), paypalOrderId = ctx.params[0];
    if (!pp.enabled) return fail(res, 503, 'El pago con PayPal no está configurado.');
    if (limited('pp-x|' + ip, 20, 3600e3)) return fail(res, 429, 'Demasiados intentos. Espera un momento.');
    hit('pp-x|' + ip);

    // Esta orden de PayPal ya se procesó antes (doble clic, reintento de red, etc.):
    // se responde con el mismo resultado SIN volver a pedirle nada a PayPal.
    const seen = db.paypalOrders[paypalOrderId];
    if (seen) {
      const su = db.users.find(x => x.id === seen.userId);
      if (!su) return fail(res, 409, 'Esa orden ya se procesó, pero la cuenta asociada ya no existe.');
      const headers = user ? {} : startSession(req, res, su.id);
      return send(res, 200, { ok: true, user: publicUser(su), alreadyProcessed: true }, headers);
    }

    let cap;
    try { cap = await pp.captureOrder(paypalOrderId, id('ppreq')); }
    catch (e) { console.error('paypal captureOrder:', e.message); return fail(res, 502, 'No se pudo confirmar el pago con PayPal. Si ya pagaste, escríbenos con tu comprobante.'); }
    if (cap.status !== 'COMPLETED') return fail(res, 402, 'El pago no se completó.');
    const pu = cap.purchase_units && cap.purchase_units[0];
    const captured = pu && pu.payments && pu.payments.captures && pu.payments.captures[0];
    if (!captured || captured.status !== 'COMPLETED') return fail(res, 402, 'El pago no se completó.');

    const planId = pu.reference_id, plan = PLANS[planId];
    if (!plan) return fail(res, 400, 'El pago no corresponde a un plan reconocido. Escríbenos con tu comprobante.');
    const amt = parseFloat(captured.amount && captured.amount.value), curr = captured.amount && captured.amount.currency_code;
    if (!(amt > 0) || Math.abs(amt - plan.price) > 0.01 || curr !== plan.currency) return fail(res, 409, 'El monto del pago no coincide con el del plan. Escríbenos con tu comprobante y lo revisamos a mano.');

    let target = user, newTempPass = null, isNewAccount = false;
    if (!target) {
      const email = clean((cap.payer && cap.payer.email_address) || '', 254).toLowerCase();
      if (!isEmail(email)) return fail(res, 400, 'PayPal no nos dio un correo válido. Inicia sesión o crea tu cuenta antes de pagar.');
      target = db.users.find(x => x.email === email && x.role === 'client');
      if (target && target.active === false) return fail(res, 403, 'Esa cuenta está desactivada. Escríbenos para reactivarla.');
      if (!target) {
        const nm = clean([(cap.payer.name && cap.payer.name.given_name) || '', (cap.payer.name && cap.payer.name.surname) || ''].join(' ').trim(), 80) || 'Cliente';
        newTempPass = tempPassword() + 'a1'; isNewAccount = true;
        target = { id: id('usr'), email, name: nm, role: 'client', pass: await hashPw(newTempPass), createdAt: T(), active: true, mustChangePassword: true };
        db.users.push(target);
        record('PayPal', target.id, 'Cuenta creada automáticamente al pagar con PayPal');
      }
    }
    let order = db.orders.find(o => o.userId === target.id && o.plan === planId && o.status === 'pending_payment');
    if (!order) { order = { id: id('ord'), userId: target.id, plan: planId, status: 'pending_payment', stage: 0, amount: plan.price, createdAt: T() }; db.orders.push(order); }
    const pay = applyPayment(order, amt, curr, 'paypal', captured.id, 'PayPal');
    db.paypalOrders[paypalOrderId] = { userId: target.id, orderId: order.id, paymentId: pay.id, at: T() };
    record(isNewAccount ? 'PayPal' : target.name, target.id, 'Pago con PayPal recibido: ' + pay.amount + ' ' + pay.currency + ' (' + plan.name + ')');
    save();
    const headers = user ? {} : startSession(req, res, target.id);
    send(res, 201, { ok: true, user: publicUser(target), order: orderView(order), tempPassword: newTempPass }, headers);
  });

  /* ---------- Validación de Licencias para el Plugin WordPress ---------- */
  route('POST', '/api/license/validate', null, (ctx) => {
    const { body, res } = ctx;
    const key = clean(body.key || '', 60).toUpperCase();
    const domain = clean(body.domain || '', 120).toLowerCase().replace(/^https?:\/\//, '').replace(/\/.*$/, '');

    if (!key) return fail(res, 400, 'Clave de licencia requerida.');

    const order = db.orders.find(o => (o.licenseKey === key || (o.id && key.includes(o.id.toUpperCase()))));
    const isAnnual = key.startsWith('NXG-ANNUAL') || (order && order.plan === 'blindaje');
    const isPro = key.startsWith('NXG-PRO') || (order && (order.plan === 'security_pro' || order.plan === 'guardian'));

    const now = T();
    let createdAt = order ? (order.paidAt || order.createdAt) : now;
    let expiresAt = isAnnual ? (createdAt + 365 * DAY) : (order && order.nextBilling ? order.nextBilling : createdAt + 30 * DAY);

    if (order) {
      const info = orderInfo(order);
      if (info.accessUntil) expiresAt = info.accessUntil;
    }

    const diffMs = expiresAt - now;
    const daysLeft = Math.ceil(diffMs / DAY);
    const isExpired = diffMs <= 0;
    const isExpiringSoon = !isExpired && daysLeft <= 7;
    const status = isExpired ? 'expired' : isExpiringSoon ? 'expiring_soon' : 'active';
    const planName = isAnnual ? 'Licencia Anual (1 Año) · NexaGuard Pro' : 'Plan NexaGuard Security Pro (Mensual)';

    send(res, 200, {
      valid: !isExpired,
      status,
      plan: planName,
      period: isAnnual ? 'annual' : 'monthly',
      expires_at: expiresAt,
      expires_formatted: new Date(expiresAt).toLocaleDateString('es-ES', { day: '2-digit', month: '2-digit', year: 'numeric' }),
      days_left: Math.max(0, daysLeft),
      domain: domain,
      notice: isExpired
        ? 'Tu suscripción a NexaGuard Security Pro ha vencido. Debes abonar tu mensualidad para reactivar el Sistema de Vigilancia 24h y las actualizaciones en tiempo real.'
        : isExpiringSoon
          ? 'Atención: Tu suscripción a NexaGuard Security Pro vencerá en ' + daysLeft + ' días. Renueva a tiempo en nexaguards.com para mantener el escudo activo.'
          : 'Licencia activa y sincronizada con NexaGuard Threat Cloud.',
      renew_url: 'https://www.nexaguards.com/#planes',
      features: {
        vigilance_24h: !isExpired,
        deep_clean: true,
        cloud_intel: !isExpired
      }
    });
  });
  route('GET', '/api/admin/tickets', 'admin', (ctx) => {
    const st = ctx.query.get('status') || '';
    let list = db.tickets.slice(); if (st) list = list.filter(t => t.status === st);
    list.sort((a, b) => (a.status === 'closed') - (b.status === 'closed') || (b.priority === 'priority') - (a.priority === 'priority') || b.updatedAt - a.updatedAt);
    send(ctx.res, 200, { tickets: list.slice(0, 300).map(t => Object.assign(ticketRow(t), { client: (db.users.find(u => u.id === t.userId) || {}).name || '' })) });
  });
  const anyTicket = ctx => db.tickets.find(t => t.id === ctx.params[0]);
  route('GET', '/api/admin/tickets/:id', 'admin', (ctx) => { const t = anyTicket(ctx); t ? send(ctx.res, 200, { ticket: Object.assign(ticketFull(t), { client: (db.users.find(u => u.id === t.userId) || {}).name || '' }) }) : fail(ctx.res, 404, 'Solicitud no encontrada.'); });
  route('POST', '/api/admin/tickets/:id/messages', 'admin', (ctx) => {
    const t = anyTicket(ctx); if (!t) return fail(ctx.res, 404, 'Solicitud no encontrada.');
    const text = clean(ctx.body.text, 4000); if (!text) return fail(ctx.res, 400, 'Escribe tu respuesta.');
    t.messages.push({ id: id('m'), from: 'admin', name: ctx.user.name, text, at: T() }); t.status = 'answered'; t.updatedAt = T();
    record(ctx.user.name, t.userId, 'Respondió la solicitud: ' + t.subject); save(); send(ctx.res, 201, { ticket: ticketFull(t) });
  });
  route('PATCH', '/api/admin/tickets/:id', 'admin', (ctx) => {
    const t = anyTicket(ctx); if (!t) return fail(ctx.res, 404, 'Solicitud no encontrada.');
    if (!TICKET_STATUS.includes(ctx.body.status)) return fail(ctx.res, 400, 'Estado no válido.');
    t.status = ctx.body.status; t.updatedAt = T(); save(); send(ctx.res, 200, { ticket: ticketFull(t) });
  });
  route('GET', '/api/admin/scans', 'admin', (ctx) => {
    const v = ctx.query.get('verdict') || '';
    let list = db.scans.slice().sort((a, b) => b.at - a.at); if (v) list = list.filter(s => s.verdict === v);
    send(ctx.res, 200, { scans: list.slice(0, 200).map(s => Object.assign(scanRow(s), { client: (db.users.find(u => u.id === s.userId) || {}).name || '', userId: s.userId })) });
  });
  route('GET', '/api/admin/scans/:id', 'admin', (ctx) => { const sc = db.scans.find(x => x.id === ctx.params[0]); sc ? send(ctx.res, 200, Object.assign(scanRow(sc), { findings: sc.findings, meta: sc.meta })) : fail(ctx.res, 404, 'Análisis no encontrado.'); });
  route('GET', '/api/admin/settings', 'admin', (ctx) => send(ctx.res, 200, { paymentInstructions: (db.settings && db.settings.paymentInstructions) || DEFAULT_PAYMENT_TEXT, plans: Object.values(PLANS).map(planView) }));
  route('PATCH', '/api/admin/settings', 'admin', (ctx) => {
    if (ctx.body.paymentInstructions !== undefined) { db.settings = db.settings || {}; db.settings.paymentInstructions = clean(ctx.body.paymentInstructions, 1500); }
    save(); send(ctx.res, 200, { ok: true });
  });
  route('GET', '/api/admin/export.csv', 'admin', (ctx) => {
    const cell = v => { let s = String(v == null ? '' : v); if (/^[=+\-@\t\r]/.test(s)) s = "'" + s; return '"' + s.replace(/"/g, '""') + '"'; };
    const rows = [['Nombre', 'Correo', 'Teléfono', 'Empresa', 'Plan', 'Estado', 'Sitios', 'Estado de seguridad', 'Alta']];
    clientsAll().map(clientSummary).forEach(c => rows.push([c.name, c.email, c.phone, c.company, c.planName || '', c.level, c.sites, c.health || '', c.createdAt]));
    ctx.res.writeHead(200, { 'Content-Type': 'text/csv; charset=utf-8', 'Content-Disposition': 'attachment; filename="clientes.csv"', 'Cache-Control': 'no-store' });
    ctx.res.end('\ufeff' + rows.map(r => r.map(cell).join(',')).join('\r\n'));
  });

  /* ---------- Entrada: devuelve true si la petición fue para /api ---------- */
  async function handle(req, res) {
    const u = new URL(req.url, 'http://x'), pathname = u.pathname;
    if (!pathname.startsWith('/api/')) return false;
    try {
      const isPublicExternalApi = pathname === '/api/license/validate';
      const origin = req.headers.origin;
      if (isPublicExternalApi) {
        res.setHeader('Access-Control-Allow-Origin', '*');
        res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
        res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
        if (req.method === 'OPTIONS') { res.statusCode = 204; res.end(); return true; }
      } else if (origin) {
        const host = req.headers.host, same = origin === 'http://' + host || origin === 'https://' + host;
        if (!same) return fail(res, 403, 'Origen no permitido.'), true;
      }
      const r = routes.find(x => x.method === req.method && x.re.test(pathname));
      if (!r) return fail(res, 404, 'No encontrado.'), true;
      if (req.method !== 'GET' && !isPublicExternalApi && req.headers['x-requested-with'] !== 'parche') return fail(res, 403, 'Petición no válida.'), true;
      const user = sessionUser(req);
      if (r.role) {
        if (!user) return fail(res, 401, 'Inicia sesión para continuar.'), true;
        if (r.role !== 'any' && user.role !== r.role) return fail(res, 403, 'No tienes permiso para esto.'), true;
      }
      let body = {};
      if (req.method !== 'GET') body = await readBody(req);
      await r.fn({ req, res, user, body, params: pathname.match(r.re).slice(1), query: u.searchParams });
    } catch (e) {
      if (e.code === 413 || e.code === 400) fail(res, e.code, e.message);
      else { console.error('api error:', e); if (!res.headersSent) fail(res, 500, 'Error interno.'); else res.end(); }
    }
    return true;
  }

  return { handle, ensureAdmin, startScheduler, schedulerTick, entitlement, PLANS, db };
}

module.exports = { createApp, PLANS, STAGES };
