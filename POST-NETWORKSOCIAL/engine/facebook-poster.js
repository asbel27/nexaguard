/**
 * Facebook Group Auto-Poster Engine (Con Auto-Join y Detección Robusta)
 * Automatiza la publicación segura en grupos de Facebook simulando comportamiento humano.
 * Soporta textos Spintax, imágenes y videos con comprobante fotográfico y captura de URL directa.
 */

const fs = require('fs');
const path = require('path');
const { getOrLaunchBrowser } = require('./browser');
const { detectLanguage, getLanguageName } = require('./language-detector');
const { generatePersuasiveCopy } = require('./ai-copywriter');
const { parseSpintax } = require('./spintax');

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

function randomDelay(minMs, maxMs) {
  return Math.floor(Math.random() * (maxMs - minMs + 1)) + minMs;
}

/**
 * Intenta unirse a un grupo si aún no somos miembros
 */
async function tryAutoJoinGroup(page, onLog) {
  try {
    const joinResult = await page.evaluate(() => {
      const btns = Array.from(document.querySelectorAll('div[role="button"], button'));
      const joinBtn = btns.find(b => {
        const t = (b.innerText || '').toLowerCase().trim();
        const a = (b.getAttribute('aria-label') || '').toLowerCase().trim();
        return (
          t === 'unirte al grupo' ||
          t === 'join group' ||
          t === 'unirse al grupo' ||
          a === 'unirte al grupo' ||
          a === 'join group'
        );
      });

      if (joinBtn) {
        joinBtn.click();
        return { clicked: true };
      }
      return { clicked: false };
    });

    if (joinResult.clicked) {
      onLog('🤝 [AUTO-JOIN] Detectado grupo no vinculado. Pulsando botón "Unirte al grupo"...');
      await sleep(2500);

      // Comprobar si apareció modal de preguntas o aceptación de normas
      await page.evaluate(() => {
        const dialog = document.querySelector('div[role="dialog"]');
        if (dialog) {
          const checkboxes = Array.from(dialog.querySelectorAll('input[type="checkbox"], div[role="checkbox"]'));
          checkboxes.forEach(cb => {
            if (cb.getAttribute('aria-checked') !== 'true') cb.click();
          });

          const submitBtn = Array.from(dialog.querySelectorAll('div[role="button"], button')).find(b => {
            const t = (b.innerText || '').toLowerCase();
            return t.includes('enviar') || t.includes('submit') || t.includes('listo') || t.includes('done');
          });
          if (submitBtn) submitBtn.click();
        }
      });

      await sleep(3000);
      onLog('✓ [AUTO-JOIN] Solicitud de unión procesada.');
      return true;
    }
  } catch (err) {
    // No-op
  }
  return false;
}

/**
 * Publica un mensaje con posible imagen o video en un grupo de Facebook
 */
async function postToFacebookGroup({ groupUrl, message, imagePath, simulateTyping = true, frameworkId = null, autoTranslateByGroupLanguage = true, onLog = console.log }) {
  const browser = await getOrLaunchBrowser({ headless: false });
  const page = await browser.newPage();

  // Configuración de User-Agent y permisos
  await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36');
  const context = browser.defaultBrowserContext();
  await context.overridePermissions('https://www.facebook.com', ['notifications']);

  // Normalizar la URL del grupo a la raíz del feed de conversación
  let cleanGroupUrl = (groupUrl || '').trim();
  cleanGroupUrl = cleanGroupUrl.replace(/\/(media|photos|about|members|events|files|announcements)\/?$/i, '');
  if (!cleanGroupUrl.endsWith('/')) cleanGroupUrl += '/';

  const result = {
    ok: false,
    groupUrl: cleanGroupUrl,
    detectedLang: 'es',
    timestamp: new Date().toISOString(),
    screenshot: null,
    message: ''
  };

  try {
    onLog(`🌐 Navegando al grupo: ${cleanGroupUrl}...`);
    await page.goto(cleanGroupUrl, { waitUntil: 'networkidle2', timeout: 60000 });
    await sleep(randomDelay(2500, 4000));

    // Verificar si estamos logueados en Facebook
    const isLogged = await page.evaluate(() => {
      return !document.querySelector('input#email') && !document.querySelector('form#login_form');
    });

    if (!isLogged) {
      throw new Error('No has iniciado sesión en Facebook. Abre primero la ventana de inicio de sesión desde el panel.');
    }

    // Asegurar que estamos en la pestaña de Conversación/Feed (y no en Archivos multimedia o Información)
    await page.evaluate(() => {
      const tabs = Array.from(document.querySelectorAll('a[role="tab"], div[role="tab"], a'));
      const convTab = tabs.find(t => {
        const text = (t.innerText || '').toLowerCase().trim();
        return text === 'conversación' || text === 'conversation' || text === 'discussion' || text === 'debate';
      });
      if (convTab) convTab.click();
    });
    await sleep(2000);

    // Detección automática del idioma del grupo
    let finalMessage = message;
    try {
      const pageTextSample = await page.evaluate(() => {
        const title = (document.querySelector('h1, h2')?.innerText || document.title || '').trim();
        const desc = (document.querySelector('div[data-pagelet*="GroupDescription"], div[dir="auto"]')?.innerText || '').trim();
        return `${title} ${desc}`.slice(0, 500);
      });
      const detectedLang = detectLanguage(pageTextSample);
      result.detectedLang = detectedLang;
      onLog(`🌐 Idioma detectado en el grupo: ${getLanguageName(detectedLang)} [${detectedLang.toUpperCase()}]`);

      if (autoTranslateByGroupLanguage && detectedLang !== 'es') {
        const fId = frameworkId || 'pas-dolor-urgencia';
        const localized = generatePersuasiveCopy(fId, detectedLang);
        if (localized && localized.rawSpintax) {
          finalMessage = parseSpintax(localized.rawSpintax);
          onLog(`🔄 Publicación adaptada automáticamente al idioma del grupo: ${getLanguageName(detectedLang)}`);
        }
      }
    } catch (eLang) {}

    // 1. Verificar si NO somos miembros e intentar Auto-Join
    const didJoin = await tryAutoJoinGroup(page, onLog);
    if (didJoin) {
      await sleep(2500);
    }

    onLog('🔍 Buscando cajón de publicación en el feed...');

    // 2. Disparar apertura del modal de publicación mediante inspección profunda del DOM
    let clickedTrigger = await page.evaluate(() => {
      // 1) Buscar por texto en spans o botones de la zona del feed
      const candidates = Array.from(document.querySelectorAll('div[role="button"], span, div[data-pagelet*="GroupInlineComposer"], div[data-pagelet*="Composer"]'));
      
      for (const el of candidates) {
        const t = (el.innerText || '').toLowerCase().trim();
        const a = (el.getAttribute('aria-label') || '').toLowerCase().trim();
        if (
          t.includes('escribe algo') ||
          t.includes('write something') ||
          t.includes('crear publicación') ||
          t.includes('create a public post') ||
          t.includes('¿qué estás pensando') ||
          t.includes("what's on your mind") ||
          a.includes('escribe algo') ||
          a.includes('write something') ||
          a.includes('crear publicación') ||
          a.includes('create a public post')
        ) {
          const btn = el.closest('div[role="button"]') || el;
          btn.click();
          return true;
        }
      }

      // 2) Buscar botón flotante o botón con icono de lápiz/crear
      const pencil = document.querySelector('div[aria-label*="publicación"], div[aria-label*="post"], div[aria-label*="Escribe"], div[aria-label*="Write"]');
      if (pencil) {
        pencil.click();
        return true;
      }

      return false;
    });

    if (clickedTrigger) {
      onLog('✓ Cajón de publicación pulsado.');
    } else {
      // Intento por scroll suave en caso de que esté más abajo
      await page.evaluate(() => window.scrollBy(0, 300));
      await sleep(1500);

      clickedTrigger = await page.evaluate(() => {
        const spans = Array.from(document.querySelectorAll('div[role="main"] span, div[role="feed"] span'));
        const trigger = spans.find(s => {
          const t = (s.innerText || '').toLowerCase();
          return t.includes('escribe algo') || t.includes('write something') || t.includes('crear publicación');
        });
        if (trigger) {
          const btn = trigger.closest('div[role="button"]') || trigger;
          btn.click();
          return true;
        }
        return false;
      });
    }

    // 3. Esperar a que el modal o editor de texto editable esté listo
    onLog('✍️ Localizando área de texto editable en el modal...');
    const editorSelectors = [
      'div[role="dialog"] div[contenteditable="true"]',
      'div[role="dialog"] div[role="textbox"]',
      'div[role="textbox"][contenteditable="true"]',
      'div[contenteditable="true"][data-lexical-editor="true"]',
      'div[contenteditable="true"]'
    ];

    let editorHandle = null;
    const startTime = Date.now();
    while (Date.now() - startTime < 16000) {
      for (const sel of editorSelectors) {
        try {
          const el = await page.$(sel);
          if (el) {
            editorHandle = el;
            break;
          }
        } catch (e) {}
      }
      if (editorHandle) break;
      await sleep(800);
    }

    if (!editorHandle) {
      // Comprobar si el grupo requiere aprobación previa de administradores
      const isPending = await page.evaluate(() => {
        const text = (document.body.innerText || '').toLowerCase();
        return text.includes('solicitud pendiente') || text.includes('pending request') || text.includes('pendiente de aprobación');
      });

      if (isPending) {
        onLog('⏳ [MEMBRESÍA PENDIENTE] Tu solicitud de unión está a la espera de que los administradores la aprueben.');
        result.ok = false;
        result.message = 'Solicitud de unión enviada. Pendiente de aprobación de los administradores del grupo.';
        return result;
      }

      throw new Error('El cuadro de texto del post no respondió a tiempo. Es posible que el grupo sea cerrado o requiera membresía aprobada.');
    }

    await editorHandle.click();
    await sleep(800);

    // 4. Escribir el mensaje
    onLog('📝 Escribiendo mensaje con simulación humana...');
    if (simulateTyping) {
      const paragraphs = finalMessage.split('\n');
      for (let i = 0; i < paragraphs.length; i++) {
        const p = paragraphs[i];
        if (p.length > 0) {
          await page.keyboard.type(p, { delay: randomDelay(12, 35) });
        }
        if (i < paragraphs.length - 1) {
          await page.keyboard.down('Shift');
          await page.keyboard.press('Enter');
          await page.keyboard.up('Shift');
          await sleep(randomDelay(80, 200));
        }
      }
    } else {
      await page.keyboard.type(finalMessage);
    }

    await sleep(randomDelay(2000, 3500));

    // 5. Adjuntar imagen o video si existe
    if (imagePath && fs.existsSync(imagePath)) {
      const isVideo = /\.(mp4|mov|avi|webm)$/i.test(imagePath);
      onLog(`📁 Adjuntando ${isVideo ? 'video' : 'imagen'}: ${path.basename(imagePath)}...`);

      try {
        // Primero intentar hacer clic en el icono "Foto/vídeo" del modal si no hay input visible
        await page.evaluate(() => {
          const dialog = document.querySelector('div[role="dialog"]');
          if (dialog) {
            const photoBtns = Array.from(dialog.querySelectorAll('div[role="button"], div[aria-label]'));
            const pBtn = photoBtns.find(b => {
              const a = (b.getAttribute('aria-label') || '').toLowerCase();
              return a.includes('foto/vídeo') || a.includes('photo/video') || a.includes('foto') || a.includes('imagen');
            });
            if (pBtn) pBtn.click();
          }
        });
        await sleep(1500);

        const fileInput = await page.$('input[type="file"][accept*="image"], input[type="file"][accept*="video"], input[type="file"]');
        if (fileInput) {
          await fileInput.uploadFile(imagePath);
          onLog(`✓ ${isVideo ? 'Video' : 'Imagen'} cargado con éxito. Procesando multimedia en Facebook...`);
          await sleep(isVideo ? randomDelay(7000, 11000) : randomDelay(3500, 5500));
        } else {
          onLog('⚠️ No se encontró input de archivo directo para la imagen.');
        }
      } catch (errImg) {
        onLog(`⚠️ Error adjuntando archivo multimedia: ${errImg.message}`);
      }
    }

    // Esperar a que Facebook procese el contenido
    await sleep(randomDelay(2500, 4500));

    // 6. Buscar y pulsar el botón de Publicar
    onLog('🚀 Buscando botón de "Publicar"...');
    const clickedPost = await page.evaluate(() => {
      const dialog = document.querySelector('div[role="dialog"]') || document;
      const btns = Array.from(dialog.querySelectorAll('div[role="button"], button'));
      const postBtn = btns.find(b => {
        const text = (b.innerText || '').toLowerCase().trim();
        const aria = (b.getAttribute('aria-label') || '').toLowerCase().trim();
        return (
          (text === 'publicar' || text === 'post' || aria === 'publicar' || aria === 'post') &&
          b.getAttribute('aria-disabled') !== 'true'
        );
      });

      if (postBtn) {
        postBtn.click();
        return true;
      }
      return false;
    });

    if (!clickedPost) {
      throw new Error('El botón de Publicar no está activo o no se encontró.');
    }

    onLog('✨ Clic en "Publicar" ejecutado.');
    onLog('⏳ Esperando confirmación de Facebook y renderizado en el feed...');
    await sleep(randomDelay(6000, 9000));

    // 7. Comprobar si el grupo requiere aprobación previa de administradores
    const approvalStatus = await page.evaluate(() => {
      const bodyText = (document.body.innerText || '').toLowerCase();
      return (
        bodyText.includes('aprobación') ||
        bodyText.includes('enviado a los administradores') ||
        bodyText.includes('pending approval') ||
        bodyText.includes('submitted to admin')
      );
    });

    let postDirectUrl = cleanGroupUrl;
    let postMessageText = 'Publicado exitosamente en el grupo.';

    if (approvalStatus) {
      onLog('⏳ [MODERACIÓN] Este grupo tiene aprobación obligatoria activada. Tu post quedó enviado y está a la espera de que los administradores lo aprueben.');
      postMessageText = 'Enviado a Facebook. Pendiente de aprobación por los administradores del grupo.';
      result.pendingApproval = true;
      postDirectUrl = cleanGroupUrl;
    } else {
      // Si se publica de inmediato, buscar el enlace directo del post nuevo
      try {
        const detected = await page.evaluate((fallbackUrl, msgSnippet) => {
          const postsContainers = Array.from(document.querySelectorAll('div[role="feed"] > div, div[data-pagelet*="FeedUnit"], div[role="article"]'));
          for (const box of postsContainers) {
            const text = (box.innerText || '').toLowerCase();
            if (msgSnippet && text.includes(msgSnippet.toLowerCase())) {
              const link = box.querySelector('a[href*="/posts/"], a[href*="/permalink/"]');
              if (link && link.href) return link.href.split('?')[0];
            }
          }

          const links = Array.from(document.querySelectorAll('a[href*="/posts/"], a[href*="/permalink/"]'));
          for (const a of links) {
            const href = a.href || '';
            if (href && (href.includes('/posts/') || href.includes('/permalink/'))) {
              return href.split('?')[0];
            }
          }
          return fallbackUrl;
        }, cleanGroupUrl, (finalMessage || '').slice(0, 30));
        if (detected) postDirectUrl = detected;
      } catch (eDet) {}
    }

    // 8. Tomar captura de pantalla de comprobación
    const screenshotsDir = path.join(__dirname, '..', 'screenshots');
    if (!fs.existsSync(screenshotsDir)) fs.mkdirSync(screenshotsDir, { recursive: true });

    const safeName = cleanGroupUrl.replace(/[^a-zA-Z0-9]/g, '_').slice(-25);
    const shotFilename = `fb_${Date.now()}_${safeName}.png`;
    const shotPath = path.join(screenshotsDir, shotFilename);

    await page.screenshot({ path: shotPath, fullPage: false });
    onLog(`📸 Captura guardada como comprobante: ${shotFilename}`);

    result.ok = true;
    result.postUrl = postDirectUrl;
    result.screenshot = `/screenshots/${shotFilename}`;
    result.message = postMessageText;
    onLog(`🎉 ¡Proceso completado! ${postMessageText} Enlace: ${postDirectUrl}`);
  } catch (error) {
    onLog(`❌ Error al publicar: ${error.message}`);
    result.ok = false;
    result.message = error.message;

    try {
      const screenshotsDir = path.join(__dirname, '..', 'screenshots');
      if (!fs.existsSync(screenshotsDir)) fs.mkdirSync(screenshotsDir, { recursive: true });
      const errShot = path.join(screenshotsDir, `error_${Date.now()}.png`);
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
  postToFacebookGroup,
  tryAutoJoinGroup
};
