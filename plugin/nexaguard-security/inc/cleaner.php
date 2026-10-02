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

        if (!is_writable($full_path)) {
            return array('success' => false, 'message' => 'Permisos insuficientes para aislar el archivo. Verifica permisos en el servidor.');
        }

        $id = uniqid('q_');
        $dest_filename = $id . '_' . basename($full_path) . '.isolated';
        $dest_path = $this->quarantine_dir . $dest_filename;

        // Copiar y luego eliminar original
        if (!@copy($full_path, $dest_path)) {
            return array('success' => false, 'message' => 'No se pudo mover el archivo a la carpeta de cuarentena.');
        }

        @unlink($full_path);

        // Guardar registro en opciones
        $log = get_option('nexaguard_quarantine_log', array());
        $log[$id] = array(
            'original_path' => $full_path,
            'quarantine_file' => $dest_path,
            'date' => current_time('mysql'),
            'size' => filesize($dest_path)
        );
        update_option('nexaguard_quarantine_log', $log);

        return array('success' => true, 'message' => 'Archivo puesto en cuarentena segura con éxito.');
    }

    public function clean($type, $target) {
        if ($type === 'sanitize_injection' || $type === 'clearfake') {
            return $this->clean_file_injection($target);
        } elseif ($type === 'clean_db_option') {
            return $this->clean_db_option($target);
        } elseif ($type === 'quarantine') {
            return $this->quarantine_file($target);
        } elseif ($type === 'downgrade_user') {
            return $this->downgrade_user(intval($target));
        }

        return array('success' => false, 'message' => 'Acción de desinfección no reconocida.');
    }

    private function clean_file_injection($filepath) {
        $full_path = (strpos($filepath, ABSPATH) === 0) ? $filepath : (ABSPATH . ltrim($filepath, '/'));

        if (!file_exists($full_path) || !is_writable($full_path)) {
            return array('success' => false, 'message' => 'No se puede escribir en el archivo ' . esc_html($filepath));
        }

        $content = file_get_contents($full_path);
        if ($content === false) {
            return array('success' => false, 'message' => 'Error al leer el archivo.');
        }

        // Crear respaldo de seguridad antes de modificar
        @copy($full_path, $full_path . '.bak_nexaguard_' . time());

        // Limpiar inyección de script base64 ClearFake / EtherHiding
        $clean_content = preg_replace('/<script[^>]*src=["\']data:text\/javascript;base64,[A-Za-z0-9+\/]+["\'][^>]*><\/script>/i', '', $content);
        $clean_content = preg_replace('/<script[^>]*src=["\']data:text\/javascript;base64,[A-Za-z0-9+\/]+["\'][^>]*\/>/i', '', $clean_content);

        // Limpiar llamadas conocidas de RPC EtherHiding
        $clean_content = preg_replace('/load_\("0x[a-fA-F0-9]{40}"\)[^;]*;/i', '', $clean_content);

        if ($clean_content !== $content) {
            file_put_contents($full_path, $clean_content);
            return array('success' => true, 'message' => 'Inyección maliciosa erradicada con éxito. Se guardó copia de seguridad.');
        }

        return array('success' => false, 'message' => 'No se pudo limpiar automáticamente el patrón. Te recomendamos aislar el archivo o restaurarlo de un backup limpio.');
    }

    private function clean_db_option($option_name) {
        $val = get_option($option_name);
        if (!$val) {
            return array('success' => false, 'message' => 'Opción no encontrada en la base de datos.');
        }

        // Si la opción es una cadena con inyección de script, limpiarla
        if (is_string($val)) {
            $cleaned = preg_replace('/<script[^>]*data:text\/javascript;base64,[^>]*><\/script>/i', '', $val);
            if ($cleaned !== $val) {
                update_option($option_name, $cleaned);
                return array('success' => true, 'message' => 'Opción de base de datos desinfectada exitosamente.');
            }
        }

        return array('success' => false, 'message' => 'Revisa la opción manualmente en phpMyAdmin para no perder datos legítimos.');
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
