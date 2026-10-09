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
$days_left = ($has_license && isset($license_data['days_left'])) ? intval($license_data['days_left']) : 0;
$is_expired = $has_license && (($license_data['status'] === 'expired') || $days_left <= 0);
$is_expiring_soon = $has_license && !$is_expired && $days_left <= 7;
$is_pro = $has_license && !$is_expired && !empty($license_data['valid']);
$is_standard = !$has_license;
$vigilance_active = $is_pro ? get_option('nexaguard_vigilance_active', 1) : 0;

// WAF settings (integrado en la misma vista)
$settings = wp_parse_args(get_option('nexaguard_settings', array()), array(
    'block_php_uploads'     => true,
    'disable_xmlrpc'        => true,
    'hide_wp_version'       => true,
    'waf_enabled'           => true,
    'anti_clearfake'        => true,
    'emergency_lockdown'    => false,
    'disallow_file_edit'    => false,
    'disable_dir_browsing'  => true,
    'brute_force_protection'=> true,
    'bf_max_retries'        => 5,
    'bf_lockout_time'       => 20,
    'hide_backend'          => false,
    'login_slug'            => 'acceso-seguro',
    'block_user_enumeration'=> true,
    'generic_login_errors'  => true,
    'protect_system_files'  => true,
    'admin_login_alerts'    => true,
    'login_custom_design'   => false,
    'login_bg_image'        => '',
    'login_bg_preset'       => 'deep-navy',
    'login_logo_image'      => '',
    'login_security_notice' => 'Estás iniciando sesión en tu WordPress protegido por NexaGuard'
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
                <h1>NexaGuard Security <span class="badge-v">v<?php echo NEXAGUARD_VERSION; ?></span></h1>
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
                <p style="font-size:0.94rem; color:#e2eafc !important; margin:0; line-height:1.55; font-weight:500;">Estás usando NexaGuard Security Estándar. Para activar el <strong style="color:#ffd859 !important; font-weight:700;">Sistema de Vigilancia Continua 24 Horas con Radar</strong> y la protección en tiempo real, activa tu Licencia PRO.</p>
            </div>
            <div class="lic-action" style="display:flex; align-items:center; gap:10px; flex-wrap:wrap;">
                <button type="button" id="btn-edit-license" class="btn-ng btn-ng-primary">🔑 Activar Licencia PRO</button>
                <a href="https://www.nexaguards.com/#planes" target="_blank" class="btn-ng btn-ng-outline" style="background:#141d4a !important; color:#ffffff !important; border:1.5px solid rgba(255,255,255,0.3) !important; margin-left:8px;">Obtener Plan PRO ($9.99/mes)</a>
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
                <strong style="display:block; font-size:1.08rem; font-weight:800; color:#ffffff !important; margin-bottom:4px;">ATENCIÓN: Tu suscripción a <?php echo esc_html($license_data['plan']); ?> vencerá en <?php echo $days_left; ?> días.</strong>
                <p style="font-size:0.94rem; color:#fff0c7 !important; margin:0; line-height:1.55; font-weight:500;">Renueva a tiempo en nexaguards.com para mantener el escudo y la vigilancia continua activos sin interrupciones.</p>
            </div>
            <div class="lic-action" style="display:flex; align-items:center; gap:10px; flex-wrap:wrap;">
                <a href="https://www.nexaguards.com/#planes" target="_blank" class="btn-ng btn-ng-primary">Renovar Suscripción</a>
                <button type="button" id="btn-edit-license" class="btn-ng btn-ng-outline" style="background:#141d4a !important; color:#ffffff !important; border:1.5px solid rgba(255,255,255,0.3) !important; margin-left:8px;">Cambiar Clave</button>
                <button type="button" id="btn-unlink-license" class="btn-ng btn-ng-link" style="color:#ff8ba0;margin-left:8px">Desvincular</button>
            </div>
        </div>
    <?php else: ?>
        <div class="ng-license-strip">
            <div class="lic-pill">
                <span class="lic-check">✓</span>
                <span>Licencia PRO Activa: <strong><?php echo esc_html($license_data['plan']); ?></strong></span>
                <span class="lic-exp">· Vence el: <strong><?php echo esc_html($license_data['expires_formatted']); ?></strong> (Quedan <?php echo $days_left; ?> días)</span>
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
                <span class="ng-tab-badge danger"><?php echo $threat_count; ?></span>
            <?php endif; ?>
        </button>
        <button type="button" class="ng-tab" data-tab="audit">
            <span class="ng-tab-icon">📊</span>
            <span class="ng-tab-label">Auditoría</span>
        </button>
        <button type="button" class="ng-tab" data-tab="vigilance">
            <span class="ng-tab-icon">📡</span>
            <span class="ng-tab-label">Vigilancia 24H</span>
            <?php if ($is_pro && $vigilance_active): ?>
                <span class="ng-tab-badge active">ON</span>
            <?php elseif (!$is_pro): ?>
                <span class="ng-tab-badge locked">🔒</span>
            <?php endif; ?>
        </button>
        <button type="button" class="ng-tab" data-tab="waf">
            <span class="ng-tab-icon">🛡️</span>
            <span class="ng-tab-label">Blindaje WAF</span>
            <?php if (!$is_pro): ?>
                <span class="ng-tab-badge locked">PRO</span>
            <?php endif; ?>
        </button>
        <button type="button" class="ng-tab" data-tab="quarantine">
            <span class="ng-tab-icon">🔒</span>
            <span class="ng-tab-label">Cuarentena</span>
            <?php if ($quarantine_count > 0): ?>
                <span class="ng-tab-badge info"><?php echo $quarantine_count; ?></span>
            <?php endif; ?>
        </button>
        <button type="button" class="ng-tab" data-tab="rollback">
            <span class="ng-tab-icon">↩️</span>
            <span class="ng-tab-label">Rollback</span>
            <?php if ($rollback_count > 0): ?>
                <span class="ng-tab-badge info"><?php echo $rollback_count; ?></span>
            <?php endif; ?>
        </button>
    </div>

    <!-- ====================================================================== -->
    <!-- TAB 1: ESCÁNER FORENSE                                                 -->
    <!-- ====================================================================== -->
    <div class="ng-tab-panel is-active" id="tab-scanner">

        <!-- Banner de estado dinámico -->
        <div id="scan-status-card" class="ng-card scan-summary-card <?php echo ($last_report && $last_report['threats_count'] > 0) ? 'status-danger' : 'status-clean'; ?>">
            <div class="summary-left">
                <div class="status-indicator">
                    <span id="status-icon"><?php echo ($last_report && $last_report['threats_count'] > 0) ? '⚠️' : '✓'; ?></span>
                </div>
                <div>
                    <h3 id="status-heading">
                        <?php 
                        if (!$last_report) {
                            echo 'Listo para Iniciar Análisis en Tiempo Real';
                        } elseif ($last_report['threats_count'] > 0) {
                            echo '¡Atención! Se detectaron ' . $last_report['threats_count'] . ' amenazas de seguridad';
                        } else {
                            echo 'Sistema 100% limpio y protegido';
                        }
                        ?>
                    </h3>
                    <p id="status-desc" class="status-desc-text">
                        <?php 
                        if ($last_report) {
                            echo 'Último análisis: <span class="status-highlight">' . date('d/m/Y H:i:s', $last_report['timestamp']) . '</span> · <span class="status-highlight">' . $last_report['scanned_files'] . ' archivos</span> analizados en <span class="status-highlight">' . $last_report['elapsed'] . 's</span>.';
                        } else {
                            echo 'Haz clic en <strong>"Iniciar Análisis Forense"</strong> para auditar plugins, temas, Core y base de datos con la base de firmas en tiempo real.';
                        }
                        ?>
                    </p>
                    <div class="scan-card-actions" style="margin-top:16px; display:flex; gap:10px; align-items:center; flex-wrap:wrap;">
                        <button type="button" id="btn-start-scan" class="btn-ng btn-ng-primary">
                            ⚡ Iniciar Análisis Forense
                        </button>
                        <button type="button" id="btn-reset-scan" class="btn-ng btn-ng-outline" title="Borrar historial anterior e iniciar vista limpia">
                            🔄 Limpiar Vista / Resetear
                        </button>
                    </div>
                </div>
            </div>
            <div class="summary-kpis">
                <div class="kpi-box kpi-threats-box">
                    <span class="kpi-val" id="kpi-threats"><?php echo $last_report ? $last_report['threats_count'] : '0'; ?></span>
                    <span class="kpi-lbl">Amenazas</span>
                </div>
                <div class="kpi-box">
                    <span class="kpi-val" id="kpi-files"><?php echo $last_report ? $last_report['scanned_files'] : '0'; ?></span>
                    <span class="kpi-lbl">Archivos auditados</span>
                </div>
                <div class="kpi-box">
                    <span class="kpi-val" id="kpi-quarantine"><?php echo $quarantine_count; ?></span>
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
                <span id="threats-badge" class="badge-count <?php echo ($last_report && $last_report['threats_count'] > 0) ? 'danger' : 'ok'; ?>">
                    <?php echo ($last_report) ? $last_report['threats_count'] . ' hallazgos' : '0 hallazgos'; ?>
                </span>
            </div>

            <?php if ($last_report && $last_report['threats_count'] > 0): ?>
                <?php if ($is_pro): ?>
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
                <?php else: ?>
                    <div class="threats-pro-banner">
                        <div class="tpb-badge">⚡ FUNCIÓN DE LIMPIEZA AUTOMÁTICA PRO</div>
                        <h4>Erradicación con 1 Clic Bloqueada · Se detectaron <?php echo $last_report['threats_count']; ?> amenazas</h4>
                        <p>NexaGuard ha localizado con precisión quirúrgica los archivos infectados y las inyecciones en base de datos. Para erradicarlos automáticamente sin romper tu sitio o encargar la desinfección a nuestros ingenieros:</p>
                        <div class="tpb-acts">
                            <button type="button" class="btn-ng btn-ng-primary btn-open-clean-modal">⚡ Desbloquear Erradicación con Plan PRO ($9.99/mes)</button>
                            <a href="https://www.nexaguards.com/#planes" target="_blank" class="btn-ng btn-ng-danger">Solicitar Plan Rescate ($99)</a>
                            <button type="button" class="btn-ng btn-ng-link btn-open-lic-modal" style="color:#ffcf33">Ya tengo mi clave de licencia ›</button>
                        </div>
                    </div>
                <?php endif; ?>
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
                                    <?php echo ($t['severity'] === 'crit') ? 'CRÍTICO' : 'ADVERTENCIA'; ?>
                                </span>
                                <h4><?php echo esc_html($t['title']); ?></h4>
                            </div>
                            <p class="threat-desc"><?php echo esc_html($t['desc']); ?></p>
                            <div class="threat-loc">
                                <code><?php echo esc_html($t['file']); ?><?php echo ($t['line'] > 0) ? ' : Línea ' . $t['line'] : ''; ?></code>
                            </div>
                            <?php if (!empty($t['code'])): ?>
                                <pre class="threat-snippet"><code><?php echo esc_html($t['code']); ?></code></pre>
                            <?php endif; ?>
                            <div class="threat-actions">
                                <?php if ($is_pro): ?>
                                    <?php if ($is_hseo): ?>
                                        <button type="button" class="btn-ng btn-ng-danger btn-delete-plugin-folder" data-target="<?php echo esc_attr($t['full_path']); ?>" data-id="<?php echo esc_attr($t['id']); ?>" title="Destruir la carpeta completa de este plugin troyano">
                                            💥 Destruir Carpeta del Plugin (HSEO)
                                        </button>
                                    <?php endif; ?>

                                    <?php if (empty($t['is_db'])): ?>
                                        <?php if ($t['clean_action'] === 'restore_core_file'): ?>
                                            <button type="button" class="btn-ng btn-ng-action btn-clean-threat" data-type="restore_core_file" data-target="<?php echo esc_attr($t['full_path']); ?>" data-id="<?php echo esc_attr($t['id']); ?>" title="Descargar y restaurar el archivo original limpio desde WordPress.org">
                                                🔄 Restaurar Archivo Original (WordPress.org)
                                            </button>
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
                                                🔒 Mover a Cuarentena
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
                                <?php else: ?>
                                    <!-- En Modo Estándar: Botones bloqueados que abren la conversión -->
                                    <button type="button" class="btn-ng btn-ng-danger btn-locked-clean" data-target="<?php echo esc_attr($t['file']); ?>" title="Erradicar amenaza (Requiere Plan Pro o Rescate)">
                                        🔒 Erradicar Amenaza (Función PRO)
                                    </button>
                                    <button type="button" class="btn-ng btn-ng-outline btn-locked-clean" data-target="<?php echo esc_attr($t['file']); ?>" title="Mover a cuarentena (Requiere Plan Pro)">
                                        🔒 Cuarentena (Función PRO)
                                    </button>
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
                    <div class="folder-item <?php echo $is_danger ? 'has-threats' : ''; ?>" id="folder-item-<?php echo esc_attr($key); ?>">
                        <div class="folder-left">
                            <span class="folder-icon"><?php echo esc_html($item['icon']); ?></span>
                            <div class="folder-info">
                                <h4 class="folder-title"><?php echo esc_html($item['name']); ?></h4>
                                <span class="folder-path"><?php echo esc_html($item['path']); ?></span>
                                <span class="folder-count">
                                    <b id="count-<?php echo esc_attr($key); ?>"><?php echo number_format_i18n($item['files']); ?></b> elementos evaluados
                                </span>
                            </div>
                        </div>
                        <div class="folder-right">
                            <span class="folder-status-badge <?php echo $is_danger ? 'danger' : 'clean'; ?>" id="badge-<?php echo esc_attr($key); ?>">
                                <?php echo $is_danger ? '⚠️ ' . $item['threats'] . ' detectado(s)' : '✓ Limpio'; ?>
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

        <div class="ng-card vigilance-card <?php echo !$is_pro ? 'vigilance-locked' : ''; ?>">
            <div class="vigilance-header">
                <div class="vigilance-info">
                    <?php if ($is_pro): ?>
                        <span class="vigilance-tag">⚡ SISTEMA PRO ACTIVO</span>
                    <?php else: ?>
                        <span class="vigilance-tag" style="background:rgba(255,107,138,.12);color:#ff6b8a;border-color:rgba(255,107,138,.35)">🔒 BLOQUEADO · REQUIERE PLAN PRO</span>
                    <?php endif; ?>
                    <h3 class="vigilance-title">Sistema de Vigilancia 24 Horas contra Amenazas</h3>
                    <p class="vigilance-sub">Supervisión continua en segundo plano sin necesidad de análisis manuales: inspecciona scripts PHP, uploads y base de datos.</p>
                </div>
                <div class="vigilance-action">
                    <?php if ($is_pro): ?>
                        <button type="button" id="btn-toggle-vigilance" class="btn-vigilance-toggle <?php echo $vigilance_active ? 'is-active' : ''; ?>" data-active="<?php echo $vigilance_active ? '1' : '0'; ?>" data-locked="0">
                            <span class="v-switch-knob"></span>
                            <span id="v-toggle-label"><?php echo $vigilance_active ? 'VIGILANCIA ACTIVA 24H' : 'ACTIVAR VIGILANCIA 24H'; ?></span>
                        </button>
                    <?php else: ?>
                        <button type="button" id="btn-toggle-vigilance" class="btn-vigilance-toggle btn-vigilance-locked" data-locked="1" title="Haz clic para activar tu clave de licencia o adquirir el Plan Pro">
                            <span class="v-switch-knob"></span>
                            <span id="v-toggle-label">🔒 DESBLOQUEAR CON PLAN PRO</span>
                        </button>
                    <?php endif; ?>
                </div>
            </div>

            <div id="vigilance-radar-box" class="vigilance-radar-box <?php echo !$is_pro ? 'radar-locked radar-paused' : ($vigilance_active ? 'radar-scanning' : 'radar-paused'); ?>">
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
                        if (!$is_pro) {
                            echo '🔒 Sistema de vigilancia en pausa. Requiere licencia NexaGuard Pro activa.';
                        } else {
                            echo $vigilance_active ? '🟢 El sistema de vigilancia de 24 horas para tu web está activado.' : '⏸️ Sistema de vigilancia en pausa. Actívalo para proteger tu web.';
                        }
                        ?>
                    </h4>
                    <p id="radar-status-sub">
                        <?php 
                        if (!$is_pro) {
                            echo 'Activa tu clave de licencia del Plan NexaGuard Security Pro ($9.99/mes) para iniciar la supervisión perimetral autónoma.';
                        } else {
                            echo $vigilance_active ? 'NexaGuard Cloud Radar supervisa continuamente inyecciones PHP, cambios en archivos y peticiones maliciosas.' : 'Haz clic en el botón superior para activar el radar perimetral permanente.';
                        }
                        ?>
                    </p>
                    <?php if (!$is_pro): ?>
                        <div class="radar-lock-badge">
                            <span>🔒 Función Pro</span>
                            <button type="button" class="btn-ng btn-ng-link btn-open-lic-modal" style="color:#ffcf33;font-weight:700">Ingresar Clave de Licencia ›</button>
                        </div>
                    <?php endif; ?>
                </div>
            </div>
        </div>

    </div><!-- /tab-vigilance -->

    <!-- ====================================================================== -->
    <!-- TAB 4: BLINDAJE WAF (integrado)                                        -->
    <!-- ====================================================================== -->
    <div class="ng-tab-panel" id="tab-waf">

        <!-- Banner cuando WAF está bloqueado en edición estándar -->
        <?php if (!$is_pro): ?>
            <div class="waf-locked-banner" style="background:#fff0f3 !important; border:1.5px solid #ff4d6d !important; border-radius:14px; padding:24px 26px; margin-top:0; box-shadow:0 10px 30px rgba(0,0,0,0.15) !important;">
                <div class="wlb-icon" style="font-size:2.4rem; line-height:1;">🔒</div>
                <div class="wlb-content">
                    <span class="wlb-tag" style="background:#ffd1dc !important; color:#991b1b !important; border:1px solid #ff4d6d !important; font-weight:800 !important; padding:4px 12px; border-radius:999px; display:inline-block; margin-bottom:8px; font-size:0.75rem; letter-spacing:0.05em;">PROTECCIÓN PERIMETRAL BLOQUEADA · REQUIERE PLAN PRO</span>
                    <h3 style="color:#0f172a !important; font-size:1.35rem !important; font-weight:800 !important; margin:0 0 8px;">Blindaje Activo y Cortafuegos WAF en Pausa</h3>
                    <p style="color:#334155 !important; font-size:0.95rem !important; line-height:1.6 !important; margin:0 0 18px; max-width:78ch; font-weight:500;">No esperes a que tu sitio sea hackeado: el Blindaje WAF intercepta a los intrusos <strong style="color:#0f172a !important; font-weight:700;">antes de que logren tocar tus archivos o infectar la base de datos de WordPress</strong>. Bloquea de inmediato inyecciones maliciosas, accesos a carpetas sensibles y puertas traseras en tiempo real.</p>
                    <div class="wlb-actions" style="display:flex; align-items:center; gap:12px; flex-wrap:wrap;">
                        <button type="button" class="btn-ng btn-ng-primary btn-open-upgrade-modal">⚡ Desbloquear con Plan PRO ($9.99/mes)</button>
                        <a href="https://www.nexaguards.com/#contacto" target="_blank" class="btn-ng btn-ng-danger">👨‍💻 Solicitar Especialista (Plan Rescate $99)</a>
                        <button type="button" class="btn-ng btn-ng-link btn-open-lic-modal" style="color:#9a3412 !important; font-weight:700; text-decoration:underline;">Ya tengo mi clave de licencia ›</button>
                    </div>
                </div>
            </div>
        <?php endif; ?>

        <form id="form-waf-settings" class="ng-card <?php echo !$is_pro ? 'waf-locked-form' : ''; ?>" style="margin-top:18px;">
            <div class="card-title-bar">
                <h3>Reglas de Protección en Tiempo Real</h3>
                <?php if (!$is_pro): ?>
                    <span class="badge-v" style="background:rgba(255,107,138,.12);color:#ff8ba0">🔒 Bloqueadas en Edición Estándar</span>
                <?php endif; ?>
            </div>
            <p class="ng-hint">Estas medidas frenan intentos de intrusión antes de que toquen la base de datos o el núcleo de WordPress.</p>

            <div class="toggle-list <?php echo !$is_pro ? 'waf-locked-container' : ''; ?>">
                <!-- WAF Core -->
                <label class="toggle-row <?php echo !$is_pro ? 'row-locked' : ''; ?>">
                    <div class="toggle-info">
                        <b>Cortafuegos de Aplicación Web (WAF Inteligente)
                            <span class="ng-tooltip-btn" tabindex="0">
                                <span class="ng-tooltip-icon">ℹ️</span>
                                <span class="ng-tooltip-popover">
                                    <strong class="ng-tooltip-title">🛡️ Cortafuegos Perimetral WAF</strong>
                                    <span class="ng-tooltip-desc">Filtra todo el tráfico entrante en milisegundos y bloquea ataques de hackers como Inyecciones SQL, Directory Traversal (../..), payloads XSS y webshells con respuesta 403 Forbidden.</span>
                                    <span class="ng-tooltip-rec">💡 Recomendado: SIEMPRE ACTIVO</span>
                                </span>
                            </span>
                            <?php if (!$is_pro): ?><span class="rule-lock-tag">🔒 PRO</span><?php endif; ?>
                        </b>
                        <p class="ng-hint">Filtra todas las peticiones entrantes bloqueando inyecciones SQL, Directory Traversal (../..), scripts maliciosos y webshells con respuesta 403 Forbidden.</p>
                    </div>
                    <input type="checkbox" name="waf_enabled" value="1" <?php checked(!empty($settings['waf_enabled'])); ?> class="ng-toggle" <?php disabled(!$is_pro); ?>>
                </label>

                <!-- Anti-ClearFake / Anti-ClickFix Live Filter -->
                <label class="toggle-row <?php echo !$is_pro ? 'row-locked' : ''; ?>">
                    <div class="toggle-info">
                        <b>Filtro Activo Anti-ClearFake y Falsos Captchas
                            <span class="ng-tooltip-btn" tabindex="0">
                                <span class="ng-tooltip-icon">ℹ️</span>
                                <span class="ng-tooltip-popover">
                                    <strong class="ng-tooltip-title">🛑 Anti-Engaño y Malware Web3</strong>
                                    <span class="ng-tooltip-desc">Inspecciona el HTML de salida y elimina en vivo falsos avisos de "Actualiza tu navegador" o "Resuelve este Captcha" inyectados en blockchain (EtherHiding) o scripts base64, protegiendo a tus visitantes.</span>
                                    <span class="ng-tooltip-rec">💡 Recomendado: SIEMPRE ACTIVO</span>
                                </span>
                            </span>
                            <?php if (!$is_pro): ?><span class="rule-lock-tag">🔒 PRO</span><?php endif; ?>
                        </b>
                        <p class="ng-hint">Inspecciona el HTML de salida en milisegundos y elimina al vuelo cualquier script base64 sospechoso o llamada a contratos inteligentes en blockchain (EtherHiding), impidiendo que los visitantes vean popups maliciosos.</p>
                    </div>
                    <input type="checkbox" name="anti_clearfake" value="1" <?php checked(!empty($settings['anti_clearfake'])); ?> class="ng-toggle" <?php disabled(!$is_pro); ?>>
                </label>

                <!-- Bloqueo de PHP en Uploads -->
                <label class="toggle-row <?php echo !$is_pro ? 'row-locked' : ''; ?>">
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
                            <?php if (!$is_pro): ?><span class="rule-lock-tag">🔒 PRO</span><?php endif; ?>
                        </b>
                        <p class="ng-hint">Instala una regla perimetral en .htaccess para que ningún archivo .php subido por atacantes pueda ser ejecutado. Neutraliza el 90% de backdoors.</p>
                    </div>
                    <input type="checkbox" name="block_php_uploads" value="1" <?php checked(!empty($settings['block_php_uploads'])); ?> class="ng-toggle" <?php disabled(!$is_pro); ?>>
                </label>

                <!-- Deshabilitar XML-RPC -->
                <label class="toggle-row <?php echo !$is_pro ? 'row-locked' : ''; ?>">
                    <div class="toggle-info">
                        <b>Deshabilitar completamente XML-RPC
                            <span class="ng-tooltip-btn" tabindex="0">
                                <span class="ng-tooltip-icon">ℹ️</span>
                                <span class="ng-tooltip-popover">
                                    <strong class="ng-tooltip-title">🚪 Clausura de Puerta XML-RPC</strong>
                                    <span class="ng-tooltip-desc">XML-RPC es un protocolo legado muy abusado por ciberdelincuentes para ataques masivos de fuerza bruta a contraseñas y ataques de amplificación DDoS. Cerrarlo blinda tu servidor.</span>
                                    <span class="ng-tooltip-rec">💡 Recomendado: ACTIVO (salvo si usas la app móvil clásica)</span>
                                </span>
                            </span>
                            <?php if (!$is_pro): ?><span class="rule-lock-tag">🔒 PRO</span><?php endif; ?>
                        </b>
                        <p class="ng-hint">Bloquea el archivo xmlrpc.php para detener ataques automatizados de fuerza bruta a contraseñas y ataques de amplificación DDoS.</p>
                    </div>
                    <input type="checkbox" name="disable_xmlrpc" value="1" <?php checked(!empty($settings['disable_xmlrpc'])); ?> class="ng-toggle" <?php disabled(!$is_pro); ?>>
                </label>

                <!-- Ocultar versión de WordPress -->
                <label class="toggle-row <?php echo !$is_pro ? 'row-locked' : ''; ?>">
                    <div class="toggle-info">
                        <b>Ocultar versión de WordPress (wp_generator)
                            <span class="ng-tooltip-btn" tabindex="0">
                                <span class="ng-tooltip-icon">ℹ️</span>
                                <span class="ng-tooltip-popover">
                                    <strong class="ng-tooltip-title">🙈 Ocultamiento de Metadatos</strong>
                                    <span class="ng-tooltip-desc">Elimina la etiqueta pública del código HTML que revela la versión exacta de tu WordPress. Dificulta que robots maliciosos detecten si tienes vulnerabilidades sin parchear.</span>
                                    <span class="ng-tooltip-rec">💡 Recomendado: ACTIVO</span>
                                </span>
                            </span>
                            <?php if (!$is_pro): ?><span class="rule-lock-tag">🔒 PRO</span><?php endif; ?>
                        </b>
                        <p class="ng-hint">Elimina la etiqueta meta generator que expone la versión exacta de tu WordPress a bots que buscan vulnerabilidades conocidas.</p>
                    </div>
                    <input type="checkbox" name="hide_wp_version" value="1" <?php checked(!empty($settings['hide_wp_version'])); ?> class="ng-toggle" <?php disabled(!$is_pro); ?>>
                </label>

                <!-- Modo Aislamiento de Emergencia -->
                <label class="toggle-row <?php echo !$is_pro ? 'row-locked' : ''; ?>" style="border-left: 3px solid #ff4560;">
                    <div class="toggle-info">
                        <b>Modo Aislamiento de Emergencia / Cuarentena de Tráfico
                            <span class="ng-tooltip-btn" tabindex="0">
                                <span class="ng-tooltip-icon">ℹ️</span>
                                <span class="ng-tooltip-popover">
                                    <strong class="ng-tooltip-title">🚨 Modo Rescate y Cuarentena</strong>
                                    <span class="ng-tooltip-desc">Desvía visitas públicas a una pantalla limpia 503 de mantenimiento. Evita que visitantes vean la web dañada o que Google penalice tu dominio con alertas rojas mientras limpias el sitio. Solo permite acceso al admin.</span>
                                    <span class="ng-tooltip-rec">💡 Recomendado: Usar SOLO durante desinfecciones activas</span>
                                </span>
                            </span>
                            <?php if (!$is_pro): ?><span class="rule-lock-tag">🔒 PRO</span><?php endif; ?>
                        </b>
                        <p class="ng-hint">Desvía visitas públicas y rastreadores a una pantalla limpia de 503 Mantenimiento de Seguridad para evitar contagios o alertas de Google Safe Browsing durante limpiezas, permitiendo el acceso exclusivo a los administradores logueados.</p>
                    </div>
                    <input type="checkbox" name="emergency_lockdown" value="1" <?php checked(!empty($settings['emergency_lockdown'])); ?> class="ng-toggle" <?php disabled(!$is_pro); ?>>
                </label>

                <!-- Deshabilitar Editor de Temas y Plugins -->
                <label class="toggle-row <?php echo !$is_pro ? 'row-locked' : ''; ?>">
                    <div class="toggle-info">
                        <b>Deshabilitar Editor de Temas y Plugins (DISALLOW_FILE_EDIT)
                            <span class="ng-tooltip-btn" tabindex="0">
                                <span class="ng-tooltip-icon">ℹ️</span>
                                <span class="ng-tooltip-popover">
                                    <strong class="ng-tooltip-title">🔒 Bloqueo de Edición en Escritorio</strong>
                                    <span class="ng-tooltip-desc">Deshabilita la opción de editar archivos de plantillas y plugins desde el panel de WordPress. Si un hacker consigue la clave de un admin, no podrá inyectar código PHP malicioso por ahí.</span>
                                    <span class="ng-tooltip-rec">💡 Recomendado: SIEMPRE ACTIVO en sitios en producción</span>
                                </span>
                            </span>
                            <?php if (!$is_pro): ?><span class="rule-lock-tag">🔒 PRO</span><?php endif; ?>
                        </b>
                        <p class="ng-hint">Impide que cualquier usuario modifique archivos PHP desde el panel de administración. Cierra la puerta principal a atacantes que intenten inyectar webshells si comprometen una cuenta admin.</p>
                    </div>
                    <input type="checkbox" name="disallow_file_edit" value="1" <?php checked(!empty($settings['disallow_file_edit'])); ?> class="ng-toggle" <?php disabled(!$is_pro); ?>>
                </label>

                <!-- Prevenir Listado de Directorios -->
                <label class="toggle-row <?php echo !$is_pro ? 'row-locked' : ''; ?>">
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
                            <?php if (!$is_pro): ?><span class="rule-lock-tag">🔒 PRO</span><?php endif; ?>
                        </b>
                        <p class="ng-hint">Añade directiva en .htaccess para que ningún visitante ni escáner automatizado pueda ver el listado de archivos dentro de carpetas de tu servidor.</p>
                    </div>
                    <input type="checkbox" name="disable_dir_browsing" value="1" <?php checked(!empty($settings['disable_dir_browsing'])); ?> class="ng-toggle" <?php disabled(!$is_pro); ?>>
                </label>

                <!-- Protección Anti Fuerza Bruta Local -->
                <div class="toggle-row <?php echo !$is_pro ? 'row-locked' : ''; ?>">
                    <div class="toggle-info">
                        <b>Protección Anti Fuerza Bruta Local (Bloqueo IP Automático)
                            <span class="ng-tooltip-btn" tabindex="0">
                                <span class="ng-tooltip-icon">ℹ️</span>
                                <span class="ng-tooltip-popover">
                                    <strong class="ng-tooltip-title">🛑 Escudo de Contraseñas por IP</strong>
                                    <span class="ng-tooltip-desc">Monitorea los intentos de login erróneos. Si una IP supera el límite de intentos consecutivos, se le bloquea el acceso temporalmente para frustrar ataques de diccionario automatizados.</span>
                                    <span class="ng-tooltip-rec">💡 Recomendado: SIEMPRE ACTIVO</span>
                                </span>
                            </span>
                            <?php if (!$is_pro): ?><span class="rule-lock-tag">🔒 PRO</span><?php endif; ?>
                        </b>
                        <p class="ng-hint">Bloquea temporalmente el acceso por IP tras reiterados intentos fallidos de autenticación para mitigar ataques de diccionario masivos.</p>
                        <?php if ($total_lockouts > 0): ?>
                            <div style="margin-top:6px;"><span class="badge-v" style="background:rgba(61,232,164,.15);color:#3de8a4;font-size:0.75rem;">🛡️ <?php echo $total_lockouts; ?> bloqueo(s) perimetral(es) registrados</span></div>
                        <?php endif; ?>
                        <div class="ng-subcontrols">
                            <label>Máx. Intentos Fallidos: <input type="number" name="bf_max_retries" value="<?php echo esc_attr($settings['bf_max_retries']); ?>" min="3" max="20" <?php disabled(!$is_pro); ?>></label>
                            <label>Tiempo de Bloqueo (minutos): <input type="number" name="bf_lockout_time" value="<?php echo esc_attr($settings['bf_lockout_time']); ?>" min="5" max="1440" <?php disabled(!$is_pro); ?>></label>
                        </div>
                    </div>
                    <label style="cursor:pointer; display:flex; align-items:center;">
                        <input type="checkbox" name="brute_force_protection" value="1" <?php checked(!empty($settings['brute_force_protection'])); ?> class="ng-toggle" <?php disabled(!$is_pro); ?>>
                    </label>
                </div>

                <!-- Ocultar URL de Acceso (Hide Backend) -->
                <div class="toggle-row <?php echo !$is_pro ? 'row-locked' : ''; ?>">
                    <div class="toggle-info">
                        <b>Ocultar URL de Acceso al Panel (Hide wp-login.php)
                            <span class="ng-tooltip-btn" tabindex="0">
                                <span class="ng-tooltip-icon">ℹ️</span>
                                <span class="ng-tooltip-popover">
                                    <strong class="ng-tooltip-title">🕵️ Ruta de Acceso Secreta</strong>
                                    <span class="ng-tooltip-desc">Oculta la dirección estándar 'wp-login.php' y la sustituye por una ruta personalizada que solo tú conoces. Los bots que intenten entrar por la puerta común recibirán un error 404.</span>
                                    <span class="ng-tooltip-rec">💡 Recomendado: Excelente para frenar bots molestos</span>
                                </span>
                            </span>
                            <?php if (!$is_pro): ?><span class="rule-lock-tag">🔒 PRO</span><?php endif; ?>
                        </b>
                        <p class="ng-hint">Reemplaza el acceso estándar a <code>wp-login.php</code> por una ruta secreta personalizada. Bots automatizados y atacantes que intenten acceder directamente recibirán un error 404 No Encontrado.</p>
                        <div class="ng-subcontrols">
                            <label>Ruta Personalizada: <span class="ng-slug-prefix"><?php echo esc_url(home_url('/')); ?></span><input type="text" name="login_slug" value="<?php echo esc_attr($settings['login_slug']); ?>" placeholder="acceso-seguro" class="ng-input-slug" style="width:140px;" <?php disabled(!$is_pro); ?>><span class="ng-slug-prefix">/</span></label>
                        </div>
                    </div>
                    <label style="cursor:pointer; display:flex; align-items:center;">
                        <input type="checkbox" name="hide_backend" value="1" <?php checked(!empty($settings['hide_backend'])); ?> class="ng-toggle" <?php disabled(!$is_pro); ?>>
                    </label>
                </div>

                <!-- Personalizador y Embellecedor Visual de Login (Login Customizer & Branding) -->
                <div class="toggle-row toggle-row-customizer <?php echo !$is_pro ? 'row-locked' : ''; ?>" style="border-left: 3px solid #ffcf33; flex-direction: column; align-items: stretch; gap: 14px;">
                    <div style="display: flex; justify-content: space-between; align-items: center; width: 100%;">
                        <div class="toggle-info">
                            <b>Personalizador y Embellecedor Visual de Login (Login Customizer & Branding)
                                <span class="ng-tooltip-btn" tabindex="0">
                                    <span class="ng-tooltip-icon">ℹ️</span>
                                    <span class="ng-tooltip-popover">
                                        <strong class="ng-tooltip-title">✨ Branding e Imagen de Seguridad</strong>
                                        <span class="ng-tooltip-desc">Sustituye la pantalla genérica de WordPress por un diseño profesional de alta tecnología con tu logo, fondos modernos y un sello de seguridad que certifica la protección de NexaGuard.</span>
                                        <span class="ng-tooltip-rec">💡 Recomendado: Para imagen corporativa y confianza</span>
                                    </span>
                                </span>
                                <?php if (!$is_pro): ?><span class="rule-lock-tag">🔒 PRO</span><?php endif; ?>
                            </b>
                            <p class="ng-hint">Transforma la pantalla estándar de <code>wp-login.php</code> con una experiencia visual moderna y elegante: añade tu propio fondo de pantalla, sustituye el icono de WordPress por tu logo y muestra un aviso de seguridad que indica que el sitio está protegido por NexaGuard.</p>
                        </div>
                        <label style="cursor:pointer; display:flex; align-items:center; margin-left: 14px;">
                            <input type="checkbox" name="login_custom_design" id="login_custom_design" value="1" <?php checked(!empty($settings['login_custom_design'])); ?> class="ng-toggle" <?php disabled(!$is_pro); ?>>
                        </label>
                    </div>

                    <!-- Panel de Controles y Previsualización -->
                    <div id="login-customizer-controls" class="login-customizer-grid" style="<?php echo empty($settings['login_custom_design']) ? 'opacity: 0.6;' : ''; ?>">
                        
                        <!-- Columna Izquierda: Opciones de Diseño -->
                        <div class="login-options-col">
                            <!-- Preset de fondo -->
                            <div class="login-opt-group">
                                <label class="login-opt-label">🎨 Estilo / Fondo de Pantalla:</label>
                                <div class="login-presets-wrap">
                                    <label class="preset-pill">
                                        <input type="radio" name="login_bg_preset" value="deep-navy" <?php checked($settings['login_bg_preset'] === 'deep-navy'); ?> <?php disabled(!$is_pro); ?>>
                                        <span>🛡️ Nexa Deep Navy</span>
                                    </label>
                                    <label class="preset-pill">
                                        <input type="radio" name="login_bg_preset" value="cyber-dark" <?php checked($settings['login_bg_preset'] === 'cyber-dark'); ?> <?php disabled(!$is_pro); ?>>
                                        <span>🌌 Cyber Dark Nebula</span>
                                    </label>
                                    <label class="preset-pill">
                                        <input type="radio" name="login_bg_preset" value="matrix" <?php checked($settings['login_bg_preset'] === 'matrix'); ?> <?php disabled(!$is_pro); ?>>
                                        <span>⚡ Matrix Cyberpunk</span>
                                    </label>
                                </div>
                            </div>

                            <!-- Imagen de Fondo Personalizada -->
                            <div class="login-opt-group">
                                <label class="login-opt-label">🖼️ Imagen de Fondo Personalizada (URL o Subir Archivo):</label>
                                <div class="input-with-actions">
                                    <input type="text" name="login_bg_image" id="login_bg_image" value="<?php echo esc_attr($settings['login_bg_image']); ?>" placeholder="https://ejemplo.com/fondo.jpg" class="ng-input-full" <?php disabled(!$is_pro); ?>>
                                    <button type="button" class="btn-ng btn-ng-outline btn-sm" id="btn-select-login-bg" <?php disabled(!$is_pro); ?>>📁 Elegir Imagen</button>
                                    <button type="button" class="btn-ng btn-ng-link btn-sm" id="btn-clear-login-bg" title="Quitar imagen" <?php disabled(!$is_pro); ?>>✕</button>
                                </div>
                                <span class="ng-hint" style="font-size:0.78rem;">Se aplicará en alta resolución con superposición translúcida de seguridad.</span>
                            </div>

                            <!-- Logo Personalizado (Sustituye icono WP) -->
                            <div class="login-opt-group">
                                <label class="login-opt-label">👑 Logo Personalizado (Sustituye el Icono de WordPress):</label>
                                <div class="input-with-actions">
                                    <input type="text" name="login_logo_image" id="login_logo_image" value="<?php echo esc_attr($settings['login_logo_image']); ?>" placeholder="https://ejemplo.com/logo.png" class="ng-input-full" <?php disabled(!$is_pro); ?>>
                                    <button type="button" class="btn-ng btn-ng-outline btn-sm" id="btn-select-login-logo" <?php disabled(!$is_pro); ?>>📁 Elegir Logo</button>
                                    <button type="button" class="btn-ng btn-ng-link btn-sm" id="btn-clear-login-logo" title="Quitar logo" <?php disabled(!$is_pro); ?>>✕</button>
                                </div>
                                <span class="ng-hint" style="font-size:0.78rem;">Si no subes ningún logo, se mostrará el elegante escudo dorado de NexaGuard Security.</span>
                            </div>

                            <!-- Mensaje de Seguridad -->
                            <div class="login-opt-group">
                                <label class="login-opt-label">🔒 Mensaje de Seguridad en la Pantalla de Acceso:</label>
                                <input type="text" name="login_security_notice" id="login_security_notice" value="<?php echo esc_attr($settings['login_security_notice']); ?>" placeholder="Estás iniciando sesión en tu WordPress protegido por NexaGuard" class="ng-input-full" <?php disabled(!$is_pro); ?>>
                                <span class="ng-hint" style="font-size:0.78rem;">Aparecerá como distintivo oficial de blindaje en la parte superior del formulario de login.</span>
                            </div>
                        </div>

                        <!-- Columna Derecha: Vista Previa en Vivo -->
                        <div class="login-preview-col">
                            <label class="login-opt-label" style="text-align:center; display:block; margin-bottom:8px;">👁️ Vista Previa en Tiempo Real:</label>
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

                <!-- Bloquear Enumeración de Usuarios -->
                <label class="toggle-row <?php echo !$is_pro ? 'row-locked' : ''; ?>">
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
                            <?php if (!$is_pro): ?><span class="rule-lock-tag">🔒 PRO</span><?php endif; ?>
                        </b>
                        <p class="ng-hint">Prohíbe a escáneres y visitantes anónimos extraer los nombres de usuario reales del sitio a través del endpoint REST API (<code>/wp-json/wp/v2/users</code>) y parámetros de autor (<code>/?author=1</code>).</p>
                    </div>
                    <input type="checkbox" name="block_user_enumeration" value="1" <?php checked(!empty($settings['block_user_enumeration'])); ?> class="ng-toggle" <?php disabled(!$is_pro); ?>>
                </label>

                <!-- Ofuscación Genérica de Errores de Acceso -->
                <label class="toggle-row <?php echo !$is_pro ? 'row-locked' : ''; ?>">
                    <div class="toggle-info">
                        <b>Ofuscación Genérica de Errores de Inicio de Sesión
                            <span class="ng-tooltip-btn" tabindex="0">
                                <span class="ng-tooltip-icon">ℹ️</span>
                                <span class="ng-tooltip-popover">
                                    <strong class="ng-tooltip-title">🎭 Respuestas Neutras en Login</strong>
                                    <span class="ng-tooltip-desc">Evita que WordPress revele si el usuario existe o si falló la contraseña. Muestra un único mensaje genérico para no dar pistas que ayuden a los atacantes en su intento de intrusión.</span>
                                    <span class="ng-tooltip-rec">💡 Recomendado: ACTIVO</span>
                                </span>
                            </span>
                            <?php if (!$is_pro): ?><span class="rule-lock-tag">🔒 PRO</span><?php endif; ?>
                        </b>
                        <p class="ng-hint">Sustituye mensajes detallados como <em>"El usuario no existe"</em> o <em>"Contraseña incorrecta"</em> por un mensaje genérico. Evita que un atacante determine si un usuario específico existe en la web.</p>
                    </div>
                    <input type="checkbox" name="generic_login_errors" value="1" <?php checked(!empty($settings['generic_login_errors'])); ?> class="ng-toggle" <?php disabled(!$is_pro); ?>>
                </label>

                <!-- Blindaje de Archivos del Sistema y wp-includes -->
                <label class="toggle-row <?php echo !$is_pro ? 'row-locked' : ''; ?>">
                    <div class="toggle-info">
                        <b>Blindaje de Archivos del Sistema y wp-includes (.htaccess)
                            <span class="ng-tooltip-btn" tabindex="0">
                                <span class="ng-tooltip-icon">ℹ️</span>
                                <span class="ng-tooltip-popover">
                                    <strong class="ng-tooltip-title">🏛️ Blindaje de Archivos Críticos</strong>
                                    <span class="ng-tooltip-desc">Protege a nivel de servidor web tus archivos más sensibles: bloquea el acceso a wp-config.php, prohíbe llamadas directas a scripts en /wp-includes/ y bloquea métodos HTTP peligrosos.</span>
                                    <span class="ng-tooltip-rec">💡 Recomendado: SIEMPRE ACTIVO</span>
                                </span>
                            </span>
                            <?php if (!$is_pro): ?><span class="rule-lock-tag">🔒 PRO</span><?php endif; ?>
                        </b>
                        <p class="ng-hint">Bloquea la ejecución directa de scripts PHP en la carpeta interna <code>/wp-includes/</code>, deniega el acceso a <code>wp-config.php</code>, <code>readme.html</code> y bloquea métodos HTTP no seguros (TRACE, TRACK, DEBUG).</p>
                    </div>
                    <input type="checkbox" name="protect_system_files" value="1" <?php checked(!empty($settings['protect_system_files'])); ?> class="ng-toggle" <?php disabled(!$is_pro); ?>>
                </label>

                <!-- Alertas de Acceso de Administrador por Email -->
                <label class="toggle-row <?php echo !$is_pro ? 'row-locked' : ''; ?>">
                    <div class="toggle-info">
                        <b>Alertas por Correo ante Inicio de Sesión de Administrador desde Nueva IP
                            <span class="ng-tooltip-btn" tabindex="0">
                                <span class="ng-tooltip-icon">ℹ️</span>
                                <span class="ng-tooltip-popover">
                                    <strong class="ng-tooltip-title">📧 Notificaciones de Seguridad Inmediatas</strong>
                                    <span class="ng-tooltip-desc">Te envía un email al instante cada vez que alguien inicie sesión como administrador desde una dirección IP o dispositivo no reconocido previamente, permitiéndote reaccionar a tiempo.</span>
                                    <span class="ng-tooltip-rec">💡 Recomendado: ACTIVO para monitoreo en vivo</span>
                                </span>
                            </span>
                            <?php if (!$is_pro): ?><span class="rule-lock-tag">🔒 PRO</span><?php endif; ?>
                        </b>
                        <p class="ng-hint">Envía una alerta inmediata al correo del administrador cada vez que se inicie sesión con privilegios de gestión desde una dirección IP no reconocida previamente.</p>
                    </div>
                    <input type="checkbox" name="admin_login_alerts" value="1" <?php checked(!empty($settings['admin_login_alerts'])); ?> class="ng-toggle" <?php disabled(!$is_pro); ?>>
                </label>
            </div>

            <div class="form-actions" style="margin-top:24px;border-top:1px solid rgba(255,255,255,.08);padding-top:18px;display:flex;align-items:center;flex-wrap:wrap;gap:12px;">
                <?php if ($is_pro): ?>
                    <button type="submit" class="btn-ng btn-ng-primary">Guardar y Aplicar Blindaje</button>
                    <span id="save-msg" class="ng-hint" style="margin-left:12px"></span>
                <?php else: ?>
                    <button type="button" id="btn-locked-waf-submit" class="btn-ng btn-ng-primary btn-locked-waf-submit btn-open-upgrade-modal" onclick="if(window.nexaguardOpenUpgradeModal){window.nexaguardOpenUpgradeModal();}else{jQuery('#clean-upgrade-modal').appendTo('body').css({display:'flex',opacity:1}).show();}" style="cursor:pointer">🔒 Desbloquear Blindaje con Plan PRO ($9.99/mes)</button>
                    <button type="button" class="btn-ng btn-ng-link btn-open-lic-modal" onclick="if(window.nexaguardOpenLicenseModal){window.nexaguardOpenLicenseModal();}else{jQuery('#license-modal').appendTo('body').css({display:'flex',opacity:1}).show();}" style="color:#ffcf33 !important; font-weight:700; cursor:pointer;">🔑 Ya tengo mi clave de licencia ›</button>
                    <a href="https://www.nexaguards.com/#contacto" target="_blank" class="btn-ng btn-ng-danger">👨‍💻 Solicitar Especialista (Plan Rescate $99)</a>
                <?php endif; ?>
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
                <span class="badge-count ok" id="quarantine-badge"><?php echo $quarantine_count; ?> archivo(s)</span>
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
                                <td><?php echo size_format($q['size']); ?></td>
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
                    <?php echo $rollback_count; ?> punto(s) de respaldo
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
                                <td><?php echo size_format($snap['size']); ?></td>
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

    <?php
    include NEXAGUARD_DIR . 'inc/view-modals.php';
    ?>

</div>
