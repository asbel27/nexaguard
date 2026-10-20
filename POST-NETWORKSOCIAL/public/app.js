/**
 * NexaGuard Social AutoPoster · Frontend State & Logic (Con Detección de Grupos & Selección Múltiple)
 */

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
  loadStatus();
  loadComplianceStatus();
  loadAutopilotStatus();
  loadTemplates();
  loadGroups();
  loadCreatedPosts();
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
      if (data.profileExists) {
        sessionBadge.querySelector('.status-dot').className = 'status-dot green';
        sessionText.textContent = 'Perfil Sesión Activo';
      } else {
        sessionBadge.querySelector('.status-dot').className = 'status-dot yellow';
        sessionText.textContent = 'Requiere Login Inicial';
      }

      if (data.activeCampaign && data.activeCampaign.running) {
        setCampaignUI(true);
      }
    }
  } catch (e) {
    console.error('Error cargando status:', e);
  }
}

// 3. Abrir Ventana de Inicio de Sesión
async function openLoginWindow(platform) {
  try {
    appendTerminalLog('info', `[SISTEMA] Abriendo navegador para iniciar sesión en ${platform.toUpperCase()}...`);
    const res = await fetch('/api/browser/open', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ platform })
    });
    const data = await res.json();
    if (data.ok) {
      alert(`Se abrió Google Chrome en ${platform}. Por favor ingresa tus credenciales y cuando estés dentro, puedes cerrar la ventana.`);
      loadStatus();
    } else {
      alert('Error: ' + data.error);
    }
  } catch (e) {
    alert('No se pudo abrir el navegador: ' + e.message);
  }
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
      alert('Error al detectar grupos: ' + data.error);
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
        <span>${escapeHtml(g.name)}</span>
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

  document.getElementById('groupsCountBadge').textContent = state.groups.length;

  const filtered = state.groups.filter(g => {
    if (!state.tableSearchQuery) return true;
    return g.name.toLowerCase().includes(state.tableSearchQuery.toLowerCase()) || (g.category || '').toLowerCase().includes(state.tableSearchQuery.toLowerCase());
  });

  filtered.forEach(g => {
    const tr = document.createElement('tr');
    const isMember = g.isMember !== false;

    tr.innerHTML = `
      <td>
        <label class="switch">
          <input type="checkbox" ${g.enabled ? 'checked' : ''} onchange="toggleGroupStatus('${g.id}', this.checked)">
          <span class="slider"></span>
        </label>
      </td>
      <td><strong>${escapeHtml(g.name)}</strong></td>
      <td><a href="${escapeHtml(g.url)}" target="_blank" style="color:var(--cyan);text-decoration:none">${escapeHtml(g.url)}</a></td>
      <td><span class="badge-info">${escapeHtml(g.category || 'General')}</span></td>
      <td>${isMember ? '<span class="tag-member">✓ Vinculado</span>' : '<span class="tag-autojoin">➕ Auto-Join al Publicar</span>'}</td>
      <td><strong>${g.postCount || 0}</strong></td>
      <td><small style="color:var(--muted)">${g.lastPosted ? new Date(g.lastPosted).toLocaleString() : 'Nunca'}</small></td>
      <td>
        <button class="btn btn-danger btn-xs" onclick="deleteGroup('${g.id}')">Eliminar</button>
      </td>
    `;
    tbody.appendChild(tr);
  });
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

async function generateAiBanner() {
  const presetSelect = document.getElementById('bannerPresetSelect');
  const presetId = presetSelect ? presetSelect.value : 'rescate-urgente';
  appendTerminalLog('step', `[IA CREATIVA] Sintetizando banner publicitario con temática "${presetId}"...`);

  try {
    const res = await fetch('/api/creative/generate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ presetId, format: 'fb' })
    });
    const data = await res.json();
    if (data.ok) {
      state.attachedImagePath = data.filePath;
      document.getElementById('attachedImageName').textContent = `Banner IA: ${data.preset.title.slice(0, 26)}...`;
      document.getElementById('imagePreviewImg').src = data.publicUrl;
      document.getElementById('imagePreviewContainer').style.display = 'block';
      appendTerminalLog('success', `[IA CREATIVA] Banner generado exitosamente (1200x630 px) y adjuntado al post.`);
    } else {
      alert('Error al generar banner: ' + data.error);
    }
  } catch (err) {
    alert('Error al generar imagen con IA: ' + err.message);
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
    }
  } catch (e) {
    console.error('Error cargando posts creados:', e);
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
    const statusTag = isPublished 
      ? '<span class="tag-badge tag-published">✓ Publicado en FB</span>' 
      : '<span class="tag-badge tag-ready">● Listo</span>';
    
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
