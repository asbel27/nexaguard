'use strict';
/* =====================================================================
   Almacén de datos con Supabase (PostgreSQL · API REST).
   Reemplaza el antiguo db.json. Usa el fetch nativo de Node 18+.
   Sin dependencias externas.

   Variables de entorno requeridas:
     SUPABASE_URL         – URL del proyecto (ej: https://xxxx.supabase.co)
     SUPABASE_SERVICE_KEY – Clave service_role (Settings → API → service_role)
   ===================================================================== */
const crypto = require('crypto');

function createStore() {
  const SUPABASE_URL = process.env.SUPABASE_URL;
  const SUPABASE_KEY = process.env.SUPABASE_SERVICE_KEY || process.env.SUPABASE_SECRET_KEY;

  if (!SUPABASE_URL || !SUPABASE_KEY) {
    throw new Error(
      'Faltan las variables SUPABASE_URL y/o SUPABASE_SERVICE_KEY.\n' +
      '  → Créalas en tu proyecto de Supabase (Settings → API) y configúralas en Render.'
    );
  }

  const REST = SUPABASE_URL.replace(/\/$/, '') + '/rest/v1';
  const authHeaders = {
    'apikey': SUPABASE_KEY,
    'Authorization': 'Bearer ' + SUPABASE_KEY,
    'Content-Type': 'application/json'
  };

  const ALL_KEYS = [
    'users', 'orders', 'sites', 'scans', 'tickets',
    'payments', 'activity', 'sessions',
    'settings', 'paypalOrders', 'meta'
  ];

  const empty = () => ({
    users: [], orders: [], sites: [], scans: [], tickets: [],
    payments: [], activity: [], sessions: [],
    settings: {}, paypalOrders: {}, meta: { v: 1 }
  });

  const db = empty();

  /* ---- Cargar datos desde Supabase ---- */
  async function load() {
    const res = await fetch(REST + '/kv_store?select=key,value', { headers: authHeaders });
    if (!res.ok) {
      const body = await res.text().catch(() => '');
      throw new Error(
        'No se pudieron cargar los datos de Supabase (HTTP ' + res.status + ').\n  ' +
        body.slice(0, 300)
      );
    }
    const rows = await res.json();
    const base = empty();
    for (const row of rows) {
      if (row.key in base) base[row.key] = row.value;
    }
    // Mutar el objeto existente (conservar la referencia que ya tiene app.js)
    for (const key of ALL_KEYS) db[key] = base[key];
    return db;
  }

  /* ---- Guardar datos en Supabase (con debounce) ---- */
  let timer = null, dirty = false, saving = false;

  async function flush() {
    if (saving) return;
    if (!dirty) return;
    dirty = false;
    saving = true;
    try {
      const rows = ALL_KEYS.map(k => ({
        key: k,
        value: db[k],
        updated_at: new Date().toISOString()
      }));
      const res = await fetch(REST + '/kv_store?on_conflict=key', {
        method: 'POST',
        headers: Object.assign({}, authHeaders, { 'Prefer': 'resolution=merge-duplicates' }),
        body: JSON.stringify(rows)
      });
      if (!res.ok) {
        const body = await res.text().catch(() => '');
        console.error('Supabase: error al guardar (HTTP ' + res.status + '):', body.slice(0, 300));
        dirty = true; // reintentar en el próximo ciclo
      }
    } catch (e) {
      console.error('Supabase: error al guardar:', e.message);
      dirty = true;
    } finally {
      saving = false;
    }
  }

  function save() {
    dirty = true;
    if (!timer) {
      timer = setTimeout(() => {
        timer = null;
        flush().catch(e => console.error('flush:', e.message));
      }, 2000);
    }
  }

  /* ---- Ping (mantiene Supabase activo, evita pausa por inactividad) ---- */
  async function ping() {
    try {
      const res = await fetch(REST + '/kv_store?select=key&limit=1', { headers: authHeaders });
      return res.ok;
    } catch { return false; }
  }

  /* ---- Cierre limpio ---- */
  async function shutdown() {
    if (timer) { clearTimeout(timer); timer = null; }
    dirty = true;
    await flush();
  }

  const id = p => p + '_' + crypto.randomBytes(6).toString('hex');

  return { db, save, flush, id, load, ping, shutdown };
}

module.exports = { createStore };
