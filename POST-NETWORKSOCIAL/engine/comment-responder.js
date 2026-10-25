/**
 * NexaGuard Social AutoPoster · Motor de Auto-Respuesta Inteligente a Comentarios (Community Manager IA)
 * Detecta cuando alguien comenta en las publicaciones de Facebook, analiza la intención de forma lógica
 * y responde amigablemente dirigiéndolo a nexaguards.com con simulación humana y protección anti-baneo.
 */

const fs = require('fs');
const path = require('path');
const { getOrLaunchBrowser, sleep, randomDelay } = require('./browser');
const { parseSpintax } = require('./spintax');
const { detectLanguage, getLanguageName } = require('./language-detector');

const DATA_DIR = path.join(__dirname, '..', 'data');
const REPLIED_FILE = path.join(DATA_DIR, 'replied_comments.json');
const CONFIG_FILE = path.join(DATA_DIR, 'comment_bot_config.json');

function readJsonSafe(filePath, def = []) {
  try {
    if (!fs.existsSync(filePath)) {
      if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
      fs.writeFileSync(filePath, JSON.stringify(def, null, 2), 'utf8');
      return def;
    }
    return JSON.parse(fs.readFileSync(filePath, 'utf8'));
  } catch (e) {
    return def;
  }
}

function writeJsonSafe(filePath, data) {
  try {
    if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
    fs.writeFileSync(filePath, JSON.stringify(data, null, 2), 'utf8');
  } catch (e) {}
}

// Plantillas de Respuesta Contextual Lógica
const RESPONSE_INTENTS = [
  {
    id: 'HACK_EMERGENCY',
    name: 'Urgencia / Hack / Malware / Pantalla Roja',
    keywords: [
      'hack', 'pantalla roja', 'roja', 'virus', 'malware', 'infectad', 'troyano',
      'webshell', 'backdoor', 'redirec', 'inyeccion', 'caido', 'bloquead',
      'google me penaliz', 'urgente', 'ayuda', 'socorro', 'desesperad', 'limpiar',
      'no puedo entrar', 'hackearon', 'hackeado'
    ],
    templates: [
      '¡Hola {NAME}! Lamento mucho lo ocurrido. En estos casos no borres archivos a ciegas porque el malware suele regenerarse desde la base de datos o transients de WordPress. Te sugiero pasarle nuestro escáner forense gratuito en 👉 https://nexaguards.com/#escaner para identificar el código inyectado, o si requieres desinfección urgente contáctanos en https://nexaguards.com',
      'Hola {NAME}, entiendo perfectamente la molestia de la pantalla roja o el hackeo. El 89% de estas infecciones provienen de vulnerabilidades en plugins sin actualizar o webshells ocultas en wp-includes. Puedes auditar tu dominio en 15 segundos sin costo en 👉 https://nexaguards.com/#escaner y ver el diagnóstico exacto.',
      'Hola {NAME}, qué difícil situación. Antes de reinstalar todo, te recomiendo correr una auditoría de integridad para no perder datos. Hemos liberado un escáner en vivo y gratuito para la comunidad en 👉 https://nexaguards.com/#escaner. Si necesitas que nuestro equipo forense lo limpie con garantía de 30 días, en nexaguards.com estamos disponibles 24/7.'
    ]
  },
  {
    id: 'SCANNER_FREE',
    name: 'Herramienta / Escáner / Gratuito',
    keywords: [
      'escaner', 'scanner', 'gratis', 'free', 'donde', 'link', 'enlace',
      'probar', 'funciona', 'como se usa', 'herramienta', 'como funciona', 'cual es la web'
    ],
    templates: [
      '¡Hola {NAME}! Sí, el escáner de diagnóstico remoto es 100% gratuito y no tienes que instalar nada en tu servidor. Analiza listas negras de Google, inyecciones de JavaScript ocultas y cabeceras de cloaking en 15 segundos directo en 👉 https://nexaguards.com/#escaner',
      'Hola {NAME}, puedes acceder libremente al escáner gratuito en 👉 https://nexaguards.com/#escaner. Hace una auditoría en vivo en menos de 15 segundos para detectar brechas de seguridad críticas sin necesidad de registro.',
      '¡Hola {NAME}! Es totalmente gratis y de uso público. Solo ingresas la URL de tu dominio en 👉 https://nexaguards.com/#escaner y obtienes un reporte forense detallado al instante.'
    ]
  },
  {
    id: 'PRICING',
    name: 'Precios / Cotización / Tarifas',
    keywords: [
      'precio', 'cuanto', 'costo', 'cobran', 'tarifa', 'vale', 'dolar',
      'presupuesto', 'cotiza', 'servicios', 'cuanto cuesta', 'planes'
    ],
    templates: [
      'Hola {NAME}, el diagnóstico forense inicial es 100% gratuito en https://nexaguards.com. Para desinfecciones completas con retiro de listas negras de Google y garantía de 30 días, manejamos tarifas transparentes y accesibles por sitio. Puedes revisar los detalles en 👉 https://nexaguards.com o consultarnos en vivo.',
      '¡Hola {NAME}! El escaneo y diagnóstico no cuesta nada. Si requieres el rescate completo de un sitio comprometido con blindaje perimetral Core Sentinel incluido, puedes ver nuestros planes en 👉 https://nexaguards.com'
    ]
  },
  {
    id: 'GRATITUDE',
    name: 'Agradecimiento / Felicitación',
    keywords: [
      'gracias', 'buen aporte', 'excelente', 'util', 'crack', 'buena info',
      'felicidades', 'genial', 'top', 'graciass', 'buenisimo', 'muy bueno', 'tremendo'
    ],
    templates: [
      '¡Muchas gracias a ti {NAME}! Nos alegra mucho aportar valor a la comunidad. Si en algún momento necesitas verificar la salud de tu web, tienes el escáner gratuito disponible en 👉 https://nexaguards.com. ¡Mucho éxito con tu proyecto!',
      '¡Gracias {NAME}! Compartir conocimiento técnico evita que miles de sitios caigan por malware prevenible. Tienes más herramientas forenses y guías en 👉 https://nexaguards.com. ¡Un saludo!',
      '¡Muchas gracias {NAME}! La seguridad en WordPress y WooCommerce es clave hoy en día. Si tienes cualquier consulta técnica sobre desinfección, en 👉 https://nexaguards.com cuentas con nosotros.'
    ]
  },
  {
    id: 'GENERAL',
    name: 'Consulta General / Otros',
    keywords: [],
    templates: [
      'Hola {NAME}, gracias por comentar. Si en algún momento necesitas verificar la seguridad de tu WordPress o limpiar cualquier código sospechoso, cuentas con nuestro escáner gratuito y equipo forense en 👉 https://nexaguards.com',
      '¡Hola {NAME}! Muy interesante tu punto. En 👉 https://nexaguards.com tenemos herramientas de diagnóstico gratuito y guías técnicas para proteger proyectos web de ataques silenciosos. ¡Saludos cordiales!',
      'Hola {NAME}, gracias por participar en la conversación. Para cualquier auditoría de malware o blindaje de tu web, estamos a la orden en 👉 https://nexaguards.com'
    ]
  }
];

// Plantillas en Inglés (English)
const ENGLISH_INTENTS = {
  HACK_EMERGENCY: [
    'Hi {NAME}! Really sorry to hear that. When Google triggers a deceptive site warning, never delete files blindly because backdoors hide in transients or the database. Run our free remote diagnostic scanner in 15s to spot the injected code: 👉 https://nexaguards.com/#escaner or reach out for urgent forensic rescue at https://nexaguards.com',
    'Hi {NAME}, totally understand the stress of the red screen or malware hack. 89% of these intrusions stem from outdated plugins or hidden webshells in wp-includes. You can audit your domain in 15 seconds for free at 👉 https://nexaguards.com/#escaner to view the exact report.'
  ],
  SCANNER_FREE: [
    'Hi {NAME}! Yes, our remote forensic diagnostic scanner is 100% free with zero installation needed on your server. You can audit Google blacklists, cloaking and hidden JavaScript injections in 15 seconds at 👉 https://nexaguards.com/#escaner',
    'Hello {NAME}, you can access the free scanner directly at 👉 https://nexaguards.com/#escaner. It runs a live audit in 15 seconds to detect critical vulnerabilities without requiring any account or plugin install.'
  ],
  PRICING: [
    'Hi {NAME}! The initial forensic diagnosis is 100% free on https://nexaguards.com. For full cleanups with Google blacklist removal and a 30-day guarantee, we offer transparent flat rates. Feel free to check out 👉 https://nexaguards.com or message us directly.'
  ],
  GRATITUDE: [
    'Thank you so much {NAME}! Really glad this adds value to the developer community. If you ever need to audit a site health, our free forensic scanner is available 24/7 at 👉 https://nexaguards.com. Best of luck with your projects!',
    'Thanks {NAME}! Sharing security knowledge prevents thousands of websites from going down. Feel free to check our guides and scanner at 👉 https://nexaguards.com. Cheers!'
  ],
  GENERAL: [
    'Hi {NAME}, thanks for commenting! If you ever need to audit WordPress security or clean stealth malicious code, our free scanner and forensic team are available at 👉 https://nexaguards.com. Cheers!',
    'Hello {NAME}! Great point. At 👉 https://nexaguards.com we provide free diagnostic tools and forensic guides to protect web applications. Best regards!'
  ]
};

// Plantillas en Portugués (Português)
const PORTUGUESE_INTENTS = {
  HACK_EMERGENCY: [
    'Olá {NAME}! Sinto muito pelo ocorrido. Não apague arquivos às cegas porque o malware geralmente fica no banco de dados ou em transients de WordPress. Você pode rodar nosso scanner forense gratuito em 👉 https://nexaguards.com/#escaner para identificar o código injetado, ou fale conosco em https://nexaguards.com'
  ],
  SCANNER_FREE: [
    'Olá {NAME}! Sim, o scanner remoto de diagnóstico é 100% gratuito e não precisa instalar nada no seu servidor. Analisa listas negras do Google e códigos maliciosos em 15 segundos em 👉 https://nexaguards.com/#escaner'
  ],
  PRICING: [
    'Olá {NAME}! O diagnóstico inicial é 100% gratuito em https://nexaguards.com. Para desinfecção completa com remoção de listas negras e garantia de 30 dias, temos planos acessíveis. Veja os detalhes em 👉 https://nexaguards.com'
  ],
  GRATITUDE: [
    'Muito obrigado {NAME}! Fico feliz em ajudar a comunidade. Se precisar auditar a segurança do seu site, o scanner gratuito está disponível em 👉 https://nexaguards.com. Abraço!'
  ],
  GENERAL: [
    'Olá {NAME}, obrigado pelo comentário! Se precisar verificar a segurança do seu WordPress, conte com nossas ferramentas gratuitas em 👉 https://nexaguards.com'
  ]
};

/**
 * Analiza un comentario y genera una respuesta lógica y personalizada en el idioma del usuario
 * @param {string} commentText
 * @param {string} authorName
 * @param {string} [forceLang=null]
 * @returns {{ intent: string, intentName: string, lang: string, firstName: string, replyText: string }}
 */
function generateContextualReply(commentText = '', authorName = '', forceLang = null) {
  const cleanText = (commentText || '').toLowerCase().trim();
  const detectedLang = forceLang || detectLanguage(commentText);
  
  // Extraer el primer nombre para sonar 100% natural y humano
  let firstName = (authorName || 'amigo').trim().split(' ')[0];
  if (firstName.length < 2 || firstName.toLowerCase().includes('facebook') || firstName.toLowerCase().includes('user')) {
    firstName = detectedLang === 'en' ? 'friend' : (detectedLang === 'pt' ? 'amigo' : 'amigo');
  }

  // Detectar intención
  let matchedIntent = RESPONSE_INTENTS.find(intent => {
    if (intent.keywords.length === 0) return false;
    return intent.keywords.some(kw => cleanText.includes(kw));
  });

  if (!matchedIntent) {
    matchedIntent = RESPONSE_INTENTS.find(i => i.id === 'GENERAL');
  }

  let replyTemplate = '';
  if (detectedLang === 'en' && ENGLISH_INTENTS[matchedIntent.id]) {
    const list = ENGLISH_INTENTS[matchedIntent.id];
    replyTemplate = list[Math.floor(Math.random() * list.length)];
  } else if (detectedLang === 'pt' && PORTUGUESE_INTENTS[matchedIntent.id]) {
    const list = PORTUGUESE_INTENTS[matchedIntent.id];
    replyTemplate = list[Math.floor(Math.random() * list.length)];
  } else {
    // Español (default)
    const list = matchedIntent.templates;
    replyTemplate = list[Math.floor(Math.random() * list.length)];
  }

  const resolvedSpintax = parseSpintax(replyTemplate);
  const replyText = resolvedSpintax.replace(/{NAME}/g, firstName);

  return {
    intent: matchedIntent.id,
    intentName: matchedIntent.name,
    lang: detectedLang,
    langName: getLanguageName(detectedLang),
    firstName,
    replyText
  };
}

/**
 * Escanea un post específico en Facebook y responde a comentarios nuevos
 * @param {Object} options
 * @param {string} options.postUrl - URL directa del post o del grupo
 * @param {Function} [options.onLog] - Callback de registro
 * @param {boolean} [options.simulateTyping=true] - Simular mecanografía humana
 * @returns {Promise<{ repliedCount: number, replies: Array }>}
 */
async function checkAndReplyToPostComments({ postUrl, onLog = console.log, simulateTyping = true }) {
  if (!postUrl || !postUrl.includes('facebook.com')) {
    return { repliedCount: 0, replies: [] };
  }

  onLog(`🔍 [BOT COMENTARIOS] Revisando comentarios en: ${postUrl}...`);
  const browser = await getOrLaunchBrowser({ headless: false });
  const page = await browser.newPage();

  const repliesDone = [];
  const repliedDb = readJsonSafe(REPLIED_FILE, []);

  try {
    await page.goto(postUrl, { waitUntil: 'networkidle2', timeout: 50000 });
    await sleep(randomDelay(3000, 5000));

    // Scroll suave para cargar la sección de comentarios
    await page.evaluate(() => window.scrollBy(0, 450));
    await sleep(2000);

    // Extraer comentarios visibles
    const detectedComments = await page.evaluate(() => {
      // Buscar elementos de artículos o contenedores de comentarios de Facebook
      const commentArticles = Array.from(document.querySelectorAll('div[role="article"], div[aria-label*="Comentario de"], div[aria-label*="Comment by"]'));
      const list = [];

      commentArticles.forEach((art, idx) => {
        // Extraer nombre del autor
        const authorEl = art.querySelector('a span, a[role="link"] span, h3, h4');
        const authorName = authorEl ? (authorEl.innerText || '').trim() : '';

        // Extraer texto del comentario
        const textEl = art.querySelector('div[dir="auto"], div[lang], span[dir="auto"]');
        const text = textEl ? (textEl.innerText || '').trim() : '';

        // Ignorar si es el propio NexaGuard
        if (authorName.toLowerCase().includes('nexaguard')) return;

        // Botón de Responder
        const buttons = Array.from(art.querySelectorAll('div[role="button"], span'));
        const replyBtn = buttons.find(b => {
          const t = (b.innerText || '').toLowerCase().trim();
          return t === 'responder' || t === 'reply';
        });

        if (authorName && text && text.length > 2) {
          list.push({
            index: idx,
            authorName,
            text,
            hasReplyBtn: !!replyBtn
          });
        }
      });

      return list;
    });

    onLog(`👀 Comentarios encontrados en la publicación: ${detectedComments.length}`);

    // Procesar cada comentario detectado
    for (const comment of detectedComments) {
      // Generar una clave única para no repetir
      const commentKey = `${postUrl}_${comment.authorName}_${comment.text.slice(0, 30)}`.replace(/[^a-zA-Z0-9]/g, '_');

      const alreadyReplied = repliedDb.some(r => r.key === commentKey);
      if (alreadyReplied) {
        continue;
      }

      onLog(`💬 Nuevo comentario detectado de "${comment.authorName}": "${comment.text.slice(0, 50)}..."`);

      // Generar respuesta lógica contextual
      const logicResult = generateContextualReply(comment.text, comment.authorName);
      onLog(`🧠 Intención detectada: [${logicResult.intentName}]. Redactando respuesta...`);

      // Hacer clic en "Responder" para este comentario
      const clicked = await page.evaluate((cIdx) => {
        const commentArticles = Array.from(document.querySelectorAll('div[role="article"], div[aria-label*="Comentario de"], div[aria-label*="Comment by"]'));
        const target = commentArticles[cIdx];
        if (!target) return false;

        const buttons = Array.from(target.querySelectorAll('div[role="button"], span'));
        const replyBtn = buttons.find(b => {
          const t = (b.innerText || '').toLowerCase().trim();
          return t === 'responder' || t === 'reply';
        });

        if (replyBtn) {
          replyBtn.click();
          return true;
        }
        return false;
      }, comment.index);

      if (!clicked) {
        onLog(`⚠️ No se pudo presionar el botón de Responder para "${comment.authorName}".`);
        continue;
      }

      await sleep(randomDelay(1500, 3000));

      // Localizar el cuadro de texto de respuesta que se acaba de abrir
      const editorSelector = 'div[role="textbox"][contenteditable="true"]';
      await page.waitForSelector(editorSelector, { timeout: 8000 });
      const editors = await page.$$(editorSelector);
      const activeEditor = editors[editors.length - 1]; // El último suele ser el de respuesta

      if (activeEditor) {
        await activeEditor.click();
        await sleep(500);

        if (simulateTyping) {
          onLog(`✍️ Escribiendo respuesta personalizada a ${logicResult.firstName}...`);
          await page.keyboard.type(logicResult.replyText, { delay: randomDelay(18, 35) });
        } else {
          await page.keyboard.type(logicResult.replyText);
        }

        await sleep(randomDelay(1000, 2000));
        await page.keyboard.press('Enter');
        onLog(`🚀 ¡Respuesta publicada exitosamente a ${logicResult.firstName}!`);
        await sleep(randomDelay(3000, 5000));

        // Registrar en base de datos local
        const record = {
          id: `reply-${Date.now()}`,
          key: commentKey,
          postUrl,
          authorName: comment.authorName,
          commentText: comment.text,
          intent: logicResult.intent,
          replyText: logicResult.replyText,
          timestamp: new Date().toISOString()
        };

        repliedDb.unshift(record);
        writeJsonSafe(REPLIED_FILE, repliedDb.slice(0, 500));
        repliesDone.push(record);
      }
    }

  } catch (err) {
    onLog(`⚠️ Error inspeccionando comentarios: ${err.message}`);
  } finally {
    try {
      await page.close();
    } catch (e) {}
  }

  return {
    repliedCount: repliesDone.length,
    replies: repliesDone
  };
}

/**
 * Escanea y responde automáticamente a comentarios en Instagram
 * @param {Object} options
 * @param {string} [options.postUrl] - URL del post o home de Instagram
 * @param {Function} [options.onLog]
 */
async function checkAndReplyToInstagramComments({ postUrl = 'https://www.instagram.com/', onLog = console.log }) {
  onLog(`📸 [INSTAGRAM BOT] Inspeccionando comentarios en: ${postUrl}...`);
  const browser = await getOrLaunchBrowser({ headless: false });
  const page = await browser.newPage();

  const repliesDone = [];
  const repliedDb = readJsonSafe(REPLIED_FILE, []);

  try {
    await page.setViewport({ width: 1280, height: 850 });
    await page.goto(postUrl, { waitUntil: 'networkidle2', timeout: 50000 });
    await sleep(randomDelay(3000, 5000));

    // Si estamos en el home o perfil, buscar el último post publicado
    if (!postUrl.includes('/p/')) {
      const firstPostHandle = await page.$('article a[href*="/p/"], a[href*="/p/"]');
      if (firstPostHandle) {
        onLog('🔍 Abriendo última publicación del feed de Instagram...');
        await firstPostHandle.click();
        await sleep(randomDelay(3000, 5000));
      }
    }

    // Extraer comentarios visibles en Instagram
    const detectedComments = await page.evaluate(() => {
      const list = [];
      const commentRows = Array.from(document.querySelectorAll('ul > div > li, ul > li, div[role="button"] + div, div.x9f619 div[dir="auto"]'));

      commentRows.forEach((row, idx) => {
        const userEl = row.querySelector('h2 a, h3 a, a[role="link"]');
        const username = userEl ? (userEl.innerText || '').trim() : '';

        const textEl = row.querySelector('span[dir="auto"], span, div[dir="auto"]');
        const text = textEl ? (textEl.innerText || '').trim() : '';

        if (!username || username.toLowerCase().includes('nexaguard') || !text || text.length < 3) return;

        list.push({
          index: idx,
          username,
          text
        });
      });

      return list.slice(0, 10);
    });

    onLog(`👀 Comentarios detectados en Instagram: ${detectedComments.length}`);

    for (const comment of detectedComments) {
      const commentKey = `ig_${postUrl}_${comment.username}_${comment.text.slice(0, 25)}`.replace(/[^a-zA-Z0-9]/g, '_');
      const alreadyReplied = repliedDb.some(r => r.key === commentKey);
      if (alreadyReplied) continue;

      onLog(`💬 Nuevo comentario en Instagram de @${comment.username}: "${comment.text.slice(0, 45)}..."`);

      const logicResult = generateContextualReply(comment.text, comment.username);
      const instagramFormattedReply = `@${comment.username} ${logicResult.replyText}`;

      onLog(`🧠 [${logicResult.langName}] Respuesta generada con invitación a nexaguards.com...`);

      const textareaSelector = 'textarea[aria-label*="comentario"], textarea[aria-label*="comment"], form textarea';
      const commentBox = await page.$(textareaSelector);

      if (commentBox) {
        await commentBox.click();
        await sleep(500);
        await page.keyboard.type(instagramFormattedReply, { delay: randomDelay(15, 30) });
        await sleep(randomDelay(1000, 2000));

        await page.keyboard.press('Enter');

        await page.evaluate(() => {
          const postBtn = Array.from(document.querySelectorAll('div[role="button"], button')).find(b => {
            const t = (b.innerText || '').toLowerCase().trim();
            return t === 'publicar' || t === 'post';
          });
          if (postBtn) postBtn.click();
        });

        await sleep(randomDelay(4000, 6000));
        onLog(`🚀 ¡Respuesta publicada exitosamente en Instagram a @${comment.username}!`);

        const record = {
          id: `reply-ig-${Date.now()}`,
          platform: 'instagram',
          key: commentKey,
          postUrl: page.url(),
          authorName: `@${comment.username}`,
          commentText: comment.text,
          intent: logicResult.intent,
          lang: logicResult.lang,
          replyText: instagramFormattedReply,
          timestamp: new Date().toISOString()
        };

        repliedDb.unshift(record);
        writeJsonSafe(REPLIED_FILE, repliedDb.slice(0, 500));
        repliesDone.push(record);
      } else {
        onLog('⚠️ No se encontró la caja de comentarios de Instagram.');
      }
    }

  } catch (err) {
    onLog(`⚠️ Error en comentarios de Instagram: ${err.message}`);
  } finally {
    try {
      await page.close();
    } catch (e) {}
  }

  return {
    repliedCount: repliesDone.length,
    replies: repliesDone
  };
}

/**
 * Escanea todas las publicaciones activas (Facebook e Instagram) y responde automáticamente
 * @param {Function} [onLog]
 * @returns {Promise<{ totalScanned: number, totalReplied: number }>}
 */
async function scanAllActivePostsAndReply(onLog = console.log) {
  const posts = readJsonSafe(path.join(DATA_DIR, 'posts.json'), []);
  const history = readJsonSafe(path.join(DATA_DIR, 'history.json'), []);

  // Recopilar URLs de Facebook
  const urlsToCheck = new Set();
  posts.forEach(p => {
    if (p.postUrl && p.postUrl.includes('facebook.com') && !p.postUrl.endsWith('/groups') && !p.postUrl.endsWith('/groups/')) {
      urlsToCheck.add(p.postUrl);
    }
  });

  history.forEach(h => {
    if (h.postUrl && h.postUrl.includes('facebook.com')) {
      urlsToCheck.add(h.postUrl);
    }
  });

  const urlList = Array.from(urlsToCheck).slice(0, 8);
  onLog(`📡 [BOT COMENTARIOS] Iniciando ronda de escaneo en ${urlList.length} publicaciones de Facebook e Instagram...`);

  let totalReplied = 0;
  for (const url of urlList) {
    const res = await checkAndReplyToPostComments({ postUrl: url, onLog });
    totalReplied += res.repliedCount;
    await sleep(randomDelay(3000, 6000));
  }

  // Escanear también Instagram
  try {
    const igRes = await checkAndReplyToInstagramComments({ onLog });
    totalReplied += igRes.repliedCount;
  } catch (eIg) {
    onLog(`⚠️ Error escaneando Instagram: ${eIg.message}`);
  }

  onLog(`🏁 [BOT COMENTARIOS] Ronda finalizada en Meta (FB + IG). Nuevas respuestas enviadas: ${totalReplied}`);
  return {
    totalScanned: urlList.length + 1,
    totalReplied
  };
}

module.exports = {
  RESPONSE_INTENTS,
  generateContextualReply,
  checkAndReplyToPostComments,
  checkAndReplyToInstagramComments,
  scanAllActivePostsAndReply
};
