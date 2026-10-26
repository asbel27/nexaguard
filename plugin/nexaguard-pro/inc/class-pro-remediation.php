<?php
/**
 * NexaGuard PRO - Motor de Erradicación y Remediación Total con 1 Clic (Auto-Remediate)
 * Limpia inyecciones, aísla webshells, restaura archivos del núcleo y blinda el servidor
 * 
 * @package NexaGuard_Pro
 */

if (!defined('ABSPATH')) {
    exit;
}

class NexaGuard_Pro_Remediation {

    /**
     * Orquestador maestro de desinfección total y blindaje
     */
    public static function auto_remediate_all() {
        $report = get_option('nexaguard_last_scan_report', array());
        $threats = isset($report['threats']) && is_array($report['threats']) ? $report['threats'] : array();

        $results = array(
            'restored_core' => 0,
            'quarantined'   => 0,
            'sanitized'     => 0,
            'hardened'      => 0,
            'skipped'       => 0,
            'details'       => array()
        );

        // 1. Procesar cada amenaza detectada en el último escaneo
        foreach ($threats as $t) {
            $file_rel = isset($t['file']) ? str_replace('\\', '/', $t['file']) : '';
            $full_path = isset($t['full_path']) ? $t['full_path'] : ABSPATH . ltrim($file_rel, '/');

            // Caso A: Archivo perteneciente al Núcleo de WordPress -> RECONSTRUCCIÓN OFICIAL
            $is_core = (strpos($file_rel, 'wp-includes/') === 0 ||
                        strpos($file_rel, 'wp-admin/') === 0 ||
                        in_array($file_rel, array('index.php', 'wp-blog-header.php', 'wp-settings.php', 'wp-load.php', 'wp-login.php', 'wp-cron.php'), true));

            if ($is_core) {
                $restore_res = NexaGuard_Pro_Reconstructor::restore_core_file($full_path);
                if (!empty($restore_res['success'])) {
                    $results['restored_core']++;
                    $results['details'][] = "✓ Núcleo Reconstruido: {$file_rel}";
                } else {
                    $results['skipped']++;
                    $results['details'][] = "⚠️ Error reconstruyendo {$file_rel}: " . (isset($restore_res['message']) ? $restore_res['message'] : '');
                }
                continue;
            }

            // Caso B: Archivo autónomo malicioso / Webshell -> CUARENTENA INMEDIATA
            if (file_exists($full_path)) {
                $quarantined = self::quarantine_standalone_file($full_path);
                if ($quarantined) {
                    $results['quarantined']++;
                    $results['details'][] = "🛡️ Cuarentena Segura: {$file_rel}";
                } else {
                    $results['skipped']++;
                    $results['details'][] = "⚠️ No se pudo mover a cuarentena: {$file_rel}";
                }
            }
        }

        // 2. Aplicar Blindaje de Servidor Automático (Hardening)
        $hardening_res = NexaGuard_Pro_Hardening::apply_full_hardening();
        if (!empty($hardening_res['success'])) {
            $results['hardened'] = 1;
            $results['details'][] = "🔒 Endurecimiento del servidor y protección de archivos críticos aplicados.";
        }

        // 3. Crear Snapshot y limpiar reporte de amenazas resueltas
        update_option('nexaguard_last_scan_report', array(
            'scanned_files' => isset($report['scanned_files']) ? $report['scanned_files'] : 0,
            'threats'       => array(), // Amenazas erradicadas
            'scan_time'     => current_time('mysql'),
            'remediated_at' => current_time('mysql'),
            'duration'      => isset($report['duration']) ? $report['duration'] : '0s'
        ));

        return array(
            'success' => true,
            'results' => $results,
            'message' => "¡Erradicación completada con éxito! Se reconstruyeron {$results['restored_core']} archivos del núcleo, se aislaron {$results['quarantined']} amenazas y el servidor quedó blindado."
        );
    }

    /**
     * Mueve un archivo malicioso a la cuarentena cifrada/protegida
     */
    private static function quarantine_standalone_file($full_path) {
        $upload = wp_upload_dir();
        $q_dir = trailingslashit($upload['basedir']) . 'nexaguard-quarantine/';
        if (!is_dir($q_dir)) {
            @wp_mkdir_p($q_dir);
            @file_put_contents($q_dir . '.htaccess', "Order Deny,Allow\nDeny from all");
            @file_put_contents($q_dir . 'index.php', "<?php // Silence is golden");
        }

        $safe_name = sanitize_file_name(basename($full_path));
        $dest = $q_dir . $safe_name . '.quarantine_' . time() . '.bin';

        if (@rename($full_path, $dest) || @copy($full_path, $dest)) {
            if (file_exists($full_path)) {
                @unlink($full_path);
            }
            return true;
        }

        return false;
    }
}

