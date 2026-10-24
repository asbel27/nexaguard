/**
 * NexaGuard Group Moderation & Auto-Enforcement Engine
 * 1. Detecta en tiempo real y post-publicación si los administradores o el Admin Assist
 *    rechazan, declinan o suprimen las publicaciones.
 * 2. Si un grupo rechaza o suprime: Abandona el grupo en Facebook y lo añade a la Lista Negra (Blacklist).
 * 3. Si un grupo acepta y aprueba: Lo añade a la Lista Blanca (Whitelist) con máxima prioridad.
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

function getJsonPath(filename) {
  return path.join(__dirname, '..', 'data', filename);
}

function readJson(filename, def = []) {
  try {
    const p = getJsonPath(filename);
    if (!fs.existsSync(p)) return def;
    return JSON.parse(fs.readFileSync(p, 'utf8'));
  } catch (e) {
    return def;
  }
}

function writeJson(filename, data) {
  try {
    const p = getJsonPath(filename);
    fs.writeFileSync(p, JSON.stringify(data, null, 2), 'utf8');
    return true;
  } catch (e) {
    return false;
  }
}

/**
 * Abandona un grupo de Facebook interactuando con la interfaz web
 * @param {Object} params
 * @param {string} params.groupUrl - URL del grupo de Facebook
 * @param {function} [params.onLog] - Callback de log
 * @param {Page} [params.existingPage] - Página de Puppeteer opcional si ya está abierta
 * @returns {Promise<boolean>}
 */
async function leaveFacebookGroup({ groupUrl, onLog = console.log, existingPage = null }) {
  if (!groupUrl) return false;
  let page = existingPage;
  let ownPage = false;

  try {
    if (!page) {
      const browser = await getOrLaunchBrowser({ headless: false });
      page = await browser.newPage();
      ownPage = true;
      await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36');
    }

    const cleanUrl = groupUrl.split('?')[0].replace(/\/+$/, '') + '/';
    onLog(`🚪 [ABANDONANDO GRUPO] Navegando a ${cleanUrl} para retirar la cuenta...`);
    
    // Si la página actual no está en la URL del grupo, navegar a ella
    if (!page.url() || !page.url().includes(cleanUrl.replace('https://www.facebook.com', ''))) {
      await page.goto(cleanUrl, { waitUntil: 'domcontentloaded', timeout: 35000 });
      await sleep(randomDelay(2500, 4000));
    }

    // 1. Localizar y presionar el botón de membresía ("Eres miembro" / "Joined")
    onLog('🔍 Localizando botón de membresía del grupo...');
    const memberClicked = await page.evaluate(() => {
      const btns = Array.from(document.querySelectorAll('div[role="button"], button'));
      const memberBtn = btns.find(b => {
        const t = (b.innerText || '').toLowerCase().trim();
        const a = (b.getAttribute('aria-label') || '').toLowerCase().trim();
        return (
          t.includes('eres miembro') ||
          t === 'joined' ||
          t === 'miembro' ||
          a.includes('eres miembro') ||
          a === 'joined' ||
          a.includes('administrar membresía')
        );
      });
      if (memberBtn) {
        memberBtn.scrollIntoView({ behavior: 'smooth', block: 'center' });
        memberBtn.click();
        return true;
      }
      return false;
    });

    if (!memberClicked) {
      // Verificar si ya no somos miembros
      const alreadyLeft = await page.evaluate(() => {
        const text = (document.body ? document.body.innerText : '').toLowerCase();
        return text.includes('unirte al grupo') || text.includes('join group');
      });
      if (alreadyLeft) {
        onLog('ℹ️ La cuenta ya no pertenece a este grupo (aparece "Unirte al grupo").');
        return true;
      }
      onLog('⚠️ No se localizó el menú "Eres miembro" en la cabecera del grupo.');
      return false;
    }

    await sleep(randomDelay(1500, 2500));

    // 2. Localizar y pulsar "Abandonar grupo" / "Leave group" en el menú desplegable
    onLog('🔍 Pulsando opción "Abandonar grupo" en el menú...');
    const leaveOptionClicked = await page.evaluate(() => {
      const items = Array.from(document.querySelectorAll('div[role="menuitem"], div[role="button"], span, div'));
      const leaveItem = items.find(el => {
        const t = (el.innerText || '').toLowerCase().trim();
        return (
          t === 'abandonar grupo' ||
          t === 'leave group' ||
          t.includes('abandonar grupo') ||
          t.includes('leave group')
        );
      });
      if (leaveItem) {
        leaveItem.click();
        return true;
      }
      return false;
    });

    if (!leaveOptionClicked) {
      onLog('⚠️ No se encontró la opción "Abandonar grupo" en el menú desplegable.');
      return false;
    }

    await sleep(randomDelay(1800, 3000));

    // 3. Confirmar en el modal emergente de Facebook
    onLog('⚠️ Confirmando abandono definitivo en el diálogo modal...');
    const confirmed = await page.evaluate(() => {
      const dialog = document.querySelector('div[role="dialog"]');
      if (dialog) {
        const btns = Array.from(dialog.querySelectorAll('div[role="button"], button'));
        const confirmBtn = btns.find(b => {
          const t = (b.innerText || '').toLowerCase().trim();
          const a = (b.getAttribute('aria-label') || '').toLowerCase().trim();
          return (
            t === 'abandonar grupo' ||
            t === 'leave group' ||
            a === 'abandonar grupo' ||
            a === 'leave group' ||
            t === 'abandonar' ||
            t === 'leave'
          );
        });
        if (confirmBtn) {
          confirmBtn.click();
          return true;
        }
      }
      return false;
    });

    if (confirmed) {
      onLog('✅ [ÉXITO] Has abandonado el grupo en Facebook. Tu cuenta fue retirada con éxito.');
      await sleep(3000);
      return true;
    } else {
      onLog('⚠️ No se localizó el botón de confirmación en el modal.');
      return false;
    }
  } catch (err) {
    onLog(`❌ Error durante el abandono de grupo: ${err.message}`);
    return false;
  } finally {
    if (ownPage && page) {
      try { await page.close(); } catch (e) {}
    }
  }
}

/**
 * Añade un grupo a la LISTA NEGRA y retira la cuenta del grupo en Facebook
 * @param {Object} params
 * @param {string} [params.groupId]
 * @param {string} params.groupUrl
 * @param {string} [params.groupName]
 * @param {string} params.reason
 * @param {boolean} [params.leaveFacebook=true]
 * @param {function} [params.onLog]
 */
async function blacklistGroup({ groupId, groupUrl, groupName, reason, leaveFacebook = true, onLog = console.log }) {
  const groups = readJson('groups.json', []);
  const cleanUrl = (groupUrl || '').split('?')[0].replace(/\/+$/, '').toLowerCase();

  let target = groups.find(g => (groupId && g.id === groupId) || ((g.url || '').toLowerCase().replace(/\/+$/, '') === cleanUrl));
  const finalName = groupName || (target ? target.name : 'Grupo de Facebook');

  onLog(`🚫 [LISTA NEGRA] Procesando grupo hostil "${finalName}"... Motivo: ${reason}`, 'warn');

  // Si leaveFacebook es true, abandonar físicamente el grupo en Facebook
  let leftSuccess = false;
  if (leaveFacebook && groupUrl) {
    try {
      leftSuccess = await leaveFacebookGroup({ groupUrl, onLog });
    } catch (e) {
      onLog(`⚠️ No se pudo completar abandono automático en FB: ${e.message}`);
    }
  }

  // Actualizar en groups.json
  if (target) {
    target.enabled = false;
    target.blacklisted = true;
    target.whitelisted = false;
    target.isMember = leftSuccess ? false : target.isMember;
    target.blacklistReason = reason || 'Publicación rechazada o suprimida por administradores';
    target.blacklistedAt = new Date().toISOString();
    target.rejectedPostsCount = (target.rejectedPostsCount || 0) + 1;
  } else if (groupUrl) {
    target = {
      id: groupId || `grp-black-${Date.now()}`,
      name: finalName,
      url: groupUrl,
      category: 'General',
      enabled: false,
      blacklisted: true,
      whitelisted: false,
      isMember: false,
      blacklistReason: reason || 'Publicación rechazada o suprimida por administradores',
      blacklistedAt: new Date().toISOString(),
      rejectedPostsCount: 1,
      postCount: 0
    };
    groups.push(target);
  }

  writeJson('groups.json', groups);
  onLog(`🛡️ [COMPLETADO] "${finalName}" está ahora en LISTA NEGRA y excluido de futuras publicaciones.`, 'step');
  return target;
}

/**
 * Añade un grupo a la LISTA BLANCA (Permite publicaciones, administradores amigables)
 * @param {Object} params
 * @param {string} [params.groupId]
 * @param {string} params.groupUrl
 * @param {string} [params.groupName]
 * @param {function} [params.onLog]
 */
async function whitelistGroup({ groupId, groupUrl, groupName, onLog = console.log }) {
  const groups = readJson('groups.json', []);
  const cleanUrl = (groupUrl || '').split('?')[0].replace(/\/+$/, '').toLowerCase();

  const target = groups.find(g => (groupId && g.id === groupId) || ((g.url || '').toLowerCase().replace(/\/+$/, '') === cleanUrl));
  const finalName = groupName || (target ? target.name : 'Grupo de Facebook');

  if (target) {
    target.whitelisted = true;
    target.blacklisted = false;
    target.enabled = true;
    target.whitelistedAt = new Date().toISOString();
    target.approvedPostsCount = (target.approvedPostsCount || 0) + 1;
    target.reputation = 'trusted';
    writeJson('groups.json', groups);
    onLog(`⭐ [LISTA BLANCA] "${finalName}" verificado con éxito: Administradores amigables (publicación aprobada/visible).`, 'step');
    return target;
  }
  return null;
}

/**
 * Audita el estado de un post en un grupo para determinar si fue Aprobado, Rechazado o Suprimido
 * @param {Object} params
 * @param {Object} params.group
 * @param {string} params.messageSnippet
 * @param {function} [params.onLog]
 * @param {Page} [params.existingPage]
 * @returns {Promise<{ status: 'APPROVED'|'REJECTED'|'PENDING'|'UNKNOWN', reason?: string }>}
 */
async function auditGroupPostStatus({ group, messageSnippet, onLog = console.log, existingPage = null }) {
  if (!group || !group.url) return { status: 'UNKNOWN' };
  let page = existingPage;
  let ownPage = false;

  try {
    if (!page) {
      const browser = await getOrLaunchBrowser({ headless: false });
      page = await browser.newPage();
      ownPage = true;
      await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36');
    }

    const cleanUrl = group.url.split('?')[0].replace(/\/+$/, '') + '/';
    onLog(`🔍 [AUDITORÍA] Verificando estado de publicación en "${group.name || cleanUrl}"...`);
    await page.goto(cleanUrl, { waitUntil: 'domcontentloaded', timeout: 35000 });
    await sleep(randomDelay(3000, 4500));

    const snip = (messageSnippet || '').slice(0, 35).toLowerCase().trim();

    // 1. Evaluar si la publicación está visible en el feed público
    const inspection = await page.evaluate((snippetText) => {
      const bodyText = (document.body ? (document.body.innerText || '') + ' ' + (document.body.textContent || '') : '').toLowerCase();
      const normText = bodyText.normalize('NFD').replace(/[\u0300-\u036f]/g, '');

      // A) Comprobar si hay indicadores explícitos de rechazo o supresión
      const isDeclinedOrRejected = (
        normText.includes('rechazo tu publicacion') ||
        normText.includes('rechazada por el administrador') ||
        normText.includes('asistente del administrador rechazo') ||
        normText.includes('el asistente del administrador ha rechazado') ||
        normText.includes('tu publicacion infringe las normas') ||
        normText.includes('se rechazo tu publicacion') ||
        normText.includes('publicacion rechazada') ||
        normText.includes('declined your post') ||
        normText.includes('post was rejected')
      );

      // B) Comprobar si sigue en revisión / pendiente
      const isPending = (
        normText.includes('aprobacion') ||
        normText.includes('enviado a los administradores') ||
        normText.includes('publicacion pendiente') ||
        normText.includes('pending approval') ||
        normText.includes('submitted to admin')
      );

      // C) Buscar si el post está visible directamente en los artículos del feed
      let isVisible = false;
      let postLink = null;
      if (snippetText) {
        const postsContainers = Array.from(document.querySelectorAll('div[role="feed"] > div, div[data-pagelet*="FeedUnit"], div[role="article"]'));
        for (const box of postsContainers) {
          const t = (box.innerText || '').toLowerCase();
          if (t.includes(snippetText)) {
            isVisible = true;
            const a = box.querySelector('a[href*="/posts/"], a[href*="/permalink/"]');
            if (a && a.href) postLink = a.href.split('?')[0];
            break;
          }
        }
      }

      return {
        isDeclinedOrRejected,
        isPending,
        isVisible,
        postLink
      };
    }, snip);

    if (inspection.isDeclinedOrRejected) {
      onLog(`🚫 [RECHAZO CONFIRMADO] La administración o Admin Assist de "${group.name}" rechazó/suprimió la publicación.`, 'warn');
      return { status: 'REJECTED', reason: 'Rechazada por administradores / Admin Assist del grupo' };
    }

    if (inspection.isVisible) {
      onLog(`🎉 [PUBLICACIÓN VISIBLE] El post está activo y visible públicamente en el feed de "${group.name}".`, 'step');
      return { status: 'APPROVED', postUrl: inspection.postLink };
    }

    if (inspection.isPending) {
      onLog(`⏳ [PENDIENTE] La publicación sigue en cola de moderación en "${group.name}".`);
      return { status: 'PENDING' };
    }

    return { status: 'UNKNOWN' };
  } catch (err) {
    onLog(`⚠️ Error auditando post en "${group.name}": ${err.message}`);
    return { status: 'UNKNOWN' };
  } finally {
    if (ownPage && page) {
      try { await page.close(); } catch (e) {}
    }
  }
}

/**
 * Escanea los posts recientes y actualiza las listas blanca y negra automáticamente
 * @param {function} [onLog]
 */
async function auditAllRecentPosts({ onLog = console.log }) {
  const history = readJson('history.json', []);
  const groups = readJson('groups.json', []);
  const settings = readJson('settings.json', {});

  const recent = history.slice(0, 10);
  if (!recent.length) {
    onLog('ℹ️ No hay publicaciones recientes en el historial para auditar.');
    return { audited: 0, blacklisted: 0, whitelisted: 0 };
  }

  onLog(`🔍 [AUDITORÍA GLOBAL] Iniciando inspección de moderación en los últimos ${recent.length} grupos publicados...`);
  
  let blackCount = 0;
  let whiteCount = 0;

  for (const item of recent) {
    if (!item.groupUrl) continue;
    const group = groups.find(g => (item.groupId && g.id === item.groupId) || (g.url && g.url.includes(item.groupUrl)));
    if (!group) continue;

    // Si ya está en lista negra, omitir
    if (group.blacklisted) continue;

    const res = await auditGroupPostStatus({
      group: group || { name: item.groupName, url: item.groupUrl },
      messageSnippet: item.messagePreview || item.message,
      onLog
    });

    if (res.status === 'REJECTED') {
      await blacklistGroup({
        groupId: group.id,
        groupUrl: group.url,
        groupName: group.name,
        reason: res.reason,
        leaveFacebook: settings.autoLeaveOnRejection !== false,
        onLog
      });
      blackCount++;
    } else if (res.status === 'APPROVED') {
      await whitelistGroup({
        groupId: group.id,
        groupUrl: group.url,
        groupName: group.name,
        onLog
      });
      whiteCount++;
    }

    await sleep(randomDelay(3000, 5000));
  }

  onLog(`🏁 [AUDITORÍA FINALIZADA] Grupos en Lista Blanca: +${whiteCount} | Grupos en Lista Negra (abandonados): +${blackCount}`);
  return { audited: recent.length, blacklisted: blackCount, whitelisted: whiteCount };
}

module.exports = {
  leaveFacebookGroup,
  blacklistGroup,
  whitelistGroup,
  auditGroupPostStatus,
  auditAllRecentPosts
};

