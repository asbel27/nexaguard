/**
 * Facebook Group Detector & Auto-Sync Engine
 * Escanea el perfil de Facebook del usuario y extrae automáticamente todos los grupos
 * a los que pertenece para sincronizarlos en la aplicación con 1 solo clic.
 */

const { getOrLaunchBrowser } = require('./browser');

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Detecta y extrae todos los grupos a los que pertenece el usuario
 * @param {function} [onLog] - Callback de log en vivo
 * @returns {Promise<Array>} Lista de grupos detectados con id, name, url, category
 */
async function detectUserFacebookGroups(onLog = console.log) {
  const browser = await getOrLaunchBrowser({ headless: false });
  const page = await browser.newPage();

  const detectedGroups = [];

  try {
    onLog('🌐 Accediendo a la lista de grupos de tu perfil de Facebook...');
    // https://www.facebook.com/groups/joins/ es la URL oficial donde Facebook lista tus grupos
    await page.goto('https://www.facebook.com/groups/joins/', { waitUntil: 'networkidle2', timeout: 60000 });
    await sleep(3500);

    // Verificar si está logueado
    const isLogged = await page.evaluate(() => {
      return !document.querySelector('input#email') && !document.querySelector('form#login_form');
    });

    if (!isLogged) {
      throw new Error('No has iniciado sesión en Facebook. Por favor pulsa "🔑 Sesión de Facebook" primero.');
    }

    onLog('📜 Desplazando página para cargar todos los grupos vinculados...');
    
    // Auto-scroll para cargar grupos mediante infinite scroll
    let prevHeight = 0;
    for (let scroll = 0; scroll < 6; scroll++) {
      const curHeight = await page.evaluate(() => {
        window.scrollBy(0, 1500);
        return document.body.scrollHeight;
      });
      if (curHeight === prevHeight) break;
      prevHeight = curHeight;
      await sleep(1500);
    }

    onLog('🔍 Extrayendo información de grupos...');
    const rawGroups = await page.evaluate(() => {
      const results = [];
      // Buscar todos los enlaces que apunten a /groups/
      const anchors = Array.from(document.querySelectorAll('a[href*="/groups/"]'));
      const seenUrls = new Set();

      for (const a of anchors) {
        const href = a.href || '';
        // Limpiar URL: https://www.facebook.com/groups/123456/
        const match = href.match(/https?:\/\/(www\.)?facebook\.com\/groups\/([^\/?#]+)/i);
        if (match && match[0]) {
          const cleanUrl = match[0].replace(/\/+$/, '') + '/';
          const slug = match[2];

          // Evitar URLs reservadas de Facebook
          const reserved = ['feed', 'discover', 'joins', 'create', 'notifications', 'categories'];
          if (reserved.includes(slug.toLowerCase())) continue;

          if (!seenUrls.has(cleanUrl)) {
            seenUrls.add(cleanUrl);
            
            // Obtener el nombre del grupo
            let name = (a.innerText || '').trim();
            if (!name || name.length < 3) {
              const span = a.querySelector('span');
              if (span) name = (span.innerText || '').trim();
            }

            // Si el texto es "Unirte" o genérico, intentar del contenedor padre
            if (!name || name.toLowerCase() === 'unirte' || name.toLowerCase() === 'join') {
              const card = a.closest('div[role="listitem"]') || a.closest('div');
              if (card) {
                const titleSpan = card.querySelector('span[dir="auto"], strong');
                if (titleSpan) name = (titleSpan.innerText || '').trim();
              }
            }

            if (name && name.length >= 3 && !name.toLowerCase().includes('grupos')) {
              results.push({
                name: name,
                url: cleanUrl,
                slug: slug
              });
            }
          }
        }
      }
      return results;
    });

    onLog(`✓ Se detectaron ${rawGroups.length} grupos vinculados a tu cuenta.`);

    for (const g of rawGroups) {
      // Categorización automática inteligente por palabras clave
      let cat = 'General';
      const n = g.name.toLowerCase();
      if (n.includes('wordpress') || n.includes('wp')) cat = 'WordPress';
      else if (n.includes('woocommerce') || n.includes('tienda') || n.includes('ecommerce')) cat = 'WooCommerce';
      else if (n.includes('seo') || n.includes('posicionamiento') || n.includes('google')) cat = 'SEO';
      else if (n.includes('diseño') || n.includes('design') || n.includes('webmaster')) cat = 'Diseño Web';
      else if (n.includes('freelance') || n.includes('agencia') || n.includes('marketing')) cat = 'Marketing & Freelance';

      detectedGroups.push({
        id: `fb-${g.slug}`,
        name: g.name,
        url: g.url,
        category: cat,
        enabled: true,
        isMember: true,
        lastPosted: null,
        postCount: 0
      });
    }

  } catch (err) {
    onLog(`⚠️ Error al detectar grupos: ${err.message}`);
    throw err;
  } finally {
    try {
      await page.close();
    } catch (e) {}
  }

  return detectedGroups;
}

module.exports = {
  detectUserFacebookGroups
};
