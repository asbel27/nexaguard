<?php
if (!defined('ABSPATH')) {
    exit;
}

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
                <h1>Blindaje Activo & Cortafuegos (WAF)</h1>
                <p class="sub">Reglas de endurecimiento perimetral en tiempo real para evitar hackeos recurrentes</p>
            </div>
        </div>
        <div class="nexaguard-header-actions">
            <a href="<?php echo admin_url('admin.php?page=nexaguard-security'); ?>" class="btn-ng btn-ng-outline">← Volver al Escáner</a>
        </div>
    </div>

    <form id="form-waf-settings" class="ng-card" style="margin-top:20px;">
        <h3>Reglas de Protección en Tiempo Real</h3>
        <p class="ng-hint">Estas medidas frenan intentos de intrusión antes de que toquen la base de datos o el núcleo de WordPress.</p>

        <div class="toggle-list">
            <!-- WAF Core -->
            <label class="toggle-row">
                <div class="toggle-info">
                    <b>Cortafuegos de Aplicación Web (WAF Inteligente)</b>
                    <p class="ng-hint">Filtra todas las peticiones entrantes bloqueando inyecciones SQL, Directory Traversal (../..), scripts maliciosos y webshells con respuesta 403 Forbidden.</p>
                </div>
                <input type="checkbox" name="waf_enabled" value="1" <?php checked(!empty($settings['waf_enabled'])); ?> class="ng-toggle">
            </label>

            <!-- Anti-ClearFake / Anti-ClickFix Live Filter -->
            <label class="toggle-row">
                <div class="toggle-info">
                    <b>Filtro Activo Anti-ClearFake y Falsos Captchas</b>
                    <p class="ng-hint">Inspecciona el HTML de salida en milisegundos y elimina al vuelo cualquier script base64 sospechoso o llamada a contratos inteligentes en blockchain (EtherHiding), impidiendo que los visitantes vean popups maliciosos.</p>
                </div>
                <input type="checkbox" name="anti_clearfake" value="1" <?php checked(!empty($settings['anti_clearfake'])); ?> class="ng-toggle">
            </label>

            <!-- Bloqueo de PHP en Uploads -->
            <label class="toggle-row">
                <div class="toggle-info">
                    <b>Bloquear ejecución de scripts PHP en la carpeta /wp-content/uploads/</b>
                    <p class="ng-hint">Instala una regla perimetral en .htaccess para que ningún archivo .php subido por atacantes pueda ser ejecutado. Neutraliza el 90% de backdoors.</p>
                </div>
                <input type="checkbox" name="block_php_uploads" value="1" <?php checked(!empty($settings['block_php_uploads'])); ?> class="ng-toggle">
            </label>

            <!-- Deshabilitar XML-RPC -->
            <label class="toggle-row">
                <div class="toggle-info">
                    <b>Deshabilitar completamente XML-RPC</b>
                    <p class="ng-hint">Bloquea el archivo xmlrpc.php para detener ataques automatizados de fuerza bruta a contraseñas y ataques de amplificación DDoS.</p>
                </div>
                <input type="checkbox" name="disable_xmlrpc" value="1" <?php checked(!empty($settings['disable_xmlrpc'])); ?> class="ng-toggle">
            </label>

            <!-- Ocultar versión de WordPress -->
            <label class="toggle-row">
                <div class="toggle-info">
                    <b>Ocultar versión de WordPress (wp_generator)</b>
                    <p class="ng-hint">Elimina la etiqueta meta generator que expone la versión exacta de tu WordPress a bots que buscan vulnerabilidades conocidas.</p>
                </div>
                <input type="checkbox" name="hide_wp_version" value="1" <?php checked(!empty($settings['hide_wp_version'])); ?> class="ng-toggle">
            </label>
        </div>

        <div class="form-actions" style="margin-top:24px;border-top:1px solid rgba(255,255,255,.08);padding-top:18px">
            <button type="submit" class="btn-ng btn-ng-primary">Guardar y Aplicar Blindaje</button>
            <span id="save-msg" class="ng-hint" style="margin-left:12px"></span>
        </div>
    </form>
</div>
