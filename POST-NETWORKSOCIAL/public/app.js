/**
 * NexaGuard Social AutoPoster · Frontend State & Logic (Con Detección de Grupos & Selección Múltiple)
 */

// ==========================================================================
// 0. MOTOR SPINTAX & UTILIDADES BÁSICAS EN NAVEGADOR
// ==========================================================================
function parseSpintax(text) {
  if (!text || typeof text !== 'string') return '';
  const regex = /\{([^{}]+)\}/;
  let matches;
  while ((matches = regex.exec(text)) !== null) {
    const choices = matches[1].split('|');
    const randomChoice = choices[Math.floor(Math.random() * choices.length)];
    text = text.replace(matches[0], randomChoice);
  }
  return text;
}

function countSpintaxVariations(text) {
  if (!text) return 1;
  const matches = text.match(/\{([^{}]+)\}/g);
  if (!matches) return 1;
  let total = 1;
  for (const m of matches) {
    const opts = m.slice(1, -1).split('|').length;
    total *= opts;
  }
  return total;
}

function togglePasswordVisibility(inputId, btn) {
  const el = document.getElementById(inputId);
  if (!el) return;
  if (el.type === 'password') {
    el.type = 'text';
    if (btn) btn.textContent = '🔒';
  } else {
    el.type = 'password';
    if (btn) btn.textContent = '👁️';
  }
}

let state = {
  groups: [],
  templates: [],
  attachedImagePath: null,
  activeCampaign: false,
  logSource: null,
  selectedGroupIds: new Set(),
  activeCategoryFilter: 'all',
  composerSearchQuery: '',
  tableSearchQuery: '',
  createdPosts: [],
  historyItems: [],
  activePostCatFilter: 'all',
  activePostStatusFilter: 'all',
  postSearchQuery: '',
  currentPreviewPost: null
};

document.addEventListener('DOMContentLoaded', () => {
  initTabs();
  loadSettings();
  checkGeminiStatus();
  loadStatus();
  loadComplianceStatus();
  loadAutopilotStatus();
  loadCommentBotStatus();
  loadTemplates();
  loadGroups();
  loadCreatedPosts();
  loadComposerLiveFeed();
  loadHistory();
  initSpintaxEvents();
  initLogStream();

  // Actualizar estado del bot cada 4 segundos
  setInterval(loadAutopilotStatus, 4000);
});

// 1. Gestión de Pestañas
function initTabs() {
  document.querySelectorAll('.tab-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const tabId = btn.getAttribute('data-tab');
      document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
      document.querySelectorAll('.tab-content').forEach(c => c.classList.remove('active'));

      btn.classList.add('active');
      const target = document.getElementById(tabId);
      if (target) target.classList.add('active');

      if (tabId === 'tab-created-posts') loadCreatedPosts();
      if (tabId === 'tab-groups') renderGroupsTable();
      if (tabId === 'tab-history') loadHistory();
      if (tabId === 'tab-settings') loadSettings();
    });
  });
}

// 2. Cargar Estado del Sistema
async function loadStatus() {
  try {
    const res = await fetch('/api/status');
    const data = await res.json();
    if (data.ok) {
      const chromeBadge = document.getElementById('chromeBadge');
      const chromeText = document.getElementById('chromeText');
      if (data.chromeFound) {
        chromeBadge.querySelector('.status-dot').className = 'status-dot green';
        chromeText.textContent = 'Chrome Detectado';
      } else {
        chromeBadge.querySelector('.status-dot').className = 'status-dot red';
        chromeText.textContent = 'Chrome No Encontrado';
      }

      const sessionBadge = document.getElementById('sessionBadge');
      const sessionText = document.getElementById('sessionText');
      const sessionDot = document.getElementById('sessionDot') || sessionBadge?.querySelector('.status-dot');
      if (sessionBadge && sessionText) {
        if (data.facebookLoggedIn) {
          if (sessionDot) sessionDot.className = 'status-dot green';
          sessionText.textContent = data.facebookUserId ? `FB: Conectado (${data.facebookUserId})` : 'FB: Conectado';
          sessionBadge.title = 'Cuenta de Facebook vinculada y lista para publicar (Clic para ver detalles)';
          sessionBadge.style.borderColor = 'rgba(0, 255, 170, 0.4)';
        } else {
          if (sessionDot) sessionDot.className = 'status-dot red';
          sessionText.textContent = 'FB: No Vinculado';
          sessionBadge.title = 'Haz clic para abrir la ventana de Facebook e iniciar sesión';
          sessionBadge.style.borderColor = 'rgba(255, 75, 75, 0.4)';
        }
      }

      if (data.activeCampaign && data.activeCampaign.running) {
        setCampaignUI(true);
      }
    }
  } catch (e) {
    console.error('Error cargando status:', e);
  }
}

// Sistema de Notificaciones Toast Elegantes
function showToast(message, type = 'info', duration = 6000) {
  let container = document.querySelector('.nexa-toast-container');
  if (!container) {
    container = document.createElement('div');
    container.className = 'nexa-toast-container';
    document.body.appendChild(container);
  }

  const toast = document.createElement('div');
  toast.className = `nexa-toast ${type}`;
  const icon = type === 'success' ? '✅' : (type === 'error' ? '⚠️' : 'ℹ️');
  toast.innerHTML = `
    <span style="font-size:1.3rem;line-height:1">${icon}</span>
    <div style="flex:1">
      <div style="font-weight:700;margin-bottom:2px">${type === 'success' ? 'Navegador Listo' : (type === 'error' ? 'Atención' : 'Información')}</div>
      <div style="font-size:0.83rem">${message}</div>
    </div>
  `;
  container.appendChild(toast);

  setTimeout(() => {
    toast.style.opacity = '0';
    toast.style.transform = 'translateY(-15px) scale(0.95)';
    setTimeout(() => toast.remove(), 300);
  }, duration);
}

// ==========================================================================
// 2.1 GESTIÓN DE CONFIGURACIÓN & GEMINI AI
// ==========================================================================
async function loadSettings() {
  try {
    const res = await fetch('/api/settings');
    const data = await res.json();
    if (data.ok && data.settings) {
      const s = data.settings;
      if (document.getElementById('settingMinDelay')) document.getElementById('settingMinDelay').value = s.minDelaySeconds || 45;
      if (document.getElementById('settingMaxDelay')) document.getElementById('settingMaxDelay').value = s.maxDelaySeconds || 120;
      if (document.getElementById('settingDailyLimit')) document.getElementById('settingDailyLimit').value = s.dailyLimit || 25;
      if (document.getElementById('settingChromePath')) document.getElementById('settingChromePath').value = s.chromePath || '';
      if (document.getElementById('settingSimulateTyping')) document.getElementById('settingSimulateTyping').checked = s.simulateTyping !== false;
      if (document.getElementById('settingScreenshots')) document.getElementById('settingScreenshots').checked = s.takeScreenshots !== false;
      if (document.getElementById('settingAutoLeaveOnRejection')) document.getElementById('settingAutoLeaveOnRejection').checked = s.autoLeaveOnRejection !== false;
      if (document.getElementById('settingAutoLeaveOnPendingApproval')) document.getElementById('settingAutoLeaveOnPendingApproval').checked = !!s.autoLeaveOnPendingApproval;
      if (document.getElementById('settingGeminiApiKey') && s.geminiApiKey) {
        document.getElementById('settingGeminiApiKey').value = s.geminiApiKey;
      }
      if (document.getElementById('geminiModalApiKeyInput') && s.geminiApiKey) {
        document.getElementById('geminiModalApiKeyInput').value = s.geminiApiKey;
      }
      if (s.geminiApiKey) {
        updateGeminiUIStatus(true, s.geminiApiKey);
      }
    }
  } catch (e) {
    console.error('Error cargando configuración:', e);
  }
}

async function saveSettings() {
  try {
    const settings = {
      minDelaySeconds: parseInt(document.getElementById('settingMinDelay')?.value, 10) || 45,
      maxDelaySeconds: parseInt(document.getElementById('settingMaxDelay')?.value, 10) || 120,
      dailyLimit: parseInt(document.getElementById('settingDailyLimit')?.value, 10) || 25,
      chromePath: (document.getElementById('settingChromePath')?.value || '').trim(),
      simulateTyping: document.getElementById('settingSimulateTyping')?.checked !== false,
      takeScreenshots: document.getElementById('settingScreenshots')?.checked !== false,
      autoLeaveOnRejection: document.getElementById('settingAutoLeaveOnRejection')?.checked !== false,
      autoLeaveOnPendingApproval: !!document.getElementById('settingAutoLeaveOnPendingApproval')?.checked
    };

    const geminiInput = document.getElementById('settingGeminiApiKey');
    if (geminiInput) {
      settings.geminiApiKey = geminiInput.value.trim();
    }

    const res = await fetch('/api/settings', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(settings)
    });
    const data = await res.json();
    if (data.ok) {
      showToast('✅ Configuración guardada correctamente.', 'success');
      appendTerminalLog('success', '[SISTEMA] Configuración actualizada y guardada con éxito.');
      if (settings.geminiApiKey) {
        checkGeminiStatus();
      }
    } else {
      showToast('❌ Error al guardar configuración: ' + (data.error || 'Desconocido'), 'error');
    }
  } catch (e) {
    showToast('❌ Error al guardar: ' + e.message, 'error');
  }
}

// ==========================================================================
// 2.2 GOOGLE GEMINI AI - CONEXIÓN, ESTADO & MODAL
// ==========================================================================
async function checkGeminiStatus() {
  try {
    const res = await fetch('/api/gemini/status');
    const data = await res.json();
    updateGeminiUIStatus(data.connected, data.maskedKey);
  } catch (e) {
    updateGeminiUIStatus(false);
  }
}

function updateGeminiUIStatus(connected, maskedKey = '') {
  const badge = document.getElementById('geminiBadge');
  const dot = document.getElementById('geminiDot');
  const text = document.getElementById('geminiText');
  const btn = document.getElementById('btnHeaderGemini');
  const settingsBadge = document.getElementById('settingsGeminiStatusBadge');

  if (connected) {
    if (dot) { dot.className = 'status-dot green'; }
    if (text) { text.textContent = 'Gemini AI Conectado'; }
    if (badge) {
      badge.title = `Google Gemini Conectado (${maskedKey || 'Activo'})`;
      badge.style.borderColor = 'rgba(61, 232, 164, 0.4)';
    }
    if (btn) {
      btn.textContent = '♊ Gemini Conectado ✓';
      btn.style.background = 'linear-gradient(135deg, #10b981 0%, #059669 100%)';
    }
    if (settingsBadge) {
      settingsBadge.textContent = '🟢 Conectado con Google';
      settingsBadge.style.color = '#3de8a4';
      settingsBadge.style.borderColor = 'rgba(61, 232, 164, 0.4)';
    }
  } else {
    if (dot) { dot.className = 'status-dot red'; }
    if (text) { text.textContent = 'Gemini Desconectado'; }
    if (badge) {
      badge.title = 'Haz clic para conectar tu cuenta de Google Gemini';
      badge.style.borderColor = 'rgba(255, 69, 96, 0.4)';
    }
    if (btn) {
      btn.textContent = '♊ Conectar Gemini';
      btn.style.background = 'linear-gradient(135deg, #4285f4 0%, #9b72cb 50%, #d96570 100%)';
    }
    if (settingsBadge) {
      settingsBadge.textContent = '🔴 Desconectado';
      settingsBadge.style.color = '#ff4560';
      settingsBadge.style.borderColor = 'rgba(255, 69, 96, 0.4)';
    }
  }
}

function openGeminiModal() {
  const modal = document.getElementById('geminiModal');
  if (modal) modal.classList.add('active');
  const modalInput = document.getElementById('geminiModalApiKeyInput');
  const settingInput = document.getElementById('settingGeminiApiKey');
  if (modalInput && settingInput && settingInput.value && !modalInput.value) {
    modalInput.value = settingInput.value;
  }
  const feedback = document.getElementById('geminiModalFeedback');
  if (feedback) feedback.style.display = 'none';
}

function closeGeminiModal() {
  const modal = document.getElementById('geminiModal');
  if (modal) modal.classList.remove('active');
}

async function testGeminiApiKeyFromModal() {
  const input = document.getElementById('geminiModalApiKeyInput');
  const key = input ? input.value.trim() : '';
  const feedback = document.getElementById('geminiModalFeedback');

  if (!key) {
    if (feedback) {
      feedback.style.display = 'block';
      feedback.style.background = 'rgba(255, 69, 96, 0.15)';
      feedback.style.color = '#ff4560';
      feedback.style.border = '1px solid #ff4560';
      feedback.innerHTML = '⚠️ Por favor pega tu clave de API de Google Gemini antes de probar.';
    }
    return;
  }

  if (feedback) {
    feedback.style.display = 'block';
    feedback.style.background = 'rgba(0, 240, 255, 0.15)';
    feedback.style.color = '#00f0ff';
    feedback.style.border = '1px solid #00f0ff';
    feedback.innerHTML = '⏳ Conectando con los servidores oficiales de Google Gemini AI...';
  }

  try {
    const res = await fetch('/api/gemini/test', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ apiKey: key })
    });
    const data = await res.json();
    if (data.ok) {
      if (feedback) {
        feedback.style.background = 'rgba(61, 232, 164, 0.15)';
        feedback.style.color = '#3de8a4';
        feedback.style.border = '1px solid #3de8a4';
        feedback.innerHTML = `✅ <strong>${data.message || '¡Conexión Exitosa!'}</strong><br><small>Modelo verificado: ${data.model} | Respuesta de prueba: "${data.reply}"</small>`;
      }
      updateGeminiUIStatus(true, key);
      const settingInput = document.getElementById('settingGeminiApiKey');
      if (settingInput) settingInput.value = key;
      showToast('✅ ¡Cuenta de Google Gemini conectada con éxito!', 'success');
    } else {
      if (feedback) {
        feedback.style.background = 'rgba(255, 69, 96, 0.15)';
        feedback.style.color = '#ff4560';
        feedback.style.border = '1px solid #ff4560';
        feedback.innerHTML = `❌ Error de Google: <strong>${data.error}</strong>`;
      }
    }
  } catch (err) {
    if (feedback) {
      feedback.style.background = 'rgba(255, 69, 96, 0.15)';
      feedback.style.color = '#ff4560';
      feedback.style.border = '1px solid #ff4560';
      feedback.innerHTML = `❌ Error de conexión: ${err.message}`;
    }
  }
}

async function saveGeminiApiKeyFromModal() {
  const input = document.getElementById('geminiModalApiKeyInput');
  const key = input ? input.value.trim() : '';
  if (!key) {
    alert('Ingresa una clave de API válida para guardar.');
    return;
  }
  try {
    const res = await fetch('/api/settings', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ geminiApiKey: key })
    });
    const data = await res.json();
    if (data.ok) {
      const settingInput = document.getElementById('settingGeminiApiKey');
      if (settingInput) settingInput.value = key;
      updateGeminiUIStatus(true, key);
      showToast('✅ Clave de Google Gemini guardada exitosamente.', 'success');
      appendTerminalLog('success', '[GEMINI AI] Clave de API de Google Gemini vinculada y lista.');
      closeGeminiModal();
    }
  } catch (e) {
    alert('Error al guardar clave: ' + e.message);
  }
}

async function testGeminiApiKeyFromSettings() {
  const input = document.getElementById('settingGeminiApiKey');
  const key = input ? input.value.trim() : '';
  const feedback = document.getElementById('settingsGeminiTestFeedback');
  if (!key) {
    alert('Ingresa tu clave de API de Gemini.');
    return;
  }
  if (feedback) {
    feedback.style.display = 'block';
    feedback.style.background = 'rgba(0, 240, 255, 0.15)';
    feedback.style.color = '#00f0ff';
    feedback.innerHTML = '⏳ Verificando clave con Google Gemini...';
  }
  try {
    const res = await fetch('/api/gemini/test', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ apiKey: key })
    });
    const data = await res.json();
    if (data.ok) {
      if (feedback) {
        feedback.style.background = 'rgba(61, 232, 164, 0.15)';
        feedback.style.color = '#3de8a4';
        feedback.innerHTML = `✅ Conexión exitosa con Google Gemini (${data.model}).`;
      }
      updateGeminiUIStatus(true, key);
      showToast('✅ Google Gemini verificado con éxito.', 'success');
    } else {
      if (feedback) {
        feedback.style.background = 'rgba(255, 69, 96, 0.15)';
        feedback.style.color = '#ff4560';
        feedback.innerHTML = `❌ Error: ${data.error}`;
      }
    }
  } catch (err) {
    if (feedback) {
      feedback.style.display = 'block';
      feedback.style.color = '#ff4560';
      feedback.innerHTML = `❌ Error de red: ${err.message}`;
    }
  }
}

// Redacción rápida con Gemini desde el Compositor
async function promptGenerateWithGemini() {
  const currentPrompt = (document.getElementById('aiCustomPrompt')?.value || '').trim();
  const defaultTopic = currentPrompt || 'Reparación y desinfección de WordPress con pantalla roja Google';
  const topic = prompt('Ingresa el tema o nicho para que Google Gemini redacte tu post viral con Spintax:', defaultTopic);
  if (!topic) return;

  const brand = prompt('Nombre de la marca o proyecto:', 'NexaGuard');
  if (!brand) return;

  const targetUrl = prompt('Enlace de destino (CTA):', 'https://nexaguards.com');

  appendTerminalLog('step', `[GEMINI AI] Redactando publicación de alto impacto sobre: "${topic}"...`);
  showToast('⏳ Google Gemini AI está redactando tu post viral...', 'info', 5000);

  try {
    const res = await fetch('/api/gemini/generate-post', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ topic, brandName: brand, targetUrl, language: 'es' })
    });
    const data = await res.json();
    if (data.ok && data.copy) {
      const spintaxInput = document.getElementById('postSpintax');
      if (spintaxInput) {
        spintaxInput.value = data.copy;
        updateSpintaxPreview();
      }
      appendTerminalLog('success', `[GEMINI AI] ¡Publicación con Spintax generada con éxito por Google Gemini!`);
      showToast('✅ ¡Post viral generado por Google Gemini con Spintax anti-baneo!', 'success');
    } else {
      alert('Error de Google Gemini: ' + (data.error || 'No se pudo generar el texto.'));
    }
  } catch (err) {
    alert('Error al conectar con Gemini: ' + err.message);
  }
}

async function generatePostFromGeminiModal() {
  const topic = document.getElementById('geminiGenTopic')?.value?.trim();
  const brand = document.getElementById('geminiGenBrand')?.value?.trim() || 'NexaGuard';
  if (!topic) {
    alert('Ingresa el tema o nicho.');
    return;
  }
  showToast('⏳ Redactando publicación con Gemini...', 'info');
  try {
    const res = await fetch('/api/gemini/generate-post', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ topic, brandName: brand, language: 'es' })
    });
    const data = await res.json();
    if (data.ok && data.copy) {
      document.getElementById('postSpintax').value = data.copy;
      updateSpintaxPreview();
      closeGeminiModal();
      showToast('✅ ¡Copy cargado en el redactor!', 'success');
    } else {
      alert('Error: ' + data.error);
    }
  } catch (e) {
    alert('Error: ' + e.message);
  }
}

async function generateBannerFromGeminiModal() {
  const topic = document.getElementById('geminiGenTopic')?.value?.trim();
  const brand = document.getElementById('geminiGenBrand')?.value?.trim() || 'NexaGuard';
  if (!topic) {
    alert('Ingresa el tema o nicho.');
    return;
  }
  showToast('⏳ Diseñando banner con Gemini...', 'info');
  try {
    const res = await fetch('/api/gemini/generate-creative', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ topic, brandName: brand, type: 'image' })
    });
    const data = await res.json();
    if (data.ok) {
      state.attachedImagePath = data.filePath;
      const title = data.concept?.title || 'Banner Gemini';
      document.getElementById('attachedImageName').textContent = `📸 Banner Gemini: ${title.slice(0, 24)}...`;
      const imgEl = document.getElementById('imagePreviewImg');
      const vidEl = document.getElementById('imagePreviewVideo');
      const container = document.getElementById('imagePreviewContainer');
      if (vidEl) vidEl.style.display = 'none';
      if (imgEl) {
        imgEl.src = data.publicUrl;
        imgEl.style.display = 'block';
      }
      if (container) container.style.display = 'block';
      closeGeminiModal();
      showToast('✅ ¡Banner generado y adjuntado al post!', 'success');
    } else {
      alert('Error: ' + data.error);
    }
  } catch (e) {
    alert('Error: ' + e.message);
  }
}

async function generateVideoFromGeminiModal() {
  const topic = document.getElementById('geminiGenTopic')?.value?.trim();
  const brand = document.getElementById('geminiGenBrand')?.value?.trim() || 'NexaGuard';
  if (!topic) {
    alert('Ingresa el tema o nicho.');
    return;
  }
  showToast('🎬 Renderizando video animado con Gemini...', 'info', 8000);
  try {
    const res = await fetch('/api/gemini/generate-creative', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ topic, brandName: brand, type: 'video', durationSeconds: 5 })
    });
    const data = await res.json();
    if (data.ok) {
      state.attachedImagePath = data.filePath;
      const title = data.concept?.title || 'Video Gemini';
      document.getElementById('attachedImageName').textContent = `🎬 Video Gemini: ${title.slice(0, 24)}...`;
      const imgEl = document.getElementById('imagePreviewImg');
      const vidEl = document.getElementById('imagePreviewVideo');
      const container = document.getElementById('imagePreviewContainer');
      if (imgEl) imgEl.style.display = 'none';
      if (vidEl) {
        vidEl.src = data.publicUrl;
        vidEl.style.display = 'block';
        vidEl.load();
        vidEl.play().catch(() => {});
      }
      if (container) container.style.display = 'block';
      closeGeminiModal();
      showToast('🎬 ¡Video animado generado y adjuntado al post!', 'success');
    } else {
      alert('Error: ' + data.error);
    }
  } catch (e) {
    alert('Error: ' + e.message);
  }
}

// 3. Abrir Ventana de Inicio de Sesión y Vinculación
let fbSyncInterval = null;

async function openLoginWindow(platform = 'facebook') {
  if (platform === 'facebook') {
    openFbLinkModal();
  } else {
    showToast(`Abriendo ventana de ${platform.toUpperCase()}...`, 'info', 3000);
  }

  try {
    appendTerminalLog('info', `[SISTEMA] Abriendo ventana oficial de ${platform.toUpperCase()} para autenticación...`);
    const res = await fetch('/api/browser/open', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ platform })
    });
    const data = await res.json();
    if (data.ok) {
      appendTerminalLog('success', `[SISTEMA] ¡Ventana de ${platform.toUpperCase()} abierta en tu escritorio!`);
      showToast(`¡Ventana de ${platform.toUpperCase()} abierta! Ingresa tus credenciales en la ventana para vincular tu cuenta.`, 'success', 7000);
      if (platform === 'facebook') {
        startFbSessionPolling();
      }
      loadStatus();
    } else {
      showToast('Error al abrir ventana: ' + data.error, 'error', 6000);
    }
  } catch (e) {
    showToast('No se pudo abrir la ventana: ' + e.message, 'error', 6000);
  }
}

function openFbLinkModal() {
  const modal = document.getElementById('fbLinkModal');
  if (modal) modal.classList.add('active');
  checkFbSessionNow();
}

function closeFbLinkModal() {
  const modal = document.getElementById('fbLinkModal');
  if (modal) modal.classList.remove('active');
  if (fbSyncInterval) {
    clearInterval(fbSyncInterval);
    fbSyncInterval = null;
  }
}

async function reopenFbWindow() {
  showToast('Enfocando ventana de Facebook...', 'info', 2000);
  try {
    await fetch('/api/browser/open', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ platform: 'facebook' })
    });
    startFbSessionPolling();
  } catch (e) {}
}

async function checkFbSessionNow() {
  const syncText = document.getElementById('fbSyncStatusText');
  if (syncText) syncText.textContent = 'Verificando sesión en Facebook...';
  try {
    const res = await fetch('/api/session/verify');
    const data = await res.json();
    if (data.ok) {
      updateFbLinkModalState(data);
      loadStatus();
    }
  } catch (e) {}
}

function startFbSessionPolling() {
  if (fbSyncInterval) clearInterval(fbSyncInterval);
  fbSyncInterval = setInterval(async () => {
    try {
      const res = await fetch('/api/session/verify');
      const data = await res.json();
      if (data.ok) {
        updateFbLinkModalState(data);
        if (data.facebookLoggedIn) {
          clearInterval(fbSyncInterval);
          fbSyncInterval = null;
          loadStatus();
          showToast('🎉 ¡Cuenta de Facebook vinculada con éxito!', 'success', 5000);
        }
      }
    } catch (e) {}
  }, 2500);
}

function updateFbLinkModalState(data) {
  const waitingSec = document.getElementById('fbLinkWaitingSection');
  const successSec = document.getElementById('fbLinkSuccessSection');
  const badge = document.getElementById('fbModalStatusBadge');
  const syncText = document.getElementById('fbSyncStatusText');
  const userDisplay = document.getElementById('fbUserIdDisplay');

  if (data.facebookLoggedIn) {
    if (waitingSec) waitingSec.style.display = 'none';
    if (successSec) successSec.style.display = 'block';
    if (badge) {
      badge.textContent = 'Vinculado';
      badge.style.background = 'rgba(0, 255, 170, 0.2)';
      badge.style.color = '#00ffaa';
      badge.style.borderColor = '#00ffaa';
    }
    if (userDisplay) {
      userDisplay.textContent = data.facebookUserId ? `ID: ${data.facebookUserId} (Sesión Activa)` : 'Sesión Activa & Verificada';
    }
  } else {
    if (waitingSec) waitingSec.style.display = 'block';
    if (successSec) successSec.style.display = 'none';
    if (badge) {
      badge.textContent = 'Esperando Sesión';
      badge.style.background = 'rgba(255, 184, 0, 0.2)';
      badge.style.color = '#ffb800';
      badge.style.borderColor = '#ffb800';
    }
    if (syncText) {
      syncText.textContent = data.activeWindow
        ? 'Ventana abierta. Esperando que inicies sesión en Facebook...'
        : 'Haz clic en "Enfocar / Reabrir Ventana" para iniciar sesión';
    }
  }
}

async function closeFbWindowFromModal() {
  try {
    await fetch('/api/session/window/close', { method: 'POST' });
    showToast('Ventana de Facebook cerrada. Tu sesión permanece vinculada.', 'info', 3000);
    closeFbLinkModal();
  } catch (e) {}
}

// 4. Detección Automática de Grupos Vinculados
async function triggerDetectGroups() {
  const btn = event ? event.target : null;
  if (btn) btn.disabled = true;

  appendTerminalLog('step', '[SINCRONIZACIÓN] Iniciando detección automática de grupos en Facebook...');
  try {
    const res = await fetch('/api/groups/detect', { method: 'POST' });
    const data = await res.json();
    if (data.ok) {
      alert(`¡Sincronización exitosa! Se encontraron ${data.detectedCount} grupos (${data.addedCount} nuevos agregados a tu lista).`);
      state.groups = data.groups;
      // Por defecto seleccionar los habilitados
      data.groups.forEach(g => {
        if (g.enabled) state.selectedGroupIds.add(g.id);
      });
      renderGroupsTable();
      renderComposerChecklist();
    } else {
      if (data.error && data.error.includes('No has iniciado sesión')) {
        showToast('⚠️ Primero debes iniciar sesión en Facebook.', 'warning', 5000);
        openLoginWindow('facebook');
      } else {
        alert('Error al detectar grupos: ' + data.error);
      }
    }
  } catch (err) {
    alert('Error al conectar con el detector: ' + err.message);
  } finally {
    if (btn) btn.disabled = false;
  }
}

// 5. Cargar y Gestionar Grupos
async function loadGroups() {
  try {
    const res = await fetch('/api/groups');
    const data = await res.json();
    if (data.ok) {
      state.groups = data.groups;
      state.selectedGroupIds.clear();
      data.groups.forEach(g => {
        if (g.enabled) state.selectedGroupIds.add(g.id);
      });
      renderGroupsTable();
      renderComposerChecklist();
    }
  } catch (e) {
    console.error('Error cargando grupos:', e);
  }
}

function renderComposerChecklist() {
  const container = document.getElementById('groupsChecklist');
  container.innerHTML = '';

  const filtered = state.groups.filter(g => {
    if (g.blacklisted) return false; // Excluir permanentemente grupos en Lista Negra
    const matchesCat = state.activeCategoryFilter === 'all' || g.category === state.activeCategoryFilter;
    const matchesQuery = !state.composerSearchQuery || g.name.toLowerCase().includes(state.composerSearchQuery.toLowerCase());
    return matchesCat && matchesQuery;
  });

  if (filtered.length === 0) {
    container.innerHTML = '<div style="color:var(--muted);padding:10px;font-size:0.8rem">No hay grupos que coincidan con el filtro.</div>';
    updateSelectedSummary();
    return;
  }

  filtered.forEach(g => {
    const item = document.createElement('div');
    item.className = 'checklist-item';
    const isChecked = state.selectedGroupIds.has(g.id);
    const isMember = g.isMember !== false;

    item.innerHTML = `
      <label>
        <input type="checkbox" ${isChecked ? 'checked' : ''} onchange="toggleComposerGroupSelect('${g.id}', this.checked)">
        <span>${g.whitelisted ? '<b style="color:#3de8a4" title="Grupo en Lista Blanca (Aprobado)">⭐</b> ' : ''}${escapeHtml(g.name)}</span>
      </label>
      <div style="display:flex;gap:6px;align-items:center">
        <span class="badge-info" style="font-size:0.68rem">${escapeHtml(g.category || 'General')}</span>
        ${isMember ? '<span class="tag-member">✓ Vinculado</span>' : '<span class="tag-autojoin">➕ Auto-Join</span>'}
      </div>
    `;
    container.appendChild(item);
  });

  updateSelectedSummary();
}

function toggleComposerGroupSelect(id, checked) {
  if (checked) {
    state.selectedGroupIds.add(id);
  } else {
    state.selectedGroupIds.delete(id);
  }
  updateSelectedSummary();
}

function batchSelectGroups(selectAll) {
  const filtered = state.groups.filter(g => {
    if (g.blacklisted) return false; // Excluir permanentemente grupos en Lista Negra
    const matchesCat = state.activeCategoryFilter === 'all' || g.category === state.activeCategoryFilter;
    const matchesQuery = !state.composerSearchQuery || g.name.toLowerCase().includes(state.composerSearchQuery.toLowerCase());
    return matchesCat && matchesQuery;
  });

  filtered.forEach(g => {
    if (selectAll) state.selectedGroupIds.add(g.id);
    else state.selectedGroupIds.delete(g.id);
  });

  renderComposerChecklist();
}

function filterComposerGroups(category, btn) {
  state.activeCategoryFilter = category;
  document.querySelectorAll('#categoryPills .cat-pill').forEach(p => p.classList.remove('active'));
  if (btn) btn.classList.add('active');
  renderComposerChecklist();
}

function searchComposerGroups(val) {
  state.composerSearchQuery = (val || '').trim();
  renderComposerChecklist();
}

function updateSelectedSummary() {
  const count = state.selectedGroupIds.size;
  document.getElementById('selectedGroupsCount').textContent = `${count} grupos seleccionados para este post`;

  // Comprobar si alguno no es miembro para mostrar aviso de Auto-Join
  const hasAutoJoin = state.groups.some(g => state.selectedGroupIds.has(g.id) && g.isMember === false);
  const notice = document.getElementById('autoJoinNotice');
  if (notice) notice.style.display = hasAutoJoin ? 'block' : 'none';
}

function renderGroupsTable() {
  const tbody = document.getElementById('groupsTableBody');
  tbody.innerHTML = '';

  const total = state.groups.length;
  const whitelisted = state.groups.filter(g => g.whitelisted).length;
  const blacklisted = state.groups.filter(g => g.blacklisted).length;
  const active = state.groups.filter(g => g.enabled && !g.blacklisted).length;

  if (document.getElementById('groupsCountBadge')) document.getElementById('groupsCountBadge').textContent = total;
  if (document.getElementById('modKpiTotal')) document.getElementById('modKpiTotal').textContent = total;
  if (document.getElementById('modKpiWhitelist')) document.getElementById('modKpiWhitelist').textContent = whitelisted;
  if (document.getElementById('modKpiBlacklist')) document.getElementById('modKpiBlacklist').textContent = blacklisted;
  if (document.getElementById('modKpiActive')) document.getElementById('modKpiActive').textContent = active;

  const currentFilter = state.groupModerationFilter || 'all';

  const filtered = state.groups.filter(g => {
    // 1. Filtro por estado de moderación
    if (currentFilter === 'whitelisted' && !g.whitelisted) return false;
    if (currentFilter === 'blacklisted' && !g.blacklisted) return false;
    if (currentFilter === 'active' && (!g.enabled || g.blacklisted)) return false;

    // 2. Filtro de búsqueda por texto
    if (!state.tableSearchQuery) return true;
    const q = state.tableSearchQuery.toLowerCase();
    return g.name.toLowerCase().includes(q) || (g.category || '').toLowerCase().includes(q) || (g.url || '').toLowerCase().includes(q);
  });

  filtered.forEach(g => {
    const tr = document.createElement('tr');
    if (g.blacklisted) tr.style.background = 'rgba(255, 51, 102, 0.05)';
    else if (g.whitelisted) tr.style.background = 'rgba(61, 232, 164, 0.04)';

    const isMember = g.isMember !== false;

    // Badge de moderación / calidad
    let modBadge = '<span class="tag-badge" style="background:rgba(255,255,255,0.06);color:var(--muted);font-size:0.75rem">⚪ Neutro</span>';
    if (g.blacklisted) {
      modBadge = `<span class="tag-badge" style="background:rgba(255,51,102,0.22);color:#ff6b8b;border:1px solid rgba(255,51,102,0.45);font-size:0.75rem;cursor:help" title="${escapeHtml(g.blacklistReason || 'Rechaza publicaciones')}">🚫 LISTA NEGRA</span>`;
    } else if (g.whitelisted) {
      modBadge = '<span class="tag-badge" style="background:rgba(61,232,164,0.22);color:#3de8a4;border:1px solid rgba(61,232,164,0.45);font-size:0.75rem">⭐ LISTA BLANCA</span>';
    }

    // Botones de acción dinámica según estado
    let actionButtons = '';
    if (g.blacklisted) {
      actionButtons = `
        <button class="btn btn-outline btn-xs" onclick="whitelistGroupApi('${g.id}')" title="Restaurar y marcar como Lista Blanca">⭐ Reactivar</button>
        <button class="btn btn-outline btn-xs" onclick="deleteGroup('${g.id}')" title="Eliminar de la base de datos">🗑️</button>
      `;
    } else if (g.whitelisted) {
      actionButtons = `
        <button class="btn btn-danger btn-xs" onclick="blacklistGroupApi('${g.id}')" title="Mover a Lista Negra y retirar cuenta">🚫 Bloquear</button>
        <button class="btn btn-outline btn-xs" onclick="leaveGroupApi('${g.id}')" title="Retirar tu cuenta de este grupo en FB">🚪 Salir</button>
        <button class="btn btn-outline btn-xs" onclick="deleteGroup('${g.id}')" title="Eliminar">🗑️</button>
      `;
    } else {
      actionButtons = `
        <button class="btn btn-success btn-xs" onclick="whitelistGroupApi('${g.id}')" title="Marcar como grupo verificado en Lista Blanca">⭐</button>
        <button class="btn btn-danger btn-xs" onclick="blacklistGroupApi('${g.id}')" title="Mover a Lista Negra y salir">🚫</button>
        <button class="btn btn-outline btn-xs" onclick="leaveGroupApi('${g.id}')" title="Abandonar grupo en Facebook">🚪 Salir</button>
        <button class="btn btn-outline btn-xs" onclick="deleteGroup('${g.id}')" title="Eliminar">🗑️</button>
      `;
    }

    tr.innerHTML = `
      <td>
        <label class="switch">
          <input type="checkbox" ${g.enabled && !g.blacklisted ? 'checked' : ''} ${g.blacklisted ? 'disabled' : ''} onchange="toggleGroupStatus('${g.id}', this.checked)">
          <span class="slider"></span>
        </label>
      </td>
      <td>
        <strong>${escapeHtml(g.name)}</strong>
        ${g.blacklisted && g.blacklistReason ? `<div style="font-size:0.72rem;color:#ff8ba0;margin-top:2px">⚠️ ${escapeHtml(g.blacklistReason)}</div>` : ''}
      </td>
      <td><a href="${escapeHtml(g.url)}" target="_blank" style="color:var(--cyan);text-decoration:none">${escapeHtml(g.url)}</a></td>
      <td><span class="badge-info">${escapeHtml(g.category || 'General')}</span></td>
      <td>${modBadge}</td>
      <td>${isMember ? '<span class="tag-member">✓ Miembro</span>' : '<span class="tag-autojoin">🚪 No vinculado</span>'}</td>
      <td><strong>${g.postCount || 0}</strong></td>
      <td><small style="color:var(--muted)">${g.lastPosted ? new Date(g.lastPosted).toLocaleString() : 'Nunca'}</small></td>
      <td>
        <div style="display:flex;gap:4px;flex-wrap:wrap">
          ${actionButtons}
        </div>
      </td>
    `;
    tbody.appendChild(tr);
  });
}

function filterGroupModeration(filterType, btn) {
  state.groupModerationFilter = filterType;
  const parent = btn.parentElement;
  if (parent) {
    parent.querySelectorAll('.cat-pill').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
  }
  renderGroupsTable();
}

async function triggerAuditModeration() {
  if (!confirm('¿Deseas iniciar una auditoría de moderación en tiempo real?\n\nEl bot inspeccionará las publicaciones recientes en los grupos de Facebook. Si detecta grupos donde los administradores hayan rechazado o suprimido tus posts, abandonará el grupo y lo moverá a la Lista Negra automáticamente.')) return;

  try {
    showToast('🔍 Iniciando auditoría de moderación...', 'info');
    appendTerminalLog('step', '[AUDITORÍA] Iniciando inspección de moderación en grupos recientes...');
    
    const res = await fetch('/api/moderation/audit', { method: 'POST' });
    const data = await res.json();
    if (data.ok) {
      state.groups = data.groups;
      renderGroupsTable();
      renderComposerChecklist();
      showToast(`✅ Auditoría completada: +${data.result.whitelisted} en Lista Blanca, +${data.result.blacklisted} en Lista Negra (abandonados).`, 'success');
    } else {
      showToast('❌ Error en auditoría: ' + (data.error || 'Desconocido'), 'error');
    }
  } catch (err) {
    showToast('❌ Error al conectar: ' + err.message, 'error');
  }
}

async function blacklistGroupApi(id) {
  const g = state.groups.find(x => x.id === id);
  const name = g ? g.name : 'este grupo';
  if (!confirm(`¿Mover "${name}" a la LISTA NEGRA y retirar tu cuenta de Facebook de este grupo?\n\nEl bot abandonará el grupo y nunca más volverá a publicar en él.`)) return;

  try {
    showToast(`🚫 Retirando cuenta y bloqueando grupo...`, 'info');
    appendTerminalLog('warn', `[LISTA NEGRA] Pasando "${name}" a lista negra y abandonando grupo...`);
    const res = await fetch(`/api/groups/${id}/blacklist`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ reason: 'Rechazado manualmente / hostil', leaveFacebook: true })
    });
    const data = await res.json();
    if (data.ok) {
      state.groups = data.groups;
      renderGroupsTable();
      renderComposerChecklist();
      showToast(`✅ Grupo añadido a Lista Negra y cuenta retirada con éxito.`, 'success');
    } else {
      showToast('❌ Error: ' + data.error, 'error');
    }
  } catch (err) {
    showToast('❌ Error: ' + err.message, 'error');
  }
}

async function whitelistGroupApi(id) {
  const g = state.groups.find(x => x.id === id);
  const name = g ? g.name : 'este grupo';

  try {
    showToast(`⭐ Verificando "${name}" en Lista Blanca...`, 'info');
    const res = await fetch(`/api/groups/${id}/whitelist`, { method: 'POST' });
    const data = await res.json();
    if (data.ok) {
      state.groups = data.groups;
      renderGroupsTable();
      renderComposerChecklist();
      showToast(`⭐ Grupo "${name}" marcado en LISTA BLANCA con alta prioridad.`, 'success');
    } else {
      showToast('❌ Error: ' + data.error, 'error');
    }
  } catch (err) {
    showToast('❌ Error: ' + err.message, 'error');
  }
}

async function leaveGroupApi(id) {
  const g = state.groups.find(x => x.id === id);
  const name = g ? g.name : 'este grupo';
  if (!confirm(`¿Confirmas que deseas retirar tu cuenta de Facebook del grupo "${name}" ahora mismo?`)) return;

  try {
    showToast(`🚪 Retirando cuenta de "${name}"...`, 'info');
    appendTerminalLog('step', `[ABANDONO] Retirando cuenta de "${name}"...`);
    const res = await fetch(`/api/groups/${id}/leave`, { method: 'POST' });
    const data = await res.json();
    if (data.ok) {
      if (g) g.isMember = false;
      renderGroupsTable();
      showToast(`✅ Has abandonado "${name}" con éxito en Facebook.`, 'success');
    } else {
      showToast('⚠️ No se pudo completar el abandono: ' + (data.error || 'Verifica en Facebook'), 'error');
    }
  } catch (err) {
    showToast('❌ Error: ' + err.message, 'error');
  }
}

function filterTableGroups(val) {
  state.tableSearchQuery = (val || '').trim();
  renderGroupsTable();
}

async function batchToggleGroupsApi(enabled) {
  try {
    const res = await fetch('/api/groups/batch-toggle', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ enabled })
    });
    const data = await res.json();
    if (data.ok) {
      state.groups = data.groups;
      if (enabled) {
        data.groups.forEach(g => state.selectedGroupIds.add(g.id));
      } else {
        state.selectedGroupIds.clear();
      }
      renderGroupsTable();
      renderComposerChecklist();
    }
  } catch (e) {}
}

async function toggleGroupStatus(id, enabled) {
  try {
    await fetch(`/api/groups/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ enabled })
    });
    const g = state.groups.find(x => x.id === id);
    if (g) {
      g.enabled = enabled;
      if (enabled) state.selectedGroupIds.add(id);
      else state.selectedGroupIds.delete(id);
      renderComposerChecklist();
    }
  } catch (e) {}
}

async function deleteGroup(id) {
  if (!confirm('¿Estás seguro de eliminar este grupo de tu lista?')) return;
  try {
    await fetch(`/api/groups/${id}`, { method: 'DELETE' });
    state.selectedGroupIds.delete(id);
    loadGroups();
  } catch (e) {}
}

function openAddGroupModal() {
  document.getElementById('modalGroupName').value = '';
  document.getElementById('modalGroupUrl').value = '';
  document.getElementById('modalGroupCategory').value = 'WordPress';
  document.getElementById('groupModal').classList.add('active');
}

function closeGroupModal() {
  document.getElementById('groupModal').classList.remove('active');
}

async function saveGroupModal() {
  const name = document.getElementById('modalGroupName').value.trim();
  const url = document.getElementById('modalGroupUrl').value.trim();
  const category = document.getElementById('modalGroupCategory').value.trim();

  if (!url) {
    alert('Por favor introduce la URL del grupo de Facebook.');
    return;
  }

  try {
    const res = await fetch('/api/groups', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: name || 'Grupo Facebook', url, category, isMember: false })
    });
    const data = await res.json();
    if (data.ok) {
      closeGroupModal();
      loadGroups();
    } else {
      alert('Error: ' + data.error);
    }
  } catch (e) {
    alert('Error al guardar grupo: ' + e.message);
  }
}

// 6. Plantillas
async function loadTemplates() {
  try {
    const res = await fetch('/api/templates');
    const data = await res.json();
    if (data.ok) {
      state.templates = data.templates;
      const select = document.getElementById('templateSelect');
      select.innerHTML = '<option value="">-- Selecciona una plantilla NexaGuard --</option>';
      data.templates.forEach(t => {
        const opt = document.createElement('option');
        opt.value = t.id;
        opt.textContent = `${t.category}: ${t.name}`;
        select.appendChild(opt);
      });

      if (data.templates.length > 0) {
        select.value = data.templates[0].id;
        applySelectedTemplate();
      }
    }
  } catch (e) {
    console.error('Error cargando plantillas:', e);
  }
}

function applySelectedTemplate() {
  const select = document.getElementById('templateSelect');
  const tId = select.value;
  const tmpl = state.templates.find(t => t.id === tId);
  if (tmpl) {
    document.getElementById('postSpintax').value = tmpl.spintax;
    updateSpintaxPreview();
  }
}

async function applyCopywritingFramework() {
  const select = document.getElementById('frameworkSelect');
  const frameworkId = select.value;
  try {
    const res = await fetch('/api/copywriting/generate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ frameworkId })
    });
    const data = await res.json();
    if (data.ok) {
      document.getElementById('postSpintax').value = data.rawSpintax;
      updateSpintaxPreview();
      appendTerminalLog('info', `[COPYWRITING IA] Aplicada fórmula: "${data.name}"`);
    }
  } catch (e) {}
}

async function loadComplianceStatus() {
  try {
    const res = await fetch('/api/compliance/status');
    const data = await res.json();
    if (data.ok) {
      const optBadge = document.getElementById('optimalHourBadge');
      if (optBadge) {
        if (data.isOptimalHour) {
          optBadge.textContent = '✓ Horario Pico Activo (09-12h / 14-17h / 19-22h)';
          optBadge.className = 'opt-val tag-green';
        } else {
          optBadge.textContent = '⏰ Fuera de Horario Pico (Se sugiere Modo Seguro)';
          optBadge.className = 'opt-val';
        }
      }

      const limitBadge = document.getElementById('dailyLimitBadge');
      if (limitBadge) {
        const count = data.postsToday || 0;
        limitBadge.textContent = `${count}/8 posts hoy (Zona Segura)`;
        if (count >= 8) {
          limitBadge.className = 'opt-val';
          limitBadge.style.color = 'var(--red)';
        } else {
          limitBadge.className = 'opt-val tag-green';
        }
      }
    }
  } catch (e) {}
}

// 7. Spintax Tester y Previsualización
function initSpintaxEvents() {
  const textarea = document.getElementById('postSpintax');
  let timeout = null;
  textarea.addEventListener('input', () => {
    clearTimeout(timeout);
    timeout = setTimeout(updateSpintaxPreview, 300);
  });
}

async function updateSpintaxPreview() {
  const text = document.getElementById('postSpintax').value;
  if (!text) {
    document.getElementById('spintaxPreviewText').textContent = 'Escribe o selecciona una plantilla para previsualizar.';
    document.getElementById('variationsCount').textContent = '0 variaciones';
    return;
  }

  try {
    const res = await fetch('/api/spintax/preview', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text })
    });
    const data = await res.json();
    if (data.ok) {
      document.getElementById('spintaxPreviewText').textContent = data.sample;
      document.getElementById('variationsCount').textContent = `~${data.variations.toLocaleString()} variaciones únicas`;
    }
  } catch (e) {}
}

function regeneratePreview() {
  updateSpintaxPreview();
}

// 8. Subida de Archivos Multimedia (Imágenes y Videos)
async function handleImageUpload(e) {
  const file = e.target.files[0];
  if (!file) return;

  const isVideo = file.type.startsWith('video/') || /\.(mp4|mov|webm)$/i.test(file.name);
  const formData = new FormData();
  formData.append('file', file);

  try {
    appendTerminalLog('info', `Subiendo ${isVideo ? 'video' : 'imagen'}: ${file.name}...`);
    const res = await fetch('/api/upload-media', {
      method: 'POST',
      body: formData
    });
    const data = await res.json();
    if (data.ok) {
      state.attachedImagePath = data.path;
      document.getElementById('attachedImageName').textContent = `${isVideo ? '🎬' : '📸'} ${file.name}`;
      
      const imgEl = document.getElementById('imagePreviewImg');
      const vidEl = document.getElementById('imagePreviewVideo');

      if (isVideo) {
        if (imgEl) imgEl.style.display = 'none';
        if (vidEl) {
          vidEl.src = data.url;
          vidEl.style.display = 'block';
        }
      } else {
        if (vidEl) vidEl.style.display = 'none';
        if (imgEl) {
          imgEl.src = data.url;
          imgEl.style.display = 'block';
        }
      }

      document.getElementById('imagePreviewContainer').style.display = 'block';
      appendTerminalLog('success', `${isVideo ? 'Video' : 'Imagen'} cargado con éxito.`);
    } else {
      alert('Error al subir archivo: ' + data.error);
    }
  } catch (err) {
    alert('Error de subida: ' + err.message);
  }
}

function removeAttachedImage() {
  state.attachedImagePath = null;
  document.getElementById('imageFileInput').value = '';
  document.getElementById('attachedImageName').textContent = 'Ningún archivo multimedia';
  const imgEl = document.getElementById('imagePreviewImg');
  const vidEl = document.getElementById('imagePreviewVideo');
  if (imgEl) imgEl.style.display = 'none';
  if (vidEl) {
    vidEl.pause();
    vidEl.src = '';
    vidEl.style.display = 'none';
  }
  document.getElementById('imagePreviewContainer').style.display = 'none';
}

async function generateAiBanner(e) {
  if (e && e.preventDefault) e.preventDefault();
  const presetSelect = document.getElementById('bannerPresetSelect');
  const presetId = presetSelect ? presetSelect.value : 'rescate-urgente';
  const customPrompt = (document.getElementById('aiCustomPrompt')?.value || '').trim();

  appendTerminalLog('step', `[IA CREATIVA] Sintetizando banner publicitario (${customPrompt ? `Prompt: "${customPrompt}"` : `Preset: ${presetId}`})...`);
  showToast('⏳ Generando banner de marketing con IA en alta resolución...', 'info');

  try {
    let endpoint = '/api/creative/generate';
    let payload = { presetId, format: 'fb', customPrompt };

    if (customPrompt) {
      endpoint = '/api/gemini/generate-creative';
      payload = { topic: customPrompt, format: 'facebook_feed', type: 'image' };
    }

    const res = await fetch(endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
    const data = await res.json();
    if (data.ok) {
      state.attachedImagePath = data.filePath;
      const title = data.concept?.title || data.preset?.title || 'Banner IA';
      document.getElementById('attachedImageName').textContent = `📸 Banner IA: ${title.slice(0, 26)}...`;

      const imgEl = document.getElementById('imagePreviewImg');
      const vidEl = document.getElementById('imagePreviewVideo');
      const container = document.getElementById('imagePreviewContainer');

      if (vidEl) vidEl.style.display = 'none';
      if (imgEl) {
        imgEl.src = data.publicUrl;
        imgEl.style.display = 'block';
      }
      if (container) container.style.display = 'block';

      appendTerminalLog('success', `[IA CREATIVA] Banner generado exitosamente (1200x630 px) y adjuntado al post.`);
      showToast('✅ Banner publicitario generado y adjuntado.', 'success');
    } else {
      alert('Error al generar banner: ' + data.error);
    }
  } catch (err) {
    alert('Error al generar imagen con IA: ' + err.message);
  }
}

async function generateAiVideo(e) {
  if (e && e.preventDefault) e.preventDefault();
  const presetSelect = document.getElementById('bannerPresetSelect');
  const presetId = presetSelect ? presetSelect.value : 'rescate-urgente';
  const customPrompt = (document.getElementById('aiCustomPrompt')?.value || '').trim();

  appendTerminalLog('step', `[IA VIDEO] Sintetizando video animado con efectos visuales dinámicos (${customPrompt ? `Prompt: "${customPrompt}"` : `Preset: ${presetId}`})...`);
  showToast('🎬 Sintetizando clip de video animado con IA (5s WebM)... Esto toma unos segundos.', 'info', 7000);

  try {
    let endpoint = '/api/creative/generate-video';
    let payload = { presetId, durationSeconds: 5 };

    if (customPrompt) {
      endpoint = '/api/gemini/generate-creative';
      payload = { topic: customPrompt, type: 'video', durationSeconds: 5 };
    }

    const res = await fetch(endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
    const data = await res.json();
    if (data.ok) {
      state.attachedImagePath = data.filePath;
      const title = data.concept?.title || data.preset?.title || 'Video IA';
      document.getElementById('attachedImageName').textContent = `🎬 Video IA: ${title.slice(0, 24)}...`;

      const imgEl = document.getElementById('imagePreviewImg');
      const vidEl = document.getElementById('imagePreviewVideo');
      const container = document.getElementById('imagePreviewContainer');

      if (imgEl) imgEl.style.display = 'none';
      if (vidEl) {
        vidEl.src = data.publicUrl;
        vidEl.style.display = 'block';
        vidEl.load();
        vidEl.play().catch(() => {});
      }
      if (container) container.style.display = 'block';

      appendTerminalLog('success', `[IA VIDEO] Video renderizado exitosamente (1200x630 WebM 60fps) y adjuntado al post.`);
      showToast('🎬 ¡Video animado generado con éxito y adjuntado a la publicación!', 'success');
    } else {
      alert('Error al generar video: ' + data.error);
    }
  } catch (err) {
    alert('Error al generar video con IA: ' + err.message);
  }
}

// 9. Campaña de Auto-Publicación
async function startCampaign() {
  const spintaxText = document.getElementById('postSpintax').value.trim();
  if (!spintaxText) {
    alert('Por favor escribe o selecciona un mensaje para publicar.');
    return;
  }

  const selectedIds = Array.from(state.selectedGroupIds);
  if (selectedIds.length === 0) {
    alert('No has seleccionado ningún grupo para publicar. Marca al menos una casilla en el selector de grupos.');
    return;
  }

  if (!confirm(`¿Iniciar auto-posteo en los ${selectedIds.length} grupos seleccionados? Si hay grupos no vinculados, el sistema solicitará unirse antes de publicar.`)) {
    return;
  }

  try {
    setCampaignUI(true);
    appendTerminalLog('step', `[INICIO] Lanzando campaña para ${selectedIds.length} grupos...`);

    const delayMode = document.getElementById('delayModeSelect') ? document.getElementById('delayModeSelect').value : 'safe';

    const res = await fetch('/api/campaign/start', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        spintaxText,
        imagePath: state.attachedImagePath,
        selectedGroupIds: selectedIds,
        delayMode
      })
    });

    const data = await res.json();
    if (!data.ok) {
      setCampaignUI(false);
      alert('Error al iniciar campaña: ' + data.error);
    }
  } catch (e) {
    setCampaignUI(false);
    alert('Error: ' + e.message);
  }
}

async function stopCampaign() {
  if (!confirm('¿Detener inmediatamente la campaña de publicación?')) return;
  try {
    await fetch('/api/campaign/stop', { method: 'POST' });
    appendTerminalLog('warn', '[DETENCIÓN] Solicitud de parada enviada al motor.');
    setCampaignUI(false);
  } catch (e) {}
}

function setCampaignUI(running) {
  state.activeCampaign = running;
  const btnStart = document.getElementById('btnStartCampaign');
  const btnStop = document.getElementById('btnStopCampaign');
  const progressWrap = document.getElementById('progressWrap');
  const statusBadge = document.getElementById('campaignStatusBadge');

  if (running) {
    btnStart.style.display = 'none';
    btnStop.style.display = 'inline-flex';
    progressWrap.style.display = 'block';
    statusBadge.textContent = '● Publicando en vivo';
    statusBadge.style.background = 'rgba(61, 232, 164, 0.15)';
    statusBadge.style.color = 'var(--green)';
  } else {
    btnStart.style.display = 'inline-flex';
    btnStop.style.display = 'none';
    document.getElementById('countdownBox').style.display = 'none';
    statusBadge.textContent = 'Listo para iniciar';
    statusBadge.style.background = 'rgba(255, 207, 51, 0.15)';
    statusBadge.style.color = 'var(--yellow)';
  }
}

// 10. Streaming de Logs en Tiempo Real (SSE)
function initLogStream() {
  if (state.logSource) state.logSource.close();

  state.logSource = new EventSource('/api/campaign/logs');
  state.logSource.onmessage = (e) => {
    try {
      const data = JSON.parse(e.data);
      handleServerLog(data);
    } catch (err) {}
  };

  state.logSource.onerror = () => {
    setTimeout(initLogStream, 5000);
  };
}

function handleServerLog(data) {
  if (data.type === 'start') {
    appendTerminalLog('step', data.msg);
  } else if (data.type === 'step') {
    appendTerminalLog('step', data.msg);
    if (data.progress) {
      const pct = Math.round((data.progress.current / data.progress.total) * 100);
      document.getElementById('progressBarFill').style.width = pct + '%';
      document.getElementById('progressPercent').textContent = pct + '%';
      document.getElementById('progressText').textContent = `Grupo ${data.progress.current} de ${data.progress.total}...`;
    }
  } else if (data.type === 'log') {
    appendTerminalLog('info', data.msg);
  } else if (data.type === 'delay') {
    appendTerminalLog('warn', data.msg);
    startCountdownUI(data.delay);
  } else if (data.type === 'done') {
    appendTerminalLog('success', data.msg);
    setCampaignUI(false);
    loadHistory();
    loadGroups();
  } else if (data.type === 'error') {
    appendTerminalLog('error', data.msg);
    setCampaignUI(false);
  } else if (data.type === 'warn') {
    appendTerminalLog('warn', data.msg);
  }
}

function startCountdownUI(seconds) {
  const box = document.getElementById('countdownBox');
  const secEl = document.getElementById('countdownSeconds');
  box.style.display = 'block';

  let remaining = seconds;
  secEl.textContent = remaining;

  const timer = setInterval(() => {
    remaining--;
    secEl.textContent = Math.max(0, remaining);
    if (remaining <= 0 || !state.activeCampaign) {
      clearInterval(timer);
      box.style.display = 'none';
    }
  }, 1000);
}

function appendTerminalLog(type, msg) {
  const terminal = document.getElementById('terminalLogs');
  const apTerminal = document.getElementById('autopilotTerminalBody');
  const time = new Date().toLocaleTimeString();

  if (terminal) {
    const line = document.createElement('div');
    line.className = `log-line ${type}`;
    line.textContent = `[${time}] ${msg}`;
    terminal.appendChild(line);
    terminal.scrollTop = terminal.scrollHeight;
  }

  if (apTerminal) {
    const line2 = document.createElement('div');
    line2.className = `log-line ${type}`;
    line2.textContent = `[${time}] ${msg}`;
    apTerminal.appendChild(line2);
    apTerminal.scrollTop = apTerminal.scrollHeight;
  }
}

function clearTerminalLogs() {
  const t = document.getElementById('terminalLogs');
  if (t) t.innerHTML = '<div class="log-line info">[SISTEMA] Consola limpia.</div>';
  const ap = document.getElementById('autopilotTerminalBody');
  if (ap) ap.innerHTML = '<div class="log-line info">[PILOTO AUTOMÁTICO] Consola limpia.</div>';
}

// 12. Piloto Automático 24/7 (Bot Autónomo)
async function loadAutopilotStatus() {
  try {
    const res = await fetch('/api/autopilot/status');
    const data = await res.json();
    if (!data.ok) return;

    const s = data.status;
    const toggle = document.getElementById('autopilotToggle');
    const label = document.getElementById('autopilotToggleLabel');

    if (toggle && label) {
      toggle.checked = !!s.enabled;
      label.textContent = s.enabled ? 'BOT ACTIVADO 24/7' : 'BOT APAGADO';
    }

    const stateEl = document.getElementById('apStatusState');
    if (stateEl) {
      if (!s.enabled) {
        stateEl.textContent = 'Detenido';
        stateEl.style.color = 'var(--muted)';
      } else if (s.state === 'POSTING') {
        stateEl.textContent = '🚀 Publicando Ahora...';
        stateEl.style.color = 'var(--cyan)';
      } else if (s.state === 'WAITING_HOURS') {
        stateEl.textContent = '⏰ Esperando Horario Pico';
        stateEl.style.color = 'var(--yellow)';
      } else if (s.state === 'QUOTA_REACHED') {
        stateEl.textContent = '🏁 Cupo Diario Completado';
        stateEl.style.color = 'var(--green)';
      } else {
        stateEl.textContent = '● En Reposo (Activo)';
        stateEl.style.color = 'var(--green)';
      }
    }

    const nextTimeEl = document.getElementById('apStatusNextTime');
    const countEl = document.getElementById('apStatusCountdown');
    if (nextTimeEl && countEl) {
      if (s.enabled && s.nextRunTime) {
        nextTimeEl.textContent = s.nextRunTime;
        const mins = Math.floor(s.nextInSeconds / 60);
        const secs = s.nextInSeconds % 60;
        countEl.textContent = `Próximo post en ${mins}m ${secs}s`;
      } else {
        nextTimeEl.textContent = '--:--:--';
        countEl.textContent = s.enabled ? 'Programando...' : 'En espera de activación';
      }
    }

    const quotaEl = document.getElementById('apStatusPostsToday');
    if (quotaEl) {
      quotaEl.textContent = `${s.postsToday} / ${s.dailyQuota}`;
    }

    const nextGrpEl = document.getElementById('apStatusNextGroup');
    if (nextGrpEl) {
      nextGrpEl.textContent = s.nextGroupName || 'Cola de grupos';
    }

    const nextFwEl = document.getElementById('apStatusNextFramework');
    if (nextFwEl) {
      nextFwEl.textContent = s.nextFrameworkName || 'PAS (Dolor)';
    }

    const optEl = document.getElementById('apStatusOptimalHour');
    if (optEl) {
      if (s.isOptimalHourNow) {
        optEl.textContent = '✓ Horario Pico Activo';
        optEl.className = 'stat-value tag-green';
      } else {
        optEl.textContent = '⏰ Fuera de Horario Pico';
        optEl.className = 'stat-value';
        optEl.style.color = 'var(--yellow)';
      }
    }

  } catch (e) {}
}

async function toggleAutopilot(enabled) {
  try {
    const res = await fetch('/api/autopilot/toggle', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ enabled })
    });
    const data = await res.json();
    if (data.ok) {
      loadAutopilotStatus();
      if (enabled) {
        appendTerminalLog('success', '[PILOTO AUTOMÁTICO] Bot iniciado. Publicará de forma desatendida respetando los horarios de Meta.');
      } else {
        appendTerminalLog('warn', '[PILOTO AUTOMÁTICO] Bot detenido por el usuario.');
      }
    }
  } catch (e) {
    alert('Error al cambiar estado del bot: ' + e.message);
  }
}

async function saveAutopilotConfig() {
  const dailyQuota = document.getElementById('apConfigDailyQuota').value;
  const minIntervalMinutes = document.getElementById('apConfigMinInterval').value;
  const maxIntervalMinutes = document.getElementById('apConfigMaxInterval').value;
  const optimalHoursOnly = document.getElementById('apConfigOptimalHours').checked;

  try {
    const res = await fetch('/api/autopilot/config', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        dailyQuota,
        minIntervalMinutes,
        maxIntervalMinutes,
        optimalHoursOnly
      })
    });
    const data = await res.json();
    if (data.ok) {
      alert('¡Configuración del Piloto Automático guardada con éxito!');
      loadAutopilotStatus();
    }
  } catch (e) {
    alert('Error al guardar configuración: ' + e.message);
  }
}

// 12.1 Auto-Respuesta a Comentarios (Community Manager IA)
async function loadCommentBotStatus() {
  try {
    const res = await fetch('/api/comments/history');
    const data = await res.json();
    if (data.ok) {
      const countEl = document.getElementById('statRepliedCount');
      if (countEl) countEl.textContent = data.count || 0;

      const container = document.getElementById('repliedCommentsList');
      if (container && data.replies) {
        if (data.replies.length === 0) {
          container.innerHTML = `
            <div style="color:var(--muted);font-size:0.8rem;padding:15px;background:rgba(3,6,22,0.5);border-radius:8px">
              Aún no hay comentarios procesados en esta sesión. Cuando el bot detecte comentarios en tus publicaciones, se listarán aquí.
            </div>`;
        } else {
          container.innerHTML = '';
          data.replies.slice(0, 15).forEach(item => {
            const row = document.createElement('div');
            row.className = 'replied-comment-item';
            row.style.background = 'rgba(4, 9, 32, 0.7)';
            row.style.border = '1px solid var(--line)';
            row.style.borderRadius = '10px';
            row.style.padding = '12px';
            row.style.marginBottom = '10px';
            row.innerHTML = `
              <div style="display:flex;justify-content:space-between;margin-bottom:6px;font-size:0.78rem">
                <span><strong>👤 ${escapeHtml(item.authorName)}</strong> comentó:</span>
                <span style="color:var(--muted)">${new Date(item.timestamp).toLocaleTimeString()}</span>
              </div>
              <div style="font-size:0.82rem;color:#ccd6f6;background:rgba(0,0,0,0.3);padding:8px;border-radius:6px;margin-bottom:8px">
                "${escapeHtml(item.commentText)}"
              </div>
              <div style="font-size:0.82rem;color:var(--green);line-height:1.4">
                <strong>🤖 Respuesta enviada:</strong> ${escapeHtml(item.replyText)}
              </div>
              <div style="margin-top:6px;text-align:right">
                <a href="${escapeHtml(item.postUrl)}" target="_blank" rel="noopener noreferrer" style="font-size:0.75rem;color:var(--cyan);text-decoration:none">
                  🔗 Ver publicación en Facebook ↗
                </a>
              </div>
            `;
            container.appendChild(row);
          });
        }
      }
    }
  } catch (e) {}
}

async function triggerScanCommentsNow() {
  appendTerminalLog('step', '🔍 [COMMUNITY MANAGER] Escaneando publicaciones activas en busca de comentarios nuevos...');
  try {
    const res = await fetch('/api/comments/scan-now', { method: 'POST' });
    const data = await res.json();
    if (data.ok) {
      appendTerminalLog('success', `🏁 [COMMUNITY MANAGER] Escaneo completado. Respuestas enviadas: ${data.totalReplied}`);
      alert(`¡Escaneo de comentarios finalizado! Se enviaron ${data.totalReplied} respuestas personalizadas a nexaguards.com.`);
      loadCommentBotStatus();
    } else {
      alert('Error en el escaneo: ' + data.error);
    }
  } catch (err) {
    alert('Error al conectar: ' + err.message);
  }
}

function setTestComment(text, author) {
  document.getElementById('testCommentText').value = text;
  document.getElementById('testCommentAuthor').value = author;
  runCommentTest();
}

async function runCommentTest() {
  const commentText = document.getElementById('testCommentText').value.trim();
  const authorName = document.getElementById('testCommentAuthor').value.trim();

  if (!commentText) {
    alert('Ingresa un comentario de prueba.');
    return;
  }

  try {
    const res = await fetch('/api/comments/test-reply', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ commentText, authorName })
    });
    const data = await res.json();
    if (data.ok) {
      const box = document.getElementById('testCommentResult');
      box.style.display = 'block';
      document.getElementById('testResultLangBadge').textContent = `🌐 ${data.langName || 'Español'}`;
      document.getElementById('testResultIntentBadge').textContent = `🎯 ${data.intentName || 'Consulta General'}`;
      document.getElementById('testResultReplyText').textContent = data.replyText;
    }
  } catch (err) {
    alert('Error: ' + err.message);
  }
}

async function toggleAutoReply(enabled) {
  try {
    const res = await fetch('/api/settings', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ autoReplyComments: enabled })
    });
    appendTerminalLog('info', `[COMMUNITY MANAGER] Auto-respuesta a comentarios ${enabled ? 'ACTIVADA' : 'DESACTIVADA'}.`);
  } catch (e) {}
}

// 12.2 Publicación & Comentarios en Instagram
async function publishCurrentToInstagram() {
  const spintaxText = document.getElementById('postSpintax').value;
  if (!spintaxText || !spintaxText.trim()) {
    alert('Por favor redacta un texto o selecciona una plantilla para el pie de foto de Instagram.');
    return;
  }

  if (!state.attachedImagePath) {
    if (confirm('Instagram requiere obligatoriamente una imagen o banner. ¿Deseas que la IA genere un banner de ciberseguridad automáticamente ahora?')) {
      await generateAiBanner();
      if (!state.attachedImagePath) return;
    } else {
      return;
    }
  }

  const frameworkSelect = document.getElementById('frameworkSelect');
  const frameworkId = frameworkSelect ? frameworkSelect.value : 'pas-dolor-urgencia';

  if (!confirm('¿Publicar esta imagen y pie de foto en tu cuenta de Instagram ahora?')) return;

  try {
    appendTerminalLog('step', '📸 [INSTAGRAM] Iniciando publicación en Instagram Feed...');
    const res = await fetch('/api/instagram/post', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        caption: spintaxText,
        imagePath: state.attachedImagePath,
        frameworkId
      })
    });
    const data = await res.json();
    if (data.ok) {
      appendTerminalLog('success', '🎉 [INSTAGRAM] ¡Publicado con éxito en tu feed de Instagram!');
      alert('¡Publicación realizada exitosamente en Instagram!');
      loadCreatedPosts();
      loadHistory();
    } else {
      appendTerminalLog('error', `❌ [INSTAGRAM] Error al publicar: ${data.error || data.message}`);
      alert('Error en Instagram: ' + (data.error || data.message));
    }
  } catch (err) {
    alert('Error al conectar: ' + err.message);
  }
}

async function triggerScanInstagramCommentsNow() {
  appendTerminalLog('step', '📸 [INSTAGRAM BOT] Escaneando comentarios recientes en Instagram...');
  try {
    const res = await fetch('/api/instagram/scan-comments', { method: 'POST' });
    const data = await res.json();
    if (data.ok) {
      appendTerminalLog('success', `🏁 [INSTAGRAM BOT] Escaneo completado. Respuestas enviadas: ${data.totalReplied || 0}`);
      alert(`¡Escaneo de Instagram finalizado! Se respondieron ${data.totalReplied || 0} comentarios invitando a nexaguards.com.`);
      loadCommentBotStatus();
    } else {
      alert('Error al escanear Instagram: ' + data.error);
    }
  } catch (err) {
    alert('Error: ' + err.message);
  }
}

function setPreviewPlatformMode(platform) {
  const btnFb = document.getElementById('btnPreviewModeFb');
  const btnIg = document.getElementById('btnPreviewModeIg');
  const directBtn = document.getElementById('fbPreviewDirectLinkBtn');
  const authorBrand = document.querySelector('.fb-brand');
  const groupTarget = document.getElementById('fbPreviewGroupTarget');

  if (platform === 'ig') {
    if (btnFb) btnFb.classList.remove('active');
    if (btnIg) btnIg.classList.add('active');
    if (authorBrand) authorBrand.textContent = 'nexaguard.security';
    if (groupTarget) groupTarget.textContent = '· Ciberseguridad & Rescate';
    if (directBtn) {
      directBtn.textContent = '📸 Abrir en Instagram';
      directBtn.style.background = 'linear-gradient(45deg, #f09433, #e6683c, #dc2743, #cc2366, #bc1888)';
      directBtn.setAttribute('data-url', 'https://www.instagram.com/');
    }
  } else {
    if (btnIg) btnIg.classList.remove('active');
    if (btnFb) btnFb.classList.add('active');
    if (authorBrand) authorBrand.textContent = 'NexaGuard · Rescate Web & Ciberseguridad';
    if (state.currentPreviewPost && groupTarget) {
      groupTarget.textContent = `publicó en ${state.currentPreviewPost.groupName || 'un Grupo'}`;
    }
    if (directBtn) {
      directBtn.textContent = '🔗 Abrir Directamente en Facebook';
      directBtn.style.background = '';
      if (state.currentPreviewPost) {
        directBtn.setAttribute('data-url', state.currentPreviewPost.postUrl || state.currentPreviewPost.groupUrl || 'https://www.facebook.com');
      }
    }
  }
}

// ==========================================================================
// 11. GESTIÓN DE POSTS CREADOS (FEED, VISTA PREVIA, EDICIÓN Y BORRADO)
// ==========================================================================
async function loadCreatedPosts() {
  try {
    const res = await fetch('/api/posts');
    const data = await res.json();
    if (data.ok) {
      state.createdPosts = data.posts || [];
      const badge = document.getElementById('createdPostsCountBadge');
      if (badge) badge.textContent = state.createdPosts.length;
      const catAllBadge = document.getElementById('catCountAll');
      if (catAllBadge) catAllBadge.textContent = state.createdPosts.length;
      renderCreatedPosts();
      renderComposerLiveFeed();
    }
  } catch (e) {
    console.error('Error cargando posts creados:', e);
  }
}

// ==========================================================================
// 11.0 FEED EN VIVO DEBAJO DEL COMPOSITOR (CLICKEABLE, VISTA PREVIA & FACEBOOK)
// ==========================================================================
let composerFeedFilter = 'all';

function filterComposerFeed(filter, btn) {
  composerFeedFilter = filter;
  if (btn && btn.parentElement) {
    btn.parentElement.querySelectorAll('.cat-pill').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
  }
  renderComposerLiveFeed();
}

async function loadComposerLiveFeed() {
  await loadCreatedPosts();
}

function renderComposerLiveFeed() {
  const container = document.getElementById('composerLiveFeedList');
  if (!container) return;

  let posts = [...(state.createdPosts || [])];

  if (composerFeedFilter === 'published') {
    posts = posts.filter(p => p.status === 'published' || (p.postUrl && p.postUrl.includes('/posts/')));
  } else if (composerFeedFilter === 'ready') {
    posts = posts.filter(p => p.status !== 'published' && (!p.postUrl || !p.postUrl.includes('/posts/')));
  }

  const countBadge = document.getElementById('composerFeedCountBadge');
  if (countBadge) {
    countBadge.textContent = `${posts.length} de ${(state.createdPosts || []).length} publicaciones`;
  }

  if (posts.length === 0) {
    container.innerHTML = `
      <div style="padding:32px 20px;text-align:center;color:var(--muted);background:rgba(255,255,255,0.02);border:1px dashed var(--line);border-radius:10px">
        <div style="font-size:1.8rem;margin-bottom:8px">📋</div>
        <div style="font-weight:600;color:#fff;margin-bottom:4px">No hay publicaciones con el filtro seleccionado</div>
        <small style="color:var(--muted)">Redacta un texto arriba y pulsa "💾 GUARDAR EN MIS POSTS" o inicia una campaña para ver tus publicaciones aquí.</small>
      </div>`;
    return;
  }

  container.innerHTML = '';
  posts.forEach(post => {
    const isPublished = post.status === 'published' || (post.postUrl && post.postUrl.includes('/posts/'));
    const isVideo = post.mediaType === 'video' || (post.mediaUrl && /\.(mp4|webm|mov)$/i.test(post.mediaUrl));

    const card = document.createElement('div');
    card.className = `composer-feed-card ${isPublished ? 'is-published' : 'is-ready'}`;

    let mediaThumbHtml = '';
    if (post.mediaUrl) {
      if (isVideo) {
        mediaThumbHtml = `
          <div class="feed-card-thumb">
            <span class="video-pill-badge">🎬 Video</span>
            <video src="${escapeHtml(post.mediaUrl)}" muted preload="metadata" style="width:100%;height:100%;object-fit:cover"></video>
          </div>`;
      } else {
        mediaThumbHtml = `
          <div class="feed-card-thumb">
            <img src="${escapeHtml(post.mediaUrl)}" alt="Miniatura" loading="lazy" onerror="this.parentElement.innerHTML='<div class=\\'feed-thumb-placeholder\\'><span>🖼️</span></div>'">
          </div>`;
      }
    } else {
      mediaThumbHtml = `
        <div class="feed-card-thumb feed-thumb-placeholder">
          <span>📝 Texto</span>
        </div>`;
    }

    const rawMsg = post.message || '';
    const cleanSnippet = rawMsg.replace(/\{([^{}]+)\}/g, (m, c) => c.split('|')[0]);
    const previewSnippet = escapeHtml(cleanSnippet.slice(0, 150)) + (cleanSnippet.length > 150 ? '...' : '');

    card.innerHTML = `
      ${mediaThumbHtml}
      <div class="feed-card-body" onclick="openFacebookPreviewModalById('${post.id}')" title="Haz clic para ver la vista previa idéntica a Facebook e Instagram">
        <div class="feed-card-header">
          <span class="feed-card-title">${escapeHtml(post.title || 'Publicación')}</span>
          <span class="feed-card-badge ${post.status === 'pending_approval' ? 'badge-pending' : (isPublished ? 'badge-published' : 'badge-ready')}" style="${post.status === 'pending_approval' ? 'background:rgba(255,207,51,.2);color:#ffcf33;border:1px solid rgba(255,207,51,.4)' : ''}">
            ${post.status === 'pending_approval' ? '⏳ En Revisión (Admin FB)' : (isPublished ? '✓ Publicado en FB' : '● Listo para Publicar')}
          </span>
        </div>
        <div class="feed-card-target">
          <span class="feed-icon">👥</span>
          <span>${escapeHtml(post.groupName || 'Grupo de Facebook')}</span>
          <span class="feed-dot">·</span>
          <span class="feed-time">${post.createdAt ? new Date(post.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : 'Reciente'}</span>
        </div>
        <div class="feed-card-snippet">${previewSnippet}</div>
      </div>
      <div class="feed-card-actions">
        <button type="button" class="btn btn-xs btn-outline feed-btn-preview" onclick="openFacebookPreviewModalById('${post.id}')" title="Ver cómo se ve en Facebook e Instagram">
          👁️ Vista Previa
        </button>
        <button type="button" class="btn btn-xs btn-primary feed-btn-fb" onclick="openPostDirectlyInFacebook('${post.id}')" title="Ir a la publicación directamente en Facebook">
          🔗 Abrir en Facebook
        </button>
        <button type="button" class="btn btn-xs btn-secondary feed-btn-load" onclick="loadPostIntoComposer('${post.id}')" title="Cargar este post al editor arriba para republicar o modificar">
          ✍️ Cargar al Editor
        </button>
        <button type="button" class="btn btn-xs btn-outline feed-btn-del" onclick="deleteComposerFeedPost('${post.id}')" title="Eliminar de la biblioteca">
          🗑️
        </button>
      </div>
    `;

    container.appendChild(card);
  });
}

function openPostDirectlyInFacebook(postId) {
  const post = (state.createdPosts || []).find(p => p.id === postId) || (state.historyItems || []).find(h => h.id === postId);
  if (!post) {
    window.open('https://www.facebook.com/groups', '_blank');
    return;
  }
  let url = post.postUrl || post.groupUrl;
  if (!url && post.targetGroupIds && post.targetGroupIds.length > 0) {
    const grp = state.groups.find(g => g.id === post.targetGroupIds[0]);
    if (grp) url = grp.url;
  }
  if (!url || !url.startsWith('http')) {
    url = 'https://www.facebook.com/groups';
  }
  window.open(url, '_blank', 'noopener,noreferrer');
}

function loadPostIntoComposer(postId) {
  const post = (state.createdPosts || []).find(p => p.id === postId);
  if (!post) return;

  const spintaxInput = document.getElementById('postSpintax');
  if (spintaxInput) {
    spintaxInput.value = post.message || '';
    updateSpintaxPreview();
  }

  if (post.mediaUrl) {
    state.attachedImagePath = post.mediaUrl;
    const isVideo = post.mediaType === 'video' || /\.(mp4|webm|mov)$/i.test(post.mediaUrl);
    const attachedNameEl = document.getElementById('attachedImageName');
    if (attachedNameEl) {
      attachedNameEl.textContent = `${isVideo ? '🎬 Video' : '📸 Imagen'} cargada: ${post.title || 'Post'}`;
    }
    const container = document.getElementById('imagePreviewContainer');
    const imgEl = document.getElementById('imagePreviewImg');
    const vidEl = document.getElementById('imagePreviewVideo');
    if (container) container.style.display = 'block';
    if (isVideo) {
      if (imgEl) imgEl.style.display = 'none';
      if (vidEl) {
        vidEl.src = post.mediaUrl;
        vidEl.style.display = 'block';
        vidEl.load();
      }
    } else {
      if (vidEl) vidEl.style.display = 'none';
      if (imgEl) {
        imgEl.src = post.mediaUrl;
        imgEl.style.display = 'block';
      }
    }
  }

  if (post.targetGroupIds && Array.isArray(post.targetGroupIds)) {
    state.selectedGroupIds = new Set(post.targetGroupIds);
    renderComposerChecklist();
    updateSelectedSummary();
  }

  window.scrollTo({ top: 0, behavior: 'smooth' });
  showToast(`✅ Post "${post.title || ''}" cargado con éxito en el redactor.`, 'success');
}

async function deleteComposerFeedPost(postId) {
  if (!confirm('¿Seguro que deseas eliminar esta publicación de la lista?')) return;
  try {
    const res = await fetch(`/api/posts/${postId}`, { method: 'DELETE' });
    const data = await res.json();
    if (data.ok) {
      state.createdPosts = state.createdPosts.filter(p => p.id !== postId);
      renderComposerLiveFeed();
      renderCreatedPosts();
      showToast('Publicación eliminada correctamente.', 'info');
    } else {
      alert('Error al eliminar: ' + data.error);
    }
  } catch (e) {
    alert('Error al eliminar: ' + e.message);
  }
}

function renderCreatedPosts() {
  const container = document.getElementById('createdPostsFeed');
  if (!container) return;
  container.innerHTML = '';

  let list = [...state.createdPosts];

  // Filtro por categoría
  if (state.activePostCatFilter && state.activePostCatFilter !== 'all') {
    list = list.filter(p => (p.category || '').toLowerCase() === state.activePostCatFilter.toLowerCase());
  }

  // Filtro por estado
  if (state.activePostStatusFilter && state.activePostStatusFilter !== 'all') {
    list = list.filter(p => (p.status || '').toLowerCase() === state.activePostStatusFilter.toLowerCase());
  }

  // Búsqueda por texto
  if (state.postSearchQuery && state.postSearchQuery.trim()) {
    const q = state.postSearchQuery.toLowerCase().trim();
    list = list.filter(p => (p.title || '').toLowerCase().includes(q) || (p.message || '').toLowerCase().includes(q));
  }

  if (list.length === 0) {
    container.innerHTML = `
      <div style="grid-column: 1 / -1; padding: 40px; text-align: center; color: var(--muted); background: rgba(5,9,28,0.5); border-radius: 12px; border: 1px dashed var(--line);">
        <p style="font-size:1.1rem;margin-bottom:8px">No se encontraron publicaciones con estos filtros.</p>
        <button class="btn btn-primary btn-sm" onclick="openCreatePostModal()">+ Crear Nueva Publicación</button>
      </div>`;
    return;
  }

  list.forEach(post => {
    const card = document.createElement('div');
    card.className = 'created-post-card';

    const isPublished = post.status === 'published';
    const isPending = post.status === 'pending_approval';
    const statusTag = isPending
      ? '<span class="tag-badge tag-warn" style="background:rgba(255,207,51,.2);color:#ffcf33;border:1px solid rgba(255,207,51,.4)">⏳ En Revisión (Admin FB)</span>'
      : (isPublished 
          ? '<span class="tag-badge tag-published">✓ Publicado en FB</span>' 
          : '<span class="tag-badge tag-ready">● Listo</span>');
    
    const catTag = `<span class="tag-badge tag-category">${escapeHtml(post.category || 'General')}</span>`;
    const targetGroup = escapeHtml(post.groupName || 'Grupo de Facebook');
    const fbUrl = post.postUrl || 'https://www.facebook.com';

    // Formatear texto con hashtags resaltados
    const formattedSnippet = highlightHashtagsAndLinks(post.message || '');

    // Formatear media preview (imagen o video)
    let mediaHtml = '';
    if (post.mediaUrl) {
      const isVideo = post.mediaType === 'video' || /\.(mp4|mov|webm)$/i.test(post.mediaUrl);
      if (isVideo) {
        mediaHtml = `
          <div class="card-media-preview" onclick="openFacebookPreviewModalById('${post.id}')" title="Clic para ver en pantalla completa">
            <video src="${post.mediaUrl}" muted style="width:100%;height:160px;object-fit:cover"></video>
            <span style="position:absolute;top:10px;right:10px;background:rgba(0,0,0,0.7);color:#fff;padding:2px 8px;border-radius:4px;font-size:0.75rem">🎬 Video</span>
          </div>`;
      } else {
        mediaHtml = `
          <div class="card-media-preview" onclick="openFacebookPreviewModalById('${post.id}')" title="Clic para ver en pantalla completa">
            <img src="${post.mediaUrl}" alt="Media" loading="lazy">
          </div>`;
      }
    }

    card.innerHTML = `
      <div>
        <div class="card-top-row">
          <div class="card-title-wrap">
            <div class="card-meta-tags">
              ${statusTag}
              ${catTag}
            </div>
            <h3 onclick="openDirectFbPost('${escapeHtml(fbUrl)}')" title="Clic para ir directamente a este post en Facebook">
              ${escapeHtml(post.title || 'Publicación NexaGuard')}
            </h3>
          </div>
        </div>

        <div class="card-target-group" style="margin-top:8px">
          <span>🎯 Destino:</span>
          <strong>${targetGroup}</strong>
        </div>

        <a class="card-fb-link-banner" style="margin-top:10px" href="${escapeHtml(fbUrl)}" target="_blank" rel="noopener noreferrer" title="Abrir enlace directo en Facebook">
          <span>🔗 <strong>Ver en Facebook:</strong> ${escapeHtml(truncateUrl(fbUrl, 38))}</span>
          <span>↗</span>
        </a>

        <div class="card-message-preview" style="margin-top:12px">
          ${formattedSnippet}
        </div>

        ${mediaHtml ? `<div style="margin-top:12px">${mediaHtml}</div>` : ''}
      </div>

      <div class="card-actions-bar">
        <button class="btn btn-outline btn-xs" onclick="openFacebookPreviewModalById('${post.id}')" title="Ver vista previa idéntica a Facebook">
          👁️ Vista Previa
        </button>
        <button class="btn btn-outline btn-xs" onclick="openDirectFbPost('${escapeHtml(fbUrl)}')" title="Abrir en Facebook">
          🔗 Ir a FB
        </button>
        <button class="btn btn-outline btn-xs" onclick="openEditPostModal('${post.id}', 'posts')" title="Editar texto y configuración del post">
          ✏️ Editar
        </button>
        <button class="btn btn-primary btn-xs" onclick="publishSinglePost('${post.id}')" title="Publicar este post ahora">
          🚀 Publicar
        </button>
        <button class="btn btn-danger btn-xs" onclick="deleteCreatedPost('${post.id}')" title="Eliminar este post">
          🗑️
        </button>
      </div>
    `;

    container.appendChild(card);
  });
}

function truncateUrl(url, maxLen = 35) {
  if (!url) return '';
  return url.length > maxLen ? url.slice(0, maxLen) + '...' : url;
}

function highlightHashtagsAndLinks(text) {
  if (!text) return '';
  let escaped = escapeHtml(text);
  // Resaltar hashtags #Etiqueta
  escaped = escaped.replace(/(#[a-zA-Z0-9_\u00C0-\u017F]+)/g, '<span class="hashtag">$1</span>');
  // Resaltar enlaces http/https
  escaped = escaped.replace(/(https?:\/\/[^\s]+)/g, '<span style="color:#00f0ff;text-decoration:underline">$1</span>');
  return escaped;
}

// Filtros y Búsqueda de Posts
function filterCreatedPostsCategory(cat, btn) {
  state.activePostCatFilter = cat;
  const pills = document.querySelectorAll('#postCategoryPills .cat-pill');
  pills.forEach(p => p.classList.remove('active'));
  if (btn) btn.classList.add('active');
  renderCreatedPosts();
}

function filterCreatedPostsStatus(status) {
  state.activePostStatusFilter = status;
  renderCreatedPosts();
}

function searchCreatedPosts(query) {
  state.postSearchQuery = query;
  renderCreatedPosts();
}

// Guardar el post actual del Composer como Borrador / Post Creado
async function saveCurrentPostAsDraft() {
  const spintaxText = document.getElementById('postSpintax').value;
  if (!spintaxText || !spintaxText.trim()) {
    alert('Por favor redacta un texto o selecciona una plantilla antes de guardar.');
    return;
  }

  const frameworkSelect = document.getElementById('frameworkSelect');
  const frameworkName = frameworkSelect ? frameworkSelect.options[frameworkSelect.selectedIndex].text : 'Publicación NexaGuard';
  const title = prompt('Ingresa un título para guardar esta publicación:', frameworkName);
  if (!title) return;

  const selectedIds = Array.from(state.selectedGroupIds);
  let groupName = 'Múltiples grupos';
  let postUrl = 'https://www.facebook.com';
  if (selectedIds.length > 0) {
    const firstGrp = state.groups.find(g => g.id === selectedIds[0]);
    if (firstGrp) {
      groupName = firstGrp.name;
      postUrl = firstGrp.url;
    }
  }

  let mediaRelUrl = null;
  let mediaType = 'image';
  if (state.attachedImagePath) {
    if (state.attachedImagePath.includes('public')) {
      mediaRelUrl = state.attachedImagePath.replace(/.*public/, '').replace(/\\/g, '/');
    } else {
      mediaRelUrl = `/assets/uploads/${state.attachedImagePath.split(/[\\/]/).pop()}`;
    }
    if (/\.(mp4|mov|webm)$/i.test(state.attachedImagePath)) {
      mediaType = 'video';
    }
  }

  try {
    const res = await fetch('/api/posts', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        title,
        message: spintaxText,
        category: 'WordPress',
        mediaUrl: mediaRelUrl,
        mediaType,
        targetGroupIds: selectedIds,
        groupName,
        postUrl
      })
    });
    const data = await res.json();
    if (data.ok) {
      appendTerminalLog('success', `[GUARDADO] Post guardado con éxito en la biblioteca.`);
      alert('¡Publicación guardada con éxito en la biblioteca de posts!');
      loadCreatedPosts();
    } else {
      alert('Error al guardar post: ' + data.error);
    }
  } catch (e) {
    alert('Error: ' + e.message);
  }
}

// Previsualizar en Facebook el post actual del compositor
function previewCurrentComposerPost() {
  const spintaxText = document.getElementById('postSpintax').value;
  if (!spintaxText || !spintaxText.trim()) {
    alert('Por favor redacta algún texto o plantilla para poder previsualizar.');
    return;
  }

  let mediaRelUrl = null;
  let mediaType = 'image';
  if (state.attachedImagePath) {
    if (state.attachedImagePath.includes('public')) {
      mediaRelUrl = state.attachedImagePath.replace(/.*public/, '').replace(/\\/g, '/');
    } else {
      mediaRelUrl = `/assets/uploads/${state.attachedImagePath.split(/[\\/]/).pop()}`;
    }
    if (/\.(mp4|mov|webm)$/i.test(state.attachedImagePath)) mediaType = 'video';
  }

  const selectedIds = Array.from(state.selectedGroupIds);
  let groupName = 'Comunidad WordPress & Ciberseguridad';
  let postUrl = 'https://www.facebook.com/groups';
  if (selectedIds.length > 0) {
    const g = state.groups.find(x => x.id === selectedIds[0]);
    if (g) {
      groupName = g.name;
      postUrl = g.url;
    }
  }

  const samplePost = {
    id: 'temp-composer-preview',
    title: 'Vista Previa del Compositor',
    message: parseSpintax(spintaxText),
    mediaUrl: mediaRelUrl,
    mediaType,
    groupName,
    postUrl,
    createdAt: new Date().toISOString()
  };

  openFacebookPreviewModal(samplePost);
}

// ==========================================================================
// 11.1 MODAL DE VISTA PREVIA FACEBOOK (DARK THEME)
// ==========================================================================
function openFacebookPreviewModalById(postId) {
  const post = state.createdPosts.find(p => p.id === postId) || state.historyItems.find(h => h.id === postId);
  if (post) {
    openFacebookPreviewModal(post);
  }
}

function openFacebookPreviewModal(post) {
  state.currentPreviewPost = post;

  const groupTargetEl = document.getElementById('fbPreviewGroupTarget');
  if (groupTargetEl) {
    groupTargetEl.textContent = `publicó en ${post.groupName || 'un Grupo de Facebook'}`;
  }

  const timeEl = document.getElementById('fbPreviewTime');
  if (timeEl) {
    timeEl.textContent = post.createdAt ? new Date(post.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : 'Hace un momento';
  }

  // Contenido con hashtags y enlaces de Facebook
  const contentEl = document.getElementById('fbPreviewContent');
  if (contentEl) {
    let resolvedText = parseSpintax(post.message || '');
    let escaped = escapeHtml(resolvedText);
    escaped = escaped.replace(/(#[a-zA-Z0-9_\u00C0-\u017F]+)/g, '<span class="fb-hashtag">$1</span>');
    escaped = escaped.replace(/(https?:\/\/[^\s]+)/g, '<a class="fb-link" href="$1" target="_blank" rel="noopener noreferrer">$1</a>');
    contentEl.innerHTML = escaped;
  }

  // Media (imagen o video)
  const imgEl = document.getElementById('fbPreviewImage');
  const vidEl = document.getElementById('fbPreviewVideo');
  const mediaContainer = document.getElementById('fbPreviewMediaContainer');

  const mediaUrl = post.mediaUrl || post.imageUrl;
  const isVideo = post.mediaType === 'video' || (mediaUrl && /\.(mp4|mov|webm)$/i.test(mediaUrl));

  if (mediaUrl) {
    mediaContainer.style.display = 'flex';
    if (isVideo) {
      if (imgEl) imgEl.style.display = 'none';
      if (vidEl) {
        vidEl.src = mediaUrl;
        vidEl.style.display = 'block';
      }
    } else {
      if (vidEl) {
        vidEl.pause();
        vidEl.src = '';
        vidEl.style.display = 'none';
      }
      if (imgEl) {
        imgEl.src = mediaUrl;
        imgEl.style.display = 'block';
      }
    }
  } else {
    mediaContainer.style.display = 'none';
  }

  // Botón directo a Facebook
  const directBtn = document.getElementById('fbPreviewDirectLinkBtn');
  if (directBtn) {
    const fbUrl = post.postUrl || post.groupUrl || 'https://www.facebook.com';
    directBtn.setAttribute('data-url', fbUrl);
  }

  document.getElementById('facebookPreviewModal').classList.add('active');
}

function closeFacebookPreviewModal() {
  const vidEl = document.getElementById('fbPreviewVideo');
  if (vidEl) {
    vidEl.pause();
    vidEl.src = '';
  }
  document.getElementById('facebookPreviewModal').classList.remove('active');
  state.currentPreviewPost = null;
}

function toggleFbLike() {
  const btn = document.getElementById('fbLikeBtn');
  const countEl = document.getElementById('fbReactionCount');
  if (!btn || !countEl) return;

  const isLiked = btn.classList.toggle('active');
  let currentCount = 142;
  const match = countEl.textContent.match(/\d+/);
  if (match) currentCount = parseInt(match[0], 10);

  if (isLiked) {
    btn.innerHTML = '<span class="fb-btn-icon">👍</span> <span>¡Te gusta!</span>';
    countEl.textContent = `${currentCount + 1} personas`;
  } else {
    btn.innerHTML = '<span class="fb-btn-icon">👍</span> <span>Me gusta</span>';
    countEl.textContent = `${Math.max(1, currentCount - 1)} personas`;
  }
}

// Abrir el post directamente en Facebook en una pestaña nueva
function openDirectFbPost(overrideUrl) {
  let url = overrideUrl;
  if (!url && state.currentPreviewPost) {
    url = state.currentPreviewPost.postUrl || state.currentPreviewPost.groupUrl;
  }
  if (!url) {
    const directBtn = document.getElementById('fbPreviewDirectLinkBtn');
    url = directBtn ? directBtn.getAttribute('data-url') : 'https://www.facebook.com';
  }
  if (!url.startsWith('http')) {
    url = 'https://www.facebook.com';
  }
  window.open(url, '_blank', 'noopener,noreferrer');
}

function editFromPreview() {
  if (state.currentPreviewPost) {
    const p = state.currentPreviewPost;
    closeFacebookPreviewModal();
    openEditPostModal(p.id, p.id.startsWith('post-hist') ? 'history' : 'posts');
  }
}

// ==========================================================================
// 11.2 MODAL DE EDICIÓN DE POST (POSTS O HISTORIAL)
// ==========================================================================
function openEditPostModal(id, source = 'posts') {
  let item = null;
  if (source === 'posts') {
    item = state.createdPosts.find(p => p.id === id);
  } else {
    item = state.historyItems.find(h => h.id === id);
  }

  if (!item) {
    alert('Publicación no encontrada.');
    return;
  }

  document.getElementById('editPostId').value = item.id;
  document.getElementById('editPostSource').value = source;
  document.getElementById('editPostTitle').value = item.title || item.groupName || 'Publicación NexaGuard';
  document.getElementById('editPostCategory').value = item.category || 'WordPress';
  document.getElementById('editPostMessage').value = item.message || item.messagePreview || '';
  document.getElementById('editPostGroupName').value = item.groupName || '';
  document.getElementById('editPostUrl').value = item.postUrl || item.groupUrl || 'https://www.facebook.com';
  document.getElementById('editPostMediaUrl').value = item.mediaUrl || item.imageUrl || '';

  updateEditCharCount();
  updateEditMediaPreview();

  document.getElementById('editPostModal').classList.add('active');
}

function closeEditPostModal() {
  document.getElementById('editPostModal').classList.remove('active');
}

function updateEditCharCount() {
  const val = document.getElementById('editPostMessage').value || '';
  const countBadge = document.getElementById('editPostCharCount');
  if (countBadge) countBadge.textContent = `${val.length} caracteres`;
}

function updateEditMediaPreview() {
  const url = document.getElementById('editPostMediaUrl').value.trim();
  const previewDiv = document.getElementById('editMediaPreview');
  if (!previewDiv) return;

  if (!url) {
    previewDiv.innerHTML = '';
    return;
  }

  const isVideo = /\.(mp4|mov|webm)$/i.test(url);
  if (isVideo) {
    previewDiv.innerHTML = `<video src="${url}" controls style="max-height:100px;border-radius:6px"></video>`;
  } else {
    previewDiv.innerHTML = `<img src="${url}" alt="Preview" style="max-height:100px;border-radius:6px;object-fit:cover">`;
  }
}

async function handleEditMediaUpload(e) {
  const file = e.target.files[0];
  if (!file) return;

  const formData = new FormData();
  formData.append('file', file);

  try {
    const res = await fetch('/api/upload-media', {
      method: 'POST',
      body: formData
    });
    const data = await res.json();
    if (data.ok) {
      document.getElementById('editPostMediaUrl').value = data.url;
      updateEditMediaPreview();
    } else {
      alert('Error al subir archivo: ' + data.error);
    }
  } catch (err) {
    alert('Error: ' + err.message);
  }
}

async function saveEditedPost() {
  const id = document.getElementById('editPostId').value;
  const source = document.getElementById('editPostSource').value;
  const title = document.getElementById('editPostTitle').value;
  const category = document.getElementById('editPostCategory').value;
  const message = document.getElementById('editPostMessage').value;
  const groupName = document.getElementById('editPostGroupName').value;
  const postUrl = document.getElementById('editPostUrl').value;
  const mediaUrl = document.getElementById('editPostMediaUrl').value;

  if (!message.trim()) {
    alert('El texto del post no puede estar vacío.');
    return;
  }

  const isVideo = /\.(mp4|mov|webm)$/i.test(mediaUrl);

  try {
    if (source === 'posts') {
      const res = await fetch(`/api/posts/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title,
          category,
          message,
          groupName,
          postUrl,
          mediaUrl,
          mediaType: isVideo ? 'video' : 'image'
        })
      });
      const data = await res.json();
      if (data.ok) {
        closeEditPostModal();
        loadCreatedPosts();
        appendTerminalLog('success', `[POST EDITADO] Cambios guardados para: "${title}"`);
      } else {
        alert('Error: ' + data.error);
      }
    } else {
      // Editar en historial
      const res = await fetch(`/api/history/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message,
          groupName,
          postUrl
        })
      });
      const data = await res.json();
      if (data.ok) {
        closeEditPostModal();
        loadHistory();
        appendTerminalLog('success', `[HISTORIAL EDITADO] Registro de historial actualizado.`);
      } else {
        alert('Error: ' + data.error);
      }
    }
  } catch (err) {
    alert('Error al guardar: ' + err.message);
  }
}

// Eliminar Post Creado
async function deleteCreatedPost(id) {
  if (!confirm('¿Estás seguro de que deseas eliminar este post de tu biblioteca?')) return;

  try {
    const res = await fetch(`/api/posts/${id}`, { method: 'DELETE' });
    const data = await res.json();
    if (data.ok) {
      loadCreatedPosts();
      appendTerminalLog('warn', `[POST ELIMINADO] Post ${id} eliminado de la biblioteca.`);
    } else {
      alert('Error al eliminar post: ' + data.error);
    }
  } catch (err) {
    alert('Error: ' + err.message);
  }
}

// Publicar un Post Creado de forma individual e inmediata
async function publishSinglePost(id) {
  const post = state.createdPosts.find(p => p.id === id);
  if (!post) return;

  if (!confirm(`¿Publicar inmediatamente el post "${post.title}" en Facebook?`)) return;

  try {
    appendTerminalLog('step', `[PUBLICACIÓN INDIVIDUAL] Iniciando posteo de "${post.title}"...`);
    const res = await fetch(`/api/posts/${id}/publish`, { method: 'POST' });
    const data = await res.json();
    if (data.ok) {
      appendTerminalLog('success', `🎉 ¡Post publicado exitosamente en Facebook!`);
      alert('¡Publicación realizada con éxito en el grupo de Facebook!');
      loadCreatedPosts();
      loadHistory();
    } else {
      appendTerminalLog('error', `❌ Error al publicar: ${data.error || (data.postResult ? data.postResult.message : '')}`);
      alert('Error al publicar: ' + (data.error || (data.postResult ? data.postResult.message : 'Error desconocido')));
    }
  } catch (err) {
    alert('Error al conectar con el servidor: ' + err.message);
  }
}

// Crear Nuevo Post Manual
function openCreatePostModal() {
  const select = document.getElementById('newPostGroupSelect');
  if (select) {
    select.innerHTML = '';
    state.groups.forEach(g => {
      const opt = document.createElement('option');
      opt.value = g.id;
      opt.textContent = `${g.name} (${g.category})`;
      select.appendChild(opt);
    });
  }
  document.getElementById('newPostTitle').value = '';
  document.getElementById('newPostMessage').value = '';
  document.getElementById('newPostUrl').value = state.groups[0] ? state.groups[0].url : 'https://www.facebook.com/groups';
  document.getElementById('createPostModal').classList.add('active');
}

function closeCreatePostModal() {
  document.getElementById('createPostModal').classList.remove('active');
}

async function saveNewCreatedPost() {
  const title = document.getElementById('newPostTitle').value.trim();
  const category = document.getElementById('newPostCategory').value;
  const message = document.getElementById('newPostMessage').value.trim();
  const groupId = document.getElementById('newPostGroupSelect').value;
  const postUrl = document.getElementById('newPostUrl').value.trim();

  if (!title || !message) {
    alert('Por favor ingresa un título y el contenido del post.');
    return;
  }

  const grp = state.groups.find(g => g.id === groupId);
  const groupName = grp ? grp.name : 'Grupo de Facebook';

  try {
    const res = await fetch('/api/posts', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        title,
        category,
        message,
        groupName,
        targetGroupIds: groupId ? [groupId] : [],
        postUrl: postUrl || (grp ? grp.url : 'https://www.facebook.com')
      })
    });
    const data = await res.json();
    if (data.ok) {
      closeCreatePostModal();
      loadCreatedPosts();
      appendTerminalLog('success', `[NUEVO POST] Creado exitosamente: "${title}"`);
    } else {
      alert('Error al crear post: ' + data.error);
    }
  } catch (err) {
    alert('Error: ' + err.message);
  }
}

// ==========================================================================
// 12. HISTORIAL DE PUBLICACIONES MEJORADO (CON ACCIONES, LINKS Y BORRADO)
// ==========================================================================
async function loadHistory() {
  try {
    const res = await fetch('/api/history');
    const data = await res.json();
    if (data.ok) {
      state.historyItems = data.history || [];
      renderHistoryGrid(state.historyItems);
      const countEl = document.getElementById('historyCountBadge');
      if (countEl) countEl.textContent = state.historyItems.length;
    }
  } catch (e) {
    console.error('Error cargando historial:', e);
  }
}

function renderHistoryGrid(history) {
  const grid = document.getElementById('historyGrid');
  if (!grid) return;
  grid.innerHTML = '';

  if (history.length === 0) {
    grid.innerHTML = '<div style="color:var(--muted);padding:30px;text-align:center;grid-column:1/-1">Aún no hay publicaciones registradas en el historial.</div>';
    return;
  }

  history.forEach(item => {
    const card = document.createElement('div');
    card.className = `history-card ${item.ok ? 'success' : 'failed'}`;
    const fbUrl = item.postUrl || item.groupUrl || 'https://www.facebook.com';

    card.innerHTML = `
      <div class="history-top">
        <span>${new Date(item.timestamp).toLocaleString()}</span>
        <span class="${item.ok ? 'tag-green' : 'log-line error'}">${item.ok ? '✓ Publicado' : '✗ Error'}</span>
      </div>
      <div class="history-title" onclick="openDirectFbPost('${escapeHtml(fbUrl)}')" title="Clic para ir directamente a este post en Facebook">
        ${escapeHtml(item.groupName || 'Grupo de Facebook')} ↗
      </div>
      <div class="history-msg">${escapeHtml(item.messagePreview || item.message || '')}</div>
      ${item.screenshot ? `<img src="${item.screenshot}" class="history-shot" alt="Comprobante" onclick="openImageModal('${item.screenshot}')" title="Clic para ampliar comprobante">` : ''}
      <div style="font-size:0.75rem;color:var(--muted)">${escapeHtml(item.details || '')}</div>

      <!-- Barra de acciones directas para cada post del historial -->
      <div class="history-actions-row">
        <button class="btn btn-primary btn-xs" onclick="openDirectFbPost('${escapeHtml(fbUrl)}')" title="Abrir publicación en Facebook">
          🔗 Ver en FB
        </button>
        <button class="btn btn-outline btn-xs" onclick="openFacebookPreviewModalById('${item.id}')" title="Ver vista previa realista de Facebook">
          👁️ Vista Previa
        </button>
        <button class="btn btn-outline btn-xs" onclick="openEditPostModal('${item.id}', 'history')" title="Editar texto o enlace">
          ✏️ Editar
        </button>
        <button class="btn btn-danger btn-xs" onclick="deleteHistoryItem('${item.id}')" title="Eliminar del historial">
          🗑️
        </button>
      </div>
    `;
    grid.appendChild(card);
  });
}

async function deleteHistoryItem(id) {
  if (!confirm('¿Eliminar esta publicación del historial?')) return;
  try {
    const res = await fetch(`/api/history/${id}`, { method: 'DELETE' });
    const data = await res.json();
    if (data.ok) {
      loadHistory();
      appendTerminalLog('warn', `[HISTORIAL] Publicación eliminada del historial.`);
    }
  } catch (err) {
    alert('Error al eliminar: ' + err.message);
  }
}

async function clearAllHistory() {
  if (!confirm('¿Estás seguro de que deseas VACIAR TODO el historial de publicaciones?')) return;
  try {
    const res = await fetch('/api/history', { method: 'DELETE' });
    const data = await res.json();
    if (data.ok) {
      loadHistory();
      appendTerminalLog('warn', `[HISTORIAL] Todo el historial ha sido vaciado.`);
    }
  } catch (err) {
    alert('Error: ' + err.message);
  }
}

function openImageModal(src) {
  document.getElementById('modalFullImage').src = src;
  document.getElementById('imageModal').classList.add('active');
}

function closeImageModal() {
  document.getElementById('imageModal').classList.remove('active');
}

function escapeHtml(str) {
  if (!str) return '';
  return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

// ==========================================================================
// 13. AUTO-DETECCIÓN DE NICHO & MARCA POR URL
// ==========================================================================
let lastScannedNicheData = null;

async function scanTargetUrlNiche() {
  const urlInput = document.getElementById('targetNicheUrl');
  const url = urlInput ? urlInput.value.trim() : '';
  if (!url) {
    alert('Por favor ingresa la URL de la web o marca a analizar.');
    return;
  }

  const btn = document.getElementById('btnScanUrlNiche');
  const badge = document.getElementById('detectedNicheBadge');
  if (btn) btn.disabled = true;
  if (badge) {
    badge.textContent = 'Analizando sitio con IA...';
    badge.className = 'badge-info';
  }

  appendTerminalLog('step', `🌐 [IA NICHE] Rastreador semántico analizando: ${url}...`);

  try {
    const res = await fetch('/api/niche/scan-url', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ url })
    });
    const data = await res.json();
    if (btn) btn.disabled = false;

    if (data.ok) {
      lastScannedNicheData = data;
      if (badge) {
        badge.textContent = `✓ Nicho: ${data.nicheName}`;
        badge.className = 'opt-val tag-green';
      }

      const drawer = document.getElementById('urlNicheResultsDrawer');
      if (drawer) drawer.style.display = 'block';

      document.getElementById('nicheBrandText').textContent = data.brand;
      document.getElementById('nicheCategoryText').textContent = data.nicheName;
      document.getElementById('nicheLangText').textContent = `${data.langName} (${data.detectedLang.toUpperCase()})`;

      renderNichePostsList(data.generatedPosts, data.brand, data.nicheName, data.url);
      appendTerminalLog('success', `[IA NICHE] Análisis completado. Marca: "${data.brand}" | Nicho: "${data.nicheName}" | 3 Campañas Generadas.`);
    } else {
      if (badge) badge.textContent = 'Error al analizar';
      alert('Error al escanear URL: ' + data.error);
    }
  } catch (err) {
    if (btn) btn.disabled = false;
    alert('Error al conectar: ' + err.message);
  }
}

function renderNichePostsList(posts, brand, nicheName, url) {
  const container = document.getElementById('nicheOptionsList');
  if (!container) return;
  container.innerHTML = '';

  posts.forEach((p, idx) => {
    const item = document.createElement('div');
    item.className = 'niche-post-choice';
    item.innerHTML = `
      <div style="flex:1">
        <div class="niche-choice-title">${escapeHtml(p.title)}</div>
        <div class="niche-choice-sub">${escapeHtml(p.type)} · Enfoque específico para ${escapeHtml(brand)}</div>
      </div>
      <div style="display:flex;gap:6px">
        <button type="button" class="btn btn-primary btn-xs" onclick="applyNichePostToComposer(${idx})" title="Cargar este post en el editor">
          ✍️ Cargar al Redactor
        </button>
        <button type="button" class="btn btn-outline btn-xs" onclick="saveNichePostDirectly(${idx})" title="Guardar directamente en biblioteca de posts">
          💾 Guardar
        </button>
      </div>
    `;
    container.appendChild(item);
  });
}

function applyNichePostToComposer(index) {
  if (!lastScannedNicheData || !lastScannedNicheData.generatedPosts[index]) return;
  const post = lastScannedNicheData.generatedPosts[index];
  const textarea = document.getElementById('postSpintax');
  if (textarea) {
    textarea.value = post.spintax;
    updateSpintaxPreview();
    appendTerminalLog('success', `[REDACTOR] Cargada campaña de IA para nicho: "${post.title}"`);
    alert(`¡Campaña "${post.title}" cargada en el Redactor! Puedes publicar en Facebook, Instagram o guardarla.`);
  }
}

async function saveNichePostDirectly(index) {
  if (!lastScannedNicheData || !lastScannedNicheData.generatedPosts[index]) return;
  const post = lastScannedNicheData.generatedPosts[index];

  try {
    const res = await fetch('/api/posts', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        title: post.title,
        category: lastScannedNicheData.nicheName,
        message: post.spintax,
        groupName: `${lastScannedNicheData.brand} (${lastScannedNicheData.nicheName})`,
        postUrl: lastScannedNicheData.url
      })
    });
    const data = await res.json();
    if (data.ok) {
      loadCreatedPosts();
      appendTerminalLog('success', `[GUARDADO] Post guardado en biblioteca.`);
      alert('¡Campaña generada y guardada exitosamente en la pestaña de "Posts Creados"!');
    }
  } catch (e) {
    alert('Error: ' + e.message);
  }
}
