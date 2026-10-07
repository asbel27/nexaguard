<?php
if (!defined('ABSPATH')) {
    exit;
}

class NexaGuard_Firewall {
    public static function is_pro() {
        $license = get_option('nexaguard_license_data', null);
        if (empty($license) || empty($license['valid']) || empty($license['key'])) {
            return false;
        }
        $days_left = isset($license['days_left']) ? intval($license['days_left']) : 0;
        if ((isset($license['status']) && $license['status'] === 'expired') || $days_left <= 0) {
            return false;
        }
        return (isset($license['status']) && ($license['status'] === 'active' || $license['status'] === 'expiring_soon'));
    }

    public static function init() {
        // En la versión estándar gratuita el Blindaje y Cortafuegos WAF perimetral permanecen en pausa
        if (!self::is_pro()) {
            return;
        }

        $settings = get_option('nexaguard_settings', array(
            'block_php_uploads'     => true,
            'disable_xmlrpc'        => true,
            'hide_wp_version'       => true,
            'waf_enabled'           => true,
            'anti_clearfake'        => true,
            'emergency_lockdown'    => false,
            'disallow_file_edit'    => false,
            'disable_dir_browsing'  => true
        ));

        // 0. Modo Aislamiento de Emergencia / Lockdown (Paso 1 de Hostinet automatizado)
        // Bloquea visitas y bots con 503 Mantenimiento pero permite acceso a administradores
        if (!empty($settings['emergency_lockdown'])) {
            add_action('init', array(__CLASS__, 'enforce_emergency_lockdown'), 1);
        }

        // 1. Bloqueo de edición de temas y plugins desde el panel de WordPress (Hostinet Hardening #1)
        if (!empty($settings['disallow_file_edit']) && !defined('DISALLOW_FILE_EDIT')) {
            define('DISALLOW_FILE_EDIT', true);
        }

        // 2. Ocultar versión de WordPress
        if (!empty($settings['hide_wp_version'])) {
            remove_action('wp_head', 'wp_generator');
            add_filter('the_generator', '__return_empty_string');
        }

        // 3. Deshabilitar XML-RPC (evita ataques de fuerza bruta y amplificación DDoS)
        if (!empty($settings['disable_xmlrpc'])) {
            add_filter('xmlrpc_enabled', '__return_false');
            add_filter('xmlrpc_methods', '__return_empty_array');
            if (isset($_SERVER['REQUEST_URI']) && strpos($_SERVER['REQUEST_URI'], 'xmlrpc.php') !== false) {
                status_header(403);
                die('NexaGuard WAF: Acceso a XML-RPC deshabilitado por seguridad.');
            }
        }

        // 4. Cabeceras de seguridad HTTP
        add_action('send_headers', array(__CLASS__, 'send_security_headers'));

        // 5. Filtro en vivo Anti-ClearFake / EtherHiding (elimina el script malicioso en tiempo real)
        if (!empty($settings['anti_clearfake']) && !is_admin()) {
            add_action('template_redirect', array(__CLASS__, 'start_buffer_filter'), 0);
        }

        // 6. Inspección WAF de peticiones entrantes
        if (!empty($settings['waf_enabled']) && !is_admin()) {
            self::inspect_request();
        }
    }

    /**
     * Modo Aislamiento de Emergencia (Hostinet Paso 1)
     * Desvía visitantes no autenticados y rastreadores a una pantalla 503 limpia de mantenimiento
     * mientras permite a los administradores logueados seguir operando sin restricciones.
     */
    public static function enforce_emergency_lockdown() {
        if (is_user_logged_in() && current_user_can('manage_options')) {
            return;
        }

        $uri = isset($_SERVER['REQUEST_URI']) ? $_SERVER['REQUEST_URI'] : '';
        if (strpos($uri, 'wp-login.php') !== false || strpos($uri, 'admin-ajax.php') !== false) {
            return;
        }

        if (preg_match('/\.(css|js|png|jpg|jpeg|gif|svg|woff2?|ico)$/i', $uri)) {
            return;
        }

        status_header(503);
        header('Retry-After: 3600');
        ?>
        <!DOCTYPE html>
        <html lang="es">
        <head>
            <meta charset="utf-8">
            <title>Mantenimiento de Seguridad · NexaGuard</title>
            <style>
                body{background:#0b1030;color:#eaf0ff;font-family:system-ui,-apple-system,sans-serif;display:grid;place-items:center;min-height:100vh;margin:0;padding:20px;box-sizing:border-box}
                .box{background:#111a44;border:1px solid rgba(255,207,51,.4);border-radius:16px;padding:36px;max-width:540px;text-align:center;box-shadow:0 20px 50px rgba(0,0,0,.6)}
                .ic{font-size:3.2rem;margin-bottom:12px}
                h1{font-size:1.6rem;margin:0 0 10px;color:#ffcf33}
                p{color:#b6c4eb;font-size:1rem;line-height:1.6;margin:0 0 20px}
                .badge{font-size:.82rem;font-weight:700;background:rgba(255,207,51,.15);color:#ffcf33;padding:.5em 1.2em;border-radius:999px;display:inline-block;margin-bottom:15px}
                .admin-link{display:inline-block;color:#ffcf33;text-decoration:none;font-weight:600;font-size:.9rem;border-bottom:1px dashed #ffcf33}
            </style>
        </head>
        <body>
            <div class="box">
                <div class="ic">🛡️</div>
                <div class="badge">AISLAMIENTO PREVENTIVO ACTIVO</div>
                <h1>Sitio en Modo Mantenimiento de Seguridad</h1>
                <p>Este sitio web se encuentra en aislamiento de seguridad temporal mientras se completan tareas de auditoría y desinfección forense con <strong>NexaGuard Security</strong>.</p>
                <p><small style="color:#7888b5">Si eres el administrador, puedes iniciar sesión normalmente para gestionar el sitio:</small></p>
                <a href="<?php echo esc_url(wp_login_url()); ?>" class="admin-link">Acceso para Administradores ›</a>
            </div>
        </body>
        </html>
        <?php
        exit;
    }

    public static function send_security_headers() {
        if (!headers_sent()) {
            header('X-Content-Type-Options: nosniff');
            header('X-Frame-Options: SAMEORIGIN');
            header('Referrer-Policy: strict-origin-when-cross-origin');
        }
    }

    public static function start_buffer_filter() {
        ob_start(array(__CLASS__, 'filter_malicious_output'));
    }

    public static function filter_malicious_output($html) {
        if (empty($html)) return $html;

        // 1. Filtrar inyección de ClearFake / EtherHiding
        if (strpos($html, 'data:text/javascript;base64') !== false || strpos($html, 'bsc-testnet-rpc') !== false) {
            $html = preg_replace('/<script[^>]*src=["\']data:text\/javascript;base64,[A-Za-z0-9+\/]+["\'][^>]*><\/script>/i', '<!-- NexaGuard WAF: Bloqueado script malicioso ClearFake -->', $html);
            $html = preg_replace('/<script[^>]*src=["\']data:text\/javascript;base64,[A-Za-z0-9+\/]+["\'][^>]*\/>/i', '<!-- NexaGuard WAF: Bloqueado script malicioso ClearFake -->', $html);
        }

        // 2. Filtrar scripts de engaño ClickFix / PowerShell smuggling
        if (strpos($html, 'powershell') !== false || strpos($html, 'mshta') !== false) {
            $html = preg_replace('/<script[^>]*>[^<]*(powershell\s+(-e|-enc|-encodedcommand)|mshta\s+https?:\/\/)[^<]*<\/script>/i', '<!-- NexaGuard WAF: Bloqueado script de engaño ClickFix -->', $html);
        }

        return $html;
    }

    private static function inspect_request() {
        $uri = isset($_SERVER['REQUEST_URI']) ? $_SERVER['REQUEST_URI'] : '';
        $query = isset($_SERVER['QUERY_STRING']) ? $_SERVER['QUERY_STRING'] : '';

        $suspicious_patterns = array(
            '/(\%27)|(\')|(\-\-)|(\%23)|(#)/i' => 'SQLi comment injection',
            '/(union\s+select|select\s+.*\s+from|concat\s*\(|information_schema)/i' => 'SQL Injection attempt',
            '/(\.\.\/|\.\.\\\\)/i' => 'Directory Traversal attempt',
            '/(base64_decode|eval\(|gzinflate|passthru|shell_exec|system\()/i' => 'Remote Code Execution attempt',
            '/(<script|javascript:|alert\(|onerror=)/i' => 'Cross-Site Scripting (XSS) payload',
            '/(wwlc_file_upload_handler|unauthenticated_upload)/i' => 'Arbitrary File Upload exploit (CVE-2026-27540)',
            '/(powershell\s+(-e|-enc|-w\s+hidden)|mshta\s+https?:\/\/|certutil\s+-urlcache)/i' => 'ClickFix PowerShell payload smuggling',
            '/(mainnet\.infura\.io|rpc\.ankr\.com|alchemy\.com\/v2|cloudflare-eth\.com|eth_call)/i' => 'Blockchain C2 RPC traffic hijacking',
            '/(<[a-z0-9_-]+(\s+[a-z0-9_-]+(\s*=\s*([\'"][^\'"]*[\r\n]+[^\'"]*[\'"]|[^\s>]+))?)*\s*(href|src|action)\s*=\s*[\'"]?\s*javascript:)/is' => 'Comment2Shell XSS exploitation (CVE-2026-93485)'
        );

        $check_string = $uri . ' ' . $query;
        if (!empty($_POST)) {
            $check_string .= ' ' . json_encode($_POST);
        }

        foreach ($suspicious_patterns as $pattern => $reason) {
            if (preg_match($pattern, $check_string)) {
                // Registrar y bloquear
                self::block_access($reason);
            }
        }
    }

    private static function block_access($reason) {
        status_header(403);
        ?>
        <!DOCTYPE html>
        <html lang="es">
        <head>
            <meta charset="utf-8">
            <title>403 Acceso Denegado · NexaGuard WAF</title>
            <style>
                body{background:#0b1030;color:#eaf0ff;font-family:system-ui,-apple-system,sans-serif;display:grid;place-items:center;min-height:100vh;margin:0;padding:20px;box-sizing:border-box}
                .box{background:#111a44;border:1px solid rgba(255,69,96,.4);border-radius:16px;padding:32px;max-width:520px;text-align:center;box-shadow:0 20px 50px rgba(0,0,0,.6)}
                .ic{font-size:3rem;margin-bottom:12px}
                h1{font-size:1.5rem;margin:0 0 10px;color:#ff9fb0}
                p{color:#b6c4eb;font-size:.95rem;line-height:1.5;margin:0 0 16px}
                .tag{font-size:.78rem;font-weight:700;background:rgba(255,69,96,.15);color:#ff9fb0;padding:.4em 1em;border-radius:999px;display:inline-block}
            </style>
        </head>
        <body>
            <div class="box">
                <div class="ic">🛡️</div>
                <h1>Petición bloqueada por NexaGuard WAF</h1>
                <p>El cortafuegos perimetral de NexaGuard Security detectó una solicitud sospechosa o potencialmente peligrosa y bloqueó el acceso preventivamente.</p>
                <div class="tag">Motivo: <?php echo esc_html($reason); ?></div>
            </div>
        </body>
        </html>
        <?php
        exit;
    }
}
