/**
 * Instagram Web Poster Engine
 * Automatiza la publicación de posts con imágenes y pies de foto en Instagram Web.
 */

const fs = require('fs');
const path = require('path');
const { getOrLaunchBrowser } = require('./browser');

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

function randomDelay(minMs, maxMs) {
  return Math.floor(Math.random() * (maxMs - minMs + 1)) + minMs;
}

/**
 * Publica una imagen con pie de foto en Instagram
 * @param {Object} options
 * @param {string} options.caption - Texto del pie de foto (Spintax ya resuelto)
 * @param {string} options.imagePath - Ruta absoluta a la imagen (obligatoria para Instagram)
 * @param {function} [options.onLog] - Callback de reporte en tiempo real
 */
async function postToInstagram({ caption, imagePath, onLog = console.log }) {
  if (!imagePath || !fs.existsSync(imagePath)) {
    throw new Error('Instagram requiere obligatoriamente una imagen o creativo para publicar un post.');
  }

  const browser = await getOrLaunchBrowser({ headless: false });
  const page = await browser.newPage();

  // Emular viewport móvil o desktop moderno
  await page.setViewport({ width: 1280, height: 850 });
  await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36');

  const result = {
    ok: false,
    timestamp: new Date().toISOString(),
    screenshot: null,
    message: ''
  };

  try {
    onLog('🌐 Navegando a Instagram...');
    await page.goto('https://www.instagram.com/', { waitUntil: 'networkidle2', timeout: 60000 });
    await sleep(randomDelay(3000, 5000));

    // Verificar si está logueado
    const isLogged = await page.evaluate(() => {
      return !document.querySelector('input[name="username"]') && !document.querySelector('form#loginForm');
    });

    if (!isLogged) {
      throw new Error('No has iniciado sesión en Instagram. Utiliza el botón "Abrir Instagram" para ingresar credenciales en el navegador.');
    }

    onLog('🔍 Buscando botón de "Crear" (+) en Instagram...');

    // Selector del botón Crear (+)
    const createBtnHandle = await page.evaluateHandle(() => {
      const svgs = Array.from(document.querySelectorAll('svg[aria-label="Nueva publicación"], svg[aria-label="New post"], svg[aria-label="Crear"], svg[aria-label="Create"]'));
      if (svgs.length > 0) return svgs[0].closest('a, div[role="link"], div[role="button"]');
      const spans = Array.from(document.querySelectorAll('span'));
      const found = spans.find(s => s.innerText === 'Crear' || s.innerText === 'Create');
      return found ? found.closest('a, div[role="button"]') : null;
    });

    if (!createBtnHandle || !createBtnHandle.asElement()) {
      throw new Error('No se encontró el botón de crear publicación en la barra lateral de Instagram.');
    }

    await createBtnHandle.asElement().click();
    onLog('✓ Modal de creación abierto.');
    await sleep(randomDelay(2000, 3500));

    // Esperar input de archivo
    onLog(`📸 Subiendo archivo de imagen: ${path.basename(imagePath)}...`);
    const fileInput = await page.$('input[type="file"][accept*="image"]');
    if (!fileInput) {
      throw new Error('No se encontró el selector de archivos de Instagram.');
    }

    await fileInput.uploadFile(imagePath);
    await sleep(randomDelay(3000, 5000));

    // Clic en "Siguiente" (Ajustes de recorte)
    onLog('➡️ Avanzando al siguiente paso (Recorte)...');
    await page.evaluate(() => {
      const btns = Array.from(document.querySelectorAll('div[role="button"], button'));
      const nextBtn = btns.find(b => b.innerText === 'Siguiente' || b.innerText === 'Next');
      if (nextBtn) nextBtn.click();
    });
    await sleep(randomDelay(2000, 3500));

    // Clic en "Siguiente" (Filtros)
    onLog('➡️ Avanzando al siguiente paso (Filtros)...');
    await page.evaluate(() => {
      const btns = Array.from(document.querySelectorAll('div[role="button"], button'));
      const nextBtn = btns.find(b => b.innerText === 'Siguiente' || b.innerText === 'Next');
      if (nextBtn) nextBtn.click();
    });
    await sleep(randomDelay(2500, 4000));

    // Escribir el pie de foto
    onLog('✍️ Escribiendo pie de foto...');
    const captionSelector = 'div[aria-label="Escribe un pie de foto..."], div[aria-label="Write a caption..."], div[contenteditable="true"]';
    await page.waitForSelector(captionSelector, { timeout: 10000 });
    const captionEl = await page.$(captionSelector);
    if (captionEl) {
      await captionEl.click();
      await page.keyboard.type(caption, { delay: randomDelay(10, 30) });
      await sleep(randomDelay(2000, 3500));
    }

    // Clic en "Compartir"
    onLog('🚀 Haciendo clic en "Compartir"...');
    await page.evaluate(() => {
      const btns = Array.from(document.querySelectorAll('div[role="button"], button'));
      const shareBtn = btns.find(b => b.innerText === 'Compartir' || b.innerText === 'Share');
      if (shareBtn) shareBtn.click();
    });

    onLog('⏳ Esperando confirmación de Instagram...');
    await sleep(randomDelay(8000, 12000));

    // Capturar pantalla de comprobación
    const screenshotsDir = path.join(__dirname, '..', 'screenshots');
    if (!fs.existsSync(screenshotsDir)) fs.mkdirSync(screenshotsDir, { recursive: true });

    const shotFilename = `ig_${Date.now()}.png`;
    const shotPath = path.join(screenshotsDir, shotFilename);
    await page.screenshot({ path: shotPath });

    result.ok = true;
    result.screenshot = `/screenshots/${shotFilename}`;
    result.message = 'Publicación compartida exitosamente en Instagram.';
    onLog('🎉 ¡Post publicado en Instagram con éxito!');
  } catch (error) {
    onLog(`❌ Error en Instagram: ${error.message}`);
    result.ok = false;
    result.message = error.message;
  } finally {
    try {
      await page.close();
    } catch (e) {}
  }

  return result;
}

module.exports = {
  postToInstagram
};
