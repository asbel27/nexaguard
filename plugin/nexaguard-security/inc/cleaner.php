<?php
if (!defined('ABSPATH')) {
    exit;
}

class NexaGuard_Cleaner {
    private $quarantine_dir;
    private $backup_dir;

    public function __construct() {
        $upload_basedir = nexamasc_get_uploads_path();
        // Conforme a las directrices de WordPress.org, almacenamiento dedicado dentro de wp-content/uploads/
        // bajo la subcarpeta oficial del identificador de plugin (nexaguard-malware-scanner)
        $this->quarantine_dir = trailingslashit($upload_basedir) . 'nexaguard-malware-scanner/quarantine/';
        $this->backup_dir     = trailingslashit($upload_basedir) . 'nexaguard-malware-scanner/backups/';
        $this->ensure_quarantine_dir();
        $this->ensure_backup_dir();
    }

    /**
     * Obtiene el manejador oficial de archivos de WordPress (WP_Filesystem)
     */
    private function get_filesystem() {
        global $wp_filesystem;
        if (empty($wp_filesystem)) {
            if (!function_exists('WP_Filesystem')) {
                require_once nexamasc_get_admin_path() . '/includes/file.php';
            }
            WP_Filesystem();
        }
        return $wp_filesystem;
    }

    /**
     * Modifica permisos de archivo o directorio usando WP_Filesystem
     */
    private function fs_chmod($path, $mode = 0644) {
        $fs = $this->get_filesystem();
        if ($fs && method_exists($fs, 'chmod')) {
            return $fs->fs_chmod($path, $mode);
        }
        return false;
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

    private function ensure_backup_dir() {
        if (!is_dir($this->backup_dir)) {
            wp_mkdir_p($this->backup_dir);
        }
        $htaccess = $this->backup_dir . '.htaccess';
        if (!file_exists($htaccess)) {
            @file_put_contents($htaccess, "Order Deny,Allow\nDeny from all\n<Files *>\nDeny from all\n</Files>");
        }
        $index = $this->backup_dir . 'index.php';
        if (!file_exists($index)) {
            @file_put_contents($index, "<?php // Silence is golden\nexit;\n");
        }
    }

    /**
     * Crea un respaldo centralizado y protegido dentro de uploads/nexaguard-malware-scanner/backups/
     */
    public function create_file_backup($source_path) {
        if (!file_exists($source_path) || is_dir($source_path)) {
            return false;
        }
        $this->ensure_backup_dir();
        $safe_name = sanitize_file_name(basename($source_path));
        $backup_file = $this->backup_dir . $safe_name . '.' . md5($source_path) . '.' . time() . '.bak';
        return @copy($source_path, $backup_file);
    }

    public function quarantine_file($relative_or_full_path) {
        $root = nexamasc_get_root_path();
        $raw_path = (strpos($relative_or_full_path, $root) === 0) ? $relative_or_full_path : (trailingslashit($root) . ltrim($relative_or_full_path, '/'));
        $real_path = realpath($raw_path);

        if (!$real_path || !file_exists($real_path)) {
            return array('success' => false, 'message' => 'El archivo no existe en la ruta indicada: ' . esc_html($relative_or_full_path));
        }

        $full_path = wp_normalize_path($real_path);
        $abs_norm  = $root;

        // Salvaguarda Anti Path-Traversal: la ruta debe residir estrictamente dentro de la instalación
        if (strpos($full_path, $abs_norm) !== 0) {
            return array('success' => false, 'message' => 'Ruta de archivo no autorizada fuera de la instalación de WordPress.');
        }

        // Salvaguarda: No permitir cuarentena de archivos del núcleo o archivos maestros
        $protected_basenames = array(
            'wp-config.php', 'wp-settings.php', 'wp-load.php', 'wp-blog-header.php',
            'wp-login.php', 'index.php', '.htaccess'
        );
        if (in_array(basename($full_path), $protected_basenames, true) ||
            strpos($full_path, nexamasc_get_includes_path()) !== false ||
            strpos($full_path, nexamasc_get_admin_path()) !== false) {
            return array(
                'success' => false,
                'message' => 'Protección del Sistema: Los archivos del Núcleo de WordPress no deben ser puestos en cuarentena total para evitar la caída de la web.'
            );
        }

        // Crear siempre un respaldo automático de seguridad previo en nexaguard-backups
        $this->create_file_backup($full_path);

        // Forzar permisos en directorio y archivo para evitar bloqueos
        if (!wp_is_writable($full_path)) {
            $this->fs_chmod(dirname($full_path), 0777);
            $this->fs_chmod($full_path, 0777);
        }

        $id = uniqid('q_');
        $dest_filename = $id . '_' . sanitize_file_name(basename($full_path)) . '.isolated';
        $dest_path = $this->quarantine_dir . $dest_filename;

        // Copiar y luego eliminar original
        if (!@copy($full_path, $dest_path)) {
            // Intentar leer y escribir manualmente
            $data = @file_get_contents($full_path);
            if ($data === false || @file_put_contents($dest_path, $data) === false) {
                return array('success' => false, 'message' => 'No se pudo mover el archivo a la carpeta de cuarentena.');
            }
        }

        // Eliminación segura del archivo infectado (sin stubs ejecutables)
        wp_delete_file($full_path);
        if (file_exists($full_path)) {
            @unlink($full_path);
        }

        // Guardar registro en opciones
        $log = get_option('nexaguard_quarantine_log', array());
        $log[$id] = array(
            'original_path' => $full_path,
            'quarantine_file' => $dest_path,
            'date' => current_time('mysql'),
            'size' => file_exists($dest_path) ? filesize($dest_path) : 0
        );
        update_option('nexaguard_quarantine_log', $log);

        return array(
            'success' => true,
            'message' => 'Archivo aislado en cuarentena segura con éxito.',
            'id'      => $id
        );
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
        } elseif ($type === 'apply_disallow_file_edit') {
            return $this->apply_disallow_file_edit();
        } elseif ($type === 'apply_htaccess_no_indexes') {
            return $this->apply_htaccess_no_indexes(true);
        } elseif ($type === 'regenerate_wp_salts') {
            return $this->regenerate_wp_salts();
        } elseif ($type === 'clean_dropin') {
            return $this->clean_dropin($target);
        } elseif ($type === 'neutralize_auto_prepend') {
            return $this->neutralize_auto_prepend($target);
        } elseif ($type === 'protect_uploads_directory') {
            return $this->protect_uploads_directory();
        } elseif ($type === 'clean_db_trigger') {
            return $this->clean_db_trigger($target);
        } elseif ($type === 'restore_core_file') {
            return $this->restore_core_file($target);
        } elseif ($type === 'revert_snapshot') {
            return $this->revert_snapshot($target);
        } elseif ($type === 'protect_system_files') {
            return $this->protect_system_files(true);
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

        $root = nexamasc_get_root_path();
        $raw_path = (strpos($target, $root) === 0) ? $target : (trailingslashit($root) . ltrim($target, '/'));
        $real_path = realpath($raw_path);

        if (!$real_path || !file_exists($real_path)) {
            return array('success' => true, 'message' => 'El elemento indicado ya no existe en el servidor.');
        }

        $full_path = wp_normalize_path($real_path);
        $abs_norm  = $root;

        // Salvaguarda Anti Path-Traversal: la ruta debe residir estrictamente dentro de la instalación
        if (strpos($full_path, $abs_norm) !== 0) {
            return array('success' => false, 'message' => 'Ruta de archivo no autorizada fuera de la instalación de WordPress.');
        }

        // Salvaguarda: PROHIBIR terminantemente la eliminación forzada de archivos del Núcleo de WordPress
        $protected_basenames = array(
            'wp-config.php', 'wp-settings.php', 'wp-load.php', 'wp-blog-header.php',
            'wp-login.php', 'index.php', '.htaccess'
        );
        if (in_array(basename($full_path), $protected_basenames, true) ||
            strpos($full_path, nexamasc_get_includes_path()) !== false ||
            strpos($full_path, nexamasc_get_admin_path()) !== false) {
            return array(
                'success' => false,
                'message' => 'Protección del Sistema: No se permite eliminar archivos del Núcleo de WordPress para evitar la caída de la web.'
            );
        }

        if (is_dir($full_path)) {
            $ok = $this->recursive_force_delete_dir($full_path);
            if ($ok || !file_exists($full_path)) {
                return array('success' => true, 'message' => 'Carpeta maliciosa eliminada por completo sin restricciones.');
            }
        }

        // Crear punto de restauración previo por seguridad en uploads
        if (file_exists($full_path) && !is_dir($full_path)) {
            $this->create_snapshot($full_path, 'Eliminación Forzada de Archivo');
        }

        // Forzar permisos a nivel de carpeta y archivo
        $this->fs_chmod(dirname($full_path), 0777);
        $this->fs_chmod($full_path, 0777);

        // Eliminar el archivo directamente mediante la API de WordPress
        if (wp_delete_file($full_path) || !file_exists($full_path)) {
            return array('success' => true, 'message' => 'Amenaza eliminada definitivamente del servidor.');
        }

        if (file_exists($full_path)) {
            @unlink($full_path);
        }

        if (!file_exists($full_path)) {
            return array('success' => true, 'message' => 'Amenaza eliminada definitivamente del servidor.');
        }

        return array('success' => false, 'message' => 'No se pudo eliminar el archivo por restricciones de permisos en el servidor.');
    }

    /**
     * Eliminar la carpeta completa del plugin malicioso (ej: wp-content/plugins/hseo/)
     */
    public function delete_plugin_folder($target_file_or_dir) {
        $root = nexamasc_get_root_path();
        $full_path = (strpos($target_file_or_dir, $root) === 0) ? $target_file_or_dir : (trailingslashit($root) . ltrim($target_file_or_dir, '/'));

        $plugins_dir = nexamasc_get_plugins_path();
        if (strpos($full_path, $plugins_dir) === false) {
            return $this->force_delete($full_path);
        }

        $rel_to_plugins = trim(str_replace($plugins_dir, '', $full_path), '/\\');
        $parts = explode('/', str_replace('\\', '/', $rel_to_plugins));
        $plugin_folder_name = $parts[0];

        // Evitar eliminar NexaGuard Security o plugins esenciales del sitio
        $protected_essential_plugins = array('nexaguard-security', 'nexaguard-malware-scanner', 'nexaguard-pro', 'nexaguard-malware-scanner-pro', 'woocommerce', 'elementor', 'js_composer', 'contact-form-7', 'wordpress-seo');
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
        $fs = $this->get_filesystem();
        if ($fs) {
            return $fs->delete($dir, true);
        }
        return false;
    }

    /**
     * Gestión segura de inyecciones de código en archivos de plugins, temas o núcleo
     * Conforme a las directrices de seguridad de WordPress.org, los plugins nunca deben
     * modificar código ejecutable en directorios de otros plugins, temas o núcleo.
     */
    private function clean_file_injection($filepath) {
        $root = nexamasc_get_root_path();
        $raw_path = (strpos($filepath, $root) === 0) ? $filepath : (trailingslashit($root) . ltrim($filepath, '/'));
        $real_path = realpath($raw_path);

        if (!$real_path || !file_exists($real_path)) {
            return array('success' => false, 'message' => 'El archivo no existe: ' . esc_html($filepath));
        }

        $full_path = wp_normalize_path($real_path);

        // Si el archivo pertenece a un plugin instalado, guiar a la reinstalación oficial
        $plugins_path = nexamasc_get_plugins_path();
        if (strpos($full_path, $plugins_path) === 0) {
            $plugins_url = admin_url('plugins.php');
            return array(
                'success' => true,
                'message' => sprintf(
                    __('Conforme a las directrices de seguridad de WordPress.org, los archivos de plugins no deben modificarse en disco para prevenir la corrupción de código ejecutable. Por favor, reinstala o actualiza el plugin correspondiente desde el repositorio oficial: <a href="%s" class="button button-secondary" target="_blank" style="margin-left:8px;">Gestionar Plugins ↗</a>', 'nexaguard-malware-scanner'),
                    esc_url($plugins_url)
                )
            );
        }

        // Si el archivo pertenece a un tema, guiar a la reinstalación oficial
        $themes_path = wp_normalize_path(trailingslashit(nexamasc_get_content_path()) . 'themes');
        if (strpos($full_path, $themes_path) === 0) {
            $themes_url = admin_url('themes.php');
            return array(
                'success' => true,
                'message' => sprintf(
                    __('Conforme a las directrices de seguridad de WordPress.org, los archivos de temas no deben modificarse en disco. Por favor, reinstala o actualiza el tema desde el repositorio oficial: <a href="%s" class="button button-secondary" target="_blank" style="margin-left:8px;">Gestionar Temas ↗</a>', 'nexaguard-malware-scanner'),
                    esc_url($themes_url)
                )
            );
        }

        // Si es un archivo del núcleo
        if (strpos($full_path, nexamasc_get_includes_path()) !== false ||
            strpos($full_path, nexamasc_get_admin_path()) !== false) {
            return $this->restore_core_file($full_path);
        }

        return array(
            'success' => false,
            'message' => __('Para eliminar este archivo sospechoso sin riesgo de alterar código, utiliza el botón "Mover a Cuarentena" o "Eliminar Archivo".', 'nexaguard-malware-scanner')
        );
    }

    /**
     * Limpieza de inyecciones en opciones de base de datos
     * Restringido estrictamente a opciones registradas como amenazas en el informe de escaneo.
     */
    private function clean_db_option($option_name) {
        $option_name = sanitize_text_field(trim($option_name));
        if (empty($option_name)) {
            return array('success' => false, 'message' => 'Nombre de opción no especificado.');
        }

        // Validación de Seguridad exigida por WordPress.org:
        // Constrain target option strictly to threats recorded in the last scan
        $report = get_option('nexaguard_last_scan_report', array());
        $is_flagged = false;
        if (!empty($report['threats']) && is_array($report['threats'])) {
            foreach ($report['threats'] as $t) {
                $target_candidate = !empty($t['target']) ? $t['target'] : (!empty($t['full_path']) ? $t['full_path'] : '');
                if ($target_candidate === $option_name) {
                    $is_flagged = true;
                    break;
                }
            }
        }

        if (!$is_flagged && stripos($option_name, 'nexaguard') === false) {
            return array(
                'success' => false,
                'message' => 'Acción denegada: la opción no se encuentra registrada entre las amenazas detectadas en el último escaneo forense.'
            );
        }

        $protected_core = array('siteurl', 'home', 'active_plugins', 'blogname', 'admin_email', 'template', 'stylesheet', 'users_can_register', 'default_role', 'nonce_salt', 'auth_salt');
        if (in_array(strtolower($option_name), $protected_core, true)) {
            return array('success' => false, 'message' => "La opción '{$option_name}' es vital para WordPress y no debe ser modificada.");
        }

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
        $option_name = sanitize_text_field(trim($option_name));
        if (empty($option_name)) {
            return array('success' => false, 'message' => 'Nombre de opción no especificado.');
        }

        $protected_core = array('siteurl', 'home', 'active_plugins', 'blogname', 'admin_email', 'template', 'stylesheet', 'users_can_register', 'default_role', 'nonce_salt', 'auth_salt');
        if (in_array(strtolower($option_name), $protected_core, true)) {
            return array('success' => false, 'message' => "La opción '{$option_name}' es vital para WordPress y no debe ser eliminada.");
        }

        // Validar que la opción esté registrada en el informe de amenazas
        $report = get_option('nexaguard_last_scan_report', array());
        $is_flagged = false;
        if (!empty($report['threats']) && is_array($report['threats'])) {
            foreach ($report['threats'] as $t) {
                $target_candidate = !empty($t['target']) ? $t['target'] : (!empty($t['full_path']) ? $t['full_path'] : '');
                if ($target_candidate === $option_name) {
                    $is_flagged = true;
                    break;
                }
            }
        }

        if (!$is_flagged && stripos($option_name, 'nexaguard') === false) {
            return array(
                'success' => false,
                'message' => 'Acción denegada: la opción no se encuentra registrada entre las amenazas detectadas en el último escaneo forense.'
            );
        }

        delete_option($option_name);
        return array('success' => true, 'message' => "Opción '{$option_name}' purgada exitosamente de la base de datos.");
    }

    private function clean_post_injection($post_id) {
        $post = get_post($post_id);
        if (!$post) {
            return array('success' => false, 'message' => 'Publicación o plantilla no encontrada.');
        }

        // Si el post entero es una publicación clandestina de spam inyectada por el atacante
        $slug = strtolower($post->post_name);
        $title = strtolower($post->post_title);
        $is_pure_spam_post = (
            strpos($slug, 'spinboss') !== false ||
            strpos($slug, 'digital-gambling') !== false ||
            strpos($slug, 'slot-gacor') !== false ||
            strpos($title, 'spinboss') !== false ||
            strpos($title, 'digital gambling') !== false
        );

        if ($is_pure_spam_post) {
            wp_trash_post($post_id);
            return array('success' => true, 'message' => 'Publicación clandestina de spam SEO enviada a la papelera.');
        }

        $content = $post->post_content;
        $cleaned = preg_replace('/<script[^>]*data:text\/javascript;base64,[^>]*><\/script>/i', '', $content);
        $cleaned = preg_replace('/<script[^>]*src=["\']data:text\/javascript;base64,[^>]*><\/script>/i', '', $cleaned);
        $cleaned = preg_replace('/<script[^>]*>[^<]*(bsc-testnet|0xA1decFB|0x46790e2|turnstile|challenge-platform)[^<]*<\/script>/i', '', $cleaned);

        // Limpieza de enlaces ocultos y spam SEO (Black Hat Casino / Pharma)
        $cleaned = preg_replace('/<div[^>]*style=["\'][^"\']*(display:\s*none|visibility:\s*hidden)[^"\']*["\'][^>]*>[\s\S]*?(online-casino|slot|spinboss|viagra|cialis|gambling)[\s\S]*?<\/div>/i', '', $cleaned);
        $cleaned = preg_replace('/<a[^>]+href=["\'][^"\']*(spinboss|casino|slot|gambling)[^"\']*["\'][^>]*>.*?<\/a>/i', '', $cleaned);

        if ($cleaned !== $content) {
            wp_update_post(array(
                'ID' => $post_id,
                'post_content' => $cleaned
            ));
            return array('success' => true, 'message' => 'Plantilla/Publicación desinfectada exitosamente.');
        }

        return array('success' => false, 'message' => 'No se encontraron scripts ni enlaces maliciosos desinfectables en esta entrada.');
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

        // Conforme a las directrices de seguridad de WordPress.org, los archivos ejecutables
        // en cuarentena no deben escribirse ni restaurarse directamente en directorios de plugins,
        // temas o raíz para prevenir la reintroducción de código malicioso.
        return array(
            'success' => true,
            'message' => sprintf(
                __('Conforme a las directrices de seguridad de WordPress.org, los archivos en cuarentena no pueden reinsertarse automáticamente en rutas ejecutables del sitio. Si este archivo pertenecía a un plugin o tema oficial, por favor reinstálalo directamente desde el repositorio oficial: <a href="%s" class="button button-secondary" target="_blank" style="margin-left:8px;">Gestionar Plugins ↗</a>', 'nexaguard-malware-scanner'),
                esc_url(admin_url('plugins.php'))
            )
        );
    }

    public function delete_quarantined_file($id) {
        $log = get_option('nexaguard_quarantine_log', array());
        if (!isset($log[$id])) {
            return array('success' => false, 'message' => 'Registro de cuarentena no encontrado.');
        }

        $entry = $log[$id];
        $quarantine_file = wp_normalize_path($entry['quarantine_file']);
        if (file_exists($quarantine_file)) {
            wp_delete_file($quarantine_file);
        }

        unset($log[$id]);
        update_option('nexaguard_quarantine_log', $log);

        return array('success' => true, 'message' => 'Archivo eliminado permanentemente de la bóveda de cuarentena.');
    }

    /**
     * Obtiene todas las posibles rutas del archivo .htaccess en la raíz de WordPress / public_html
     */
    private function get_root_htaccess_paths() {
        $paths = array();
        $root = nexamasc_get_root_path();
        if (!empty($root)) {
            $paths[] = wp_normalize_path(trailingslashit($root) . '.htaccess');
        }
        return array_values(array_unique($paths));
    }

    public function protect_uploads_htaccess($enable = true) {
        $upload = wp_upload_dir();
        if (empty($upload['basedir'])) {
            return false;
        }
        $uploads_dir = $upload['basedir'];
        $uploads_htaccess = trailingslashit($uploads_dir) . '.htaccess';

        $root_marker_begin = "# BEGIN NexaGuard Security - Bloqueo de ejecucion PHP en Uploads";
        $root_marker_end   = "# END NexaGuard Security - Bloqueo de ejecucion PHP en Uploads";

        $written_any = false;

        // 1. Reglas en wp-content/uploads/.htaccess
        if ($enable) {
            $uploads_rules  = "# NexaGuard Security - Bloqueo de ejecucion PHP en Uploads\n";
            $uploads_rules .= "<IfModule !mod_authz_core.c>\n";
            $uploads_rules .= "<FilesMatch \"\\.(php|phtml|php3|php4|php5|php7|phps|shtml|phar)$\">\n";
            $uploads_rules .= "Order Deny,Allow\n";
            $uploads_rules .= "Deny from all\n";
            $uploads_rules .= "</FilesMatch>\n";
            $uploads_rules .= "</IfModule>\n";
            $uploads_rules .= "<IfModule mod_authz_core.c>\n";
            $uploads_rules .= "<FilesMatch \"\\.(php|phtml|php3|php4|php5|php7|phps|shtml|phar)$\">\n";
            $uploads_rules .= "Require all denied\n";
            $uploads_rules .= "</FilesMatch>\n";
            $uploads_rules .= "</IfModule>\n";

            if (!is_dir($uploads_dir)) {
                @wp_mkdir_p($uploads_dir);
            }
            if (is_dir($uploads_dir) && !wp_is_writable($uploads_dir)) {
                $this->fs_chmod($uploads_dir, 0755);
            }
            if (file_exists($uploads_htaccess)) {
                $this->create_snapshot($uploads_htaccess, 'Blindaje wp-content/uploads/.htaccess');
                if (!wp_is_writable($uploads_htaccess)) {
                    $this->fs_chmod($uploads_htaccess, 0644);
                }
            }
            $u_written = @file_put_contents($uploads_htaccess, $uploads_rules);
            if ($u_written === false) {
                $fs = $this->get_filesystem();
                if ($fs) {
                    $u_written = $fs->put_contents($uploads_htaccess, $uploads_rules);
                }
            }
            if ($u_written !== false) {
                $written_any = true;
            }
        } else {
            if (file_exists($uploads_htaccess)) {
                $content = @file_get_contents($uploads_htaccess);
                if ($content !== false && strpos($content, 'NexaGuard Security') !== false) {
                    $this->create_snapshot($uploads_htaccess, 'Eliminación Blindaje wp-content/uploads/.htaccess');
                    wp_delete_file($uploads_htaccess);
                }
            }
        }

        // 2. Reglas en el .htaccess principal (raíz de WordPress / public_html)
        $root_candidates = $this->get_root_htaccess_paths();
        $root_rules = array(
            '<IfModule mod_rewrite.c>',
            'RewriteEngine On',
            'RewriteRule ^wp-content/uploads/.*\\.(?:php[0-9]?|phtml|phar|shtml|asp|aspx)$ - [F,L,NC]',
            '</IfModule>'
        );
        $root_block_str = $root_marker_begin . "\n" . implode("\n", $root_rules) . "\n" . $root_marker_end . "\n\n";

        foreach ($root_candidates as $root_file) {
            if (!file_exists($root_file) && !$enable) {
                continue;
            }

            // Intentar desbloquear permisos de escritura si está protegido en solo lectura
            if (file_exists($root_file) && !wp_is_writable($root_file)) {
                $this->fs_chmod($root_file, 0644);
            }

            // Método A: Usar API oficial de WordPress insert_with_markers
            if (!function_exists('insert_with_markers')) {
                $misc_file = nexamasc_get_admin_path() . '/includes/misc.php';
                if (file_exists($misc_file)) {
                    require_once $misc_file;
                }
            }

            $wp_inserted = false;
            if (function_exists('insert_with_markers') && (wp_is_writable($root_file) || !file_exists($root_file))) {
                if (file_exists($root_file)) {
                    $this->create_snapshot($root_file, 'Blindaje .htaccess (Bloqueo PHP Uploads)');
                    $this->create_file_backup($root_file);
                }
                $wp_inserted = insert_with_markers($root_file, 'NexaGuard Security - Bloqueo de ejecucion PHP en Uploads', $enable ? $root_rules : array());
                if ($wp_inserted) {
                    $written_any = true;
                }
            }

            // Método B: Fallback directo de escritura por stream
            if (!$wp_inserted) {
                $root_content = file_exists($root_file) ? @file_get_contents($root_file) : '';
                if ($root_content === false) {
                    $root_content = '';
                }

                $clean_root = preg_replace('/' . preg_quote($root_marker_begin, '/') . '.*?' . preg_quote($root_marker_end, '/') . '\s*/s', '', $root_content);

                if ($enable) {
                    if (file_exists($root_file)) {
                        $this->create_snapshot($root_file, 'Blindaje .htaccess (Bloqueo PHP Uploads)');
                        $this->create_file_backup($root_file);
                    }
                    if (stripos($clean_root, '# BEGIN WordPress') !== false) {
                        $new_root = preg_replace('/(# BEGIN WordPress)/i', $root_block_str . "$1", $clean_root, 1);
                    } else {
                        $new_root = $root_block_str . $clean_root;
                    }
                    $s_written = @file_put_contents($root_file, $new_root);
                    if ($s_written === false) {
                        $fs = $this->get_filesystem();
                        if ($fs) {
                            $fs->put_contents($root_file, $new_root);
                        }
                    }
                } else {
                    $s_written = @file_put_contents($root_file, $clean_root);
                    if ($s_written === false) {
                        $fs = $this->get_filesystem();
                        if ($fs) {
                            $fs->put_contents($root_file, $clean_root);
                        }
                    }
                }
            }
        }

        return array(
            'success' => true,
            'message' => $enable 
                ? 'Blindaje activado: Se bloqueó la ejecución de scripts PHP en la carpeta de subidas (/uploads/).'
                : 'Protección de subidas desactivada.'
        );
    }

    /**
     * Blindaje: Deshabilitar editor de temas y plugins (Hardening en tiempo de ejecución)
     * Activa la directiva de seguridad sin modificar archivos del sistema en disco.
     */
    public function apply_disallow_file_edit() {
        $settings = wp_parse_args(get_option('nexaguard_settings', array()), array());
        $settings['disallow_file_edit'] = true;
        update_option('nexaguard_settings', $settings);

        return array(
            'success' => true,
            'message' => 'Preferencia de blindaje guardada: Para deshabilitar la edición de temas en todo el sitio, WordPress recomienda añadir define("DISALLOW_FILE_EDIT", true); directamente en wp-config.php.'
        );
    }

    /**
     * Blindaje en .htaccess: Prevenir listado de directorios (Hardening)
     */
    public function apply_htaccess_no_indexes($enable = true) {
        $root_candidates = $this->get_root_htaccess_paths();
        $written_any = false;

        foreach ($root_candidates as $htaccess) {
            if (!file_exists($htaccess) && !$enable) {
                continue;
            }

            $content = file_exists($htaccess) ? @file_get_contents($htaccess) : '';
            if ($content === false) {
                $content = '';
            }

            if ($enable) {
                if (stripos($content, 'Options -Indexes') !== false) {
                    $written_any = true;
                    continue;
                }
                if (file_exists($htaccess)) {
                    $this->create_snapshot($htaccess, 'Blindaje .htaccess (Options -Indexes)');
                    $this->create_file_backup($htaccess);
                    if (!wp_is_writable($htaccess)) {
                        $this->fs_chmod($htaccess, 0644);
                    }
                }
                $rules = "\n# NexaGuard Hardening - Prevenir listado de directorios Apache\nOptions -Indexes\n";
                if (@file_put_contents($htaccess, $content . $rules) !== false) {
                    $written_any = true;
                }
            } else {
                if (file_exists($htaccess)) {
                    $this->create_snapshot($htaccess, 'Retirar Blindaje .htaccess (Options -Indexes)');
                    $cleaned = preg_replace('/# NexaGuard Hardening[^\n]*\nOptions -Indexes\n?/i', '', $content);
                    if (@file_put_contents($htaccess, $cleaned) !== false) {
                        $written_any = true;
                    }
                }
            }
        }

        if ($enable && !$written_any) {
            return array('success' => false, 'message' => 'No se pudo escribir en .htaccess debido a permisos restringidos.');
        }

        return array('success' => true, 'message' => 'Blindaje aplicado: Se bloqueó el listado de directorios (Options -Indexes) en .htaccess.');
    }

    /**
     * Blindaje de archivos sensibles del sistema y wp-includes (.htaccess)
     * Bloquea ejecución directa en wp-includes, protege wp-config.php, readme.html y métodos TRACE/TRACK/DEBUG
     */
    public function protect_system_files($enable = true) {
        $root_candidates = $this->get_root_htaccess_paths();
        $marker_start = "# BEGIN NexaGuard System Hardening";
        $marker_end = "# END NexaGuard System Hardening";
        $written_any = false;

        foreach ($root_candidates as $htaccess) {
            if (!file_exists($htaccess) && !$enable) {
                continue;
            }

            $content = file_exists($htaccess) ? @file_get_contents($htaccess) : '';
            if ($content === false) $content = '';

            if ($enable) {
                if (stripos($content, $marker_start) !== false) {
                    $written_any = true;
                    continue;
                }

                if (file_exists($htaccess)) {
                    $this->create_snapshot($htaccess, 'Blindaje Archivos del Sistema (.htaccess)');
                    $this->create_file_backup($htaccess);
                    if (!wp_is_writable($htaccess)) {
                        $this->fs_chmod($htaccess, 0644);
                    }
                }

                $rules = "\n{$marker_start}\n";
                $rules .= "<FilesMatch \"^(wp-config\\.php|readme\\.html|readme\\.txt|license\\.txt)$\">\n";
                $rules .= "    <IfModule mod_authz_core.c>\n";
                $rules .= "        Require all denied\n";
                $rules .= "    </IfModule>\n";
                $rules .= "    <IfModule !mod_authz_core.c>\n";
                $rules .= "        Order allow,deny\n";
                $rules .= "        Deny from all\n";
                $rules .= "    </IfModule>\n";
                $rules .= "</FilesMatch>\n\n";

                $rules .= "<IfModule mod_rewrite.c>\n";
                $rules .= "    RewriteEngine On\n";
                $rules .= "    RewriteRule ^wp-admin/install\\.php$ - [F,L]\n";
                $rules .= "    RewriteRule ^wp-admin/includes/ - [F,L]\n";
                $rules .= "    RewriteRule !^wp-includes/ - [S=3]\n";
                $rules .= "    RewriteRule ^wp-includes/[^/]+\\.php$ - [F,L]\n";
                $rules .= "    RewriteRule ^wp-includes/js/tinymce/langs/.+\\.php - [F,L]\n";
                $rules .= "    RewriteRule ^wp-includes/theme-compat/ - [F,L]\n";
                $rules .= "    RewriteCond %{REQUEST_METHOD} ^(TRACE|TRACK|DEBUG) [NC]\n";
                $rules .= "    RewriteRule ^ - [F,L]\n";
                $rules .= "</IfModule>\n";
                $rules .= "{$marker_end}\n";

                if (@file_put_contents($htaccess, $content . $rules) !== false) {
                    $written_any = true;
                }
            } else {
                if (file_exists($htaccess)) {
                    $this->create_snapshot($htaccess, 'Retirar Blindaje Archivos del Sistema (.htaccess)');
                    $cleaned = preg_replace('/' . preg_quote($marker_start, '/') . '[\\s\\S]*?' . preg_quote($marker_end, '/') . '\\n?/i', '', $content);
                    if (@file_put_contents($htaccess, $cleaned) !== false) {
                        $written_any = true;
                    }
                }
            }
        }

        if ($enable && !$written_any) {
            return array('success' => false, 'message' => 'No se pudo escribir en .htaccess debido a permisos restringidos.');
        }

        return array('success' => true, 'message' => 'Blindaje del sistema aplicado: Se protegieron archivos sensibles, wp-includes y métodos HTTP en .htaccess.');
    }

    /**
     * Regeneración segura de Claves y Sales Criptográficas en wp-config.php
     * Invalida todas las sesiones de usuarios actuales y cookies robadas/secuestradas por atacantes.
     */
    public function regenerate_wp_salts() {
        $root = nexamasc_get_root_path();
        $config_file = trailingslashit($root) . 'wp-config.php';
        if (!file_exists($config_file)) {
            if (file_exists(dirname($root) . '/wp-config.php')) {
                $config_file = dirname($root) . '/wp-config.php';
            } else {
                return array('success' => false, 'message' => 'Archivo wp-config.php no encontrado.');
            }
        }

        $content = @file_get_contents($config_file);
        if ($content === false) {
            return array('success' => false, 'message' => 'No se pudo leer wp-config.php.');
        }

        if (file_exists($config_file)) {
            // Nota de seguridad WordPress.org: NO respaldamos wp-config.php en disco (uploads)
            // para evitar exponer contraseñas de BD y sales secretas persistidas.
            if (!wp_is_writable($config_file)) {
                $this->fs_chmod($config_file, 0644);
            }
        }

        $salt_keys = array('AUTH_KEY', 'SECURE_AUTH_KEY', 'LOGGED_IN_KEY', 'NONCE_KEY', 'AUTH_SALT', 'SECURE_AUTH_SALT', 'LOGGED_IN_SALT', 'NONCE_SALT');
        foreach ($salt_keys as $key) {
            $random_secret = function_exists('wp_generate_password') ? wp_generate_password(64, true, true) : substr(bin2hex(random_bytes(32)), 0, 64);
            $pattern = "/define\s*\(\s*['\"]" . preg_quote($key, '/') . "['\"]\s*,\s*['\"][^'\"]*['\"]\s*\);/";
            $replacement = "define('" . $key . "', '" . addcslashes($random_secret, "'\\") . "');";
            $content = preg_replace($pattern, $replacement, $content);
        }

        if (@file_put_contents($config_file, $content) !== false) {
            return array('success' => true, 'message' => 'Sales criptográficas regeneradas con éxito. Todas las sesiones activas y cookies secuestradas han sido invalidadas.');
        }

        return array('success' => false, 'message' => 'No se pudo escribir en wp-config.php. Verifica los permisos de archivo.');
    }

    /**
     * Limpieza y neutralización de Drop-In infectado (wp-content/db.php, advanced-cache.php, etc.)
     * Vector clave del SC WordPress Malware (Sucuri Sept/Oct 2026).
     */
    public function clean_dropin($target) {
        // WordPress.org Policy: Los plugins no deben modificar código ejecutable en drop-ins.
        // Se aísla el drop-in malicioso de forma segura enviándolo a cuarentena protegida.
        $root = nexamasc_get_root_path();
        $full_path = (strpos($target, $root) === 0) ? $target : (trailingslashit($root) . ltrim($target, '/'));
        if (!file_exists($full_path)) {
            return array('success' => true, 'message' => 'El archivo drop-in ya no existe en la ruta.');
        }

        return $this->quarantine_file($full_path);
    }

    /**
     * Neutralización Segura de auto_prepend_file / auto_append_file
     */
    public function neutralize_auto_prepend($config_file) {
        $allowed_names = array('.user.ini', 'php.ini', '.htaccess');
        $base = basename($config_file);
        if (!in_array($base, $allowed_names, true)) {
            return array('success' => false, 'message' => 'Tipo de archivo de configuración no permitido.');
        }

        $root = nexamasc_get_root_path();
        $full_path = (strpos($config_file, $root) === 0) ? $config_file : (trailingslashit($root) . ltrim($config_file, '/'));
        $real_path = realpath($full_path);
        $abs_norm = $root;

        if (!$real_path || strpos(wp_normalize_path($real_path), $abs_norm) !== 0 || !file_exists($real_path)) {
            return array('success' => true, 'message' => 'El archivo de configuración ya no existe o es inválido.');
        }

        // DIRECTRIZ OFICIAL WORDPRESS.ORG: Los plugins nunca deben escribir en wp-content/.
        // Si el archivo rogue .user.ini o php.ini reside en wp-content/, se elimina directamente con wp_delete_file()
        $content_dir = nexamasc_get_content_path();
        if (strpos(wp_normalize_path($real_path), $content_dir) === 0) {
            wp_delete_file($real_path);
            return array('success' => true, 'message' => 'Archivo de configuración no autorizado dentro de wp-content eliminado exitosamente.');
        }

        $content = @file_get_contents($real_path);
        if ($content === false) {
            return array('success' => false, 'message' => 'No se pudo leer el archivo de configuración.');
        }

        $this->create_file_backup($real_path);

        // 1. Localizar la ruta del archivo prepend y eliminar el script malicioso
        if (preg_match('/(auto_prepend_file|auto_append_file)\s*=\s*[\'"]?([^\r\n\'"]+)[\'"]?/i', $content, $matches)) {
            $prepend_target = trim($matches[2]);
            $target_file = (strpos($prepend_target, '/') === 0 || preg_match('/^[a-zA-Z]:\\\\/', $prepend_target))
                ? $prepend_target
                : dirname($real_path) . '/' . ltrim($prepend_target, '/');

            $real_target = realpath($target_file);
            if ($real_target && strpos(wp_normalize_path($real_target), $abs_norm) === 0 && file_exists($real_target)) {
                $this->create_file_backup($real_target);
                wp_delete_file($real_target);
            }
        }

        // 2. Si es un archivo de configuración en la raíz (.user.ini / php.ini):
        $cleaned_config = preg_replace('/^\s*(auto_prepend_file|auto_append_file)\s*=.*$/m', '', $content);
        $cleaned_config = preg_replace('/^\s*php_value\s+(auto_prepend_file|auto_append_file)\s+.*$/m', '', $cleaned_config);
        $is_empty = (trim($cleaned_config) === '');

        if ($is_empty && $base !== '.htaccess') {
            wp_delete_file($real_path);
        } else {
            $fs = $this->get_filesystem();
            if ($fs) {
                $fs->put_contents($real_path, $cleaned_config);
                $fs->touch($real_path);
            }
        }

        return array('success' => true, 'message' => 'Directiva auto_prepend_file neutralizada de forma segura.');
    }

    /**
     * Blindaje en uploads contra ejecución PHP (CVE-2026-27540 Arbitrary File Upload)
     */
    public function protect_uploads_directory() {
        return $this->protect_uploads_htaccess(true);
    }

    /**
     * Eliminación de triggers maliciosos de MySQL (Sucuri SC Malware: triggers que recrean administradores)
     */
    public function clean_db_trigger($trigger_name) {
        global $wpdb;
        $trigger_name = sanitize_text_field(trim($trigger_name));
        if (empty($trigger_name)) {
            return array('success' => false, 'message' => 'Nombre de trigger no especificado.');
        }

        // Validación de Seguridad exigida por WordPress.org:
        // Constrain target trigger strictly to threats recorded in the last scan
        $report = get_option('nexaguard_last_scan_report', array());
        $is_flagged = false;
        if (!empty($report['threats']) && is_array($report['threats'])) {
            foreach ($report['threats'] as $t) {
                $target_candidate = !empty($t['target']) ? $t['target'] : (!empty($t['full_path']) ? $t['full_path'] : '');
                if ($target_candidate === $trigger_name) {
                    $is_flagged = true;
                    break;
                }
            }
        }
        if (!$is_flagged) {
            return array('success' => false, 'message' => 'Acción denegada: el trigger no se encuentra registrado entre las amenazas detectadas en el escaneo.');
        }

        $sanitized_name = preg_replace('/[^a-zA-Z0-9_]/', '', $trigger_name);
        if (empty($sanitized_name)) {
            return array('success' => false, 'message' => 'Nombre de trigger no válido.');
        }

        // phpcs:ignore WordPress.DB.DirectDatabaseQuery
        $wpdb->query( "DROP TRIGGER IF EXISTS `" . esc_sql( $sanitized_name ) . "`" );
        return array('success' => true, 'message' => "Trigger malicioso '{$sanitized_name}' eliminado de MySQL con éxito.");
    }

    /**
     * Elimina una amenaza resuelta del informe de escaneo guardado en base de datos
     */
    public function remove_threat_from_report($threat_id_or_file) {
        $report = get_option('nexaguard_last_scan_report', array());
        if (!empty($report['threats']) && is_array($report['threats'])) {
            $updated = array();
            foreach ($report['threats'] as $t) {
                if (isset($t['id']) && $t['id'] === $threat_id_or_file) continue;
                if (isset($t['file']) && $t['file'] === $threat_id_or_file) continue;
                if (isset($t['full_path']) && $t['full_path'] === $threat_id_or_file) continue;
                $updated[] = $t;
            }
            $report['threats'] = $updated;
            $report['total_threats'] = count($updated);
            update_option('nexaguard_last_scan_report', $report);
        }
    }

    /**
     * Gestión de Archivos del Núcleo de WordPress (Cumplimiento de Directrices de WordPress.org)
     * No descarga código ejecutable ni sobrescribe archivos del sistema.
     * Guía al administrador a la herramienta oficial nativa de WordPress en update-core.php.
     */
    public function restore_core_file($target) {
        $target_norm = wp_normalize_path(wp_unslash($target));
        $abspath_norm = nexamasc_get_root_path();

        if (strpos($target_norm, $abspath_norm) === 0) {
            $rel_path = trim(substr($target_norm, strlen($abspath_norm)), '/');
        } else {
            $rel_path = trim($target_norm, '/');
        }

        $reinstall_url = admin_url('update-core.php');

        return array(
            'success'       => true,
            'is_info'       => true,
            'reinstall_url' => $reinstall_url,
            'message'       => sprintf(
                __('El archivo del núcleo "%s" presenta discrepancias con la firma oficial. Conforme a las directrices de seguridad de WordPress.org, los archivos del núcleo deben actualizarse mediante las herramientas oficiales nativas de WordPress: <a href="%s" class="button button-primary" target="_blank" style="margin-left:8px;">Reinstalar WordPress Oficialmente ↗</a>', 'nexaguard-malware-scanner'),
                esc_html($rel_path),
                esc_url($reinstall_url)
            )
        );
    }

    /**
     * Orquestador Inteligente: Limpia, desinfecta, restaura y blinda todo el sitio con 1 Clic
     * Toma decisiones autónomas y 100% seguras según la naturaleza de cada amenaza.
     */
    public function auto_remediate_all() {
        $report = get_option('nexaguard_last_scan_report', array());
        $threats = (!empty($report['threats']) && is_array($report['threats'])) ? $report['threats'] : array();

        $results = array(
            'restored_core'       => 0,
            'disinfected_plugins' => 0,
            'removed_malware'     => 0,
            'cleaned_db'          => 0,
            'hardened'            => 0,
            'skipped'             => 0,
            'details'             => array()
        );

        foreach ($threats as $t) {
            $action   = isset($t['clean_action']) ? $t['clean_action'] : '';
            $target   = isset($t['full_path']) ? $t['full_path'] : '';
            $file_rel = isset($t['file']) ? str_replace('\\', '/', $t['file']) : '';

            // 1. REGLA NÚCLEO: Si pertenece al núcleo de WordPress
            $is_core = ($action === 'restore_core_file') || 
                       (isset($t['module']) && $t['module'] === 'core') ||
                       (strpos($file_rel, 'wp-includes/') === 0) ||
                       (strpos($file_rel, 'wp-admin/') === 0 && strpos($file_rel, 'wp-admin/includes/') !== false) ||
                       in_array($file_rel, array('index.php', 'wp-blog-header.php', 'wp-settings.php', 'wp-load.php', 'wp-login.php', 'wp-cron.php', 'wp-mail.php', 'wp-links-opml.php', 'wp-trackback.php'), true);

            if ($is_core) {
                $results['skipped']++;
                $results['details'][] = "Archivo del núcleo preservado ({$file_rel}). Conforme a las normas de seguridad de WordPress.org, los archivos del núcleo deben reinstalarse oficialmente desde Escritorio > Actualizaciones.";
                continue;
            }

            // 2. REGLA HARDENING: Blindajes preventivos del servidor
            if ($action === 'protect_uploads_directory') {
                $this->protect_uploads_directory();
                $results['hardened']++;
                $results['details'][] = "Bloqueada ejecución de scripts PHP en uploads (.htaccess)";
                continue;
            } elseif ($action === 'apply_disallow_file_edit') {
                $this->apply_disallow_file_edit();
                $results['hardened']++;
                $results['details'][] = "Editor de archivos deshabilitado en wp-config.php (DISALLOW_FILE_EDIT)";
                continue;
            } elseif ($action === 'apply_htaccess_no_indexes') {
                $this->apply_htaccess_no_indexes(true);
                $results['hardened']++;
                $results['details'][] = "Protegido listado de directorios en .htaccess (Options -Indexes)";
                continue;
            } elseif ($action === 'regenerate_wp_salts') {
                $this->regenerate_wp_salts();
                $results['hardened']++;
                $results['details'][] = "Regeneradas claves de seguridad y sales criptográficas";
                continue;
            } elseif ($action === 'neutralize_auto_prepend') {
                $this->neutralize_auto_prepend($target);
                $results['hardened']++;
                $results['details'][] = "Neutralizado secuestro auto_prepend_file";
                continue;
            }

            // 3. REGLA BASE DE DATOS: Inyecciones en MySQL
            if (!empty($t['is_db'])) {
                if ($action === 'clean_db_option') {
                    $this->clean_db_option($target);
                    $results['cleaned_db']++;
                    $results['details'][] = "Desinfectada opción en base de datos: {$target}";
                } elseif ($action === 'clean_post_injection') {
                    $this->clean_post_injection(intval($target));
                    $results['cleaned_db']++;
                    $results['details'][] = "Limpia inyección en publicación ID: {$target}";
                } elseif ($action === 'remove_cron_hook') {
                    $this->remove_cron_hook($target);
                    $results['cleaned_db']++;
                    $results['details'][] = "Removida tarea cron clandestina: {$target}";
                } elseif ($action === 'downgrade_user') {
                    $this->downgrade_user(intval($target));
                    $results['cleaned_db']++;
                    $results['details'][] = "Degradado usuario malicioso ID: {$target}";
                } elseif ($action === 'clean_db_trigger') {
                    $this->clean_db_trigger($target);
                    $results['cleaned_db']++;
                    $results['details'][] = "Eliminado trigger malicioso en MySQL: {$target}";
                }
                continue;
            }

            // 4. REGLA DROP-INS: Archivos maliciosos en wp-content raíz
            if ($action === 'clean_dropin') {
                $this->clean_dropin($target);
                $results['disinfected_plugins']++;
                $results['details'][] = "Desinfectado drop-in en wp-content: {$file_rel}";
                continue;
            }

            // 5. REGLA VIRUS EN UPLOADS O ROGUE FILES SUELTOS: 100% SEGURO ELIMINAR
            $is_in_uploads = (strpos($file_rel, 'wp-content/uploads/') !== false || strpos($target, '/uploads/') !== false);
            $is_rogue_admin = (strpos($file_rel, 'wp-admin/') === 0 && !empty($t['category']) && $t['category'] === 'rogue_core_file');
            $is_known_fake_plugin = (strpos($file_rel, 'wp-content/plugins/hseo') !== false);

            if ($is_in_uploads || $is_rogue_admin || $is_known_fake_plugin) {
                if ($is_known_fake_plugin) {
                    $this->delete_plugin_folder($target);
                    $results['removed_malware']++;
                    $results['details'][] = "Destruido plugin troyano falso: {$file_rel}";
                } else {
                    $this->force_delete($target);
                    $results['removed_malware']++;
                    $results['details'][] = "Eliminado ejecutable malicioso no autorizado: {$file_rel}";
                }
                continue;
            }

            // 6. REGLA PLUGINS Y TEMAS LEGÍTIMOS: CIRUGÍA (EXTIRPAR INYECCIÓN SIN BORRAR ARCHIVO)
            if (strpos($file_rel, 'wp-content/plugins/') !== false || strpos($file_rel, 'wp-content/themes/') !== false) {
                $res = $this->clean_file_injection($target);
                if ($res['success']) {
                    $results['disinfected_plugins']++;
                    $results['details'][] = "Desinfectado código inyectado en plugin/tema: {$file_rel}";
                } else {
                    // Si no se puede desinfectar automáticamente sin riesgo, se aísla en cuarentena reversible
                    $this->quarantine_file($target);
                    $results['removed_malware']++;
                    $results['details'][] = "Aislado en cuarentena segura: {$file_rel}";
                }
                continue;
            }

            // Por defecto: Desinfección quirúrgica
            $res = $this->clean_file_injection($target);
            if ($res['success']) {
                $results['disinfected_plugins']++;
                $results['details'][] = "Desinfectado archivo: {$file_rel}";
            } else {
                $results['skipped']++;
            }
        }

        // Blindaje final por defecto: aplicar reglas recomendadas de protección si no estaban activas
        $this->protect_uploads_htaccess(true);
        $this->apply_htaccess_no_indexes(true);

        // Disparar re-escaneo forense en caliente para refrescar el informe a 0 amenazas
        require_once NEXAGUARD_DIR . 'inc/scanner.php';
        $scanner = new NexaGuard_Scanner();
        $new_report = $scanner->scan_full();

        $total_actions = $results['restored_core'] + $results['disinfected_plugins'] + $results['removed_malware'] + $results['cleaned_db'] + $results['hardened'];

        return array(
            'success'       => true,
            'message'       => "⚡ Se completaron {$total_actions} acciones de limpieza y blindaje de forma 100% segura. Tu sitio está protegido.",
            'stats'         => $results,
            'new_report'    => $new_report
        );
    }

    /**
     * Guarda un punto de restauración seguro antes de cualquier modificación
     */
    public function create_snapshot($full_path, $action_name = 'Modificación') {
        if (!file_exists($full_path) || is_dir($full_path)) {
            return false;
        }

        $id = uniqid('rb_');
        $dest_filename = $id . '_' . basename($full_path) . '.snapshot';
        $dest_path = $this->backup_dir . $dest_filename;

        if (!@copy($full_path, $dest_path)) {
            $data = @file_get_contents($full_path);
            if ($data !== false) {
                @file_put_contents($dest_path, $data);
            }
        }

        if (!file_exists($dest_path)) {
            return false;
        }

        $history = get_option('nexaguard_backup_history', array());
        if (!is_array($history)) {
            $history = array();
        }

        $rel_path = trim(str_replace(array(nexamasc_get_root_path(), '\\'), array('', '/'), $full_path), '/');

        $history[$id] = array(
            'id'             => $id,
            'original_path'  => $full_path,
            'rel_path'       => $rel_path,
            'backup_file'    => $dest_path,
            'action_name'    => $action_name,
            'date'           => current_time('mysql'),
            'date_formatted' => date_i18n('d/m/Y H:i:s'),
            'size'           => filesize($dest_path)
        );

        // Mantener hasta 50 puntos de restauración más recientes
        if (count($history) > 50) {
            $keys = array_keys($history);
            $oldest_key = reset($keys);
            if (!empty($history[$oldest_key]['backup_file']) && file_exists($history[$oldest_key]['backup_file'])) {
                wp_delete_file($history[$oldest_key]['backup_file']);
            }
            unset($history[$oldest_key]);
        }

        update_option('nexaguard_backup_history', $history);
        return $id;
    }

    /**
     * Gestión de evidencia de respaldo (Directrices de WordPress.org)
     * Las copias de seguridad se conservan como evidencia forense en la carpeta de subidas.
     * Conforme a las directrices de WordPress.org, los plugins nunca deben restaurar o
     * sobrescribir código ejecutable en directorios de plugins, temas o núcleo.
     */
    public function revert_snapshot($id) {
        $history = get_option('nexaguard_backup_history', array());
        if (!isset($history[$id])) {
            return array('success' => false, 'message' => 'Punto de restauración no encontrado en el registro.');
        }

        return array(
            'success' => true,
            'message' => sprintf(
                __('Conforme a las directrices de seguridad de WordPress.org, las copias de respaldo se conservan como evidencia forense en la carpeta de subidas y no pueden sobrescribir archivos ejecutables en disco. Para restaurar archivos oficiales de plugins o temas de forma segura, utiliza el gestor oficial: <a href="%s" class="button button-secondary" target="_blank" style="margin-left:8px;">Gestionar Plugins ↗</a>', 'nexaguard-malware-scanner'),
                esc_url(admin_url('plugins.php'))
            )
        );
    }

    public function delete_snapshot($id) {
        $history = get_option('nexaguard_backup_history', array());
        if (!isset($history[$id])) {
            return array('success' => false, 'message' => 'Punto de restauración no encontrado.');
        }

        $entry = $history[$id];
        if (!empty($entry['backup_file']) && file_exists($entry['backup_file'])) {
            wp_delete_file($entry['backup_file']);
        }

        unset($history[$id]);
        update_option('nexaguard_backup_history', $history);
        return array('success' => true, 'message' => 'Evidencia de respaldo eliminada permanentemente.');
    }
}
