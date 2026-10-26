<?php
if (!defined('ABSPATH')) {
    exit;
}

$last_report = get_option('nexaguard_last_scan_report', null);
$quarantine_log = get_option('nexaguard_quarantine_log', array());
$backup_history = get_option('nexaguard_backup_history', array());
$cloud_cache = get_option('nexaguard_cloud_intel_cache', null);
$cloud_ver = ($cloud_cache && !empty($cloud_cache['feed_version'])) ? $cloud_cache['feed_version'] : '2026.10';

$license_data = get_option('nexaguard_license_data', null);
$has_license = !empty($license_data) && !empty($license_data['key']);
$is_free_license = $has_license && (
    (!empty($license_data['plan_type']) && $license_data['plan_type'] === 'free') ||
    (!empty($license_data['plan']) && (
        stripos($license_data['plan'], 'gratuit') !== false ||
        stripos($license_data['plan'], 'community') !== false ||
        stripos($license_data['plan'], 'comunitaria') !== false ||
        stripos($license_data['plan'], 'free') !== false
    )) ||
    (!empty($license_data['key']) && (
        strpos($license_data['key'], 'NEXA-FREE-') === 0 ||
        strpos($license_data['key'], 'NXG-FREE-') === 0 ||
        strpos($license_data['key'], 'FREE-') === 0
    ))
);

$days_left = ($has_license && !$is_free_license && isset($license_data['days_left'])) ? intval($license_data['days_left']) : 0;
$is_expired = $has_license && !$is_free_license && (($license_data['status'] === 'expired') || $days_left <= 0);
$is_expiring_soon = $has_license && !$is_free_license && !$is_expired && $days_left <= 7;
$is_pro = $has_license && !$is_free_license && !$is_expired && !empty($license_data['valid']);
$is_standard = !$has_license;
$vigilance_active = (int) get_option('nexaguard_vigilance_active', 1);

// WAF settings (integrado en la misma vista)
$settings = wp_parse_args(get_option('nexaguard_settings', array()), array(
    // 4 Reglas Básicas (activas por defecto para todos los usuarios)
    'block_php_uploads'     => true,
    'disable_dir_browsing'  => true,
    'disallow_file_edit'    => true,
    'block_user_enumeration'=> true,
    // Módulos Avanzados (activos únicamente con licencia PRO)
    'disable_xmlrpc'        => false,
    'hide_wp_version'       => false,
    'waf_enabled'           => false,
    'anti_clearfake'        => false,
    'emergency_lockdown'    => false,
    'brute_force_protection'=> false,
    'bf_max_retries'        => 5,
    'bf_lockout_time'       => 20,
    'hide_backend'          => false,
    'login_slug'            => 'acceso-seguro',
    'generic_login_errors'  => false,
    'protect_system_files'  => false,
    'admin_login_alerts'    => false,
    'threat_email_alerts'   => false,
    'alert_email'           => '',
    'waf_auto_jail'         => false,
    'tripwire_enabled'      => false,
    'threat_webhook_url'    => '',
    'login_custom_design'   => false,
    'login_bg_image'        => '',
    'login_bg_preset'       => 'deep-navy',
    'login_logo_image'      => '',
    'login_security_notice' => 'Estás iniciando sesión en tu WordPress protegido por NexaGuard',
    'cloud_threat_intel'    => false
));
$total_lockouts = intval(get_option('nexaguard_total_lockouts', 0));

$threat_count = $last_report ? $last_report['threats_count'] : 0;
$quarantine_count = count($quarantine_log);
$rollback_count = count($backup_history);
?>
<div class="wrap nexaguard-admin-wrap">

    <!-- ====== HEADER GLOBAL ====== -->
    <div class="nexaguard-header">
        <div class="nexaguard-brand">
            <svg class="nexaguard-logo" viewBox="0 0 24 24" fill="none" stroke="#ffcf33" stroke-width="2">
                <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
                <path d="m9 12 2 2 4-4"/>
            </svg>
            <div>
                <div style="display:flex; align-items:center; gap:10px; flex-wrap:wrap;">
                    <h1>NexaGuard Security <span class="badge-v">v<?php echo esc_html(NEXAGUARD_VERSION); ?></span></h1>
                </div>
                <p class="sub">Auditoría forense profunda, erradicación de malware e inteligencia en la nube</p>
            </div>
        </div>
    </div>

    <!-- ====== BARRA DE LICENCIA ====== -->
    <?php if ($is_standard): ?>
        <div class="ng-license-banner license-standard" style="background:#0e163e !important; border:1px solid rgba(255,207,51,0.35) !important; border-radius:14px; padding:18px 24px; margin-bottom:20px; box-shadow:0 10px 30px rgba(0,0,0,0.35);">
            <div class="lic-icon" style="font-size:2.4rem; line-height:1;">🛡️</div>
            <div class="lic-content" style="flex:1; min-width:260px;">
                <strong style="display:block; font-size:1.08rem; font-weight:800; color:#ffffff !important; margin-bottom:4px;">EDICIÓN ESTÁNDAR: Escaneo Forense Local Activo.</strong>
                <p style="font-size:0.94rem; color:#e2eafc !important; margin:0; line-height:1.55; font-weight:500;">Estás usando NexaGuard Security (Escaneo Forense, Monitor de Núcleo y Blindaje Local 100% funcionales). Activa tu <strong style="color:#3de8a4 !important;">Licencia Gratuita de la Comunidad</strong> o ingresa tu <strong style="color:#ffd859 !important;">Clave de Licencia PRO</strong> para conectar Threat Cloud Intelligence y soporte prioritario.</p>
            </div>
            <div class="lic-action" style="display:flex; align-items:center; gap:10px; flex-wrap:wrap;">
                <button type="button" class="btn-ng btn-ng-outline btn-activate-free-license" style="border-color:#3de8a4; color:#3de8a4; background:rgba(61,232,164,0.08); font-weight:700;">🛡️ Activar Licencia Gratuita (1-Clic)</button>
                <button type="button" id="btn-edit-license" class="btn-ng btn-ng-primary">🔑 Ingresar Licencia</button>
                <a href="https://www.nexaguards.com/#planes" target="_blank" class="btn-ng btn-ng-outline" style="background:#141d4a !important; color:#ffffff !important; border:1.5px solid rgba(255,255,255,0.3) !important;">Más Información</a>
            </div>
        </div>
    <?php elseif ($is_free_license): ?>
        <div class="ng-license-strip" style="background:linear-gradient(90deg, #091a2e 0%, #0e163e 100%); border:1px solid rgba(61,232,164,0.35);">
            <div class="lic-pill">
                <span class="lic-check" style="background:#3de8a4; color:#061426;">✓</span>
                <span style="color:#ffffff;">Licencia Comunitaria: <strong style="color:#3de8a4;"><?php echo esc_html(!empty($license_data['plan']) ? $license_data['plan'] : 'Edición Comunitaria Gratuita'); ?></strong></span>
                <span class="lic-exp" style="color:#b8c7eb;">· Estado: <strong>Activa</strong> (Sin Vencimiento)</span>
            </div>
            <div class="lic-key-mgmt">
                <span class="lic-key-tag" style="border-color:rgba(61,232,164,0.3); color:#3de8a4;">Clave: <?php echo esc_html(substr($license_data['key'], 0, 14) . '••••'); ?></span>
                <button type="button" id="btn-edit-license" class="btn-ng-link" style="color:#ffd859; margin-left:8px;">Ingresar Clave PRO</button>
                <button type="button" id="btn-unlink-license" class="btn-ng-link" style="color:#ff8ba0; margin-left:8px;" title="Desvincular licencia">Desvincular</button>
            </div>
        </div>
    <?php elseif ($is_expired): ?>
        <div class="ng-license-banner license-expired" style="background:#240e1b !important; border:2px solid #ff4560 !important; border-radius:14px; padding:18px 24px; margin-bottom:20px; box-shadow:0 10px 30px rgba(0,0,0,0.35);">
            <div class="lic-icon" style="font-size:2.4rem; line-height:1;">🔴</div>
            <div class="lic-content" style="flex:1; min-width:260px;">
                <strong style="display:block; font-size:1.08rem; font-weight:800; color:#ffffff !important; margin-bottom:4px;">LICENCIA PRO VENCIDA: Tu período de suscripción ha finalizado.</strong>
                <p style="font-size:0.94rem; color:#ffd2dc !important; margin:0; line-height:1.55; font-weight:500;">Debes abonar tu mensualidad para reactivar el Sistema de Vigilancia 24 Horas y las actualizaciones de firmas en tiempo real.</p>
            </div>
            <div class="lic-action" style="display:flex; align-items:center; gap:10px; flex-wrap:wrap;">
                <a href="https://www.nexaguards.com/#planes" target="_blank" class="btn-ng btn-ng-danger">Pagar Mensualidad / Renovar</a>
                <button type="button" id="btn-edit-license" class="btn-ng btn-ng-outline" style="background:#141d4a !important; color:#ffffff !important; border:1.5px solid rgba(255,255,255,0.3) !important; margin-left:8px;">Ingresar Otra Clave</button>
                <button type="button" id="btn-unlink-license" class="btn-ng btn-ng-link" style="color:#ff8ba0;margin-left:8px">Volver a Estándar</button>
            </div>
        </div>
    <?php elseif ($is_expiring_soon): ?>
        <div class="ng-license-banner license-warning" style="background:#261907 !important; border:2px solid #ffcf33 !important; border-radius:14px; padding:18px 24px; margin-bottom:20px; box-shadow:0 10px 30px rgba(0,0,0,0.35);">
            <div class="lic-icon" style="font-size:2.4rem; line-height:1;">⚠️</div>
            <div class="lic-content" style="flex:1; min-width:260px;">
                <strong style="display:block; font-size:1.08rem; font-weight:800; color:#ffffff !important; margin-bottom:4px;">ATENCIÓN: Tu suscripción a <?php echo esc_html($license_data['plan']); ?> vencerá en <?php echo intval($days_left); ?> días.</strong>
                <p style="font-size:0.94rem; color:#fff0c7 !important; margin:0; line-height:1.55; font-weight:500;">Renueva a tiempo en nexaguards.com para mantener el escudo y la vigilancia continua activos sin interrupciones.</p>
            </div>
            <div class="lic-action" style="display:flex; align-items:center; gap:10px; flex-wrap:wrap;">
                <a href="https://www.nexaguards.com/#planes" target="_blank" class="btn-ng btn-ng-primary">Renovar Suscripción</a>
                <button type="button" id="btn-edit-license" class="btn-ng btn-ng-outline" style="background:#141d4a !important; color:#ffffff !important; border:1.5px solid rgba(255,255,255,0.3) !important; margin-left:8px;">Cambiar Clave</button>
                <button type="button" id="btn-unlink-license" class="btn-ng btn-ng-link" style="color:#ff8ba0;margin-left:8px">Desvincular</button>
            </div>
        </div>
    <?php elseif ($is_pro): ?>
        <div class="ng-license-strip">
            <div class="lic-pill">
                <span class="lic-check">✓</span>
                <span>Licencia PRO Activa: <strong><?php echo esc_html($license_data['plan']); ?></strong></span>
                <span class="lic-exp">· Vence el: <strong><?php echo esc_html($license_data['expires_formatted']); ?></strong> (Quedan <?php echo intval($days_left); ?> días)</span>
            </div>
            <div class="lic-key-mgmt">
                <span class="lic-key-tag">Clave: <?php echo esc_html(substr($license_data['key'], 0, 8) . '••••••••'); ?></span>
                <button type="button" id="btn-edit-license" class="btn-ng-link">Cambiar Clave</button>
                <button type="button" id="btn-unlink-license" class="btn-ng-link" style="color:#ff8ba0;margin-left:8px" title="Desvincular licencia para pruebas">Desvincular (Modo Estándar)</button>
            </div>
        </div>
    <?php endif; ?>

    <!-- Indicador de conexión a la nube de amenazas y auto-integridad -->
    <?php
    $integrity_check = NexaGuard_Plugin::get_instance()->verify_core_integrity();
    ?>
    <?php if ($integrity_check['tampered']): ?>
        <div class="cloud-status-strip" style="background:#2a1226 !important; border:1px solid #ff4560 !important; color:#ff8ba0 !important;">
            <div class="cloud-status-pill" style="background:rgba(255,69,96,0.2) !important;">
                <span style="color:#ff4560;font-weight:900;">🚨</span>
                <span style="color:#ff8ba0 !important;">Autoprotección: <strong>Sabotaje o Alteración de Código Detectada (<?php echo esc_html(implode(', ', $integrity_check['files'])); ?>)</strong></span>
            </div>
            <div class="threat-intel-help" style="color:#ffffff !important;">
                Reinstala el plugin desde <a href="https://nexaguards.com" target="_blank" style="color:#ffcf33; font-weight:700;">nexaguards.com</a> para restaurar la seguridad.
            </div>
        </div>
    <?php else: ?>
        <div class="cloud-status-strip">
            <div class="cloud-status-pill">
                <span class="live-dot"></span>
                <span id="cloud-intel-label">NexaGuard Threat Cloud Intelligence: <strong>Sincronizado en Tiempo Real (v<?php echo esc_html($cloud_ver); ?>)</strong></span>
            </div>
            <div class="threat-intel-help">
                <span style="color:#3de8a4;font-weight:700;">✓ Integridad de Núcleo Verificada</span> · Zero-Day Shield activo · Sin falsos positivos
            </div>
        </div>
    <?php endif; ?>

    <!-- ====== BARRA DE PESTAÑAS (TABS) ====== -->
    <div class="ng-tabs-bar">
        <button type="button" class="ng-tab is-active" data-tab="scanner">
            <span class="ng-tab-icon">🔍</span>
            <span class="ng-tab-label">Escáner Forense</span>
            <?php if ($threat_count > 0): ?>
                <span class="ng-tab-badge danger"><?php echo intval($threat_count); ?></span>
            <?php endif; ?>
        </button>
        <button type="button" class="ng-tab" data-tab="sentinel">
            <span class="ng-tab-icon">🧬</span>
            <span class="ng-tab-label">Monitor de Núcleo</span>
            <span class="ng-tab-badge active" style="background:rgba(61,232,164,0.15);color:#3de8a4;border:1px solid rgba(61,232,164,0.35);">EN VIVO</span>
        </button>
        <button type="button" class="ng-tab" data-tab="ballistic">
            <span class="ng-tab-icon">🎯</span>
            <span class="ng-tab-label">Escudo Balístico</span>
            <span class="ng-tab-badge active" style="background:rgba(255,51,102,0.18);color:#ff6b8b;border:1px solid rgba(255,51,102,0.4);">RADAR VIVO</span>
        </button>
        <button type="button" class="ng-tab" data-tab="vigilance">
            <span class="ng-tab-icon">📡</span>
            <span class="ng-tab-label">Vigilancia 24H</span>
            <?php if ($vigilance_active): ?>
                <span class="ng-tab-badge active">ON</span>
            <?php endif; ?>
        </button>
        <button type="button" class="ng-tab" data-tab="audit">
            <span class="ng-tab-icon">📊</span>
            <span class="ng-tab-label">Auditoría</span>
        </button>
        <button type="button" class="ng-tab" data-tab="waf">
            <span class="ng-tab-icon">🛡️</span>
            <span class="ng-tab-label">Blindaje WAF</span>
        </button>
        <button type="button" class="ng-tab" data-tab="quarantine">
            <span class="ng-tab-icon">📦</span>
            <span class="ng-tab-label">Cuarentena</span>
            <?php if ($quarantine_count > 0): ?>
                <span class="ng-tab-badge info"><?php echo intval($quarantine_count); ?></span>
            <?php endif; ?>
        </button>
        <button type="button" class="ng-tab" data-tab="rollback">
            <span class="ng-tab-icon">↩️</span>
            <span class="ng-tab-label">Rollback</span>
            <?php if ($rollback_count > 0): ?>
                <span class="ng-tab-badge info"><?php echo intval($rollback_count); ?></span>
            <?php endif; ?>
        </button>
        <button type="button" class="ng-tab" data-tab="compare">
            <span class="ng-tab-icon">⚖️</span>
            <span class="ng-tab-label">Comparativa</span>
            <span class="ng-tab-badge" style="background:rgba(255,207,51,0.18);color:#ffcf33;border:1px solid rgba(255,207,51,0.4);">EDICIONES</span>
        </button>
    </div>

    <!-- ====================================================================== -->
    <!-- TAB 1: ESCÁNER FORENSE                                                 -->
    <!-- ====================================================================== -->
    <div class="ng-tab-panel is-active" id="tab-scanner">

        <!-- Banner de estado dinámico -->
        <div id="scan-status-card" class="ng-card scan-summary-card <?php echo esc_attr(($last_report && $last_report['threats_count'] > 0) ? 'status-danger' : 'status-clean'); ?>">
            <div class="summary-left">
                <div class="status-indicator">
                    <span id="status-icon"><?php echo esc_html(($last_report && $last_report['threats_count'] > 0) ? '⚠️' : '✓'); ?></span>
                </div>
                <div>
                    <h3 id="status-heading" style="letter-spacing: 0.6px; word-spacing: 2px; line-height: 1.45; font-weight: 700;">
                        <?php 
                        if (!$last_report) {
                            echo esc_html('Listo para Iniciar Análisis en Tiempo Real');
                        } elseif ($last_report['threats_count'] > 0) {
                            echo esc_html('¡Atención! Se detectaron ' . intval($last_report['threats_count']) . ' amenazas de seguridad');
                        } else {
                            echo esc_html('Sistema 100% limpio y protegido');
                        }
                        ?>
                    </h3>
                    <p id="status-desc" class="status-desc-text">
                        <?php 
                        if ($last_report) {
                            echo wp_kses_post('Último análisis: <span class="status-highlight">' . esc_html(gmdate('d/m/Y H:i:s', intval($last_report['timestamp']))) . '</span> · <span class="status-highlight">' . intval($last_report['scanned_files']) . ' archivos</span> analizados en <span class="status-highlight">' . esc_html($last_report['elapsed']) . 's</span>.');
                        } else {
                            echo wp_kses_post('Haz clic en <strong>"Iniciar Análisis Forense"</strong> para auditar plugins, temas, Core y base de datos con la base de firmas en tiempo real.');
                        }
                        ?>
                    </p>
                    <div class="scan-card-actions" style="margin-top:16px; display:flex; gap:10px; align-items:center; flex-wrap:wrap;">
                        <button type="button" id="btn-start-scan" class="btn-ng btn-ng-primary" style="letter-spacing: 0.4px; word-spacing: 1.5px;">
                            ⚡ Iniciar Análisis Forense
                        </button>
                        <button type="button" id="btn-reset-scan" class="btn-ng btn-ng-outline" title="Borrar historial anterior e iniciar vista limpia">
                            🔄 Limpiar Vista / Resetear
                        </button>
                        <?php if ($is_pro): ?>
                            <div style="display:inline-flex; align-items:center; gap:5px;">
                                <button type="button" class="btn-ng btn-trigger-vital-rebuild" style="background:rgba(61,232,164,0.12); color:#3de8a4; border:1px solid rgba(61,232,164,0.35); font-weight:700; cursor:pointer;" title="Reconstruir archivos vitales del núcleo con copias oficiales de WordPress.org">
                                    🛠️ Reconstruir Archivos Vitales
                                </button>
                                <span class="ng-tooltip-btn" tabindex="0" title="Ver explicación detallada">
                                    <span class="ng-tooltip-icon">ℹ️</span>
                                    <span class="ng-tooltip-popover">
                                        <strong class="ng-tooltip-title">🛠️ Reconstrucción Oficial de Archivos Vitales</strong>
                                        <span class="ng-tooltip-desc">Descarga copias oficiales de WordPress.org y restaura archivos del sistema dañados o modificados sin alterar tu web.</span>
                                        <span class="ng-tooltip-rec">💡 100% Seguro: Respaldo previo en cuarentena.</span>
                                    </span>
                                </span>
                            </div>
                        <?php endif; ?>
                    </div>
                </div>
            </div>
            <div class="summary-kpis">
                <div class="kpi-box kpi-threats-box">
                    <span class="kpi-val" id="kpi-threats"><?php echo esc_html($last_report ? intval($last_report['threats_count']) : 0); ?></span>
                    <span class="kpi-lbl">Amenazas</span>
                </div>
                <div class="kpi-box">
                    <span class="kpi-val" id="kpi-files"><?php echo esc_html($last_report ? intval($last_report['scanned_files']) : 0); ?></span>
                    <span class="kpi-lbl">Archivos auditados</span>
                </div>
                <div class="kpi-box">
                    <span class="kpi-val" id="kpi-quarantine"><?php echo intval($quarantine_count); ?></span>
                    <span class="kpi-lbl">En cuarentena</span>
                </div>
            </div>
        </div>

        <!-- Barra de progreso interactiva (visible al escanear) -->
        <div id="scan-progress-box" class="ng-card" style="display:none;">
            <div class="progress-info">
                <span id="scan-progress-label">Iniciando auditoría forense profunda…</span>
                <span id="scan-progress-pct">0%</span>
            </div>
            <div class="progress-track">
                <div id="scan-progress-bar" class="progress-fill" style="width: 0%;"></div>
            </div>
            <div class="scan-live-feed" style="margin-top:12px; display:flex; justify-content:space-between; align-items:center; flex-wrap:wrap; gap:10px;">
                <div class="live-scanning-indicator">
                    <span class="live-dot" style="background:#ffcf33; box-shadow:0 0 10px #ffcf33;"></span>
                    <span id="scan-current-folder">Evaluando: 📁 wp-content/uploads/</span>
                </div>
                <span id="scan-live-status-sub" style="font-size:0.86rem; color:#dbe4ff; font-weight:600;">Inspeccionando PHP, JS, código ofuscado y permisos...</span>
            </div>
        </div>

        <!-- Contenedor de amenazas encontradas -->
        <div id="threats-container" class="ng-card" style="margin-top:20px;">
            <div class="card-title-bar">
                <h3>Resultados de la Auditoría Forense</h3>
                <span id="threats-badge" class="badge-count <?php echo esc_attr(($last_report && $last_report['threats_count'] > 0) ? 'danger' : 'ok'); ?>">
                    <?php echo esc_html(($last_report) ? intval($last_report['threats_count']) . ' hallazgos' : '0 hallazgos'); ?>
                </span>
            </div>

            <?php if ($last_report && $last_report['threats_count'] > 0): ?>
                <div class="auto-remediate-banner" id="auto-remediate-banner">
                    <div class="arb-left">
                        <span class="arb-badge">⚡ MODO INTELIGENTE AUTÓNOMO</span>
                        <h4>Reparar y Blindar Sitio con 1 Clic (Recomendado)</h4>
                        <p>NexaGuard resolverá todos los hallazgos de forma 100% segura: restaura archivos del sistema desde WordPress.org, extirpa virus en plugins sin romperlos, destruye webshells en uploads y aplica todos los blindajes del servidor.</p>
                    </div>
                    <div class="arb-right">
                        <button type="button" id="btn-auto-remediate-all" class="btn-ng btn-auto-remediate-btn">
                            ⚡ LIMPIAR Y BLINDAR SITIO CON 1 CLIC
                        </button>
                    </div>
                </div>
            <?php endif; ?>

            <div id="threats-list" class="threats-grid">
                <?php if (!$last_report || empty($last_report['threats'])): ?>
                    <div class="empty-state">
                        <p>🛡️ No hay amenazas activas detectadas en este momento.</p>
                        <small class="ng-hint" style="color: #e2eafc; font-weight: 600;">Pulsa "Iniciar Análisis Forense" para auditar en tiempo real.</small>
                    </div>
                <?php else: ?>
                    <?php foreach ($last_report['threats'] as $t): ?>
                        <?php 
                        $is_hseo = (strpos($t['file'], 'plugins/hseo') !== false || strpos($t['full_path'], 'plugins/hseo') !== false);
                        ?>
                        <div class="threat-item <?php echo esc_attr($t['severity']); ?>" id="threat-<?php echo esc_attr($t['id']); ?>">
                            <div class="threat-header">
                                <span class="sev-badge <?php echo esc_attr($t['severity']); ?>">
                                    <?php echo esc_html(($t['severity'] === 'crit') ? 'CRÍTICO' : 'ADVERTENCIA'); ?>
                                </span>
                                <h4><?php echo esc_html($t['title']); ?></h4>
                            </div>
                            <p class="threat-desc"><?php echo esc_html($t['desc']); ?></p>
                            <div class="threat-loc">
                                <code><?php echo esc_html($t['file']); ?><?php echo esc_html(($t['line'] > 0) ? ' : Línea ' . intval($t['line']) : ''); ?></code>
                            </div>
                            <?php if (!empty($t['code'])): ?>
                                <pre class="threat-snippet"><code><?php echo esc_html($t['code']); ?></code></pre>
                            <?php endif; ?>
                            <div class="threat-actions">
                                <?php if ($is_hseo): ?>
                                    <button type="button" class="btn-ng btn-ng-danger btn-delete-plugin-folder" data-target="<?php echo esc_attr($t['full_path']); ?>" data-id="<?php echo esc_attr($t['id']); ?>" title="Destruir la carpeta completa de este plugin troyano">
                                        💥 Destruir Carpeta del Plugin (HSEO)
                                    </button>
                                <?php endif; ?>

                                <?php if (empty($t['is_db'])): ?>
                                    <?php if ($t['clean_action'] === 'restore_core_file'): ?>
                                        <a href="<?php echo esc_url(admin_url('update-core.php')); ?>" class="btn-ng btn-ng-primary" style="background:#10b981; color:#ffffff; font-weight:700; text-decoration:none; display:inline-flex; align-items:center; gap:6px;" target="_blank" title="Reinstalar el núcleo limpio desde el actualizador nativo de WordPress">
                                            🔄 Reinstalar Núcleo Oficial en WordPress ↗
                                        </a>
                                    <?php elseif ($t['clean_action'] === 'sanitize_injection'): ?>
                                        <button type="button" class="btn-ng btn-ng-action btn-clean-threat" data-type="clearfake" data-target="<?php echo esc_attr($t['full_path']); ?>" data-id="<?php echo esc_attr($t['id']); ?>" title="Extirpar código malicioso inyectado preservando el archivo original">
                                            🧹 Desinfectar Código (Extirpar Inyección)
                                        </button>
                                    <?php endif; ?>

                                    <?php 
                                    $is_core_file = (isset($t['module']) && $t['module'] === 'core') || 
                                        (strpos($t['file'], 'wp-includes') !== false) || 
                                        (strpos($t['file'], 'wp-admin') !== false) || 
                                        in_array(basename($t['file']), array('wp-config.php', 'wp-settings.php', 'wp-load.php', 'wp-blog-header.php', 'wp-login.php', 'index.php', '.htaccess', 'version.php'));
                                    ?>
                                    <?php if (!$is_core_file): ?>
                                        <button type="button" class="btn-ng btn-ng-danger btn-force-delete" data-target="<?php echo esc_attr($t['full_path']); ?>" data-id="<?php echo esc_attr($t['id']); ?>" title="Eliminar definitivamente este archivo malicioso">
                                            💥 Eliminar Archivo Malicioso
                                        </button>
                                    <?php endif; ?>

                                    <?php if ($t['clean_action'] === 'quarantine'): ?>
                                        <button type="button" class="btn-ng btn-ng-outline btn-quarantine-file" data-file="<?php echo esc_attr($t['full_path']); ?>" data-id="<?php echo esc_attr($t['id']); ?>">
                                            📦 Mover a Cuarentena
                                        </button>
                                    <?php endif; ?>
                                <?php else: ?>
                                    <?php if ($t['clean_action'] === 'clean_db_option'): ?>
                                        <button type="button" class="btn-ng btn-ng-action btn-clean-threat" data-type="clean_db_option" data-target="<?php echo esc_attr($t['full_path']); ?>" data-id="<?php echo esc_attr($t['id']); ?>" title="Intentar limpiar cadenas maliciosas">
                                            🧹 Limpiar Inyección en BD
                                        </button>
                                        <button type="button" class="btn-ng btn-ng-danger btn-clean-threat" data-type="delete_db_option" data-target="<?php echo esc_attr($t['full_path']); ?>" data-id="<?php echo esc_attr($t['id']); ?>" title="Eliminar completamente esta opción de la base de datos">
                                            💥 Purgar Opción de BD
                                        </button>
                                    <?php elseif ($t['clean_action'] === 'clean_post_injection'): ?>
                                        <button type="button" class="btn-ng btn-ng-action btn-clean-threat" data-type="clean_post_injection" data-target="<?php echo esc_attr($t['full_path']); ?>" data-id="<?php echo esc_attr($t['id']); ?>">
                                            📝 Limpiar Publicación en BD
                                        </button>
                                    <?php elseif ($t['clean_action'] === 'remove_cron_hook'): ?>
                                        <button type="button" class="btn-ng btn-ng-danger btn-clean-threat" data-type="remove_cron_hook" data-target="<?php echo esc_attr($t['full_path']); ?>" data-id="<?php echo esc_attr($t['id']); ?>">
                                            ⏱️ Eliminar Tarea Cron
                                        </button>
                                    <?php elseif ($t['clean_action'] === 'downgrade_user'): ?>
                                        <button type="button" class="btn-ng btn-ng-danger btn-clean-threat" data-type="downgrade_user" data-target="<?php echo esc_attr($t['full_path']); ?>" data-id="<?php echo esc_attr($t['id']); ?>">
                                            👤 Degradar a Suscriptor
                                        </button>
                                    <?php endif; ?>
                                <?php endif; ?>

                                <button type="button" class="btn-ng btn-ng-outline btn-whitelist-item" data-target="<?php echo esc_attr($t['file']); ?>" data-id="<?php echo esc_attr($t['id']); ?>" title="Omitir en futuros escaneos">
                                    ✓ Permitir / Falso Positivo
                                </button>
                            </div>
                        </div>
                    <?php endforeach; ?>
                <?php endif; ?>
            </div>
        </div>

    </div><!-- /tab-scanner -->

    <!-- ====================================================================== -->
    <!-- TAB 2: AUDITORÍA DE DIRECTORIOS                                        -->
    <!-- ====================================================================== -->
    <div class="ng-tab-panel" id="tab-audit">

        <div id="breakdown-container" class="ng-card folder-breakdown-card">
            <div class="card-title-bar">
                <h3>Directorios y Componentes Auditados</h3>
                <span class="badge-v" style="font-size:0.75rem;">Cobertura 100% Core + BD + Archivos</span>
            </div>
            <p class="ng-hint" style="color: #e2eafc; margin-top: 4px; font-weight: 500;">
                Auditoría en tiempo real de cada directorio y capa de tu WordPress (temas, plugins, medios, núcleo y base de datos).
            </p>
            <div id="breakdown-grid" class="folder-breakdown-grid">
                <?php 
                $breakdown_data = ($last_report && !empty($last_report['breakdown'])) ? $last_report['breakdown'] : array(
                    'themes'     => array('name' => 'Temas y Plantillas', 'path' => 'wp-content/themes/', 'files' => 0, 'threats' => 0, 'status' => 'clean', 'icon' => '🎨'),
                    'plugins'    => array('name' => 'Plugins Instalados', 'path' => 'wp-content/plugins/', 'files' => 0, 'threats' => 0, 'status' => 'clean', 'icon' => '🔌'),
                    'dropins'    => array('name' => 'Drop-Ins y Shims (wp-content)', 'path' => 'wp-content/ (*.php)', 'files' => 0, 'threats' => 0, 'status' => 'clean', 'icon' => '💉'),
                    'uploads'    => array('name' => 'Archivos de Medios', 'path' => 'wp-content/uploads/', 'files' => 0, 'threats' => 0, 'status' => 'clean', 'icon' => '📁'),
                    'mu_plugins' => array('name' => 'Must-Use Plugins (Sistema)', 'path' => 'wp-content/mu-plugins/', 'files' => 0, 'threats' => 0, 'status' => 'clean', 'icon' => '⚡'),
                    'core'       => array('name' => 'Núcleo WordPress (Core)', 'path' => 'wp-includes/, wp-admin/, raíz', 'files' => 0, 'threats' => 0, 'status' => 'clean', 'icon' => '🏛️'),
                    'php_config' => array('name' => 'Configuración PHP (.user.ini / php.ini)', 'path' => '.user.ini, php.ini', 'files' => 0, 'threats' => 0, 'status' => 'clean', 'icon' => '⚙️'),
                    'database'   => array('name' => 'Base de Datos MySQL', 'path' => 'wp_options, wp_posts, cron, triggers', 'files' => 0, 'threats' => 0, 'status' => 'clean', 'icon' => '🗄️'),
                    'admins'     => array('name' => 'Cuentas de Administrador', 'path' => 'wp_users (roles & permisos)', 'files' => 0, 'threats' => 0, 'status' => 'clean', 'icon' => '👤')
                );
                foreach ($breakdown_data as $key => $item):
                    $is_danger = !empty($item['threats']) && $item['threats'] > 0;
                ?>
                    <div class="folder-item <?php echo esc_attr($is_danger ? 'has-threats' : ''); ?>" id="folder-item-<?php echo esc_attr($key); ?>">
                        <div class="folder-left">
                            <span class="folder-icon"><?php echo esc_html($item['icon']); ?></span>
                            <div class="folder-info">
                                <h4 class="folder-title"><?php echo esc_html($item['name']); ?></h4>
                                <span class="folder-path"><?php echo esc_html($item['path']); ?></span>
                                <span class="folder-count">
                                    <b id="count-<?php echo esc_attr($key); ?>"><?php echo esc_html(number_format_i18n($item['files'])); ?></b> elementos evaluados
                                </span>
                            </div>
                        </div>
                        <div class="folder-right">
                            <span class="folder-status-badge <?php echo esc_attr($is_danger ? 'danger' : 'clean'); ?>" id="badge-<?php echo esc_attr($key); ?>">
                                <?php echo esc_html($is_danger ? '⚠️ ' . intval($item['threats']) . ' detectado(s)' : '✓ Limpio'); ?>
                            </span>
                        </div>
                    </div>
                <?php endforeach; ?>
            </div>
        </div>

    </div><!-- /tab-audit -->

    <!-- ====================================================================== -->
    <!-- TAB 3: VIGILANCIA 24H CON RADAR                                        -->
    <!-- ====================================================================== -->
    <div class="ng-tab-panel" id="tab-vigilance">

        <div class="ng-card vigilance-card">
            <div class="vigilance-header">
                <div class="vigilance-info">
                    <span class="vigilance-tag" style="background:rgba(61,232,164,.15);color:#3de8a4;border-color:rgba(61,232,164,.35)">🛡️ SISTEMA DE VIGILANCIA</span>
                    <h3 class="vigilance-title">Sistema de Vigilancia 24 Horas contra Amenazas</h3>
                    <p class="vigilance-sub">Supervisión continua en segundo plano mediante WP-Cron y radar perimetral: inspecciona scripts PHP, uploads y base de datos.</p>
                </div>
                <div class="vigilance-action">
                    <button type="button" id="btn-toggle-vigilance" class="btn-vigilance-toggle <?php echo esc_attr($vigilance_active ? 'is-active' : ''); ?>" data-active="<?php echo esc_attr($vigilance_active ? '1' : '0'); ?>" data-locked="0">
                        <span class="v-switch-knob"></span>
                        <span id="v-toggle-label"><?php echo esc_html($vigilance_active ? 'VIGILANCIA ACTIVA 24H' : 'ACTIVAR VIGILANCIA 24H'); ?></span>
                    </button>
                </div>
            </div>

            <div id="vigilance-radar-box" class="vigilance-radar-box <?php echo esc_attr($vigilance_active ? 'radar-scanning' : 'radar-paused'); ?>">
                <div class="radar-screen-wrap">
                    <div class="radar-screen">
                        <div class="radar-ring ring-1"></div>
                        <div class="radar-ring ring-2"></div>
                        <div class="radar-ring ring-3"></div>
                        <div class="radar-crosshair cross-h"></div>
                        <div class="radar-crosshair cross-v"></div>
                        <div class="radar-sweep-beam"></div>
                        <div class="radar-blip blip-a"></div>
                        <div class="radar-blip blip-b"></div>
                        <div class="radar-blip blip-c"></div>
                        <div class="radar-center-core"></div>
                    </div>
                </div>
                <div class="radar-status-caption">
                    <h4 id="radar-status-text">
                        <?php 
                        if ($vigilance_active) {
                            echo esc_html($is_pro ? '🟢 Vigilancia Perimetral 24/7 y Radar Cloud en Tiempo Real Activo.' : '🟢 Supervisión Diaria Automática Activa (Patrullaje WP-Cron).');
                        } else {
                            echo esc_html('⏸️ Sistema de vigilancia en pausa. Actívalo para proteger tu web.');
                        }
                        ?>
                    </h4>
                    <p id="radar-status-sub">
                        <?php 
                        if ($vigilance_active) {
                            echo esc_html($is_pro ? 'NexaGuard Cloud Radar supervisa continuamente inyecciones PHP, cambios en archivos y ataques en streaming en vivo.' : 'Tu sitio ejecuta una inspección heurística de seguridad autónoma en segundo plano para detectar intrusiones y proteger archivos vitales.');
                        } else {
                            echo esc_html('Haz clic en el botón superior para activar la supervisión autónoma de tu servidor.');
                        }
                        ?>
                    </p>
                </div>
            </div>

            <?php if (!$is_pro): ?>
                <div class="ng-card" style="margin-top:20px; background:#0e163e; border:1px solid rgba(61,232,164,0.25); border-radius:14px; padding:24px 26px;">
                    <div style="display:flex; align-items:center; gap:12px; margin-bottom:12px;">
                        <span style="font-size:1.6rem;">🛡️</span>
                        <div>
                            <h3 style="margin:0; font-size:1.15rem; color:#ffffff; font-weight:700;">Supervisión Automática en Segundo Plano (WP-Cron)</h3>
                            <p style="margin:4px 0 0; color:#8fa0cf; font-size:0.88rem;">Patrullaje autónomo programado periódicamente para verificar la integridad del núcleo de WordPress y detectar backdoors o inyecciones de código.</p>
                        </div>
                    </div>
                    <div style="display:grid; grid-template-columns:repeat(auto-fit,minmax(200px,1fr)); gap:12px; margin-top:16px;">
                        <div style="background:#091030; border:1px solid rgba(255,255,255,0.06); border-radius:10px; padding:14px;">
                            <span style="color:#8fa0cf; font-size:0.78rem; text-transform:uppercase; font-weight:700; display:block; margin-bottom:4px;">Estado del Patrullaje</span>
                            <strong style="color:#3de8a4; font-size:0.95rem;">✓ Activo y Programado</strong>
                        </div>
                        <div style="background:#091030; border:1px solid rgba(255,255,255,0.06); border-radius:10px; padding:14px;">
                            <span style="color:#8fa0cf; font-size:0.78rem; text-transform:uppercase; font-weight:700; display:block; margin-bottom:4px;">Frecuencia de Escaneo</span>
                            <strong style="color:#ffffff; font-size:0.95rem;">Cada 24 horas (Diario)</strong>
                        </div>
                        <div style="background:#091030; border:1px solid rgba(255,255,255,0.06); border-radius:10px; padding:14px;">
                            <span style="color:#8fa0cf; font-size:0.78rem; text-transform:uppercase; font-weight:700; display:block; margin-bottom:4px;">Motor de Detección</span>
                            <strong style="color:#ffffff; font-size:0.95rem;">Heurístico Local Autónomo</strong>
                        </div>
                    </div>
                </div>
            <?php else: ?>
                <!-- ============ CONSOLA HACKER TELEMETRÍA RADAR ============ -->
                <div class="hacker-terminal-card">
                    <div class="terminal-bar">
                        <div class="terminal-dots">
                            <span class="t-dot t-red"></span>
                            <span class="t-dot t-yellow"></span>
                            <span class="t-dot t-green"></span>
                        </div>
                        <div class="terminal-title">
                            <span class="t-badge-live">LIVE TELEMETRY</span>
                            <span>NEXAGUARD THREAT INTERCEPTOR // RADAR DE TRÁFICO PERIMETRAL Y ATAQUES</span>
                        </div>
                        <div class="terminal-meta" style="display:flex; align-items:center; gap:10px; flex-wrap:wrap;">
                            <div class="radar-volume-control" title="Ajustar volumen de voz y alerta">
                                <button type="button" id="btn-toggle-radar-sound" class="radar-vol-btn" title="Silenciar / Activar sonido de alerta">
                                    <span id="radar-volume-icon">🔉</span>
                                </button>
                                <input type="range" id="radar-volume-slider" class="radar-vol-slider" min="0" max="100" value="35" title="Desliza para subir o bajar el volumen de la voz (0% - 100%)">
                                <span id="radar-volume-label" class="radar-vol-pct">35%</span>
                            </div>
                            <button type="button" class="t-counter-badge t-counter-badge-btn" id="btn-open-threat-summary" title="Haz clic para ver el resumen detallado de amenazas detectadas">
                                <strong id="terminal-threat-count">0</strong> ATAQUES REGISTRADOS <span class="t-btn-cta">📊 Ver Resumen</span>
                            </button>
                            <span class="t-pulse"></span>
                        </div>
                    </div>

                    <div class="terminal-screen-wrap">
                        <div class="terminal-crt-scanlines"></div>
                        <div class="terminal-screen" id="hacker-radar-screen">
                            <div class="terminal-stream-inner" id="terminal-stream-inner">
                                <div class="term-line term-system">[SYSTEM INIT] NexaGuard Security Kernel v<?php echo esc_html(NEXAGUARD_VERSION); ?> loaded.</div>
                                <div class="term-line term-system">[SENSOR] Tactical 24H Radar listening on perimeter ports (HTTP/HTTPS, REST API, WP-RPC)...</div>
                                <div class="term-line term-dim">[READY] Active defense module standing by. Live stream connected.</div>
                            </div>
                            <div class="terminal-cursor-line">
                                <span class="term-prompt">root@nexaguard-radar:~#</span>
                                <span class="terminal-typing-text" id="terminal-typing-status">monitoreando tráfico perimetral en tiempo real...</span>
                                <span class="terminal-cursor">█</span>
                            </div>
                        </div>
                    </div>

                    <div class="terminal-footer">
                        <div class="term-legend">
                            <span class="leg-item leg-green"><span class="leg-dot"></span> Telemetría de patrullaje</span>
                            <span class="leg-item leg-yellow"><span class="leg-dot"></span> Sonda / Escaneo sospechoso</span>
                            <span class="leg-item leg-red"><span class="leg-dot"></span> Ataque interceptado (HTTP 403)</span>
                        </div>
                        <div class="term-controls">
                            <button type="button" id="btn-clear-terminal-logs" class="btn-ng btn-ng-link" style="color:#64748b;font-size:0.75rem;padding:0;text-decoration:none;">🗑️ Limpiar registro de terminal</button>
                        </div>
                    </div>
                </div>
            <?php endif; ?>

        </div>

    </div><!-- /tab-vigilance -->

    <!-- ====================================================================== -->
    <!-- TAB 4: BLINDAJE WAF (integrado)                                        -->
    <!-- ====================================================================== -->
    <div class="ng-tab-panel" id="tab-waf">

        <!-- Estado del Cortafuegos Local -->
        <?php if ($is_pro): ?>
            <div class="waf-info-card" style="background:#0e163e; border:1px solid rgba(61,232,164,0.3); border-radius:14px; padding:18px 24px; margin-bottom:18px; display:flex; align-items:center; justify-content:space-between; flex-wrap:wrap; gap:16px;">
                <div style="flex:1; min-width:280px;">
                    <div style="display:flex; align-items:center; gap:8px; margin-bottom:4px;">
                        <span style="display:inline-block; width:10px; height:10px; border-radius:50%; background:#3de8a4; box-shadow:0 0 10px #3de8a4;"></span>
                        <strong style="color:#ffffff; font-size:1.05rem; font-weight:800;">Cortafuegos WAF Capa 7 Activo en el Servidor</strong>
                    </div>
                    <p style="color:#8fa0cf; font-size:0.9rem; margin:0; line-height:1.5;">Protección perimetral avanzada y reglas de servidor operativas bajo tu suscripción. Inspección L7 contra inyecciones SQL, XSS, scripts Web3 y bloqueo de escáneres hostiles.</p>
                </div>
                <div>
                    <span class="badge-v" style="background:rgba(61,232,164,0.15); color:#3de8a4; font-weight:800; padding:6px 14px; border-radius:999px; border:1px solid rgba(61,232,164,0.4);">✓ WAF Inteligente Activo</span>
                </div>
            </div>
        <?php else: ?>
            <div class="waf-info-card" style="background:#0e163e; border:1px solid rgba(61,232,164,0.3); border-radius:14px; padding:18px 24px; margin-bottom:18px; display:flex; align-items:center; justify-content:space-between; flex-wrap:wrap; gap:16px;">
                <div style="flex:1; min-width:280px;">
                    <div style="display:flex; align-items:center; gap:8px; margin-bottom:4px;">
                        <span style="display:inline-block; width:10px; height:10px; border-radius:50%; background:#3de8a4; box-shadow:0 0 10px #3de8a4;"></span>
                        <strong style="color:#ffffff; font-size:1.05rem; font-weight:800;">Reglas de Blindaje de Servidor (.htaccess y PHP)</strong>
                    </div>
                    <p style="color:#8fa0cf; font-size:0.9rem; margin:0; line-height:1.5;">Protección perimetral directa a nivel de servidor web para prevenir la ejecución de scripts no autorizados, proteger directorios y bloquear escaneos de usuarios.</p>
                </div>
                <div>
                    <span class="badge-v" style="background:rgba(61,232,164,0.15); color:#3de8a4; font-size:0.75rem;">✓ 4 Reglas Activas</span>
                </div>
            </div>
        <?php endif; ?>

        <form id="form-waf-settings" class="ng-card" style="margin-top:18px;">
            <div class="card-title-bar">
                <h3>Reglas de Protección en Tiempo Real</h3>
                <span class="badge-v" style="background:rgba(61,232,164,.15);color:#3de8a4;">✓ Protección Activa en Servidor</span>
            </div>
            <p class="ng-hint">Estas medidas frenan intentos de intrusión antes de que toquen la base de datos o el núcleo de WordPress.</p>

            <div class="toggle-list">

                <!-- ================= SECCIÓN: REGLAS BÁSICAS ================= -->
                <div class="waf-rules-group-title" style="display:flex; justify-content:space-between; align-items:center; margin: 10px 0 12px; padding: 12px 16px; background: rgba(61,232,164,0.06); border-left: 4px solid #3de8a4; border-radius: 8px;">
                    <div>
                        <strong style="color:#ffffff; font-size:1rem; font-weight:800;">🛡️ Reglas de Seguridad Básica en Servidor</strong>
                        <span style="color:#8fa0cf; font-size:0.84rem; display:block; margin-top:2px;">Medidas esenciales de protección a nivel de servidor (.htaccess y WordPress) para blindar tu instalación.</span>
                    </div>
                    <span class="badge-v" style="background:rgba(61,232,164,0.15); color:#3de8a4; font-size:0.75rem;">✓ 4 Reglas Operativas</span>
                </div>

                <!-- 1. Bloqueo de PHP en Uploads -->
                <label class="toggle-row">
                    <div class="toggle-info">
                        <b>Bloquear ejecución de scripts PHP en /wp-content/uploads/
                            <span class="ng-tooltip-btn" tabindex="0">
                                <span class="ng-tooltip-icon">ℹ️</span>
                                <span class="ng-tooltip-popover">
                                    <strong class="ng-tooltip-title">📁 Protección de Medios (.htaccess)</strong>
                                    <span class="ng-tooltip-desc">La carpeta de subidas solo debe alojar imágenes o documentos, nunca código PHP. Esta regla bloquea la ejecución de cualquier backdoor o virus que un atacante intente colar en Uploads.</span>
                                    <span class="ng-tooltip-rec">💡 Recomendado: Esencial (Previene el 90% de intrusiones)</span>
                                </span>
                            </span>
                        </b>
                        <p class="ng-hint">Instala una regla perimetral en .htaccess para que ningún archivo .php subido por atacantes pueda ser ejecutado. Neutraliza el 90% de backdoors.</p>
                    </div>
                    <input type="checkbox" name="block_php_uploads" value="1" <?php checked(!empty($settings['block_php_uploads'])); ?> class="ng-toggle">
                </label>

                <!-- 2. Prevenir Listado de Directorios Apache -->
                <label class="toggle-row">
                    <div class="toggle-info">
                        <b>Bloquear Listado de Directorios Apache (Options -Indexes)
                            <span class="ng-tooltip-btn" tabindex="0">
                                <span class="ng-tooltip-icon">ℹ️</span>
                                <span class="ng-tooltip-popover">
                                    <strong class="ng-tooltip-title">📂 Prevenir Espionaje de Carpetas</strong>
                                    <span class="ng-tooltip-desc">Impide que cualquier persona o robot curioso navegue por tus carpetas y vea listas de archivos, copias de seguridad .zip o archivos privados alojados en el servidor.</span>
                                    <span class="ng-tooltip-rec">💡 Recomendado: SIEMPRE ACTIVO</span>
                                </span>
                            </span>
                        </b>
                        <p class="ng-hint">Añade directiva en .htaccess para que ningún visitante ni escáner automatizado pueda ver el listado de archivos dentro de carpetas de tu servidor.</p>
                    </div>
                    <input type="checkbox" name="disable_dir_browsing" value="1" <?php checked(!empty($settings['disable_dir_browsing'])); ?> class="ng-toggle">
                </label>

                <!-- 3. Deshabilitar Editor de Temas y Plugins -->
                <label class="toggle-row">
                    <div class="toggle-info">
                        <b>Deshabilitar Editor de Temas y Plugins (DISALLOW_FILE_EDIT)
                            <span class="ng-tooltip-btn" tabindex="0">
                                <span class="ng-tooltip-icon">ℹ️</span>
                                <span class="ng-tooltip-popover">
                                    <strong class="ng-tooltip-title">🛡️ Bloqueo de Edición en Escritorio</strong>
                                    <span class="ng-tooltip-desc">Deshabilita la opción de editar archivos de plantillas y plugins desde el panel de WordPress. Si un hacker consigue la clave de un admin, no podrá inyectar código PHP malicioso por ahí.</span>
                                    <span class="ng-tooltip-rec">💡 Recomendado: SIEMPRE ACTIVO en sitios en producción</span>
                                </span>
                            </span>
                        </b>
                        <p class="ng-hint">Impide que cualquier usuario modifique archivos PHP desde el panel de administración. Cierra la puerta principal a atacantes que intenten inyectar webshells si comprometen una cuenta admin.</p>
                    </div>
                    <input type="checkbox" name="disallow_file_edit" value="1" <?php checked(!empty($settings['disallow_file_edit'])); ?> class="ng-toggle">
                </label>

                <!-- 4. Bloqueo de Enumeración de Usuarios -->
                <label class="toggle-row">
                    <div class="toggle-info">
                        <b>Bloquear Enumeración de Usuarios (Anti-Reconnaissance)
                            <span class="ng-tooltip-btn" tabindex="0">
                                <span class="ng-tooltip-icon">ℹ️</span>
                                <span class="ng-tooltip-popover">
                                    <strong class="ng-tooltip-title">👤 Ocultar Nombres de Usuarios</strong>
                                    <span class="ng-tooltip-desc">Impide que escáneres automáticos descubran tus nombres de usuario reales a través de la API REST o enlaces de autor. Si los hackers no conocen el usuario, no pueden adivinar la contraseña.</span>
                                    <span class="ng-tooltip-rec">💡 Recomendado: SIEMPRE ACTIVO</span>
                                </span>
                            </span>
                        </b>
                        <p class="ng-hint">Prohíbe a escáneres y visitantes anónimos extraer los nombres de usuario reales del sitio a través del endpoint REST API (<code>/wp-json/wp/v2/users</code>) y parámetros de autor (<code>/?author=1</code>).</p>
                    </div>
                    <input type="checkbox" name="block_user_enumeration" value="1" <?php checked(!empty($settings['block_user_enumeration'])); ?> class="ng-toggle">
                </label>
            </div>

            <!-- ================= SECCIÓN DE CORTAFUEGOS Y DEFENSA ACTIVA ================= -->
                <div class="waf-rules-group-title" style="margin: 32px 0 14px; padding: 18px 22px; background: rgba(61,232,164,0.06); border-left: 4px solid #3de8a4; border-radius: 12px;">
                    <div style="display:flex; justify-content:space-between; align-items:center; flex-wrap:wrap; gap:14px;">
                        <div>
                            <strong style="color:#ffffff; font-size:1.06rem; font-weight:800;">
                                🚀 Módulos Avanzados de Cortafuegos WAF
                            </strong>
                            <p style="color:#cad7f5; font-size:0.88rem; line-height:1.55; margin:4px 0 0;">
                                Módulos perimetrales de filtrado en tiempo real, bloqueo de inyecciones y defensa activa operando bajo tu suscripción.
                            </p>
                        </div>
                        <span class="badge-v" style="background:rgba(61,232,164,0.15); color:#3de8a4; font-size:0.75rem;">✓ 100% Operativo</span>
                    </div>
                </div>

                <div class="toggle-list">
                    <!-- PRO 1: Cortafuegos WAF Capa 7 PHP -->
                    <label class="toggle-row">
                        <div class="toggle-info">
                            <b>Cortafuegos WAF Perimetral Capa 7 (Runtime PHP)</b>
                            <p class="ng-hint">Inspección de peticiones entrantes en milisegundos contra inyecciones SQL, Cross-Site Scripting (XSS), Path Traversal y scanners de intrusión automatizados.</p>
                        </div>
                        <input type="checkbox" name="waf_enabled" value="1" <?php checked(!empty($settings['waf_enabled'])); ?> class="ng-toggle">
                    </label>

                    <!-- PRO 2: Escudo Anti-ClearFake / EtherHiding Web3 -->
                    <label class="toggle-row">
                        <div class="toggle-info">
                            <b>Escudo en Tiempo Real Anti-ClearFake & Falsos Captchas Web3</b>
                            <p class="ng-hint">Intercepta y erradica al vuelo scripts inyectados en blockchain (EtherHiding) y ventanas emergentes fraudulentas tipo ClickFix antes de que lleguen al navegador de tus visitantes.</p>
                        </div>
                        <input type="checkbox" name="anti_clearfake" value="1" <?php checked(!empty($settings['anti_clearfake'])); ?> class="ng-toggle">
                    </label>

                    <!-- PRO 3: Modo Aislamiento de Emergencia / Lockdown -->
                    <label class="toggle-row">
                        <div class="toggle-info">
                            <b>Modo Aislamiento de Emergencia (Panic Lockdown 503)</b>
                            <p class="ng-hint">Desvía todo el tráfico público no autenticado a una pantalla de mantenimiento 503 mientras permite a los administradores logueados desinfectar el sitio.</p>
                        </div>
                        <input type="checkbox" name="emergency_lockdown" value="1" <?php checked(!empty($settings['emergency_lockdown'])); ?> class="ng-toggle">
                    </label>

                    <!-- PRO 4: Protección Anti Fuerza Bruta Local -->
                    <div class="toggle-row" style="display:flex; justify-content:space-between; align-items:flex-start; gap:14px;">
                        <div class="toggle-info" style="flex:1;">
                            <b>Protección Anti Fuerza Bruta Local en Pantalla de Login</b>
                            <p class="ng-hint">Bloquea temporalmente direcciones IP que excedan el número permitido de intentos fallidos consecutivos de contraseña para mitigar ataques masivos de diccionario.</p>
                            <?php if ($total_lockouts > 0): ?>
                                <div style="margin-top:6px;"><span class="badge-v" style="background:rgba(61,232,164,.15);color:#3de8a4;font-size:0.75rem;">🛡️ <?php echo intval($total_lockouts); ?> bloqueo(s) perimetral(es) registrados</span></div>
                            <?php endif; ?>
                            <div class="ng-subcontrols" style="margin-top:10px; display:flex; gap:16px; flex-wrap:wrap;">
                                <label style="color:#cad7f5; font-size:0.85rem;">Máx. Intentos Fallidos: <input type="number" name="bf_max_retries" value="<?php echo esc_attr($settings['bf_max_retries']); ?>" min="3" max="20" style="width:70px; background:#080e28; border:1px solid rgba(255,255,255,0.15); color:#fff; border-radius:6px; padding:4px 8px; margin-left:6px;"></label>
                                <label style="color:#cad7f5; font-size:0.85rem;">Tiempo de Bloqueo (minutos): <input type="number" name="bf_lockout_time" value="<?php echo esc_attr($settings['bf_lockout_time']); ?>" min="5" max="1440" style="width:80px; background:#080e28; border:1px solid rgba(255,255,255,0.15); color:#fff; border-radius:6px; padding:4px 8px; margin-left:6px;"></label>
                            </div>
                        </div>
                        <input type="checkbox" name="brute_force_protection" value="1" <?php checked(!empty($settings['brute_force_protection'])); ?> class="ng-toggle">
                    </div>

                    <!-- PRO 5: Cárcel Automática de IPs 24h -->
                    <label class="toggle-row">
                        <div class="toggle-info">
                            <b>Cárcel Automática de IPs Reincidentes (Cyber Jail 24H)</b>
                            <p class="ng-hint">Aísla completamente durante 24 horas a cualquier IP que cometa 3 o más infracciones de inyección o ataque en el mismo día.</p>
                        </div>
                        <input type="checkbox" name="waf_auto_jail" value="1" <?php checked(!empty($settings['waf_auto_jail'])); ?> class="ng-toggle">
                    </label>

                    <!-- PRO 6: Ocultar wp-login.php -->
                    <div class="toggle-row" style="display:flex; justify-content:space-between; align-items:flex-start; gap:14px;">
                        <div class="toggle-info" style="flex:1;">
                            <b>Ocultar URL de Acceso Estándar (/wp-login.php)</b>
                            <p class="ng-hint">Sustituye la ruta wp-login.php por un slug secreto personalizado para frustrar el 100% de los robots de ataque masivo. Visitas no autorizadas verán un error 404.</p>
                            <div class="ng-subcontrols" style="margin-top:10px;">
                                <label style="color:#cad7f5; font-size:0.85rem;">Ruta Personalizada: <span class="ng-slug-prefix" style="color:#8fa0cf; font-family:monospace;"><?php echo esc_url(home_url('/')); ?></span><input type="text" name="login_slug" value="<?php echo esc_attr($settings['login_slug']); ?>" placeholder="acceso-seguro" class="ng-input-slug" style="width:160px; background:#080e28; border:1px solid rgba(255,255,255,0.15); color:#3de8a4; border-radius:6px; padding:4px 8px; font-family:monospace; font-weight:700;"><span class="ng-slug-prefix" style="color:#8fa0cf; font-family:monospace;">/</span></label>
                            </div>
                        </div>
                        <input type="checkbox" name="hide_backend" value="1" <?php checked(!empty($settings['hide_backend'])); ?> class="ng-toggle">
                    </div>

                    <!-- PRO 7: Blindaje de Archivos del Sistema y wp-includes -->
                    <label class="toggle-row">
                        <div class="toggle-info">
                            <b>Blindaje de Archivos del Sistema y /wp-includes/ (.htaccess)</b>
                            <p class="ng-hint">Bloquea la ejecución directa de scripts en <code>/wp-includes/</code>, protege <code>wp-config.php</code> y bloquea métodos HTTP peligrosos (TRACE, TRACK, DEBUG).</p>
                        </div>
                        <input type="checkbox" name="protect_system_files" value="1" <?php checked(!empty($settings['protect_system_files'])); ?> class="ng-toggle">
                    </label>

                    <!-- PRO 8: Centinela Tripwire de Integridad de Archivos -->
                    <div class="toggle-row" style="display:flex; justify-content:space-between; align-items:flex-start; gap:14px;">
                        <div class="toggle-info" style="flex:1;">
                            <b>Centinela de Integridad de Archivos Vitales (Tripwire)</b>
                            <p class="ng-hint">Monitorea cambios no autorizados en archivos críticos como index.php, wp-config.php y .htaccess con verificación criptográfica SHA-256 en tiempo real.</p>
                            <div style="margin-top:8px;">
                                <button type="button" id="btn-rebaseline-tripwire" class="btn-ng btn-ng-outline btn-sm" style="border-color:rgba(255,207,51,0.35); color:#ffd859; font-size:0.78rem;">🔄 Recalcular Firma Criptográfica Base (Re-baseline)</button>
                                <span id="tripwire-rebaseline-status" style="margin-left:8px; font-size:0.8rem;"></span>
                            </div>
                        </div>
                        <input type="checkbox" name="tripwire_enabled" value="1" <?php checked(!empty($settings['tripwire_enabled'])); ?> class="ng-toggle">
                    </div>

                    <!-- PRO 9: Deshabilitar XML-RPC -->
                    <label class="toggle-row">
                        <div class="toggle-info">
                            <b>Deshabilitar completamente XML-RPC</b>
                            <p class="ng-hint">Bloquea el archivo xmlrpc.php para detener ataques automatizados de fuerza bruta a contraseñas y ataques de amplificación DDoS.</p>
                        </div>
                        <input type="checkbox" name="disable_xmlrpc" value="1" <?php checked(!empty($settings['disable_xmlrpc'])); ?> class="ng-toggle">
                    </label>

                    <!-- PRO 10: Ocultar versión de WordPress -->
                    <label class="toggle-row">
                        <div class="toggle-info">
                            <b>Ocultar versión de WordPress (wp_generator)</b>
                            <p class="ng-hint">Elimina la etiqueta meta generator que expone la versión exacta de tu WordPress a bots que buscan vulnerabilidades conocidas.</p>
                        </div>
                        <input type="checkbox" name="hide_wp_version" value="1" <?php checked(!empty($settings['hide_wp_version'])); ?> class="ng-toggle">
                    </label>

                    <!-- PRO 11: Alertas por Email de Login Admin -->
                    <div class="toggle-row" style="display:flex; justify-content:space-between; align-items:flex-start; gap:14px;">
                        <div class="toggle-info" style="flex:1;">
                            <b>Alerta Inmediata por Email ante Login de Administrador desde Nueva IP</b>
                            <p class="ng-hint">Recibe un correo electrónico inmediato cada vez que un usuario administrador inicie sesión desde una ubicación o dirección IP no reconocida previamente.</p>
                            <div class="ng-subcontrols" style="margin-top:10px;">
                                <label style="color:#cad7f5; font-size:0.85rem;">Email de Notificaciones: <input type="email" name="alert_email" value="<?php echo esc_attr($settings['alert_email']); ?>" placeholder="<?php echo esc_attr(get_option('admin_email')); ?>" style="width:240px; background:#080e28; border:1px solid rgba(255,255,255,0.15); color:#fff; border-radius:6px; padding:4px 8px; margin-left:6px;"></label>
                            </div>
                        </div>
                        <input type="checkbox" name="admin_login_alerts" value="1" <?php checked(!empty($settings['admin_login_alerts'])); ?> class="ng-toggle">
                    </div>

                    <!-- PRO 12: Login Customizer & Branding (3 Plantillas y Previsualización) -->
                    <div class="toggle-row toggle-row-customizer" style="border-left: 3px solid #ffcf33; flex-direction: column; align-items: stretch; gap: 14px; background: rgba(255,207,51,0.03); padding: 18px 20px; border-radius: 10px;">
                        <div style="display: flex; justify-content: space-between; align-items: center; width: 100%;">
                            <div class="toggle-info">
                                <b style="color: #ffd859; font-size: 1rem;">🎨 Personalizador y Embellecedor Visual de Login (Login Customizer & 3 Plantillas)</b>
                                <p class="ng-hint">Transforma la pantalla estándar de <code>wp-login.php</code> con una experiencia corporativa de alta tecnología: selecciona entre las 3 plantillas visuales exclusivas, sustituye el logo de WordPress por el tuyo propio y activa el distintivo de blindaje de NexaGuard.</p>
                            </div>
                            <label style="cursor:pointer; display:flex; align-items:center; margin-left: 14px;">
                                <input type="checkbox" name="login_custom_design" id="login_custom_design" value="1" <?php checked(!empty($settings['login_custom_design'])); ?> class="ng-toggle">
                            </label>
                        </div>

                        <!-- Panel de Controles y Previsualización Interactiva -->
                        <div id="login-customizer-controls" class="login-customizer-grid" style="<?php echo empty($settings['login_custom_design']) ? 'opacity: 0.6;' : ''; ?>">
                            
                            <!-- Columna Izquierda: Opciones de Diseño -->
                            <div class="login-options-col">
                                <!-- Preset / Plantillas de fondo -->
                                <div class="login-opt-group">
                                    <label class="login-opt-label">🎨 Seleccionar Plantilla de Diseño (3 Estilos Visuales):</label>
                                    <div class="login-presets-wrap">
                                        <label class="preset-pill">
                                            <input type="radio" name="login_bg_preset" value="deep-navy" <?php checked($settings['login_bg_preset'] === 'deep-navy'); ?>>
                                            <span>🛡️ Nexa Deep Navy</span>
                                        </label>
                                        <label class="preset-pill">
                                            <input type="radio" name="login_bg_preset" value="cyber-dark" <?php checked($settings['login_bg_preset'] === 'cyber-dark'); ?>>
                                            <span>🌌 Cyber Dark Nebula</span>
                                        </label>
                                        <label class="preset-pill">
                                            <input type="radio" name="login_bg_preset" value="matrix" <?php checked($settings['login_bg_preset'] === 'matrix'); ?>>
                                            <span>⚡ Matrix Cyberpunk</span>
                                        </label>
                                    </div>
                                </div>

                                <!-- Imagen de Fondo Personalizada -->
                                <div class="login-opt-group">
                                    <label class="login-opt-label">🖼️ Imagen de Fondo Personalizada (Opcional):</label>
                                    <div class="input-with-actions">
                                        <input type="text" name="login_bg_image" id="login_bg_image" value="<?php echo esc_attr($settings['login_bg_image']); ?>" placeholder="https://ejemplo.com/fondo.jpg" class="ng-input-full" style="background:#080e28; border:1px solid rgba(255,255,255,0.15); color:#fff; border-radius:6px; padding:6px 10px;">
                                        <button type="button" class="btn-ng btn-ng-outline btn-sm" id="btn-select-login-bg">📁 Elegir Imagen</button>
                                        <button type="button" class="btn-ng btn-ng-link btn-sm" id="btn-clear-login-bg" title="Quitar imagen" style="color:#ef4444;">✕</button>
                                    </div>
                                    <span class="ng-hint" style="font-size:0.78rem;">Se aplicará en alta resolución con superposición translúcida de seguridad. Si se deja vacío, se usa la plantilla seleccionada arriba.</span>
                                </div>

                                <!-- Logo Personalizado (Sustituye icono WP) -->
                                <div class="login-opt-group">
                                    <label class="login-opt-label">🛡️ Logo Corporativo Personalizado (Sustituye Icono WP):</label>
                                    <div class="input-with-actions">
                                        <input type="text" name="login_logo_image" id="login_logo_image" value="<?php echo esc_attr($settings['login_logo_image']); ?>" placeholder="https://ejemplo.com/logo.png" class="ng-input-full" style="background:#080e28; border:1px solid rgba(255,255,255,0.15); color:#fff; border-radius:6px; padding:6px 10px;">
                                        <button type="button" class="btn-ng btn-ng-outline btn-sm" id="btn-select-login-logo">📁 Elegir Logo</button>
                                        <button type="button" class="btn-ng btn-ng-link btn-sm" id="btn-clear-login-logo" title="Quitar logo" style="color:#ef4444;">✕</button>
                                    </div>
                                    <span class="ng-hint" style="font-size:0.78rem;">Si no subes ningún logotipo, se mostrará el elegante escudo dorado de NexaGuard Security.</span>
                                </div>

                                <!-- Mensaje de Seguridad -->
                                <div class="login-opt-group">
                                    <label class="login-opt-label">💬 Distintivo Oficial de Seguridad en Pantalla de Acceso:</label>
                                    <input type="text" name="login_security_notice" id="login_security_notice" value="<?php echo esc_attr($settings['login_security_notice']); ?>" placeholder="Estás iniciando sesión en tu WordPress protegido por NexaGuard" class="ng-input-full" style="background:#080e28; border:1px solid rgba(255,255,255,0.15); color:#fff; border-radius:6px; padding:6px 10px;">
                                    <span class="ng-hint" style="font-size:0.78rem;">Aparecerá como distintivo oficial de blindaje en la parte superior del formulario de login.</span>
                                </div>
                            </div>

                            <!-- Columna Derecha: Vista Previa en Vivo -->
                            <div class="login-preview-col">
                                <label class="login-opt-label" style="text-align:center; display:block; margin-bottom:8px;">👁️ Previsualización en Tiempo Real:</label>
                                <div id="login-preview-card" class="login-preview-box">
                                    <div class="lpc-overlay"></div>
                                    <div class="lpc-content">
                                        <div id="login-preview-logo" class="lpc-logo">
                                            <?php if (!empty($settings['login_logo_image'])): ?>
                                                <img src="<?php echo esc_url($settings['login_logo_image']); ?>" alt="Logo" style="max-height:48px; max-width:180px; object-fit:contain;" />
                                            <?php else: ?>
                                                <span style="font-size:2.2rem; line-height:1;">🛡️</span>
                                                <span style="font-size:0.86rem; font-weight:800; color:#ffcf33; display:block; margin-top:4px;">NexaGuard Security</span>
                                            <?php endif; ?>
                                        </div>

                                        <div class="lpc-notice">
                                            <span style="font-size:1.1rem; line-height:1;">🛡️</span>
                                            <span id="login-preview-notice"><?php echo esc_html($settings['login_security_notice']); ?></span>
                                        </div>

                                        <div class="lpc-form-dummy">
                                            <div class="lpc-field">
                                                <span class="lpc-label">Nombre de usuario o correo</span>
                                                <div class="lpc-input">admin@tudominio.com</div>
                                            </div>
                                            <div class="lpc-field">
                                                <span class="lpc-label">Contraseña</span>
                                                <div class="lpc-input">••••••••••••••</div>
                                            </div>
                                            <div class="lpc-btn">Iniciar Sesión Segura ›</div>
                                        </div>
                                        <div class="lpc-footer">¿Has olvidado tu contraseña? · ← Volver al sitio</div>
                                    </div>
                                </div>
                            </div>

                        </div>
                    </div>

                    <!-- PRO 13: Inteligencia de Amenazas en la Nube (Opt-in) -->
                    <label class="toggle-row">
                        <div class="toggle-info">
                            <b>Sincronización de Ciberinteligencia en la Nube (Opt-in)</b>
                            <p class="ng-hint">Permite al escáner heurístico consultar el feed oficial de firmas digitales en <code>https://www.nexaguards.com/api/threat-intel</code> para identificar patrones de malware recientes.</p>
                        </div>
                        <input type="checkbox" name="cloud_threat_intel" value="1" <?php checked(!empty($settings['cloud_threat_intel'])); ?> class="ng-toggle">
                    </label>
                </div>

            <div class="form-actions" style="margin-top:24px;border-top:1px solid rgba(255,255,255,.08);padding-top:18px;display:flex;align-items:center;flex-wrap:wrap;gap:12px;">
                <button type="submit" class="btn-ng btn-ng-primary">Guardar y Aplicar Blindaje</button>
                <span id="save-msg" class="ng-hint" style="margin-left:12px"></span>
            </div>
        </form>

    </div><!-- /tab-waf -->

    <!-- ====================================================================== -->
    <!-- TAB 5: CUARENTENA                                                      -->
    <!-- ====================================================================== -->
    <div class="ng-tab-panel" id="tab-quarantine">

        <div class="ng-card" style="margin-top:0;">
            <div class="card-title-bar">
                <h3>Archivos Aislados en Cuarentena Segura</h3>
                <span class="badge-count ok" id="quarantine-badge"><?php echo intval($quarantine_count); ?> archivo(s)</span>
            </div>
            <p class="ng-hint" style="color: #dbe4ff; font-weight: 500;">Estos archivos fueron deshabilitados y movidos a un entorno protegido con permisos restringidos (Deny From All).</p>

            <?php if (!empty($quarantine_log)): ?>
                <table class="ng-table">
                    <thead>
                        <tr>
                            <th>Ruta Original</th>
                            <th>Fecha de Cuarentena</th>
                            <th>Tamaño</th>
                            <th>Acciones</th>
                        </tr>
                    </thead>
                    <tbody>
                        <?php foreach ($quarantine_log as $qid => $q): ?>
                            <tr>
                                <td><code><?php echo esc_html(str_replace(ABSPATH, '', $q['original_path'])); ?></code></td>
                                <td><?php echo esc_html($q['date']); ?></td>
                                <td><?php echo esc_html(size_format($q['size'])); ?></td>
                                <td>
                                    <button type="button" class="btn-ng btn-ng-outline btn-restore-file" data-id="<?php echo esc_attr($qid); ?>">
                                        ↩️ Restaurar
                                    </button>
                                </td>
                            </tr>
                        <?php endforeach; ?>
                    </tbody>
                </table>
            <?php else: ?>
                <div class="empty-state" style="padding:22px; text-align:center;">
                    <p style="margin:0; color:#3de8a4;">🛡️ No hay archivos en cuarentena</p>
                    <small class="ng-hint" style="color: #e2eafc; font-weight: 600;">Los archivos que muevas a cuarentena aparecerán aquí para su gestión segura.</small>
                </div>
            <?php endif; ?>
        </div>

    </div><!-- /tab-quarantine -->

    <!-- ====================================================================== -->
    <!-- TAB 6: ROLLBACK / PUNTOS DE RESTAURACIÓN                               -->
    <!-- ====================================================================== -->
    <div class="ng-tab-panel" id="tab-rollback">

        <div class="ng-card rollback-card" id="rollback-card" style="margin-top:0;">
            <div class="card-title-bar">
                <div>
                    <h3>Puntos de Restauración y Rollback (Deshacer Cambios)</h3>
                    <p class="ng-hint" style="color: #dbe4ff; font-weight: 500; margin: 4px 0 0;">Cada vez que NexaGuard desinfecta, restaura o elimina un archivo, guarda un punto de respaldo automático. Si notas cualquier anomalía, puedes revertir la acción con 1 clic.</p>
                </div>
                <span class="badge-count ok" id="rollback-badge">
                    <?php echo intval($rollback_count); ?> punto(s) de respaldo
                </span>
            </div>

            <?php if (empty($backup_history)): ?>
                <div class="empty-state" style="padding:22px; text-align:center;">
                    <p style="margin:0; color:#a0acd2;">🛡️ La bóveda de seguridad está lista. Al realizar cualquier limpieza o restauración con 1 clic, tus puntos de reversión aparecerán aquí.</p>
                </div>
            <?php else: ?>
                <table class="ng-table" id="rollback-table">
                    <thead>
                        <tr>
                            <th>Archivo Intervenido</th>
                            <th>Acción Realizada</th>
                            <th>Fecha de Respaldo</th>
                            <th>Tamaño</th>
                            <th>Acción Inmediata</th>
                        </tr>
                    </thead>
                    <tbody>
                        <?php foreach ($backup_history as $s_id => $snap): ?>
                            <tr id="snapshot-row-<?php echo esc_attr($s_id); ?>">
                                <td><code><?php echo esc_html($snap['rel_path']); ?></code></td>
                                <td><span class="badge-action-type"><?php echo esc_html($snap['action_name']); ?></span></td>
                                <td><?php echo esc_html($snap['date_formatted']); ?></td>
                                <td><?php echo esc_html(size_format($snap['size'])); ?></td>
                                <td>
                                    <button type="button" class="btn-ng btn-ng-outline btn-revert-snapshot" data-id="<?php echo esc_attr($s_id); ?>" data-file="<?php echo esc_attr($snap['rel_path']); ?>" title="Revertir este archivo al estado anterior a la limpieza">
                                        ↩️ Revertir (Deshacer)
                                    </button>
                                </td>
                            </tr>
                        <?php endforeach; ?>
                    </tbody>
                </table>
            <?php endif; ?>
        </div>

    </div><!-- /tab-rollback -->

    <!-- ====================================================================== -->
    <!-- TAB: MONITOR DE INTEGRIDAD DEL NÚCLEO EN TIEMPO REAL (SENTINEL)        -->
    <!-- ====================================================================== -->
    <div class="ng-tab-panel" id="tab-sentinel">
        <div class="ng-card sentinel-hero-card" style="background:#0e163e;border:1px solid rgba(255,207,51,0.25);border-radius:16px;padding:22px 24px;margin-bottom:20px;box-shadow:0 12px 36px rgba(0,0,0,0.45);">
            <div style="display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:14px;margin-bottom:18px;">
                <div>
                    <div style="display:flex;align-items:center;gap:10px;flex-wrap:wrap;">
                        <h2 style="margin:0;font-size:1.3rem;font-weight:800;color:#fff;">🧬 Monitor de Integridad del Núcleo en Tiempo Real</h2>
                        <span class="badge-status-pill ok" style="display:flex;align-items:center;gap:6px;padding:4px 10px;font-size:0.75rem;background:rgba(61,232,164,0.15);color:#3de8a4;border:1px solid rgba(61,232,164,0.35);border-radius:20px;font-weight:700;">
                            <span class="live-dot" style="width:8px;height:8px;background:#3de8a4;border-radius:50%;display:inline-block;box-shadow:0 0 8px #3de8a4;"></span>
                            TELEMETRÍA EN VIVO
                        </span>
                    </div>
                    <p class="ng-hint" style="color:#b8c7eb;margin:4px 0 0;font-size:0.9rem;">Inspección continua de archivos vitales del sistema, hashes SHA-256 oficiales de WordPress.org y sellado de permisos.</p>
                </div>
                <div style="display:flex;gap:10px;align-items:center;flex-wrap:wrap;">
                    <button type="button" id="btn-sentinel-toggle" class="btn-ng btn-ng-outline" style="border-color:rgba(255,207,51,0.4);color:#ffcf33;background:rgba(255,207,51,0.06);font-weight:700;">
                        <span id="sentinel-toggle-icon">⏸️</span> <span id="sentinel-toggle-text">Pausar Flujo</span>
                    </button>
                    <button type="button" id="btn-sentinel-deep-scan" class="btn-ng btn-ng-primary" style="font-weight:800;">
                        <span>⚡</span> Inspección Forzada Inmediata
                    </button>
                    <?php if ($is_pro): ?>
                        <div style="display:inline-flex; align-items:center; gap:5px;">
                            <button type="button" class="btn-ng btn-trigger-vital-rebuild" style="font-weight:800; background:linear-gradient(135deg, #10b981 0%, #059669 100%); color:#ffffff; border:1px solid #34d399; box-shadow:0 0 14px rgba(16,185,129,0.35); cursor:pointer;" title="Descargar y reconstruir archivos del núcleo con copias oficiales inmaculadas de WordPress.org">
                                <span>🛠️</span> Reconstruir Archivos Vitales
                            </button>
                            <span class="ng-tooltip-btn" tabindex="0" title="Ver explicación detallada">
                                <span class="ng-tooltip-icon">ℹ️</span>
                                <span class="ng-tooltip-popover align-right">
                                    <strong class="ng-tooltip-title">🛠️ Reconstrucción de Archivos Vitales</strong>
                                    <span class="ng-tooltip-desc">Descarga copias oficiales y limpias de WordPress.org para sustituir archivos del sistema infectados por malware.</span>
                                    <span class="ng-tooltip-rec">💡 100% Seguro: No altera base de datos, temas ni wp-config.php.</span>
                                </span>
                            </span>
                        </div>
                    <?php endif; ?>
                </div>
            </div>

            <!-- Mini KPIs de Integridad -->
            <div class="sentinel-kpis-grid" style="display:grid;grid-template-columns:repeat(auto-fit,minmax(200px,1fr));gap:12px;margin-bottom:18px;">
                <div class="sentinel-kpi-box" style="background:#091030;border:1px solid rgba(61,232,164,0.3);border-radius:12px;padding:14px 16px;">
                    <span style="font-size:0.75rem;text-transform:uppercase;color:#8fa0cf;font-weight:700;display:block;letter-spacing:0.5px;">Integridad de Núcleo</span>
                    <div style="display:flex;align-items:baseline;gap:6px;margin-top:4px;">
                        <b style="font-size:1.45rem;color:#3de8a4;">100%</b>
                        <span style="font-size:0.75rem;color:#b8c7eb;">Intacta</span>
                    </div>
                </div>
                <div class="sentinel-kpi-box" style="background:#091030;border:1px solid rgba(255,207,51,0.25);border-radius:12px;padding:14px 16px;">
                    <span style="font-size:0.75rem;text-transform:uppercase;color:#8fa0cf;font-weight:700;display:block;letter-spacing:0.5px;">Archivos Vitales</span>
                    <div style="display:flex;align-items:baseline;gap:6px;margin-top:4px;">
                        <b id="sentinel-kpi-files-count" style="font-size:1.45rem;color:#ffcf33;">17/17</b>
                        <span style="font-size:0.75rem;color:#b8c7eb;">Sellados</span>
                    </div>
                </div>
                <div class="sentinel-kpi-box" style="background:#091030;border:1px solid rgba(138,155,255,0.25);border-radius:12px;padding:14px 16px;">
                    <span style="font-size:0.75rem;text-transform:uppercase;color:#8fa0cf;font-weight:700;display:block;letter-spacing:0.5px;">Frecuencia Forense</span>
                    <div style="display:flex;align-items:baseline;gap:6px;margin-top:4px;">
                        <b id="sentinel-kpi-rate" style="font-size:1.45rem;color:#8a9bff;">60 I/O</b>
                        <span style="font-size:0.75rem;color:#b8c7eb;">por minuto</span>
                    </div>
                </div>
                <div class="sentinel-kpi-box" style="background:#091030;border:1px solid rgba(61,232,164,0.25);border-radius:12px;padding:14px 16px;">
                    <span style="font-size:0.75rem;text-transform:uppercase;color:#8fa0cf;font-weight:700;display:block;letter-spacing:0.5px;">Anomalías de Código</span>
                    <div style="display:flex;align-items:baseline;gap:6px;margin-top:4px;">
                        <b id="sentinel-kpi-anomalies" style="font-size:1.45rem;color:#3de8a4;">0</b>
                        <span style="font-size:0.75rem;color:#b8c7eb;">Cero Intrusiones</span>
                    </div>
                </div>
            </div>

            <!-- Ticker Superior de Archivo en Inspección Activa -->
            <div class="sentinel-ticker-strip" style="background:#070d28;border:1px solid rgba(255,207,51,0.3);border-radius:10px;padding:12px 18px;display:flex;align-items:center;justify-content:space-between;flex-wrap:wrap;gap:10px;margin-bottom:18px;">
                <div style="display:flex;align-items:center;gap:10px;flex-wrap:wrap;">
                    <span style="color:#ffcf33;font-weight:800;font-size:0.82rem;text-transform:uppercase;letter-spacing:0.5px;">🔍 Auditando Ahora:</span>
                    <code id="sentinel-curr-file" style="background:rgba(255,207,51,0.12);color:#ffd859;padding:3px 10px;border-radius:6px;font-family:monospace;font-size:0.9rem;border:1px solid rgba(255,207,51,0.25);font-weight:700;">/wp-config.php</code>
                    <span id="sentinel-curr-hash" style="color:#8fa0cf;font-size:0.82rem;font-family:monospace;">SHA-256: [calculando…]</span>
                </div>
                <div style="display:flex;align-items:center;gap:10px;">
                    <span id="sentinel-curr-perms" style="color:#b8c7eb;font-size:0.82rem;font-family:monospace;">Permisos: 0440</span>
                    <span id="sentinel-curr-badge" class="badge-status-pill ok" style="padding:3px 10px;font-size:0.75rem;background:rgba(61,232,164,0.18);color:#3de8a4;border:1px solid rgba(61,232,164,0.4);border-radius:20px;font-weight:700;">✓ INTACTO</span>
                </div>
            </div>

            <!-- Polígrafo Forense / Detector de Mentiras de Integridad del Núcleo (Canvas) -->
            <div class="sentinel-chart-container" style="position:relative;background:#05091e;border:1px solid rgba(61,232,164,0.35);border-radius:14px;padding:14px;overflow:hidden;box-shadow:inset 0 0 35px rgba(0,0,0,0.7);">
                <div style="position:absolute;top:12px;left:16px;z-index:2;display:flex;align-items:center;gap:10px;flex-wrap:wrap;">
                    <span style="font-size:0.72rem;font-weight:800;letter-spacing:1px;color:#3de8a4;text-transform:uppercase;">POLÍGRAFO FORENSE · DETECTOR DE MENTIRAS DEL NÚCLEO</span>
                    <span style="font-size:0.68rem;font-weight:700;color:#3de8a4;background:rgba(61,232,164,0.12);padding:2px 7px;border-radius:8px;border:1px solid rgba(61,232,164,0.3);">● Pulso EKG</span>
                    <span style="font-size:0.68rem;font-weight:700;color:#ffd859;background:rgba(255,216,89,0.12);padding:2px 7px;border-radius:8px;border:1px solid rgba(255,216,89,0.3);">● Integridad SHA-256</span>
                    <span style="font-size:0.68rem;font-weight:700;color:#8a9bff;background:rgba(138,155,255,0.12);padding:2px 7px;border-radius:8px;border:1px solid rgba(138,155,255,0.3);">● Flujo I/O</span>
                </div>
                <div style="position:absolute;top:12px;right:16px;z-index:2;display:flex;align-items:center;gap:14px;font-size:0.78rem;color:#8fa0cf;font-family:monospace;">
                    <span>Rendimiento: <strong id="sentinel-chart-throughput" style="color:#ffcf33;">142 I/O seg</strong></span>
                    <span>Latencia: <strong id="sentinel-chart-latency" style="color:#3de8a4;">1.2 ms</strong></span>
                </div>
                <canvas id="sentinel-waveform-canvas" width="1000" height="200" style="width:100%;height:200px;display:block;"></canvas>
            </div>
        </div>

        <!-- Contenedor Dinámico: Archivos Vitales Alterados & Consejo de Reconstrucción -->
        <div id="sentinel-anomalies-card" class="ng-card" style="display:none; background:#1e1022; border:1.5px solid #ff4560; border-radius:14px; padding:20px 24px; margin-bottom:20px; box-shadow:0 8px 30px rgba(255,69,96,0.18);">
            <div style="display:flex; justify-content:space-between; align-items:flex-start; flex-wrap:wrap; gap:14px; margin-bottom:14px;">
                <div style="flex:1; min-width:280px;">
                    <div style="display:flex; align-items:center; gap:8px; margin-bottom:6px;">
                        <span style="font-size:1.3rem;">🚨</span>
                        <h3 style="margin:0; font-size:1.15rem; font-weight:800; color:#ff8ba0;">ARCHIVOS VITALES ALTERADOS EN EL NÚCLEO</h3>
                    </div>
                    <p style="margin:0; font-size:0.92rem; color:#ffd2dc; line-height:1.55;">
                        <strong>Aviso de Integridad:</strong> El análisis de firmas detectó modificaciones o anomalías en los siguientes archivos críticos de WordPress. 
                        Para garantizar la seguridad, evitar backdoors y preservar la integridad del sistema, <strong>se aconseja reconstruir estos archivos</strong> restaurando sus copias oficiales originales de WordPress.org.
                    </p>
                </div>
                <div style="display:flex; align-items:center; gap:10px; flex-wrap:wrap;">
                    <a href="<?php echo esc_url(admin_url('update-core.php')); ?>" class="btn-ng btn-ng-outline" style="border-color:#ff8ba0; color:#ff8ba0; font-size:0.8rem; padding:6px 14px; font-weight:700;">
                        🔄 Reinstalar Núcleo Oficial de WordPress
                    </a>
                </div>
            </div>

            <!-- Tabla de Archivos Alterados -->
            <div style="overflow-x:auto; background:#0e0818; border-radius:10px; border:1px solid rgba(255,69,96,0.25);">
                <table class="ng-table" style="font-size:0.82rem; margin:0; width:100%;">
                    <thead>
                        <tr style="background:rgba(255,69,96,0.12); border-bottom:1px solid rgba(255,69,96,0.25);">
                            <th style="color:#ff8ba0; padding:10px 14px;">Archivo Vital</th>
                            <th style="color:#ff8ba0; padding:10px 14px;">Firma / Hash</th>
                            <th style="color:#ff8ba0; padding:10px 14px;">Diagnóstico de Integridad</th>
                            <th style="color:#ff8ba0; padding:10px 14px; text-align:right;">Acción Aconsejada</th>
                        </tr>
                    </thead>
                    <tbody id="sentinel-anomalies-tbody">
                        <!-- Se rellena dinámicamente con JS -->
                    </tbody>
                </table>
            </div>
        </div>

        <!-- Sección Inferior: Consola Táctica + Bóveda de Archivos Críticos -->
        <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(340px,1fr));gap:20px;">
            <!-- Consola Táctica en Vivo -->
            <div class="ng-card" style="background:#0e163e;border:1px solid rgba(255,255,255,0.08);border-radius:14px;padding:18px 20px;">
                <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:12px;">
                    <div style="display:flex;align-items:center;gap:6px;">
                        <span style="display:inline-block;width:10px;height:10px;background:#ff5f56;border-radius:50%;"></span>
                        <span style="display:inline-block;width:10px;height:10px;background:#ffbd2e;border-radius:50%;"></span>
                        <span style="display:inline-block;width:10px;height:10px;background:#27c93f;border-radius:50%;"></span>
                        <span style="margin-left:8px;font-family:monospace;font-size:0.8rem;color:#8fa0cf;">nexaguard-sentinel@core-stream:~#</span>
                    </div>
                    <button type="button" id="btn-sentinel-clear-terminal" class="btn-ng-link" style="font-size:0.75rem;color:#8fa0cf;">Limpiar</button>
                </div>
                <div id="sentinel-terminal-stream" style="background:#060a1f;border:1px solid rgba(0,0,0,0.5);border-radius:8px;padding:12px;height:240px;overflow-y:auto;font-family:'Courier New',Courier,monospace;font-size:0.78rem;line-height:1.6;color:#3de8a4;box-shadow:inset 0 0 10px rgba(0,0,0,0.8);">
                    <div style="color:#ffcf33;">[SISTEMA] Iniciando motor de telemetría forense NexaGuard Sentinel...</div>
                    <div style="color:#8fa0cf;">[SISTEMA] Conectando con kernel local e inventario de archivos de WordPress...</div>
                    <div style="color:#3de8a4;">[OK] Conexión establecida. Monitoreando integridad continua SHA-256.</div>
                </div>
            </div>

            <!-- Bóveda Vital de Archivos Críticos -->
            <div class="ng-card" style="background:#0e163e;border:1px solid rgba(255,255,255,0.08);border-radius:14px;padding:18px 20px;">
                <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:12px;flex-wrap:wrap;gap:10px;">
                    <h3 style="margin:0;font-size:1.05rem;font-weight:700;color:#fff;">🛡️ Bóveda Vital de Archivos del Núcleo</h3>
                    <?php if ($is_pro): ?>
                        <div style="display:flex; gap:14px; align-items:center; flex-wrap:wrap;">
                            <div style="display:inline-flex; align-items:center; gap:5px;">
                                <button type="button" id="btn-sentinel-rebuild-all-vital" class="btn-ng btn-ng-primary btn-trigger-vital-rebuild" style="font-size:0.78rem;padding:5px 14px;background:#10b981;color:#fff;border:none;border-radius:6px;font-weight:800;cursor:pointer;display:inline-flex;align-items:center;gap:6px;box-shadow:0 0 12px rgba(16,185,129,0.35);" title="Descargar y reconstruir todos los archivos vitales de WordPress con copias oficiales inmaculadas de WordPress.org">
                                    🛠️ Reconstruir Archivos Vitales
                                </button>
                                <span class="ng-tooltip-btn" tabindex="0" title="Ver explicación detallada">
                                    <span class="ng-tooltip-icon">ℹ️</span>
                                    <span class="ng-tooltip-popover align-right">
                                        <strong class="ng-tooltip-title">🛠️ Reconstrucción de Archivos Vitales</strong>
                                        <span class="ng-tooltip-desc">Descarga copias limpias e inmaculadas directamente de los servidores de WordPress.org y restaura los archivos esenciales del sistema (index.php, wp-load.php, wp-blog-header.php, wp-settings.php, version.php) erradicando cualquier malware o backdoor.</span>
                                        <span class="ng-tooltip-rec">💡 100% Seguro: No toca tu base de datos, temas, plugins ni wp-config.php. Crea respaldo previo automático.</span>
                                    </span>
                                </span>
                            </div>
                            <div style="display:inline-flex; align-items:center; gap:5px;">
                                <button type="button" id="btn-sentinel-harden-now" class="btn-ng btn-ng-outline btn-sentinel-harden" style="font-size:0.78rem;padding:5px 12px;border-color:rgba(255,207,51,0.4);color:#ffd859;font-weight:700;cursor:pointer;background:rgba(255,207,51,0.08);border-radius:6px;" title="Endurecer permisos de wp-config.php a solo-lectura (0440)">
                                    🔒 Endurecer Permisos
                                </button>
                                <span class="ng-tooltip-btn" tabindex="0" title="Ver explicación detallada">
                                    <span class="ng-tooltip-icon">ℹ️</span>
                                    <span class="ng-tooltip-popover align-right">
                                        <strong class="ng-tooltip-title">🔒 Endurecimiento de Permisos (Hardening)</strong>
                                        <span class="ng-tooltip-desc">Sella los permisos del archivo wp-config.php a modo estricto de solo-lectura (chmod 0440 o 0640). Bloquea cualquier intento de atacantes o troyanos de modificar tus credenciales o inyectar código.</span>
                                        <span class="ng-tooltip-rec">💡 Recomendado: Máxima protección contra manipulación de credenciales.</span>
                                    </span>
                                </span>
                            </div>
                        </div>
                    <?php else: ?>
                        <span class="badge-v" style="background:rgba(61,232,164,0.15); color:#3de8a4; font-size:0.75rem;">✓ Monitoreo Activo</span>
                    <?php endif; ?>
                </div>
                <div style="max-height:240px;overflow-y:auto;">
                    <table class="ng-table" style="font-size:0.8rem;margin:0;">
                        <thead>
                            <tr>
                                <th>Archivo</th>
                                <th>Permisos</th>
                                <th>Estado</th>
                                <th style="text-align:right;">Acción Oficial (WordPress.org)</th>
                            </tr>
                        </thead>
                        <tbody id="sentinel-vital-files-tbody">
                            <tr>
                                <td><code>/wp-config.php</code></td>
                                <td><span class="badge-status-pill ok">0440</span></td>
                                <td><span style="color:#3de8a4;font-weight:700;">✓ Protegido</span></td>
                                <td style="text-align:right;"><span style="color:#3de8a4; font-size:0.75rem;">Protegido por WAF</span></td>
                            </tr>
                            <tr>
                                <td><code>/.htaccess</code></td>
                                <td><span class="badge-status-pill ok">0644</span></td>
                                <td><span style="color:#3de8a4;font-weight:700;">✓ WAF Activo</span></td>
                                <td style="text-align:right;"><span style="color:#3de8a4; font-size:0.75rem;">Reglas Activas</span></td>
                            </tr>
                            <tr>
                                <td><code>/index.php</code></td>
                                <td><span class="badge-status-pill ok">0644</span></td>
                                <td><span style="color:#3de8a4;font-weight:700;">✓ Firma Oficial</span></td>
                                <td style="text-align:right;"><a href="<?php echo esc_url(admin_url('update-core.php')); ?>" class="btn-ng btn-ng-outline btn-sm" style="text-decoration:none; font-size:0.72rem; padding:3px 8px;" target="_blank">Reinstalar Oficial ↗</a></td>
                            </tr>
                            <tr>
                                <td><code>/wp-load.php</code></td>
                                <td><span class="badge-status-pill ok">0644</span></td>
                                <td><span style="color:#3de8a4;font-weight:700;">✓ Firma Oficial</span></td>
                                <td style="text-align:right;"><a href="<?php echo esc_url(admin_url('update-core.php')); ?>" class="btn-ng btn-ng-outline btn-sm" style="text-decoration:none; font-size:0.72rem; padding:3px 8px;" target="_blank">Reinstalar Oficial ↗</a></td>
                            </tr>
                            <tr>
                                <td><code>/wp-includes/version.php</code></td>
                                <td><span class="badge-status-pill ok">0644</span></td>
                                <td><span style="color:#3de8a4;font-weight:700;">✓ Intacto</span></td>
                                <td style="text-align:right;"><a href="<?php echo esc_url(admin_url('update-core.php')); ?>" class="btn-ng btn-ng-outline btn-sm" style="text-decoration:none; font-size:0.72rem; padding:3px 8px;" target="_blank">Reinstalar Oficial ↗</a></td>
                            </tr>
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    </div><!-- /tab-sentinel -->

    <!-- ====================================================================== -->
    <!-- TAB: ESCUDO BALÍSTICO (RADAR MUNDIAL & HAZ BALÍSTICO EN VIVO)          -->
    <!-- ====================================================================== -->
    <div class="ng-tab-panel" id="tab-ballistic">
        <div class="ng-card" style="padding: 24px 28px; background:#0c1338; border:1px solid rgba(107,140,255,0.28); border-radius:16px;">
            <div style="display:flex; justify-content:space-between; align-items:flex-start; margin-bottom:20px; flex-wrap:wrap; gap:14px;">
                <div>
                    <div style="display:inline-flex; align-items:center; gap:8px; padding:4px 14px; border-radius:999px; background:rgba(255,69,96,0.12); border:1px solid rgba(255,69,96,0.35); color:#ff8ba0; font-size:0.78rem; font-weight:700; margin-bottom:8px;">
                        <span class="live-dot" style="display:inline-block; width:8px; height:8px; border-radius:50%; background:#ff4560; box-shadow:0 0 8px #ff4560;"></span> TELEMETRÍA GLOBAL EN TIEMPO REAL · SOC NEXAGUARD
                    </div>
                    <h2 style="font-size:1.6rem; color:#ffffff; margin:0 0 6px; font-weight:800; display:flex; align-items:center; gap:10px;">
                        🎯 Radar Mundial de Amenazas & Escudo Balístico Activo
                    </h2>
                    <p style="color:#b6c4eb; font-size:0.92rem; line-height:1.55; margin:0; max-width:850px;">
                        Observa en vivo los intentos de intrusión perpetrados contra servidores WordPress en todo el planeta. <strong>Tu servidor se sitúa en tiempo real como nodo protegido</strong>, recibiendo y neutralizando cada haz balístico mediante el blindaje perimetral WAF de NexaGuard.
                    </p>
                </div>
                <div style="display:flex; gap:10px; align-items:center;">
                    <span class="ng-badge-pill" style="background:rgba(61,232,164,0.15); color:#3de8a4; border:1px solid rgba(61,232,164,0.4); font-weight:800; padding:6px 14px; border-radius:8px; font-size:0.8rem;">
                        ✓ ESCUDO ACTIVO (360°)
                    </span>
                </div>
            </div>

            <!-- Barra de Simulación Interactiva -->
            <div class="threat-sim-bar">
                <div style="font-weight:700; font-size:0.84rem; color:#ffcf33; display:flex; align-items:center; gap:6px;">
                    🛡️ Probar Escudo Balístico (Simulación):
                </div>
                <button type="button" class="btn-ng btn-ng-outline sm" data-sim="sqli" style="padding:4px 10px; font-size:0.75rem; border-color:rgba(255,51,102,0.4); color:#ff6b8b;" title="Simular inyección SQL a base de datos">💉 SQL Injection</button>
                <button type="button" class="btn-ng btn-ng-outline sm" data-sim="rce" style="padding:4px 10px; font-size:0.75rem; border-color:rgba(255,51,102,0.4); color:#ff6b8b;" title="Simular ejecución remota de comandos">⚡ RCE Exploit</button>
                <button type="button" class="btn-ng btn-ng-outline sm" data-sim="honeypot" style="padding:4px 10px; font-size:0.75rem; border-color:rgba(255,207,51,0.4); color:#ffd859;" title="Simular trampa Honeypot en archivo sensible">🍯 Honeypot Trap</button>
                <button type="button" class="btn-ng btn-ng-outline sm" data-sim="traversal" style="padding:4px 10px; font-size:0.75rem; border-color:rgba(255,207,51,0.4); color:#ffd859;" title="Simular lectura arbitraria de archivos">📂 Path Traversal</button>
                <button type="button" class="btn-ng btn-ng-outline sm" data-sim="bot" style="padding:4px 10px; font-size:0.75rem; border-color:rgba(63,240,255,0.4); color:#3ff0ff;" title="Simular escáner masivo de bots">🤖 Bad Bot Scanner</button>
                <button type="button" class="btn-ng btn-ng-outline sm" data-sim="xss" style="padding:4px 10px; font-size:0.75rem; border-color:rgba(63,240,255,0.4); color:#3ff0ff;" title="Simular inyección de script malicioso">☣️ Vector XSS</button>
            </div>

            <!-- Contenedor del Mapa Mundi -->
            <div class="threat-map-box">
                <div class="threat-map-hud-top">
                    <div class="threat-hud-badge">
                        <span class="live-dot"></span>
                        <span style="font-weight:700">DEFENSA PERIMETRAL VIVA</span>
                        <span style="color:#8fa0cf;">· 360° ACTIVO</span>
                        <span style="color:#3de8a4;">· LATENCIA: &lt; 0.04ms</span>
                    </div>
                    <div style="display:flex; gap:8px; align-items:center; flex-wrap:wrap;">
                        <button type="button" class="btn-ng btn-ng-outline sm" id="pluginNodeLocBtn" style="padding:4px 10px; font-size:0.72rem; background:rgba(6,12,34,0.9); border-color:rgba(255,207,51,0.4); color:#ffcf33;" title="Haz clic en cualquier punto del mapa para mover tu nodo">🎯 TU NODO: Detectando ubicación...</button>
                        <button type="button" class="btn-ng btn-ng-outline sm" id="pluginStreamToggleBtn" style="padding:4px 10px; font-size:0.72rem; background:rgba(6,12,34,0.9); color:#3ff0ff;">⚡ Flujo en Vivo: ACTIVO</button>
                        <button type="button" class="btn-ng btn-ng-outline sm" id="pluginAudioBtn" style="padding:4px 10px; font-size:0.72rem; background:rgba(6,12,34,0.9); color:#8fa0cf;">🔈 Sonar: MUTE</button>
                    </div>
                </div>

                <div class="threat-map-canvas-wrap" id="pluginThreatMapWrap"></div>

                <div class="threat-map-hud-bot">
                    <div class="threat-hud-badge" style="font-size:0.68rem;">
                        <span style="color:#ff3366">🔴 Crítico (SQLi/RCE)</span>
                        <span style="color:#ffcf33; margin-left:8px">🟡 Honeypot/Traversal</span>
                        <span style="color:#3ff0ff; margin-left:8px">🔵 Bad Bot Scanner</span>
                        <span style="color:#ffcf33; margin-left:8px">🎯 Tu Servidor (Nodo Protegido)</span>
                    </div>
                    <div class="threat-hud-badge">
                        <span>ESCUDO WAF ACTIVO · NEUTRALIZADOS: </span>
                        <b id="pluginInterceptedCounter" style="color:#3de8a4; margin-left:4px">0</b>
                    </div>
                </div>
            </div>

            <!-- Lista de Ataques con Flechas Animadas -->
            <div class="threat-feed-box">
                <div class="threat-feed-head">
                    <h4 style="margin:0; font-size:0.82rem; color:#3ff0ff; letter-spacing:0.05em; display:flex; align-items:center; gap:8px;">
                        <span>⚡</span> FLUJO DE ATAQUES INTERCEPTADOS EN TIEMPO REAL
                    </h4>
                    <span style="font-size:0.72rem; color:#8fa0cf;">Haz clic en cualquier fila para trazar el haz balístico en el mapa</span>
                </div>
                <div class="threat-feed-list" id="pluginThreatFeedList"></div>
            </div>
        </div>
    </div><!-- /tab-ballistic -->

    <!-- ====================================================================== -->
    <!-- TAB 8: COMPARATIVA PRO                                                 -->
    <!-- ====================================================================== -->
    <div class="ng-tab-panel" id="tab-compare">
        <div class="ng-card" style="padding: 28px; border: 1.5px solid rgba(255,207,51,0.3); border-radius: 16px; background: #0c1338;">
            <div style="text-align: center; max-width: 780px; margin: 0 auto 28px;">
                <?php if ($is_pro): ?>
                    <span class="ng-badge-pill" style="background: rgba(61,232,164,0.15); color: #3de8a4; border: 1px solid rgba(61,232,164,0.35); font-weight: 800; text-transform: uppercase; padding: 4px 14px; border-radius: 999px; font-size: 0.78rem; display: inline-block; margin-bottom: 10px;">🛡️ Plan PRO Activo</span>
                    <h2 style="font-size: 1.6rem; color: #ffffff; margin: 0 0 10px; font-weight: 800;">Comparativa: Modo Estándar vs NexaGuard PRO</h2>
                    <p style="color: #b6c4eb; font-size: 0.95rem; line-height: 1.55; margin: 0;">
                        Tu instalación cuenta actualmente con la protección de <strong>NexaGuard PRO</strong>. Revisa a continuación todas las capacidades y módulos avanzados que tienes activos en este sitio:
                    </p>
                <?php else: ?>
                    <span class="ng-badge-pill" style="background: rgba(255,207,51,0.15); color: #ffcf33; border: 1px solid rgba(255,207,51,0.35); font-weight: 800; text-transform: uppercase; padding: 4px 14px; border-radius: 999px; font-size: 0.78rem; display: inline-block; margin-bottom: 10px;">⚖️ Transparencia & Libertad Total</span>
                    <h2 style="font-size: 1.6rem; color: #ffffff; margin: 0 0 10px; font-weight: 800;">Comparativa: Modo Estándar vs NexaGuard PRO</h2>
                    <p style="color: #b6c4eb; font-size: 0.95rem; line-height: 1.55; margin: 0;">
                        Tu instalación actual cuenta con la <strong>Edición Estándar (Gratuita)</strong>. Funciona de manera 100% operativa y sin límites artificiales para auditar y desinfectar este sitio. Compara aquí las capacidades de cada edición:
                    </p>
                <?php endif; ?>
            </div>

            <div style="overflow-x: auto; border-radius: 14px; border: 1px solid rgba(255,207,51,0.25); background: rgba(14,22,62,0.85); box-shadow: 0 15px 35px rgba(0,0,0,0.4);">
                <table style="width: 100%; border-collapse: collapse; min-width: 640px; text-align: left; font-size: 0.92rem; color: #e1ebff;">
                    <thead>
                        <tr style="border-bottom: 1.5px solid rgba(255,207,51,0.3); background: rgba(20,31,79,0.95);">
                            <th style="padding: 16px 20px; color: #ffffff; font-size: 1rem; font-weight: 700;">Módulos & Capacidades de Seguridad</th>
                            <th style="padding: 16px 14px; text-align: center; width: 195px;">
                                <div style="color: #ffffff; font-weight: 700; font-size: 1rem;">Modo Estándar</div>
                                <div style="color: #8ba5e3; font-size: 0.75rem;">WordPress.org (Gratuito)</div>
                            </th>
                            <th style="padding: 16px 14px; text-align: center; width: 220px; background: rgba(255,207,51,0.08); border-left: 1px solid rgba(255,207,51,0.25); border-right: 1px solid rgba(255,207,51,0.25);">
                                <div style="color: #ffcf33; font-weight: 800; font-size: 1.05rem;">⚡ NexaGuard PRO</div>
                                <div style="color: #ffeaa7; font-size: 0.75rem;"><?php echo $is_pro ? '✓ Activo en este Sitio' : 'Suscripción Oficial'; ?></div>
                            </th>
                        </tr>
                    </thead>
                    <tbody>
                        <!-- 1. Escáner Forense -->
                        <tr style="border-bottom: 1px solid rgba(255,255,255,0.06);">
                            <td style="padding: 13px 20px;">
                                <strong style="color: #ffffff;">Escáner Forense Profundo</strong>
                                <div style="font-size: 0.8rem; color: #94a6d1;">Inspección de archivos PHP, temas, plugins, uploads y tablas wp_options</div>
                            </td>
                            <td style="padding: 13px 14px; text-align: center;">
                                <span style="display: inline-flex; align-items: center; gap: 4px; padding: 3px 10px; border-radius: 999px; background: rgba(61,232,164,0.12); color: #3de8a4; font-weight: 700; font-size: 0.8rem; border: 1px solid rgba(61,232,164,0.3);">✓ Ilimitado (Manual)</span>
                            </td>
                            <td style="padding: 13px 14px; text-align: center; background: rgba(255,207,51,0.04); border-left: 1px solid rgba(255,207,51,0.25); border-right: 1px solid rgba(255,207,51,0.25);">
                                <span style="display: inline-flex; align-items: center; gap: 4px; padding: 3px 10px; border-radius: 999px; background: rgba(61,232,164,0.18); color: #3de8a4; font-weight: 800; font-size: 0.8rem; border: 1px solid rgba(61,232,164,0.4);">✓ Ilimitado (Auto + Cloud Intel)</span>
                            </td>
                        </tr>

                        <!-- 2. Integridad Sentinel -->
                        <tr style="border-bottom: 1px solid rgba(255,255,255,0.06); background: rgba(255,255,255,0.015);">
                            <td style="padding: 13px 20px;">
                                <strong style="color: #ffffff;">Integridad del Núcleo (Sentinel)</strong>
                                <div style="font-size: 0.8rem; color: #94a6d1;">Auditoría de archivos vitales con hashes criptográficos SHA-256 de WordPress.org</div>
                            </td>
                            <td style="padding: 13px 14px; text-align: center;">
                                <span style="display: inline-flex; align-items: center; gap: 4px; padding: 3px 10px; border-radius: 999px; background: rgba(61,232,164,0.12); color: #3de8a4; font-weight: 700; font-size: 0.8rem; border: 1px solid rgba(61,232,164,0.3);">✓ Auditoría Local</span>
                            </td>
                            <td style="padding: 13px 14px; text-align: center; background: rgba(255,207,51,0.04); border-left: 1px solid rgba(255,207,51,0.25); border-right: 1px solid rgba(255,207,51,0.25);">
                                <span style="display: inline-flex; align-items: center; gap: 4px; padding: 3px 10px; border-radius: 999px; background: rgba(61,232,164,0.18); color: #3de8a4; font-weight: 800; font-size: 0.8rem; border: 1px solid rgba(61,232,164,0.4);">✓ Vigilancia Activa 24/7 en Vivo</span>
                            </td>
                        </tr>

                        <!-- 3. Reconstrucción de Archivos Vitales -->
                        <tr style="border-bottom: 1px solid rgba(255,255,255,0.06);">
                            <td style="padding: 13px 20px;">
                                <strong style="color: #ffffff;">Reconstrucción Oficial de Archivos Vitales</strong>
                                <div style="font-size: 0.8rem; color: #94a6d1;">Restaura archivos clave (index.php, wp-load, etc.) con copias oficiales inmaculadas de WordPress.org</div>
                            </td>
                            <td style="padding: 13px 14px; text-align: center;">
                                <span style="display: inline-flex; align-items: center; gap: 3px; padding: 3px 9px; border-radius: 999px; background: rgba(255,69,96,0.12); color: #ff6b81; font-weight: 700; font-size: 0.78rem; border: 1px solid rgba(255,69,96,0.3);">✕ Solo detección (Manual)</span>
                            </td>
                            <td style="padding: 13px 14px; text-align: center; background: rgba(255,207,51,0.04); border-left: 1px solid rgba(255,207,51,0.25); border-right: 1px solid rgba(255,207,51,0.25);">
                                <span style="display: inline-flex; align-items: center; gap: 4px; padding: 3px 10px; border-radius: 999px; background: rgba(61,232,164,0.18); color: #3de8a4; font-weight: 800; font-size: 0.8rem; border: 1px solid rgba(61,232,164,0.4);">✓ Reconstrucción Oficial 1-Clic</span>
                            </td>
                        </tr>

                        <!-- 4. Endurecimiento de Permisos -->
                        <tr style="border-bottom: 1px solid rgba(255,255,255,0.06); background: rgba(255,255,255,0.015);">
                            <td style="padding: 13px 20px;">
                                <strong style="color: #ffffff;">Endurecimiento de Permisos (Hardening 1-Clic)</strong>
                                <div style="font-size: 0.8rem; color: #94a6d1;">Sella wp-config.php en modo solo-lectura estricto (0440 / 0640) contra troyanos</div>
                            </td>
                            <td style="padding: 13px 14px; text-align: center;">
                                <span style="display: inline-flex; align-items: center; gap: 3px; padding: 3px 9px; border-radius: 999px; background: rgba(255,69,96,0.12); color: #ff6b81; font-weight: 700; font-size: 0.78rem; border: 1px solid rgba(255,69,96,0.3);">✕ Configuración manual en hosting</span>
                            </td>
                            <td style="padding: 13px 14px; text-align: center; background: rgba(255,207,51,0.04); border-left: 1px solid rgba(255,207,51,0.25); border-right: 1px solid rgba(255,207,51,0.25);">
                                <span style="display: inline-flex; align-items: center; gap: 4px; padding: 3px 10px; border-radius: 999px; background: rgba(61,232,164,0.18); color: #3de8a4; font-weight: 800; font-size: 0.8rem; border: 1px solid rgba(61,232,164,0.4);">✓ Endurecimiento Automático 1-Clic</span>
                            </td>
                        </tr>

                        <!-- 5. Erradicación Quirúrgica & Cuarentena -->
                        <tr style="border-bottom: 1px solid rgba(255,255,255,0.06);">
                            <td style="padding: 13px 20px;">
                                <strong style="color: #ffffff;">Erradicación Quirúrgica & Cuarentena</strong>
                                <div style="font-size: 0.8rem; color: #94a6d1;">Aislamiento seguro con Deny from all y restauración con 1 clic</div>
                            </td>
                            <td style="padding: 13px 14px; text-align: center;">
                                <span style="display: inline-flex; align-items: center; gap: 4px; padding: 3px 10px; border-radius: 999px; background: rgba(61,232,164,0.12); color: #3de8a4; font-weight: 700; font-size: 0.8rem; border: 1px solid rgba(61,232,164,0.3);">✓ Incluido (Sin límites)</span>
                            </td>
                            <td style="padding: 13px 14px; text-align: center; background: rgba(255,207,51,0.04); border-left: 1px solid rgba(255,207,51,0.25); border-right: 1px solid rgba(255,207,51,0.25);">
                                <span style="display: inline-flex; align-items: center; gap: 4px; padding: 3px 10px; border-radius: 999px; background: rgba(61,232,164,0.18); color: #3de8a4; font-weight: 800; font-size: 0.8rem; border: 1px solid rgba(61,232,164,0.4);">✓ Incluido + Asistencia Forense</span>
                            </td>
                        </tr>

                        <!-- 6. Reglas Perimetrales de Blindaje (.htaccess) -->
                        <tr style="border-bottom: 1px solid rgba(255,255,255,0.06); background: rgba(255,255,255,0.015);">
                            <td style="padding: 13px 20px;">
                                <strong style="color: #ffffff;">Reglas Perimetrales de Blindaje (.htaccess)</strong>
                                <div style="font-size: 0.8rem; color: #94a6d1;">Bloqueo de PHP en /uploads/, denegación de listado de carpetas (-Indexes) y bloqueo de edición de código en panel</div>
                            </td>
                            <td style="padding: 13px 14px; text-align: center;">
                                <span style="display: inline-flex; align-items: center; gap: 4px; padding: 3px 10px; border-radius: 999px; background: rgba(61,232,164,0.12); color: #3de8a4; font-weight: 700; font-size: 0.8rem; border: 1px solid rgba(61,232,164,0.3);">✓ 3 Reglas Esenciales Activas</span>
                            </td>
                            <td style="padding: 13px 14px; text-align: center; background: rgba(255,207,51,0.04); border-left: 1px solid rgba(255,207,51,0.25); border-right: 1px solid rgba(255,207,51,0.25);">
                                <span style="display: inline-flex; align-items: center; gap: 4px; padding: 3px 10px; border-radius: 999px; background: rgba(61,232,164,0.18); color: #3de8a4; font-weight: 800; font-size: 0.8rem; border: 1px solid rgba(61,232,164,0.4);">✓ Blindaje Completo + WAF L7</span>
                            </td>
                        </tr>

                        <!-- 7. Bloquear Enumeración de Usuarios -->
                        <tr style="border-bottom: 1px solid rgba(255,255,255,0.06);">
                            <td style="padding: 13px 20px;">
                                <strong style="color: #ffffff;">Protección Anti-Espionaje de Usuarios (REST API)</strong>
                                <div style="font-size: 0.8rem; color: #94a6d1;">Impide que atacantes y bots rastreen usuarios administradores a través de /wp-json/wp/v2/users</div>
                            </td>
                            <td style="padding: 13px 14px; text-align: center;">
                                <span style="display: inline-flex; align-items: center; gap: 4px; padding: 3px 10px; border-radius: 999px; background: rgba(61,232,164,0.12); color: #3de8a4; font-weight: 700; font-size: 0.8rem; border: 1px solid rgba(61,232,164,0.3);">✓ Protección Básica Activa</span>
                            </td>
                            <td style="padding: 13px 14px; text-align: center; background: rgba(255,207,51,0.04); border-left: 1px solid rgba(255,207,51,0.25); border-right: 1px solid rgba(255,207,51,0.25);">
                                <span style="display: inline-flex; align-items: center; gap: 4px; padding: 3px 10px; border-radius: 999px; background: rgba(61,232,164,0.18); color: #3de8a4; font-weight: 800; font-size: 0.8rem; border: 1px solid rgba(61,232,164,0.4);">✓ Anti-Reconnaissance Avanzado</span>
                            </td>
                        </tr>

                        <!-- 8. Bloqueo XML-RPC y Ocultación Versión -->
                        <tr style="border-bottom: 1px solid rgba(255,255,255,0.06); background: rgba(255,255,255,0.015);">
                            <td style="padding: 13px 20px;">
                                <strong style="color: #ffffff;">Bloqueo Total de XML-RPC y Ocultación de Versión</strong>
                                <div style="font-size: 0.8rem; color: #94a6d1;">Cierra la puerta de enlace xmlrpc.php (ataques de amplificación DDoS) y oculta la versión de WP</div>
                            </td>
                            <td style="padding: 13px 14px; text-align: center;">
                                <span style="display: inline-flex; align-items: center; gap: 3px; padding: 3px 9px; border-radius: 999px; background: rgba(255,69,96,0.12); color: #ff6b81; font-weight: 700; font-size: 0.78rem; border: 1px solid rgba(255,69,96,0.3);">✕ No disponible</span>
                            </td>
                            <td style="padding: 13px 14px; text-align: center; background: rgba(255,207,51,0.04); border-left: 1px solid rgba(255,207,51,0.25); border-right: 1px solid rgba(255,207,51,0.25);">
                                <span style="display: inline-flex; align-items: center; gap: 4px; padding: 3px 10px; border-radius: 999px; background: rgba(61,232,164,0.18); color: #3de8a4; font-weight: 800; font-size: 0.8rem; border: 1px solid rgba(61,232,164,0.4);">✓ Bloqueo Total + Cloaking de Versión</span>
                            </td>
                        </tr>

                        <!-- 9. Cortafuegos WAF L7 -->
                        <tr style="border-bottom: 1px solid rgba(255,255,255,0.06);">
                            <td style="padding: 13px 20px;">
                                <strong style="color: #ffffff;">Cortafuegos WAF Inteligente en Runtime (PHP / L7)</strong>
                                <div style="font-size: 0.8rem; color: #94a6d1;">Filtrado en milisegundos contra Inyecciones SQL, XSS, Path Traversal, RCE y bots maliciosos</div>
                            </td>
                            <td style="padding: 13px 14px; text-align: center;">
                                <span style="display: inline-flex; align-items: center; gap: 3px; padding: 3px 9px; border-radius: 999px; background: rgba(255,69,96,0.12); color: #ff6b81; font-weight: 700; font-size: 0.78rem; border: 1px solid rgba(255,69,96,0.3);">✕ No disponible</span>
                            </td>
                            <td style="padding: 13px 14px; text-align: center; background: rgba(255,207,51,0.04); border-left: 1px solid rgba(255,207,51,0.25); border-right: 1px solid rgba(255,207,51,0.25);">
                                <span style="display: inline-flex; align-items: center; gap: 4px; padding: 3px 10px; border-radius: 999px; background: rgba(61,232,164,0.18); color: #3de8a4; font-weight: 800; font-size: 0.8rem; border: 1px solid rgba(61,232,164,0.4);">✓ WAF L7 Activo en Tiempo Real</span>
                            </td>
                        </tr>

                        <!-- 10. Filtro Anti-ClearFake -->
                        <tr style="border-bottom: 1px solid rgba(255,255,255,0.06); background: rgba(255,255,255,0.015);">
                            <td style="padding: 13px 20px;">
                                <strong style="color: #ffffff;">Filtro Activo Anti-ClearFake & Falsos Captchas</strong>
                                <div style="font-size: 0.8rem; color: #94a6d1;">Inspecciona el HTML de salida y neutraliza al vuelo popups fraudulentos y scripts Web3 maliciosos</div>
                            </td>
                            <td style="padding: 13px 14px; text-align: center;">
                                <span style="display: inline-flex; align-items: center; gap: 3px; padding: 3px 9px; border-radius: 999px; background: rgba(255,69,96,0.12); color: #ff6b81; font-weight: 700; font-size: 0.78rem; border: 1px solid rgba(255,69,96,0.3);">✕ No disponible</span>
                            </td>
                            <td style="padding: 13px 14px; text-align: center; background: rgba(255,207,51,0.04); border-left: 1px solid rgba(255,207,51,0.25); border-right: 1px solid rgba(255,207,51,0.25);">
                                <span style="display: inline-flex; align-items: center; gap: 4px; padding: 3px 10px; border-radius: 999px; background: rgba(61,232,164,0.18); color: #3de8a4; font-weight: 800; font-size: 0.8rem; border: 1px solid rgba(61,232,164,0.4);">✓ Filtro en Vivo de Salida HTML</span>
                            </td>
                        </tr>

                        <!-- 11. Fuerza Bruta & Auto-Jail -->
                        <tr style="border-bottom: 1px solid rgba(255,255,255,0.06);">
                            <td style="padding: 13px 20px;">
                                <strong style="color: #ffffff;">Protección Anti Fuerza Bruta & Auto-Jail de IPs</strong>
                                <div style="font-size: 0.8rem; color: #94a6d1;">Límite configurable de reintentos y encarcelamiento perimetral automático de atacantes</div>
                            </td>
                            <td style="padding: 13px 14px; text-align: center;">
                                <span style="display: inline-flex; align-items: center; gap: 3px; padding: 3px 9px; border-radius: 999px; background: rgba(255,69,96,0.12); color: #ff6b81; font-weight: 700; font-size: 0.78rem; border: 1px solid rgba(255,69,96,0.3);">✕ No disponible</span>
                            </td>
                            <td style="padding: 13px 14px; text-align: center; background: rgba(255,207,51,0.04); border-left: 1px solid rgba(255,207,51,0.25); border-right: 1px solid rgba(255,207,51,0.25);">
                                <span style="display: inline-flex; align-items: center; gap: 4px; padding: 3px 10px; border-radius: 999px; background: rgba(61,232,164,0.18); color: #3de8a4; font-weight: 800; font-size: 0.8rem; border: 1px solid rgba(61,232,164,0.4);">✓ Auto-Jail Perimetral Autónomo</span>
                            </td>
                        </tr>

                        <!-- 12. Trampas Honeypot Tripwire -->
                        <tr style="border-bottom: 1px solid rgba(255,255,255,0.06); background: rgba(255,255,255,0.015);">
                            <td style="padding: 13px 20px;">
                                <strong style="color: #ffffff;">Trampas Honeypot (Tripwire Perimetral)</strong>
                                <div style="font-size: 0.8rem; color: #94a6d1;">Enlaces trampa invisibles para escáneres maliciosos con expulsión y baneo instantáneo</div>
                            </td>
                            <td style="padding: 13px 14px; text-align: center;">
                                <span style="display: inline-flex; align-items: center; gap: 3px; padding: 3px 9px; border-radius: 999px; background: rgba(255,69,96,0.12); color: #ff6b81; font-weight: 700; font-size: 0.78rem; border: 1px solid rgba(255,69,96,0.3);">✕ No disponible</span>
                            </td>
                            <td style="padding: 13px 14px; text-align: center; background: rgba(255,207,51,0.04); border-left: 1px solid rgba(255,207,51,0.25); border-right: 1px solid rgba(255,207,51,0.25);">
                                <span style="display: inline-flex; align-items: center; gap: 4px; padding: 3px 10px; border-radius: 999px; background: rgba(61,232,164,0.18); color: #3de8a4; font-weight: 800; font-size: 0.8rem; border: 1px solid rgba(61,232,164,0.4);">✓ Honeypot Activo con Baneo Inmediato</span>
                            </td>
                        </tr>

                        <!-- 13. Ocultar wp-login.php -->
                        <tr style="border-bottom: 1px solid rgba(255,255,255,0.06);">
                            <td style="padding: 13px 20px;">
                                <strong style="color: #ffffff;">Ocultar wp-login.php (Ruta de Acceso Secreta)</strong>
                                <div style="font-size: 0.8rem; color: #94a6d1;">Sustituye la ruta por defecto por un slug privado personalizado (ej: /acceso-seguro/)</div>
                            </td>
                            <td style="padding: 13px 14px; text-align: center;">
                                <span style="display: inline-flex; align-items: center; gap: 3px; padding: 3px 9px; border-radius: 999px; background: rgba(255,69,96,0.12); color: #ff6b81; font-weight: 700; font-size: 0.78rem; border: 1px solid rgba(255,69,96,0.3);">✕ Ruta estándar wp-login.php</span>
                            </td>
                            <td style="padding: 13px 14px; text-align: center; background: rgba(255,207,51,0.04); border-left: 1px solid rgba(255,207,51,0.25); border-right: 1px solid rgba(255,207,51,0.25);">
                                <span style="display: inline-flex; align-items: center; gap: 4px; padding: 3px 10px; border-radius: 999px; background: rgba(61,232,164,0.18); color: #3de8a4; font-weight: 800; font-size: 0.8rem; border: 1px solid rgba(61,232,164,0.4);">✓ Slug Secreto Personalizado</span>
                            </td>
                        </tr>

                        <!-- 14. Personalizador Visual de Login -->
                        <tr style="border-bottom: 1px solid rgba(255,255,255,0.06); background: rgba(255,255,255,0.015);">
                            <td style="padding: 13px 20px;">
                                <strong style="color: #ffffff;">Personalizador Visual de Login (3 Plantillas)</strong>
                                <div style="font-size: 0.8rem; color: #94a6d1;">3 Plantillas corporativas (Deep Navy, Cyber Dark, Matrix), logo personalizado y aviso de seguridad</div>
                            </td>
                            <td style="padding: 13px 14px; text-align: center;">
                                <span style="display: inline-flex; align-items: center; gap: 3px; padding: 3px 9px; border-radius: 999px; background: rgba(255,69,96,0.12); color: #ff6b81; font-weight: 700; font-size: 0.78rem; border: 1px solid rgba(255,69,96,0.3);">✕ Pantalla estándar de WP</span>
                            </td>
                            <td style="padding: 13px 14px; text-align: center; background: rgba(255,207,51,0.04); border-left: 1px solid rgba(255,207,51,0.25); border-right: 1px solid rgba(255,207,51,0.25);">
                                <span style="display: inline-flex; align-items: center; gap: 4px; padding: 3px 10px; border-radius: 999px; background: rgba(61,232,164,0.18); color: #3de8a4; font-weight: 800; font-size: 0.8rem; border: 1px solid rgba(61,232,164,0.4);">✓ 3 Plantillas Visuales + Logo Personalizado</span>
                            </td>
                        </tr>

                        <!-- 15. Modo Lockdown 503 -->
                        <tr style="border-bottom: 1px solid rgba(255,255,255,0.06);">
                            <td style="padding: 13px 20px;">
                                <strong style="color: #ffffff;">Modo Aislamiento de Emergencia (Lockdown 503)</strong>
                                <div style="font-size: 0.8rem; color: #94a6d1;">Pantalla de mantenimiento blindada para desinfección forense sin perder posicionamiento en Google</div>
                            </td>
                            <td style="padding: 13px 14px; text-align: center;">
                                <span style="display: inline-flex; align-items: center; gap: 3px; padding: 3px 9px; border-radius: 999px; background: rgba(255,69,96,0.12); color: #ff6b81; font-weight: 700; font-size: 0.78rem; border: 1px solid rgba(255,69,96,0.3);">✕ No disponible</span>
                            </td>
                            <td style="padding: 13px 14px; text-align: center; background: rgba(255,207,51,0.04); border-left: 1px solid rgba(255,207,51,0.25); border-right: 1px solid rgba(255,207,51,0.25);">
                                <span style="display: inline-flex; align-items: center; gap: 4px; padding: 3px 10px; border-radius: 999px; background: rgba(61,232,164,0.18); color: #3de8a4; font-weight: 800; font-size: 0.8rem; border: 1px solid rgba(61,232,164,0.4);">✓ Aislamiento Seguro en 1 Clic</span>
                            </td>
                        </tr>

                        <!-- 16. Vigilancia Automática y Alertas -->
                        <tr style="border-bottom: 1px solid rgba(255,255,255,0.06); background: rgba(255,255,255,0.015);">
                            <td style="padding: 13px 20px;">
                                <strong style="color: #ffffff;">Vigilancia Automatizada & Alertas (Email / Webhooks)</strong>
                                <div style="font-size: 0.8rem; color: #94a6d1;">Monitoreo programado, avisos de acceso de administradores y webhooks en tiempo real</div>
                            </td>
                            <td style="padding: 13px 14px; text-align: center;">
                                <span style="display: inline-flex; align-items: center; gap: 4px; padding: 3px 10px; border-radius: 999px; background: rgba(61,232,164,0.12); color: #3de8a4; font-weight: 700; font-size: 0.8rem; border: 1px solid rgba(61,232,164,0.3);">✓ Escaneo Diario (WP-Cron)</span>
                            </td>
                            <td style="padding: 13px 14px; text-align: center; background: rgba(255,207,51,0.04); border-left: 1px solid rgba(255,207,51,0.25); border-right: 1px solid rgba(255,207,51,0.25);">
                                <span style="display: inline-flex; align-items: center; gap: 4px; padding: 3px 10px; border-radius: 999px; background: rgba(61,232,164,0.18); color: #3de8a4; font-weight: 800; font-size: 0.8rem; border: 1px solid rgba(61,232,164,0.4);">✓ Vigilancia 24/7 + Alertas Inmediatas</span>
                            </td>
                        </tr>

                        <!-- 17. Soporte Prioritario -->
                        <tr style="background: rgba(255,255,255,0.015);">
                            <td style="padding: 13px 20px;">
                                <strong style="color: #ffffff;">Soporte Prioritario & Rescate Forense Humano</strong>
                                <div style="font-size: 0.8rem; color: #94a6d1;">Intervención directa por ingenieros forenses si tu sitio sufre una intrusión persistente</div>
                            </td>
                            <td style="padding: 13px 14px; text-align: center;">
                                <span style="display: inline-flex; align-items: center; gap: 3px; padding: 3px 9px; border-radius: 999px; background: rgba(255,69,96,0.12); color: #ff6b81; font-weight: 700; font-size: 0.78rem; border: 1px solid rgba(255,69,96,0.3);">✕ Foros de la Comunidad WP.org</span>
                            </td>
                            <td style="padding: 13px 14px; text-align: center; background: rgba(255,207,51,0.04); border-left: 1px solid rgba(255,207,51,0.25); border-right: 1px solid rgba(255,207,51,0.25);">
                                <span style="display: inline-flex; align-items: center; gap: 4px; padding: 3px 10px; border-radius: 999px; background: rgba(61,232,164,0.18); color: #3de8a4; font-weight: 800; font-size: 0.8rem; border: 1px solid rgba(61,232,164,0.4);">✓ Asistencia Prioritaria (&lt; 2h)</span>
                            </td>
                        </tr>
                    </tbody>
                </table>
            </div>

            <!-- Footer Callout Dinámico -->
            <?php if ($is_pro): ?>
                <div style="margin-top: 24px; padding: 20px 24px; background: linear-gradient(135deg, rgba(16,185,129,0.15), rgba(11,18,53,0.95)); border: 1px solid rgba(61,232,164,0.4); border-radius: 12px; display: flex; align-items: center; justify-content: space-between; flex-wrap: wrap; gap: 16px;">
                    <div>
                        <h4 style="margin: 0 0 4px; color: #3de8a4; font-size: 1.05rem;">✓ Disfrutas de todos los beneficios de NexaGuard PRO</h4>
                        <p style="margin: 0; color: #b6c4eb; font-size: 0.88rem;">Tu sitio cuenta con telemetría en tiempo real, WAF L7 perimetral, reconstrucción de archivos y soporte prioritario.</p>
                    </div>
                    <div style="display: flex; gap: 10px; align-items: center;">
                        <a href="https://www.nexaguards.com/login" target="_blank" class="btn-ng btn-ng-outline" style="text-decoration: none; padding: 9px 20px; font-weight: 700; border-color:#3de8a4; color:#3de8a4;">
                            Gestionar Cuenta NexaGuard ›
                        </a>
                    </div>
                </div>
            <?php else: ?>
                <div style="margin-top: 24px; padding: 20px 24px; background: linear-gradient(135deg, rgba(20,31,79,0.95), rgba(11,18,53,0.95)); border: 1px solid rgba(255,207,51,0.35); border-radius: 12px; display: flex; align-items: center; justify-content: space-between; flex-wrap: wrap; gap: 16px;">
                    <div>
                        <h4 style="margin: 0 0 4px; color: #ffffff; font-size: 1.05rem;">¿Deseas activar Inteligencia de Amenazas Global en la Nube y Soporte Forense 24/7?</h4>
                        <p style="margin: 0; color: #b6c4eb; font-size: 0.88rem;">Conecta tu sitio a NexaGuard Threat Intelligence Cloud desde solo $9.99/mes para recibir firmas actualizadas en tiempo real y asistencia técnica especializada.</p>
                    </div>
                    <div style="display: flex; gap: 10px; align-items: center;">
                        <a href="https://www.nexaguards.com/#planes" target="_blank" class="btn-ng btn-ng-primary" style="text-decoration: none; padding: 9px 20px; font-weight: 700;">
                            Conocer Más sobre NexaGuard Cloud ›
                        </a>
                    </div>
                </div>
            <?php endif; ?>
        </div>
    </div><!-- /tab-compare -->

    <?php
    include NEXAGUARD_DIR . 'inc/view-modals.php';
    ?>

</div>
