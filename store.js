'use strict';
/* Almacén de datos: un archivo JSON con escritura atómica (sin dependencias).
   Suficiente para cientos de clientes. Si algún día creces, migrar a SQLite/Postgres es directo. */
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

function createStore(file) {
  const empty = () => ({ users: [], orders: [], sites: [], scans: [], tickets: [], payments: [], activity: [], sessions: [], settings: {}, paypalOrders: {}, meta: { v: 1 } });
  let db = empty();
  fs.mkdirSync(path.dirname(file), { recursive: true });
  if (fs.existsSync(file)) {
    try { db = Object.assign(empty(), JSON.parse(fs.readFileSync(file, 'utf8'))); }
    catch (e) {
      const bad = file + '.dañado-' + Date.now();
      fs.copyFileSync(file, bad);
      throw new Error('El archivo de datos está dañado. Se guardó una copia en ' + bad + '. Restaura una copia de la carpeta backups o corrígelo.');
    }
    // copia de seguridad diaria (se conservan las últimas 14)
    try {
      const dir = path.join(path.dirname(file), 'backups');
      fs.mkdirSync(dir, { recursive: true });
      const day = path.join(dir, 'db-' + new Date().toISOString().slice(0, 10) + '.json');
      if (!fs.existsSync(day)) fs.copyFileSync(file, day);
      fs.readdirSync(dir).filter(f => /^db-\d{4}-\d\d-\d\d\.json$/.test(f)).sort().slice(0, -14).forEach(f => fs.unlinkSync(path.join(dir, f)));
    } catch { /* la copia es un extra */ }
  }

  let timer = null, dirty = false;
  function flush() {
    if (!dirty) return;
    dirty = false;
    const tmp = file + '.tmp';
    fs.writeFileSync(tmp, JSON.stringify(db), { mode: 0o600 });
    fs.renameSync(tmp, file);
  }
  function save() { dirty = true; if (!timer) timer = setTimeout(() => { timer = null; flush(); }, 120); }
  process.on('exit', flush);
  const id = p => p + '_' + crypto.randomBytes(6).toString('hex');
  return { db, save, flush, id };
}

module.exports = { createStore };
