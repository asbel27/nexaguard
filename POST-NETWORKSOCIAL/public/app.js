/**
 * NexaGuard Social AutoPoster · Frontend State & Logic
 */

let state = {
  groups: [],
  templates: [],
  attachedImagePath: null,
  activeCampaign: false,
  logSource: null
};

document.addEventListener('DOMContentLoaded', () => {
  initTabs();
  loadStatus();
  loadTemplates();
  loadGroups();
  loadHistory();
  initSpintaxEvents();
  initLogStream();
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

      if (tabId === 'tab-groups') loadGroups();
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
      alert(`Se abrió Google Chrome en ${platform}. Por favor ingresa tus credenciales y cuando estés dentro, puedes cerrar la ventana o dejarla abierta.`);
      loadStatus();
    } else {
      alert('Error: ' + data.error);
    }
  } catch (e) {
    alert('No se pudo abrir el navegador: ' + e.message);
  }
}

// 4. Plantillas
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

      // Seleccionar la primera por defecto
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

// 5. Spintax Tester y Previsualización
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

// 6. Subida de Imagen Creativa
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

// 7. Gestión de Grupos
async function loadGroups() {
  try {
    const res = await fetch('/api/groups');
    const data = await res.json();
    if (data.ok) {
      state.groups = data.groups;
      renderGroupsTable();
      updateSelectedGroupsCount();
    }
  } catch (e) {
    console.error('Error cargando grupos:', e);
  }
}

function renderGroupsTable() {
  const tbody = document.getElementById('groupsTableBody');
  tbody.innerHTML = '';

  document.getElementById('groupsCountBadge').textContent = state.groups.length;

  state.groups.forEach(g => {
    const tr = document.createElement('tr');
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
      <td><strong>${g.postCount || 0}</strong></td>
      <td><small style="color:var(--muted)">${g.lastPosted ? new Date(g.lastPosted).toLocaleString() : 'Nunca'}</small></td>
      <td>
        <button class="btn btn-danger btn-xs" onclick="deleteGroup('${g.id}')">Eliminar</button>
      </td>
    `;
    tbody.appendChild(tr);
  });
}

function updateSelectedGroupsCount() {
  const activeCount = state.groups.filter(g => g.enabled).length;
  document.getElementById('selectedGroupsCount').textContent = `${activeCount} grupos seleccionados`;
}

async function toggleGroupStatus(id, enabled) {
  try {
    await fetch(`/api/groups/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ enabled })
    });
    const g = state.groups.find(x => x.id === id);
    if (g) g.enabled = enabled;
    updateSelectedGroupsCount();
  } catch (e) {}
}

async function deleteGroup(id) {
  if (!confirm('¿Estás seguro de eliminar este grupo de tu lista?')) return;
  try {
    await fetch(`/api/groups/${id}`, { method: 'DELETE' });
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
      body: JSON.stringify({ name: name || 'Grupo Facebook', url, category })
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

// 8. Campaña de Auto-Publicación
async function startCampaign() {
  const spintaxText = document.getElementById('postSpintax').value.trim();
  if (!spintaxText) {
    alert('Por favor escribe o selecciona un mensaje para publicar.');
    return;
  }

  const activeGroups = state.groups.filter(g => g.enabled);
  if (activeGroups.length === 0) {
    alert('No tienes ningún grupo activado para publicar. Ve a la pestaña "Gestor de Grupos" y activa al menos uno.');
    return;
  }

  if (!confirm(`¿Iniciar la campaña de auto-posteo en ${activeGroups.length} grupos de Facebook? Se utilizarán pausas de seguridad automáticas.`)) {
    return;
  }

  try {
    setCampaignUI(true);
    appendTerminalLog('step', `[INICIO] Lanzando campaña para ${activeGroups.length} grupos...`);

    const res = await fetch('/api/campaign/start', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        spintaxText,
        imagePath: state.attachedImagePath,
        selectedGroupIds: activeGroups.map(g => g.id)
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

// 9. Streaming de Logs en Tiempo Real (SSE)
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
  const line = document.createElement('div');
  line.className = `log-line ${type}`;
  const time = new Date().toLocaleTimeString();
  line.textContent = `[${time}] ${msg}`;
  terminal.appendChild(line);
  terminal.scrollTop = terminal.scrollHeight;
}

function clearTerminalLogs() {
  document.getElementById('terminalLogs').innerHTML = '<div class="log-line info">[SISTEMA] Consola limpia.</div>';
}

// 10. Historial de Publicaciones
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
