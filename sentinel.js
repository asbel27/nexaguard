'use strict';
/**
 * ============================================================================
 * NEXAGUARD SERVER SENTINEL — File Integrity & Anti-Webshell Watchdog (FIM)
 * ============================================================================
 * Vigilancia criptográfica SHA-256 continua del núcleo de nexaguards.com.
 * - Detecta manipulación, inserción de webshells (.php, .sh, .exe) y alteración
 *   no autorizada de archivos vitales del servidor Node.js.
 * - Genera alertas en tiempo real para el WAF y el Terminal SOC.
 * ============================================================================
 */

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

// Extensiones prohibidas en carpetas públicas o raíz (potenciales webshells / exploits)
const ROGUE_EXTENSIONS = new Set([
  '.php', '.phtml', '.php3', '.php4', '.php5', '.php7', '.phps',
  '.sh', '.bash', '.exe', '.bat', '.cmd', '.py', '.pl', '.cgi',
  '.jsp', '.asp', '.aspx', '.vbs', '.ps1'
]);

// Archivos críticos del núcleo de nexaguards.com que se vigilan criptográficamente
const CRITICAL_FILES = [
  { path: 'server.js', category: 'Núcleo / Router HTTP', vital: true },
  { path: 'app.js', category: 'API / Auth & Licencias', vital: true },
  { path: 'store.js', category: 'Persistencia & DB', vital: true },
  { path: 'waf.js', category: 'WAF Perimetral', vital: true },
  { path: 'scanner.js', category: 'Motor Forense Remoto', vital: true },
  { path: 'mailer.js', category: 'Servicio de Correo', vital: false },
  { path: 'paypal.js', category: 'Integración PayPal', vital: false },
  { path: 'package.json', category: 'Dependencias & Scripts', vital: true },
  { path: 'public/panel.html', category: 'Consola Administrador', vital: true },
  { path: 'public/index.html', category: 'Portal Web Principal', vital: true },
  { path: 'public/downloads/info.json', category: 'Manifiesto Actualizaciones', vital: true },
  { path: 'public/downloads/nexaguard-security.zip', category: 'Binario Plugin WordPress', vital: true }
];

function sha256File(filePath) {
  try {
    if (!fs.existsSync(filePath)) return null;
    const content = fs.readFileSync(filePath);
    return crypto.createHash('sha256').update(content).digest('hex');
  } catch {
    return null;
  }
}

function createSentinel(opts = {}) {
  const rootDir = opts.rootDir || path.resolve(__dirname);
  const waf = opts.waf || null;
  const onAlert = opts.onAlert || (() => {});

  let baseline = new Map(); // relativePath -> { hash, size, mtime, category }
  let baselineTimestamp = 0;
  let lastAuditTimestamp = 0;
  let auditLogs = [];
  let rogueFilesDetected = [];
  let tamperedFilesDetected = [];
  let isWatching = false;

  // 1. Establecer o regenerar la línea base criptográfica
  function captureBaseline() {
    baseline.clear();
    const now = Date.now();

    for (const item of CRITICAL_FILES) {
      const fullPath = path.join(rootDir, item.path);
      if (fs.existsSync(fullPath)) {
        const stat = fs.statSync(fullPath);
        const hash = sha256File(fullPath);
        if (hash) {
          baseline.set(item.path, {
            hash,
            size: stat.size,
            mtime: stat.mtimeMs,
            category: item.category,
            vital: item.vital
          });
        }
      }
    }

    // Verificar si existe .env para vigilar su hash sin exponer contenido
    const envPath = path.join(rootDir, '.env');
    if (fs.existsSync(envPath)) {
      const stat = fs.statSync(envPath);
      const hash = sha256File(envPath);
      if (hash) {
        baseline.set('.env', {
          hash,
          size: stat.size,
          mtime: stat.mtimeMs,
          category: 'Secretos / Entorno',
          vital: true
        });
      }
    }

    baselineTimestamp = now;
    lastAuditTimestamp = now;
    rogueFilesDetected = [];
    tamperedFilesDetected = [];

    const record = {
      at: now,
      type: 'BASELINE_ESTABLISHED',
      totalFiles: baseline.size,
      status: 'OK'
    };
    auditLogs.unshift(record);
    if (auditLogs.length > 50) auditLogs.pop();

    return {
      totalFiles: baseline.size,
      timestamp: baselineTimestamp
    };
  }

  // 2. Escáner de archivos intrusos / webshells en directorios públicos y raíz
  function scanRogueFiles() {
    const rogues = [];
    const scanDirs = [
      rootDir,
      path.join(rootDir, 'public'),
      path.join(rootDir, 'public', 'downloads'),
      path.join(rootDir, 'public', 'brand')
    ];

    for (const dir of scanDirs) {
      if (!fs.existsSync(dir)) continue;
      try {
        const files = fs.readdirSync(dir);
        for (const file of files) {
          const fullPath = path.join(dir, file);
          const stat = fs.statSync(fullPath);
          if (stat.isFile()) {
            const ext = path.extname(file).toLowerCase();
            // Si tiene una extensión prohibida
            if (ROGUE_EXTENSIONS.has(ext)) {
              rogues.push({
                file: path.relative(rootDir, fullPath).replace(/\\/g, '/'),
                reason: `Extensión peligrosa no autorizada (${ext})`,
                size: stat.size,
                at: Date.now()
              });
            }
            // Si es un archivo oculto sospechoso en public
            if (file.startsWith('.') && dir !== rootDir && file !== '.gitkeep') {
              rogues.push({
                file: path.relative(rootDir, fullPath).replace(/\\/g, '/'),
                reason: 'Archivo oculto no autorizado en carpeta pública',
                size: stat.size,
                at: Date.now()
              });
            }
          }
        }
      } catch {}
    }
    return rogues;
  }

  // 3. Auditoría completa de integridad en tiempo real
  function verifyIntegrity() {
    lastAuditTimestamp = Date.now();
    const tampered = [];
    const missing = [];
    const verified = [];

    for (const [relPath, meta] of baseline.entries()) {
      const fullPath = path.join(rootDir, relPath);
      if (!fs.existsSync(fullPath)) {
        missing.push({ file: relPath, category: meta.category, reason: 'Archivo vital eliminado' });
        continue;
      }

      const currentHash = sha256File(fullPath);
      if (!currentHash) {
        tampered.push({ file: relPath, category: meta.category, reason: 'Error leyendo archivo' });
      } else if (currentHash !== meta.hash) {
        tampered.push({
          file: relPath,
          category: meta.category,
          baselineHash: meta.hash.slice(0, 12),
          currentHash: currentHash.slice(0, 12),
          reason: 'Firma criptográfica SHA-256 no coincide (Archivo alterado)'
        });
      } else {
        verified.push({
          file: relPath,
          category: meta.category,
          hash: currentHash.slice(0, 12),
          size: meta.size,
          vital: meta.vital,
          status: 'INTACTO'
        });
      }
    }

    const rogues = scanRogueFiles();
    rogueFilesDetected = rogues;
    tamperedFilesDetected = [...tampered, ...missing];

    const isHealthy = tampered.length === 0 && missing.length === 0 && rogues.length === 0;

    // Disparar alertas al WAF y logger si hay anomalías
    if (!isHealthy) {
      const alertMsg = `⚠️ ALERTA DE INTEGRIDAD: ${tampered.length} alterados, ${missing.length} faltantes, ${rogues.length} archivos intrusos`;
      onAlert({
        tampered,
        missing,
        rogues,
        at: lastAuditTimestamp
      });

      if (waf && typeof waf.recordThreat === 'function') {
        waf.recordThreat({
          ip: '127.0.0.1 (INTERNAL)',
          method: 'AUDIT',
          url: '/core/integrity',
          rule: 'CORE_TAMPER_DETECTED',
          action: 'ALERT_SOC',
          headers: {}
        });
      }
    }

    const auditEntry = {
      at: lastAuditTimestamp,
      type: 'INTEGRITY_AUDIT',
      healthy: isHealthy,
      verifiedCount: verified.length,
      tamperedCount: tampered.length,
      missingCount: missing.length,
      rogueCount: rogues.length
    };
    auditLogs.unshift(auditEntry);
    if (auditLogs.length > 50) auditLogs.pop();

    return {
      healthy: isHealthy,
      status: isHealthy ? 'PROTEGIDO' : 'AMENAZA_DETECTADA',
      lastAudit: lastAuditTimestamp,
      baselineTimestamp,
      verifiedCount: verified.length,
      files: verified,
      tampered,
      missing,
      rogues
    };
  }

  // 4. Iniciar monitoreo en segundo plano
  function startWatchdog() {
    if (isWatching) return;
    isWatching = true;

    captureBaseline();

    // Auditoría periódica cada 30 segundos
    const intervalTimer = setInterval(() => {
      try {
        verifyIntegrity();
      } catch (e) {
        console.error('Sentinel audit error:', e.message);
      }
    }, 30000).unref();

    // Vigilancia activa con fs.watch en archivos críticos
    for (const item of CRITICAL_FILES) {
      const fullPath = path.join(rootDir, item.path);
      if (fs.existsSync(fullPath)) {
        try {
          fs.watch(fullPath, (eventType) => {
            if (eventType === 'change' || eventType === 'rename') {
              setTimeout(() => verifyIntegrity(), 500);
            }
          });
        } catch {}
      }
    }

    return intervalTimer;
  }

  function getStatus() {
    const isHealthy = tamperedFilesDetected.length === 0 && rogueFilesDetected.length === 0;
    return {
      healthy: isHealthy,
      status: isHealthy ? 'INTACTO_100%' : 'ALTERACION_DETECTADA',
      totalMonitored: baseline.size,
      baselineDate: baselineTimestamp ? new Date(baselineTimestamp).toISOString() : null,
      lastAuditDate: lastAuditTimestamp ? new Date(lastAuditTimestamp).toISOString() : null,
      rogues: rogueFilesDetected,
      tampered: tamperedFilesDetected,
      auditLogs: auditLogs.slice(0, 10),
      monitoredFiles: Array.from(baseline.entries()).map(([p, m]) => ({
        path: p,
        category: m.category,
        hashShort: m.hash.slice(0, 12),
        size: m.size,
        vital: m.vital
      }))
    };
  }

  return {
    startWatchdog,
    captureBaseline,
    verifyIntegrity,
    getStatus
  };
}

module.exports = { createSentinel, CRITICAL_FILES };
