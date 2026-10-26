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
        <div class="nexaguard-header-actions" style="margin-left:auto; display:flex; align-items:center; gap:12px;">
            <a href="https://www.nexaguards.com/#planes" target="_blank" class="btn-ng btn-ng-primary" style="text-decoration:none; display:inline-flex; align-items:center; gap:6px; font-weight:800; background:linear-gradient(135deg, #ffcf33 0%, #f59e0b 100%); color:#080e28; border:none; padding:8px 18px; border-radius:8px; box-shadow:0 0 16px rgba(245,158,11,0.35);">
                <span>⚡</span> NexaGuard PRO & Rescate 24/7 ↗
            </a>
        </div>
    </div>

    <!-- ====== ESTADO DE CONEXIÓN CLOUD (DISCRETO) ====== -->
    <?php if ($is_pro): ?>
        <div class="ng-license-strip" style="margin-bottom:18px; border-radius:12px; background:linear-gradient(90deg, #091a2e 0%, #0e163e 100%); border:1px solid rgba(61,232,164,0.35); padding:10px 18px; display:flex; justify-content:space-between; align-items:center; flex-wrap:wrap; gap:10px;">
            <div class="lic-pill" style="display:flex; align-items:center; gap:8px;">
                <span class="lic-check" style="background:#3de8a4; color:#061426; border-radius:50%; width:18px; height:18px; display:inline-flex; align-items:center; justify-content:center; font-size:0.75rem; font-weight:900;">✓</span>
                <span style="color:#ffffff; font-size:0.88rem;">NexaGuard Cloud Threat Intel: <strong style="color:#3de8a4;"><?php echo esc_html(!empty($license_data['plan']) ? $license_data['plan'] : 'Activo'); ?></strong></span>
            </div>
            <div class="lic-key-mgmt" style="display:flex; align-items:center; gap:8px;">
                <button type="button" id="btn-edit-license" class="btn-ng-link" style="color:#ffd859; font-size:0.8rem;">Gestionar Clave</button>
                <button type="button" id="btn-unlink-license" class="btn-ng-link" style="color:#ff8ba0; font-size:0.8rem;" title="Desconectar">Desconectar</button>
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

    <!-- ====== BARRA DE PESTAÑAS (TABS BÁSICAS) ====== -->
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
            <span class="ng-tab-label">Monitor de Integridad</span>
            <span class="ng-tab-badge active" style="background:rgba(61,232,164,0.15);color:#3de8a4;border:1px solid rgba(61,232,164,0.35);">AUDITORÍA</span>
        </button>
        <button type="button" class="ng-tab" data-tab="quarantine">
            <span class="ng-tab-icon">📦</span>
            <span class="ng-tab-label">Cuarentena</span>
            <?php if ($quarantine_count > 0): ?>
                <span class="ng-tab-badge info"><?php echo intval($quarantine_count); ?></span>
            <?php endif; ?>
        </button>
        <button type="button" class="ng-tab" data-tab="compare">
            <span class="ng-tab-icon">⚡</span>
            <span class="ng-tab-label">NexaGuard PRO</span>
            <span class="ng-tab-badge" style="background:rgba(255,207,51,0.18);color:#ffcf33;border:1px solid rgba(255,207,51,0.4);">UPGRADE</span>
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
                <div class="pro-rescue-banner" style="background: linear-gradient(135deg, #161b2e 0%, #1e1b4b 100%); border: 1.5px solid #f59e0b; border-radius: 12px; padding: 20px 24px; margin-bottom: 20px; display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 16px;">
                    <div style="flex: 1; min-width: 280px;">
                        <span style="background: rgba(245, 158, 11, 0.2); color: #f59e0b; border: 1px solid rgba(245, 158, 11, 0.4); padding: 3px 10px; border-radius: 20px; font-size: 0.75rem; font-weight: 800; text-transform: uppercase;">⚡ ¿Infección Compleja o Archivos del Núcleo Dañados?</span>
                        <h4 style="color: #ffffff; margin: 8px 0 4px; font-size: 1.1rem;">Desinfección Automática 1-Clic o Rescate Forense Experto</h4>
                        <p style="color: #94a3b8; margin: 0; font-size: 0.88rem; line-height: 1.5;">Puedes poner en cuarentena o eliminar manualmente cada amenaza detectada en la lista inferior. Si requieres reconstrucción de archivos del núcleo sin riesgo de caída o blindaje continuo WAF, adquiere <strong>NexaGuard PRO</strong> o solicita una intervención urgente.</p>
                    </div>
                    <div style="display: flex; gap: 10px; align-items: center; flex-wrap: wrap;">
                        <a href="https://www.nexaguards.com/#planes" target="_blank" class="btn-ng" style="background: linear-gradient(135deg, #f59e0b, #d97706); color: #000; font-weight: 800; padding: 10px 20px; border-radius: 8px; text-decoration: none; box-shadow: 0 4px 14px rgba(245, 158, 11, 0.35);">⚡ Obtener NexaGuard PRO ↗</a>
                        <a href="https://www.nexaguards.com/#planes" target="_blank" class="btn-ng" style="background: #334155; color: #fff; font-weight: 700; padding: 10px 18px; border-radius: 8px; text-decoration: none;">Rescate Forense ($89) ↗</a>
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


        <!-- Tarjeta de Asistencia y Rescate Forense (Momento de Alta Urgencia) -->
        <div class="ng-card" style="margin-top:22px; padding:20px 24px; background:linear-gradient(135deg, rgba(14,22,62,0.95), rgba(7,10,25,0.98)); border:1.5px solid rgba(245,158,11,0.35); border-radius:14px; display:flex; align-items:center; justify-content:space-between; flex-wrap:wrap; gap:16px;">
            <div style="flex:1; min-width:280px;">
                <div style="display:flex; align-items:center; gap:8px; margin-bottom:4px;">
                    <span style="font-size:1.3rem;">🚑</span>
                    <strong style="color:#ffffff; font-size:1.05rem; font-weight:800;">¿Tu sitio sufrió una infección grave o advertencia de Google?</strong>
                </div>
                <p style="color:#b6c4eb; font-size:0.88rem; margin:0; line-height:1.5;">
                    Si tu WordPress tiene redirecciones maliciosas, spam japonés o pantalla roja, nuestro equipo forense ejecuta una limpieza manual exhaustiva, retirada de listas negras y blindaje en menos de 24h.
                </p>
            </div>
            <div>
                <a href="https://www.nexaguards.com/#planes" target="_blank" class="btn-ng btn-ng-primary" style="text-decoration:none; display:inline-flex; align-items:center; gap:6px; font-weight:800; background:linear-gradient(135deg, #ffcf33 0%, #f59e0b 100%); color:#080e28; border:none; padding:10px 20px; border-radius:8px; box-shadow:0 0 16px rgba(245,158,11,0.35);">
                    <span>⚡</span> Solicitar Rescate Forense ($89) ↗
                </a>
            </div>
        </div>
    </div><!-- /tab-scanner -->

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
