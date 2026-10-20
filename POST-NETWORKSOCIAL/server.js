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

const { findChromePath, openInteractiveSession, checkLoginStatus } = require('./engine/browser');
const { parseSpintax, countSpintaxVariations } = require('./engine/spintax');
const { TEMPLATES } = require('./engine/templates');
const { postToFacebookGroup } = require('./engine/facebook-poster');
const { postToInstagram } = require('./engine/instagram-poster');
const { detectUserFacebookGroups } = require('./engine/group-detector');
const { COPYWRITING_FRAMEWORKS, generatePersuasiveCopy } = require('./engine/ai-copywriter');
const { isWithinOptimalHours, getSmartInterval, assessComplianceRisk, OPTIMAL_HOURS } = require('./engine/scheduler');

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
    userDataDir: loginInfo.userDataDir,
    activeCampaign: {
      running: activeCampaign.running,
      progress: activeCampaign.progress,
      currentGroup: activeCampaign.currentGroup,
      nextPostInSeconds: activeCampaign.nextPostInSeconds
    }
  });
});

// 2. Abrir Navegador Interactivo para Iniciar Sesión (FB / IG)
app.post('/api/browser/open', async (req, res) => {
  const target = req.body.platform === 'instagram' ? 'https://www.instagram.com/' : 'https://www.facebook.com/';
  try {
    await openInteractiveSession(target);
    res.json({ ok: true, message: `Navegador abierto en ${target}. Inicia sesión con tus credenciales y cierra la ventana cuando termines.` });
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

// 5. Subida de Imagen Creativa
app.post('/api/upload-image', upload.single('image'), (req, res) => {
  if (!req.file) return res.status(400).json({ ok: false, error: 'No se subió ningún archivo.' });
  res.json({
    ok: true,
    path: req.file.path,
    url: `/assets/uploads/${req.file.filename}`
  });
});

// 6. Historial de Publicaciones
app.get('/api/history', (req, res) => {
  const history = readJson('history.json', []);
  res.json({ ok: true, history });
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

      // Publicar en Facebook
      const postResult = await postToFacebookGroup({
        groupUrl: group.url,
        message: uniqueMessage,
        imagePath: imagePath || null,
        simulateTyping: settings.simulateTyping !== false,
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

      // Guardar en historial
      history.unshift({
        id: `post-${Date.now()}`,
        groupId: group.id,
        groupName: group.name,
        groupUrl: group.url,
        ok: postResult.ok,
        timestamp: new Date().toISOString(),
        messagePreview: uniqueMessage.slice(0, 140) + '...',
        screenshot: postResult.screenshot,
        details: postResult.message
      });
      writeJson('history.json', history.slice(0, 200));

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

// 9. Publicar en Instagram (Opcional)
app.post('/api/instagram/post', async (req, res) => {
  const { caption, imagePath } = req.body;
  if (!imagePath) return res.status(400).json({ ok: false, error: 'Debes proporcionar una imagen para Instagram.' });

  try {
    const uniqueCaption = parseSpintax(caption || '');
    const result = await postToInstagram({
      caption: uniqueCaption,
      imagePath,
      onLog: (msg) => broadcastLog({ type: 'log', msg: `[Instagram] ${msg}` })
    });
    res.json(result);
  } catch (e) {
    res.status(500).json({ ok: false, error: e.message });
  }
});

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
