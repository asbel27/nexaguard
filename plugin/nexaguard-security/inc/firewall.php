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

    public static function get_client_ip() {
        $ip = '';
        if (!empty($_SERVER['HTTP_CF_CONNECTING_IP'])) {
            $ip = $_SERVER['HTTP_CF_CONNECTING_IP'];
        } elseif (!empty($_SERVER['HTTP_X_FORWARDED_FOR'])) {
            $ips = explode(',', $_SERVER['HTTP_X_FORWARDED_FOR']);
            $ip = trim($ips[0]);
        } elseif (!empty($_SERVER['REMOTE_ADDR'])) {
            $ip = $_SERVER['REMOTE_ADDR'];
        }
        return filter_var($ip, FILTER_VALIDATE_IP) ? $ip : '127.0.0.1';
    }

    public static function init() {
        // En la versión estándar gratuita el Blindaje y Cortafuegos WAF perimetral permanecen en pausa
        if (!self::is_pro()) {
            return;
        }

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

        // 0. Modo Aislamiento de Emergencia / Lockdown
        if (!empty($settings['emergency_lockdown'])) {
            add_action('init', array(__CLASS__, 'enforce_emergency_lockdown'), 1);
        }

        // 1. Bloqueo de edición de temas y plugins desde el panel de WordPress (Hardening)
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
                self::log_threat('Sondeo o ataque contra XML-RPC (Fuerza Bruta)', 'XML-RPC Shield', 403);
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

        // 7. Protección Anti Fuerza Bruta Local
        if (!empty($settings['brute_force_protection'])) {
            add_action('wp_login_failed', array(__CLASS__, 'on_login_failed'));
            add_action('login_init', array(__CLASS__, 'check_login_lockout'), 1);
            add_filter('authenticate', array(__CLASS__, 'check_authenticate_lockout'), 1, 3);
            add_action('wp_login', array(__CLASS__, 'on_login_success'), 10, 2);
        }

        // 8. Ocultar URL de Acceso / Hide Backend
        if (!empty($settings['hide_backend']) && !empty($settings['login_slug'])) {
            add_action('init', array(__CLASS__, 'handle_hide_backend'), 1);
            add_filter('site_url', array(__CLASS__, 'filter_login_url'), 100, 2);
            add_filter('network_site_url', array(__CLASS__, 'filter_login_url'), 100, 2);
            add_filter('login_url', array(__CLASS__, 'filter_login_url'), 100, 2);
            add_filter('wp_redirect', array(__CLASS__, 'filter_login_redirect'), 100, 1);
        }

        // 9. Bloqueo de Enumeración de Usuarios (REST API y query params)
        if (!empty($settings['block_user_enumeration'])) {
            add_filter('rest_dispatch_request', array(__CLASS__, 'filter_rest_user_enumeration'), 10, 4);
            add_action('template_redirect', array(__CLASS__, 'block_author_query_scan'), 1);
        }

        // 10. Ofuscación Genérica de Errores de Acceso
        if (!empty($settings['generic_login_errors'])) {
            add_filter('login_errors', array(__CLASS__, 'generic_login_error_message'));
        }

        // 11. Alerta por Email ante Inicio de Sesión de Administrador desde Nueva IP
        if (!empty($settings['admin_login_alerts'])) {
            add_action('wp_login', array(__CLASS__, 'alert_new_admin_login_ip'), 20, 2);
        }

        // 12. Personalización y Embellecedor Visual de Login (Login Customizer & Branding)
        if (!empty($settings['login_custom_design'])) {
            add_action('login_enqueue_scripts', array(__CLASS__, 'render_custom_login_styles'));
            add_filter('login_headerurl', array(__CLASS__, 'custom_login_header_url'));
            add_filter('login_headertext', array(__CLASS__, 'custom_login_header_text'));
            add_filter('login_headertitle', array(__CLASS__, 'custom_login_header_text'));
            add_filter('login_message', array(__CLASS__, 'custom_login_message'));
        }
    }

    /**
     * Modo Aislamiento de Emergencia
     * Desvía visitantes no autenticados y rastreadores a una pantalla 503 limpia de mantenimiento
     * mientras permite a los administradores logueados seguir operando sin restricciones.
     */
    public static function enforce_emergency_lockdown() {
        if (is_user_logged_in() && current_user_can('manage_options')) {
            return;
        }

        $uri = isset($_SERVER['REQUEST_URI']) ? $_SERVER['REQUEST_URI'] : '';
        $settings = get_option('nexaguard_settings', array());
        $login_slug = !empty($settings['login_slug']) ? sanitize_title($settings['login_slug']) : '';

        // Excepciones obligatorias para permitir el acceso y login del Administrador:
        // 1. Acceso nativo a wp-login.php o llamadas AJAX
        if (strpos($uri, 'wp-login.php') !== false || strpos($uri, 'admin-ajax.php') !== false) {
            return;
        }

        // 2. Ruta de acceso personalizada si está activa (ej: /acceso-seguro/)
        if (!empty($login_slug)) {
            $req_path = trim((string)parse_url($uri, PHP_URL_PATH), '/');
            if ($req_path === $login_slug || strpos($uri, '/' . $login_slug) !== false) {
                return;
            }
        }

        // 3. Acceso directo a /wp-admin (WordPress redirigirá al login si no está autenticado)
        if (strpos($uri, 'wp-admin') !== false) {
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
            <meta name="viewport" content="width=device-width, initial-scale=1">
            <title>Mantenimiento de Seguridad · NexaGuard</title>
            <style>
                body{background:#0b1030;color:#eaf0ff;font-family:system-ui,-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,sans-serif;display:grid;place-items:center;min-height:100vh;margin:0;padding:24px;box-sizing:border-box}
                .box{background:#111a44;border:1px solid rgba(255,207,51,.35);border-radius:18px;padding:36px 30px;max-width:540px;width:100%;text-align:center;box-shadow:0 25px 60px rgba(0,0,0,.65);box-sizing:border-box}
                .ic{font-size:3.2rem;margin-bottom:12px;filter:drop-shadow(0 4px 12px rgba(255,207,51,.3))}
                h1{font-size:1.55rem;margin:0 0 12px;color:#ffcf33;font-weight:700;line-height:1.3}
                p{color:#b6c4eb;font-size:.95rem;line-height:1.6;margin:0 0 18px}
                .badge{font-size:.78rem;font-weight:700;letter-spacing:.05em;background:rgba(255,207,51,.15);color:#ffcf33;border:1px solid rgba(255,207,51,.3);padding:.4em 1.1em;border-radius:999px;display:inline-block;margin-bottom:16px}
                .actions{display:flex;flex-direction:column;gap:12px;margin:20px 0 16px}
                .btn-admin{display:inline-flex;align-items:center;justify-content:center;gap:8px;background:linear-gradient(135deg,#ffcf33,#f0b90b);color:#0b1030;font-weight:700;font-size:.95rem;text-decoration:none;padding:12px 20px;border-radius:10px;box-shadow:0 4px 15px rgba(255,207,51,.3);transition:transform .15s ease,box-shadow .15s ease}
                .btn-admin:hover{transform:translateY(-1px);box-shadow:0 6px 20px rgba(255,207,51,.45)}
                .divider{display:flex;align-items:center;text-align:center;color:#4c5b8a;font-size:.76rem;text-transform:uppercase;letter-spacing:.08em;margin:24px 0 18px}
                .divider::before,.divider::after{content:'';flex:1;border-bottom:1px solid rgba(255,255,255,.1)}
                .divider:not(:empty)::before{margin-right:12px}
                .divider:not(:empty)::after{margin-left:12px}
                .support-box{background:rgba(15,24,65,.6);border:1px solid rgba(107,140,255,.2);border-radius:12px;padding:18px;text-align:left}
                .support-title{display:flex;align-items:center;gap:8px;font-size:.88rem;font-weight:600;color:#eaf0ff;margin-bottom:6px}
                .support-desc{font-size:.82rem;color:#8fa2d4;line-height:1.5;margin:0 0 14px}
                .support-links{display:flex;flex-wrap:wrap;gap:10px}
                .btn-support{display:inline-flex;align-items:center;gap:6px;background:rgba(107,140,255,.15);border:1px solid rgba(107,140,255,.35);color:#b6c4eb;text-decoration:none;font-size:.82rem;font-weight:600;padding:8px 14px;border-radius:8px;transition:all .15s ease}
                .btn-support:hover{background:rgba(107,140,255,.28);color:#fff;border-color:rgba(107,140,255,.6)}
                .footer-brand{margin-top:22px;font-size:.78rem;color:#5a6b99}
                .footer-brand a{color:#ffcf33;text-decoration:none}
            </style>
        </head>
        <body>
            <div class="box">
                <div class="ic">🛡️</div>
                <div class="badge">AISLAMIENTO PREVENTIVO ACTIVO</div>
                <h1>Sitio en Modo Mantenimiento de Seguridad</h1>
                <p>Este sitio web se encuentra en aislamiento de seguridad temporal mientras se completan tareas de auditoría, desinfección forense o mitigación de incidentes con <strong>NexaGuard Security</strong>.</p>
                
                <div class="actions">
                    <a href="<?php echo esc_url(wp_login_url(admin_url())); ?>" class="btn-admin">
                        <span>🔐</span> Acceso para Administradores
                    </a>
                </div>

                <div class="divider">Soporte y Asistencia</div>

                <div class="support-box">
                    <div class="support-title">
                        <span>💬</span> ¿Necesitas ayuda o eres el propietario?
                    </div>
                    <div class="support-desc">
                        Si este aislamiento fue activado por una emergencia de seguridad o requieres soporte técnico para desinfectar tu web, contacta directamente con nuestro equipo de respuesta a incidentes.
                    </div>
                    <div class="support-links">
                        <a href="https://www.nexaguards.com/#contacto" target="_blank" rel="noopener noreferrer" class="btn-support">
                            <span>🚀</span> Enviar Mensaje a Soporte
                        </a>
                        <a href="mailto:contacto@nexaguards.com?subject=Soporte%20NexaGuard%20-%20Aislamiento%20de%20Seguridad" class="btn-support">
                            <span>✉️</span> contacto@nexaguards.com
                        </a>
                    </div>
                </div>

                <div class="footer-brand">
                    Protegido por <a href="https://www.nexaguards.com" target="_blank" rel="noopener noreferrer">NexaGuard Security</a> · Respuesta a Incidentes
                </div>
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
        // 1. Bloqueo perimetral inmediato de escáneres hostiles y herramientas de Kali Linux
        $ua = isset($_SERVER['HTTP_USER_AGENT']) ? strtolower($_SERVER['HTTP_USER_AGENT']) : '';
        if (!empty($ua)) {
            $scanner_signatures = array(
                'sqlmap'        => 'Escáner hostil de Kali Linux [SQLMap Scanner]',
                'nikto'         => 'Escáner de vulnerabilidades [Nikto Web Scanner]',
                'wpscan'        => 'Auditoría perimetral no autorizada [WPScan]',
                'nmap'          => 'Escáner de puertos o CGI [Nmap]',
                'dirbuster'     => 'Fuerza bruta de directorios [DirBuster]',
                'gobuster'      => 'Fuerza bruta de directorios [Gobuster]',
                'hydra'         => 'Herramienta de fuerza bruta [THC Hydra]',
                'medusa'        => 'Herramienta de fuerza bruta [Medusa]',
                'metasploit'    => 'Framework de explotación [Metasploit]',
                'havij'         => 'Herramienta de inyección SQL [Havij]',
                'acunetix'      => 'Escáner automatizado [Acunetix]',
                'nessus'        => 'Escáner de vulnerabilidades [Nessus]'
            );

            foreach ($scanner_signatures as $sig => $desc) {
                if (strpos($ua, $sig) !== false) {
                    self::block_access($desc);
                }
            }
        }

        $uri = isset($_SERVER['REQUEST_URI']) ? $_SERVER['REQUEST_URI'] : '';
        $query = isset($_SERVER['QUERY_STRING']) ? $_SERVER['QUERY_STRING'] : '';

        $raw_inputs = array($uri, $query);
        if (!empty($_GET)) {
            $raw_inputs[] = json_encode($_GET);
        }
        if (!empty($_POST)) {
            $raw_inputs[] = json_encode($_POST);
        }

        $combined = implode(' ', $raw_inputs);

        $suspicious_patterns = array(
            '/(\%27)|(\')|(\-\-)|(\%23)|(#)/i' => 'SQLi comment injection',
            '/(union[\s\+]+select|select[\s\+]+.*[\s\+]+from|concat\s*\(|information_schema)/i' => 'SQL Injection attempt',
            '/(\.\.\/|\.\.\\\\|\%2e\%2e\%2f|\%2e\%2e\/|\.\.%2f)/i' => 'Directory Traversal attempt',
            '/(base64_decode|eval\s*\(|gzinflate|passthru|shell_exec|system\s*\()/i' => 'Remote Code Execution attempt',
            '/(<script|%3cscript|javascript:|alert\s*\(|onerror=)/i' => 'Cross-Site Scripting (XSS) payload',
            '/(wwlc_file_upload_handler|unauthenticated_upload)/i' => 'Arbitrary File Upload exploit (CVE-2026-27540)',
            '/(powershell[\s\+]+(-e|-enc|-encodedcommand|-w[\s\+]+hidden)|mshta[\s\+]+https?:\/\/|certutil[\s\+]+-urlcache)/i' => 'ClickFix PowerShell payload smuggling',
            '/(mainnet\.infura\.io|rpc\.ankr\.com|alchemy\.com\/v2|cloudflare-eth\.com|eth_call)/i' => 'Blockchain C2 RPC traffic hijacking',
            '/(<[a-z0-9_-]+(\s+[a-z0-9_-]+(\s*=\s*([\'"][^\'"]*[\r\n]+[^\'"]*[\'"]|[^\s>]+))?)*\s*(href|src|action)\s*=\s*[\'"]?\s*javascript:)/is' => 'Comment2Shell XSS exploitation (CVE-2026-93485)',
            '/(\/|\\\\)(\.env|\.git|\.htaccess|wp-config\.php\.bak|wp-config\.old|wp-config\.txt)/i' => 'Sensitive configuration file probe'
        );

        // Normalización multicapa WAF para evitar evasiones de codificación (+, %20, doble URL encode)
        $check_targets = array(
            $combined,
            urldecode($combined),
            rawurldecode($combined),
            urldecode(urldecode($combined)),
            str_replace('+', ' ', $combined),
            str_replace('+', ' ', urldecode($combined))
        );

        foreach ($suspicious_patterns as $pattern => $reason) {
            foreach ($check_targets as $target) {
                if (preg_match($pattern, $target)) {
                    self::block_access($reason);
                }
            }
        }
    }

    private static function block_access($reason) {
        self::log_threat($reason, 'WAF Perimeter Interceptor', 403);
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

    /**
     * Registro forense de ataques e intentos de intrusión para la Telemetría del Radar
     */
    public static function log_threat($reason, $source = 'WAF Interceptor', $status = 403) {
        $logs = get_option('nexaguard_threat_logs', array());
        if (!is_array($logs)) {
            $logs = array();
        }

        $ip = self::get_client_ip();
        $ua = isset($_SERVER['HTTP_USER_AGENT']) ? substr(sanitize_text_field($_SERVER['HTTP_USER_AGENT']), 0, 180) : 'Unknown';
        $method = isset($_SERVER['REQUEST_METHOD']) ? sanitize_text_field($_SERVER['REQUEST_METHOD']) : 'GET';
        $uri = isset($_SERVER['REQUEST_URI']) ? substr(sanitize_text_field($_SERVER['REQUEST_URI']), 0, 180) : '/';

        // Clasificación de origen de la amenaza (Kali Linux, Botnet, Browser Exploit, etc.)
        $tool_tag = 'Browser / Custom Payload';
        $ua_lower = strtolower($ua);
        if (strpos($ua_lower, 'sqlmap') !== false) {
            $tool_tag = 'Kali Linux [SQLMap Scanner]';
        } elseif (strpos($ua_lower, 'nikto') !== false) {
            $tool_tag = 'Kali Linux [Nikto Web Scanner]';
        } elseif (strpos($ua_lower, 'wpscan') !== false) {
            $tool_tag = 'Kali Linux [WPScan Security Audit]';
        } elseif (strpos($ua_lower, 'gobuster') !== false || strpos($ua_lower, 'dirbuster') !== false) {
            $tool_tag = 'Kali Linux [Directory Bruteforce Tool]';
        } elseif (strpos($ua_lower, 'nmap') !== false) {
            $tool_tag = 'Kali Linux [Nmap Port/CGI Scanner]';
        } elseif (strpos($ua_lower, 'hydra') !== false || strpos($ua_lower, 'medusa') !== false) {
            $tool_tag = 'Kali Linux [Hydra Brute-Forcer]';
        } elseif (strpos($ua_lower, 'metasploit') !== false) {
            $tool_tag = 'Kali Linux [Metasploit Framework]';
        } elseif (strpos($ua_lower, 'python-requests') !== false || strpos($ua_lower, 'aiohttp') !== false) {
            $tool_tag = 'Automated Exploit Bot (Python)';
        } elseif (strpos($ua_lower, 'curl') !== false || strpos($ua_lower, 'wget') !== false) {
            $tool_tag = 'CLI HTTP Client (cURL / Wget)';
        } elseif (strpos($ua_lower, 'mozilla') !== false || strpos($ua_lower, 'chrome') !== false || strpos($ua_lower, 'safari') !== false) {
            $tool_tag = 'Web Browser Exploit Attempt';
        }

        $new_log = array(
            'id' => uniqid('th_'),
            'timestamp' => current_time('mysql'),
            'time_short' => current_time('H:i:s'),
            'ip' => $ip,
            'reason' => $reason,
            'tool_tag' => $tool_tag,
            'source' => $source,
            'method' => $method,
            'uri' => $uri,
            'status' => $status
        );

        array_unshift($logs, $new_log);
        if (count($logs) > 80) {
            $logs = array_slice($logs, 0, 80);
        }

        update_option('nexaguard_threat_logs', $logs, false);

        // Enviar alerta inmediata por correo al administrador
        self::send_threat_alert_email($new_log);
    }

    /**
     * Envía notificación inmediata por correo ante intrusiones o ataques
     */
    public static function send_threat_alert_email($log) {
        $settings = get_option('nexaguard_settings', array());

        // Permitir desactivar alertas por correo en configuración si el usuario lo desea
        if (isset($settings['threat_email_alerts']) && empty($settings['threat_email_alerts'])) {
            return;
        }

        $to = !empty($settings['alert_email']) ? sanitize_email($settings['alert_email']) : get_option('admin_email');
        if (empty($to) || !is_email($to)) {
            return;
        }

        // Control anti-saturación: máximo 1 correo cada 10 min para la misma IP y tipo de ataque
        $throttle_key = 'ng_mail_thr_' . md5($log['ip'] . $log['reason']);
        if (get_transient($throttle_key)) {
            return;
        }
        set_transient($throttle_key, 1, 10 * MINUTE_IN_SECONDS);

        $site_name = get_bloginfo('name');
        $site_url = site_url();
        $radar_url = admin_url('admin.php?page=nexaguard-security');

        $subject = '🚨 [NexaGuard] Intrusión Bloqueada: ' . sanitize_text_field($log['reason']) . ' en ' . $site_name;

        $body = '<!DOCTYPE html>
        <html>
        <head>
            <meta charset="UTF-8">
            <title>' . esc_html($subject) . '</title>
        </head>
        <body style="margin:0; padding:20px; background-color:#080d26; font-family:-apple-system, BlinkMacSystemFont, \'Segoe UI\', Roboto, Helvetica, Arial, sans-serif; color:#dbe4ff;">
            <table align="center" border="0" cellpadding="0" cellspacing="0" width="100%" style="max-width:620px; background-color:#0e163e; border:1.5px solid rgba(255,207,51,0.4); border-radius:14px; overflow:hidden; box-shadow:0 15px 40px rgba(0,0,0,0.6);">
                <tr>
                    <td style="padding:28px 30px; background:linear-gradient(135deg, #121c4e 0%, #0a1030 100%); border-bottom:1px solid rgba(255,207,51,0.25); text-align:center;">
                        <div style="font-size:2.8rem; line-height:1; margin-bottom:8px;">🛡️</div>
                        <h1 style="margin:0; font-size:1.45rem; color:#ffffff; letter-spacing:0.02em;">NexaGuard Security</h1>
                        <span style="display:inline-block; margin-top:6px; font-size:0.75rem; font-weight:800; color:#ffcf33; letter-spacing:0.06em; text-transform:uppercase;">
                            BLINDAJE WAF // ALERTA FORENSE EN TIEMPO REAL
                        </span>
                    </td>
                </tr>
                <tr>
                    <td style="padding:26px 30px;">
                        <div style="background:rgba(255,69,96,0.12); border-left:4px solid #ff4560; padding:14px 18px; border-radius:6px; margin-bottom:24px;">
                            <strong style="color:#ff6b82; font-size:1.05rem; display:block; margin-bottom:4px;">🚨 Intrusión Detectada y Bloqueada</strong>
                            <p style="margin:0; font-size:0.92rem; color:#e2eafc; line-height:1.5;">
                                El cortafuegos WAF de NexaGuard interceptó y neutralizó con éxito una petición maliciosa dirigida a tu sitio web <strong>' . esc_html($site_name) . '</strong> antes de que pudiera ejecutarse.
                            </p>
                        </div>

                        <h3 style="color:#ffffff; font-size:1rem; margin:0 0 14px; text-transform:uppercase; letter-spacing:0.04em;">Detalles del Intento de Ataque:</h3>
                        
                        <table width="100%" cellpadding="10" cellspacing="0" style="background:rgba(255,255,255,0.03); border:1px solid rgba(255,255,255,0.08); border-radius:8px; font-size:0.88rem; margin-bottom:24px;">
                            <tr style="border-bottom:1px solid rgba(255,255,255,0.05);">
                                <td width="35%" style="color:#a0acd2; font-weight:600;">Vector / Amenaza:</td>
                                <td style="color:#ffcf33; font-weight:700;">' . esc_html($log['reason']) . '</td>
                            </tr>
                            <tr style="border-bottom:1px solid rgba(255,255,255,0.05);">
                                <td style="color:#a0acd2; font-weight:600;">Dirección IP Origen:</td>
                                <td style="color:#ffffff; font-family:monospace; font-size:0.95rem;">' . esc_html($log['ip']) . '</td>
                            </tr>
                            <tr style="border-bottom:1px solid rgba(255,255,255,0.05);">
                                <td style="color:#a0acd2; font-weight:600;">Herramienta / Agente:</td>
                                <td style="color:#3de8a4; font-weight:600;">' . esc_html($log['tool_tag']) . '</td>
                            </tr>
                            <tr style="border-bottom:1px solid rgba(255,255,255,0.05);">
                                <td style="color:#a0acd2; font-weight:600;">Solicitud Interceptada:</td>
                                <td style="color:#ffffff; font-family:monospace; word-break:break-all;">' . esc_html($log['method']) . ' ' . esc_html($log['uri']) . '</td>
                            </tr>
                            <tr style="border-bottom:1px solid rgba(255,255,255,0.05);">
                                <td style="color:#a0acd2; font-weight:600;">Fecha y Hora:</td>
                                <td style="color:#cad7f5;">' . esc_html($log['timestamp']) . '</td>
                            </tr>
                            <tr>
                                <td style="color:#a0acd2; font-weight:600;">Acción Aplicada:</td>
                                <td style="color:#3de8a4; font-weight:800;">🛡️ BLOQUEADO (HTTP 403 FORBIDDEN)</td>
                            </tr>
                        </table>

                        <p style="color:#cad7f5; font-size:0.9rem; line-height:1.55; margin:0 0 24px;">
                            Tu sitio se encuentra <strong>completamente a salvo</strong>. No se requiere ninguna acción manual urgente en este momento, ya que la petición fue aislada automáticamente en el perímetro.
                        </p>

                        <div style="text-align:center; margin-bottom:10px;">
                            <a href="' . esc_url($radar_url) . '" style="display:inline-block; background:linear-gradient(135deg, #ffcf33 0%, #f59e0b 100%); color:#080d26; font-weight:800; text-decoration:none; padding:12px 28px; border-radius:8px; font-size:0.95rem; box-shadow:0 4px 15px rgba(255,207,51,0.35);">
                                📡 Ver Radar y Telemetría en Vivo
                            </a>
                        </div>
                    </td>
                </tr>
                <tr>
                    <td style="padding:18px 30px; background:rgba(0,0,0,0.25); border-top:1px solid rgba(255,255,255,0.06); text-align:center; font-size:0.78rem; color:#7e8bb6;">
                        Este es un mensaje de notificación de seguridad automática generado por NexaGuard Security instalado en <a href="' . esc_url($site_url) . '" style="color:#ffcf33; text-decoration:none;">' . esc_html($site_url) . '</a>.
                    </td>
                </tr>
            </table>
        </body>
        </html>';

        $headers = array(
            'Content-Type: text/html; charset=UTF-8',
            'From: NexaGuard Security <' . get_option('admin_email') . '>'
        );

        wp_mail($to, $subject, $body, $headers);
    }

    public static function get_threat_logs() {
        $logs = get_option('nexaguard_threat_logs', array());
        if (!is_array($logs)) {
            $logs = array();
        }
        return $logs;
    }

    public static function ajax_get_radar_logs() {
        if (!check_ajax_referer('nexaguard_security_nonce', 'nonce', false) && !check_ajax_referer('nexaguard_admin_nonce', 'nonce', false)) {
            wp_send_json_error(array('message' => 'Token de seguridad inválido.'));
        }
        if (!current_user_can('manage_options')) {
            wp_send_json_error(array('message' => 'Sin permisos suficientes.'));
        }

        $logs = self::get_threat_logs();
        wp_send_json_success(array(
            'logs' => $logs,
            'total' => count($logs)
        ));
    }

    public static function ajax_clear_radar_logs() {
        if (!check_ajax_referer('nexaguard_security_nonce', 'nonce', false) && !check_ajax_referer('nexaguard_admin_nonce', 'nonce', false)) {
            wp_send_json_error(array('message' => 'Token de seguridad inválido.'));
        }
        if (!current_user_can('manage_options')) {
            wp_send_json_error(array('message' => 'Sin permisos suficientes.'));
        }

        update_option('nexaguard_threat_logs', array(), false);
        wp_send_json_success(array('message' => 'Logs de amenazas limpiados.'));
    }

    /* =========================================================================
     * 7. PROTECCIÓN ANTI FUERZA BRUTA LOCAL
     * ========================================================================= */

    public static function on_login_failed($username) {
        $ip = self::get_client_ip();
        $ip_hash = md5($ip);
        $attempts_key = 'nexaguard_bf_' . $ip_hash;
        $attempts = (int) get_transient($attempts_key);
        $attempts++;

        $settings = get_option('nexaguard_settings', array());
        $max_retries = !empty($settings['bf_max_retries']) ? intval($settings['bf_max_retries']) : 5;
        $lockout_mins = !empty($settings['bf_lockout_time']) ? intval($settings['bf_lockout_time']) : 20;

        set_transient($attempts_key, $attempts, 10 * MINUTE_IN_SECONDS);

        if ($attempts >= $max_retries) {
            set_transient('nexaguard_lockout_' . $ip_hash, time() + ($lockout_mins * MINUTE_IN_SECONDS), $lockout_mins * MINUTE_IN_SECONDS);
            $total = (int) get_option('nexaguard_total_lockouts', 0);
            update_option('nexaguard_total_lockouts', $total + 1);
        }
    }

    public static function on_login_success($user_login, $user) {
        $ip = self::get_client_ip();
        delete_transient('nexaguard_bf_' . md5($ip));
        delete_transient('nexaguard_lockout_' . md5($ip));
    }

    public static function check_login_lockout() {
        $ip = self::get_client_ip();
        $lockout_exp = get_transient('nexaguard_lockout_' . md5($ip));
        if ($lockout_exp) {
            $mins = max(1, ceil(($lockout_exp - time()) / 60));
            self::render_lockout_screen($mins, $ip);
        }
    }

    public static function check_authenticate_lockout($user, $username, $password) {
        $ip = self::get_client_ip();
        $lockout_exp = get_transient('nexaguard_lockout_' . md5($ip));
        if ($lockout_exp) {
            $mins = max(1, ceil(($lockout_exp - time()) / 60));
            return new WP_Error(
                'nexaguard_lockout',
                sprintf('<strong>NexaGuard Security:</strong> Esta dirección IP (%s) ha sido bloqueada temporalmente por exceso de intentos fallidos. Por favor, espere %d minutos antes de volver a intentarlo.', esc_html($ip), $mins)
            );
        }
        return $user;
    }

    public static function render_lockout_screen($minutes, $ip) {
        status_header(429);
        nocache_headers();
        ?>
        <!DOCTYPE html>
        <html lang="es">
        <head>
            <meta charset="utf-8">
            <title>Bloqueo de Seguridad · NexaGuard Protection</title>
            <style>
                body{background:#0b1030;color:#eaf0ff;font-family:system-ui,-apple-system,sans-serif;display:grid;place-items:center;min-height:100vh;margin:0;padding:20px;box-sizing:border-box}
                .box{background:#111a44;border:1px solid rgba(255,69,96,.5);border-radius:18px;padding:36px;max-width:520px;text-align:center;box-shadow:0 25px 60px rgba(0,0,0,.7)}
                .ic{font-size:3.5rem;margin-bottom:12px}
                h1{font-size:1.55rem;margin:0 0 10px;color:#ff9fb0}
                p{color:#b6c4eb;font-size:.95rem;line-height:1.6;margin:0 0 18px}
                .time-box{background:rgba(255,69,96,.15);border:1px solid rgba(255,69,96,.3);border-radius:10px;padding:12px;margin-bottom:18px;color:#ffcf33;font-weight:700;font-size:1.1rem}
                .tag{font-size:.8rem;color:#7888b5;display:block}
            </style>
        </head>
        <body>
            <div class="box">
                <div class="ic">🛑</div>
                <h1>Bloqueo Temporal por Seguridad</h1>
                <p>NexaGuard Security ha bloqueado temporalmente los accesos desde tu dirección IP debido a múltiples intentos consecutivos fallidos de inicio de sesión.</p>
                <div class="time-box">⏳ Tiempo restante de bloqueo: ~<?php echo intval($minutes); ?> minutos</div>
                <span class="tag">Dirección IP protegida: <?php echo esc_html($ip); ?></span>
            </div>
        </body>
        </html>
        <?php
        exit;
    }

    /* =========================================================================
     * 8. OCULTAR URL DE ACCESO / HIDE BACKEND
     * ========================================================================= */

    public static function handle_hide_backend() {
        if (defined('DOING_CRON') && DOING_CRON) return;
        if (defined('DOING_AJAX') && DOING_AJAX) return;
        if (defined('WP_CLI') && WP_CLI) return;

        $settings = get_option('nexaguard_settings', array());
        $slug = !empty($settings['login_slug']) ? sanitize_title($settings['login_slug']) : '';
        if (empty($slug)) return;

        $raw_uri = isset($_SERVER['REQUEST_URI']) ? parse_url($_SERVER['REQUEST_URI'], PHP_URL_PATH) : '';
        $home_path = parse_url(home_url(), PHP_URL_PATH);
        $req_path = (string)$raw_uri;
        if (!empty($home_path) && $home_path !== '/') {
            $home_path_trimmed = trim($home_path, '/');
            $req_path_trimmed = trim($req_path, '/');
            if (strpos($req_path_trimmed, $home_path_trimmed) === 0) {
                $req_path = substr($req_path_trimmed, strlen($home_path_trimmed));
            }
        }
        $req_path = trim((string)$req_path, '/');

        // 1. Acceso a la ruta de login secreta personalizada (ej: /acceso-seguro/)
        $is_secret_login = ($req_path === $slug);
        if (!$is_secret_login && !get_option('permalink_structure') && isset($_GET[$slug])) {
            $is_secret_login = true;
        }

        if ($is_secret_login) {
            // Si el usuario ya está autenticado como admin, enviarlo directamente al panel
            if (is_user_logged_in() && current_user_can('manage_options')) {
                wp_safe_redirect(admin_url());
                exit;
            }

            global $pagenow, $error, $interim_login, $action, $user_login, $user_email;
            $pagenow = 'wp-login.php';
            $_SERVER['SCRIPT_NAME'] = '/' . $slug;

            // Procesar el entorno de login de WordPress directamente bajo la URL personalizada.
            // Conserva la URL limpia en el navegador (ej: /acceso-seguro/) y procesa el POST
            // de usuario y contraseña sin redirecciones 302 que descarten credenciales.
            require_once ABSPATH . 'wp-login.php';
            exit;
        }

        // 2. Acceso directo a wp-login.php sin la ruta secreta
        if (strpos((string)$req_uri, 'wp-login.php') !== false) {
            if (is_user_logged_in()) {
                return;
            }

            if (isset($_GET['action']) && $_GET['action'] === 'postpass') {
                return;
            }

            self::render_hide_backend_404();
        }
    }

    public static function render_hide_backend_404() {
        status_header(404);
        nocache_headers();
        $not_found_template = get_404_template();
        if ($not_found_template && file_exists($not_found_template)) {
            include($not_found_template);
            exit;
        }
        wp_die('Página no encontrada (Error 404). El recurso solicitado no existe.', '404 No Encontrado', array('response' => 404));
    }

    public static function filter_login_url($url, $scheme = null) {
        if (strpos($url, 'wp-login.php') !== false) {
            $settings = get_option('nexaguard_settings', array());
            $slug = !empty($settings['login_slug']) ? sanitize_title($settings['login_slug']) : '';
            if (!empty($slug)) {
                $query = parse_url($url, PHP_URL_QUERY);
                $new_url = home_url('/' . $slug . '/');
                if (!empty($query)) {
                    $new_url .= '?' . $query;
                }
                return $new_url;
            }
        }
        return $url;
    }

    public static function filter_login_redirect($location) {
        if (strpos($location, 'wp-login.php') !== false) {
            $settings = get_option('nexaguard_settings', array());
            $slug = !empty($settings['login_slug']) ? sanitize_title($settings['login_slug']) : '';
            if (!empty($slug)) {
                $query = parse_url($location, PHP_URL_QUERY);
                $new_loc = home_url('/' . $slug . '/');
                if (!empty($query)) {
                    $new_loc .= '?' . $query;
                }
                return $new_loc;
            }
        }
        return $location;
    }

    /* =========================================================================
     * 9. BLOQUEO DE ENUMERACIÓN DE USUARIOS
     * ========================================================================= */

    public static function filter_rest_user_enumeration($result, $server, $request) {
        $route = strtolower($request->get_route());
        $parts = explode('/', trim($route, '/'));

        if (isset($parts[0], $parts[2]) && $parts[0] === 'wp' && $parts[2] === 'users') {
            if (isset($parts[3]) && $parts[3] === 'me') {
                return $result;
            }

            if (!current_user_can('list_users')) {
                return new WP_Error(
                    'nexaguard_rest_forbidden',
                    'NexaGuard Security: La enumeración de usuarios a través de la REST API ha sido deshabilitada por motivos de seguridad.',
                    array('status' => 403)
                );
            }
        }

        return $result;
    }

    public static function block_author_query_scan() {
        if (is_admin()) return;

        if (isset($_GET['author']) || (is_author() && !is_user_logged_in())) {
            global $wp_query;
            if (!empty($_GET['author']) || (isset($wp_query->post_count) && $wp_query->post_count < 1)) {
                wp_safe_redirect(home_url('/'), 301);
                exit;
            }
        }
    }

    /* =========================================================================
     * 10. OFUSCACIÓN GENÉRICA DE ERRORES DE LOGIN
     * ========================================================================= */

    public static function generic_login_error_message($error) {
        return '<strong>ERROR</strong>: Las credenciales ingresadas son incorrectas. Verifique su usuario y contraseña o restablezca su acceso.';
    }

    /* =========================================================================
     * 11. ALERTA POR EMAIL ANTE INICIO DE SESIÓN DE ADMINISTRADOR DESDE NUEVA IP
     * ========================================================================= */

    public static function alert_new_admin_login_ip($user_login, $user) {
        if (!$user || !user_can($user, 'manage_options')) {
            return;
        }

        $ip = self::get_client_ip();
        $known_ips = (array) get_user_meta($user->ID, 'nexaguard_known_ips', true);

        if (!in_array($ip, $known_ips, true)) {
            $known_ips[] = $ip;
            if (count($known_ips) > 20) {
                array_shift($known_ips);
            }
            update_user_meta($user->ID, 'nexaguard_known_ips', $known_ips);

            $site_name = get_bloginfo('name');
            $site_url = home_url();
            $date = current_time('d/m/Y H:i:s');
            $user_email = !empty($user->user_email) ? $user->user_email : get_option('admin_email');

            $subject = "🛡️ [NexaGuard] Alerta de Seguridad: Acceso de Administrador desde Nueva IP ({$site_name})";
            $body = "Hola,\n\n"
                  . "El sistema de seguridad de NexaGuard Security ha detectado un inicio de sesión exitoso con privilegios de Administrador desde una dirección IP no registrada previamente:\n\n"
                  . "• Sitio Web: {$site_name} ({$site_url})\n"
                  . "• Usuario Administrador: {$user_login}\n"
                  . "• Correo Electrónico: {$user_email}\n"
                  . "• Dirección IP Detectada: {$ip}\n"
                  . "• Fecha y Hora: {$date}\n\n"
                  . "Si fuiste tú quien inició sesión, no es necesaria ninguna acción adicional. Tu dirección IP ha sido registrada de forma segura.\n\n"
                  . "⚠️ SI NO RECONOCES ESTE ACCESO:\n"
                  . "Un tercero no autorizado podría tener las credenciales de tu cuenta. Accede de inmediato al panel de administración de NexaGuard Security para invalidar sesiones activas, regenerar sales criptográficas y cambiar tu contraseña.\n\n"
                  . "Atentamente,\n"
                  . "NexaGuard Security Radar 24H\n"
                  . "https://nexaguards.com\n";

            @wp_mail($user_email, $subject, $body);
        }
    }

    /* =========================================================================
     * 12. PERSONALIZACIÓN Y EMBELLECEDOR VISUAL DE LOGIN (LOGIN BRANDING)
     * ========================================================================= */

    public static function custom_login_header_url($url) {
        return home_url('/');
    }

    public static function custom_login_header_text($text) {
        $site_name = get_bloginfo('name');
        return $site_name . ' · Protegido por NexaGuard Security';
    }

    public static function custom_login_message($message) {
        $settings = wp_parse_args(get_option('nexaguard_settings', array()), array(
            'login_custom_design'   => false,
            'login_security_notice' => 'Estás iniciando sesión en tu WordPress protegido por NexaGuard'
        ));

        if (empty($settings['login_custom_design'])) {
            return $message;
        }

        $notice_text = !empty($settings['login_security_notice'])
            ? esc_html($settings['login_security_notice'])
            : 'Estás iniciando sesión en tu WordPress protegido por NexaGuard';

        $badge = '<div class="nexaguard-login-badge"><span class="shield-ic">🛡️</span> ' . $notice_text . '</div>';
        return $badge . $message;
    }

    public static function render_custom_login_styles() {
        $settings = wp_parse_args(get_option('nexaguard_settings', array()), array(
            'login_custom_design'   => false,
            'login_bg_image'        => '',
            'login_bg_preset'       => 'deep-navy',
            'login_logo_image'      => '',
            'login_security_notice' => 'Estás iniciando sesión en tu WordPress protegido por NexaGuard'
        ));

        if (empty($settings['login_custom_design'])) {
            return;
        }

        $bg_css = '';
        if (!empty($settings['login_bg_image'])) {
            $bg_url = esc_url($settings['login_bg_image']);
            $bg_css = "background-image: url('{$bg_url}') !important; background-size: cover !important; background-position: center center !important; background-repeat: no-repeat !important; background-attachment: fixed !important;";
        } elseif ($settings['login_bg_preset'] === 'cyber-dark') {
            $bg_css = "background: radial-gradient(circle at 50% 20%, #172554 0%, #0b112c 50%, #030712 100%) !important;";
        } elseif ($settings['login_bg_preset'] === 'matrix') {
            $bg_css = "background: linear-gradient(135deg, #022c22 0%, #05161e 40%, #0b0f19 100%) !important;";
        } else {
            // deep-navy (default NexaGuard)
            $bg_css = "background: radial-gradient(ellipse at bottom, #1e1b4b 0%, #0a0f2c 60%, #030717 100%) !important;";
        }

        $logo_css = '';
        if (!empty($settings['login_logo_image'])) {
            $logo_url = esc_url($settings['login_logo_image']);
            $logo_css = "background-image: url('{$logo_url}') !important; background-size: contain !important; background-position: center center !important; background-repeat: no-repeat !important; width: 100% !important; max-width: 280px !important; height: 85px !important;";
        } else {
            // Logo de escudo estilizado NexaGuard en sustitución del icono por defecto de WordPress
            $logo_css = "background-image: url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='none' stroke='%23ffcf33' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpath d='M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z'/%3E%3Cpath d='m9 12 2 2 4-4'/%3E%3C/svg%3E\") !important; background-size: contain !important; background-repeat: no-repeat !important; background-position: center center !important; width: 72px !important; height: 72px !important;";
        }

        ?>
        <style id="nexaguard-login-customizer">
            body.login {
                <?php echo $bg_css; ?>
                color: #eaf0ff !important;
                font-family: system-ui, -apple-system, 'Segoe UI', Roboto, sans-serif !important;
                min-height: 100vh !important;
                position: relative;
            }
            body.login::before {
                content: '';
                position: fixed;
                top: 0; left: 0; right: 0; bottom: 0;
                background: rgba(8, 14, 42, 0.72);
                backdrop-filter: blur(4px);
                -webkit-backdrop-filter: blur(4px);
                z-index: 0;
                pointer-events: none;
            }
            body.login #login {
                position: relative;
                z-index: 2;
                padding: 40px 20px 24px;
                max-width: 390px;
            }
            body.login #login h1 {
                margin-bottom: 18px;
                text-align: center;
            }
            body.login #login h1 a {
                <?php echo $logo_css; ?>
                margin: 0 auto 12px !important;
                display: block;
                outline: none;
                box-shadow: none;
                filter: drop-shadow(0 8px 20px rgba(0,0,0,0.45));
                transition: transform 0.25s ease;
            }
            body.login #login h1 a:hover {
                transform: scale(1.03);
            }
            .nexaguard-login-badge {
                background: linear-gradient(135deg, rgba(255, 207, 51, 0.14) 0%, rgba(255, 165, 0, 0.08) 100%);
                border: 1px solid rgba(255, 207, 51, 0.45);
                border-radius: 12px;
                padding: 12px 16px;
                margin-bottom: 22px;
                text-align: center;
                color: #ffd859;
                font-size: 0.88rem;
                font-weight: 700;
                line-height: 1.45;
                display: flex;
                align-items: center;
                justify-content: center;
                gap: 10px;
                box-shadow: 0 10px 25px rgba(0, 0, 0, 0.35);
            }
            .nexaguard-login-badge .shield-ic {
                font-size: 1.35rem;
                line-height: 1;
                flex-shrink: 0;
            }
            body.login form#loginform {
                background: #111a44 !important;
                border: 1.5px solid rgba(255, 207, 51, 0.35) !important;
                border-radius: 18px !important;
                box-shadow: 0 20px 50px rgba(0, 0, 0, 0.65), 0 0 0 1px rgba(255, 255, 255, 0.05) !important;
                padding: 30px 28px 26px !important;
                margin-top: 0 !important;
            }
            body.login form#loginform label {
                color: #c2d1f7 !important;
                font-size: 0.88rem !important;
                font-weight: 600 !important;
                margin-bottom: 6px !important;
            }
            body.login form#loginform .input,
            body.login form#loginform input[type="text"],
            body.login form#loginform input[type="password"] {
                background: #080e2b !important;
                border: 1.5px solid rgba(255, 255, 255, 0.15) !important;
                border-radius: 10px !important;
                color: #ffffff !important;
                font-size: 1rem !important;
                padding: 10px 14px !important;
                transition: all 0.2s ease !important;
                box-shadow: inset 0 2px 4px rgba(0,0,0,0.3) !important;
            }
            body.login form#loginform .input:focus,
            body.login form#loginform input[type="text"]:focus,
            body.login form#loginform input[type="password"]:focus {
                border-color: #ffcf33 !important;
                box-shadow: 0 0 0 3px rgba(255, 207, 51, 0.25), inset 0 2px 4px rgba(0,0,0,0.3) !important;
                outline: none !important;
            }
            body.login .forgetmenot {
                margin-top: 10px !important;
            }
            body.login .forgetmenot label {
                color: #9cb1e6 !important;
                font-size: 0.84rem !important;
                cursor: pointer;
            }
            body.login form#loginform input[type="submit"]#wp-submit {
                background: linear-gradient(135deg, #ffcf33 0%, #ff9e00 100%) !important;
                border: none !important;
                border-radius: 10px !important;
                color: #070c26 !important;
                font-weight: 800 !important;
                font-size: 0.98rem !important;
                letter-spacing: 0.02em !important;
                padding: 11px 22px !important;
                width: 100% !important;
                margin-top: 16px !important;
                box-shadow: 0 6px 18px rgba(255, 207, 51, 0.35) !important;
                cursor: pointer !important;
                transition: all 0.2s ease !important;
                text-shadow: none !important;
                float: none !important;
            }
            body.login form#loginform input[type="submit"]#wp-submit:hover {
                transform: translateY(-2px) !important;
                box-shadow: 0 10px 24px rgba(255, 207, 51, 0.5) !important;
                filter: brightness(1.05) !important;
            }
            body.login #nav, body.login #backtoblog {
                text-align: center !important;
                padding: 10px 0 !important;
                margin: 12px 0 0 !important;
            }
            body.login #nav a, body.login #backtoblog a {
                color: #9cb1e6 !important;
                font-size: 0.86rem !important;
                font-weight: 600 !important;
                transition: color 0.2s ease !important;
            }
            body.login #nav a:hover, body.login #backtoblog a:hover {
                color: #ffcf33 !important;
                text-decoration: underline !important;
            }
            body.login .message, body.login .notice, body.login #login_error {
                background: #162052 !important;
                border-left: 4px solid #ff4560 !important;
                color: #ffd859 !important;
                border-radius: 8px !important;
                box-shadow: 0 8px 24px rgba(0,0,0,0.4) !important;
                font-size: 0.9rem !important;
                padding: 12px 16px !important;
            }
            body.login .message {
                border-left-color: #3de8a4 !important;
                color: #d1fae5 !important;
            }
        </style>
        <?php
    }
}
