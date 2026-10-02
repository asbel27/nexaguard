<?php
if (!defined('ABSPATH')) {
    exit;
}

class NexaGuard_Scanner {
    private $threats = array();
    private $scanned_files = 0;
    private $scanned_options = 0;

    // Firmas conocidas de malware y técnicas de evasión
    private $patterns = array(
        // ClearFake / ClickFix / EtherHiding (como el detectado en capintvalue.com.mx)
        'clearfake_etherhiding' => array(
            'regex'    => '/data:text\/javascript;base64,[A-Za-z0-9+\/]{40,}/i',
            'title'    => 'Inyección de malware ClearFake / EtherHiding',
            'desc'     => 'Script codificado en base64 utilizado para cargar falsos captchas de Cloudflare y troyanos mediante contratos inteligentes en blockchain.',
            'severity' => 'crit',
            'type'     => 'clearfake'
        ),
        'smart_contract_rpc' => array(
            'regex'    => '/(bsc-testnet-rpc|data-seed-prebsc|bnbchain\.org|eth_call|0x6d4ce63c)/i',
            'title'    => 'Llamada sospechosa a Blockchain / Smart Contract RPC',
            'desc'     => 'Código que consulta la blockchain Binance Smart Chain para evadir listas negras tradicionales (EtherHiding).',
            'severity' => 'crit',
            'type'     => 'etherhiding'
        ),
        'eval_base64' => array(
            'regex'    => '/(eval\s*\(\s*(base64_decode|gzinflate|gzuncompress|str_rot13|hex2bin)\s*\()/i',
            'title'    => 'Ofuscación crítica: eval(base64/gzinflate)',
            'desc'     => 'Ejecución oculta de código binario o comprimido, típico de backdoors y puertas traseras.',
            'severity' => 'crit',
            'type'     => 'backdoor'
        ),
        'eval_atob' => array(
            'regex'    => '/eval\s*\(\s*atob\s*\(/i',
            'title'    => 'Ejecución encubierta JavaScript: eval(atob())',
            'desc'     => 'Ejecución en navegador de código descargado o decodificado al vuelo.',
            'severity' => 'crit',
            'type'     => 'malicious_js'
        ),
        'assert_shell' => array(
            'regex'    => '/(assert\s*\(\s*\$_(GET|POST|REQUEST|COOKIE)|create_function\s*\([^\)]*\$_(GET|POST|REQUEST))/i',
            'title'    => 'Ejecución remota vía assert/create_function',
            'desc'     => 'Puerta trasera que ejecuta código PHP arbitrario enviado por atacantes vía peticiones web.',
            'severity' => 'crit',
            'type'     => 'webshell'
        ),
        'system_execution' => array(
            'regex'    => '/(system|shell_exec|passthru|popen|proc_open)\s*\(\s*\$_(GET|POST|REQUEST|COOKIE)/i',
            'title'    => 'Ejecución de comandos del sistema operativo',
            'desc'     => 'Comando de terminal controlado por parámetros HTTP del visitante. Riesgo extremo de toma de control del servidor.',
            'severity' => 'crit',
            'type'     => 'rce'
        ),
        'webshell_signatures' => array(
            'regex'    => '/(c99shell|r57shell|WSO_VERSION|FilesMan|b374k|alfa_team|IndoXploit|MadSpot)/i',
            'title'    => 'Firma de WebShell conocida (c99/r57/WSO/FilesMan)',
            'desc'     => 'Herramienta gráfica de administración ilícita instalada por ciberatacantes.',
            'severity' => 'crit',
            'type'     => 'webshell'
        ),
        'hidden_iframe' => array(
            'regex'    => '/<iframe[^>]+(style\s*=\s*["\'][^"\']*(display\s*:\s*none|visibility\s*:\s*hidden|width\s*:\s*0|height\s*:\s*0)|width\s*=\s*["\']0["\'])/i',
            'title'    => 'Iframe oculto / Redirección fraudulenta',
            'desc'     => 'Marco invisible diseñado para inflar visitas fraudulentas o cargar exploits en segundo plano.',
            'severity' => 'warn',
            'type'     => 'hidden_iframe'
        )
    );

    public function scan_full() {
        $start_time = microtime(true);
        $this->threats = array();
        $this->scanned_files = 0;
        $this->scanned_options = 0;

        // 1. Escanear carpeta de subidas (Uploads)
        $this->scan_uploads();

        // 2. Escanear plugins obligatorios (mu-plugins)
        $this->scan_mu_plugins();

        // 3. Escanear tema activo y temas instalados
        $this->scan_themes();

        // 4. Escanear archivos raíz del sistema
        $this->scan_root_files();

        // 5. Escanear base de datos (wp_options)
        $this->scan_database();

        // 6. Verificar usuarios administradores
        $this->scan_admin_users();

        $elapsed = round(microtime(true) - $start_time, 2);

        // Guardar último reporte en opciones
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

                // NUNCA debe haber PHP en la carpeta de uploads
                if (in_array($ext, array('php', 'phtml', 'php3', 'php4', 'php5', 'php7', 'phps', 'shtml'))) {
                    $this->add_threat(array(
                        'id'          => md5($filepath),
                        'category'    => 'uploads_php',
                        'severity'    => 'crit',
                        'title'       => 'Archivo PHP ejecutable en la carpeta Uploads',
                        'desc'        => 'Se encontró un archivo de código ejecutable dentro de la carpeta multimedia. Esta es la técnica #1 de backdoors.',
                        'file'        => str_replace(ABSPATH, '', $filepath),
                        'full_path'   => $filepath,
                        'line'        => 1,
                        'code'        => substr(file_get_contents($filepath), 0, 200),
                        'can_clean'   => true,
                        'clean_action'=> 'quarantine'
                    ));
                    continue;
                }

                // Escanear contenido de archivos .ico, .txt, .svg por si tienen código PHP embebido
                if (in_array($ext, array('ico', 'txt', 'svg', 'htm', 'html')) && $item->getSize() < 500000) {
                    $this->check_file_content($filepath);
                }
            }
        }
    }

    private function scan_mu_plugins() {
        $mu_dir = WPMU_PLUGIN_DIR;
        if (!is_dir($mu_dir)) {
            return;
        }

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

    private function scan_themes() {
        $themes_dir = get_theme_root();
        $active_theme = get_stylesheet();
        $theme_path = $themes_dir . '/' . $active_theme;

        if (is_dir($theme_path)) {
            $this->scan_directory_php($theme_path);
        }
    }

    private function scan_root_files() {
        $critical_files = array(
            ABSPATH . 'index.php',
            ABSPATH . 'wp-blog-header.php',
            ABSPATH . 'wp-config.php',
            ABSPATH . 'wp-settings.php',
            ABSPATH . 'wp-load.php',
            ABSPATH . '.htaccess'
        );

        foreach ($critical_files as $filepath) {
            if (file_exists($filepath)) {
                $this->scanned_files++;
                $this->check_file_content($filepath, 'core_root');
            }
        }
    }

    private function scan_directory_php($dir) {
        $iterator = new RecursiveIteratorIterator(
            new RecursiveDirectoryIterator($dir, RecursiveDirectoryIterator::SKIP_DOTS),
            RecursiveIteratorIterator::SELF_FIRST
        );

        foreach ($iterator as $item) {
            if ($item->isFile() && strtolower($item->getExtension()) === 'php' && $item->getSize() < 1000000) {
                $this->scanned_files++;
                $this->check_file_content($item->getPathname());
            }
        }
    }

    private function check_file_content($filepath, $location = '') {
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
                    'file'        => str_replace(ABSPATH, '', $filepath),
                    'full_path'   => $filepath,
                    'line'        => $line,
                    'code'        => htmlspecialchars($snippet),
                    'can_clean'   => true,
                    'clean_action'=> $p['type'] === 'clearfake' ? 'sanitize_injection' : 'quarantine'
                ));
            }
        }
    }

    private function scan_database() {
        global $wpdb;

        // Escanear opciones críticas
        $options = $wpdb->get_results(
            "SELECT option_name, option_value FROM {$wpdb->options} 
             WHERE option_name IN ('siteurl', 'home', 'active_plugins') 
                OR option_value LIKE '%data:text/javascript;base64%' 
                OR option_value LIKE '%bsc-testnet%' 
                OR option_value LIKE '%<script%' 
             LIMIT 100"
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
    }

    private function scan_admin_users() {
        $admins = get_users(array('role' => 'administrator'));
        foreach ($admins as $admin) {
            // Verificar si el correo es sospechoso o temporal
            $email = $admin->user_email;
            if (preg_match('/@(tempmail|guerrillamail|10minutemail|sharklasers|mailinator|yopmail)\./i', $email)) {
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
