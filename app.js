'use strict';
/* Cuentas, roles (administrador / cliente), planes y API de los paneles. Sin dependencias. */
const crypto = require('crypto');
const { createPayPalClient } = require('./paypal.js');
const { createNowPaymentsClient } = require('./nowpayments.js');
const { createMailer } = require('./mailer.js');

const DAY = 864e5;

/* ---------- Planes: aquí defines qué incluye cada uno ---------- */
const PLANS = {
  free: {
    id: 'free', tier: 0, name: 'Plan Gratuito (Community)', price: 0, currency: 'USD', period: 'gratis para siempre', type: 'free',
    sites: 1, scansPerMonth: 2, scheduled: false, priority: false, afterDeliveryDays: 0, response: 'comunidad',
    features: ['Plugin Oficial NexaGuard Security (.zip)', 'Escáner interno de malware y webshells', 'Diagnóstico forense rápido en 15 segundos', 'Firewall WAF básico anti-inyecciones', 'Sin tarjeta de crédito requerida']
  },
  security_pro: {
    id: 'security_pro', tier: 1, name: 'Plan NexaGuard Security Pro', price: 9.99, currency: 'USD', period: 'al mes', type: 'subscription',
    sites: 1, scansPerMonth: null, scheduled: true, scanEveryHours: 12, priority: true, afterDeliveryDays: 0, response: 'inmediata',
    features: ['Licencia Oficial NexaGuard Security PRO para WordPress', 'Sistema de Vigilancia 24 Horas contra amenazas activo', 'Auditoría forense y erradicación de malware con 1 clic', 'Sincronización en tiempo real con NexaGuard Threat Cloud', 'Actualizaciones continuas de firmas Zero-Day']
  },
  security_pro_annual: {
    id: 'security_pro_annual', tier: 1, name: 'Plan NexaGuard Security Pro (Anual)', price: 79, currency: 'USD', period: 'al año', type: 'subscription',
    sites: 1, scansPerMonth: null, scheduled: true, scanEveryHours: 12, priority: true, afterDeliveryDays: 0, response: 'inmediata',
    features: ['1 Año Completo de Licencia Oficial NexaGuard Security PRO', 'Sistema de Vigilancia 24 Horas continuo', 'Auditoría forense y erradicación de malware con 1 clic', 'Sincronización en tiempo real con NexaGuard Threat Cloud', 'Actualizaciones continuas de firmas Zero-Day · 2 meses gratis']
  },
  rescate: {
    id: 'rescate', tier: 2, name: 'Rescate', price: 89, currency: 'USD', period: 'pago único', type: 'oneoff',
    sites: 1, scansPerMonth: 3, scheduled: false, priority: false, afterDeliveryDays: 14, response: '24 a 48 horas',
    features: ['Limpieza forense humana de archivos y base de datos', 'Plugin NexaGuard Security incluido para análisis interno', 'Reparación de errores críticos del sitio', 'Informe detallado de intrusiones', '3 análisis del escáner web por mes']
  },
  blindaje: {
    id: 'blindaje', tier: 3, name: 'Rescate + Blindaje', price: 189, currency: 'USD', period: 'pago único', type: 'oneoff',
    sites: 1, scansPerMonth: 10, scheduled: false, priority: true, afterDeliveryDays: 365, response: 'menos de 24 horas',
    features: ['Todo lo del plan Rescate', '1 Año Completo de Licencia NexaGuard Security PRO incluida', 'Firewall (WAF) y 2FA configurados por expertos', 'wp-config y permisos endurecidos', 'Revisión y deslistado de Google Safe Browsing', 'Garantía de 30 días y atención prioritaria']
  },
  guardian: {
    id: 'guardian', tier: 4, name: 'Guardián', price: 39, currency: 'USD', period: 'al mes', type: 'subscription',
    sites: 1, scansPerMonth: null, scheduled: true, scanEveryHours: 24, priority: true, afterDeliveryDays: 0, response: 'menos de 24 horas',
    features: ['Licencia NexaGuard Security PRO siempre activa', 'Sistema de Vigilancia 24 Horas continuo', 'Monitoreo automático diario con el escáner', 'Backups diarios y actualizaciones probadas asistidas', 'Limpiezas y soporte prioritario incluidos']
  },
  guardian_annual: {
    id: 'guardian_annual', tier: 4, name: 'Plan Guardián (Anual)', price: 390, currency: 'USD', period: 'al año', type: 'subscription',
    sites: 1, scansPerMonth: null, scheduled: true, scanEveryHours: 24, priority: true, afterDeliveryDays: 0, response: 'menos de 24 horas',
    features: ['1 Año de Licencia NexaGuard Security PRO activa', 'Sistema de Vigilancia 24 Horas continuo', 'Monitoreo automático diario con el escáner', 'Backups diarios y actualizaciones probadas asistidas', 'Limpiezas y soporte prioritario incluidos (Ahorras $78)']
  },
  agency: {
    id: 'agency', tier: 5, name: 'Plan Agencia / Freelancer', price: 29.99, currency: 'USD', period: 'al mes', type: 'subscription',
    sites: 5, scansPerMonth: null, scheduled: true, scanEveryHours: 12, priority: true, afterDeliveryDays: 0, response: 'inmediata',
    features: ['Licencia Multidominio Oficial NexaGuard PRO', 'Protección para 5, 10, 25 o 50 sitios web simultáneos', 'Radar de Vigilancia 24H y Erradicación en cada sitio', '1 sola clave de licencia para centralizar a tus clientes', 'Actualizaciones continuas y soporte prioritario para agencias']
  },
  agency_annual: {
    id: 'agency_annual', tier: 5, name: 'Plan Agencia / Freelancer (Anual)', price: 289, currency: 'USD', period: 'al año', type: 'subscription',
    sites: 5, scansPerMonth: null, scheduled: true, scanEveryHours: 12, priority: true, afterDeliveryDays: 0, response: 'inmediata',
    features: ['1 Año Completo de Licencia Multidominio Oficial NexaGuard PRO', 'Protección para 5, 10, 25 o 50 sitios web simultáneos', 'Radar de Vigilancia 24H y Erradicación en cada sitio', '1 sola clave de licencia para centralizar a tus clientes', 'Ahorro de hasta $310 al año y soporte prioritario']
  }
};

function getPlanPrice(planId, maxSites) {
  const p = PLANS[planId];
  if (!p) return 0;
  if (planId === 'agency') {
    const s = Number(maxSites) || 5;
    if (s <= 5) return 29.99;
    if (s <= 10) return 49.99;
    if (s <= 25) return 99.99;
    return 179.99;
  }
  if (planId === 'agency_annual') {
    const s = Number(maxSites) || 5;
    if (s <= 5) return 289;
    if (s <= 10) return 490;
    if (s <= 25) return 890;
    return 1590;
  }
  return p.price;
}
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

function createApp({ store, scanner, waf, sentinel, config }) {
  const { db, save, id } = store;
  const cfg = Object.assign({ trustProxy: false, secureCookie: null, maxConcurrent: 4, schedulerMs: 15 * 60e3, cooldownMs: 45e3 }, config || {});
  let running = 0, dummy = null;
  const pp = createPayPalClient(cfg.paypal || {});
  const np = createNowPaymentsClient(cfg.nowpayments || {});
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
    return (req.socket && req.socket.remoteAddress) || '0';
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
  const fail = (res, code, message) => send(res, code, { error: message, message: message });
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
    if (p && (p.type === 'free' || o.plan === 'free')) {
      access = o.status === 'active';
      accessUntil = t + 3650 * DAY;
      overdue = false;
    } else if (p && p.type === 'subscription') {
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
    const exp = getLicenseExpiration(o);
    const maxSites = o.maxSites || (p && p.sites) || 1;
    const planDisplayName = (maxSites > 1 && p && p.id === 'agency') ? (p.name + ' (' + maxSites + ' Sitios)') : (p ? p.name : o.plan);
    const domains = Array.isArray(o.activatedDomains) ? o.activatedDomains : (o.activatedDomain ? [o.activatedDomain] : []);
    return {
      id: o.id, plan: o.plan, planName: planDisplayName, type: p ? p.type : 'subscription', status: o.status, stage: o.stage || 0, amount: o.amount, currency: p ? p.currency : 'USD', period: p ? p.period : 'al mes',
      createdAt: iso(o.createdAt), paidAt: iso(o.paidAt), deliveredAt: iso(o.deliveredAt), nextBilling: iso(o.nextBilling), notes: o.notes || '',
      access: info.access, accessUntil: iso(info.accessUntil), overdue: info.overdue,
      licenseKey: o.licenseKey || null,
      maxSites: maxSites,
      activatedDomains: domains,
      activatedDomain: domains.join(', ') || null,
      transferCount: typeof o.transferCount === 'number' ? o.transferCount : 0,
      transferredDomains: o.transferredDomains || domains,
      expiresAt: exp.expiresAt,
      expiresFormatted: exp.expiresFormatted,
      daysLeft: exp.daysLeft,
      isExpiringSoon: exp.isExpiringSoon,
      isExpired: exp.isExpired,
      licenseStatus: exp.licenseStatus
    };
  }
  function getLicenseExpiration(o) {
    if (!o) return { expiresAt: null, expiresFormatted: '—', daysLeft: 0, isExpired: true, isExpiringSoon: false, licenseStatus: 'expired' };
    const p = PLANS[o.plan] || {};
    const now = T();
    let expiresAt = null;

    if (p && (p.type === 'free' || o.plan === 'free')) {
      expiresAt = now + 3650 * DAY;
      return {
        expiresAt,
        expiresFormatted: 'Gratis para siempre',
        daysLeft: 99999,
        isExpired: false,
        isExpiringSoon: false,
        licenseStatus: 'active'
      };
    } else if (p && p.type === 'subscription') {
      const isAnnualSub = (p.id && p.id.endsWith('_annual')) || (p.period && p.period.includes('año'));
      expiresAt = o.nextBilling || ((o.paidAt || o.createdAt) + (isAnnualSub ? 365 * DAY : 30 * DAY));
    } else if (o.plan === 'blindaje' || (o.plan && o.plan.endsWith('_annual'))) {
      const start = o.paidAt || o.createdAt || now;
      expiresAt = start + 365 * DAY;
    } else if (p.afterDeliveryDays) {
      const start = o.deliveredAt || o.paidAt || o.createdAt || now;
      expiresAt = start + p.afterDeliveryDays * DAY;
    } else {
      const info = orderInfo(o);
      expiresAt = info.accessUntil || (o.paidAt ? o.paidAt + 30 * DAY : (o.createdAt + 30 * DAY));
    }

    const diffMs = expiresAt - now;
    const daysLeft = Math.ceil(diffMs / DAY);
    const isCancelled = o.status === 'cancelled' || o.status === 'pending_payment';
    const isExpired = isCancelled || diffMs <= 0;
    const isExpiringSoon = !isExpired && daysLeft <= 7;
    const licenseStatus = isExpired ? 'expired' : (isExpiringSoon ? 'expiring_soon' : 'active');

    return {
      expiresAt,
      expiresFormatted: new Date(expiresAt).toLocaleDateString('es-ES', { day: '2-digit', month: '2-digit', year: 'numeric' }),
      daysLeft,
      isExpired,
      isExpiringSoon,
      licenseStatus
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
    if (bad(rec.verdict) && !bad(prev)) {
      record(trigger === 'auto' ? 'monitoreo' : 'escáner', userId, 'ALERTA: ' + site.host + ' ahora figura como ' + (rec.verdict === 'infected' ? 'INFECTADO' : 'con señales sospechosas'), 'alert');
      if (mailer && typeof mailer.sendThreatAlertEmail === 'function') {
        const u = db.users.find(x => x.id === userId);
        mailer.sendThreatAlertEmail({
          siteUrl: site.url || site.host,
          host: site.host,
          verdict: rec.verdict,
          threatCount: (rec.counts && (rec.counts.crit + rec.counts.warn)) || findings.length,
          findings: findings.slice(0, 10),
          clientEmail: u ? u.email : '',
          clientName: u ? u.name : 'Cliente'
        }).catch(err => console.error('Error enviando alerta de amenaza por correo:', err.message));
      }
    }
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
  // Desafío anti-spam ligero, sin trackers de terceros y firmado con HMAC
  route('GET', '/api/captcha', null, (ctx) => {
    const a = Math.floor(Math.random() * 8) + 2; // 2..9
    const b = Math.floor(Math.random() * 8) + 1; // 1..8
    const ts = Date.now();
    const hmacSecret = cfg.adminPassword || 'nexaguard-captcha-secret-2026';
    const payload = `${a}:${b}:${ts}`;
    const sig = crypto.createHmac('sha256', hmacSecret).update(payload).digest('hex');
    const token = Buffer.from(payload).toString('base64').replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '') + '.' + sig;
    send(ctx.res, 200, {
      question: `¿Cuánto es ${a} + ${b}?`,
      token: token
    });
  });

  // Formulario de contacto seguro con protección anti-spam de 3 capas
  route('POST', '/api/contact', null, async (ctx) => {
    const { req, res, body } = ctx, ip = clientIp(req);
    if (limited('contact|' + ip, 6, 10 * 60e3)) {
      return fail(res, 429, 'Has enviado varios mensajes recientemente. Por favor espera unos minutos antes de intentar de nuevo.');
    }

    // Capa 1: Trampa Honeypot invisible (caída silenciosa para bots)
    if (body.website_url_hp && String(body.website_url_hp).trim().length > 0) {
      // Respondemos con 200 para despistar al bot sin enviar correos ni gastar recursos
      return send(res, 200, { ok: true, message: '¡Mensaje enviado con éxito! Te responderemos muy pronto a tu correo.' });
    }

    // Capa 2 y 3: Captcha y Verificación criptográfica con control de tiempo
    const captchaToken = clean(body.captcha_token, 400);
    const captchaAnswer = clean(body.captcha_answer, 20);

    if (!captchaToken || !captchaAnswer) {
      return fail(res, 400, 'Por favor resuelve la pregunta de seguridad anti-spam.');
    }

    const tokenParts = captchaToken.split('.');
    if (tokenParts.length !== 2) {
      return fail(res, 400, 'Token de seguridad inválido. Por favor recarga el formulario.');
    }

    const [b64Payload, sig] = tokenParts;
    const hmacSecret = cfg.adminPassword || 'nexaguard-captcha-secret-2026';
    let decodedPayload = '';
    try {
      const b64 = b64Payload.replace(/-/g, '+').replace(/_/g, '/');
      decodedPayload = Buffer.from(b64, 'base64').toString('utf8');
    } catch (_) {
      return fail(res, 400, 'Token de seguridad no procesable.');
    }

    const expectedSig = crypto.createHmac('sha256', hmacSecret).update(decodedPayload).digest('hex');
    if (sig !== expectedSig) {
      return fail(res, 400, 'La firma de seguridad no coincide. Intenta de nuevo.');
    }

    const [sa, sb, sts] = decodedPayload.split(':');
    const a = parseInt(sa, 10);
    const b = parseInt(sb, 10);
    const ts = parseInt(sts, 10);

    if (isNaN(a) || isNaN(b) || isNaN(ts)) {
      return fail(res, 400, 'Parámetros de seguridad corruptos.');
    }

    const now = Date.now();
    // Mínimo 1.5 segundos: bots headless que disparan instantáneamente
    if (now - ts < 1500) {
      return fail(res, 400, 'Envío demasiado rápido. Por favor tómate un momento para revisar tus datos.');
    }
    // Máximo 15 minutos: evitar reutilización de tokens viejos
    if (now - ts > 15 * 60 * 1000) {
      return fail(res, 400, 'La sesión de seguridad ha expirado. Haz clic en recargar verificación.');
    }

    // Verificación matemática
    if (parseInt(captchaAnswer, 10) !== (a + b)) {
      return fail(res, 400, 'Respuesta incorrecta a la pregunta de seguridad. Inténtalo de nuevo.');
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
    let createdOrder = null;
    if (plan) {
      const maxSites = Math.max(1, Math.min(100, Number(body.maxSites) || (PLANS[plan] ? PLANS[plan].sites : 1) || 1));
      const o = { id: id('ord'), userId: u.id, plan, maxSites, status: 'pending_payment', stage: 0, amount: PLANS[plan].price, createdAt: T() };
      db.orders.push(o);
      if (PLANS[plan].price === 0) {
        applyPayment(o, 0, PLANS[plan].currency, 'free', 'PROMO-FREE', 'sistema');
      }
      createdOrder = o;
    }
    record(u.name, u.id, 'Se registró' + (plan ? ' y eligió el plan ' + PLANS[plan].name : ''));
    const headers = startSession(req, res, u.id);
    send(res, 201, { user: publicUser(u), order: createdOrder ? orderView(createdOrder) : null }, headers);
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

  // Social Proof: Ventas recientes para notificación en vivo del frontend
  route('GET', '/api/public/recent-sales', null, (ctx) => {
    const paidOrders = db.orders
      .filter(o => o.licenseKey && (o.paidAt || o.status === 'active' || o.status === 'delivered'))
      .slice(-25)
      .reverse();

    const realSales = [];
    for (const o of paidOrders) {
      const u = db.users.find(x => x.id === o.userId) || {};
      // Excluir órdenes de administradores y cuentas de prueba interna
      if (u.role === 'admin' || u.role === 'administrator') continue;

      const rawName = (u.name || '').trim();
      const lower = rawName.toLowerCase();
      if (!rawName || lower.includes('admin') || lower.includes('soporte') || lower.includes('test') || lower.includes('prueba')) {
        continue;
      }

      const p = PLANS[o.plan] || {};
      const parts = rawName.split(/\s+/);
      const safeName = parts.length > 1 ? (parts[0] + ' ' + parts[1][0] + '.') : parts[0];
      const diffMs = Math.max(60000, T() - (o.paidAt || o.createdAt || T()));
      const mins = Math.floor(diffMs / 60000);
      const hours = Math.floor(mins / 60);
      const days = Math.floor(hours / 24);
      let timeAgo = mins < 60 ? `hace ${mins} min` : (hours < 24 ? `hace ${hours} h` : `hace ${days} d`);

      realSales.push({
        name: safeName,
        plan: p.name || 'Plan NexaGuard Security Pro',
        timeAgo: timeAgo,
        isReal: true
      });
      if (realSales.length >= 10) break;
    }

    send(ctx.res, 200, { sales: realSales });
  });

  // NexaGuard Real-Time Cloud Threat Intelligence Feed
  route('GET', '/api/threat-intel', null, (ctx) => {
    send(ctx.res, 200, {
      status: 'active',
      cloud: 'NexaGuard Global Threat Intelligence',
      feed_version: '2026.10.07',
      updated_at: new Date().toISOString(),
      threat_signatures: [
        { id: 'clearfake_bsc', name: 'ClearFake / EtherHiding Smart Contract', chain: 97, pattern: '0xA1decFB' },
        { id: 'clearfake_bsc_2', name: 'ClearFake / EtherHiding Smart Contract', chain: 97, pattern: '0x46790e2' },
        { id: 'sc_mesh_loader', name: 'SC WordPress Malware Self-Healing Mesh (Sucuri 2026)', pattern: 'SC_AUTO_PREPEND|SC_START|SC_END|SC_BLOCK' },
        { id: 'blockchain_c2_eth_rpc', name: 'Ethereum Web3 RPC Gateway C2 (Infura/Ankr/Alchemy)', pattern: 'mainnet\\.infura\\.io|rpc\\.ankr\\.com|cloudflare-eth\\.com' },
        { id: 'dropin_persistence', name: 'Compromised WordPress Drop-In (wp-content/db.php, advanced-cache.php)', pattern: 'dropin_infected|rogue_shim_file' },
        { id: 'shared_memory_persistence', name: 'Shared Memory IPC Backdoor Persistence (System V)', pattern: 'shmop_open|shmat|ftok' },
        { id: 'auto_prepend_hijack', name: 'PHP Prepend Execution Hijack (.user.ini / php.ini)', pattern: 'auto_prepend_file.*\\.php' },
        { id: 'comment2shell_xss', name: 'Comment2Shell KSES Newline Bypass (CVE-2026-93485)', pattern: 'comment2shell|<[a-z]+[^>]*[\\r\\n]+[^>]*javascript:' },
        { id: 'arbitrary_upload_wwlc', name: 'Arbitrary File Upload Vulnerability (CVE-2026-27540)', pattern: 'wwlc_file_upload_handler|unauthenticated.*upload' },
        { id: 'hseo_trojan', name: 'HSEO Trojan / Rogue Backdoor Plugin', pattern: 'wp-content/plugins/hseo/' },
        { id: 'clickfix_ps', name: 'ClickFix PowerShell / Smuggling Execution (CTM360 2026)', pattern: 'powershell -e|curl.*\\|\\s*powershell|Invoke-Expression' },
        { id: 'webshell_classic', name: 'WebShell Signatures (WSO/c99/r57/p0wny)', pattern: 'c99shell|r57shell|WSO_VERSION|FilesMan|b374k|p0wny-shell' },
        { id: 'nulled_hex_packer', name: 'Nulled Hex/Octal Obfuscation Packer', pattern: '(\\x[0-9a-f]{2}){6,}' },
        { id: 'nulled_dropper', name: 'Remote Code Dropper / Downloader', pattern: 'file_put_contents.*(wp_remote_get|file_get_contents|curl_exec)' },
        { id: 'header_backdoor', name: 'Header-based Execution Backdoor', pattern: 'eval.*\\$_SERVER\\[[\'"]HTTP_' },
        { id: 'traffic_hijack', name: 'Traffic Direction / Balada Redirect', pattern: 'location\\.href.*(traffic|gate|redirect|delivery)' },
        { id: 'fake_antimalware_bot', name: 'Wordfence 2025 Fake Anti-Malware Bot Trojan', pattern: 'WP-antymalwary-bot|acpp_ping_event|45\\.61\\.136\\.85' },
        { id: 'stealth_hider', name: 'Dashboard Stealth Plugin Hider (all_plugins)', pattern: 'all_plugins.*plugin_basename' },
        { id: 'supply_chain_c2', name: 'WordPress.org Supply Chain C2 Drainer Attack', pattern: '94\\.156\\.79\\.8|hostpdf\\.co|pachamama' },
        { id: 'cron_dropper_reinstaller', name: 'wp-cron.php Persistence Reinstaller', pattern: 'START CUSTOM CODE|activate_plugin.*WP-antymalwary-bot' },
        { id: 'core_tampering_mismatch', name: 'WordPress.org Core Checksum Hash Mismatch', pattern: 'checksum_mismatch|rogue_core_file' },
        { id: 'insecure_salts', name: 'Insecure Default Salts in wp-config.php', pattern: 'put your unique phrase here' },
        { id: 'htaccess_hijack', name: 'Malicious SEO Traffic Redirect in .htaccess', pattern: 'RewriteRule.*https?:\\/\\/' }
      ],
      whitelisted_frameworks: [
        'uploads/redux/',
        'uploads/elementor/',
        'uploads/elementor-widget/',
        'uploads/et-cache/',
        'uploads/astra-addon/',
        'wp-content/plugins/fluentform/',
        'wp-content/plugins/wp-file-manager/',
        'wp-content/plugins/elementskit/',
        'wp-content/plugins/js_composer/'
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
    const maxSites = Math.max(1, Math.min(100, Number(body.maxSites) || (PLANS[plan] ? PLANS[plan].sites : 1) || 1));
    const o = { id: id('ord'), userId: user.id, plan, maxSites, status: 'pending_payment', stage: 0, amount: PLANS[plan].price, createdAt: T() };
    db.orders.push(o);
    if (PLANS[plan].price === 0) {
      applyPayment(o, 0, PLANS[plan].currency, 'free', 'PROMO-FREE', user.name);
    }
    record(user.name, user.id, (PLANS[plan].price === 0 ? 'Activó el plan ' : 'Solicitó el plan ') + PLANS[plan].name + (maxSites > 1 ? ' (' + maxSites + ' sitios)' : '')); save();
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
    const licOrders = db.orders.filter(o => o.licenseKey && o.status !== 'pending_payment');
    const expiringLicenses = licOrders.filter(o => getLicenseExpiration(o).isExpiringSoon).length;
    const expiredLicenses = licOrders.filter(o => getLicenseExpiration(o).isExpired).length;
    send(ctx.res, 200, {
      kpis: {
        clients: cl.length, pendingPayment: sums.filter(s => s.level === 'pending').length, active: sums.filter(s => s.level === 'active').length,
        overdue: sums.filter(s => s.overdue).length, openTickets: db.tickets.filter(x => x.status === 'open').length, sites: db.sites.length,
        scansWeek: db.scans.filter(s => s.at > t - 7 * DAY).length, revenueMonth: revMonth, revenueTotal: revTotal, currency: 'USD',
        expiringLicenses, expiredLicenses
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
      const pfx = (p && (p.id === 'free' || p.type === 'free' || o.plan === 'free'))
        ? 'NXG-FREE'
        : ((p && p.id === 'agency') || (o.maxSites && o.maxSites > 1)
          ? 'NXG-AGENCY'
          : ((p && p.type === 'subscription')
            ? 'NXG-PRO'
            : (p && p.id === 'blindaje'
              ? 'NXG-ANNUAL'
              : 'NXG-LIC')));
      o.licenseKey = pfx + '-' + crypto.randomBytes(3).toString('hex').toUpperCase() + '-' + crypto.randomBytes(3).toString('hex').toUpperCase();
    }
    if (o.status === 'pending_payment') {
      o.paidAt = T();
      if (p && p.type === 'subscription') {
        o.status = 'active';
        o.nextBilling = T() + 30 * DAY;
      } else if (p && (p.type === 'free' || p.id === 'free')) {
        o.status = 'active';
        o.nextBilling = T() + 3650 * DAY;
      } else {
        o.status = 'in_progress';
      }
    } else if (p && p.type === 'subscription' && o.status === 'active') {
      o.nextBilling = Math.max(o.nextBilling || 0, T()) + 30 * DAY;
    }
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

  /* ---------- Activación Inmediata de Planes Gratuitos / Promocionales ($0) ---------- */
  route('POST', '/api/checkout/free', null, async (ctx) => {
    const { req, res, user, body } = ctx;
    const planId = clean(body.plan, 20), plan = PLANS[planId];
    if (!plan) return fail(res, 400, 'Plan no válido.');
    if (plan.price > 0) return fail(res, 400, 'Este plan requiere pago.');
    let target = user;
    if (!target) return fail(res, 401, 'Debes iniciar sesión para activar tu plan.');
    const maxSites = Math.max(1, Math.min(100, Number(body.maxSites) || (plan ? plan.sites : 1) || 1));
    let order = db.orders.find(o => o.userId === target.id && o.plan === planId && (o.status === 'pending_payment' || o.status === 'active' || o.status === 'in_progress'));
    if (!order) {
      order = { id: id('ord'), userId: target.id, plan: planId, maxSites, status: 'pending_payment', stage: 0, amount: 0, createdAt: T() };
      db.orders.push(order);
    } else if (body.maxSites) {
      order.maxSites = maxSites;
    }
    const pay = applyPayment(order, 0, plan.currency || 'USD', 'free', 'PROMO-FREE', target.name);
    record(target.name, target.id, 'Activó el plan gratuito: ' + plan.name + (maxSites > 1 ? ' (' + maxSites + ' sitios)' : ''));
    save();
    send(res, 201, { ok: true, user: publicUser(target), order: orderView(order) });
  });

  /* ---------- Pago con PayPal & NOWPayments (automático) ---------- */
  route('GET', '/api/payment/config', null, (ctx) => {
    send(ctx.res, 200, {
      paypal: pp.enabled ? { clientId: cfg.paypal.clientId, mode: pp.mode } : null,
      nowpayments: np.enabled ? { enabled: true } : null
    });
  });
  route('POST', '/api/checkout/paypal/orders', null, async (ctx) => {
    const { req, res, body } = ctx, ip = clientIp(req);
    if (!pp.enabled) return fail(res, 503, 'El pago con PayPal no está configurado.');
    if (limited('pp-c|' + ip, 20, 3600e3)) return fail(res, 429, 'Demasiados intentos. Espera un momento.');
    const planId = clean(body.plan, 25), plan = PLANS[planId];
    if (!plan) return fail(res, 400, 'Plan no válido.');
    const isAgency = planId === 'agency' || planId === 'agency_annual';
    const maxSites = isAgency ? Math.max(1, Math.min(100, Number(body.maxSites) || 5)) : 1;
    const price = getPlanPrice(planId, maxSites);
    hit('pp-c|' + ip);
    try {
      const refId = isAgency ? (planId + ':' + maxSites) : planId;
      const desc = (isAgency ? (plan.name + ' (' + maxSites + ' Sitios)') : plan.name) + ' · NexaGuard';
      const order = await pp.createOrder({ amount: price.toFixed(2), currency: plan.currency, referenceId: refId, description: desc, requestId: id('ppreq') });
      send(res, 201, { id: order.id });
    } catch (e) { console.error('paypal createOrder:', e.message); fail(res, 502, 'No se pudo iniciar el pago con PayPal. Inténtalo de nuevo.'); }
  });
  route('POST', '/api/checkout/paypal/orders/:id/capture', null, async (ctx) => {
    const { req, res, user } = ctx, ip = clientIp(req), paypalOrderId = ctx.params[0];
    if (!pp.enabled) return fail(res, 503, 'El pago con PayPal no está configurado.');
    if (limited('pp-x|' + ip, 20, 3600e3)) return fail(res, 429, 'Demasiados intentos. Espera un momento.');
    hit('pp-x|' + ip);

    // Blindaje contra ataques de repetición (Replay Attacks con Burp Suite):
    const seen = db.paypalOrders[paypalOrderId];
    if (seen) {
      if (user && user.id === seen.userId) {
        const su = db.users.find(x => x.id === seen.userId);
        return send(res, 200, { ok: true, user: publicUser(su), alreadyProcessed: true });
      }
      return fail(res, 409, 'Esta orden de PayPal ya fue procesada anteriormente.');
    }

    let cap;
    try { cap = await pp.captureOrder(paypalOrderId, id('ppreq')); }
    catch (e) { console.error('paypal captureOrder:', e.message); return fail(res, 502, 'No se pudo confirmar el pago con PayPal. Si ya pagaste, escríbenos con tu comprobante.'); }
    if (cap.status !== 'COMPLETED') return fail(res, 402, 'El pago no se completó.');
    const pu = cap.purchase_units && cap.purchase_units[0];
    const captured = pu && pu.payments && pu.payments.captures && pu.payments.captures[0];
    if (!captured || captured.status !== 'COMPLETED') return fail(res, 402, 'El pago no se completó.');

    const rawRef = pu.reference_id || '';
    const refParts = rawRef.split(':');
    const planId = refParts[0];
    const plan = PLANS[planId];
    if (!plan) return fail(res, 400, 'El pago no corresponde a un plan reconocido. Escríbenos con tu comprobante.');
    const isAgency = planId === 'agency' || planId === 'agency_annual';
    const maxSites = isAgency ? Math.max(1, Math.min(100, Number(refParts[1]) || 5)) : 1;
    const expectedPrice = getPlanPrice(planId, maxSites);
    const amt = parseFloat(captured.amount && captured.amount.value), curr = captured.amount && captured.amount.currency_code;
    if (!(amt > 0) || Math.abs(amt - expectedPrice) > 0.05 || curr !== plan.currency) return fail(res, 409, 'El monto del pago no coincide con el del plan. Escríbenos con tu comprobante y lo revisamos a mano.');

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
    if (!order) {
      order = { id: id('ord'), userId: target.id, plan: planId, maxSites: maxSites, status: 'pending_payment', stage: 0, amount: amt, createdAt: T() };
      db.orders.push(order);
    } else {
      order.maxSites = maxSites;
      order.amount = amt;
    }
    const pay = applyPayment(order, amt, curr, 'paypal', captured.id, 'PayPal');
    db.paypalOrders[paypalOrderId] = { userId: target.id, orderId: order.id, paymentId: pay.id, at: T() };
    record(isNewAccount ? 'PayPal' : target.name, target.id, 'Pago con PayPal recibido: ' + pay.amount + ' ' + pay.currency + ' (' + plan.name + (maxSites > 1 ? ' · ' + maxSites + ' Sitios' : '') + ')');
    save();
    const headers = user ? {} : startSession(req, res, target.id);
    send(res, 201, { ok: true, user: publicUser(target), order: orderView(order), tempPassword: newTempPass }, headers);
  });

  /* ---------- Pago con NOWPayments / Binance Pay / Cripto (automático) ---------- */
  route('POST', '/api/checkout/nowpayments/invoice', null, async (ctx) => {
    const { req, res, user, body } = ctx, ip = clientIp(req);
    if (!np.enabled) return fail(res, 503, 'El pago con NOWPayments / Cripto no está configurado.');
    if (limited('np-inv|' + ip, 20, 3600e3)) return fail(res, 429, 'Demasiados intentos. Espera un momento.');
    const planId = clean(body.plan, 25), plan = PLANS[planId];
    if (!plan) return fail(res, 400, 'Plan no válido.');
    const isAgency = planId === 'agency' || planId === 'agency_annual';
    const maxSites = isAgency ? Math.max(1, Math.min(100, Number(body.maxSites) || 5)) : 1;
    const price = getPlanPrice(planId, maxSites);
    hit('np-inv|' + ip);

    const userEmail = (user && user.email) || clean(body.email, 254).toLowerCase() || '';
    const userName = (user && user.name) || clean(body.name, 80) || 'Cliente';

    // Reutilizar orden pendiente existente del usuario o crear una nueva
    let order = (user && db.orders.find(o => o.userId === user.id && o.plan === planId && o.status === 'pending_payment')) || null;
    if (!order) {
      order = {
        id: id('ord'),
        userId: user ? user.id : null,
        pendingEmail: userEmail,
        pendingName: userName,
        plan: planId,
        maxSites,
        status: 'pending_payment',
        stage: 0,
        amount: price,
        createdAt: T()
      };
      db.orders.push(order);
    } else {
      order.maxSites = maxSites;
      order.amount = price;
      order.pendingEmail = userEmail;
      order.pendingName = userName;
    }
    save();

    const desc = (isAgency ? (plan.name + ' (' + maxSites + ' Sitios)') : plan.name) + ' · NexaGuard';
    const host = req.headers.host || 'www.nexaguards.com';
    const proto = (req.headers['x-forwarded-proto'] || 'https');
    const baseUrl = proto + '://' + host;

    try {
      const invoice = await np.createInvoice({
        price_amount: price.toFixed(2),
        price_currency: plan.currency || 'usd',
        order_id: order.id,
        order_description: desc,
        ipn_callback_url: 'https://www.nexaguards.com/api/checkout/nowpayments/ipn',
        success_url: baseUrl + '/panel.html?payment=success&order_id=' + order.id,
        cancel_url: baseUrl + '/#planes'
      });

      order.nowpaymentsInvoiceId = invoice.id;
      order.nowpaymentsInvoiceUrl = invoice.invoice_url;
      save();

      send(res, 201, {
        ok: true,
        invoice_url: invoice.invoice_url,
        id: invoice.id,
        orderId: order.id
      });
    } catch (e) {
      console.error('NOWPayments createInvoice error:', e.message);
      fail(res, 502, 'No se pudo generar la factura cripto. Inténtalo de nuevo.');
    }
  });

  route('POST', '/api/checkout/nowpayments/ipn', null, async (ctx) => {
    const { req, res, body } = ctx;
    const sig = req.headers['x-nowpayments-sig'];

    // Validar firma criptográfica HMAC-SHA512
    if (!np.verifyIpnSignature(body, sig)) {
      console.warn('NOWPayments IPN: Firma HMAC no válida');
      return fail(res, 400, 'Firma IPN no válida.');
    }

    const orderId = clean(body.order_id, 40);
    const order = db.orders.find(o => o.id === orderId);
    if (!order) {
      console.warn('NOWPayments IPN: Pedido no encontrado:', orderId);
      return send(res, 200, { ok: true, note: 'order_not_found' });
    }

    const paymentStatus = String(body.payment_status || '').toLowerCase();
    console.log('NOWPayments IPN para orden', orderId, 'estado:', paymentStatus, 'payment_id:', body.payment_id);

    // Estados de pago completado en NOWPayments: 'finished' o 'confirmed'
    if (paymentStatus === 'finished' || paymentStatus === 'confirmed') {
      if (order.status === 'active' || (order.paidAt && order.nowpaymentsPaymentId === String(body.payment_id))) {
        return send(res, 200, { ok: true, alreadyProcessed: true });
      }

      const plan = PLANS[order.plan];
      if (!plan) return send(res, 200, { ok: true, note: 'plan_unknown' });

      // Asignar o crear usuario si la orden se inició como invitado
      let target = order.userId ? db.users.find(u => u.id === order.userId) : null;
      let newTempPass = null, isNewAccount = false;
      if (!target) {
        const email = clean(order.pendingEmail || body.pay_address || '', 254).toLowerCase();
        if (email && isEmail(email)) {
          target = db.users.find(x => x.email === email && x.role === 'client');
          if (!target) {
            newTempPass = tempPassword() + 'a1';
            isNewAccount = true;
            target = {
              id: id('usr'),
              email,
              name: clean(order.pendingName || 'Cliente Cripto', 80),
              phone: '',
              company: '',
              role: 'client',
              active: true,
              pass: await hashPw(newTempPass),
              createdAt: T(),
              mustChangePassword: true
            };
            db.users.push(target);
          }
          order.userId = target.id;
        }
      }

      const actuallyPaid = parseFloat(body.actually_paid || body.price_amount) || order.amount || 0;
      const payRef = 'NP-' + (body.payment_id || body.payment_status);
      order.nowpaymentsPaymentId = String(body.payment_id);

      const pay = applyPayment(order, actuallyPaid, plan.currency || 'USD', 'nowpayments', payRef, 'NOWPayments IPN');

      if (target) {
        record(target.name, target.id, 'Pago Cripto / Binance Pay confirmado: ' + pay.amount + ' ' + pay.currency + ' (' + plan.name + ' · ' + order.licenseKey + ')', 'success');
        if (isNewAccount && newTempPass) {
          mailer.sendWelcomeClient(target, newTempPass, order.licenseKey).catch(e => console.error('Error enviando correo bienvenida cripto:', e.message));
        } else {
          mailer.sendLicenseDelivery(target, order.licenseKey, plan.name).catch(e => console.error('Error enviando correo licencia cripto:', e.message));
        }
      }

      save();
      return send(res, 200, { ok: true, licenseKey: order.licenseKey });
    }

    if (paymentStatus === 'failed' || paymentStatus === 'expired') {
      if (order.status === 'pending_payment') {
        order.status = 'cancelled';
        save();
      }
    }

    send(res, 200, { ok: true, status: paymentStatus });
  });

  /* ---------- Información y Estado de API de Licencias (WordPress.org Check & Telemetría) ---------- */
  route('GET', '/api/license', null, (ctx) => {
    send(ctx.res, 200, {
      service: 'NexaGuard License & Cloud Threat Intelligence API',
      status: 'active',
      version: '2.1.3',
      endpoints: {
        validate: 'https://www.nexaguards.com/api/license/validate',
        threat_intel: 'https://www.nexaguards.com/api/threat-intel'
      },
      terms: 'https://www.nexaguards.com/terminos',
      privacy: 'https://www.nexaguards.com/privacidad'
    });
  });

  route('GET', '/api/license/', null, (ctx) => {
    send(ctx.res, 200, {
      service: 'NexaGuard License & Cloud Threat Intelligence API',
      status: 'active',
      version: '2.1.3',
      endpoints: {
        validate: 'https://www.nexaguards.com/api/license/validate',
        threat_intel: 'https://www.nexaguards.com/api/threat-intel'
      },
      terms: 'https://www.nexaguards.com/terminos',
      privacy: 'https://www.nexaguards.com/privacidad'
    });
  });

  /* ---------- Validación de Licencias para el Plugin WordPress (Blindaje Antifraude & Anti-Burp) ---------- */
  route('POST', '/api/license/validate', null, (ctx) => {
    const { req, res, body } = ctx, ip = clientIp(req);
    const key = clean(body.key || '', 60).toUpperCase();
    const rawDomain = clean(body.domain || '', 120).toLowerCase();
    const domain = rawDomain.replace(/^https?:\/\//, '').replace(/\/.*$/, '').split(':')[0].replace(/^www\./, '').trim();

    if (!key) return fail(res, 400, 'Clave de licencia requerida.');
    if (!domain) return fail(res, 400, 'Dominio web requerido para validar la licencia.');

    // 1.0 Si es una clave comunitaria gratuita (estilo Wordfence)
    if (key.startsWith('NEXA-FREE-') || key.startsWith('FREE-') || key.startsWith('NXG-FREE-')) {
      return send(res, 200, {
        valid: true,
        status: 'active',
        plan_type: 'free',
        plan: 'Edición Comunitaria Gratuita',
        key: key,
        domain: domain,
        expires_at: null,
        expires_formatted: 'Sin Vencimiento (Comunidad)',
        days_left: 99999,
        notice: 'Licencia Comunitaria Gratuita activa en ' + domain + '.',
        message: 'Licencia Comunitaria Gratuita activa en ' + domain + '.',
        renew_url: 'https://www.nexaguards.com/#planes',
        features: {
          vigilance_24h: false,
          deep_clean: true,
          cloud_intel: false
        }
      });
    }

    // 1.1 Claves Maestras Oficiales de Prueba y Desarrollo (QA / Testing)
    if (key.startsWith('NXG-PRO-TEST-') || key === 'NXG-PRO-8888-DEVX' || key === 'NXG-PRO-DEMO-2026') {
      return send(res, 200, {
        valid: true,
        status: 'active',
        plan_type: 'pro',
        plan: 'NexaGuard Security PRO (Licencia de Prueba QA)',
        key: key,
        domain: domain,
        activated_at: new Date().toISOString(),
        expires_at: new Date(Date.now() + 365 * DAY).toISOString(),
        expires_formatted: 'Activa por 1 Año (Prueba Oficial)',
        days_left: 365,
        notice: 'Licencia PRO de Prueba activa en ' + domain + '.',
        message: '¡Licencia NexaGuard PRO verificada y activada exitosamente!',
        renew_url: 'https://www.nexaguards.com/#planes',
        features: ['l7_waf', 'core_restore', 'deep_hardening', 'auto_remediate', 'ip_auto_jail']
      });
    }

    // 1. Escudo Anti-Fuerza Bruta & Burp Suite Intruder
    const bruteKey = 'lic_fail|' + ip;
    if (limited(bruteKey, 12, 60e3)) {
      if (waf && typeof waf.recordThreat === 'function') {
        waf.recordThreat({
          ip, method: 'POST', url: '/api/license/validate',
          rule: 'BURP_SUITE_LICENSE_BRUTEFORCE', action: 'BLOCKED_403',
          headers: req.headers
        });
      }
      return fail(res, 429, 'Demasiados intentos fallidos de validación. IP registrada por WAF.');
    }

    // 2. Búsqueda estricta en base de datos: ÚNICAMENTE claves reales emitidas tras pago
    const order = db.orders.find(o => o.licenseKey === key);

    // Si no está en la base de datos, es un intento de falsificación o clave no válida
    if (!order) {
      hit(bruteKey);
      return fail(res, 404, 'Clave de licencia no reconocida en el sistema de NexaGuard.');
    }

    // 3. Blindaje Antifraude: Si es una orden, DEBE estar pagada y activa
    if (order.status === 'pending_payment' || order.status === 'cancelled') {
      return fail(res, 403, 'Esta orden se encuentra pendiente de pago o cancelada. La membresía no está activa.');
    }
    if (!order.paidAt && order.status !== 'active') {
      return fail(res, 403, 'No se ha acreditado ningún pago para esta licencia.');
    }

    const isAnnual = order.plan === 'blindaje' || (order.plan && order.plan.endsWith('_annual'));
    const planObj = PLANS[order.plan] || {};
    const maxAllowed = order.maxSites || planObj.sites || 1;
    const isMultiDomain = maxAllowed > 1;

    db.settings.licenseActivations = db.settings.licenseActivations || {};

    let activeList = [];
    if (Array.isArray(order.activatedDomains)) {
      activeList = order.activatedDomains.map(d => String(d).trim().toLowerCase());
    } else if (order.activatedDomain) {
      activeList = [String(order.activatedDomain).trim().toLowerCase()];
    }

    // Si este dominio no está ya en la lista de activos
    if (!activeList.includes(domain)) {
      if (activeList.length >= maxAllowed) {
        if (maxAllowed === 1) {
          return fail(res, 403, 'Esta licencia ya se encuentra activa en el sitio web "' + activeList[0] + '". Cada licencia monositio protege 1 dominio web a la vez. Desvincula la licencia del sitio anterior para usarla en "' + domain + '", o adquiere una licencia multidominio o adicional.');
        } else {
          return fail(res, 403, 'Esta licencia ya alcanzó el límite máximo de ' + maxAllowed + ' sitios autorizados (' + activeList.join(', ') + '). Desvincula uno de los sitios anteriores para activar "' + domain + '".');
        }
      }

      // Escudo Antifraude para licencias Monositio de clientes (Límite de transferencias y Cooldown de 30 días)
      if (maxAllowed === 1) {
        order.transferredDomains = order.transferredDomains || (order.activatedDomain ? [order.activatedDomain] : []);
        order.transferCount = typeof order.transferCount === 'number' ? order.transferCount : 0;

        const isNewTransfer = order.transferredDomains.length > 0 && !order.transferredDomains.includes(domain);
        if (isNewTransfer) {
          // Candado 1: Límite de por vida (máximo 2 transferencias)
          if (order.transferCount >= 2) {
            return fail(res, 403, 'Límite de transferencias alcanzado: Esta licencia monositio ya ha consumido su límite máximo de 2 transferencias de dominio autorizadas (' + order.transferredDomains.join(' → ') + '). Para proteger sitios web adicionales o de clientes, adquiere una nueva licencia o actualiza al Plan Multisitio en nexaguards.com.');
          }

          // Candado 2: Cooldown de 30 días entre transferencias
          if (order.lastTransferAt) {
            const timeDiff = Date.now() - order.lastTransferAt;
            if (timeDiff < 30 * DAY) {
              const daysPassed = Math.floor(timeDiff / DAY);
              const daysLeft = Math.max(1, 30 - daysPassed);
              return fail(res, 403, 'Protección antifraude: Esta licencia monositio fue vinculada a otro dominio hace ' + daysPassed + ' día(s). Por seguridad y políticas de uso, solo se permite 1 transferencia cada 30 días (días restantes: ' + daysLeft + '). Para proteger múltiples sitios simultáneamente, adquiere el Plan Multisitio.');
            }
          }

          order.transferCount++;
          order.lastTransferAt = Date.now();
        }

        if (!order.transferredDomains.includes(domain)) {
          order.transferredDomains.push(domain);
          if (!order.lastTransferAt) order.lastTransferAt = Date.now();
        }
      }

      activeList.push(domain);
      order.activatedDomains = activeList;
      order.activatedDomain = activeList[0] || null;
      db.settings.licenseActivations[key] = activeList;
      save();
    }

    const exp = getLicenseExpiration(order);
    const expiresAt = exp.expiresAt;
    const daysLeft = exp.daysLeft;
    const isExpired = exp.isExpired;
    const isExpiringSoon = exp.isExpiringSoon;
    const status = exp.licenseStatus;
    const isFree = (order.plan === 'free') || (planObj && (planObj.id === 'free' || planObj.type === 'free')) || key.includes('FREE');
    const planName = planObj ? planObj.name : (isAnnual ? 'Licencia Anual (1 Año) · NexaGuard Pro' : 'Plan NexaGuard Security Pro (Mensual)');

    // Firma criptográfica HMAC-SHA256 contra manipulación de respuesta en Burp Suite
    const hmacSecret = cfg.adminPassword || 'nexaguard-vault-integrity-key-2026';
    const sigPayload = `${key}:${domain}:${isFree ? 'active' : status}:${isFree ? 'lifetime' : expiresAt}`;
    const signature = crypto.createHmac('sha256', hmacSecret).update(sigPayload).digest('hex');

    send(res, 200, {
      valid: !isExpired,
      status: isFree ? 'active' : status,
      plan_type: isFree ? 'free' : 'pro',
      pro_authorized: !isFree && !isExpired,
      is_pro: !isFree && !isExpired,
      plan: planName,
      period: isFree ? 'lifetime' : (isAnnual ? 'annual' : 'monthly'),
      expires_at: isFree ? null : expiresAt,
      expires_formatted: isFree ? 'Sin Vencimiento (Comunidad)' : new Date(expiresAt).toLocaleDateString('es-ES', { day: '2-digit', month: '2-digit', year: 'numeric' }),
      days_left: isFree ? 99999 : daysLeft,
      domain: domain,
      signature: signature,
      notice: isFree
        ? 'Licencia Comunitaria Gratuita activa en ' + domain + '.'
        : (isExpired
          ? 'Tu suscripción a ' + planName + ' ha vencido. Debes renovar tu ' + (isAnnual ? 'anualidad' : 'mensualidad') + ' para reactivar el Sistema de Vigilancia 24h y las actualizaciones en tiempo real.'
          : isExpiringSoon
            ? 'Atención: Tu suscripción a ' + planName + ' vencerá en ' + daysLeft + ' días. Renueva a tiempo en nexaguards.com para mantener el escudo activo.'
            : 'Licencia PRO activa y sincronizada con NexaGuard Threat Cloud en ' + domain + '.'),
      message: isFree
        ? 'Licencia Comunitaria Gratuita activa en ' + domain + '. No autorizada para NexaGuard PRO Suite.'
        : (isExpired
          ? 'Tu suscripción a ' + planName + ' ha vencido. Debes renovar tu ' + (isAnnual ? 'anualidad' : 'mensualidad') + ' para reactivar el Sistema de Vigilancia 24h y las actualizaciones en tiempo real.'
          : 'Licencia PRO activa y sincronizada con NexaGuard Threat Cloud en ' + domain + '.'),
      renew_url: 'https://www.nexaguards.com/#planes',
      features: {
        vigilance_24h: !isFree && !isExpired,
        deep_clean: !isFree && !isExpired,
        cloud_intel: !isExpired,
        core_rebuild: !isFree && !isExpired,
        layer7_waf: !isFree && !isExpired,
        auto_remediation: !isFree && !isExpired
      }
    });
  });

  /* ---------- Emisión de Licencia Gratuita (Comunidad) ---------- */
  route('POST', '/api/license/free', null, (ctx) => {
    const { res, body } = ctx;
    const email = clean(body.email || '', 120).toLowerCase();
    const rawDomain = clean(body.domain || '', 120).toLowerCase();
    const domain = rawDomain.replace(/^https?:\/\//, '').replace(/\/.*$/, '').split(':')[0].replace(/^www\./, '').trim();

    if (!domain) return fail(res, 400, 'Dominio web requerido.');
    const freeKey = 'NEXA-FREE-' + crypto.createHash('md5').update(domain + (email || '') + 'free').digest('hex').substring(0, 16).toUpperCase();

    send(res, 200, {
      valid: true,
      status: 'active',
      plan_type: 'free',
      plan: 'Edición Comunitaria Gratuita',
      key: freeKey,
      domain: domain,
      expires_at: null,
      expires_formatted: 'Sin Vencimiento (Comunidad)',
      days_left: 99999,
      notice: 'Licencia Comunitaria Gratuita activa en ' + domain + '.',
      message: 'Licencia Comunitaria Gratuita activa en ' + domain + '.',
      renew_url: 'https://www.nexaguards.com/#planes',
      features: {
        vigilance_24h: false,
        deep_clean: true,
        cloud_intel: false
      }
    });
  });

  /* ---------- Desvinculación de Licencia desde WordPress ---------- */
  route('POST', '/api/license/deactivate', null, (ctx) => {
    const { body, res } = ctx;
    const key = clean(body.key || '', 60).toUpperCase();
    const rawDomain = clean(body.domain || '', 120).toLowerCase();
    const domain = rawDomain.replace(/^https?:\/\//, '').replace(/\/.*$/, '').split(':')[0].replace(/^www\./, '').trim();

    if (!key) return fail(res, 400, 'Clave requerida.');

    let released = false;
    const order = db.orders.find(o => o.licenseKey === key);
    if (order) {
      let list = Array.isArray(order.activatedDomains) ? order.activatedDomains : (order.activatedDomain ? [order.activatedDomain] : []);
      if (domain) {
        list = list.filter(d => String(d).toLowerCase().replace(/^www\./, '').split(':')[0] !== domain);
      } else {
        list = [];
      }
      order.activatedDomains = list;
      order.activatedDomain = list[0] || null;
      released = true;
    }

    db.settings.licenseActivations = db.settings.licenseActivations || {};
    if (db.settings.licenseActivations[key]) {
      let rawVal = db.settings.licenseActivations[key];
      let list = Array.isArray(rawVal) ? rawVal : [rawVal];
      if (domain) {
        list = list.filter(d => String(d).toLowerCase().replace(/^www\./, '').split(':')[0] !== domain);
      } else {
        list = [];
      }
      if (list.length > 0) {
        db.settings.licenseActivations[key] = list;
      } else {
        delete db.settings.licenseActivations[key];
      }
      released = true;
    }

    save();
    send(res, 200, { success: true, released, message: 'Licencia desvinculada exitosamente.' });
  });

  /* ---------- Liberar Dominio Vinculado desde Panel Admin ---------- */
  route('POST', '/api/admin/licenses/reset-domain', 'admin', (ctx) => {
    const { body, res } = ctx;
    const key = clean(body.key || '', 60).toUpperCase();
    const rawDomain = clean(body.domain || '', 120).toLowerCase();
    const domain = rawDomain.replace(/^https?:\/\//, '').replace(/\/.*$/, '').split(':')[0].replace(/^www\./, '').trim();

    if (!key) return fail(res, 400, 'Clave requerida.');

    const order = db.orders.find(o => (o.licenseKey === key || (o.id && key.includes(o.id.toUpperCase()))));
    if (order) {
      const cleanDom = d => String(d).toLowerCase().replace(/^https?:\/\//, '').replace(/\/.*$/, '').split(':')[0].replace(/^www\./, '').trim();
      if (domain) {
        let list = Array.isArray(order.activatedDomains) ? order.activatedDomains : (order.activatedDomain ? [order.activatedDomain] : []);
        list = list.filter(d => cleanDom(d) !== domain);
        order.activatedDomains = list;
        order.activatedDomain = list[0] || null;
      } else {
        delete order.activatedDomains;
        delete order.activatedDomain;
        order.transferCount = 0;
        order.transferredDomains = [];
        delete order.lastTransferAt;
      }
    }

    db.settings.licenseActivations = db.settings.licenseActivations || {};
    if (db.settings.licenseActivations[key]) {
      const cleanDom = d => String(d).toLowerCase().replace(/^https?:\/\//, '').replace(/\/.*$/, '').split(':')[0].replace(/^www\./, '').trim();
      if (domain) {
        let rawVal = db.settings.licenseActivations[key];
        let list = Array.isArray(rawVal) ? rawVal : [rawVal];
        list = list.filter(d => cleanDom(d) !== domain);
        if (list.length > 0) {
          db.settings.licenseActivations[key] = list;
        } else {
          delete db.settings.licenseActivations[key];
        }
      } else {
        delete db.settings.licenseActivations[key];
      }
    }

    save();
    record(ctx.user.name, null, 'Liberó el dominio de la licencia ' + key + (domain ? ' (' + domain + ')' : ''));
    send(res, 200, { success: true, message: 'Dominio liberado. La clave ahora puede activarse en cualquier otra web.' });
  });

  /* ---------- Panel de Administración: Gestión de Licencias ---------- */
  route('GET', '/api/admin/licenses', 'admin', (ctx) => {
    db.settings.licenseActivations = db.settings.licenseActivations || {};

    const clientOrders = db.orders
      .filter(o => o.licenseKey)
      .map(o => {
        const u = db.users.find(u => u.id === o.userId) || {};
        const p = PLANS[o.plan] || {};
        const domains = Array.isArray(o.activatedDomains) ? o.activatedDomains : (o.activatedDomain ? [o.activatedDomain] : []);
        const maxSites = o.maxSites || p.sites || 1;
        const planDisplayName = o.maxSites && o.maxSites > 1 ? ((p && p.name ? p.name : o.plan) + ' (' + o.maxSites + ' Sitios)') : ((p && p.name) || o.plan);
        return {
          orderId: o.id,
          userId: o.userId,
          clientName: u.name || 'Cliente',
          clientEmail: u.email || '',
          planId: o.plan,
          planName: planDisplayName,
          licenseKey: o.licenseKey,
          status: o.status,
          licenseStatus: exp.licenseStatus,
          expiresAt: exp.expiresAt,
          expiresFormatted: exp.expiresFormatted,
          daysLeft: exp.daysLeft,
          isExpiringSoon: exp.isExpiringSoon,
          isExpired: exp.isExpired,
          maxSites: maxSites,
          activatedDomains: domains,
          activatedDomain: domains.join(', ') || null,
          transferCount: typeof o.transferCount === 'number' ? o.transferCount : 0,
          maxTransfers: 2,
          lastTransferAt: o.lastTransferAt ? iso(o.lastTransferAt) : null,
          transferredDomains: o.transferredDomains || domains,
          createdAt: iso(o.createdAt),
          paidAt: iso(o.paidAt)
        };
      })
      .sort((a, b) => (a.isExpiringSoon === b.isExpiringSoon ? 0 : a.isExpiringSoon ? -1 : 1) || a.daysLeft - b.daysLeft);

    const expiringCount = clientOrders.filter(o => o.isExpiringSoon).length;
    const expiredCount = clientOrders.filter(o => o.isExpired).length;

    send(ctx.res, 200, {
      clientOrders,
      expiringCount,
      expiredCount,
      downloadUrl: '/downloads/nexaguard-malware-scanner.zip'
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
  route('GET', '/api/admin/settings', 'admin', (ctx) => send(ctx.res, 200, {
    paymentInstructions: (db.settings && db.settings.paymentInstructions) || DEFAULT_PAYMENT_TEXT,
    plans: Object.values(PLANS).map(planView),
    counts: {
      clients: (db.users || []).filter(u => u.role === 'client').length,
      orders: (db.orders || []).length,
      sites: (db.sites || []).length,
      scans: (db.scans || []).length,
      tickets: (db.tickets || []).length,
      payments: (db.payments || []).length,
      wafEvents: (db.wafEvents || []).length,
      wafJail: (db.wafJail || []).length,
      licenses: Object.keys((db.settings && db.settings.licenseActivations) || {}).length
    }
  }));
  route('PATCH', '/api/admin/settings', 'admin', (ctx) => {
    if (ctx.body.paymentInstructions !== undefined) { db.settings = db.settings || {}; db.settings.paymentInstructions = clean(ctx.body.paymentInstructions, 1500); }
    save(); send(ctx.res, 200, { ok: true });
  });

  /* ---------- Restablecimiento Total de Módulos (Factory Reset) ---------- */
  route('POST', '/api/admin/system/reset', 'admin', async (ctx) => {
    const { user, body, res, req } = ctx;
    const confirmation = String(body.confirmation || '').trim().toUpperCase();

    if (confirmation !== 'REESTABLECER') {
      return fail(res, 400, 'Debes escribir exactamente la palabra "REESTABLECER" para confirmar esta operación.');
    }

    const resetClients  = body.clients !== false;
    const resetOrders   = body.orders !== false;
    const resetSites    = body.sites !== false;
    const resetScans    = body.scans !== false;
    const resetTickets  = body.tickets !== false;
    const resetPayments = body.payments !== false;
    const resetLogs     = body.logs !== false;
    const resetWaf      = body.waf !== false;
    const resetLicenses = body.licenses !== false;

    const summary = {
      clientsRemoved: 0,
      ordersRemoved: 0,
      sitesRemoved: 0,
      scansRemoved: 0,
      ticketsRemoved: 0,
      paymentsRemoved: 0,
      licensesReset: 0
    };

    // 1. Clientes (Preservar SIEMPRE a los administradores)
    if (resetClients) {
      const initialUsersCount = (db.users || []).length;
      db.users = (db.users || []).filter(u => u.role === 'admin');
      summary.clientsRemoved = initialUsersCount - db.users.length;
    }

    // 2. Pedidos y suscripciones
    if (resetOrders) {
      summary.ordersRemoved = (db.orders || []).length;
      db.orders = [];
      db.paypalOrders = {};
    }

    // 3. Sitios web
    if (resetSites) {
      summary.sitesRemoved = (db.sites || []).length;
      db.sites = [];
    }

    // 4. Análisis forenses
    if (resetScans) {
      summary.scansRemoved = (db.scans || []).length;
      db.scans = [];
    }

    // 5. Soporte y tickets
    if (resetTickets) {
      summary.ticketsRemoved = (db.tickets || []).length;
      db.tickets = [];
    }

    // 6. Pagos registrados
    if (resetPayments) {
      summary.paymentsRemoved = (db.payments || []).length;
      db.payments = [];
    }

    // 7. Licencias y dominios activados
    if (resetLicenses) {
      db.settings = db.settings || {};
      const activeKeys = Object.keys(db.settings.licenseActivations || {});
      summary.licensesReset = activeKeys.length;
      db.settings.licenseActivations = {};
      (db.orders || []).forEach(o => {
        o.activatedDomain = null;
        o.activatedDomains = [];
        o.transferCount = 0;
        o.transferredDomains = [];
      });
    }

    // 8. Telemetría WAF, IPs en Jail y Estadísticas
    if (resetWaf) {
      db.wafEvents = [];
      db.wafJail = [];
      db.wafStats = { inspected: 0, blocked: 0, todayBlocked: 0, lastDay: new Date().toDateString() };
      if (waf) {
        try { waf.clearEvents(); } catch (e) {}
      }
    }

    // 9. Sesiones: Mantener la sesión activa del administrador actual
    const currentSid = parseCookies(req).pw_sid || '';
    const keepHash = sha(currentSid);
    db.sessions = (db.sessions || []).filter(s => s.h === keepHash);

    // 10. Bitácora de actividad
    if (resetLogs) {
      db.activity = [];
    }
    record(user.name, user.id, 'Restablecimiento de módulos completado por el administrador.');

    save();
    if (store && store.flush) {
      try { await store.flush(); } catch (e) { console.error('flush after reset:', e.message); }
    }

    send(res, 200, {
      ok: true,
      message: 'Todos los módulos han sido restablecidos exitosamente a su estado inicial.',
      summary
    });
  });
  route('GET', '/api/admin/export.csv', 'admin', (ctx) => {
    const cell = v => { let s = String(v == null ? '' : v); if (/^[=+\-@\t\r]/.test(s)) s = "'" + s; return '"' + s.replace(/"/g, '""') + '"'; };
    const rows = [['Nombre', 'Correo', 'Teléfono', 'Empresa', 'Plan', 'Estado', 'Sitios', 'Estado de seguridad', 'Alta']];
    clientsAll().map(clientSummary).forEach(c => rows.push([c.name, c.email, c.phone, c.company, c.planName || '', c.level, c.sites, c.health || '', c.createdAt]));
    ctx.res.writeHead(200, { 'Content-Type': 'text/csv; charset=utf-8', 'Content-Disposition': 'attachment; filename="clientes.csv"', 'Cache-Control': 'no-store' });
    ctx.res.end('\ufeff' + rows.map(r => r.map(cell).join(',')).join('\r\n'));
  });

  /* ---------- WAF Radar & Telemetría Perimetral Central ---------- */
  route('GET', '/api/waf/public-stream', null, (ctx) => {
    if (!waf) return send(ctx.res, 200, { ok: true, stats: {}, events: [] });
    const stats = waf.getStats();
    const rawEvents = waf.getEvents(30);
    const events = rawEvents.map(e => ({
      id: e.id,
      at: e.at,
      ip: String(e.ip || '').replace(/(\d+)\.(\d+)\.(\d+)\.(\d+)/, '$1.$2.***.***'),
      country: e.country,
      method: e.method,
      url: e.url,
      rule: e.rule,
      severity: e.severity,
      action: e.action
    }));
    const cfCountry = ctx.req.headers['cf-ipcountry'] || ctx.req.headers['x-country'] || null;
    const clientIp = (ctx.req.headers['cf-connecting-ip'] || ctx.req.headers['x-forwarded-for'] || ctx.req.socket.remoteAddress || '').split(',')[0].trim();
    send(ctx.res, 200, {
      ok: true,
      stats: {
        inspected: stats.inspected || 0,
        blocked: stats.blocked || 0,
        todayBlocked: stats.todayBlocked || 0,
        jailedCount: stats.jailedCount || 0
      },
      events,
      clientMeta: {
        countryCode: cfCountry,
        ip: clientIp.replace(/(\d+)\.(\d+)\.(\d+)\.(\d+)/, '$1.$2.***.***')
      }
    });
  });

  route('GET', '/api/admin/waf/stats', 'admin', (ctx) => {
    if (!waf) return send(ctx.res, 200, { ok: true, stats: {} });
    const s = waf.getStats();
    send(ctx.res, 200, Object.assign({ ok: true, stats: s }, s));
  });

  route('GET', '/api/admin/waf/live-stream', 'admin', (ctx) => {
    if (!waf) return fail(ctx.res, 500, 'WAF no inicializado.');
    ctx.res.writeHead(200, {
      'Content-Type': 'text/event-stream; charset=utf-8',
      'Cache-Control': 'no-cache, no-transform',
      'Connection': 'keep-alive',
      'X-Accel-Buffering': 'no'
    });
    ctx.res.write(': connected\n\n');

    const unsubscribe = typeof waf.onBlock === 'function' ? waf.onBlock((ev) => {
      try {
        ctx.res.write('data: ' + JSON.stringify(ev) + '\n\n');
      } catch (e) {}
    }) : () => {};

    const pingTimer = setInterval(() => {
      try { ctx.res.write(': ping\n\n'); } catch (e) {}
    }, 15000);

    ctx.req.on('close', () => {
      clearInterval(pingTimer);
      unsubscribe();
    });
  });

  route('GET', '/api/admin/waf/events', 'admin', (ctx) => {
    if (!waf) return send(ctx.res, 200, { ok: true, events: [] });
    const limit = parseInt(ctx.query.get('limit') || '100', 10);
    send(ctx.res, 200, { ok: true, events: waf.getEvents(limit) });
  });

  route('GET', '/api/admin/waf/jail', 'admin', (ctx) => {
    if (!waf) return send(ctx.res, 200, { ok: true, jail: [], jailed: [] });
    const j = waf.getJail();
    send(ctx.res, 200, { ok: true, jail: j, jailed: j });
  });

  route('POST', '/api/admin/waf/jail', 'admin', (ctx) => {
    if (!waf) return fail(ctx.res, 500, 'WAF no inicializado.');
    const ip = clean(ctx.body.ip, 60);
    const reason = clean(ctx.body.reason || 'Aislamiento manual por administrador', 160);
    const hours = parseInt(ctx.body.hours || '24', 10);
    if (!ip) return fail(ctx.res, 400, 'IP requerida');
    waf.jailIp(ip, reason, hours);
    record(ctx.user.name, null, 'IP aislada manualmente en WAF: ' + ip + ' (' + reason + ')', 'alert');
    save();
    send(ctx.res, 200, { ok: true, message: 'IP ' + ip + ' aislada con éxito durante ' + hours + ' horas.' });
  });

  route('POST', '/api/admin/waf/unjail', 'admin', (ctx) => {
    if (!waf) return fail(ctx.res, 500, 'WAF no inicializado.');
    const ip = clean(ctx.body.ip, 60);
    if (!ip) return fail(ctx.res, 400, 'IP requerida');
    const ok = waf.unjailIp(ip);
    record(ctx.user.name, null, 'IP liberada de la cárcel WAF: ' + ip, 'info');
    save();
    send(ctx.res, 200, { ok: true, message: ok ? 'IP liberada con éxito.' : 'La IP no estaba en la cárcel.' });
  });

  route('POST', '/api/admin/waf/simulate', 'admin', (ctx) => {
    if (!waf) return fail(ctx.res, 500, 'WAF no inicializado.');
    const type = clean(ctx.body.type || 'sqli', 20);
    const ev = waf.simulateAttack(type);
    send(ctx.res, 200, { ok: true, event: ev });
  });

  route('POST', '/api/admin/waf/clear', 'admin', (ctx) => {
    if (!waf) return fail(ctx.res, 500, 'WAF no inicializado.');
    waf.clearLogs();
    record(ctx.user.name, null, 'Registros de ataques del WAF reiniciados', 'info');
    save();
    send(ctx.res, 200, { ok: true, message: 'Historial de ataques limpiado.' });
  });

  /* ---------- Centinela de Integridad del Núcleo (Server Sentinel) ---------- */
  route('GET', '/api/admin/sentinel/status', 'admin', (ctx) => {
    if (!sentinel) return send(ctx.res, 200, { ok: true, status: { healthy: true, status: 'NO_ACTIVO' } });
    send(ctx.res, 200, { ok: true, status: sentinel.getStatus() });
  });

  route('POST', '/api/admin/sentinel/verify', 'admin', (ctx) => {
    if (!sentinel) return fail(ctx.res, 500, 'Centinela no inicializado.');
    const audit = sentinel.verifyIntegrity();
    record(ctx.user.name, null, 'Auditoría de integridad del servidor ejecutada: ' + (audit.healthy ? '100% Intacto' : 'Alteraciones detectadas'), audit.healthy ? 'info' : 'alert');
    save();
    send(ctx.res, 200, { ok: true, audit });
  });

  route('POST', '/api/admin/sentinel/rebaseline', 'admin', (ctx) => {
    if (!sentinel) return fail(ctx.res, 500, 'Centinela no inicializado.');
    const res = sentinel.captureBaseline();
    record(ctx.user.name, null, 'Nueva línea base criptográfica SHA-256 establecida (' + res.totalFiles + ' archivos protegidos)', 'info');
    save();
    send(ctx.res, 200, { ok: true, message: 'Línea base criptográfica actualizada con éxito.', baseline: res });
  });

  /* ---------- Entrada: devuelve true si la petición fue para /api ---------- */
  async function handle(req, res) {
    const u = new URL(req.url, 'http://x'), pathname = u.pathname;
    if (!pathname.startsWith('/api/')) return false;
    try {
      const isPublicExternalApi = pathname.startsWith('/api/license') || pathname === '/api/threat-intel' || pathname === '/api/waf/public-stream';
      const origin = req.headers.origin;
      if (isPublicExternalApi) {
        res.setHeader('Access-Control-Allow-Origin', '*');
        res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
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

  return { handle, ensureAdmin, startScheduler, schedulerTick, entitlement, sessionUser, PLANS, db };
}

module.exports = { createApp, PLANS, STAGES };
