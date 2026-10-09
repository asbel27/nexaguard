const fs = require('fs');
const path = require('path');
const zlib = require('zlib');

// Standard CRC32
const crcTable = new Uint32Array(256);
for (let i = 0; i < 256; i++) {
  let c = i;
  for (let k = 0; k < 8; k++) {
    c = (c & 1) ? (0xEDB88320 ^ (c >>> 1)) : (c >>> 1);
  }
  crcTable[i] = c;
}

function crc32(buf) {
  let c = 0xFFFFFFFF;
  for (let i = 0; i < buf.length; i++) {
    c = crcTable[(c ^ buf[i]) & 0xFF] ^ (c >>> 8);
  }
  return (c ^ 0xFFFFFFFF) >>> 0;
}

function dosDateTime(d = new Date()) {
  const time = ((d.getHours() << 11) | (d.getMinutes() << 5) | (d.getSeconds() >> 1)) & 0xFFFF;
  const date = (((d.getFullYear() - 1980) << 9) | ((d.getMonth() + 1) << 5) | d.getDate()) & 0xFFFF;
  return { time, date };
}

function createZip(sourceDir, zipPath, rootFolderName = 'nexaguard-security') {
  const entries = [];

  // Add root folder entry
  if (rootFolderName) {
    entries.push({
      zipRel: rootFolderName.replace(/\\/g, '/').replace(/\/$/, '') + '/',
      isDir: true,
      full: null
    });
  }

  function walk(dir, rel = '') {
    const list = fs.readdirSync(dir);
    for (const item of list) {
      const full = path.join(dir, item);
      const relPath = rel ? rel + '/' + item : item;
      const stat = fs.statSync(full);
      const zipRel = (rootFolderName ? rootFolderName + '/' : '') + relPath.replace(/\\/g, '/');
      if (stat.isDirectory()) {
        entries.push({
          zipRel: zipRel.endsWith('/') ? zipRel : zipRel + '/',
          isDir: true,
          full
        });
        walk(full, relPath);
      } else {
        entries.push({
          zipRel: zipRel,
          isDir: false,
          full
        });
      }
    }
  }

  walk(sourceDir);

  const localParts = [];
  const centralParts = [];
  let currentOffset = 0;
  const dt = dosDateTime();

  for (const entry of entries) {
    let raw = Buffer.alloc(0);
    let compressed = Buffer.alloc(0);
    let crc = 0;
    let method = 0;
    let externalAttr = 0;

    if (entry.isDir) {
      method = 0;
      crc = 0;
      compressed = Buffer.alloc(0);
      externalAttr = ((0o040755 << 16) | 0x10) >>> 0; // Unix dir + DOS dir
    } else {
      raw = fs.readFileSync(entry.full);
      compressed = zlib.deflateRawSync(raw);
      crc = crc32(raw);
      method = 8;
      externalAttr = (0o100644 << 16) >>> 0; // Unix regular file
    }

    const fnBuf = Buffer.from(entry.zipRel, 'utf8');

    // Local file header (30 bytes)
    const lh = Buffer.alloc(30);
    lh.writeUInt32LE(0x04034b50, 0);
    lh.writeUInt16LE(20, 4);
    lh.writeUInt16LE(0x0800, 6); // UTF-8
    lh.writeUInt16LE(method, 8);
    lh.writeUInt16LE(dt.time, 10);
    lh.writeUInt16LE(dt.date, 12);
    lh.writeUInt32LE(crc, 14);
    lh.writeUInt32LE(compressed.length, 18);
    lh.writeUInt32LE(raw.length, 22);
    lh.writeUInt16LE(fnBuf.length, 26);
    lh.writeUInt16LE(0, 28);

    localParts.push(lh, fnBuf, compressed);

    // Central directory header (46 bytes)
    const ch = Buffer.alloc(46);
    ch.writeUInt32LE(0x02014b50, 0);
    ch.writeUInt16LE(0x0314, 4); // UNIX 3.0
    ch.writeUInt16LE(20, 6);
    ch.writeUInt16LE(0x0800, 8); // UTF-8
    ch.writeUInt16LE(method, 10);
    ch.writeUInt16LE(dt.time, 12);
    ch.writeUInt16LE(dt.date, 14);
    ch.writeUInt32LE(crc, 16);
    ch.writeUInt32LE(compressed.length, 20);
    ch.writeUInt32LE(raw.length, 24);
    ch.writeUInt16LE(fnBuf.length, 28);
    ch.writeUInt16LE(0, 30);
    ch.writeUInt16LE(0, 32);
    ch.writeUInt16LE(0, 34);
    ch.writeUInt16LE(0, 36);
    ch.writeUInt32LE(externalAttr, 38);
    ch.writeUInt32LE(currentOffset, 42);

    centralParts.push(ch, fnBuf);

    currentOffset += lh.length + fnBuf.length + compressed.length;
  }

  const centralOffset = currentOffset;
  const centralSize = centralParts.reduce((acc, b) => acc + b.length, 0);

  // EOCD (22 bytes)
  const eocd = Buffer.alloc(22);
  eocd.writeUInt32LE(0x06054b50, 0);
  eocd.writeUInt16LE(0, 4);
  eocd.writeUInt16LE(0, 6);
  eocd.writeUInt16LE(entries.length, 8);
  eocd.writeUInt16LE(entries.length, 10);
  eocd.writeUInt32LE(centralSize, 12);
  eocd.writeUInt32LE(centralOffset, 16);
  eocd.writeUInt16LE(0, 20);

  const finalZip = Buffer.concat([...localParts, ...centralParts, eocd]);

  const outDir = path.dirname(zipPath);
  if (!fs.existsSync(outDir)) {
    fs.mkdirSync(outDir, { recursive: true });
  }

  fs.writeFileSync(zipPath, finalZip);
  console.log(`✅ Plugin ZIP generado con éxito en ${zipPath} (${finalZip.length} bytes, ${entries.length} entradas)`);
}

const crypto = require('crypto');

function generateIntegrityManifest(sourceDir) {
  const coreFiles = [
    'nexaguard-security.php',
    'inc/firewall.php',
    'inc/scanner.php',
    'inc/cleaner.php',
    'inc/updater.php',
    'inc/view-scanner.php',
    'inc/view-waf.php',
    'inc/view-modals.php'
  ];

  const manifest = {};
  for (const rel of coreFiles) {
    const fullPath = path.join(sourceDir, rel);
    if (fs.existsSync(fullPath)) {
      const content = fs.readFileSync(fullPath);
      manifest[rel.replace(/\\/g, '/')] = crypto.createHash('sha256').update(content).digest('hex');
    }
  }

  const manifestPath = path.join(sourceDir, 'integrity.json');
  fs.writeFileSync(manifestPath, JSON.stringify(manifest, null, 2), 'utf8');
  console.log(`🔒 Manifiesto de integridad criptográfica generado con éxito (${Object.keys(manifest).length} archivos protegidos).`);
}

function generateUpdateInfo(sourceDir, downloadsDir) {
  const mainPhp = fs.readFileSync(path.join(sourceDir, 'nexaguard-security.php'), 'utf8');
  const match = mainPhp.match(/define\(\s*['"]NEXAGUARD_VERSION['"]\s*,\s*['"]([^'"]+)['"]\s*\)/i);
  const version = match ? match[1] : '1.0.0';

  const info = {
    name: "NexaGuard Security · Antimalware & Blindaje Forense",
    slug: "nexaguard-security",
    version: version,
    homepage: "https://www.nexaguards.com",
    download_url: "https://raw.githubusercontent.com/asbel27/nexaguard/main/public/downloads/nexaguard-security.zip",
    fallback_download_url: "https://www.nexaguards.com/downloads/nexaguard-security.zip",
    tested: "6.7",
    requires_php: "7.4",
    last_updated: new Date().toISOString().split('T')[0],
    sections: {
      description: "Protección experta para WordPress: escáner forense profundo de archivos y base de datos, erradicación de backdoors y webshells, radar de integridad en tiempo real y blindaje WAF.",
      changelog: `<h4>Versión ${version}</h4><ul><li>Sirena electrónica de hospital (4s) y locución de voz estilo Avast al interceptar intrusiones en el Radar.</li><li>Alertas forenses inmediatas por correo electrónico con reporte completo del atacante (IP, vector, payload y herramienta).</li><li>Controles en vivo para silenciar o probar la alarma sonora en la consola de telemetría.</li><li>Protección y mitigación continua contra escáneres de Kali Linux (SQLMap, Nikto, WPScan) y botnets.</li></ul>`
    }
  };

  const infoPath = path.join(downloadsDir, 'info.json');
  fs.writeFileSync(infoPath, JSON.stringify(info, null, 2), 'utf8');
  console.log(`📡 Manifiesto de actualización generado con éxito para v${version} en ${infoPath}`);
}

const rootDir = path.resolve(__dirname, '..');
const pluginSourceDir = path.join(rootDir, 'plugin', 'nexaguard-security');
const downloadsDir = path.join(rootDir, 'public', 'downloads');

// Generar manifiesto de integridad antes de comprimir
generateIntegrityManifest(pluginSourceDir);

createZip(
  pluginSourceDir,
  path.join(downloadsDir, 'nexaguard-security.zip'),
  'nexaguard-security'
);

// Generar info.json para el auto-updater nativo de WordPress
generateUpdateInfo(pluginSourceDir, downloadsDir);
