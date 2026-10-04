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
            'block_php_uploads' => true,
            'disable_xmlrpc'    => true,
            'hide_wp_version'   => true,
            'waf_enabled'       => true,
            'anti_clearfake'    => true
        ));

        // 1. Ocultar versión de WordPress
        if (!empty($settings['hide_wp_version'])) {
            remove_action('wp_head', 'wp_generator');
            add_filter('the_generator', '__return_empty_string');
        }

        // 2. Deshabilitar XML-RPC (evita ataques de fuerza bruta y amplificación DDoS)
        if (!empty($settings['disable_xmlrpc'])) {
            add_filter('xmlrpc_enabled', '__return_false');
            add_filter('xmlrpc_methods', '__return_empty_array');
            if (isset($_SERVER['REQUEST_URI']) && strpos($_SERVER['REQUEST_URI'], 'xmlrpc.php') !== false) {
                status_header(403);
                die('NexaGuard WAF: Acceso a XML-RPC deshabilitado por seguridad.');
            }
        }

        // 3. Cabeceras de seguridad HTTP
        add_action('send_headers', array(__CLASS__, 'send_security_headers'));

        // 4. Filtro en vivo Anti-ClearFake / EtherHiding (elimina el script malicioso en tiempo real)
        if (!empty($settings['anti_clearfake']) && !is_admin()) {
            add_action('template_redirect', array(__CLASS__, 'start_buffer_filter'), 0);
        }

        // 5. Inspección WAF de peticiones entrantes
        if (!empty($settings['waf_enabled']) && !is_admin()) {
            self::inspect_request();
        }
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

        // Si hay una inyección de ClearFake / EtherHiding en la cabecera, neutralizarla inmediatamente
        if (strpos($html, 'data:text/javascript;base64') !== false || strpos($html, 'bsc-testnet-rpc') !== false) {
            $html = preg_replace('/<script[^>]*src=["\']data:text\/javascript;base64,[A-Za-z0-9+\/]+["\'][^>]*><\/script>/i', '<!-- NexaGuard WAF: Bloqueado script malicioso ClearFake -->', $html);
            $html = preg_replace('/<script[^>]*src=["\']data:text\/javascript;base64,[A-Za-z0-9+\/]+["\'][^>]*\/>/i', '<!-- NexaGuard WAF: Bloqueado script malicioso ClearFake -->', $html);
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
            '/(<script|javascript:|alert\(|onerror=)/i' => 'Cross-Site Scripting (XSS) payload'
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
