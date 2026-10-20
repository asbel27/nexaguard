/**
 * Facebook Group Auto-Poster Engine
 * Automatiza la publicación segura en grupos de Facebook simulando comportamiento humano.
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
 * Publica un mensaje con posible imagen en un grupo de Facebook
 * @param {Object} options
 * @param {string} options.groupUrl - URL del grupo de Facebook
 * @param {string} options.message - Texto ya procesado (Spintax resuelto)
 * @param {string} [options.imagePath] - Ruta absoluta opcional a una imagen
 * @param {boolean} [options.simulateTyping=true] - Escribir carácter por carácter
 * @param {function} [options.onLog] - Callback para reportar progreso en vivo
 */
async function postToFacebookGroup({ groupUrl, message, imagePath, simulateTyping = true, onLog = console.log }) {
  const browser = await getOrLaunchBrowser({ headless: false });
  const page = await browser.newPage();

  // Configuración de User-Agent y permisos
  await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36');
  const context = browser.defaultBrowserContext();
  await context.overridePermissions('https://www.facebook.com', ['notifications']);

  const result = {
    ok: false,
    groupUrl,
    timestamp: new Date().toISOString(),
    screenshot: null,
    message: ''
  };

  try {
    onLog(`🌐 Navegando al grupo: ${groupUrl}...`);
    await page.goto(groupUrl, { waitUntil: 'networkidle2', timeout: 60000 });
    await sleep(randomDelay(2500, 4000));

    // Verificar si estamos logueados en Facebook
    const isLogged = await page.evaluate(() => {
      return !document.querySelector('input#email') && !document.querySelector('form#login_form');
    });

    if (!isLogged) {
      throw new Error('No has iniciado sesión en Facebook. Abre primero la ventana de inicio de sesión desde el panel.');
    }

    onLog('🔍 Buscando el cajón de publicación en el grupo...');

    // Selectores comunes del disparador de publicación en grupos de Facebook
    const triggerSelectors = [
      'div[role="button"] span:has-text("Escribe algo")',
      'div[role="button"] span:has-text("Write something")',
      'div[role="button"] span:has-text("Crear publicación pública")',
      'div[role="button"] span:has-text("Create a public post")',
      'div[role="button"] span:has-text("¿Qué estás pensando")',
      'div[role="button"] span:has-text("What\'s on your mind")',
      'div[role="main"] div[role="button"]'
    ];

    let clickedTrigger = false;

    // Búsqueda inteligente por texto en el DOM
    const foundHandle = await page.evaluateHandle(() => {
      const spans = Array.from(document.querySelectorAll('span, div'));
      const trigger = spans.find(el => {
        const t = (el.innerText || '').toLowerCase();
        return (
          t.includes('escribe algo') ||
          t.includes('write something') ||
          t.includes('crear publicación') ||
          t.includes('create a public post') ||
          t.includes('¿qué estás pensando') ||
          t.includes('what\'s on your mind')
        );
      });
      return trigger ? trigger.closest('div[role="button"]') || trigger : null;
    });

    if (foundHandle && foundHandle.asElement()) {
      await foundHandle.asElement().click();
      clickedTrigger = true;
      onLog('✓ Cajón de publicación activado.');
    } else {
      // Intento por selectores CSS
      for (const sel of triggerSelectors) {
        try {
          const el = await page.$(sel);
          if (el) {
            await el.click();
            clickedTrigger = true;
            onLog(`✓ Activado mediante selector: ${sel}`);
            break;
          }
        } catch (e) {}
      }
    }

    if (!clickedTrigger) {
      throw new Error('No se pudo abrir el cajón de publicación. Verifica si eres miembro del grupo o si los administradores limitaron los permisos.');
    }

    await sleep(randomDelay(2000, 3500));

    // Esperar a que el modal o editor de texto editable esté listo
    onLog('✍️ Localizando área de texto editable...');
    const editorSelector = 'div[role="dialog"] div[contenteditable="true"], div[role="textbox"][contenteditable="true"]';
    await page.waitForSelector(editorSelector, { timeout: 15000 });

    const editor = await page.$(editorSelector);
    if (!editor) {
      throw new Error('El cuadro de texto del post no respondió a tiempo.');
    }

    await editor.click();
    await sleep(800);

    // Escribir el mensaje
    onLog('📝 Escribiendo mensaje con simulación humana...');
    if (simulateTyping) {
      // Escribir en fragmentos naturales
      const paragraphs = message.split('\n');
      for (let i = 0; i < paragraphs.length; i++) {
        const p = paragraphs[i];
        if (p.length > 0) {
          await page.keyboard.type(p, { delay: randomDelay(15, 45) });
        }
        if (i < paragraphs.length - 1) {
          // Salto de línea con Shift+Enter
          await page.keyboard.down('Shift');
          await page.keyboard.press('Enter');
          await page.keyboard.up('Shift');
          await sleep(randomDelay(100, 300));
        }
      }
    } else {
      // Inyección rápida si no se simula tipeo lento
      await page.keyboard.type(message);
    }

    await sleep(randomDelay(2000, 4000));

    // Adjuntar imagen si existe
    if (imagePath && fs.existsSync(imagePath)) {
      onLog(`📸 Adjuntando imagen: ${path.basename(imagePath)}...`);
      try {
        const fileInput = await page.$('input[type="file"][accept*="image"]');
        if (fileInput) {
          await fileInput.uploadFile(imagePath);
          onLog('✓ Imagen subida con éxito. Esperando vista previa...');
          await sleep(randomDelay(3000, 5000));
        } else {
          onLog('⚠️ No se encontró input de imagen directo, buscando botón de fotos...');
        }
      } catch (errImg) {
        onLog(`⚠️ No se pudo adjuntar la imagen: ${errImg.message}`);
      }
    }

    // Esperar a que Facebook procese el enlace o vista previa
    await sleep(randomDelay(2500, 4500));

    // Buscar el botón de Publicar
    onLog('🚀 Buscando botón de "Publicar"...');
    const postBtnHandle = await page.evaluateHandle(() => {
      const dialog = document.querySelector('div[role="dialog"]') || document;
      const btns = Array.from(dialog.querySelectorAll('div[role="button"], button'));
      return btns.find(b => {
        const text = (b.innerText || '').toLowerCase().trim();
        const aria = (b.getAttribute('aria-label') || '').toLowerCase().trim();
        return (
          (text === 'publicar' || text === 'post' || aria === 'publicar' || aria === 'post') &&
          b.getAttribute('aria-disabled') !== 'true'
        );
      });
    });

    if (!postBtnHandle || !postBtnHandle.asElement()) {
      throw new Error('El botón de Publicar no está activo o no se encontró.');
    }

    onLog('✨ Haciendo clic en "Publicar"...');
    await postBtnHandle.asElement().click();

    // Esperar a que el modal desaparezca o se confirme
    onLog('⏳ Esperando confirmación de Facebook...');
    await sleep(randomDelay(5000, 8000));

    // Tomar captura de pantalla de comprobación
    const screenshotsDir = path.join(__dirname, '..', 'screenshots');
    if (!fs.existsSync(screenshotsDir)) fs.mkdirSync(screenshotsDir, { recursive: true });

    const safeName = groupUrl.replace(/[^a-zA-Z0-9]/g, '_').slice(-25);
    const shotFilename = `fb_${Date.now()}_${safeName}.png`;
    const shotPath = path.join(screenshotsDir, shotFilename);

    await page.screenshot({ path: shotPath, fullPage: false });
    onLog(`📸 Captura guardada como comprobante: ${shotFilename}`);

    result.ok = true;
    result.screenshot = `/screenshots/${shotFilename}`;
    result.message = 'Publicado exitosamente en el grupo.';
    onLog('🎉 ¡Publicación completada con éxito!');
  } catch (error) {
    onLog(`❌ Error al publicar: ${error.message}`);
    result.ok = false;
    result.message = error.message;

    // Capturar pantalla del error para diagnóstico
    try {
      const errShot = path.join(__dirname, '..', 'screenshots', `error_${Date.now()}.png`);
      await page.screenshot({ path: errShot });
      result.screenshot = `/screenshots/${path.basename(errShot)}`;
    } catch (e) {}
  } finally {
    try {
      await page.close();
    } catch (e) {}
  }

  return result;
}

module.exports = {
  postToFacebookGroup
};
