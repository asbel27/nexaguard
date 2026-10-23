/**
 * Autonomous AI Creative, Image & Video Generator for NexaGuard Social AutoPoster
 * Utiliza el motor headless de Google Chrome para sintetizar banners gráficos en alta resolución
 * (1200x630 para Facebook / 1080x1080 para Instagram) y clips de video animados en formato WebM
 * compatibles con los feeds de Meta sin requerir APIs externas de pago.
 */

const fs = require('fs');
const path = require('path');
const puppeteer = require('puppeteer-core');
const { findChromePath } = require('./browser');

let renderBrowserInstance = null;

async function getRenderBrowser() {
  if (renderBrowserInstance && renderBrowserInstance.isConnected()) {
    return renderBrowserInstance;
  }

  const chromePath = findChromePath();
  const renderDir = path.join(__dirname, '..', 'user_data_renderer');
  if (!fs.existsSync(renderDir)) fs.mkdirSync(renderDir, { recursive: true });

  renderBrowserInstance = await puppeteer.launch({
    executablePath: chromePath,
    headless: 'new',
    userDataDir: renderDir,
    defaultViewport: null,
    args: [
      '--no-sandbox',
      '--disable-setuid-sandbox',
      '--disable-gpu',
      '--disable-dev-shm-usage',
      '--disable-background-timer-throttling',
      '--disable-renderer-backgrounding'
    ]
  });

  return renderBrowserInstance;
}

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
  },
  {
    id: 'agencia-marketing',
    theme: 'cyan',
    badge: '🚀 ESTRATEGIA DE CRECIMIENTO DIGITAL',
    title: 'ESCALA TU MARCA Y CONSIGUE CLIENTES CALIFICADOS',
    subtitle: 'Campañas de alto rendimiento, optimización de conversión y automatización inteligente.',
    cta: 'AGENDA UNA ASESORÍA ESTRATÉGICA HOY',
    stats: ['✓ Retorno de Inversión', '✓ Tráfico Cualificado', '✓ Resultados Medibles']
  },
  {
    id: 'negocio-local',
    theme: 'amber',
    badge: '⭐ OFERTA ESPECIAL PARA TU CIUDAD',
    title: 'CALIDAD GARANTIZADA Y ATENCIÓN PROFESIONAL',
    subtitle: 'Descubre nuestros servicios exclusivos pensados para satisfacer tus necesidades con garantía total.',
    cta: 'CONTÁCTANOS POR WHATSAPP O MENSAJE PRIVADO',
    stats: ['✓ Atención Rápida', '✓ Mejor Precio', '✓ Garantía 100%']
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
    font-family: 'Schibsted Grotesk', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
    overflow: hidden;
    display: flex;
    position: relative;
    -webkit-font-smoothing: antialiased;
    -moz-osx-font-smoothing: grayscale;
    text-rendering: optimizeLegibility;
    image-rendering: -webkit-optimize-contrast;
  }

  .canvas {
    width: 100%;
    height: 100%;
    background: ${col.gradient};
    border: 3px solid ${col.border};
    display: flex;
    flex-direction: column;
    justify-content: space-between;
    padding: ${isSquare ? '70px 60px' : '45px 55px'};
    position: relative;
  }

  .grid-bg {
    position: absolute;
    inset: 0;
    background-image: 
      linear-gradient(rgba(150, 175, 255, 0.05) 1px, transparent 1px),
      linear-gradient(90deg, rgba(150, 175, 255, 0.05) 1px, transparent 1px);
    background-size: 40px 40px;
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
    gap: 12px;
  }

  .brand-logo {
    width: 44px;
    height: 44px;
  }

  .brand-name {
    font-family: 'Unbounded', sans-serif;
    font-size: 22px;
    font-weight: 800;
    letter-spacing: -0.5px;
    color: #ffffff;
  }

  .brand-name span { color: ${col.primary}; }

  .badge {
    background: rgba(0, 0, 0, 0.55);
    border: 1.5px solid ${col.primary};
    color: ${col.primary};
    padding: 6px 18px;
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
    font-size: ${isSquare ? '48px' : '40px'};
    font-weight: 800;
    line-height: 1.15;
    color: #ffffff;
    letter-spacing: -1px;
    margin-bottom: 16px;
    text-shadow: 0 4px 18px rgba(0,0,0,0.8);
  }

  p {
    font-size: ${isSquare ? '24px' : '20px'};
    line-height: 1.45;
    color: #cdd7f5;
    max-width: ${isSquare ? '100%' : '90%'};
    font-weight: 500;
  }

  .stats-row {
    display: flex;
    gap: 14px;
    margin-top: 22px;
    flex-wrap: wrap;
  }

  .stat-pill {
    background: rgba(14, 23, 62, 0.85);
    border: 1px solid rgba(150, 175, 255, 0.3);
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
      <div class="security-seal">⚡ INTELIGENCIA ARTIFICIAL GENERATIVA</div>
    </div>
  </div>
</body>
</html>`;
}

/**
 * Genera un banner estático de marketing
 */
async function generateMarketingBanner({ presetId, format = 'fb', customData = null, customPrompt = '' }) {
  let preset = BANNER_PRESETS.find(p => p.id === presetId);
  if (!preset) {
    preset = BANNER_PRESETS[0];
  }

  // Si hay customPrompt o customData, sintetizar un preset inteligente
  if (customPrompt && customPrompt.trim()) {
    const p = customPrompt.trim();
    preset = {
      id: 'custom-ai',
      theme: p.toLowerCase().includes('seguridad') || p.toLowerCase().includes('hack') ? 'red' : (p.toLowerCase().includes('seo') ? 'purple' : 'cyan'),
      badge: `✨ IA: ${p.slice(0, 32).toUpperCase()}`,
      title: p.length > 55 ? p.slice(0, 52) + '...' : p.toUpperCase(),
      subtitle: `Estrategia y soluciones de alto impacto diseñadas con inteligencia artificial avanzada.`,
      cta: `DESCUBRE MÁS AQUÍ · nexaguards.com`,
      stats: ['✓ 100% Personalizado', '✓ Calidad Ultra HD', '✓ Alto Impacto']
    };
  }

  if (customData) {
    preset = { ...preset, ...customData };
  }

  const browser = await getRenderBrowser();
  const page = await browser.newPage();

  const isSquare = format === 'ig';
  const width = isSquare ? 1080 : 1200;
  const height = isSquare ? 1080 : 630;

  // Renderizar a 2x Retina (2400x1260 px Ultra HD) para máxima nitidez en feeds de Facebook e Instagram
  await page.setViewport({ width, height, deviceScaleFactor: 2 });

  const htmlContent = generateBannerHtml({ preset, format });
  await page.setContent(htmlContent, { waitUntil: 'networkidle0', timeout: 30000 });
  await page.evaluate(() => document.fonts.ready);

  const outDir = path.join(__dirname, '..', 'public', 'assets', 'generated');
  if (!fs.existsSync(outDir)) fs.mkdirSync(outDir, { recursive: true });

  const filename = `banner_${preset.id}_${Date.now()}.png`;
  const filePath = path.join(outDir, filename);

  await page.screenshot({ path: filePath, type: 'png', omitBackground: false });
  await page.close();

  return {
    filePath,
    publicUrl: `/assets/generated/${filename}`,
    preset,
    mediaType: 'image'
  };
}

/**
 * Genera un Video Clip Animado (WebM/MP4) para Facebook & Instagram utilizando Canvas y MediaRecorder
 */
async function generateMarketingVideo({ presetId = 'escaner-radar', customData = null, durationSeconds = 5 }) {
  let preset = BANNER_PRESETS.find(p => p.id === presetId) || BANNER_PRESETS[0];
  if (customData) preset = { ...preset, ...customData };

  const browser = await getRenderBrowser();
  const page = await browser.newPage();
  await page.setViewport({ width: 1200, height: 630, deviceScaleFactor: 2 });

  // Página con Canvas interactivo animado en Ultra HD (2400x1260) y grabación nativa MediaRecorder a 60 FPS
  const videoHtml = `<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8">
<style>
  body { margin:0; overflow:hidden; background:#070c22; -webkit-font-smoothing: antialiased; }
  canvas { width:1200px; height:630px; display:block; }
</style>
</head>
<body>
<canvas id="c" width="2400" height="1260"></canvas>
<script>
  const canvas = document.getElementById('c');
  const ctx = canvas.getContext('2d');
  ctx.scale(2, 2);
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = 'high';
  const title = ${JSON.stringify(preset.title)};
  const badge = ${JSON.stringify(preset.badge)};
  const subtitle = ${JSON.stringify(preset.subtitle)};
  const cta = ${JSON.stringify(preset.cta)};
  const theme = ${JSON.stringify(preset.theme)};

  const colors = {
    red: '#ff4560',
    amber: '#ffcf33',
    cyan: '#00f0ff',
    green: '#3de8a4',
    purple: '#a78bfa'
  };
  const primaryColor = colors[theme] || '#00f0ff';

  let frame = 0;
  function draw() {
    frame++;
    ctx.fillStyle = '#060a22';
    ctx.fillRect(0, 0, 1200, 630);

    // Fondo Cyber Grid
    ctx.strokeStyle = 'rgba(100, 140, 255, 0.08)';
    ctx.lineWidth = 1;
    for (let x = 0; x < 1200; x += 40) {
      ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, 630); ctx.stroke();
    }
    for (let y = 0; y < 630; y += 40) {
      ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(1200, y); ctx.stroke();
    }

    // Efecto Radar Céntrico Animado
    const cx = 1000, cy = 315;
    const radius = (frame * 2.5) % 350;
    ctx.strokeStyle = primaryColor;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(cx, cy, radius, 0, Math.PI * 2);
    ctx.stroke();

    // Pulso secundario
    const r2 = (radius + 150) % 350;
    ctx.strokeStyle = 'rgba(255,255,255,0.15)';
    ctx.beginPath();
    ctx.arc(cx, cy, r2, 0, Math.PI * 2);
    ctx.stroke();

    // Línea láser escaneando verticalmente
    const laserY = (frame * 3) % 630;
    const grad = ctx.createLinearGradient(0, laserY - 15, 0, laserY + 15);
    grad.addColorStop(0, 'transparent');
    grad.addColorStop(0.5, primaryColor);
    grad.addColorStop(1, 'transparent');
    ctx.fillStyle = grad;
    ctx.fillRect(0, laserY - 6, 1200, 12);

    // Borde brillante con resplandor
    ctx.strokeStyle = primaryColor;
    ctx.lineWidth = 5;
    ctx.strokeRect(10, 10, 1180, 610);

    // Badge
    ctx.fillStyle = 'rgba(10, 20, 50, 0.85)';
    ctx.strokeStyle = primaryColor;
    ctx.lineWidth = 1.5;
    ctx.fillRect(60, 55, 360, 40);
    ctx.strokeRect(60, 55, 360, 40);

    ctx.fillStyle = primaryColor;
    ctx.font = 'bold 15px sans-serif';
    ctx.fillText(badge, 75, 80);

    // Titular Impactante
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 36px sans-serif';
    const words = title.split(' ');
    let line1 = words.slice(0, 5).join(' ');
    let line2 = words.slice(5).join(' ');
    ctx.fillText(line1, 60, 180);
    if (line2) ctx.fillText(line2, 60, 230);

    // Subtítulo
    ctx.fillStyle = '#b8c7eb';
    ctx.font = '20px sans-serif';
    ctx.fillText(subtitle.slice(0, 75) + '...', 60, 300);

    // Cuadros KPI animados
    const stat1 = '✓ 100% Protegido';
    const stat2 = '✓ Inteligencia en la Nube';
    const stat3 = '✓ Detección en Tiempo Real';

    ctx.fillStyle = 'rgba(14, 25, 70, 0.9)';
    ctx.fillRect(60, 360, 200, 45);
    ctx.fillRect(280, 360, 260, 45);
    ctx.fillRect(560, 360, 280, 45);

    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 15px monospace';
    ctx.fillText(stat1, 75, 388);
    ctx.fillText(stat2, 295, 388);
    ctx.fillText(stat3, 575, 388);

    // Barra de llamada a la acción
    ctx.fillStyle = primaryColor;
    ctx.font = 'bold 20px monospace';
    ctx.fillText('👉 ' + cta, 60, 560);

    ctx.fillStyle = '#8ea0cf';
    ctx.font = '14px monospace';
    ctx.fillText('🛡️ NEXAGUARD INTELLIGENT MOTION SYSTEM', 740, 560);

    requestAnimationFrame(draw);
  }
  draw();

  window.startRecording = function(durationMs) {
    return new Promise((resolve) => {
      const stream = canvas.captureStream(60);
      let mimeType = 'video/webm;codecs=vp9';
      if (!MediaRecorder.isTypeSupported(mimeType)) {
        mimeType = 'video/webm';
      }
      const recorder = new MediaRecorder(stream, {
        mimeType: mimeType,
        videoBitsPerSecond: 8000000
      });
      const chunks = [];
      recorder.ondataavailable = e => { if (e.data && e.data.size > 0) chunks.push(e.data); };
      recorder.onstop = async () => {
        const blob = new Blob(chunks, { type: mimeType });
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result);
        reader.readAsDataURL(blob);
      };
      recorder.start();
      setTimeout(() => recorder.stop(), durationMs);
    });
  };
</script>
</body>
</html>`;

  await page.setContent(videoHtml, { waitUntil: 'load' });
  const dataUrl = await page.evaluate(async (ms) => {
    return await window.startRecording(ms);
  }, durationSeconds * 1000);

  await page.close();

  // Convertir base64 dataUrl a buffer de video en disco
  const base64Data = dataUrl.replace(/^data:video\/webm;base64,/, '');
  const outDir = path.join(__dirname, '..', 'public', 'assets', 'generated');
  if (!fs.existsSync(outDir)) fs.mkdirSync(outDir, { recursive: true });

  const filename = `motion_${preset.id}_${Date.now()}.webm`;
  const filePath = path.join(outDir, filename);
  fs.writeFileSync(filePath, Buffer.from(base64Data, 'base64'));

  return {
    filePath,
    publicUrl: `/assets/generated/${filename}`,
    preset,
    mediaType: 'video'
  };
}

module.exports = {
  BANNER_PRESETS,
  generateMarketingBanner,
  generateMarketingVideo
};
