/**
 * NexaGuard Autonomous Bot Engine (Piloto Automático 24/7)
 * Funciona como un bot desatendido que:
 * 1. Monitorea las horas de mayor interacción orgánica de Meta.
 * 2. Rota automáticamente entre las fórmulas de Copywriting persuasivo (PAS, Caso de Estudio, Alertas).
 * 3. Rota los grupos de Facebook para que ninguno reciba publicaciones repetidas.
 * 4. Controla los límites diarios estrictos (ej. 5 a 8 posts/día) para 0 baneos.
 * 5. Se suspende y despierta automáticamente con cuenta regresiva.
 */

const fs = require('fs');
const path = require('path');
const { parseSpintax } = require('./spintax');
const { COPYWRITING_FRAMEWORKS } = require('./ai-copywriter');
const { postToFacebookGroup } = require('./facebook-poster');
const { isWithinOptimalHours, OPTIMAL_HOURS } = require('./scheduler');
const { BANNER_PRESETS, generateMarketingBanner, generateMarketingVideo } = require('./image-generator');
const { getGeminiApiKey, generateGeminiPost, generateGeminiCreativeConcept } = require('./gemini-client');
const { scanAllActivePostsAndReply } = require('./comment-responder');
const { auditAllRecentPosts } = require('./group-moderator');

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

function readJson(file, def = []) {
  const filePath = path.join(__dirname, '..', 'data', file);
  try {
    if (!fs.existsSync(filePath)) return def;
    return JSON.parse(fs.readFileSync(filePath, 'utf8'));
  } catch (e) {
    return def;
  }
}

function writeJson(file, data) {
  const filePath = path.join(__dirname, '..', 'data', file);
  fs.writeFileSync(filePath, JSON.stringify(data, null, 2), 'utf8');
}

class BotAutopilot {
  constructor() {
    this.enabled = false;
    this.timer = null;
    this.commentTimer = null;
    this.moderationTimer = null;
    this.state = 'STOPPED'; // STOPPED, WAITING_HOURS, WAITING_INTERVAL, POSTING, QUOTA_REACHED
    this.nextRunTimestamp = null;
    this.nextGroupIndex = 0;
    this.currentFrameworkIndex = 0;
    this.onLogCallback = console.log;
    this.postsTodayCount = 0;
    this.lastResetDate = new Date().toISOString().slice(0, 10);
  }

  init(onLog) {
    this.onLogCallback = onLog || console.log;
    const settings = readJson('settings.json', {});
    if (settings.autopilot && settings.autopilot.enabled) {
      this.start();
    }
  }

  log(msg, type = 'info') {
    if (this.onLogCallback) {
      this.onLogCallback({ type, msg: `[BOT AUTÓNOMO] ${msg}` });
    }
  }

  startCommentMonitor() {
    if (this.commentTimer) clearInterval(this.commentTimer);
    // Cada 15 minutos revisa comentarios en los posts activos
    this.commentTimer = setInterval(async () => {
      if (!this.enabled) return;
      try {
        const settings = readJson('settings.json', {});
        if (settings.autoReplyComments !== false) {
          this.log('🔍 [COMMUNITY MANAGER] Escaneando publicaciones en busca de nuevos comentarios...', 'info');
          await scanAllActivePostsAndReply((msg) => this.log(msg));
        }
      } catch (e) {}
    }, 15 * 60 * 1000);
  }

  startModerationMonitor() {
    if (this.moderationTimer) clearInterval(this.moderationTimer);
    // Cada 20 minutos audita publicaciones recientes para limpiar grupos que hayan rechazado/suprimido
    this.moderationTimer = setInterval(async () => {
      if (!this.enabled) return;
      try {
        const settings = readJson('settings.json', {});
        if (settings.autoLeaveOnRejection !== false) {
          this.log('🛡️ [AUDITOR DE MODERACIÓN] Verificando estado de publicaciones en grupos para depuración...', 'info');
          await auditAllRecentPosts({ onLog: (msg) => this.log(msg) });
        }
      } catch (e) {}
    }, 20 * 60 * 1000);
  }

  getStatus() {
    this.checkDailyReset();
    const settings = readJson('settings.json', {});
    const autopilotConfig = settings.autopilot || {
      dailyQuota: 6,
      minIntervalMinutes: 45,
      maxIntervalMinutes: 90,
      optimalHoursOnly: true
    };

    let nextInSeconds = 0;
    if (this.nextRunTimestamp) {
      nextInSeconds = Math.max(0, Math.round((this.nextRunTimestamp - Date.now()) / 1000));
    }

    const groups = readJson('groups.json', []).filter(g => g.enabled);
    const nextGroup = groups.length > 0 ? groups[this.nextGroupIndex % groups.length] : null;
    const nextFramework = COPYWRITING_FRAMEWORKS[this.currentFrameworkIndex % COPYWRITING_FRAMEWORKS.length];

    return {
      enabled: this.enabled,
      state: this.state,
      postsToday: this.postsTodayCount,
      dailyQuota: autopilotConfig.dailyQuota,
      nextInSeconds: nextInSeconds,
      nextRunTime: this.nextRunTimestamp ? new Date(this.nextRunTimestamp).toLocaleTimeString() : null,
      nextGroupName: nextGroup ? nextGroup.name : 'Ninguno en cola',
      nextFrameworkName: nextFramework ? nextFramework.name : 'PAS',
      isOptimalHourNow: isWithinOptimalHours(),
      config: autopilotConfig
    };
  }

  checkDailyReset() {
    const today = new Date().toISOString().slice(0, 10);
    if (this.lastResetDate !== today) {
      this.lastResetDate = today;
      this.postsTodayCount = 0;
      this.log('🌅 Nuevo día detectado. Contador diario reiniciado a 0.');
    }
  }

  start() {
    if (this.enabled) return;
    this.enabled = true;
    this.checkDailyReset();
    this.log('🚀 Piloto Automático ACTIVADO. El bot publicará y responderá comentarios según las reglas de Meta.', 'step');

    const settings = readJson('settings.json', {});
    if (!settings.autopilot) settings.autopilot = {};
    settings.autopilot.enabled = true;
    writeJson('settings.json', settings);

    this.startCommentMonitor();
    this.startModerationMonitor();
    this.scheduleNextAction(15000); // Primera comprobación en 15 segundos
  }

  stop() {
    this.enabled = false;
    this.state = 'STOPPED';
    if (this.timer) {
      clearTimeout(this.timer);
      this.timer = null;
    }
    if (this.commentTimer) {
      clearInterval(this.commentTimer);
      this.commentTimer = null;
    }
    if (this.moderationTimer) {
      clearInterval(this.moderationTimer);
      this.moderationTimer = null;
    }
    this.nextRunTimestamp = null;
    this.log('🛑 Piloto Automático DETENIDO.', 'warn');

    const settings = readJson('settings.json', {});
    if (settings.autopilot) settings.autopilot.enabled = false;
    writeJson('settings.json', settings);
  }

  scheduleNextAction(delayMs) {
    if (!this.enabled) return;
    if (this.timer) clearTimeout(this.timer);

    this.nextRunTimestamp = Date.now() + delayMs;
    const waitMins = Math.round(delayMs / 60000);

    if (waitMins > 0) {
      this.log(`⏳ Bot en reposo. Próxima acción programada en ~${waitMins} minutos (${new Date(this.nextRunTimestamp).toLocaleTimeString()}).`);
    }

    this.timer = setTimeout(async () => {
      await this.runLoopCycle();
    }, delayMs);
  }

  async runLoopCycle() {
    if (!this.enabled) return;
    this.checkDailyReset();

    const settings = readJson('settings.json', {});
    const config = settings.autopilot || {
      dailyQuota: 6,
      minIntervalMinutes: 45,
      maxIntervalMinutes: 90,
      optimalHoursOnly: true
    };

    // 1. Comprobar cupo diario
    if (this.postsTodayCount >= config.dailyQuota) {
      this.state = 'QUOTA_REACHED';
      this.log(`🏁 Cupo diario alcanzado (${this.postsTodayCount}/${config.dailyQuota} posts). El bot descansará hasta mañana para proteger tu cuenta de Facebook.`, 'warn');
      // Dormir 4 horas antes de volver a chequear
      this.scheduleNextAction(4 * 60 * 60 * 1000);
      return;
    }

    // 2. Comprobar ventana de horario óptimo si está configurado
    if (config.optimalHoursOnly && !isWithinOptimalHours()) {
      this.state = 'WAITING_HOURS';
      this.log('⏰ Fuera de las horas pico de Meta (09-12h, 14-17h, 19-22h). El bot espera la próxima ventana para publicar con mayor impacto y cero sospecha.');
      // Re-verificar en 20 minutos
      this.scheduleNextAction(20 * 60 * 1000);
      return;
    }

    // 3. Obtener grupos activos (excluyendo terminantemente grupos en Lista Negra)
    const allGroups = readJson('groups.json', []);
    const activeGroups = allGroups.filter(g => g.enabled && !g.blacklisted);

    // Priorizar grupos verificados en Lista Blanca (administradores amigables)
    activeGroups.sort((a, b) => {
      if (a.whitelisted && !b.whitelisted) return -1;
      if (!a.whitelisted && b.whitelisted) return 1;
      return 0;
    });

    if (activeGroups.length === 0) {
      this.state = 'NO_GROUPS';
      this.log('⚠️ No hay grupos activos en el gestor. Activa al menos uno en la pestaña "Gestor de Grupos".', 'warn');
      this.scheduleNextAction(15 * 60 * 1000);
      return;
    }

    // 4. Seleccionar el grupo de la rotación
    const group = activeGroups[this.nextGroupIndex % activeGroups.length];
    this.nextGroupIndex++;

    // 5. Seleccionar la fórmula persuasiva (Gemini AI, Nicho o Fórmulas Nativas)
    let uniqueMessage = '';
    let frameworkName = '';
    let frameworkId = 'pas-dolor-urgencia';
    let customCreativeData = null;

    const geminiKey = getGeminiApiKey();
    const nicheProfile = settings.activeNicheProfile;

    if (geminiKey) {
      try {
        this.log('♊ [GEMINI AI] Conectado: Redactando copy viral con Spintax y gancho persuasivo...');
        const nicheTopic = (group.category && group.category !== 'General')
          ? `Ciberseguridad, rescate web y protección en nicho ${group.category}`
          : `Seguridad WordPress, pantalla roja de Google, eliminación de malware y escáner forense`;

        const geminiCopy = await generateGeminiPost({
          topic: nicheTopic,
          brandName: 'NexaGuard',
          targetUrl: 'https://nexaguards.com',
          language: 'es'
        });

        if (geminiCopy && geminiCopy.length > 40) {
          uniqueMessage = parseSpintax(geminiCopy);
          frameworkName = `Google Gemini AI (${group.category || 'Ciberseguridad'})`;
          frameworkId = 'gemini-viral';
        }
      } catch (eG) {
        this.log(`ℹ️ [GEMINI AI] Fallback a plantillas nativas: ${eG.message}`);
      }
    }

    if (!uniqueMessage) {
      if (nicheProfile && Array.isArray(nicheProfile.generatedPosts) && nicheProfile.generatedPosts.length > 0) {
        // Rotar entre los copys persuasivos generados para el nicho y marca activa
        const nichePost = nicheProfile.generatedPosts[this.currentFrameworkIndex % nicheProfile.generatedPosts.length];
        uniqueMessage = parseSpintax(nichePost.spintax || nichePost.message);
        frameworkName = `${nicheProfile.brand} (${nichePost.title || nicheProfile.nicheName})`;
        frameworkId = nichePost.framework || 'niche-custom';

        customCreativeData = {
          title: (nichePost.title || nicheProfile.brand).toUpperCase(),
          subtitle: `Soluciones profesionales en ${nicheProfile.nicheName}. Garantía y resultados reales.`,
          badge: `⭐ ${nicheProfile.brand.toUpperCase()}`,
          cta: `MÁS INFORMACIÓN · ${nicheProfile.url.replace(/^https?:\/\//, '').replace(/\/$/, '')}`,
          stats: ['✓ Calidad Premium', '✓ Soporte Inmediato', '✓ Resultados Comprobados']
        };
      } else {
        // Fórmulas nativas de alto impacto (PAS, Casos de Estudio, Alertas de Seguridad)
        const framework = COPYWRITING_FRAMEWORKS[this.currentFrameworkIndex % COPYWRITING_FRAMEWORKS.length];
        uniqueMessage = parseSpintax(framework.spintax);
        frameworkName = framework.name;
        frameworkId = framework.id;
      }
    }
    this.currentFrameworkIndex++;

    this.state = 'POSTING';
    this.log(`✨ Ejecutando publicación autónoma [${this.postsTodayCount + 1}/${config.dailyQuota}]`, 'step');
    this.log(`   Grupo: "${group.name}"`);
    this.log(`   Estrategia: "${frameworkName}"`);

    // 6. Decisión Autónoma de Multimedia: Alterna entre Banner Gráfico y Video Animado con IA
    const shouldMakeVideo = (this.postsTodayCount % 2 === 1);
    let generatedMediaPath = null;
    let mediaType = shouldMakeVideo ? 'video' : 'image';

    try {
      let presetId = 'rescate-urgente';
      if (frameworkId.includes('dolor') || frameworkId.includes('pantalla')) presetId = 'pantalla-roja';
      else if (frameworkId.includes('alerta') || frameworkId.includes('radar')) presetId = 'escaner-radar';
      else if (frameworkId.includes('caso') || frameworkId.includes('seo')) presetId = 'japanese-seo';
      else if (nicheProfile && nicheProfile.niche === 'ecommerce') presetId = 'woocommerce-safe';

      // Si Gemini está activo y no hay datos personalizados, generar concepto creativo con Gemini
      if (geminiKey && !customCreativeData) {
        try {
          customCreativeData = await generateGeminiCreativeConcept({
            topic: `Seguridad y protección web para comunidad ${group.name}`,
            brandName: 'NexaGuard'
          });
        } catch (eC) {}
      }

      if (shouldMakeVideo) {
        this.log('🎬 [BOT AUTÓNOMO] Decisión de IA: Renderizando VIDEO ANIMADO con efectos dinámicos de radar y ciberseguridad NexaGuard...');
        const videoRes = await generateMarketingVideo({
          presetId,
          customData: customCreativeData,
          durationSeconds: 5
        });
        generatedMediaPath = videoRes.filePath;
        mediaType = 'video';
        this.log(`✓ Clip de Video animado generado con éxito: ${path.basename(generatedMediaPath)}`);
      } else {
        this.log('🖼️ [BOT AUTÓNOMO] Decisión de IA: Diseñando BANNER GRÁFICO Ultra HD con branding oficial NexaGuard...');
        const bannerRes = await generateMarketingBanner({
          presetId,
          format: 'fb',
          customData: customCreativeData
        });
        generatedMediaPath = bannerRes.filePath;
        mediaType = 'image';
        this.log(`✓ Banner gráfico generado con éxito: ${path.basename(generatedMediaPath)}`);
      }
    } catch (eMedia) {
      this.log(`⚠️ No se pudo sintetizar multimedia dinámica (${eMedia.message}), publicando texto solo.`);
    }

    try {
      const postResult = await postToFacebookGroup({
        groupUrl: group.url,
        message: uniqueMessage,
        imagePath: generatedMediaPath,
        simulateTyping: true,
        frameworkId: frameworkId,
        autoTranslateByGroupLanguage: true,
        onLog: (msg) => this.log(msg)
      });

      const history = readJson('history.json', []);

      if (postResult.ok) {
        this.postsTodayCount++;
        group.postCount = (group.postCount || 0) + 1;
        group.lastPosted = new Date().toISOString();
        this.log(`🎉 ¡Post publicado exitosamente en "${group.name}"!`, 'success');
      } else {
        this.log(`⚠️ Resultado en "${group.name}": ${postResult.message}`, 'warn');
      }

      // Guardar en historial
      const postUrlFinal = postResult.postUrl || group.url;
      const mediaRelUrl = generatedMediaPath ? (generatedMediaPath.includes('public') ? generatedMediaPath.replace(/.*public/, '').replace(/\\/g, '/') : `/assets/generated/${path.basename(generatedMediaPath)}`) : null;

      history.unshift({
        id: `autopilot-${Date.now()}`,
        groupId: group.id,
        groupName: group.name,
        groupUrl: group.url,
        postUrl: postUrlFinal,
        ok: postResult.ok,
        timestamp: new Date().toISOString(),
        message: uniqueMessage,
        messagePreview: uniqueMessage.slice(0, 140) + '...',
        imageUrl: mediaRelUrl,
        mediaType: mediaType,
        screenshot: postResult.screenshot,
        details: `[Piloto Automático · ${mediaType === 'video' ? '🎬 Video' : '🖼️ Imagen'}] ${postResult.message}`
      });
      writeJson('history.json', history.slice(0, 250));

      if (postResult.ok) {
        try {
          const currentPosts = readJson('posts.json', []);
          currentPosts.unshift({
            id: `autopilot-post-${Date.now()}`,
            title: `[Bot] ${frameworkName}`,
            message: uniqueMessage,
            category: group.category || 'General',
            status: 'published',
            groupName: group.name,
            targetGroupIds: [group.id],
            postUrl: postUrlFinal,
            mediaUrl: mediaRelUrl,
            mediaType: mediaType,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString()
          });
          writeJson('posts.json', currentPosts.slice(0, 150));
        } catch (eP) {}
      }

      // Actualizar grupos
      const gIdx = allGroups.findIndex(x => x.id === group.id);
      if (gIdx !== -1) {
        allGroups[gIdx] = group;
        writeJson('groups.json', allGroups);
      }

    } catch (err) {
      this.log(`❌ Error durante el post autónomo: ${err.message}`, 'error');
    }

    // 7. Calcular el intervalo de seguridad hasta el próximo post
    const minMins = Math.max(30, config.minIntervalMinutes || 45);
    const maxMins = Math.max(minMins + 15, config.maxIntervalMinutes || 90);
    const nextIntervalMins = Math.floor(Math.random() * (maxMins - minMins + 1)) + minMins;

    this.state = 'WAITING_INTERVAL';
    this.scheduleNextAction(nextIntervalMins * 60 * 1000);
  }
}

const autopilotInstance = new BotAutopilot();

module.exports = {
  autopilotInstance
};

