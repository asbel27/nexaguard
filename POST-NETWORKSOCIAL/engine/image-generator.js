/**
 * Autonomous AI Creative & Image Generator for NexaGuard Social AutoPoster
 * Utiliza el motor headless de Google Chrome para sintetizar banners gráficos en alta resolución
 * (1200x630 para Facebook / 1080x1080 para Instagram) con estética ciberseguridad, badges de urgencia,
 * titulares persuasivos y llamadas a la acción, sin requerir APIs externas de pago.
 */

const fs = require('fs');
const path = require('path');
const { getOrLaunchBrowser } = require('./browser');

const BANNER_PRESETS = [
  {
    id: 'pantalla-roja',
    theme: 'red',
    badge: '🛑 ALERTA DE GOOGLE SAFE BROWSING',
    title: '¿TU WORDPRESS FUE BLOQUEADO CON PANTALLA ROJA?',
    subtitle: 'Protocolo forense para erradicar el malware, retirar la advertencia en 24h y recuperar tus clientes.',
    cta: 'AUDITORÍA GRATUITA EN VIVO · nexaguards.com',
    stats: ['✓ 100% Desinfección', '✓ Sin Pérdida de Datos', '✓ Garantía 30 Días']
  },
  {
    id: 'rescate-urgente',
    theme: 'amber',
    badge: '⚠️ CIBERSEGURIDAD DE EMERGENCIA',
    title: 'REPARACIÓN & DESINFECCIÓN DE WORDPRESS HACKEADO',
    subtitle: 'Erradicamos webshells, backdoors y redirecciones maliciosas con tecnología Core Sentinel.',
    cta: 'RESCATE FORENSE URGENTE · nexaguards.com',
    stats: ['✓ Escáner Remoto Gratis', '✓ Restaura tu SEO', '✓ Blindaje WAF']
  },
  {
    id: 'japanese-seo',
    theme: 'purple',
    badge: '🚨 INFECCIÓN SEO MASIVA',
    title: 'CÓMO ELIMINAR EL JAPANESE KEYWORD HACK',
    subtitle: 'Detén el cloaking a Googlebot, purga miles de URLs spam en japonés y restaura tu ranking orgánico.',
    cta: 'GUÍA FORENSE PASO A PASO · nexaguards.com',
    stats: ['✓ Purga HTTP 410', '✓ Sitemaps Limpios', '✓ Reindexación Rápida']
  },
  {
    id: 'escaner-radar',
    theme: 'cyan',
    badge: '🛡️ HERRAMIENTA FORENSE GRATUITA',
    title: 'AUDITA LA SEGURIDAD DE TU WEB EN 15 SEGUNDOS',
    subtitle: 'Detecta inyecciones ocultas, listas negras de Google y brechas críticas sin instalar nada.',
    cta: 'ESCANEA TU DOMINIO AHORA · nexaguards.com/#escaner',
    stats: ['✓ 100% Gratuito', '✓ Diagnóstico en Vivo', '✓ Sin Registro']
  },
  {
    id: 'woocommerce-safe',
    theme: 'green',
    badge: '💳 SEGURIDAD EN TIENDAS ONLINE',
    title: 'PROTEGE TU CHECKOUT CONTRA SKIMMERS MAGECART',
    subtitle: 'Evita el robo silencioso de tarjetas en el formulario de pago y cumple con PCI-DSS.',
    cta: 'BLINDA TU WOOCOMMERCE · nexaguards.com',
    stats: ['✓ Pasarelas Seguras', '✓ Protección Antifraude', '✓ Clientes Protegidos']
  }
];

function generateBannerHtml({ preset, format = 'fb' }) {
  const isSquare = format === 'ig';
  const width = isSquare ? 1080 : 1200;
  const height = isSquare ? 1080 : 630;

  const themeColors = {
    red: { primary: '#ff4560', gradient: 'linear-gradient(135deg, #24050e 0%, #070c22 70%)', border: '#ff4560' },
    amber: { primary: '#ffcf33', gradient: 'linear-gradient(135deg, #201700 0%, #070c22 70%)', border: '#ffcf33' },
    cyan: { primary: '#00f0ff', gradient: 'linear-gradient(135deg, #022030 0%, #070c22 70%)', border: '#00f0ff' },
    green: { primary: '#3de8a4', gradient: 'linear-gradient(135deg, #03251a 0%, #070c22 70%)', border: '#3de8a4' },
    purple: { primary: '#a78bfa', gradient: 'linear-gradient(135deg, #1d0e38 0%, #070c22 70%)', border: '#a78bfa' }
  };

  const col = themeColors[preset.theme] || themeColors.amber;

  return `<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8">
<style>
  @import url('https://fonts.googleapis.com/css2?family=Unbounded:wght@700;800&family=JetBrains+Mono:wght@500;700&family=Schibsted+Grotesk:wght@600;700&display=swap');
  
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body {
    width: ${width}px;
    height: ${height}px;
    background: #070c22;
    color: #eaf0ff;
    font-family: 'Schibsted Grotesk', sans-serif;
    overflow: hidden;
    display: flex;
    position: relative;
  }

  .canvas {
    width: 100%;
    height: 100%;
    background: ${col.gradient};
    border: 3px solid ${col.border};
    display: flex;
    flex-direction: column;
    justify-content: space-between;
    padding: ${isSquare ? '70px 65px' : '45px 55px'};
    position: relative;
  }

  .grid-bg {
    position: absolute;
    inset: 0;
    background-image: linear-gradient(rgba(107, 140, 255, 0.07) 1px, transparent 1px), linear-gradient(90deg, rgba(107, 140, 255, 0.07) 1px, transparent 1px);
    background-size: 35px 35px;
    pointer-events: none;
  }

  .top-row {
    display: flex;
    justify-content: space-between;
    align-items: center;
    position: relative;
    z-index: 2;
  }

  .brand {
    display: flex;
    align-items: center;
    gap: 14px;
  }

  .brand-logo {
    width: 44px;
    height: 44px;
  }

  .brand-name {
    font-family: 'Unbounded', sans-serif;
    font-size: 24px;
    font-weight: 800;
    letter-spacing: -0.5px;
    color: #ffffff;
  }

  .brand-name span { color: #ffcf33; }

  .badge {
    background: rgba(0, 0, 0, 0.5);
    border: 1.5px solid ${col.primary};
    color: ${col.primary};
    padding: 8px 18px;
    border-radius: 999px;
    font-family: 'JetBrains Mono', monospace;
    font-size: 14px;
    font-weight: 700;
    letter-spacing: 0.5px;
    box-shadow: 0 0 20px rgba(0,0,0,0.5);
  }

  .middle {
    position: relative;
    z-index: 2;
    margin: ${isSquare ? 'auto 0' : '20px 0'};
  }

  h1 {
    font-family: 'Unbounded', sans-serif;
    font-size: ${isSquare ? '48px' : '42px'};
    font-weight: 800;
    line-height: 1.15;
    color: #ffffff;
    letter-spacing: -1px;
    margin-bottom: 16px;
    text-shadow: 0 4px 18px rgba(0,0,0,0.8);
  }

  p {
    font-size: ${isSquare ? '24px' : '21px'};
    line-height: 1.45;
    color: #cdd7f5;
    max-width: ${isSquare ? '100%' : '88%'};
    font-weight: 500;
  }

  .stats-row {
    display: flex;
    gap: 16px;
    margin-top: 24px;
    flex-wrap: wrap;
  }

  .stat-pill {
    background: rgba(14, 23, 62, 0.8);
    border: 1px solid rgba(150, 175, 255, 0.25);
    color: #ffffff;
    padding: 6px 16px;
    border-radius: 8px;
    font-family: 'JetBrains Mono', monospace;
    font-size: 14px;
    font-weight: 600;
  }

  .bottom-row {
    display: flex;
    justify-content: space-between;
    align-items: center;
    position: relative;
    z-index: 2;
    padding-top: 15px;
    border-top: 1px solid rgba(150, 175, 255, 0.2);
  }

  .cta-tag {
    font-family: 'JetBrains Mono', monospace;
    font-size: 16px;
    font-weight: 700;
    color: ${col.primary};
  }

  .security-seal {
    font-size: 13px;
    color: #a0acd2;
    font-family: 'JetBrains Mono', monospace;
  }
</style>
</head>
<body>
  <div class="canvas">
    <div class="grid-bg"></div>

    <div class="top-row">
      <div class="brand">
        <svg class="brand-logo" viewBox="0 0 64 64">
          <path d="M32 4L54 12V31C54 45.5 44.5 55.5 32 60C19.5 55.5 10 45.5 10 31V12Z" fill="#15214f" stroke="${col.primary}" stroke-width="3"/>
          <path d="M22 42V22L42 42V22" fill="none" stroke="#fff" stroke-width="4.2" stroke-linecap="round"/>
        </svg>
        <div class="brand-name">Nexa<span>Guard</span></div>
      </div>
      <div class="badge">${preset.badge}</div>
    </div>

    <div class="middle">
      <h1>${preset.title}</h1>
      <p>${preset.subtitle}</p>
      <div class="stats-row">
        ${preset.stats.map(s => `<span class="stat-pill">${s}</span>`).join('')}
      </div>
    </div>

    <div class="bottom-row">
      <div class="cta-tag">👉 ${preset.cta}</div>
      <div class="security-seal">🔒 CIBERSEGURIDAD FORENSE PROFESIONAL</div>
    </div>
  </div>
</body>
</html>`;
}

/**
 * Genera una imagen creativa de marketing en disco
 * @param {Object} options
 * @param {string} [options.presetId] - ID del preset (ej: 'pantalla-roja', 'rescate-urgente')
 * @param {string} [options.format='fb'] - 'fb' (1200x630) o 'ig' (1080x1080)
 * @param {Object} [options.customData] - Datos personalizados de título/subtítulo
 * @returns {Promise<{ filePath: string, publicUrl: string, preset: Object }>}
 */
async function generateMarketingBanner({ presetId, format = 'fb', customData = null }) {
  let preset = BANNER_PRESETS.find(p => p.id === presetId);
  if (!preset) {
    // Si no se especifica, elegir uno aleatorio
    preset = BANNER_PRESETS[Math.floor(Math.random() * BANNER_PRESETS.length)];
  }

  if (customData) {
    preset = { ...preset, ...customData };
  }

  const browser = await getOrLaunchBrowser({ headless: true });
  const page = await browser.newPage();

  const isSquare = format === 'ig';
  const width = isSquare ? 1080 : 1200;
  const height = isSquare ? 1080 : 630;

  await page.setViewport({ width, height, deviceScaleFactor: 1 });

  const htmlContent = generateBannerHtml({ preset, format });
  await page.setContent(htmlContent, { waitUntil: 'networkidle0', timeout: 30000 });

  const outDir = path.join(__dirname, '..', 'public', 'assets', 'generated');
  if (!fs.existsSync(outDir)) fs.mkdirSync(outDir, { recursive: true });

  const filename = `banner_${preset.id}_${Date.now()}.png`;
  const filePath = path.join(outDir, filename);

  await page.screenshot({ path: filePath, type: 'png' });
  await page.close();

  return {
    filePath,
    publicUrl: `/assets/generated/${filename}`,
    preset
  };
}

module.exports = {
  BANNER_PRESETS,
  generateMarketingBanner
};
