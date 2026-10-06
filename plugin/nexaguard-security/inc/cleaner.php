<?php
if (!defined('ABSPATH')) {
    exit;
}

class NexaGuard_Cleaner {
    private $quarantine_dir;

    public function __construct() {
        $upload = wp_upload_dir();
        $this->quarantine_dir = trailingslashit($upload['basedir']) . 'nexaguard-quarantine/';
        $this->ensure_quarantine_dir();
    }

    private function ensure_quarantine_dir() {
        if (!is_dir($this->quarantine_dir)) {
            wp_mkdir_p($this->quarantine_dir);
        }
        $htaccess = $this->quarantine_dir . '.htaccess';
        if (!file_exists($htaccess)) {
            @file_put_contents($htaccess, "Order Deny,Allow\nDeny from all\n<Files *>\nDeny from all\n</Files>");
        }
        $index = $this->quarantine_dir . 'index.php';
        if (!file_exists($index)) {
            @file_put_contents($index, "<?php // Silence is golden\nexit;\n");
        }
    }

    public function quarantine_file($relative_or_full_path) {
        $full_path = (strpos($relative_or_full_path, ABSPATH) === 0) ? $relative_or_full_path : (ABSPATH . ltrim($relative_or_full_path, '/'));

        if (!file_exists($full_path)) {
            return array('success' => false, 'message' => 'El archivo no existe en la ruta indicada: ' . esc_html($full_path));
        }

        // Salvaguarda: No permitir cuarentena de archivos del núcleo o archivos maestros
        $protected_basenames = array(
            'wp-config.php', 'wp-settings.php', 'wp-load.php', 'wp-blog-header.php',
            'wp-login.php', 'index.php', '.htaccess'
        );
        if (in_array(basename($full_path), $protected_basenames, true) ||
            strpos($full_path, ABSPATH . WPINC) !== false ||
            strpos($full_path, ABSPATH . 'wp-admin') !== false) {
            return array(
                'success' => false,
                'message' => 'Protección del Sistema: Los archivos del Núcleo de WordPress no deben ser puestos en cuarentena total para evitar la caída de la web. Utiliza "Erradicar Inyección y Reparar".'
            );
        }

        // Crear siempre un respaldo automático de seguridad previo
        @copy($full_path, $full_path . '.bak_nexaguard_' . time());

        // Forzar permisos en directorio y archivo para evitar bloqueos
        if (!is_writable($full_path)) {
            @chmod(dirname($full_path), 0777);
            @chmod($full_path, 0777);
        }

        $id = uniqid('q_');
        $dest_filename = $id . '_' . basename($full_path) . '.isolated';
        $dest_path = $this->quarantine_dir . $dest_filename;

        // Copiar y luego eliminar original
        if (!@copy($full_path, $dest_path)) {
            // Intentar leer y escribir manualmente
            $data = @file_get_contents($full_path);
            if ($data === false || @file_put_contents($dest_path, $data) === false) {
                return array('success' => false, 'message' => 'No se pudo mover el archivo a la carpeta de cuarentena.');
            }
        }

        // Forzar vaciado y eliminación del archivo infectado
        @file_put_contents($full_path, '<?php // Neutralizado en cuarentena por NexaGuard Security; exit; ?>');
        @unlink($full_path);

        // Guardar registro en opciones
        $log = get_option('nexaguard_quarantine_log', array());
        $log[$id] = array(
            'original_path' => $full_path,
            'quarantine_file' => $dest_path,
            'date' => current_time('mysql'),
            'size' => file_exists($dest_path) ? filesize($dest_path) : 0
        );
        update_option('nexaguard_quarantine_log', $log);

        return array('success' => true, 'message' => 'Archivo puesto en cuarentena segura y neutralizado con éxito.');
    }

    public function clean($type, $target) {
        if ($type === 'sanitize_injection' || $type === 'clearfake' || $type === 'etherhiding' || $type === 'clickfix') {
            return $this->clean_file_injection($target);
        } elseif ($type === 'force_delete') {
            return $this->force_delete($target);
        } elseif ($type === 'delete_plugin_folder') {
            return $this->delete_plugin_folder($target);
        } elseif ($type === 'clean_db_option') {
            return $this->clean_db_option($target);
        } elseif ($type === 'delete_db_option') {
            return $this->delete_db_option($target);
        } elseif ($type === 'clean_post_injection') {
            return $this->clean_post_injection(intval($target));
        } elseif ($type === 'remove_cron_hook') {
            return $this->remove_cron_hook($target);
        } elseif ($type === 'quarantine') {
            return $this->quarantine_file($target);
        } elseif ($type === 'downgrade_user') {
            return $this->downgrade_user(intval($target));
        } elseif ($type === 'whitelist') {
            return $this->whitelist_item($target);
        }

        return array('success' => false, 'message' => 'Acción de desinfección no reconocida.');
    }

    /**
     * Eliminación forzada y destrucción definitiva del archivo malicioso
     * Supera permisos estrictos (0444, 0555) forzando chmod y vaciado de contenido.
     */
    public function force_delete($target) {
        // Salvaguarda: si target es una opción de BD (no tiene barras de ruta de archivo)
        if (strpos($target, '/') === false && strpos($target, '\\') === false) {
            if (get_option($target) !== false) {
                return $this->delete_db_option($target);
            }
        }

        $full_path = (strpos($target, ABSPATH) === 0) ? $target : (ABSPATH . ltrim($target, '/'));

        if (!file_exists($full_path)) {
            return array('success' => true, 'message' => 'El elemento indicado ya no existe en el servidor.');
        }

        // Salvaguarda: PROHIBIR terminantemente la eliminación forzada de archivos del Núcleo de WordPress
        $protected_basenames = array(
            'wp-config.php', 'wp-settings.php', 'wp-load.php', 'wp-blog-header.php',
            'wp-login.php', 'index.php', '.htaccess'
        );
        if (in_array(basename($full_path), $protected_basenames, true) ||
            strpos($full_path, ABSPATH . WPINC) !== false ||
            strpos($full_path, ABSPATH . 'wp-admin') !== false) {
            return array(
                'success' => false,
                'message' => 'Protección del Sistema: No se permite eliminar archivos del Núcleo de WordPress para evitar la caída de la web. Utiliza "Erradicar Inyección y Reparar".'
            );
        }

        if (is_dir($full_path)) {
            $ok = $this->recursive_force_delete_dir($full_path);
            if ($ok || !file_exists($full_path)) {
                return array('success' => true, 'message' => 'Carpeta maliciosa eliminada por completo sin restricciones.');
            }
        }

        // Forzar permisos a nivel de carpeta y archivo
        @chmod(dirname($full_path), 0777);
        @chmod($full_path, 0777);

        // Neutralizar código inmediatamente vaciando el archivo
        @file_put_contents($full_path, '<?php // Neutralizado y destruido por NexaGuard Security; exit; ?>');

        if (@unlink($full_path) || !file_exists($full_path)) {
            return array('success' => true, 'message' => 'Amenaza destruida y eliminada definitivamente del servidor.');
        }

        return array('success' => true, 'message' => 'El código malicioso fue neutralizado y vaciado en el servidor.');
    }

    /**
     * Eliminar la carpeta completa del plugin malicioso (ej: wp-content/plugins/hseo/)
     */
    public function delete_plugin_folder($target_file_or_dir) {
        $full_path = (strpos($target_file_or_dir, ABSPATH) === 0) ? $target_file_or_dir : (ABSPATH . ltrim($target_file_or_dir, '/'));

        $plugins_dir = WP_PLUGIN_DIR;
        if (strpos($full_path, $plugins_dir) === false) {
            return $this->force_delete($full_path);
        }

        $rel_to_plugins = trim(str_replace($plugins_dir, '', $full_path), '/\\');
        $parts = explode('/', str_replace('\\', '/', $rel_to_plugins));
        $plugin_folder_name = $parts[0];

        // Evitar eliminar NexaGuard Security o plugins esenciales del sitio
        $protected_essential_plugins = array('nexaguard-security', 'woocommerce', 'elementor', 'js_composer', 'contact-form-7', 'wordpress-seo');
        if (empty($plugin_folder_name) || in_array($plugin_folder_name, $protected_essential_plugins, true)) {
            return array('success' => false, 'message' => "Por seguridad de tu web, no se puede eliminar la carpeta completa de '{$plugin_folder_name}'. Desinfecta las inyecciones de forma individual para evitar caídas.");
        }

        $plugin_folder_path = $plugins_dir . '/' . $plugin_folder_name;
        if (is_dir($plugin_folder_path)) {
            $this->recursive_force_delete_dir($plugin_folder_path);
            if (!file_exists($plugin_folder_path)) {
                return array('success' => true, 'message' => "Carpeta completa del plugin malicioso '{$plugin_folder_name}' destruida exitosamente.");
            }
        }

        return $this->force_delete($full_path);
    }

    private function recursive_force_delete_dir($dir) {
        if (!is_dir($dir)) return false;
        @chmod($dir, 0777);
        $files = @scandir($dir);
        if ($files === false) return false;

        foreach ($files as $file) {
            if ($file === '.' || $file === '..') continue;
            $path = $dir . DIRECTORY_SEPARATOR . $file;
            @chmod($path, 0777);
            if (is_dir($path)) {
                $this->recursive_force_delete_dir($path);
            } else {
                @file_put_contents($path, '');
                @unlink($path);
            }
        }
        return @rmdir($dir);
    }

    private function clean_file_injection($filepath) {
        $full_path = (strpos($filepath, ABSPATH) === 0) ? $filepath : (ABSPATH . ltrim($filepath, '/'));

        if (!file_exists($full_path)) {
            return array('success' => false, 'message' => 'El archivo no existe: ' . esc_html($filepath));
        }

        // Forzar permisos antes de escribir
        if (!is_writable($full_path)) {
            @chmod(dirname($full_path), 0777);
            @chmod($full_path, 0777);
        }

        $content = @file_get_contents($full_path);
        if ($content === false) {
            return array('success' => false, 'message' => 'Error al leer el archivo.');
        }

        // Crear respaldo de seguridad antes de modificar
        @copy($full_path, $full_path . '.bak_nexaguard_' . time());

        // Limpiar inyección de script base64 ClearFake / EtherHiding
        $clean_content = preg_replace('/<script[^>]*src=["\']data:text\/javascript;base64,[A-Za-z0-9+\/]+["\'][^>]*><\/script>/i', '', $content);
        $clean_content = preg_replace('/<script[^>]*src=["\']data:text\/javascript;base64,[A-Za-z0-9+\/]+["\'][^>]*\/>/i', '', $clean_content);

        // Limpiar llamadas conocidas de RPC EtherHiding / Blockchain contracts
        $clean_content = preg_replace('/load_\("0x[a-fA-F0-9]{40}"\)[^;]*;/i', '', $clean_content);
        $clean_content = preg_replace('/<script[^>]*>[^<]*(bsc-testnet|0xA1decFB|0x46790e2|turnstile|challenge-platform)[^<]*<\/script>/i', '', $clean_content);

        // Limpiar inyecciones de redirecciones de tráfico malicioso en etiquetas <script>
        $clean_content = preg_replace('/<script[^>]*>[^<]*(location\.href|location\.replace)\s*=\s*[\'"]https?:\/\/[^<]*<\/script>/i', '', $clean_content);

        // Limpiar backdoors inyectados en una sola línea (PHP tag cerrado autónomo)
        $clean_content = preg_replace('/<\?php\s*@?(eval|assert)\s*\(\s*(base64_decode|gzinflate|str_rot13|hex2bin)\s*\([^;]+\)\s*\)\s*;\s*\?>/i', '', $clean_content);
        $clean_content = preg_replace('/<\?php\s*@?(eval|assert|system|passthru|shell_exec)\s*\(\s*@?\$_(SERVER|COOKIE)\[[\'"][A-Z_]+[\'"]\]\s*\)\s*;\s*\?>/i', '', $clean_content);

        if ($clean_content !== $content) {
            @file_put_contents($full_path, $clean_content);
            return array('success' => true, 'message' => 'Inyección maliciosa erradicada con éxito. Se guardó copia de seguridad.');
        }

        return array('success' => false, 'message' => 'No se pudo limpiar automáticamente el patrón sin riesgo de alterar código legítimo. Te recomendamos usar Mover a Cuarentena o Eliminación Forzada.');
    }

    private function clean_db_option($option_name) {
        $val = get_option($option_name);
        if ($val === false) {
            return array('success' => false, 'message' => 'Opción no encontrada en la base de datos.');
        }

        // Si es una opción interna o caché de NexaGuard, purgarla
        if (stripos($option_name, 'nexaguard') !== false) {
            delete_option($option_name);
            return array('success' => true, 'message' => 'Caché de NexaGuard reseteada y limpiada.');
        }

        if (is_string($val)) {
            $cleaned = preg_replace('/<script[^>]*data:text\/javascript;base64,[^>]*><\/script>/i', '', $val);
            $cleaned = preg_replace('/<script[^>]*src=["\']data:text\/javascript;base64,[^>]*><\/script>/i', '', $cleaned);
            $cleaned = preg_replace('/<script[^>]*>[^<]*(bsc-testnet|0xA1decFB|0x46790e2|turnstile|challenge-platform)[^<]*<\/script>/i', '', $cleaned);
            $cleaned = preg_replace('/<script[^>]*>[^<]*(eval\(|powershell|base64)[^<]*<\/script>/i', '', $cleaned);
            if ($cleaned !== $val) {
                update_option($option_name, $cleaned);
                return array('success' => true, 'message' => 'Inyección maliciosa erradicada de la opción en base de datos.');
            }
        }

        return array('success' => false, 'message' => 'No se detectó un script desinfectable automáticamente. Usa el botón "Purgar Opción de BD" para eliminar la clave.');
    }

    public function delete_db_option($option_name) {
        if (empty($option_name)) {
            return array('success' => false, 'message' => 'Nombre de opción no especificado.');
        }

        $protected_core = array('siteurl', 'home', 'active_plugins', 'blogname', 'admin_email', 'template', 'stylesheet');
        if (in_array($option_name, $protected_core, true)) {
            return array('success' => false, 'message' => "La opción '{$option_name}' es vital para WordPress y no debe ser eliminada por completo. Usa 'Limpiar Inyección'.");
        }

        delete_option($option_name);
        return array('success' => true, 'message' => "Opción '{$option_name}' eliminada permanentemente de la base de datos.");
    }

    private function clean_post_injection($post_id) {
        $post = get_post($post_id);
        if (!$post) {
            return array('success' => false, 'message' => 'Publicación o plantilla no encontrada.');
        }

        $content = $post->post_content;
        $cleaned = preg_replace('/<script[^>]*data:text\/javascript;base64,[^>]*><\/script>/i', '', $content);
        $cleaned = preg_replace('/<script[^>]*src=["\']data:text\/javascript;base64,[^>]*><\/script>/i', '', $cleaned);
        $cleaned = preg_replace('/<script[^>]*>[^<]*(bsc-testnet|0xA1decFB|0x46790e2|turnstile|challenge-platform)[^<]*<\/script>/i', '', $cleaned);

        if ($cleaned !== $content) {
            wp_update_post(array(
                'ID' => $post_id,
                'post_content' => $cleaned
            ));
            return array('success' => true, 'message' => 'Plantilla/Publicación desinfectada exitosamente.');
        }

        return array('success' => false, 'message' => 'No se encontraron scripts desinfectables en esta entrada.');
    }

    private function remove_cron_hook($hook_name) {
        wp_clear_scheduled_hook($hook_name);
        return array('success' => true, 'message' => "Tarea programada '{$hook_name}' removida del programador.");
    }

    public function whitelist_item($target) {
        $whitelist = get_option('nexaguard_whitelisted_items', array());
        if (!in_array($target, $whitelist)) {
            $whitelist[] = $target;
            update_option('nexaguard_whitelisted_items', $whitelist);
        }
        return array('success' => true, 'message' => 'Elemento agregado a la lista blanca de permitidos.');
    }

    private function downgrade_user($user_id) {
        $u = get_user_by('id', $user_id);
        if (!$u) return array('success' => false, 'message' => 'Usuario no encontrado.');

        $u->set_role('subscriber');
        return array('success' => true, 'message' => "El usuario '{$u->user_login}' fue degradado a suscriptor sin privilegios administrativos.");
    }

    public function restore_file($id) {
        $log = get_option('nexaguard_quarantine_log', array());
        if (!isset($log[$id])) {
            return array('success' => false, 'message' => 'Registro de cuarentena no encontrado.');
        }

        $entry = $log[$id];
        if (!file_exists($entry['quarantine_file'])) {
            return array('success' => false, 'message' => 'El archivo aislado ya no se encuentra en cuarentena.');
        }

        @chmod(dirname($entry['original_path']), 0777);
        @copy($entry['quarantine_file'], $entry['original_path']);
        @unlink($entry['quarantine_file']);
        unset($log[$id]);
        update_option('nexaguard_quarantine_log', $log);

        return array('success' => true, 'message' => 'Archivo restaurado a su ubicación original.');
    }

    public function protect_uploads_htaccess($enable = true) {
        $upload = wp_upload_dir();
        $htaccess = trailingslashit($upload['basedir']) . '.htaccess';

        if ($enable) {
            $rules = "# NexaGuard Security - Bloqueo de ejecucion PHP en Uploads\n";
            $rules .= "<FilesMatch \"\\.(php|phtml|php3|php4|php5|php7|phps|shtml)$\">\n";
            $rules .= "Order Deny,Allow\n";
            $rules .= "Deny from all\n";
            $rules .= "</FilesMatch>\n";
            @file_put_contents($htaccess, $rules);
        } else {
            if (file_exists($htaccess)) {
                $content = @file_get_contents($htaccess);
                if (strpos($content, 'NexaGuard Security') !== false) {
                    @unlink($htaccess);
                }
            }
        }
    }
}
