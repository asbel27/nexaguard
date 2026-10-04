<?php
if (!defined('ABSPATH')) {
    exit;
}

$last_report = get_option('nexaguard_last_scan_report', null);
$quarantine_log = get_option('nexaguard_quarantine_log', array());
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
?>
<div class="wrap nexaguard-admin-wrap">
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
        <div class="nexaguard-header-actions">
            <button type="button" id="btn-reset-scan" class="btn-ng btn-ng-outline" title="Borrar historial anterior e iniciar vista limpia">
                🔄 Limpiar Vista / Resetear
            </button>
            <a href="<?php echo admin_url('admin.php?page=nexaguard-waf'); ?>" class="btn-ng btn-ng-outline">🛡️ Blindaje WAF</a>
            <button type="button" id="btn-start-scan" class="btn-ng btn-ng-primary">
                ⚡ Iniciar Análisis Forense
            </button>
        </div>
    </div>

    <!-- Barra de Licencia y Alertas de Suscripción -->
    <?php if ($is_standard): ?>
        <div class="ng-license-banner license-standard">
            <div class="lic-icon">🛡️</div>
            <div class="lic-content">
                <strong>EDICIÓN ESTÁNDAR: Escaneo Forense Local Activo.</strong>
                <p>Estás usando NexaGuard Security Estándar. Para activar el <strong>Sistema de Vigilancia Continua 24 Horas con Radar</strong> y la protección en tiempo real, activa tu Licencia PRO.</p>
            </div>
            <div class="lic-action">
                <button type="button" id="btn-edit-license" class="btn-ng btn-ng-primary">🔑 Activar Licencia PRO</button>
                <a href="https://www.nexaguards.com/#planes" target="_blank" class="btn-ng btn-ng-outline" style="margin-left:8px">Obtener Plan PRO ($9.99/mes)</a>
            </div>
        </div>
    <?php elseif ($is_expired): ?>
        <div class="ng-license-banner license-expired">
            <div class="lic-icon">🔴</div>
            <div class="lic-content">
                <strong>LICENCIA PRO VENCIDA: Tu período de suscripción ha finalizado.</strong>
                <p>Debes abonar tu mensualidad para reactivar el Sistema de Vigilancia 24 Horas y las actualizaciones de firmas en tiempo real.</p>
            </div>
            <div class="lic-action">
                <a href="https://www.nexaguards.com/#planes" target="_blank" class="btn-ng btn-ng-danger">Pagar Mensualidad / Renovar</a>
                <button type="button" id="btn-edit-license" class="btn-ng btn-ng-outline" style="margin-left:8px">Ingresar Otra Clave</button>
                <button type="button" id="btn-unlink-license" class="btn-ng btn-ng-link" style="color:#ff8ba0;margin-left:8px">Volver a Estándar</button>
            </div>
        </div>
    <?php elseif ($is_expiring_soon): ?>
        <div class="ng-license-banner license-warning">
            <div class="lic-icon">⚠️</div>
            <div class="lic-content">
                <strong>ATENCIÓN: Tu suscripción a <?php echo esc_html($license_data['plan']); ?> vencerá en <?php echo $days_left; ?> días.</strong>
                <p>Renueva a tiempo en nexaguards.com para mantener el escudo y la vigilancia continua activos sin interrupciones.</p>
            </div>
            <div class="lic-action">
                <a href="https://www.nexaguards.com/#planes" target="_blank" class="btn-ng btn-ng-primary">Renovar Suscripción</a>
                <button type="button" id="btn-edit-license" class="btn-ng btn-ng-outline" style="margin-left:8px">Cambiar Clave</button>
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

    <!-- ============ SISTEMA DE VIGILANCIA 24 HORAS CON RADAR ============ -->
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

    <!-- Indicador de conexión a la nube de amenazas -->
    <div class="cloud-status-strip">
        <div class="cloud-status-pill">
            <span class="live-dot"></span>
            <span id="cloud-intel-label">NexaGuard Threat Cloud Intelligence: <strong>Sincronizado en Tiempo Real (v<?php echo esc_html($cloud_ver); ?>)</strong></span>
        </div>
        <div class="threat-intel-help">
            Zero-Day Shield activo · Sin falsos positivos
        </div>
    </div>

    <!-- Banner de estado dinámico con alto contraste -->
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
                <span class="kpi-val" id="kpi-quarantine"><?php echo count($quarantine_log); ?></span>
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
            <span id="scan-live-status-sub" style="font-size:0.84rem; color:#9cb1e6;">Inspeccionando PHP, JS, código ofuscado y permisos...</span>
        </div>
    </div>

    <!-- Desglose forense de áreas y carpetas auditadas -->
    <div id="breakdown-container" class="ng-card folder-breakdown-card">
        <div class="card-title-bar">
            <h3>Directorios y Componentes Auditados</h3>
            <span class="badge-v" style="font-size:0.75rem;">Cobertura 100% Core + BD + Archivos</span>
        </div>
        <p class="ng-hint" style="color: #9cb1e6; margin-top: 4px;">
            Auditoría en tiempo real de cada directorio y capa de tu WordPress (temas, plugins, medios, núcleo y base de datos).
        </p>
        <div id="breakdown-grid" class="folder-breakdown-grid">
            <?php 
            $breakdown_data = ($last_report && !empty($last_report['breakdown'])) ? $last_report['breakdown'] : array(
                'themes'     => array('name' => 'Temas y Plantillas', 'path' => 'wp-content/themes/', 'files' => 0, 'threats' => 0, 'status' => 'clean', 'icon' => '🎨'),
                'plugins'    => array('name' => 'Plugins Instalados', 'path' => 'wp-content/plugins/', 'files' => 0, 'threats' => 0, 'status' => 'clean', 'icon' => '🔌'),
                'uploads'    => array('name' => 'Archivos de Medios', 'path' => 'wp-content/uploads/', 'files' => 0, 'threats' => 0, 'status' => 'clean', 'icon' => '📁'),
                'mu_plugins' => array('name' => 'Must-Use Plugins (Sistema)', 'path' => 'wp-content/mu-plugins/', 'files' => 0, 'threats' => 0, 'status' => 'clean', 'icon' => '⚡'),
                'core'       => array('name' => 'Núcleo WordPress (Core)', 'path' => 'wp-includes/, wp-admin/, raíz', 'files' => 0, 'threats' => 0, 'status' => 'clean', 'icon' => '🏛️'),
                'database'   => array('name' => 'Base de Datos MySQL', 'path' => 'wp_options, wp_posts, cron', 'files' => 0, 'threats' => 0, 'status' => 'clean', 'icon' => '🗄️'),
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

    <!-- Contenedor de amenazas encontradas -->
    <div id="threats-container" class="ng-card" style="margin-top:20px;">
        <div class="card-title-bar">
            <h3>Resultados de la Auditoría Forense</h3>
            <span id="threats-badge" class="badge-count <?php echo ($last_report && $last_report['threats_count'] > 0) ? 'danger' : 'ok'; ?>">
                <?php echo ($last_report) ? $last_report['threats_count'] . ' hallazgos' : '0 hallazgos'; ?>
            </span>
        </div>

        <?php if (!$is_pro && $last_report && $last_report['threats_count'] > 0): ?>
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

        <div id="threats-list" class="threats-grid">
            <?php if (!$last_report || empty($last_report['threats'])): ?>
                <div class="empty-state">
                    <p>🛡️ No hay amenazas activas detectadas en este momento.</p>
                    <small class="ng-hint" style="color: #9cb1e6;">Pulsa "Iniciar Análisis Forense" para auditar en tiempo real.</small>
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
                                    <?php if ($t['clean_action'] === 'sanitize_injection'): ?>
                                        <button type="button" class="btn-ng btn-ng-action btn-clean-threat" data-type="clearfake" data-target="<?php echo esc_attr($t['full_path']); ?>" data-id="<?php echo esc_attr($t['id']); ?>">
                                            🧹 Erradicar Inyección y Reparar
                                        </button>
                                    <?php endif; ?>

                                    <button type="button" class="btn-ng btn-ng-danger btn-force-delete" data-target="<?php echo esc_attr($t['full_path']); ?>" data-id="<?php echo esc_attr($t['id']); ?>" title="Forzar eliminación superando permisos de solo lectura">
                                        💥 Forzar Eliminación (Desbloqueo)
                                    </button>

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

    <?php
    include NEXAGUARD_DIR . 'inc/view-modals.php';
    ?>

    <!-- Archivos en cuarentena -->
    <?php if (!empty($quarantine_log)): ?>
    <div class="ng-card" style="margin-top:20px;">
        <h3>Archivos Aislados en Cuarentena Segura</h3>
        <p class="ng-hint" style="color: #a4b8ec;">Estos archivos fueron deshabilitados y movidos a un entorno protegido con permisos restringidos (Deny From All).</p>
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
    </div>
    <?php endif; ?>
</div>
