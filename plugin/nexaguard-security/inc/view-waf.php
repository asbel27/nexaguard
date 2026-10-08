<?php
if (!defined('ABSPATH')) {
    exit;
}

$license = get_option('nexaguard_license_data', null);
$has_license = !empty($license) && !empty($license['valid']) && !empty($license['key']);
$days_left = ($has_license && isset($license['days_left'])) ? intval($license['days_left']) : 0;
$is_expired = $has_license && (($license['status'] === 'expired') || $days_left <= 0);
$is_pro = $has_license && !$is_expired && !empty($license['valid']);

$settings = get_option('nexaguard_settings', array(
    'block_php_uploads' => true,
    'disable_xmlrpc'    => true,
    'hide_wp_version'   => true,
    'waf_enabled'       => true,
    'anti_clearfake'    => true
));
?>
<div class="wrap nexaguard-admin-wrap">
    <div class="nexaguard-header">
        <div class="nexaguard-brand">
            <svg class="nexaguard-logo" viewBox="0 0 24 24" fill="none" stroke="#ffcf33" stroke-width="2">
                <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
                <path d="m9 12 2 2 4-4"/>
            </svg>
            <div>
                <h1>Blindaje Activo & Cortafuegos (WAF) <?php if (!$is_pro): ?><span class="badge-v" style="background:rgba(255,107,138,.15);color:#ff8ba0;border:1px solid rgba(255,107,138,.3)">🔒 Función PRO</span><?php endif; ?></h1>
                <p class="sub">Reglas de endurecimiento perimetral en tiempo real para evitar hackeos recurrentes</p>
            </div>
        </div>
        <div class="nexaguard-header-actions">
            <a href="<?php echo admin_url('admin.php?page=nexaguard-security'); ?>" class="btn-ng btn-ng-outline">← Volver al Escáner</a>
            <?php if (!$is_pro): ?>
                <button type="button" class="btn-ng btn-ng-primary btn-open-upgrade-modal">⚡ Desbloquear Modo PRO</button>
            <?php endif; ?>
        </div>
    </div>

    <!-- Banner cuando WAF está bloqueado en edición estándar -->
    <?php if (!$is_pro): ?>
        <div class="waf-locked-banner" style="background:#fff0f3 !important; border:1.5px solid #ff4d6d !important; border-radius:14px; padding:24px 26px; margin-top:20px; box-shadow:0 10px 30px rgba(0,0,0,0.15) !important;">
            <div class="wlb-icon" style="font-size:2.4rem; line-height:1;">🔒</div>
            <div class="wlb-content">
                <span class="wlb-tag" style="background:#ffd1dc !important; color:#991b1b !important; border:1px solid #ff4d6d !important; font-weight:800 !important; padding:4px 12px; border-radius:999px; display:inline-block; margin-bottom:8px; font-size:0.75rem; letter-spacing:0.05em;">PROTECCIÓN PERIMETRAL BLOQUEADA · REQUIERE PLAN PRO</span>
                <h3 style="color:#0f172a !important; font-size:1.35rem !important; font-weight:800 !important; margin:0 0 8px;">Blindaje Activo y Cortafuegos WAF en Pausa</h3>
                <p style="color:#334155 !important; font-size:0.95rem !important; line-height:1.6 !important; margin:0 0 18px; max-width:78ch; font-weight:500;">No esperes a que tu sitio sea hackeado: el Blindaje WAF intercepta a los intrusos <strong style="color:#0f172a !important; font-weight:700;">antes de que logren tocar tus archivos o infectar la base de datos de WordPress</strong>. Bloquea de inmediato inyecciones maliciosas, accesos a carpetas sensibles y puertas traseras en tiempo real. En la <strong style="color:#0f172a !important; font-weight:700;">Edición Estándar</strong>, esta barrera de contención se encuentra en pausa.</p>
                <div class="wlb-actions" style="display:flex; align-items:center; gap:12px; flex-wrap:wrap;">
                    <button type="button" class="btn-ng btn-ng-primary btn-open-upgrade-modal">⚡ Desbloquear con Plan PRO ($9.99/mes)</button>
                    <a href="https://www.nexaguards.com/#contacto" target="_blank" class="btn-ng btn-ng-danger">👨‍💻 Solicitar Especialista (Plan Rescate $99)</a>
                    <button type="button" class="btn-ng btn-ng-link btn-open-lic-modal" style="color:#9a3412 !important; font-weight:700; text-decoration:underline;">Ya tengo mi clave de licencia ›</button>
                </div>
            </div>
        </div>
    <?php endif; ?>

    <form id="form-waf-settings" class="ng-card <?php echo !$is_pro ? 'waf-locked-form' : ''; ?>" style="margin-top:20px;">
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
                    <b>Cortafuegos de Aplicación Web (WAF Inteligente) <?php if (!$is_pro): ?><span class="rule-lock-tag">🔒 PRO</span><?php endif; ?></b>
                    <p class="ng-hint">Filtra todas las peticiones entrantes bloqueando inyecciones SQL, Directory Traversal (../..), scripts maliciosos y webshells con respuesta 403 Forbidden.</p>
                </div>
                <input type="checkbox" name="waf_enabled" value="1" <?php checked(!empty($settings['waf_enabled'])); ?> class="ng-toggle" <?php disabled(!$is_pro); ?>>
            </label>

            <!-- Anti-ClearFake / Anti-ClickFix Live Filter -->
            <label class="toggle-row <?php echo !$is_pro ? 'row-locked' : ''; ?>">
                <div class="toggle-info">
                    <b>Filtro Activo Anti-ClearFake y Falsos Captchas <?php if (!$is_pro): ?><span class="rule-lock-tag">🔒 PRO</span><?php endif; ?></b>
                    <p class="ng-hint">Inspecciona el HTML de salida en milisegundos y elimina al vuelo cualquier script base64 sospechoso o llamada a contratos inteligentes en blockchain (EtherHiding), impidiendo que los visitantes vean popups maliciosos.</p>
                </div>
                <input type="checkbox" name="anti_clearfake" value="1" <?php checked(!empty($settings['anti_clearfake'])); ?> class="ng-toggle" <?php disabled(!$is_pro); ?>>
            </label>

            <!-- Bloqueo de PHP en Uploads -->
            <label class="toggle-row <?php echo !$is_pro ? 'row-locked' : ''; ?>">
                <div class="toggle-info">
                    <b>Bloquear ejecución de scripts PHP en la carpeta /wp-content/uploads/ <?php if (!$is_pro): ?><span class="rule-lock-tag">🔒 PRO</span><?php endif; ?></b>
                    <p class="ng-hint">Instala una regla perimetral en .htaccess para que ningún archivo .php subido por atacantes pueda ser ejecutado. Neutraliza el 90% de backdoors.</p>
                </div>
                <input type="checkbox" name="block_php_uploads" value="1" <?php checked(!empty($settings['block_php_uploads'])); ?> class="ng-toggle" <?php disabled(!$is_pro); ?>>
            </label>

            <!-- Deshabilitar XML-RPC -->
            <label class="toggle-row <?php echo !$is_pro ? 'row-locked' : ''; ?>">
                <div class="toggle-info">
                    <b>Deshabilitar completamente XML-RPC <?php if (!$is_pro): ?><span class="rule-lock-tag">🔒 PRO</span><?php endif; ?></b>
                    <p class="ng-hint">Bloquea el archivo xmlrpc.php para detener ataques automatizados de fuerza bruta a contraseñas y ataques de amplificación DDoS.</p>
                </div>
                <input type="checkbox" name="disable_xmlrpc" value="1" <?php checked(!empty($settings['disable_xmlrpc'])); ?> class="ng-toggle" <?php disabled(!$is_pro); ?>>
            </label>

            <!-- Ocultar versión de WordPress -->
            <label class="toggle-row <?php echo !$is_pro ? 'row-locked' : ''; ?>">
                <div class="toggle-info">
                    <b>Ocultar versión de WordPress (wp_generator) <?php if (!$is_pro): ?><span class="rule-lock-tag">🔒 PRO</span><?php endif; ?></b>
                    <p class="ng-hint">Elimina la etiqueta meta generator que expone la versión exacta de tu WordPress a bots que buscan vulnerabilidades conocidas.</p>
                </div>
                <input type="checkbox" name="hide_wp_version" value="1" <?php checked(!empty($settings['hide_wp_version'])); ?> class="ng-toggle" <?php disabled(!$is_pro); ?>>
            </label>

            <!-- Modo Aislamiento de Emergencia -->
            <label class="toggle-row <?php echo !$is_pro ? 'row-locked' : ''; ?>" style="border-left: 3px solid #ff4560;">
                <div class="toggle-info">
                    <b>Modo Aislamiento de Emergencia / Cuarentena de Tráfico <?php if (!$is_pro): ?><span class="rule-lock-tag">🔒 PRO</span><?php endif; ?></b>
                    <p class="ng-hint">Desvía visitas públicas y rastreadores a una pantalla limpia de 503 Mantenimiento de Seguridad para evitar contagios o alertas de Google Safe Browsing durante limpiezas, permitiendo el acceso exclusivo a los administradores logueados.</p>
                </div>
                <input type="checkbox" name="emergency_lockdown" value="1" <?php checked(!empty($settings['emergency_lockdown'])); ?> class="ng-toggle" <?php disabled(!$is_pro); ?>>
            </label>

            <!-- Deshabilitar Editor de Temas y Plugins -->
            <label class="toggle-row <?php echo !$is_pro ? 'row-locked' : ''; ?>">
                <div class="toggle-info">
                    <b>Deshabilitar Editor de Temas y Plugins de WordPress (DISALLOW_FILE_EDIT) <?php if (!$is_pro): ?><span class="rule-lock-tag">🔒 PRO</span><?php endif; ?></b>
                    <p class="ng-hint">Impide que cualquier usuario modifique archivos PHP desde el panel de administración. Cierra la puerta principal a atacantes que intenten inyectar webshells si comprometen una cuenta admin.</p>
                </div>
                <input type="checkbox" name="disallow_file_edit" value="1" <?php checked(!empty($settings['disallow_file_edit'])); ?> class="ng-toggle" <?php disabled(!$is_pro); ?>>
            </label>

            <!-- Prevenir Listado de Directorios -->
            <label class="toggle-row <?php echo !$is_pro ? 'row-locked' : ''; ?>">
                <div class="toggle-info">
                    <b>Bloquear Listado de Directorios Apache (Options -Indexes) <?php if (!$is_pro): ?><span class="rule-lock-tag">🔒 PRO</span><?php endif; ?></b>
                    <p class="ng-hint">Añade directiva en .htaccess para que ningún visitante ni escáner automatizado pueda ver el listado de archivos dentro de carpetas de tu servidor.</p>
                </div>
                <input type="checkbox" name="disable_dir_browsing" value="1" <?php checked(!empty($settings['disable_dir_browsing'])); ?> class="ng-toggle" <?php disabled(!$is_pro); ?>>
            </label>
        </div>

        <div class="form-actions" style="margin-top:24px;border-top:1px solid rgba(255,255,255,.08);padding-top:18px;display:flex;align-items:center;flex-wrap:wrap;gap:12px;">
            <?php if ($is_pro): ?>
                <button type="submit" class="btn-ng btn-ng-primary">Guardar y Aplicar Blindaje</button>
                <span id="save-msg" class="ng-hint" style="margin-left:12px"></span>
            <?php else: ?>
                <button type="button" id="btn-locked-waf-submit" class="btn-ng btn-ng-primary btn-locked-waf-submit btn-open-upgrade-modal" style="cursor:pointer">🔒 Desbloquear Blindaje con Plan PRO ($9.99/mes)</button>
                <button type="button" class="btn-ng btn-ng-link btn-open-lic-modal" style="color:#ffcf33 !important; font-weight:700; cursor:pointer;">🔑 Ya tengo mi clave de licencia ›</button>
                <a href="https://www.nexaguards.com/#contacto" target="_blank" class="btn-ng btn-ng-danger">👨‍💻 Solicitar Especialista (Plan Rescate $99)</a>
            <?php endif; ?>
        </div>
    </form>
</div>

<?php
include NEXAGUARD_DIR . 'inc/view-modals.php';
?>
