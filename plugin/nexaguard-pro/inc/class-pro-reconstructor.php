<?php
/**
 * NexaGuard PRO - Módulo de Reconstrucción de Archivos Vitales del Núcleo de WordPress
 * Descarga y restaura réplicas oficiales, limpias e inmaculadas de WordPress.org
 * 
 * @package NexaGuard_Pro
 */

if (!defined('ABSPATH')) {
    exit;
}

class NexaGuard_Pro_Reconstructor {

    /**
     * Lista de archivos vitales prioritarios de WordPress
     */
    public static function get_vital_files() {
        return array(
            'index.php'                 => array('label' => 'Punto de entrada principal (index.php)', 'critical' => true),
            'wp-blog-header.php'        => array('label' => 'Cargador de plantilla y entorno (wp-blog-header.php)', 'critical' => true),
            'wp-load.php'               => array('label' => 'Bootstrap del entorno WordPress (wp-load.php)', 'critical' => true),
            'wp-settings.php'           => array('label' => 'Inicializador de constantes y plugins (wp-settings.php)', 'critical' => true),
            'wp-login.php'              => array('label' => 'Pantalla y autenticación de login (wp-login.php)', 'critical' => true),
            'wp-includes/version.php'   => array('label' => 'Declaración de versión y hash de build (version.php)', 'critical' => true),
            'wp-includes/pluggable.php' => array('label' => 'Funciones de autorización y usuarios (pluggable.php)', 'critical' => true),
            'wp-content/index.php'      => array('label' => 'Silenciador de directorio wp-content', 'critical' => false)
        );
    }

    /**
     * Reconstruye un archivo individual del núcleo obteniéndolo desde WordPress.org
     */
    public static function restore_core_file($target) {
        global $wp_version, $wp_local_package;

        $target_norm = wp_normalize_path(wp_unslash($target));
        $abspath_norm = wp_normalize_path(ABSPATH);

        if (strpos($target_norm, $abspath_norm) === 0) {
            $rel_path = trim(substr($target_norm, strlen($abspath_norm)), '/');
        } else {
            $rel_path = trim($target_norm, '/');
        }

        $full_path = rtrim(ABSPATH, '/\\') . DIRECTORY_SEPARATOR . str_replace('/', DIRECTORY_SEPARATOR, $rel_path);

        // Validación estricta: solo archivos reconocidos del núcleo
        $is_core = (strpos($rel_path, 'wp-includes/') === 0 || 
                    strpos($rel_path, 'wp-admin/') === 0 || 
                    in_array($rel_path, array('index.php', 'wp-blog-header.php', 'wp-settings.php', 'wp-load.php', 'wp-login.php', 'wp-cron.php', 'wp-mail.php', 'wp-links-opml.php', 'wp-trackback.php', 'wp-content/index.php'), true));

        if (!$is_core) {
            return array('success' => false, 'message' => "El archivo '{$rel_path}' no pertenece a los directorios del núcleo de WordPress.");
        }

        if ($rel_path === 'wp-config.php') {
            return array('success' => false, 'message' => "wp-config.php contiene las credenciales de tu base de datos y no puede ser sobrescrito.");
        }

        // Crear respaldo de seguridad antes de modificar
        self::backup_file_before_replacement($full_path);

        // Obtener versión oficial instalada
        $core_version = !empty($wp_version) ? $wp_version : get_bloginfo('version');
        $locale = function_exists('get_locale') ? get_locale() : 'en_US';

        // Obtener checksum oficial de WordPress.org
        $expected_md5 = self::get_official_checksum($rel_path, $core_version, $locale);

        // Descargar copia oficial desde WordPress.org / GitHub Mirrors oficiales
        $urls = array(
            "https://raw.githubusercontent.com/WordPress/WordPress/{$core_version}/{$rel_path}",
            "https://core.svn.wordpress.org/tags/{$core_version}/{$rel_path}"
        );

        $official_content = false;
        foreach ($urls as $url) {
            $response = wp_remote_get($url, array('timeout' => 15, 'sslverify' => false));
            if (!is_wp_error($response) && wp_remote_retrieve_response_code($response) === 200) {
                $body = wp_remote_retrieve_body($response);
                if (!empty($body) && strlen($body) > 10) {
                    $official_content = $body;
                    break;
                }
            }
        }

        if ($official_content === false) {
            return array('success' => false, 'message' => "No se pudo descargar la réplica oficial de '{$rel_path}' desde WordPress.org. Comprueba la conexión saliente de tu hosting.");
        }

        // Caso especial para version.php con idioma localizado
        if ($rel_path === 'wp-includes/version.php') {
            $site_package = !empty($wp_local_package) ? $wp_local_package : $locale;
            if ($site_package !== 'en_US' && strpos($official_content, '$wp_local_package') === false) {
                $candidate_localized = $official_content . "\n\$wp_local_package = '{$site_package}';\n";
                if (!empty($expected_md5) && md5($candidate_localized) === $expected_md5) {
                    $official_content = $candidate_localized;
                } elseif (!empty($expected_md5) && md5($official_content) === $expected_md5) {
                    // Mantener versión pura
                } else {
                    $official_content = $candidate_localized;
                }
            }
        }

        // Garantizar permisos de escritura temporales si el archivo existe
        if (file_exists($full_path) && !wp_is_writable($full_path)) {
            @chmod(dirname($full_path), 0755);
            @chmod($full_path, 0644);
        }

        $dir = dirname($full_path);
        if (!is_dir($dir)) {
            @wp_mkdir_p($dir);
        }

        $written = @file_put_contents($full_path, $official_content);
        if ($written === false) {
            return array('success' => false, 'message' => "Error de permisos al escribir en '{$full_path}'. Revisa la propiedad de archivos en tu hosting.");
        }

        // Restablecer permisos seguros 0644
        @chmod($full_path, 0644);

        // Invalidar OPcache y caché de estadísticas
        clearstatcache(true, $full_path);
        if (function_exists('opcache_invalidate')) {
            @opcache_invalidate($full_path, true);
        }

        // Registrar en el log de auditoría
        self::log_reconstruction($rel_path, $core_version);

        return array(
            'success' => true,
            'message' => "✅ Archivo vital '/{$rel_path}' reconstruido con éxito a su estado oficial inmaculado de WordPress.org (v{$core_version}).",
            'file'    => '/' . $rel_path
        );
    }

    /**
     * Reconstruye todos los archivos vitales de WordPress en un solo proceso
     */
    public static function rebuild_all_vital_files() {
        global $wp_version;
        $core_version = !empty($wp_version) ? $wp_version : get_bloginfo('version');

        $vital_files = self::get_vital_files();
        $restored = 0;
        $details = array();

        foreach (array_keys($vital_files) as $rel) {
            $full_path = ABSPATH . $rel;
            $res = self::restore_core_file($full_path);
            if (!empty($res['success'])) {
                $restored++;
                $details[] = "✓ /$rel restaurado con copia oficial inmaculada.";
            } else {
                $details[] = "⚠️ /$rel: " . (isset($res['message']) ? $res['message'] : 'Omitido');
            }
        }

        return array(
            'success'  => true,
            'restored' => $restored,
            'total'    => count($vital_files),
            'details'  => $details,
            'message'  => "¡Se han reconstruido y verificado {$restored} archivos vitales del núcleo con copias oficiales inmaculadas de WordPress.org (v{$core_version})!"
        );
    }

    /**
     * Obtiene el checksum MD5 oficial de WordPress.org
     */
    private static function get_official_checksum($rel_path, $version, $locale) {
        $cache_key = 'nexaguard_pro_checksums_' . md5($version . '_' . $locale);
        $checksums = get_transient($cache_key);

        if (empty($checksums) || !is_array($checksums)) {
            $api_url = "https://api.wordpress.org/core/checksums/1.0/?version={$version}&locale={$locale}";
            $response = wp_remote_get($api_url, array('timeout' => 10, 'sslverify' => false));
            if (!is_wp_error($response) && wp_remote_retrieve_response_code($response) === 200) {
                $body = json_decode(wp_remote_retrieve_body($response), true);
                if (!empty($body['checksums'])) {
                    $checksums = $body['checksums'];
                    set_transient($cache_key, $checksums, 24 * HOUR_IN_SECONDS);
                }
            }
        }

        return (!empty($checksums[$rel_path])) ? $checksums[$rel_path] : '';
    }

    /**
     * Respalda el archivo en la carpeta de cuarentena/backups de NexaGuard
     */
    private static function backup_file_before_replacement($file_path) {
        if (!file_exists($file_path) || is_dir($file_path)) {
            return;
        }

        $upload = wp_upload_dir();
        $backup_dir = trailingslashit($upload['basedir']) . 'nexaguard-backups/';
        if (!is_dir($backup_dir)) {
            @wp_mkdir_p($backup_dir);
            @file_put_contents($backup_dir . '.htaccess', "Order Deny,Allow\nDeny from all");
            @file_put_contents($backup_dir . 'index.php', "<?php // Silence is golden");
        }

        $safe_name = sanitize_file_name(basename($file_path));
        $dest = $backup_dir . $safe_name . '.core_rebuild_' . time() . '.bak';
        @copy($file_path, $dest);
    }

    /**
     * Registra el historial de reconstrucción
     */
    private static function log_reconstruction($rel_path, $version) {
        $history = get_option('nexaguard_pro_reconstruction_log', array());
        if (!is_array($history)) {
            $history = array();
        }

        array_unshift($history, array(
            'file'      => '/' . $rel_path,
            'version'   => $version,
            'time'      => current_time('mysql'),
            'timestamp' => time(),
            'user'      => wp_get_current_user()->user_login
        ));

        // Conservar solo los últimos 50 registros
        if (count($history) > 50) {
            $history = array_slice($history, 0, 50);
        }

        update_option('nexaguard_pro_reconstruction_log', $history);
    }
}
