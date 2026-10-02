<?php
if (!defined('ABSPATH')) {
    exit;
}

class NexaGuard_Scanner {
    private $threats = array();
    private $scanned_files = 0;
    private $scanned_options = 0;
    private $whitelist = array();

    // Catálogo forense avanzado de firmas de malware y vectores de ataque
    private $patterns = array(
        // ClearFake / ClickFix / EtherHiding (específico para el malware de capintvalue.com.mx)
        'clearfake_etherhiding' => array(
            'regex'    => '/(data:text\/javascript;base64,[A-Za-z0-9+\/]{32,}|0xA1decFB[a-zA-Z0-9]*|0x46790e2[a-zA-Z0-9]*)/i',
            'title'    => 'Inyección de malware ClearFake / EtherHiding',
            'desc'     => 'Script en base64 o contrato en Binance Smart Chain utilizado para inyectar falsos captchas de Cloudflare y troyanos.',
            'severity' => 'crit',
            'type'     => 'clearfake'
        ),
        'smart_contract_rpc' => array(
            'regex'    => '/(bsc-testnet-rpc|data-seed-prebsc|bnbchain\.org|eth_call|0x6d4ce63c|ethers\.Contract)/i',
            'title'    => 'Llamada sospechosa a Blockchain / Smart Contract RPC',
            'desc'     => 'Código que consulta contratos inteligentes en la blockchain para evadir bloqueos tradicionales de dominio.',
            'severity' => 'crit',
            'type'     => 'etherhiding'
        ),
        'fake_captcha_turnstile' => array(
            'regex'    => '/(turnstile\.render|cf-turnstile-wrapper|challenge-platform|verify_you_are_human|clickfix)/i',
            'title'    => 'Falso Captcha Cloudflare Turnstile / Phishing',
            'desc'     => 'Superposición fraudulenta que simula verificación humana para engañar a los visitantes.',
            'severity' => 'crit',
            'type'     => 'clearfake'
        ),
        'clickfix_powershell' => array(
            'regex'    => '/(powershell\s+(-e|-enc|-encodedcommand|-w\s+hidden)|mshta\s+https?:\/\/|certutil\s+-urlcache)/i',
            'title'    => 'Comando malicioso ClickFix (PowerShell / MSHTA)',
            'desc'     => 'Ataque que copia al portapapeles scripts destructivos simulando solucionar un problema del navegador.',
            'severity' => 'crit',
            'type'     => 'clickfix'
        ),
        'eval_base64' => array(
            'regex'    => '/eval\s*\(\s*(base64_decode|gzinflate|gzuncompress|str_rot13|hex2bin)\s*\(/i',
            'title'    => 'Ofuscación crítica: eval(base64/gzinflate)',
            'desc'     => 'Ejecución oculta de código binario o comprimido, típico de backdoors y webshells.',
            'severity' => 'crit',
            'type'     => 'backdoor'
        ),
        'eval_atob_obfuscation' => array(
            'regex'    => '/(eval\s*\(\s*atob\s*\(|String\.fromCharCode\s*\(\s*\d+\s*(,\s*\d+){8,}\))/i',
            'title'    => 'JavaScript ofuscado: eval(atob) / fromCharCode masivo',
            'desc'     => 'Carga dinámica de scripts en el navegador mediante ofuscación para evadir antivirus.',
            'severity' => 'crit',
            'type'     => 'malicious_js'
        ),
        'assert_shell' => array(
            'regex'    => '/(assert\s*\(\s*\$_(GET|POST|REQUEST|COOKIE)|create_function\s*\([^\)]*\$_(GET|POST|REQUEST)|preg_replace\s*\(\s*[\'"][^\'"]*\/e[\'"]\s*,)/i',
            'title'    => 'Inyección de código remoto: assert / create_function / preg_replace /e',
            'desc'     => 'Puerta trasera que ejecuta código PHP arbitrario enviado por atacantes vía peticiones web.',
            'severity' => 'crit',
            'type'     => 'webshell'
        ),
        'system_execution' => array(
            'regex'    => '/(system|shell_exec|passthru|popen|proc_open)\s*\(\s*\$_(GET|POST|REQUEST|COOKIE)/i',
            'title'    => 'Ejecución de comandos del sistema operativo (RCE)',
            'desc'     => 'Comando de terminal controlado por parámetros HTTP. Riesgo extremo de toma de control total del servidor.',
            'severity' => 'crit',
            'type'     => 'rce'
        ),
        'variable_function_call' => array(
            'regex'    => '/\$_(GET|POST|COOKIE|REQUEST)\[[^\]]+\]\s*\(\s*\$_(GET|POST|COOKIE|REQUEST)\[[^\]]+\]\)/i',
            'title'    => 'Llamada dinámica a función arbitraria vía input HTTP',
            'desc'     => 'Técnica de evasión donde tanto el nombre de la función como su argumento son controlados por el atacante.',
            'severity' => 'crit',
            'type'     => 'webshell'
        ),
        'webshell_signatures' => array(
            'regex'    => '/(c99shell|r57shell|WSO_VERSION|FilesMan|b374k|alfa_team|IndoXploit|MadSpot|p0wny-shell|weevely)/i',
            'title'    => 'Firma de WebShell conocida (c99/r57/WSO/FilesMan/b374k)',
            'desc'     => 'Herramienta gráfica de administración ilícita instalada por ciberatacantes.',
            'severity' => 'crit',
            'type'     => 'webshell'
        ),
        'rogue_uploader' => array(
            'regex'    => '/(move_uploaded_file|copy)\s*\(\s*\$_FILES\[[^\]]+\]\[[\'"]tmp_name[\'"]\]\s*,\s*[^;]*\.(php|phtml|phar)/i',
            'title'    => 'Subida no autorizada de ejecutables PHP (Rogue Uploader)',
            'desc'     => 'Backdoor que permite subir y ejecutar scripts PHP adicionales en el servidor.',
            'severity' => 'crit',
            'type'     => 'backdoor'
        ),
        'hidden_iframe' => array(
            'regex'    => '/<iframe[^>]+(style\s*=\s*["\'][^"\']*(display\s*:\s*none|visibility\s*:\s*hidden|width\s*:\s*0|height\s*:\s*0)|width\s*=\s*["\']0["\'])/i',
            'title'    => 'Iframe oculto / Redirección fraudulenta',
            'desc'     => 'Marco invisible diseñado para inflar visitas fraudulentas o cargar exploits en segundo plano.',
            'severity' => 'warn',
            'type'     => 'hidden_iframe'
        )
    );

    public function __construct() {
        $this->whitelist = get_option('nexaguard_whitelisted_items', array());
    }

    public function scan_full() {
        $start_time = microtime(true);
        $this->threats = array();
        $this->scanned_files = 0;
        $this->scanned_options = 0;

        // 1. Escanear carpeta de subidas (Uploads) con filtro inteligente de falsos positivos
        $this->scan_uploads();

        // 2. Escanear todos los plugins instalados (activos e inactivos)
        $this->scan_plugins();

        // 3. Escanear plugins obligatorios (mu-plugins)
        $this->scan_mu_plugins();

        // 4. Escanear todos los temas instalados
        $this->scan_themes();

        // 5. Escanear integridad de archivos raíz y Core de WordPress
        $this->scan_core();

        // 6. Escanear base de datos (wp_options, wp_posts, wp-cron)
        $this->scan_database();

        // 7. Verificar cuentas de administradores
        $this->scan_admin_users();

        $elapsed = round(microtime(true) - $start_time, 2);

        $report = array(
            'timestamp'       => time(),
            'elapsed'         => $elapsed,
            'scanned_files'   => $this->scanned_files,
            'scanned_options' => $this->scanned_options,
            'threats_count'   => count($this->threats),
            'threats'         => $this->threats,
            'status'          => count($this->threats) === 0 ? 'clean' : 'infected'
        );

        update_option('nexaguard_last_scan_report', $report);

        return $report;
    }

    /**
     * Escaneo de Uploads con discriminación de falsos positivos legítimos
     * (Redux Framework, Silence is golden, etc.)
     */
    private function scan_uploads() {
        $upload_dir = wp_upload_dir();
        $path = $upload_dir['basedir'];
        if (!is_dir($path)) {
            return;
        }

        $iterator = new RecursiveIteratorIterator(
            new RecursiveDirectoryIterator($path, RecursiveDirectoryIterator::SKIP_DOTS),
            RecursiveIteratorIterator::SELF_FIRST
        );

        foreach ($iterator as $item) {
            if ($item->isFile()) {
                $this->scanned_files++;
                $ext = strtolower($item->getExtension());
                $filepath = $item->getPathname();
                $rel = str_replace(array(ABSPATH, '\\'), array('', '/'), $filepath);

                // Si está en lista blanca, saltar
                if (in_array($rel, $this->whitelist) || in_array($filepath, $this->whitelist)) {
                    continue;
                }

                if (in_array($ext, array('php', 'phtml', 'php3', 'php4', 'php5', 'php7', 'phps', 'shtml'))) {
                    $content = @file_get_contents($filepath);
                    if ($content === false) continue;

                    // 1. Ignorar archivos 'Silence is golden' estándar de WordPress (index.php vacío protector)
                    $clean_text = trim(preg_replace('/\s+/', ' ', $content));
                    if (basename($filepath) === 'index.php' && (stripos($clean_text, 'Silence is golden') !== false || strlen($clean_text) < 60)) {
                        continue; // 100% benigno
                    }

                    // 2. Comprobar si pertenece a Redux Framework u otros frameworks de temas legítimos
                    $is_redux_or_theme_cache = (
                        strpos($rel, 'uploads/redux/') !== false ||
                        strpos($rel, 'uploads/elementor/') !== false ||
                        strpos($rel, 'uploads/et-cache/') !== false ||
                        strpos($rel, 'uploads/astra-addon/') !== false
                    );

                    // Analizar si el contenido tiene malware real
                    $threat_found = false;
                    foreach ($this->patterns as $key => $p) {
                        if (preg_match($p['regex'], $content, $matches, PREG_OFFSET_CAPTURE)) {
                            $threat_found = true;
                            $offset = $matches[0][1];
                            $line = substr_count(substr($content, 0, $offset), "\n") + 1;
                            $snippet = substr($content, max(0, $offset - 40), 180);

                            $this->add_threat(array(
                                'id'          => md5($filepath . $key),
                                'category'    => 'uploads_malware',
                                'severity'    => 'crit',
                                'title'       => 'Malware / Backdoor en carpeta Uploads: ' . $p['title'],
                                'desc'        => $p['desc'] . ' [Ubicado en ' . esc_html($rel) . ']',
                                'file'        => $rel,
                                'full_path'   => $filepath,
                                'line'        => $line,
                                'code'        => htmlspecialchars($snippet),
                                'can_clean'   => true,
                                'clean_action'=> 'quarantine'
                            ));
                            break;
                        }
                    }

                    // Si pertenece a Redux Framework y NO tiene malware real, OMITIR falso positivo
                    if ($is_redux_or_theme_cache && !$threat_found) {
                        continue;
                    }

                    // Si es un archivo PHP desconocido en uploads fuera de frameworks conocidos:
                    if (!$threat_found) {
                        $this->add_threat(array(
                            'id'          => md5($filepath),
                            'category'    => 'uploads_php_suspicious',
                            'severity'    => 'warn',
                            'title'       => 'Archivo ejecutable PHP inusual en Uploads',
                            'desc'        => 'Se encontró un archivo PHP en la carpeta de medios. Aunque no contiene una firma de malware conocida, los archivos PHP en uploads son inusuales.',
                            'file'        => $rel,
                            'full_path'   => $filepath,
                            'line'        => 1,
                            'code'        => htmlspecialchars(substr($content, 0, 180)),
                            'can_clean'   => true,
                            'clean_action'=> 'quarantine'
                        ));
                    }
                    continue;
                }

                // Escanear contenido de archivos .ico, .txt, .svg, .js por si tienen código PHP/JS embebido o malware
                if (in_array($ext, array('ico', 'txt', 'svg', 'htm', 'html', 'js')) && $item->getSize() < 500000) {
                    $this->check_file_content($filepath);
                }
            }
        }
    }

    /**
     * Escaneo de todos los plugins instalados en wp-content/plugins/
     */
    private function scan_plugins() {
        $plugins_dir = WP_PLUGIN_DIR;
        if (!is_dir($plugins_dir)) return;

        $iterator = new RecursiveIteratorIterator(
            new RecursiveDirectoryIterator($plugins_dir, RecursiveDirectoryIterator::SKIP_DOTS),
            RecursiveIteratorIterator::SELF_FIRST
        );

        foreach ($iterator as $item) {
            if ($item->isFile()) {
                $filepath = $item->getPathname();
                $rel = str_replace(array(ABSPATH, '\\'), array('', '/'), $filepath);

                // Omitir el propio plugin NexaGuard Security para no auto-analizarse
                if (strpos($rel, 'nexaguard-security') !== false) {
                    continue;
                }

                // Omitir carpetas de desarrollo / dependencias externas
                if (strpos($rel, '/node_modules/') !== false || strpos($rel, '/.git/') !== false || strpos($rel, '/tests/') !== false) {
                    continue;
                }

                $ext = strtolower($item->getExtension());
                if (in_array($ext, array('php', 'js', 'html', 'htm', 'ico')) && $item->getSize() < 1200000) {
                    $this->scanned_files++;
                    $this->check_file_content($filepath, 'plugin');
                }
            }
        }
    }

    /**
     * Escaneo de plugins obligatorios mu-plugins
     */
    private function scan_mu_plugins() {
        $mu_dir = WPMU_PLUGIN_DIR;
        if (!is_dir($mu_dir)) return;

        $files = scandir($mu_dir);
        foreach ($files as $file) {
            if ($file === '.' || $file === '..') continue;
            $filepath = $mu_dir . '/' . $file;
            if (is_file($filepath) && pathinfo($filepath, PATHINFO_EXTENSION) === 'php') {
                $this->scanned_files++;
                $this->check_file_content($filepath, 'mu_plugin');
            }
        }
    }

    /**
     * Escaneo de todos los temas instalados
     */
    private function scan_themes() {
        $themes_dir = get_theme_root();
        if (!is_dir($themes_dir)) return;

        $iterator = new RecursiveIteratorIterator(
            new RecursiveDirectoryIterator($themes_dir, RecursiveDirectoryIterator::SKIP_DOTS),
            RecursiveIteratorIterator::SELF_FIRST
        );

        foreach ($iterator as $item) {
            if ($item->isFile()) {
                $ext = strtolower($item->getExtension());
                if (in_array($ext, array('php', 'js', 'html', 'htm')) && $item->getSize() < 1200000) {
                    $this->scanned_files++;
                    $this->check_file_content($item->getPathname(), 'theme');
                }
            }
        }
    }

    /**
     * Escaneo de integridad del Core de WordPress y archivos raíz
     */
    private function scan_core() {
        $root_files = array(
            ABSPATH . 'index.php',
            ABSPATH . 'wp-blog-header.php',
            ABSPATH . 'wp-config.php',
            ABSPATH . 'wp-settings.php',
            ABSPATH . 'wp-load.php',
            ABSPATH . 'wp-login.php',
            ABSPATH . '.htaccess'
        );

        foreach ($root_files as $filepath) {
            if (file_exists($filepath)) {
                $this->scanned_files++;
                $this->check_file_content($filepath, 'core_root');
            }
        }

        // Inspeccionar archivos clave de wp-includes
        $includes_dir = ABSPATH . WPINC;
        if (is_dir($includes_dir)) {
            $critical_includes = array(
                $includes_dir . '/template-loader.php',
                $includes_dir . '/functions.php',
                $includes_dir . '/load.php',
                $includes_dir . '/default-filters.php',
                $includes_dir . '/version.php',
                $includes_dir . '/pluggable.php',
                $includes_dir . '/general-template.php',
                $includes_dir . '/formatting.php',
                $includes_dir . '/js/wp-embed.min.js',
                $includes_dir . '/js/jquery/jquery.min.js'
            );
            foreach ($critical_includes as $filepath) {
                if (file_exists($filepath)) {
                    $this->scanned_files++;
                    $this->check_file_content($filepath, 'core_includes');
                }
            }
        }
    }

    /**
     * Análisis forense de contenido de un archivo
     */
    private function check_file_content($filepath, $location = '') {
        $rel = str_replace(array(ABSPATH, '\\'), array('', '/'), $filepath);

        if (in_array($rel, $this->whitelist) || in_array($filepath, $this->whitelist)) {
            return;
        }

        $content = @file_get_contents($filepath);
        if ($content === false) {
            return;
        }

        foreach ($this->patterns as $key => $p) {
            if (preg_match($p['regex'], $content, $matches, PREG_OFFSET_CAPTURE)) {
                $offset = $matches[0][1];
                $line = substr_count(substr($content, 0, $offset), "\n") + 1;
                $snippet = substr($content, max(0, $offset - 40), 180);

                $this->add_threat(array(
                    'id'          => md5($filepath . $line . $key),
                    'category'    => $key,
                    'severity'    => $p['severity'],
                    'title'       => $p['title'],
                    'desc'        => $p['desc'],
                    'file'        => $rel,
                    'full_path'   => $filepath,
                    'line'        => $line,
                    'code'        => htmlspecialchars($snippet),
                    'can_clean'   => true,
                    'clean_action'=> in_array($p['type'], array('clearfake', 'etherhiding', 'clickfix')) ? 'sanitize_injection' : 'quarantine'
                ));
            }
        }
    }

    /**
     * Escaneo forense exhaustivo de la base de datos (wp_options, wp_posts, wp-cron)
     */
    private function scan_database() {
        global $wpdb;

        // 1. Escanear wp_options buscando inyecciones
        $options = $wpdb->get_results(
            "SELECT option_name, option_value FROM {$wpdb->options} 
             WHERE option_name IN ('siteurl', 'home', 'active_plugins', 'insert_headers_and_footers', 'header_footer_scripts', 'custom_css_post_id') 
                OR option_name LIKE '%custom_code%'
                OR option_name LIKE '%theme_mods_%'
                OR option_value LIKE '%data:text/javascript;base64%' 
                OR option_value LIKE '%bsc-testnet%' 
                OR option_value LIKE '%0xA1decFB%'
                OR option_value LIKE '%0x46790e2%'
                OR option_value LIKE '%eth_call%'
                OR option_value LIKE '%turnstile%'
                OR option_value LIKE '%challenge-platform%'
                OR option_value LIKE '%eval(base64%'
                OR option_value LIKE '%String.fromCharCode%'
             LIMIT 250"
        );

        if ($options) {
            foreach ($options as $row) {
                $this->scanned_options++;
                $val = $row->option_value;
                foreach ($this->patterns as $key => $p) {
                    if (preg_match($p['regex'], $val, $matches)) {
                        $this->add_threat(array(
                            'id'          => md5('db_opt_' . $row->option_name),
                            'category'    => 'db_' . $key,
                            'severity'    => $p['severity'],
                            'title'       => $p['title'] . ' (en Base de Datos)',
                            'desc'        => $p['desc'] . ' [Ubicado en la opción ' . esc_html($row->option_name) . '].',
                            'file'        => 'Base de datos: tabla ' . $wpdb->options . ' -> ' . $row->option_name,
                            'full_path'   => $row->option_name,
                            'line'        => 0,
                            'code'        => htmlspecialchars(substr($matches[0], 0, 160)),
                            'can_clean'   => true,
                            'clean_action'=> 'clean_db_option'
                        ));
                    }
                }
            }
        }

        // 2. Escanear wp_posts buscando inyecciones de scripts (Elementor, bloques o cabeceras globales)
        $posts = $wpdb->get_results(
            "SELECT ID, post_title, post_type, post_content FROM {$wpdb->posts} 
             WHERE post_status = 'publish' 
               AND (post_content LIKE '%data:text/javascript;base64%' 
                 OR post_content LIKE '%bsc-testnet%' 
                 OR post_content LIKE '%0xA1decFB%' 
                 OR post_content LIKE '%0x46790e2%' 
                 OR post_content LIKE '%challenge-platform%' 
                 OR post_content LIKE '%turnstile.render%' 
                 OR post_content LIKE '%eval(base64%' 
                 OR post_content LIKE '%eval(atob%')
             LIMIT 50"
        );

        if ($posts) {
            foreach ($posts as $post) {
                $this->scanned_options++;
                foreach ($this->patterns as $key => $p) {
                    if (preg_match($p['regex'], $post->post_content, $matches)) {
                        $this->add_threat(array(
                            'id'          => md5('post_' . $post->ID . '_' . $key),
                            'category'    => 'post_' . $key,
                            'severity'    => $p['severity'],
                            'title'       => $p['title'] . ' (en Publicación/Plantilla)',
                            'desc'        => $p['desc'] . ' [Encontrado en post #' . $post->ID . ' "' . esc_html($post->post_title) . '"]',
                            'file'        => 'Base de datos: wp_posts -> #' . $post->ID . ' (' . $post->post_type . ')',
                            'full_path'   => $post->ID,
                            'line'        => 0,
                            'code'        => htmlspecialchars(substr($matches[0], 0, 160)),
                            'can_clean'   => true,
                            'clean_action'=> 'clean_post_injection'
                        ));
                    }
                }
            }
        }

        // 3. Escanear tareas programadas de WP-Cron por hooks maliciosos
        $cron = get_option('cron');
        if (is_array($cron)) {
            foreach ($cron as $timestamp => $cronhooks) {
                if (!is_array($cronhooks)) continue;
                foreach ($cronhooks as $hook => $keys) {
                    if (preg_match('/(eval|base64|system|shell|passthru|exec|assert|backdoor|clearfake)/i', $hook)) {
                        $this->add_threat(array(
                            'id'          => md5('cron_' . $hook),
                            'category'    => 'suspicious_cron',
                            'severity'    => 'crit',
                            'title'       => 'Tarea programada sospechosa (WP-Cron)',
                            'desc'        => 'Se encontró un hook programado potencialmente malicioso: ' . esc_html($hook),
                            'file'        => 'WP-Cron -> ' . $hook,
                            'full_path'   => $hook,
                            'line'        => 0,
                            'code'        => 'Hook: ' . $hook,
                            'can_clean'   => true,
                            'clean_action'=> 'remove_cron_hook'
                        ));
                    }
                }
            }
        }
    }

    /**
     * Verificación de usuarios con rol de administrador
     */
    private function scan_admin_users() {
        $admins = get_users(array('role' => 'administrator'));
        foreach ($admins as $admin) {
            $email = $admin->user_email;
            if (preg_match('/@(tempmail|guerrillamail|10minutemail|sharklasers|mailinator|yopmail|dispostable)\./i', $email)) {
                $this->add_threat(array(
                    'id'          => md5('user_' . $admin->ID),
                    'category'    => 'suspicious_admin',
                    'severity'    => 'crit',
                    'title'       => 'Administrador con correo electrónico desechable',
                    'desc'        => "El usuario '{$admin->user_login}' ({$email}) tiene privilegios de administrador y utiliza un dominio de correo temporal.",
                    'file'        => 'Usuarios de WordPress -> ID #' . $admin->ID,
                    'full_path'   => $admin->ID,
                    'line'        => 0,
                    'code'        => 'Usuario: ' . $admin->user_login . ' | Email: ' . $email . ' | Creado: ' . $admin->user_registered,
                    'can_clean'   => true,
                    'clean_action'=> 'downgrade_user'
                ));
            }
        }
    }

    private function add_threat($threat) {
        $this->threats[] = $threat;
    }
}
