<?php
/**
 * NexaGuard PRO - Cortafuegos de Aplicación Web Capa 7 (Layer 7 WAF)
 * Inspección en tiempo de ejecución, Auto-Cárcel de IPs 24 Horas y Trampas Honeypot
 * 
 * @package NexaGuard_Pro
 */

if (!defined('ABSPATH')) {
    exit;
}

class NexaGuard_Pro_WAF {

    public static function init() {
        // Ejecución ultratemprana para interceptar ataques antes de que carguen plugins vulnerables
        add_action('plugins_loaded', array(__CLASS__, 'inspect_request'), 1);

        // Trampas Honeypot para capturar bots exploradores
        add_action('init', array(__CLASS__, 'check_honeypot_tripwires'));
    }

    /**
     * Inspección en tiempo de ejecución de todas las peticiones entrantes
     */
    public static function inspect_request() {
        // Eximir solicitudes legítimas de administradores autenticados si no hay payload crítico
        $ip = self::get_client_ip();

        // 1. Comprobar si la IP está en la Cárcel 24H (Auto-Jail)
        if (self::is_ip_jailed($ip)) {
            self::drop_jailed_request($ip);
        }

        // 2. Comprobar agentes maliciosos y escáneres automatizados
        $ua = isset($_SERVER['HTTP_USER_AGENT']) ? $_SERVER['HTTP_USER_AGENT'] : '';
        if (self::is_malicious_bot($ua)) {
            self::jail_ip($ip, 'Bot / Escáner Malicioso Detectado: ' . substr($ua, 0, 80));
            self::drop_request('Acceso Bloqueado: Agente de escaneo hostil detectado por NexaGuard PRO.', 403);
        }

        // 3. Inspeccionar URI de la petición
        $uri = isset($_SERVER['REQUEST_URI']) ? rawurldecode($_SERVER['REQUEST_URI']) : '';
        $threat = self::inspect_payload($uri);
        if ($threat) {
            self::handle_threat_detected($ip, $threat, 'URI', $uri);
        }

        // 4. Inspeccionar Parámetros GET
        if (!empty($_GET)) {
            $threat = self::inspect_array($_GET);
            if ($threat) {
                self::handle_threat_detected($ip, $threat, 'GET', json_encode($_GET));
            }
        }

        // 5. Inspeccionar Parámetros POST (Excluyendo inicios de sesión estándar para no interferir contraseñas)
        if (!empty($_POST) && !self::is_login_submission()) {
            $threat = self::inspect_array($_POST);
            if ($threat) {
                self::handle_threat_detected($ip, $threat, 'POST', substr(json_encode($_POST), 0, 500));
            }
        }
    }

    /**
     * Detecta firmas de inyección SQL, RCE, XSS y Traversal
     */
    private static function inspect_payload($input) {
        if (!is_string($input)) {
            return false;
        }

        $patterns = array(
            'SQLi' => array(
                '/(union(\s+all)?\s+select)/i',
                '/(\bbenchmark\s*\(\s*\d+\s*,)/i',
                '/(\bsleep\s*\(\s*\d+\s*\))/i',
                '/(order\s+by\s+\d{2,})/i',
                '/(information_schema\.(tables|columns))/i',
                '/(\bload_file\s*\()/i',
                '/(\binto\s+(outfile|dumpfile))/i'
            ),
            'RCE' => array(
                '/(passthru|shell_exec|exec|system|popen|proc_open)\s*\(/i',
                '/(eval\s*\(\s*(base64_decode|gzinflate|str_rot13))/i',
                '/(php:\/\/input|php:\/\/filter)/i',
                '/(\$\w+\s*\(\s*\$_POST)/i'
            ),
            'LFI_Traversal' => array(
                '/(\.\.\/|\.\.\\\\){2,}/',
                '/(\/etc\/(passwd|shadow|hosts))/i',
                '/(win\.ini|boot\.ini)/i'
            ),
            'XSS_Severe' => array(
                '/(<script[^>]*>.*<\/script>)/is',
                '/(javascript\s*:\s*(alert|document\.|window\.|fetch|eval))/i',
                '/(<img[^>]+src\s*=\s*["\']?[^"\'>]+\s*onerror\s*=)/i'
            )
        );

        foreach ($patterns as $type => $regex_list) {
            foreach ($regex_list as $regex) {
                if (preg_match($regex, $input)) {
                    return $type;
                }
            }
        }

        return false;
    }

    private static function inspect_array($arr, $depth = 0) {
        if ($depth > 5) return false;
        foreach ($arr as $k => $val) {
            if (is_array($val)) {
                $sub = self::inspect_array($val, $depth + 1);
                if ($sub) return $sub;
            } elseif (is_string($val)) {
                $threat = self::inspect_payload($val);
                if ($threat) return $threat;
            }
        }
        return false;
    }

    /**
     * Gestión de amenaza detectada: registro y auto-cárcel
     */
    private static function handle_threat_detected($ip, $type, $vector, $raw_sample) {
        self::log_attack($ip, $type, $vector, $raw_sample);
        self::jail_ip($ip, "Ataque L7 Detectado: [{$type}] a través de {$vector}");
        self::drop_request("Acceso Bloqueado por NexaGuard PRO: Ataque ({$type}) neutralizado.", 403);
    }

    /**
     * Auto-Cárcel de IPs: Pone la IP en aislamiento durante 24 horas
     */
    public static function jail_ip($ip, $reason = '') {
        $jail = get_option('nexaguard_pro_jailed_ips', array());
        if (!is_array($jail)) {
            $jail = array();
        }

        $jail[$ip] = array(
            'jailed_at'  => time(),
            'expires_at' => time() + (24 * HOUR_IN_SECONDS),
            'reason'     => $reason,
            'user_agent' => isset($_SERVER['HTTP_USER_AGENT']) ? substr($_SERVER['HTTP_USER_AGENT'], 0, 100) : 'N/A'
        );

        update_option('nexaguard_pro_jailed_ips', $jail);
    }

    public static function is_ip_jailed($ip) {
        $jail = get_option('nexaguard_pro_jailed_ips', array());
        if (empty($jail) || !isset($jail[$ip])) {
            return false;
        }

        $record = $jail[$ip];
        if (time() > $record['expires_at']) {
            unset($jail[$ip]);
            update_option('nexaguard_pro_jailed_ips', $jail);
            return false;
        }

        return true;
    }

    public static function unjail_ip($ip) {
        $jail = get_option('nexaguard_pro_jailed_ips', array());
        if (isset($jail[$ip])) {
            unset($jail[$ip]);
            update_option('nexaguard_pro_jailed_ips', $jail);
            return true;
        }
        return false;
    }

    public static function clear_all_jail() {
        return update_option('nexaguard_pro_jailed_ips', array());
    }

    /**
     * Trampa Honeypot: Captura bots que exploran rutas señuelo
     */
    public static function check_honeypot_tripwires() {
        if (!isset($_SERVER['REQUEST_URI'])) return;
        $uri = strtolower($_SERVER['REQUEST_URI']);

        $traps = array(
            '/wp-admin-trap/',
            '/.env.bak',
            '/dump.sql',
            '/backup.sql',
            '/wp-config.php.bak',
            '/phpmyadmin/scripts/setup.php',
            '/eval-stdin.php',
            '/shell.php',
            '/alfa.php'
        );

        foreach ($traps as $trap) {
            if (strpos($uri, $trap) !== false) {
                $ip = self::get_client_ip();
                self::jail_ip($ip, 'Honeypot Activado: Bot explorando ruta trampa (' . $trap . ')');
                self::drop_request('Acceso Denegado por NexaGuard Honeypot Trapwire.', 403);
            }
        }
    }

    private static function is_malicious_bot($ua) {
        if (empty($ua)) return false;
        $bad_bots = array('sqlmap', 'nikto', 'dirbuster', 'havij', 'acunetix', 'wpscan', 'morfeus', 'zgrab', 'nmap', 'masscan');
        foreach ($bad_bots as $b) {
            if (stripos($ua, $b) !== false) {
                return true;
            }
        }
        return false;
    }

    private static function is_login_submission() {
        return (isset($_SERVER['SCRIPT_NAME']) && strpos($_SERVER['SCRIPT_NAME'], 'wp-login.php') !== false && !empty($_POST['log']));
    }

    private static function get_client_ip() {
        $ip_keys = array('HTTP_CF_CONNECTING_IP', 'HTTP_X_FORWARDED_FOR', 'REMOTE_ADDR');
        foreach ($ip_keys as $key) {
            if (!empty($_SERVER[$key])) {
                $ip = explode(',', $_SERVER[$key])[0];
                $ip = trim($ip);
                if (filter_var($ip, FILTER_VALIDATE_IP)) {
                    return $ip;
                }
            }
        }
        return isset($_SERVER['REMOTE_ADDR']) ? $_SERVER['REMOTE_ADDR'] : '127.0.0.1';
    }

    private static function log_attack($ip, $type, $vector, $sample) {
        $logs = get_option('nexaguard_pro_waf_logs', array());
        if (!is_array($logs)) {
            $logs = array();
        }

        array_unshift($logs, array(
            'ip'        => $ip,
            'type'      => $type,
            'vector'    => $vector,
            'sample'    => substr($sample, 0, 160),
            'time'      => current_time('mysql'),
            'timestamp' => time()
        ));

        if (count($logs) > 100) {
            $logs = array_slice($logs, 0, 100);
        }

        update_option('nexaguard_pro_waf_logs', $logs);
    }

    private static function drop_request($message, $code = 403) {
        status_header($code);
        nocache_headers();
        @header('Content-Type: text/html; charset=utf-8');
        echo '<!DOCTYPE html><html><head><title>403 Bloqueado por NexaGuard PRO</title>';
        echo '<style>body{background:#0d1117;color:#c9d1d9;font-family:-apple-system,BlinkMacSystemFont,Segoe UI,Roboto,sans-serif;padding:60px 20px;text-align:center;}';
        echo '.box{max-width:550px;margin:0 auto;background:#161b22;padding:32px;border-radius:12px;border:1px solid #30363d;box-shadow:0 8px 30px rgba(0,0,0,0.5);}';
        echo 'h1{color:#f85149;margin:0 0 16px;font-size:1.8rem;} p{color:#8b949e;line-height:1.6;font-size:1rem;} .badge{background:rgba(248,81,73,0.15);color:#f85149;padding:6px 14px;border-radius:20px;font-weight:bold;font-size:0.85rem;display:inline-block;margin-top:14px;}';
        echo '</style></head><body><div class="box"><h1>🛡️ NexaGuard PRO Shield</h1><p>' . esc_html($message) . '</p><div class="badge">Layer 7 Active WAF · Perimeter Lock</div></div></body></html>';
        exit;
    }

    private static function drop_jailed_request($ip) {
        self::drop_request("Tu dirección IP ({$ip}) ha sido confinada preventivamente en la Cárcel 24H de NexaGuard PRO debido a actividades sospechosas reiteradas.", 403);
    }
}
