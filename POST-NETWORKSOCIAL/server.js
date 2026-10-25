/**
 * NexaGuard Social AutoPoster Desktop Server
 * Servidor local de escritorio y API de automatización para Facebook Groups e Instagram.
 */

const fs = require('fs');
const path = require('path');
const http = require('http');
const express = require('express');
const multer = require('multer');
const { exec } = require('child_process');

const { findChromePath, openInteractiveSession, checkLoginStatus, closeInteractiveWindow } = require('./engine/browser');
const { parseSpintax, countSpintaxVariations } = require('./engine/spintax');
const { TEMPLATES } = require('./engine/templates');
const { postToFacebookGroup } = require('./engine/facebook-poster');
const { postToInstagram } = require('./engine/instagram-poster');
const { detectUserFacebookGroups } = require('./engine/group-detector');
const { COPYWRITING_FRAMEWORKS, generatePersuasiveCopy } = require('./engine/ai-copywriter');
const { isWithinOptimalHours, getSmartInterval, assessComplianceRisk, OPTIMAL_HOURS } = require('./engine/scheduler');
const { autopilotInstance } = require('./engine/bot-autopilot');
const { BANNER_PRESETS, generateMarketingBanner, generateMarketingVideo } = require('./engine/image-generator');
const { detectLanguage, getLanguageName } = require('./engine/language-detector');
const { generateContextualReply, checkAndReplyToInstagramComments, scanAllActivePostsAndReply } = require('./engine/comment-responder');
const { scanUrlNiche } = require('./engine/url-niche-scanner');
const {
  leaveFacebookGroup,
  blacklistGroup,
  whitelistGroup,
  auditGroupPostStatus,
  auditAllRecentPosts
} = require('./engine/group-moderator');
const {
  getGeminiApiKey,
  testGeminiConnection,
  generateWithGemini,
  generateGeminiPost,
  generateGeminiCreativeConcept
} = require('./engine/gemini-client');

const PORT = process.env.PORT || 4242;
const app = express();
const server = http.createServer(app);

app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));
app.use('/screenshots', express.static(path.join(__dirname, 'screenshots')));

// Configuración de Multer para imágenes de post
const uploadStorage = multer.diskStorage({
  destination: (req, file, cb) => {
    const dir = path.join(__dirname, 'public', 'assets', 'uploads');
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    cb(null, dir);
  },
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname) || '.png';
    cb(null, `post_${Date.now()}${ext}`);
  }
});
const upload = multer({ storage: uploadStorage });

// Helper de persistencia de datos JSON
function readJson(file, def = []) {
  const filePath = path.join(__dirname, 'data', file);
  try {
    if (!fs.existsSync(filePath)) {
      fs.writeFileSync(filePath, JSON.stringify(def, null, 2), 'utf8');
      return def;
    }
    return JSON.parse(fs.readFileSync(filePath, 'utf8'));
  } catch (e) {
    return def;
  }
}

function writeJson(file, data) {
  const filePath = path.join(__dirname, 'data', file);
  fs.writeFileSync(filePath, JSON.stringify(data, null, 2), 'utf8');
}

// Estado de la campaña en memoria
let activeCampaign = {
  running: false,
  shouldStop: false,
  progress: { current: 0, total: 0, success: 0, failed: 0 },
  currentGroup: null,
  nextPostInSeconds: 0
};

// Clientes SSE (Server-Sent Events) para logs en vivo
let logClients = [];
function broadcastLog(data) {
  const payload = `data: ${JSON.stringify(data)}\n\n`;
  logClients.forEach(c => c.res.write(payload));
}

// Ruta SSE para streaming de logs a la interfaz
app.get('/api/campaign/logs', (req, res) => {
  res.writeHead(200, {
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache',
    'Connection': 'keep-alive'
  });
  res.write(': connected\n\n');

  const client = { id: Date.now(), res };
  logClients.push(client);

  req.on('close', () => {
    logClients = logClients.filter(c => c.id !== client.id);
  });
});

// 1. Estado del Sistema
app.get('/api/status', async (req, res) => {
  const settings = readJson('settings.json', {});
  const chromePath = findChromePath(settings.chromePath);
  const loginInfo = await checkLoginStatus();

  res.json({
    ok: true,
    chromeFound: !!chromePath,
    chromePath: chromePath || 'No detectado',
    profileExists: loginInfo.profileExists,
    facebookLoggedIn: !!loginInfo.facebookLoggedIn,
    facebookUserId: loginInfo.facebookUserId || null,
    instagramLoggedIn: !!loginInfo.instagramLoggedIn,
    activeWindow: !!loginInfo.activeWindow,
    statusText: loginInfo.statusText,
    userDataDir: loginInfo.userDataDir,
    activeCampaign: {
      running: activeCampaign.running,
      progress: activeCampaign.progress,
      currentGroup: activeCampaign.currentGroup,
      nextPostInSeconds: activeCampaign.nextPostInSeconds
    }
  });
});

// 1.1 Verificación precisa de sesión y estado en vivo
app.get('/api/session/verify', async (req, res) => {
  try {
    const status = await checkLoginStatus();
    res.json({ ok: true, ...status });
  } catch (e) {
    res.status(500).json({ ok: false, error: e.message });
  }
});

// 1.2 Cerrar ventana de inicio de sesión
app.post('/api/session/window/close', async (req, res) => {
  try {
    const result = await closeInteractiveWindow();
    res.json({ ok: true, ...result });
  } catch (e) {
    res.status(500).json({ ok: false, error: e.message });
  }
});

// 1.2.1 Abrir carpeta del bot en el Explorador de Windows
app.post('/api/system/open-folder', (req, res) => {
  try {
    const fileToSelect = path.join(__dirname, 'ABRIR-SESION-FACEBOOK.bat');
    exec(`explorer.exe /select,"${fileToSelect}"`);
    res.json({ ok: true });
  } catch (e) {
    res.status(500).json({ ok: false, error: e.message });
  }
});

// 1.3 Configuración General Anti-Ban
app.get('/api/settings', (req, res) => {
  const settings = readJson('settings.json', {
    minDelaySeconds: 45,
    maxDelaySeconds: 120,
    dailyLimit: 25,
    simulateTyping: true,
    headless: false,
    takeScreenshots: true,
    defaultTemplate: 'wp-hackeado',
    chromePath: 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe'
  });
  res.json({ ok: true, settings });
});

app.post('/api/settings', (req, res) => {
  const current = readJson('settings.json', {});
  const updated = { ...current, ...req.body };
  writeJson('settings.json', updated);
  res.json({ ok: true, settings: updated });
});

// 2. Abrir Navegador Interactivo para Iniciar Sesión (FB / IG)
app.post('/api/browser/open', async (req, res) => {
  const platform = req.body.platform || 'facebook';
  const target = platform === 'instagram' ? 'https://www.instagram.com/accounts/login/' : 'https://www.facebook.com/login.php';
  try {
    const result = await openInteractiveSession(target, platform);
    res.json({
      ok: true,
      platform,
      url: target,
      message: `Ventana de ${platform.toUpperCase()} abierta en tu pantalla. Ingresa tus credenciales para vincular la cuenta automáticamente.`,
      ...result
    });
  } catch (e) {
    res.status(500).json({ ok: false, error: e.message });
  }
});

// 3. Gestión de Grupos
app.get('/api/groups', (req, res) => {
  const groups = readJson('groups.json', []);
  res.json({ ok: true, groups });
});

app.post('/api/groups', (req, res) => {
  const groups = readJson('groups.json', []);
  const { name, url, category } = req.body;
  if (!url) return res.status(400).json({ ok: false, error: 'La URL del grupo es obligatoria.' });

  const newGroup = {
    id: `grp-${Date.now()}`,
    name: name || 'Grupo sin nombre',
    url: url.trim(),
    category: category || 'General',
    enabled: true,
    lastPosted: null,
    postCount: 0
  };

  groups.unshift(newGroup);
  writeJson('groups.json', groups);
  res.json({ ok: true, group: newGroup });
});

app.put('/api/groups/:id', (req, res) => {
  let groups = readJson('groups.json', []);
  const idx = groups.findIndex(g => g.id === req.params.id);
  if (idx === -1) return res.status(404).json({ ok: false, error: 'Grupo no encontrado.' });

  groups[idx] = { ...groups[idx], ...req.body };
  writeJson('groups.json', groups);
  res.json({ ok: true, group: groups[idx] });
});

app.delete('/api/groups/:id', (req, res) => {
  let groups = readJson('groups.json', []);
  groups = groups.filter(g => g.id !== req.params.id);
  writeJson('groups.json', groups);
  res.json({ ok: true });
});

// 3.1 Detección automática de grupos vinculados en el perfil de Facebook
app.post('/api/groups/detect', async (req, res) => {
  try {
    broadcastLog({ type: 'step', msg: '🔍 [SINCRONIZACIÓN] Iniciando detección automática de grupos vinculados en Facebook...' });
    const detected = await detectUserFacebookGroups((msg) => broadcastLog({ type: 'log', msg }));
    
    // Unir con los existentes sin duplicar URL
    const existing = readJson('groups.json', []);
    const existingUrls = new Set(existing.map(g => (g.url || '').toLowerCase().replace(/\/+$/, '')));
    let addedCount = 0;

    for (const d of detected) {
      const clean = (d.url || '').toLowerCase().replace(/\/+$/, '');
      if (!existingUrls.has(clean)) {
        existingUrls.add(clean);
        existing.push(d);
        addedCount++;
      }
    }

    writeJson('groups.json', existing);
    broadcastLog({ type: 'done', msg: `🎉 ¡Sincronización completada! Se detectaron ${detected.length} grupos (${addedCount} nuevos agregados a tu lista).` });
    res.json({ ok: true, detectedCount: detected.length, addedCount, groups: existing });
  } catch (err) {
    broadcastLog({ type: 'error', msg: `❌ Error al detectar grupos: ${err.message}` });
    res.status(500).json({ ok: false, error: err.message });
  }
});

// 3.2 Selección múltiple / masiva de grupos
app.post('/api/groups/batch-toggle', (req, res) => {
  const { enabled, ids, category } = req.body;
  let groups = readJson('groups.json', []);
  groups = groups.map(g => {
    if (ids && ids.length > 0) {
      if (ids.includes(g.id)) return { ...g, enabled: !!enabled };
    } else if (category && category !== 'all') {
      if (g.category === category) return { ...g, enabled: !!enabled };
    } else {
      return { ...g, enabled: !!enabled };
    }
    return g;
  });
  writeJson('groups.json', groups);
  res.json({ ok: true, groups });
});

// 3.3 Auditoría de Moderación, Lista Blanca y Lista Negra
app.get('/api/moderation/summary', (req, res) => {
  const groups = readJson('groups.json', []);
  const total = groups.length;
  const whitelisted = groups.filter(g => g.whitelisted).length;
  const blacklisted = groups.filter(g => g.blacklisted).length;
  const active = groups.filter(g => g.enabled && !g.blacklisted).length;
  res.json({ ok: true, summary: { total, whitelisted, blacklisted, active } });
});

app.post('/api/moderation/audit', async (req, res) => {
  try {
    broadcastLog({ type: 'step', msg: '🛡️ [AUDITORÍA] Iniciando inspección de moderación en publicaciones recientes...' });
    const result = await auditAllRecentPosts({ onLog: (msg) => broadcastLog({ type: 'log', msg }) });
    broadcastLog({ type: 'done', msg: `🎉 Auditoría completada. Grupos en lista blanca: +${result.whitelisted} | Grupos en lista negra (abandonados): +${result.blacklisted}` });
    const groups = readJson('groups.json', []);
    res.json({ ok: true, result, groups });
  } catch (err) {
    broadcastLog({ type: 'error', msg: `❌ Error en auditoría de moderación: ${err.message}` });
    res.status(500).json({ ok: false, error: err.message });
  }
});

app.post('/api/groups/:id/blacklist', async (req, res) => {
  try {
    const groups = readJson('groups.json', []);
    const group = groups.find(g => g.id === req.params.id);
    if (!group) return res.status(404).json({ ok: false, error: 'Grupo no encontrado.' });

    const { reason, leaveFacebook = true } = req.body;
    broadcastLog({ type: 'step', msg: `🚫 [LISTA NEGRA] Pasando grupo "${group.name}" a lista negra...` });
    
    const updated = await blacklistGroup({
      groupId: group.id,
      groupUrl: group.url,
      groupName: group.name,
      reason: reason || 'Acción manual desde el panel de control',
      leaveFacebook: !!leaveFacebook,
      onLog: (msg) => broadcastLog({ type: 'log', msg })
    });

    const refreshed = readJson('groups.json', []);
    res.json({ ok: true, group: updated, groups: refreshed });
  } catch (err) {
    res.status(500).json({ ok: false, error: err.message });
  }
});

app.post('/api/groups/:id/whitelist', async (req, res) => {
  try {
    const groups = readJson('groups.json', []);
    const group = groups.find(g => g.id === req.params.id);
    if (!group) return res.status(404).json({ ok: false, error: 'Grupo no encontrado.' });

    broadcastLog({ type: 'step', msg: `⭐ [LISTA BLANCA] Verificando grupo "${group.name}" en lista blanca...` });
    const updated = await whitelistGroup({
      groupId: group.id,
      groupUrl: group.url,
      groupName: group.name,
      onLog: (msg) => broadcastLog({ type: 'log', msg })
    });

    const refreshed = readJson('groups.json', []);
    res.json({ ok: true, group: updated, groups: refreshed });
  } catch (err) {
    res.status(500).json({ ok: false, error: err.message });
  }
});

app.post('/api/groups/:id/leave', async (req, res) => {
  try {
    const groups = readJson('groups.json', []);
    const group = groups.find(g => g.id === req.params.id);
    if (!group) return res.status(404).json({ ok: false, error: 'Grupo no encontrado.' });

    broadcastLog({ type: 'step', msg: `🚪 [ABANDONO MANUAL] Retirando tu cuenta de Facebook del grupo "${group.name}"...` });
    const ok = await leaveFacebookGroup({
      groupUrl: group.url,
      onLog: (msg) => broadcastLog({ type: 'log', msg })
    });

    if (ok) {
      group.isMember = false;
      group.enabled = false;
      writeJson('groups.json', groups);
    }

    res.json({ ok, group });
  } catch (err) {
    res.status(500).json({ ok: false, error: err.message });
  }
});

// 4. Plantillas y Spintax
app.get('/api/templates', (req, res) => {
  res.json({ ok: true, templates: TEMPLATES });
});

// 4.1 Copywriting Persuasivo con IA & Frameworks
app.get('/api/copywriting/frameworks', (req, res) => {
  res.json({ ok: true, frameworks: COPYWRITING_FRAMEWORKS });
});

app.post('/api/copywriting/generate', (req, res) => {
  const { frameworkId } = req.body;
  const result = generatePersuasiveCopy(frameworkId);
  res.json({ ok: true, ...result });
});

// 4.2 Evaluación de Cumplimiento de Políticas de Meta
app.get('/api/compliance/status', (req, res) => {
  const history = readJson('history.json', []);
  const today = new Date().toISOString().slice(0, 10);
  const postsToday = history.filter(h => (h.timestamp || '').slice(0, 10) === today && h.ok).length;

  const assessment = assessComplianceRisk({
    totalGroups: 0,
    delayMode: 'safe',
    dailyCount: postsToday
  });

  res.json({
    ok: true,
    postsToday,
    optimalHours: OPTIMAL_HOURS,
    ...assessment
  });
});

app.post('/api/spintax/preview', (req, res) => {
  const { text } = req.body;
  const sample = parseSpintax(text || '');
  const variations = countSpintaxVariations(text || '');
  res.json({ ok: true, sample, variations });
});

// 5. Subida de Archivos Multimedia (Imágenes y Videos)
app.post('/api/upload-media', upload.single('file'), (req, res) => {
  if (!req.file) return res.status(400).json({ ok: false, error: 'No se subió ningún archivo.' });
  const isVideo = req.file.mimetype.startsWith('video/') || /\.(mp4|mov|webm)$/i.test(req.file.originalname);
  res.json({
    ok: true,
    path: req.file.path,
    url: `/assets/uploads/${req.file.filename}`,
    filename: req.file.filename,
    type: isVideo ? 'video' : 'image'
  });
});

app.post('/api/upload-image', upload.single('image'), (req, res) => {
  if (!req.file) return res.status(400).json({ ok: false, error: 'No se subió ningún archivo.' });
  const isVideo = req.file.mimetype.startsWith('video/') || /\.(mp4|mov|webm)$/i.test(req.file.originalname);
  res.json({
    ok: true,
    path: req.file.path,
    url: `/assets/uploads/${req.file.filename}`,
    filename: req.file.filename,
    type: isVideo ? 'video' : 'image'
  });
});

// 5.1 Generador Automático de Banners con IA (1200x630 y 1080x1080)
app.get('/api/creative/presets', (req, res) => {
  res.json({ ok: true, presets: BANNER_PRESETS });
});

app.post('/api/creative/generate', async (req, res) => {
  const { presetId, format, customData, customPrompt } = req.body;
  try {
    const result = await generateMarketingBanner({ presetId, format, customData, customPrompt });
    res.json({ ok: true, ...result });
  } catch (err) {
    res.status(500).json({ ok: false, error: err.message });
  }
});

app.post('/api/creative/generate-video', async (req, res) => {
  const { presetId, customData, durationSeconds } = req.body;
  try {
    const result = await generateMarketingVideo({ presetId, customData, durationSeconds: durationSeconds || 5 });
    res.json({ ok: true, ...result });
  } catch (err) {
    res.status(500).json({ ok: false, error: err.message });
  }
});

// 5.2 Google Gemini AI - Generación de Copys Persuasivos y Creativos
app.get('/api/gemini/status', (req, res) => {
  const key = getGeminiApiKey();
  res.json({
    ok: true,
    connected: Boolean(key && key.length > 10),
    maskedKey: key ? `${key.slice(0, 6)}...${key.slice(-4)}` : ''
  });
});

app.post('/api/gemini/test', async (req, res) => {
  try {
    const { apiKey } = req.body;
    const result = await testGeminiConnection(apiKey);
    if (apiKey && apiKey.trim()) {
      const current = readJson('settings.json', {});
      current.geminiApiKey = apiKey.trim();
      if (result.model) current.geminiModel = result.model;
      if (result.apiVersion) current.geminiApiVersion = result.apiVersion;
      writeJson('settings.json', current);
    }
    res.json(result);
  } catch (err) {
    res.status(400).json({ ok: false, error: err.message });
  }
});

app.post('/api/gemini/generate-post', async (req, res) => {
  try {
    const { topic, brandName, targetUrl, language } = req.body;
    if (!topic || !topic.trim()) {
      return res.status(400).json({ ok: false, error: 'Por favor indica el tema o nicho para generar el copy.' });
    }
    const copy = await generateGeminiPost({
      topic: topic.trim(),
      brandName: brandName || 'NexaGuard',
      targetUrl: targetUrl || 'https://nexaguards.com',
      language: language || 'es'
    });
    res.json({ ok: true, copy });
  } catch (err) {
    res.status(500).json({ ok: false, error: err.message });
  }
});

app.post('/api/gemini/generate-creative', async (req, res) => {
  try {
    const { topic, brandName, format, type, durationSeconds } = req.body;
    if (!topic || !topic.trim()) {
      return res.status(400).json({ ok: false, error: 'Por favor indica el tema o nicho para el diseño.' });
    }
    const concept = await generateGeminiCreativeConcept({
      topic: topic.trim(),
      brandName: brandName || 'NexaGuard'
    });

    let result;
    if (type === 'video') {
      result = await generateMarketingVideo({
        presetId: 'custom',
        customData: concept,
        durationSeconds: durationSeconds || 5
      });
    } else {
      result = await generateMarketingBanner({
        presetId: 'custom',
        format: format || 'facebook_feed',
        customData: concept
      });
    }

    res.json({ ok: true, concept, ...result });
  } catch (err) {
    res.status(500).json({ ok: false, error: err.message });
  }
});

// ==========================================
// 6. GESTIÓN DE POSTS CREADOS (CRUD COMPLETO)
// ==========================================
const DEFAULT_POSTS = [
  {
    id: "post-wp-01",
    title: "Alerta Pantalla Roja de Google Safe Browsing",
    category: "WordPress",
    status: "ready",
    groupName: "WordPress en Español (Oficial & Comunidad)",
    targetGroupIds: ["grp-1", "grp-4"],
    postUrl: "https://www.facebook.com/groups/wordpresseh",
    mediaUrl: "/assets/generated/banner_pantalla_roja.png",
    mediaType: "image",
    message: "🛑 ¿Tu sitio WordPress o el de un cliente amaneció con la pantalla roja de 'Sitio engañoso adelante'?\n\nNo entres en pánico ni borres archivos a ciegas. El 89% de estas advertencias se deben a inyecciones de JavaScript ofuscado en wp-includes/template-loader.php o redirecciones condicionales a bots.\n\n🛡️ Protocolo forense de rescate:\n1. Revisa las tareas cron en WordPress (wp cron event list).\n2. Compara el core con los hashes oficiales de WordPress.org (wp core verify-checksums).\n3. Limpia la base de datos de transients y opciones sospechosas en wp_options.\n\nSi necesitas auditar tu dominio en 15 segundos, hemos liberado nuestro escáner forense gratuito en 👉 https://nexaguards.com\n\n#WordPress #Ciberseguridad #Malware #GoogleSafeBrowsing #Webmasters",
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  },
  {
    id: "post-seo-02",
    title: "Caso de Estudio Forense: Japanese Keyword Hack",
    category: "SEO",
    status: "published",
    groupName: "SEO & Posicionamiento Web en Google",
    targetGroupIds: ["grp-5"],
    postUrl: "https://www.facebook.com/groups/seoposicionamiento",
    mediaUrl: "/assets/generated/banner_japanese_seo.png",
    mediaType: "image",
    message: "🧠 CASO FORENSE REAL: Cómo desinfectamos un e-commerce atacado por el 'Japanese Keyword Hack' con más de 14,000 URLs spam indexadas en Google.\n\nEl ataque utilizaba una técnica de cloaking HTTP: si entraba un usuario normal, veía la tienda limpia. Pero si entraba Googlebot con User-Agent de rastreo, el servidor inyectaba miles de títulos en caracteres asiáticos vendiendo réplicas.\n\n🔧 Solución aplicada:\n✓ Desinfección del archivo .htaccess malicioso y rules de rewrite ocultas.\n✓ Purga de sitemaps dinámicos zombies y emisión masiva de cabeceras HTTP 410 Gone para que Google desindexe en tiempo récord.\n✓ Activación de firewall perimetral NexaGuard Core Sentinel.\n\nGuía completa y auditoría gratuita en vivo en 👉 https://nexaguards.com\n\n#SEO #WordPress #WooCommerce #JapaneseKeywordHack #Ciberseguridad",
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  },
  {
    id: "post-woo-03",
    title: "Blindaje WooCommerce contra Skimmers Magecart",
    category: "WooCommerce",
    status: "ready",
    groupName: "Comunidad WooCommerce & WordPress España y Latam",
    targetGroupIds: ["grp-2", "grp-3"],
    postUrl: "https://www.facebook.com/groups/comunidadwoocommerce",
    mediaUrl: "/assets/generated/banner_woocommerce.png",
    mediaType: "image",
    message: "💳 ATENCIÓN TIENDAS ONLINE: Si gestionas un WooCommerce con pasarelas de pago (Stripe, PayPal, Redsys), verifica hoy mismo tus scripts de checkout.\n\nHemos detectado una oleada de ataques silenciosos tipo 'Magecart' que inyectan lectores de tarjetas en el DOM sin alterar el funcionamiento de la compra. El cliente paga normal, pero sus datos se filtran a un servidor en el extranjero.\n\n🔒 ¿Cómo protegerte hoy mismo?\n1. Bloquea la edición de archivos desde el dashboard (DISALLOW_FILE_EDIT).\n2. Implementa Content Security Policy (CSP) estricto en los scripts de pago.\n3. Ejecuta una auditoría de integridad periódica.\n\nPuedes probar nuestro escáner en vivo y sin registro en 👉 https://nexaguards.com/#escaner\n\n#WooCommerce #ECommerce #SeguridadWeb #Magecart #NexaGuard",
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  }
];

app.get('/api/posts', (req, res) => {
  let posts = readJson('posts.json', DEFAULT_POSTS);
  if (!posts || posts.length === 0) {
    posts = DEFAULT_POSTS;
    writeJson('posts.json', posts);
  }
  res.json({ ok: true, posts });
});

app.post('/api/posts', (req, res) => {
  const { title, message, category, mediaUrl, mediaType, targetGroupIds, groupName, postUrl } = req.body;
  if (!message || !message.trim()) {
    return res.status(400).json({ ok: false, error: 'El mensaje del post es requerido.' });
  }

  const posts = readJson('posts.json', []);
  const newPost = {
    id: `post-${Date.now()}`,
    title: (title || 'Publicación NexaGuard').trim(),
    message: message.trim(),
    category: category || 'General',
    status: 'ready',
    groupName: groupName || 'Grupo de Facebook',
    targetGroupIds: Array.isArray(targetGroupIds) ? targetGroupIds : [],
    postUrl: postUrl || 'https://www.facebook.com',
    mediaUrl: mediaUrl || null,
    mediaType: mediaType || (mediaUrl && /\.(mp4|mov|webm)$/i.test(mediaUrl) ? 'video' : 'image'),
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  };

  posts.unshift(newPost);
  writeJson('posts.json', posts);
  res.json({ ok: true, post: newPost });
});

app.put('/api/posts/:id', (req, res) => {
  const { id } = req.params;
  const { title, message, category, mediaUrl, mediaType, targetGroupIds, groupName, postUrl, status } = req.body;
  const posts = readJson('posts.json', []);
  const idx = posts.findIndex(p => p.id === id);

  if (idx === -1) {
    return res.status(404).json({ ok: false, error: 'Post no encontrado.' });
  }

  const current = posts[idx];
  posts[idx] = {
    ...current,
    title: title !== undefined ? title.trim() : current.title,
    message: message !== undefined ? message.trim() : current.message,
    category: category !== undefined ? category : current.category,
    mediaUrl: mediaUrl !== undefined ? mediaUrl : current.mediaUrl,
    mediaType: mediaType !== undefined ? mediaType : current.mediaType,
    targetGroupIds: targetGroupIds !== undefined ? targetGroupIds : current.targetGroupIds,
    groupName: groupName !== undefined ? groupName : current.groupName,
    postUrl: postUrl !== undefined ? postUrl : current.postUrl,
    status: status !== undefined ? status : current.status,
    updatedAt: new Date().toISOString()
  };

  writeJson('posts.json', posts);
  res.json({ ok: true, post: posts[idx] });
});

app.delete('/api/posts/:id', (req, res) => {
  const { id } = req.params;
  let posts = readJson('posts.json', []);
  const initialLength = posts.length;
  posts = posts.filter(p => p.id !== id);

  if (posts.length === initialLength) {
    return res.status(404).json({ ok: false, error: 'Post no encontrado.' });
  }

  writeJson('posts.json', posts);
  res.json({ ok: true, message: 'Post eliminado correctamente.' });
});

app.post('/api/posts/:id/publish', async (req, res) => {
  const { id } = req.params;
  const posts = readJson('posts.json', []);
  const post = posts.find(p => p.id === id);
  if (!post) return res.status(404).json({ ok: false, error: 'Post no encontrado.' });

  const allGroups = readJson('groups.json', []);
  const targetGroup = allGroups.find(g => post.targetGroupIds && post.targetGroupIds.includes(g.id)) || allGroups[0];
  const groupUrl = targetGroup ? targetGroup.url : (post.postUrl || 'https://www.facebook.com');

  const resolvedMessage = parseSpintax(post.message);
  let localImagePath = null;
  if (post.mediaUrl) {
    localImagePath = path.join(__dirname, 'public', post.mediaUrl.replace(/^\//, ''));
  }

  broadcastLog({ type: 'step', msg: `🚀 Publicando post individual "${post.title}" en "${targetGroup ? targetGroup.name : groupUrl}"...` });

  try {
    const postResult = await postToFacebookGroup({
      groupUrl,
      message: resolvedMessage,
      imagePath: localImagePath,
      simulateTyping: true,
      onLog: (msg) => broadcastLog({ type: 'log', msg })
    });

    const finalPostUrl = postResult.postUrl || groupUrl;
    post.status = postResult.ok ? (postResult.pendingApproval ? 'pending_approval' : 'published') : 'failed';
    post.postUrl = finalPostUrl;
    post.updatedAt = new Date().toISOString();
    writeJson('posts.json', posts);

    const history = readJson('history.json', []);
    history.unshift({
      id: `post-hist-${Date.now()}`,
      groupId: targetGroup ? targetGroup.id : null,
      groupName: targetGroup ? targetGroup.name : 'Grupo de Facebook',
      groupUrl,
      postUrl: finalPostUrl,
      ok: postResult.ok,
      timestamp: new Date().toISOString(),
      message: resolvedMessage,
      messagePreview: resolvedMessage.slice(0, 140) + '...',
      imageUrl: post.mediaUrl,
      mediaType: post.mediaType,
      screenshot: postResult.screenshot,
      details: postResult.message
    });
    writeJson('history.json', history.slice(0, 200));

    res.json({ ok: postResult.ok, post, postResult });
  } catch (err) {
    res.status(500).json({ ok: false, error: err.message });
  }
});

// ==========================================
// 6.1 HISTORIAL DE PUBLICACIONES (CON EDICIÓN Y BORRADO)
// ==========================================
app.get('/api/history', (req, res) => {
  const history = readJson('history.json', []);
  res.json({ ok: true, history });
});

app.put('/api/history/:id', (req, res) => {
  const { id } = req.params;
  const { message, postUrl, groupName, details } = req.body;
  const history = readJson('history.json', []);
  const idx = history.findIndex(h => h.id === id);

  if (idx === -1) {
    return res.status(404).json({ ok: false, error: 'Registro de historial no encontrado.' });
  }

  const current = history[idx];
  history[idx] = {
    ...current,
    message: message !== undefined ? message : current.message,
    messagePreview: message !== undefined ? (message.slice(0, 140) + '...') : current.messagePreview,
    postUrl: postUrl !== undefined ? postUrl : current.postUrl,
    groupName: groupName !== undefined ? groupName : current.groupName,
    details: details !== undefined ? details : current.details
  };

  writeJson('history.json', history);
  res.json({ ok: true, item: history[idx] });
});

app.delete('/api/history/:id', (req, res) => {
  const { id } = req.params;
  let history = readJson('history.json', []);
  history = history.filter(h => h.id !== id);
  writeJson('history.json', history);
  res.json({ ok: true, message: 'Publicación eliminada del historial.' });
});

app.delete('/api/history', (req, res) => {
  writeJson('history.json', []);
  res.json({ ok: true, message: 'Historial vaciado por completo.' });
});

// ==========================================
// 6.2 AUTO-RESPUESTA A COMENTARIOS & IDIOMAS
// ==========================================
app.post('/api/comments/test-reply', (req, res) => {
  const { commentText, authorName, forceLang } = req.body;
  if (!commentText || !commentText.trim()) {
    return res.status(400).json({ ok: false, error: 'El texto del comentario es requerido.' });
  }

  const result = generateContextualReply(commentText, authorName, forceLang);
  res.json({ ok: true, ...result });
});

app.get('/api/comments/history', (req, res) => {
  const replied = readJson('replied_comments.json', []);
  res.json({ ok: true, count: replied.length, replies: replied });
});

app.post('/api/comments/scan-now', async (req, res) => {
  broadcastLog({ type: 'step', msg: '🔍 [COMMUNITY MANAGER] Escaneo manual de comentarios iniciado...' });
  try {
    const scanResult = await scanAllActivePostsAndReply((msg) => {
      broadcastLog({ type: 'log', msg });
    });
    res.json({ ok: true, ...scanResult });
  } catch (err) {
    res.status(500).json({ ok: false, error: err.message });
  }
});

app.post('/api/language/detect', (req, res) => {
  const { text } = req.body;
  const lang = detectLanguage(text || '');
  res.json({ ok: true, lang, langName: getLanguageName(lang) });
});

// ==========================================
// 6.3 DETECCIÓN DE NICHO & MARCA POR URL
// ==========================================
app.post('/api/niche/scan-url', async (req, res) => {
  const { url } = req.body;
  if (!url || !url.trim()) {
    return res.status(400).json({ ok: false, error: 'Debes ingresar una URL válida para analizar.' });
  }

  broadcastLog({ type: 'step', msg: `🌐 [IA NICHE SCANNER] Analizando URL: "${url.trim()}"...` });

  try {
    const result = await scanUrlNiche(url.trim());
    broadcastLog({
      type: 'success',
      msg: `✓ Nicho detectado: [${result.nicheName}] | Marca: [${result.brand}] | Idioma: [${result.langName}]`
    });

    // Guardar en settings para que el Piloto Automático y el bot conozcan la marca y nicho activo
    const settings = readJson('settings.json', {});
    settings.activeNicheProfile = {
      url: url.trim(),
      brand: result.brand,
      niche: result.niche,
      nicheName: result.nicheName,
      lang: result.lang,
      painPoints: result.painPoints,
      hashtags: result.hashtags,
      generatedPosts: result.generatedPosts,
      updatedAt: new Date().toISOString()
    };
    writeJson('settings.json', settings);

    res.json(result);
  } catch (err) {
    broadcastLog({ type: 'error', msg: `❌ Error escaneando URL: ${err.message}` });
    res.status(500).json({ ok: false, error: err.message });
  }
});

// 7. Lanzamiento de Campaña de Auto-Posteo en Grupos
app.post('/api/campaign/start', async (req, res) => {
  if (activeCampaign.running) {
    return res.status(400).json({ ok: false, error: 'Ya existe una campaña de auto-publicación en progreso.' });
  }

  const { spintaxText, imagePath, selectedGroupIds, delayMode = 'safe' } = req.body;
  if (!spintaxText || !spintaxText.trim()) {
    return res.status(400).json({ ok: false, error: 'El texto del post no puede estar vacío.' });
  }

  const allGroups = readJson('groups.json', []);
  const targetGroups = allGroups.filter(g => {
    if (selectedGroupIds && selectedGroupIds.length > 0) {
      return selectedGroupIds.includes(g.id);
    }
    return g.enabled;
  });

  if (targetGroups.length === 0) {
    return res.status(400).json({ ok: false, error: 'No hay grupos seleccionados para publicar.' });
  }

  const settings = readJson('settings.json', { minDelaySeconds: 45, maxDelaySeconds: 120 });

  // Iniciar campaña en segundo plano
  activeCampaign.running = true;
  activeCampaign.shouldStop = false;
  activeCampaign.progress = { current: 0, total: targetGroups.length, success: 0, failed: 0 };

  res.json({
    ok: true,
    message: `Campaña iniciada para ${targetGroups.length} grupos. Monitorea los logs en tiempo real.`,
    total: targetGroups.length
  });

  // Proceso asíncrono de publicación
  (async () => {
    broadcastLog({ type: 'start', msg: `🚀 Iniciando campaña para ${targetGroups.length} grupos...` });
    const history = readJson('history.json', []);

    for (let i = 0; i < targetGroups.length; i++) {
      if (activeCampaign.shouldStop) {
        broadcastLog({ type: 'warn', msg: '🛑 Campaña detenida por el usuario.' });
        break;
      }

      const group = targetGroups[i];
      activeCampaign.currentGroup = group.name;
      activeCampaign.progress.current = i + 1;

      broadcastLog({
        type: 'step',
        msg: `[${i + 1}/${targetGroups.length}] Procesando grupo: "${group.name}"`,
        progress: activeCampaign.progress
      });

      // Generar variación de texto Spintax única para este grupo
      const uniqueMessage = parseSpintax(spintaxText);

      // Publicar en Facebook con auto-detección de idioma
      const postResult = await postToFacebookGroup({
        groupUrl: group.url,
        message: uniqueMessage,
        imagePath: imagePath || null,
        simulateTyping: settings.simulateTyping !== false,
        autoTranslateByGroupLanguage: true,
        onLog: (msg) => broadcastLog({ type: 'log', msg })
      });

      // Actualizar contadores y grupo
      if (postResult.ok) {
        activeCampaign.progress.success++;
        group.postCount = (group.postCount || 0) + 1;
        group.lastPosted = new Date().toISOString();
      } else {
        activeCampaign.progress.failed++;
      }

      // Guardar en historial completo
      const postUrlFinal = postResult.postUrl || group.url;
      const mediaRelUrl = imagePath ? (imagePath.includes('public') ? imagePath.replace(/.*public/, '').replace(/\\/g, '/') : `/assets/uploads/${path.basename(imagePath)}`) : null;
      const isVideoMedia = imagePath ? /\.(mp4|mov|webm)$/i.test(imagePath) : false;

      history.unshift({
        id: `post-${Date.now()}`,
        groupId: group.id,
        groupName: group.name,
        groupUrl: group.url,
        postUrl: postUrlFinal,
        ok: postResult.ok,
        timestamp: new Date().toISOString(),
        message: uniqueMessage,
        messagePreview: uniqueMessage.slice(0, 140) + '...',
        imageUrl: mediaRelUrl,
        mediaType: isVideoMedia ? 'video' : 'image',
        screenshot: postResult.screenshot,
        details: postResult.message
      });
      writeJson('history.json', history.slice(0, 200));

      // Si el post fue exitoso, registrarlo también en la biblioteca de posts creados
      if (postResult.ok) {
        try {
          const currentPosts = readJson('posts.json', []);
          currentPosts.unshift({
            id: `post-${Date.now()}`,
            title: `Post en ${group.name.slice(0, 35)}`,
            message: uniqueMessage,
            category: group.category || 'General',
            status: 'published',
            groupName: group.name,
            targetGroupIds: [group.id],
            postUrl: postUrlFinal,
            mediaUrl: mediaRelUrl,
            mediaType: isVideoMedia ? 'video' : 'image',
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString()
          });
          writeJson('posts.json', currentPosts.slice(0, 100));
        } catch (ePosts) {}
      }

      // Actualizar grupos
      const currentAllGroups = readJson('groups.json', []);
      const gIdx = currentAllGroups.findIndex(g => g.id === group.id);
      if (gIdx !== -1) {
        currentAllGroups[gIdx] = group;
        writeJson('groups.json', currentAllGroups);
      }

      // Intervalo de espera anti-ban entre grupos (si no es el último)
      if (i < targetGroups.length - 1 && !activeCampaign.shouldStop) {
        let delaySec = 45;
        if (delayMode === 'safe') {
          // 15 a 30 minutos (recomendado por Meta para 0 baneos)
          delaySec = Math.floor(Math.random() * (1800 - 900 + 1)) + 900;
        } else if (delayMode === 'moderate') {
          // 4 a 8 minutos
          delaySec = Math.floor(Math.random() * (480 - 240 + 1)) + 240;
        } else {
          // Instantáneo / Pruebas (45 a 120 segundos)
          const minS = Math.max(15, settings.minDelaySeconds || 45);
          const maxS = Math.max(minS + 10, settings.maxDelaySeconds || 120);
          delaySec = Math.floor(Math.random() * (maxS - minS + 1)) + minS;
        }

        const mins = (delaySec / 60).toFixed(1);
        broadcastLog({
          type: 'delay',
          msg: `⏳ Pausa de seguridad anti-ban [Modo: ${delayMode.toUpperCase()}]: esperando ${delaySec}s (~${mins} min) antes del siguiente grupo...`,
          delay: delaySec
        });

        // Cuenta regresiva
        for (let s = delaySec; s > 0; s--) {
          if (activeCampaign.shouldStop) break;
          activeCampaign.nextPostInSeconds = s;
          await new Promise(r => setTimeout(r, 1000));
        }
        activeCampaign.nextPostInSeconds = 0;
      }
    }

    activeCampaign.running = false;
    activeCampaign.currentGroup = null;
    broadcastLog({
      type: 'done',
      msg: `🏁 Campaña finalizada. Exitosos: ${activeCampaign.progress.success} | Fallidos: ${activeCampaign.progress.failed}`,
      progress: activeCampaign.progress
    });
  })().catch(err => {
    activeCampaign.running = false;
    broadcastLog({ type: 'error', msg: `❌ Error crítico en la campaña: ${err.message}` });
  });
});

// 8. Detener Campaña
app.post('/api/campaign/stop', (req, res) => {
  activeCampaign.shouldStop = true;
  activeCampaign.running = false;
  broadcastLog({ type: 'warn', msg: '🛑 Solicitud de detención recibida...' });
  res.json({ ok: true, message: 'Deteniendo campaña...' });
});

// 9. Publicar en Instagram (Individual o Sincronizado)
app.post('/api/instagram/post', async (req, res) => {
  const { caption, imagePath, frameworkId, targetLang } = req.body;
  if (!imagePath) return res.status(400).json({ ok: false, error: 'Debes proporcionar una imagen o video para publicar en Instagram.' });

  try {
    const uniqueCaption = parseSpintax(caption || '');
    const result = await postToInstagram({
      caption: uniqueCaption,
      imagePath,
      frameworkId,
      targetLang,
      onLog: (msg) => broadcastLog({ type: 'log', msg: `[Instagram] ${msg}` })
    });

    if (result.ok) {
      const history = readJson('history.json', []);
      history.unshift({
        id: `post-ig-${Date.now()}`,
        platform: 'instagram',
        groupName: 'Instagram Feed Oficial',
        groupUrl: result.postUrl || 'https://www.instagram.com',
        postUrl: result.postUrl || 'https://www.instagram.com',
        ok: true,
        timestamp: new Date().toISOString(),
        message: uniqueCaption,
        messagePreview: uniqueCaption.slice(0, 140) + '...',
        imageUrl: imagePath.includes('public') ? imagePath.replace(/.*public/, '') : `/assets/uploads/${path.basename(imagePath)}`,
        screenshot: result.screenshot,
        details: 'Publicado exitosamente en Instagram Feed.'
      });
      writeJson('history.json', history.slice(0, 200));

      const posts = readJson('posts.json', []);
      posts.unshift({
        id: `post-ig-${Date.now()}`,
        platform: 'instagram',
        title: 'Post de Instagram Feed',
        category: 'Instagram',
        status: 'published',
        groupName: 'Instagram Feed',
        postUrl: result.postUrl || 'https://www.instagram.com',
        mediaUrl: imagePath.includes('public') ? imagePath.replace(/.*public/, '') : `/assets/uploads/${path.basename(imagePath)}`,
        message: uniqueCaption,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      });
      writeJson('posts.json', posts.slice(0, 150));
    }

    res.json(result);
  } catch (e) {
    res.status(500).json({ ok: false, error: e.message });
  }
});

app.post('/api/instagram/scan-comments', async (req, res) => {
  broadcastLog({ type: 'step', msg: '📸 [INSTAGRAM BOT] Escaneando comentarios de Instagram...' });
  try {
    const result = await checkAndReplyToInstagramComments({
      onLog: (msg) => broadcastLog({ type: 'log', msg })
    });
    res.json({ ok: true, ...result });
  } catch (err) {
    res.status(500).json({ ok: false, error: err.message });
  }
});

// 10. API de Piloto Automático (Bot Autónomo 24/7)
app.get('/api/autopilot/status', (req, res) => {
  res.json({ ok: true, status: autopilotInstance.getStatus() });
});

app.post('/api/autopilot/toggle', (req, res) => {
  const { enabled } = req.body;
  if (enabled) {
    autopilotInstance.start();
  } else {
    autopilotInstance.stop();
  }
  res.json({ ok: true, status: autopilotInstance.getStatus() });
});

app.post('/api/autopilot/config', (req, res) => {
  const { dailyQuota, minIntervalMinutes, maxIntervalMinutes, optimalHoursOnly } = req.body;
  const settings = readJson('settings.json', {});
  settings.autopilot = {
    ...settings.autopilot,
    dailyQuota: Number(dailyQuota) || 6,
    minIntervalMinutes: Number(minIntervalMinutes) || 45,
    maxIntervalMinutes: Number(maxIntervalMinutes) || 90,
    optimalHoursOnly: optimalHoursOnly !== false
  };
  writeJson('settings.json', settings);
  res.json({ ok: true, config: settings.autopilot });
});

// 11. API de Sistema (Apagado seguro)
app.post('/api/system/shutdown', (req, res) => {
  res.json({ ok: true, message: 'Servidor deteniéndose...' });
  setTimeout(() => {
    process.exit(0);
  }, 500);
});

// Inicializar el bot con el canal de streaming de logs
autopilotInstance.init((logObj) => broadcastLog(logObj));

// Iniciar servidor local
server.listen(PORT, '127.0.0.1', () => {
  const url = `http://127.0.0.1:${PORT}`;
  console.log(`=======================================================`);
  console.log(`🚀 NexaGuard Social AutoPoster Desktop Engine`);
  console.log(`   Panel de Control: ${url}`);
  console.log(`=======================================================`);

  // Si se pasa flag --open, lanzar como ventana de aplicación nativa
  if (process.argv.includes('--open')) {
    const chromePath = findChromePath();
    if (chromePath) {
      exec(`"${chromePath}" --app="${url}" --window-size=1280,850`);
    } else {
      exec(`start ${url}`);
    }
  }
});
