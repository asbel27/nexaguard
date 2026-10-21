<?php
if (!defined('ABSPATH')) {
    exit;
}
$license = get_option('nexaguard_license_data', null);
$has_license = !empty($license) && !empty($license['valid']) && !empty($license['key']);
?>

<!-- Modal de Cambio / Ingreso de Licencia -->
<div id="license-modal" class="ng-modal" style="display:none;">
    <div class="ng-modal-box">
        <h3>🔑 Activar Licencia NexaGuard</h3>
        <p>Introduce tu clave de licencia oficial o activa tu Licencia Comunitaria Gratuita:</p>
        <div class="ng-modal-fld">
            <input type="text" id="input-license-key" class="in-ng" placeholder="Ej: NXG-PRO-XXXX-XXXX" value="<?php echo esc_attr($has_license ? $license['key'] : ''); ?>">
        </div>
        <p id="license-modal-msg" class="modal-msg"></p>
        <div class="ng-modal-acts" style="display:flex; justify-content:space-between; align-items:center; flex-wrap:gap; gap:8px;">
            <div style="display:flex; gap:8px;">
                <button type="button" id="btn-save-license" class="btn-ng btn-ng-primary">Verificar y Guardar</button>
                <button type="button" id="btn-close-license" class="btn-ng btn-ng-outline">Cancelar</button>
            </div>
            <button type="button" id="btn-get-free-license" class="btn-ng btn-ng-link" style="color:#3de8a4; font-size:0.82rem; font-weight:700;">🛡️ Activar Licencia Gratuita (1-Clic)</button>
        </div>
    </div>
</div>

<!-- Modal Interactivo y Estilizado de Confirmación NexaGuard (Reemplaza confirm() nativo) -->
<div id="nexaguard-confirm-modal" class="ng-modal" style="display:none; z-index:9999999 !important;">
    <div class="ng-modal-box" style="max-width:520px; border:1.5px solid rgba(255,207,51,0.5); box-shadow:0 25px 60px rgba(0,0,0,0.85), 0 0 30px rgba(255,207,51,0.15);">
        <div style="display:flex; align-items:center; gap:12px; margin-bottom:14px;">
            <span id="ng-confirm-icon" style="font-size:2rem; line-height:1;">🛡️</span>
            <div>
                <h3 id="ng-confirm-title" style="margin:0; font-size:1.2rem; color:#ffffff;">Confirmación de Seguridad</h3>
                <small style="color:#ffcf33; font-weight:700; font-size:0.75rem; letter-spacing:0.04em;">NEXAGUARD INTELLIGENT FORENSICS</small>
            </div>
        </div>
        <p id="ng-confirm-message" style="color:#dbe4ff; font-size:0.92rem; line-height:1.6; margin:0 0 20px; white-space:pre-line;"></p>
        <div class="ng-modal-acts" style="display:flex; gap:10px; justify-content:flex-end; border-top:1px solid rgba(255,255,255,0.08); padding-top:16px;">
            <button type="button" id="ng-confirm-cancel-btn" class="btn-ng btn-ng-outline" style="min-width:105px;">Cancelar</button>
            <button type="button" id="ng-confirm-ok-btn" class="btn-ng btn-ng-primary" style="min-width:140px;">Continuar</button>
        </div>
    </div>
</div>

<!-- ======================================================================= -->
<!-- MODAL INTERACTIVO: RESUMEN FORENSE DE AMENAZAS EN EL RADAR             -->
<!-- ======================================================================= -->
<div id="threat-summary-modal" class="ng-modal" style="display:none; z-index:9999999 !important;">
    <div class="ng-modal-box threat-summary-box">
        <!-- Encabezado táctico de alto contraste -->
        <div class="tsm-header">
            <div class="tsm-title-area">
                <div class="tsm-icon-box">🛡️</div>
                <div>
                    <div class="tsm-badge">RADAR FORENSE ACTIVO // RESUMEN TÁCTICO</div>
                    <h3 class="tsm-heading">Amenazas e Intrusiones Interceptadas</h3>
                    <p class="tsm-subheading">Auditoría perimetral de vectores hostiles mitigados en tiempo real por NexaGuard WAF.</p>
                </div>
            </div>
            <button type="button" class="tsm-close" id="btn-close-threat-summary" title="Cerrar resumen">✕</button>
        </div>

        <!-- Tarjetas KPI de alto contraste -->
        <div class="tsm-stats-grid">
            <div class="tsm-stat-card tsm-stat-total">
                <div class="tsm-stat-icon">🚨</div>
                <div class="tsm-stat-content">
                    <span class="tsm-stat-num" id="tsm-stat-total">0</span>
                    <span class="tsm-stat-title">Ataques Bloqueados</span>
                </div>
            </div>
            <div class="tsm-stat-card tsm-stat-scanners">
                <div class="tsm-stat-icon">🐉</div>
                <div class="tsm-stat-content">
                    <span class="tsm-stat-num" id="tsm-stat-scanners">0</span>
                    <span class="tsm-stat-title">Kali Linux / Scanners</span>
                </div>
            </div>
            <div class="tsm-stat-card tsm-stat-waf">
                <div class="tsm-stat-icon">⚡</div>
                <div class="tsm-stat-content">
                    <span class="tsm-stat-num" id="tsm-stat-waf" style="color:#00ff88;">100%</span>
                    <span class="tsm-stat-title">Mitigación WAF (403)</span>
                </div>
            </div>
        </div>

        <!-- Barra de herramientas de la lista -->
        <div class="tsm-toolbar">
            <div class="tsm-toolbar-label">
                <span>📋 HISTORIAL CRONOLÓGICO DE INTRUSIONES</span>
                <span class="tsm-badge-count" id="tsm-badge-count">0 eventos</span>
            </div>
            <div class="tsm-toolbar-actions">
                <button type="button" class="btn-tsm-export" id="btn-tsm-export-csv" title="Descargar informe forense completo en formato CSV">
                    📥 Exportar CSV
                </button>
                <button type="button" class="btn-tsm-export" id="btn-tsm-export-json" title="Descargar registro forense en formato JSON">
                    📥 Exportar JSON
                </button>
                <button type="button" class="btn-ng btn-ng-outline btn-tsm-clear" id="btn-tsm-clear-logs" title="Vaciar registro del radar">
                    🗑️ Vaciar Historial
                </button>
            </div>
        </div>

        <!-- Feed scrollable con diseño hacker de alto contraste -->
        <div class="tsm-feed-scroll" id="tsm-feed-container">
            <!-- Inyectado dinámicamente vía JavaScript -->
        </div>

        <!-- Pie de modal -->
        <div class="tsm-footer">
            <div class="tsm-footer-meta">
                <span class="tsm-dot-live"></span>
                <span class="tsm-footer-text">Sensores perimetrales monitoreando puertos HTTP/HTTPS y REST API activamente.</span>
            </div>
            <button type="button" class="btn-ng btn-ng-primary" id="btn-close-threat-summary-foot">
                Entendido / Cerrar
            </button>
        </div>
    </div>
</div>
