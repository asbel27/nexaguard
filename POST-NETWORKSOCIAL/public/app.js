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
  tableSearchQuery: ''
};

document.addEventListener('DOMContentLoaded', () => {
  initTabs();
  loadStatus();
  loadComplianceStatus();
  loadAutopilotStatus();
  loadTemplates();
  loadGroups();
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

// 8. Subida de Imagen Creativa
async function handleImageUpload(e) {
  const file = e.target.files[0];
  if (!file) return;

  const formData = new FormData();
  formData.append('image', file);

  try {
    appendTerminalLog('info', `Subiendo imagen: ${file.name}...`);
    const res = await fetch('/api/upload-image', {
      method: 'POST',
      body: formData
    });
    const data = await res.json();
    if (data.ok) {
      state.attachedImagePath = data.path;
      document.getElementById('attachedImageName').textContent = file.name;
      document.getElementById('imagePreviewImg').src = data.url;
      document.getElementById('imagePreviewContainer').style.display = 'block';
      appendTerminalLog('success', `Imagen cargada con éxito.`);
    } else {
      alert('Error al subir imagen: ' + data.error);
    }
  } catch (err) {
    alert('Error de subida: ' + err.message);
  }
}

function removeAttachedImage() {
  state.attachedImagePath = null;
  document.getElementById('imageFileInput').value = '';
  document.getElementById('attachedImageName').textContent = 'Ninguna imagen seleccionada';
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

// 11. Historial de Publicaciones
async function loadHistory() {
  try {
    const res = await fetch('/api/history');
    const data = await res.json();
    if (data.ok) {
      renderHistoryGrid(data.history);
      document.getElementById('historyCountBadge').textContent = data.history.length;
    }
  } catch (e) {
    console.error('Error cargando historial:', e);
  }
}

function renderHistoryGrid(history) {
  const grid = document.getElementById('historyGrid');
  grid.innerHTML = '';

  if (history.length === 0) {
    grid.innerHTML = '<div style="color:var(--muted);padding:20px;grid-column:1/-1">Aún no hay publicaciones registradas en el historial.</div>';
    return;
  }

  history.forEach(item => {
    const card = document.createElement('div');
    card.className = `history-card ${item.ok ? 'success' : 'failed'}`;
    card.innerHTML = `
      <div class="history-top">
        <span>${new Date(item.timestamp).toLocaleString()}</span>
        <span class="${item.ok ? 'tag-green' : 'log-line error'}">${item.ok ? '✓ Publicado' : '✗ Error'}</span>
      </div>
      <div class="history-title">${escapeHtml(item.groupName || 'Grupo')}</div>
      <div class="history-msg">${escapeHtml(item.messagePreview || '')}</div>
      ${item.screenshot ? `<img src="${item.screenshot}" class="history-shot" alt="Comprobante" onclick="openImageModal('${item.screenshot}')">` : ''}
      <div style="font-size:0.75rem;color:var(--muted)">${escapeHtml(item.details || '')}</div>
    `;
    grid.appendChild(card);
  });
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
