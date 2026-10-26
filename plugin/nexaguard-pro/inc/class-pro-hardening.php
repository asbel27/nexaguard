<?php
/**
 * NexaGuard PRO - Módulo de Endurecimiento Avanzado de Sistema y Servidor (Deep Hardening)
 * Protege archivos maestros, bloquea vectores de ataque y regenera claves criptográficas.
 * 
 * @package NexaGuard_Pro
 */

if (!defined('ABSPATH')) {
    exit;
}

class NexaGuard_Pro_Hardening {

    /**
     * Aplica el paquete completo de endurecimiento de un solo clic
     */
    public static function apply_full_hardening() {
        $results = array();

        $results['disallow_file_edit']   = self::harden_disallow_file_edit();
        $results['protect_wp_config']    = self::harden_wp_config_permissions();
        $results['block_uploads_php']    = self::harden_block_uploads_php();
        $results['disable_xmlrpc']       = self::harden_disable_xmlrpc();
        $results['protect_system_files'] = self::harden_protect_system_files_htaccess();

        $success_count = 0;
        foreach ($results as $res) {
            if (!empty($res['success'])) {
                $success_count++;
            }
        }

        update_option('nexaguard_pro_hardening_status', array(
            'applied_at'    => current_time('mysql'),
            'success_count' => $success_count,
            'total_rules'   => count($results),
            'results'       => $results
        ));

        return array(
            'success' => true,
            'message' => "¡Blindaje profundo completado! Se aplicaron {$success_count} de " . count($results) . " medidas de endurecimiento críticas.",
            'details' => $results
        );
    }

    /**
     * 1. Deshabilitar editor de temas y plugins desde el panel de WordPress (wp-config.php)
     */
    public static function harden_disallow_file_edit() {
        $config_file = self::get_wp_config_path();
        if (!$config_file) {
            return array('success' => false, 'message' => 'No se localizó wp-config.php');
        }

        $content = @file_get_contents($config_file);
        if ($content === false) {
            return array('success' => false, 'message' => 'No se pudo leer wp-config.php');
        }

        if (stripos($content, 'DISALLOW_FILE_EDIT') !== false) {
            return array('success' => true, 'message' => 'DISALLOW_FILE_EDIT ya se encontraba activo.');
        }

        self::backup_config_file($config_file);

        $needle = "/* That's all, stop editing!";
        $directive = "\n/** NexaGuard PRO Hardening: Bloqueo de edicion de codigo en el panel */\ndefine('DISALLOW_FILE_EDIT', true);\n";

        if (strpos($content, $needle) !== false) {
            $new_content = str_replace($needle, $directive . "\n" . $needle, $content);
        } else {
            $new_content = $content . "\n" . $directive;
        }

        if (@file_put_contents($config_file, $new_content) !== false) {
            return array('success' => true, 'message' => 'Editor de temas y plugins deshabilitado en wp-config.php.');
        }

        return array('success' => false, 'message' => 'Error de escritura en wp-config.php.');
    }

    /**
     * 2. Endurecer permisos de wp-config.php (0440 / 0640)
     */
    public static function harden_wp_config_permissions() {
        $config_file = self::get_wp_config_path();
        if (!$config_file) {
            return array('success' => false, 'message' => 'wp-config.php no encontrado');
        }

        $applied = @chmod($config_file, 0440);
        if (!$applied) {
            $applied = @chmod($config_file, 0640);
        }

        $perms = substr(sprintf('%o', fileperms($config_file)), -4);
        return array(
            'success' => $applied,
            'message' => $applied ? "Permisos de wp-config.php asegurados a {$perms}." : "No se pudieron cambiar permisos de wp-config.php (actual: {$perms})."
        );
    }

    /**
     * 3. Bloquear ejecución de scripts PHP dentro del directorio uploads
     */
    public static function harden_block_uploads_php() {
        $upload = wp_upload_dir();
        if (empty($upload['basedir'])) {
            return array('success' => false, 'message' => 'Directorio de uploads inaccesible');
        }

        $htaccess = trailingslashit($upload['basedir']) . '.htaccess';
        $content = "# BEGIN NexaGuard PRO Hardening - Bloqueo de PHP en Uploads\n" .
                   "<FilesMatch \"\\.(php|phtml|php3|php4|php5|php7|phps|phar|inc|cgi|pl)\$\">\n" .
                   "    Order Deny,Allow\n" .
                   "    Deny from all\n" .
                   "</FilesMatch>\n" .
                   "# END NexaGuard PRO Hardening\n";

        $existing = file_exists($htaccess) ? @file_get_contents($htaccess) : '';
        if (strpos($existing, 'BEGIN NexaGuard PRO Hardening - Bloqueo de PHP') !== false) {
            return array('success' => true, 'message' => 'Bloqueo de PHP en uploads ya activo.');
        }

        if (@file_put_contents($htaccess, $content . "\n" . $existing) !== false) {
            return array('success' => true, 'message' => 'Ejecución de PHP bloqueada en /wp-content/uploads/.');
        }

        return array('success' => false, 'message' => 'No se pudo escribir en ' . $htaccess);
    }

    /**
     * 4. Deshabilitar XML-RPC para impedir ataques de fuerza bruta y pingbacks DDoS
     */
    public static function harden_disable_xmlrpc() {
        $settings = get_option('nexaguard_pro_settings', array());
        $settings['disable_xmlrpc'] = true;
        update_option('nexaguard_pro_settings', $settings);

        add_filter('xmlrpc_enabled', '__return_false');
        add_filter('xmlrpc_methods', '__return_empty_array');

        return array(
            'success' => true,
            'message' => 'Protocolo XML-RPC deshabilitado para neutralizar ataques de fuerza bruta y pingbacks.'
        );
    }

    /**
     * 5. Proteger archivos críticos del sistema e impedir listado de carpetas (.htaccess raíz)
     */
    public static function harden_protect_system_files_htaccess() {
        $htaccess = ABSPATH . '.htaccess';
        if (!file_exists($htaccess)) {
            return array('success' => false, 'message' => 'Archivo .htaccess no presente (servidor Nginx o sin permalinks).');
        }

        $existing = @file_get_contents($htaccess);
        if ($existing === false) {
            return array('success' => false, 'message' => 'No se pudo leer .htaccess');
        }

        if (strpos($existing, 'BEGIN NexaGuard PRO - Proteccion de Archivos Criticos') !== false) {
            return array('success' => true, 'message' => 'Reglas de protección .htaccess ya integradas.');
        }

        $rules = "\n# BEGIN NexaGuard PRO - Proteccion de Archivos Criticos\n" .
                 "Options -Indexes\n" .
                 "<FilesMatch \"^(wp-config\\.php|\\.env|\\.git|php\\.ini|readme\\.html|license\\.txt)\$\">\n" .
                 "    Order allow,deny\n" .
                 "    Deny from all\n" .
                 "</FilesMatch>\n" .
                 "<FilesMatch \"\\.(bak|config|sql|fla|psd|ini|log|sh|inc|swp|dist)\$\">\n" .
                 "    Order allow,deny\n" .
                 "    Deny from all\n" .
                 "</FilesMatch>\n" .
                 "# END NexaGuard PRO\n";

        if (@file_put_contents($htaccess, $rules . "\n" . $existing) !== false) {
            return array('success' => true, 'message' => 'Listado de directorios y acceso a archivos sensibles blindados en .htaccess.');
        }

        return array('success' => false, 'message' => 'Error al escribir reglas en .htaccess.');
    }

    /**
     * 6. Regenerador Criptográfico de Sales y Claves Secretas de WordPress (Salt Regenerator)
     * Expulsa instantáneamente a cualquier intruso con cookies robadas de sesión.
     */
    public static function regenerate_security_salts() {
        $config_file = self::get_wp_config_path();
        if (!$config_file) {
            return array('success' => false, 'message' => 'No se localizó wp-config.php');
        }

        $content = @file_get_contents($config_file);
        if ($content === false) {
            return array('success' => false, 'message' => 'No se pudo leer wp-config.php');
        }

        // Descargar sales criptográficas oficiales de alta entropía desde WordPress.org
        $response = wp_remote_get('https://api.wordpress.org/secret-key/1.1/salt/', array('timeout' => 10, 'sslverify' => false));
        if (is_wp_error($response) || wp_remote_retrieve_response_code($response) !== 200) {
            // Generador autónomo local de respaldo si la API no responde
            $fresh_salts = self::generate_local_salts();
        } else {
            $fresh_salts = wp_remote_retrieve_body($response);
        }

        if (empty($fresh_salts)) {
            return array('success' => false, 'message' => 'No se pudieron generar nuevas sales criptográficas.');
        }

        self::backup_config_file($config_file);

        // Reemplazar el bloque existente de define('AUTH_KEY' ... 'NONCE_SALT')
        $pattern = "/define\(\s*['\"](AUTH_KEY|SECURE_AUTH_KEY|LOGGED_IN_KEY|NONCE_KEY|AUTH_SALT|SECURE_AUTH_SALT|LOGGED_IN_SALT|NONCE_SALT)['\"].*?\);/s";
        
        $replaced = preg_replace($pattern, '', $content);
        if ($replaced !== null) {
            // Insertar nuevas sales justo antes de table_prefix o DB_NAME
            if (strpos($replaced, '$table_prefix') !== false) {
                $new_content = str_replace('$table_prefix', $fresh_salts . "\n\$table_prefix", $replaced);
            } else {
                $new_content = $replaced . "\n" . $fresh_salts;
            }

            if (@file_put_contents($config_file, $new_content) !== false) {
                return array(
                    'success' => true,
                    'message' => '🔑 Sales y claves secretas regeneradas con éxito. Todas las sesiones activas y cookies anteriores han sido invalidadas por seguridad.'
                );
            }
        }

        return array('success' => false, 'message' => 'No se pudo actualizar wp-config.php con las nuevas sales.');
    }

    /**
     * Generador local de claves criptográficas de alta entropía
     */
    private static function generate_local_salts() {
        $keys = array('AUTH_KEY', 'SECURE_AUTH_KEY', 'LOGGED_IN_KEY', 'NONCE_KEY', 'AUTH_SALT', 'SECURE_AUTH_SALT', 'LOGGED_IN_SALT', 'NONCE_SALT');
        $output = "";
        $chars = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$%^&*()-_ []{}<>~`+=,.;:/?|';
        $max = strlen($chars) - 1;

        foreach ($keys as $k) {
            $rand = '';
            for ($i = 0; $i < 64; $i++) {
                $rand .= $chars[random_int(0, $max)];
            }
            $rand = addcslashes($rand, "'\\");
            $output .= "define('{$k}', '{$rand}');\n";
        }

        return $output;
    }

    private static function get_wp_config_path() {
        if (file_exists(ABSPATH . 'wp-config.php')) {
            return ABSPATH . 'wp-config.php';
        }
        if (file_exists(dirname(ABSPATH) . '/wp-config.php')) {
            return dirname(ABSPATH) . '/wp-config.php';
        }
        return false;
    }

    private static function backup_config_file($config_file) {
        $upload = wp_upload_dir();
        $backup_dir = trailingslashit($upload['basedir']) . 'nexaguard-backups/';
        if (!is_dir($backup_dir)) {
            @wp_mkdir_p($backup_dir);
            @file_put_contents($backup_dir . '.htaccess', "Order Deny,Allow\nDeny from all");
            @file_put_contents($backup_dir . 'index.php', "<?php // Silence is golden");
        }
        @copy($config_file, $backup_dir . 'wp-config.php.hardening_' . time() . '.bak');
    }
}
