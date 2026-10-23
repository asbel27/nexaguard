<?php
/**
 * Plugin Name: NexaGuard – Malware Scanner & Web Security
 * Description: Deep forensic malware scanner, core integrity monitor, webshell quarantine, and hardened perimeter security defense for WordPress sites.
 * Version: 1.5.7
 * Requires at least: 5.8
 * Requires PHP: 7.4
 * Author: NexaGuard Cybersecurity Team
 * Author URI: https://nexaguards.com
 * License: GPLv2 or later
 * License URI: https://www.gnu.org/licenses/gpl-2.0.html
 * Text Domain: nexaguard-malware-scanner
 */

if (!defined('ABSPATH')) {
    exit;
}

define('NEXAGUARD_VERSION', '1.5.7');
define('NEXAGUARD_FILE', __FILE__);
define('NEXAGUARD_DIR', plugin_dir_path(__FILE__));
define('NEXAGUARD_URL', plugin_dir_url(__FILE__));

require_once NEXAGUARD_DIR . 'inc/firewall.php';
require_once NEXAGUARD_DIR . 'inc/scanner.php';
require_once NEXAGUARD_DIR . 'inc/cleaner.php';

class NexaGuard_Plugin {
    private static $instance = null;

    public static function get_instance() {
        if (self::$instance === null) {
            self::$instance = new self();
        }
        return self::$instance;
    }

    private function __construct() {
        // Inicializar Firewall antes de que carguen otros componentes
        NexaGuard_Firewall::init();

        add_action('admin_menu', array($this, 'register_admin_menu'));
        add_action('admin_enqueue_scripts', array($this, 'enqueue_admin_assets'));

        // Endpoints AJAX para el panel de administración
        add_action('wp_ajax_nexaguard_run_scan', array($this, 'ajax_run_scan'));
        add_action('wp_ajax_nexaguard_clean_threat', array($this, 'ajax_clean_threat'));
        add_action('wp_ajax_nexaguard_quarantine_file', array($this, 'ajax_quarantine_file'));
        add_action('wp_ajax_nexaguard_save_settings', array($this, 'ajax_save_settings'));
        add_action('wp_ajax_nexaguard_restore_quarantine', array($this, 'ajax_restore_quarantine'));
        add_action('wp_ajax_nexaguard_whitelist_item', array($this, 'ajax_whitelist_item'));
        add_action('wp_ajax_nexaguard_reset_scan', array($this, 'ajax_reset_scan'));
        add_action('wp_ajax_nexaguard_force_delete', array($this, 'ajax_force_delete'));
        add_action('wp_ajax_nexaguard_toggle_vigilance', array($this, 'ajax_toggle_vigilance'));
        add_action('wp_ajax_nexaguard_get_radar_logs', array('NexaGuard_Firewall', 'ajax_get_radar_logs'));
        add_action('wp_ajax_nexaguard_clear_radar_logs', array('NexaGuard_Firewall', 'ajax_clear_radar_logs'));
        add_action('wp_ajax_nexaguard_test_webhook', array('NexaGuard_Firewall', 'ajax_test_webhook'));
        add_action('wp_ajax_nexaguard_rebaseline_tripwire', array('NexaGuard_Firewall', 'ajax_rebaseline_tripwire'));
        add_action('wp_ajax_nexaguard_validate_license', array($this, 'ajax_validate_license'));
        add_action('wp_ajax_nexaguard_activate_free_license', array($this, 'ajax_activate_free_license'));
        add_action('wp_ajax_nexaguard_auto_remediate_all', array($this, 'ajax_auto_remediate_all'));
        add_action('wp_ajax_nexaguard_revert_snapshot', array($this, 'ajax_revert_snapshot'));
        add_action('wp_ajax_nexaguard_sentinel_scan', array($this, 'ajax_sentinel_scan'));
        add_action('wp_ajax_nexaguard_sentinel_harden', array($this, 'ajax_sentinel_harden'));
        add_action('wp_ajax_nexaguard_sentinel_restore_file', array($this, 'ajax_sentinel_restore_file'));
        add_action('wp_ajax_nexaguard_sentinel_rebuild_all_vital', array($this, 'ajax_sentinel_rebuild_all_vital'));
        add_action('nexaguard_daily_vigilance_scan', array($this, 'run_background_vigilance_scan'));

        // Aviso en el pie de página de administración
        add_filter('admin_footer_text', array($this, 'admin_footer_text'));

        // Autoprotección activa: Verificación de Integridad del Núcleo NexaGuard (Self-Defense Anti-Tampering)
        add_action('admin_notices', array($this, 'check_plugin_integrity_notice'));

        // Sincronización periódica de estado de licencia con NexaGuard Threat Cloud
        add_action('admin_init', array($this, 'maybe_sync_license'));
        add_action('admin_notices', array($this, 'check_license_revocation_notice'));
    }

    /**
     * Autoprotección criptográfica: Comprueba que ningún hacker haya alterado
     * o saboteado los archivos del núcleo del plugin NexaGuard Security.
     */
    public function verify_core_integrity() {
        $manifest_file = NEXAGUARD_DIR . 'integrity.json';
        if (!file_exists($manifest_file)) {
            return array('tampered' => false, 'status' => 'verified');
        }

        $manifest_raw = file_get_contents($manifest_file);
        $manifest = json_decode($manifest_raw, true);
        if (!is_array($manifest)) {
            return array('tampered' => false, 'status' => 'verified');
        }

        $tampered_files = array();
        foreach ($manifest as $rel_file => $expected_hash) {
            $abs_path = NEXAGUARD_DIR . $rel_file;
            if (!file_exists($abs_path)) {
                $tampered_files[] = $rel_file . ' (eliminado)';
                continue;
            }
            $current_hash = hash_file('sha256', $abs_path);
            if ($current_hash !== $expected_hash) {
                $tampered_files[] = $rel_file . ' (código modificado)';
            }
        }

        return array(
            'tampered' => !empty($tampered_files),
            'files'    => $tampered_files,
            'status'   => empty($tampered_files) ? 'verified' : 'tampered'
        );
    }

    public function check_plugin_integrity_notice() {
        $screen = get_current_screen();
        if (!$screen || strpos($screen->id, 'nexaguard') === false) {
            return;
        }

        $check = $this->verify_core_integrity();
        if ($check['tampered']) {
            echo '<div class="notice notice-error" style="background:#2a1226 !important; border-left-color:#ff4560 !important; color:#ffffff !important; padding:14px 18px; margin:20px 0;">';
            echo '<p style="margin:0 0 6px; font-weight:800; font-size:1.05rem; color:#ff8ba0;">🚨 ALERTA DE AUTOPROTECCIÓN: SABOTAJE O ALTERACIÓN DETECTADA EN NEXAGUARD</p>';
            echo '<p style="margin:0; font-size:0.9rem; color:#e2eafc;">El sistema de auto-inmunidad detectó que los archivos de seguridad del plugin fueron alterados o parchados externamente (' . esc_html(implode(', ', $check['files'])) . '). Se recomienda reinstalar el plugin oficial desde <a href="https://nexaguards.com" target="_blank" style="color:#ffcf33; font-weight:700;">nexaguards.com</a> para restaurar la protección activa.</p>';
            echo '</div>';
        }
    }

    /**
     * Sincronización periódica de estado de licencia con NexaGuard Threat Cloud.
     * Si la licencia fue transferida a otro dominio o liberada en la nube,
     * el plugin revoca inmediatamente el estado PRO en este sitio para evitar licencias duplicadas.
     */
    public function maybe_sync_license() {
        if (!is_admin() || !current_user_can('manage_options')) {
            return;
        }

        $license = get_option('nexaguard_license_data', null);
        if (empty($license) || empty($license['valid']) || empty($license['key'])) {
            return;
        }

        // Si estamos dentro del panel de NexaGuard, sincronizar cada 5 minutos; en el resto de WordPress, cada 12 horas
        $is_nexaguard_page = (isset($_GET['page']) && strpos(sanitize_text_field($_GET['page']), 'nexaguard') !== false);
        $sync_lock_key = $is_nexaguard_page ? 'nexaguard_lic_sync_quick' : 'nexaguard_license_sync_lock';
        if (get_transient($sync_lock_key)) {
            return;
        }

        $raw_host = wp_parse_url(home_url(), PHP_URL_HOST);
        if (!$raw_host && !empty($_SERVER['HTTP_HOST'])) {
            $raw_host = sanitize_text_field($_SERVER['HTTP_HOST']);
        }
        $site_domain = strtolower(preg_replace('/^www\./i', '', trim(explode(':', (string)$raw_host)[0])));

        // Bloqueo temporal para no saturar con peticiones en cada recarga
        set_transient($sync_lock_key, 1, $is_nexaguard_page ? 300 : 12 * HOUR_IN_SECONDS);

        $response = wp_remote_post('https://www.nexaguards.com/api/license/validate', array(
            'timeout'   => 12,
            'sslverify' => true,
            'headers'   => array('Content-Type' => 'application/json'),
            'body'      => wp_json_encode(array(
                'key'    => $license['key'],
                'domain' => $site_domain
            ))
        ));

        if (!is_wp_error($response)) {
            $code = wp_remote_retrieve_response_code($response);
            $body = wp_remote_retrieve_body($response);
            $data = json_decode($body, true);

            if ($code === 200 && !empty($data) && !empty($data['valid'])) {
                $data['key'] = $license['key'];
                update_option('nexaguard_license_data', $data);
            } elseif ($code === 403 || $code === 404) {
                // La licencia ya no pertenece a este dominio o fue liberada en la nube
                delete_option('nexaguard_license_data');
                delete_transient('nexaguard_license_sync_lock');
                $msg = (!empty($data) && !empty($data['message'])) ? $data['message'] : 'Tu licencia NexaGuard PRO ha sido desvinculada o transferida a otro dominio en la nube.';
                set_transient('nexaguard_license_revoked_notice', $msg, 120);
            }
        }
    }

    public function check_license_revocation_notice() {
        $msg = get_transient('nexaguard_license_revoked_notice');
        if ($msg) {
            delete_transient('nexaguard_license_revoked_notice');
            echo '<div class="notice notice-warning is-dismissible" style="background:#201910 !important; border-left-color:#ffaa00 !important; color:#ffffff !important; padding:14px 18px; margin:20px 0;">';
            echo '<p style="margin:0 0 6px; font-weight:800; font-size:1.05rem; color:#ffaa00;">⚠️ NEXAGUARD SECURITY: LICENCIA DESVINCULADA EN LA NUBE</p>';
            echo '<p style="margin:0; font-size:0.9rem; color:#e2eafc;">' . esc_html($msg) . '</p>';
            echo '</div>';
        }
    }

    public function register_admin_menu() {
        $icon = 'data:image/svg+xml;base64,' . base64_encode(
            '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="#ffcf33"><path d="M12 1L3 5v6c0 5.55 3.84 10.74 9 12 5.16-1.26 9-6.45 9-12V5l-9-4zm0 10.99h7c-.53 4.12-3.28 7.79-7 8.94V12H5V6.3l7-3.11v8.8z"/></svg>'
        );

        add_menu_page(
            'NexaGuard Security',
            'NexaGuard',
            'manage_options',
            'nexaguard-security',
            array($this, 'render_admin_page'),
            $icon,
            75
        );

        add_submenu_page(
            'nexaguard-security',
            'Escáner Forense',
            'Escáner Forense',
            'manage_options',
            'nexaguard-security',
            array($this, 'render_admin_page')
        );

        add_submenu_page(
            'nexaguard-security',
            'Blindaje & WAF',
            'Blindaje & WAF',
            'manage_options',
            'nexaguard-waf',
            array($this, 'render_waf_page')
        );
    }

    public function enqueue_admin_assets($hook) {
        if (strpos($hook, 'nexaguard') === false) {
            return;
        }

        if (function_exists('wp_enqueue_media')) {
            wp_enqueue_media();
        }

        $css_ver = file_exists(NEXAGUARD_DIR . 'assets/admin.css') ? filemtime(NEXAGUARD_DIR . 'assets/admin.css') : NEXAGUARD_VERSION;
        $js_ver  = file_exists(NEXAGUARD_DIR . 'assets/admin.js') ? filemtime(NEXAGUARD_DIR . 'assets/admin.js') : NEXAGUARD_VERSION;
        $map_ver = file_exists(NEXAGUARD_DIR . 'assets/threat-map.js') ? filemtime(NEXAGUARD_DIR . 'assets/threat-map.js') : NEXAGUARD_VERSION;

        wp_enqueue_style(
            'nexaguard-admin-css',
            NEXAGUARD_URL . 'assets/admin.css',
            array(),
            $css_ver
        );

        wp_enqueue_script(
            'nexaguard-threat-map-js',
            NEXAGUARD_URL . 'assets/threat-map.js',
            array(),
            $map_ver,
            true
        );

        wp_enqueue_script(
            'nexaguard-admin-js',
            NEXAGUARD_URL . 'assets/admin.js',
            array('jquery', 'nexaguard-threat-map-js'),
            $js_ver,
            true
        );

        $is_pro = $this->is_pro_active() ? 1 : 0;
        wp_localize_script('nexaguard-admin-js', 'nexaguardData', array(
            'ajax_url' => admin_url('admin-ajax.php'),
            'nonce'    => wp_create_nonce('nexaguard_security_nonce'),
            'site_url' => site_url(),
            'is_pro'   => $is_pro
        ));
    }

    public function is_pro_active() {
        $license = get_option('nexaguard_license_data', null);
        if (empty($license) || empty($license['valid']) || empty($license['key'])) {
            return false;
        }
        if (!empty($license['plan_type']) && $license['plan_type'] === 'free') {
            return false;
        }
        if (!empty($license['plan']) && (
            stripos($license['plan'], 'gratuit') !== false ||
            stripos($license['plan'], 'community') !== false ||
            stripos($license['plan'], 'comunitaria') !== false ||
            stripos($license['plan'], 'free') !== false
        )) {
            return false;
        }
        if (strpos($license['key'], 'NEXA-FREE-') === 0 || strpos($license['key'], 'NXG-FREE-') === 0 || strpos($license['key'], 'FREE-') === 0) {
            return false;
        }
        $days_left = isset($license['days_left']) ? intval($license['days_left']) : 0;
        if ((isset($license['status']) && $license['status'] === 'expired') || $days_left <= 0) {
            return false;
        }
        return (isset($license['status']) && ($license['status'] === 'active' || $license['status'] === 'expiring_soon'));
    }

    public function render_admin_page() {
        include NEXAGUARD_DIR . 'inc/view-scanner.php';
    }

    public function render_waf_page() {
        // Redirigir a la pestaña WAF/Hardening dentro de la interfaz principal
        wp_safe_redirect(admin_url('admin.php?page=nexaguard-security&tab=waf'));
        exit;
    }

    public function ajax_run_scan() {
        check_ajax_referer('nexaguard_security_nonce', 'nonce');
        if (!current_user_can('manage_options')) {
            wp_send_json_error(array('message' => 'Permisos insuficientes.'));
        }

        $scanner = new NexaGuard_Scanner();
        $results = $scanner->scan_full();

        wp_send_json_success($results);
    }

    public function ajax_clean_threat() {
        check_ajax_referer('nexaguard_security_nonce', 'nonce');
        if (!current_user_can('manage_options')) {
            wp_send_json_error(array('message' => 'Permisos insuficientes.'));
        }

        $type = isset($_POST['threat_type']) ? sanitize_text_field($_POST['threat_type']) : '';
        $target = isset($_POST['target']) ? sanitize_text_field($_POST['target']) : '';

        $cleaner = new NexaGuard_Cleaner();
        $result = $cleaner->clean($type, $target);

        if ($result['success']) {
            wp_send_json_success($result);
        } else {
            wp_send_json_error($result);
        }
    }

    public function ajax_auto_remediate_all() {
        check_ajax_referer('nexaguard_security_nonce', 'nonce');
        if (!current_user_can('manage_options')) {
            wp_send_json_error(array('message' => 'Permisos insuficientes.'));
        }

        $cleaner = new NexaGuard_Cleaner();
        $result = $cleaner->auto_remediate_all();

        if ($result['success']) {
            wp_send_json_success($result);
        } else {
            wp_send_json_error($result);
        }
    }

    public function ajax_revert_snapshot() {
        check_ajax_referer('nexaguard_security_nonce', 'nonce');
        if (!current_user_can('manage_options')) {
            wp_send_json_error(array('message' => 'Permisos insuficientes.'));
        }

        $id = isset($_POST['snapshot_id']) ? sanitize_text_field($_POST['snapshot_id']) : '';
        $cleaner = new NexaGuard_Cleaner();
        $result = $cleaner->revert_snapshot($id);

        if ($result['success']) {
            wp_send_json_success($result);
        } else {
            wp_send_json_error($result);
        }
    }

    public function ajax_quarantine_file() {
        check_ajax_referer('nexaguard_security_nonce', 'nonce');
        if (!current_user_can('manage_options')) {
            wp_send_json_error(array('message' => 'Permisos insuficientes.'));
        }

        $file = isset($_POST['file']) ? sanitize_text_field($_POST['file']) : '';
        $cleaner = new NexaGuard_Cleaner();
        $result = $cleaner->quarantine_file($file);

        if ($result['success']) {
            wp_send_json_success($result);
        } else {
            wp_send_json_error($result);
        }
    }

    public function ajax_save_settings() {
        check_ajax_referer('nexaguard_security_nonce', 'nonce');
        if (!current_user_can('manage_options')) {
            wp_send_json_error(array('message' => 'Permisos insuficientes.'));
        }

        $is_pro = NexaGuard_Firewall::is_pro();

        $settings = array(
            // Reglas Básicas (100% operativas en Edición Estándar)
            'block_php_uploads'     => !empty($_POST['block_php_uploads']),
            'disable_dir_browsing'  => !empty($_POST['disable_dir_browsing']),
            'disallow_file_edit'    => !empty($_POST['disallow_file_edit']),
            'block_user_enumeration'=> !empty($_POST['block_user_enumeration']),
            // Módulos Avanzados PRO (disponibles exclusivamente con licencia activa)
            'disable_xmlrpc'        => $is_pro ? !empty($_POST['disable_xmlrpc']) : false,
            'hide_wp_version'       => $is_pro ? !empty($_POST['hide_wp_version']) : false,
            'waf_enabled'           => $is_pro ? !empty($_POST['waf_enabled']) : false,
            'anti_clearfake'        => $is_pro ? !empty($_POST['anti_clearfake']) : false,
            'emergency_lockdown'    => $is_pro ? !empty($_POST['emergency_lockdown']) : false,
            'brute_force_protection'=> $is_pro ? !empty($_POST['brute_force_protection']) : false,
            'bf_max_retries'        => isset($_POST['bf_max_retries']) ? max(3, min(20, intval($_POST['bf_max_retries']))) : 5,
            'bf_lockout_time'       => isset($_POST['bf_lockout_time']) ? max(5, min(1440, intval($_POST['bf_lockout_time']))) : 20,
            'hide_backend'          => $is_pro ? !empty($_POST['hide_backend']) : false,
            'login_slug'            => !empty($_POST['login_slug']) ? sanitize_title(trim($_POST['login_slug'])) : 'acceso-seguro',
            'generic_login_errors'  => $is_pro ? !empty($_POST['generic_login_errors']) : false,
            'protect_system_files'  => $is_pro ? !empty($_POST['protect_system_files']) : false,
            'admin_login_alerts'    => $is_pro ? !empty($_POST['admin_login_alerts']) : false,
            'threat_email_alerts'   => $is_pro ? !empty($_POST['threat_email_alerts']) : false,
            'alert_email'           => !empty($_POST['alert_email']) ? sanitize_email($_POST['alert_email']) : '',
            'waf_auto_jail'         => $is_pro ? !empty($_POST['waf_auto_jail']) : false,
            'tripwire_enabled'      => $is_pro ? !empty($_POST['tripwire_enabled']) : false,
            'threat_webhook_url'    => !empty($_POST['threat_webhook_url']) ? esc_url_raw(trim($_POST['threat_webhook_url'])) : '',
            'login_custom_design'   => $is_pro ? !empty($_POST['login_custom_design']) : false,
            'login_bg_image'        => isset($_POST['login_bg_image']) ? esc_url_raw(trim($_POST['login_bg_image'])) : '',
            'login_bg_preset'       => isset($_POST['login_bg_preset']) ? sanitize_key($_POST['login_bg_preset']) : 'deep-navy',
            'login_logo_image'      => isset($_POST['login_logo_image']) ? esc_url_raw(trim($_POST['login_logo_image'])) : '',
            'login_security_notice' => isset($_POST['login_security_notice']) ? sanitize_text_field(trim($_POST['login_security_notice'])) : 'Estás iniciando sesión en tu WordPress protegido por NexaGuard',
            'cloud_threat_intel'    => !empty($_POST['cloud_threat_intel'])
        );

        update_option('nexaguard_settings', $settings);

        $cleaner = new NexaGuard_Cleaner();

        // 1. Bloqueo de ejecución PHP en uploads
        if ($settings['block_php_uploads']) {
            $cleaner->protect_uploads_htaccess(true);
        } else {
            $cleaner->protect_uploads_htaccess(false);
        }

        // 2. Prevenir listado de directorios en .htaccess
        if ($settings['disable_dir_browsing']) {
            $cleaner->apply_htaccess_no_indexes(true);
        } else {
            $cleaner->apply_htaccess_no_indexes(false);
        }

        // 3. Deshabilitar editor de temas en wp-config.php si está marcado
        if ($settings['disallow_file_edit']) {
            $cleaner->apply_disallow_file_edit();
        }

        // 4. Blindaje de archivos sensibles del sistema y wp-includes
        if ($settings['protect_system_files']) {
            $cleaner->protect_system_files(true);
        } else {
            $cleaner->protect_system_files(false);
        }

        wp_send_json_success(array('message' => 'Configuración de seguridad y blindaje guardada con éxito.'));
    }

    public function ajax_restore_quarantine() {
        check_ajax_referer('nexaguard_security_nonce', 'nonce');
        if (!current_user_can('manage_options')) {
            wp_send_json_error(array('message' => 'Permisos insuficientes.'));
        }

        $id = isset($_POST['quarantine_id']) ? sanitize_text_field($_POST['quarantine_id']) : '';
        $cleaner = new NexaGuard_Cleaner();
        $result = $cleaner->restore_file($id);

        if ($result['success']) {
            wp_send_json_success($result);
        } else {
            wp_send_json_error($result);
        }
    }

    public function ajax_whitelist_item() {
        check_ajax_referer('nexaguard_security_nonce', 'nonce');
        if (!current_user_can('manage_options')) {
            wp_send_json_error(array('message' => 'Permisos insuficientes.'));
        }

        $target = isset($_POST['target']) ? sanitize_text_field($_POST['target']) : '';
        $cleaner = new NexaGuard_Cleaner();
        $result = $cleaner->whitelist_item($target);

        wp_send_json_success($result);
    }

    public function ajax_reset_scan() {
        check_ajax_referer('nexaguard_security_nonce', 'nonce');
        if (!current_user_can('manage_options')) {
            wp_send_json_error(array('message' => 'Permisos insuficientes.'));
        }

        delete_option('nexaguard_last_scan_report');
        delete_option('nexaguard_cloud_intel_cache');
        wp_send_json_success(array('message' => 'Historial de análisis y caché reseteados. Listo para análisis en vivo.'));
    }

    public function ajax_force_delete() {
        check_ajax_referer('nexaguard_security_nonce', 'nonce');
        if (!current_user_can('manage_options')) {
            wp_send_json_error(array('message' => 'Permisos insuficientes.'));
        }


        $target = isset($_POST['target']) ? sanitize_text_field($_POST['target']) : '';
        $mode = isset($_POST['mode']) ? sanitize_text_field($_POST['mode']) : 'file';

        $cleaner = new NexaGuard_Cleaner();
        if ($mode === 'plugin_folder') {
            $result = $cleaner->delete_plugin_folder($target);
        } else {
            $result = $cleaner->force_delete($target);
        }

        if ($result['success']) {
            wp_send_json_success($result);
        } else {
            wp_send_json_error($result);
        }
    }

    public function ajax_toggle_vigilance() {
        check_ajax_referer('nexaguard_security_nonce', 'nonce');
        if (!current_user_can('manage_options')) {
            wp_send_json_error(array('message' => 'Permisos insuficientes.'));
        }

        $active = !empty($_POST['active']) ? 1 : 0;
        update_option('nexaguard_vigilance_active', $active);

        // Programar o desprogramar WP-Cron de auditoría diaria automática
        if ($active) {
            if (!wp_next_scheduled('nexaguard_daily_vigilance_scan')) {
                wp_schedule_event(time(), 'daily', 'nexaguard_daily_vigilance_scan');
            }
        } else {
            wp_clear_scheduled_hook('nexaguard_daily_vigilance_scan');
        }

        $is_pro = $this->is_pro_active();
        wp_send_json_success(array(
            'active'  => $active,
            'is_pro'  => $is_pro,
            'message' => $active
                ? ($is_pro ? 'Vigilancia continua 24H y Radar Cloud perimetral activados.' : 'Vigilancia programada diaria activa en tu servidor (WP-Cron).')
                : 'Sistema de vigilancia en pausa.'
        ));
    }

    /**
     * Ejecuta una auditoría forense automática en segundo plano (WP-Cron diario)
     */
    public function run_background_vigilance_scan() {
        if (!get_option('nexaguard_vigilance_active', 0)) {
            return;
        }
        $scanner = new NexaGuard_Scanner();
        $report = $scanner->run_scan();
        update_option('nexaguard_last_scan_report', $report);
    }

    public function ajax_validate_license() {
        if (!check_ajax_referer('nexaguard_security_nonce', 'nonce', false) && !check_ajax_referer('nexaguard_admin_nonce', 'nonce', false)) {
            wp_send_json_error(array('message' => 'Sesión o token de seguridad expirado. Por favor recarga la página e intenta de nuevo.'));
            return;
        }
        if (!current_user_can('manage_options')) {
            wp_send_json_error(array('message' => 'Permisos insuficientes.'));
            return;
        }

        $license_key = isset($_POST['license_key']) ? sanitize_text_field(trim($_POST['license_key'])) : '';
        
        // Obtener dominio limpio del sitio actual (sin protocolo, sin puerto y sin www.)
        $raw_host = wp_parse_url(home_url(), PHP_URL_HOST);
        if (!$raw_host && !empty($_SERVER['HTTP_HOST'])) {
            $raw_host = sanitize_text_field($_SERVER['HTTP_HOST']);
        }
        $site_domain = strtolower(preg_replace('/^www\./i', '', trim(explode(':', (string)$raw_host)[0])));

        if (strpos($license_key, 'NEXA-FREE-') === 0 || strpos($license_key, 'NXG-FREE-') === 0 || strpos($license_key, 'FREE-') === 0) {
            $data = array(
                'valid'             => true,
                'status'            => 'active',
                'plan_type'         => 'free',
                'plan'              => 'Plan Gratuito (Community)',
                'key'               => $license_key,
                'domain'            => $site_domain,
                'expires_at'        => null,
                'expires_formatted' => 'Sin Vencimiento (Comunidad)',
                'days_left'         => 99999,
                'notice'            => 'Licencia Comunitaria Gratuita activa en ' . $site_domain . '.',
                'message'           => '¡Licencia Comunitaria Gratuita verificada y guardada con éxito!'
            );
            update_option('nexaguard_license_data', $data);
            delete_transient('nexaguard_license_sync_lock');
            delete_transient('nexaguard_license_revoked_notice');
            wp_send_json_success($data);
            return;
        }

        if (empty($license_key)) {
            $prev_data = get_option('nexaguard_license_data', array());
            $prev_key = !empty($prev_data['key']) ? $prev_data['key'] : '';

            // 1. Borrar de inmediato en la base de datos local de WordPress (garantía instantánea)
            delete_option('nexaguard_license_data');
            delete_transient('nexaguard_license_sync_lock');
            delete_transient('nexaguard_license_revoked_notice');

            // Pausar módulos PRO del WAF y restablecer sólo las 4 reglas básicas
            $reset_settings = wp_parse_args(get_option('nexaguard_settings', array()), array());
            $reset_settings['waf_enabled']            = false;
            $reset_settings['anti_clearfake']         = false;
            $reset_settings['brute_force_protection'] = false;
            $reset_settings['waf_auto_jail']          = false;
            $reset_settings['emergency_lockdown']     = false;
            $reset_settings['hide_backend']           = false;
            $reset_settings['tripwire_enabled']       = false;
            $reset_settings['admin_login_alerts']     = false;
            $reset_settings['login_custom_design']    = false;
            update_option('nexaguard_settings', $reset_settings);

            // 2. Notificar a la nube de NexaGuard para liberar este dominio
            if (!empty($prev_key)) {
                @wp_remote_post('https://www.nexaguards.com/api/license/deactivate', array(
                    'timeout'   => 8,
                    'sslverify' => true,
                    'headers'   => array(
                        'Content-Type' => 'application/json',
                        'Accept'       => 'application/json'
                    ),
                    'body'      => wp_json_encode(array(
                        'key'    => $prev_key,
                        'domain' => $site_domain
                    ))
                ));
            }

            wp_send_json_success(array('status' => 'inactive', 'message' => 'Licencia desvinculada exitosamente.'));
            return;
        }

        // Consultar API en https://www.nexaguards.com/api/license/validate
        $req_args = array(
            'timeout'   => 15,
            'sslverify' => true,
            'headers'   => array('Content-Type' => 'application/json'),
            'body'      => wp_json_encode(array(
                'key'    => $license_key,
                'domain' => $site_domain
            ))
        );

        $response = wp_remote_post('https://www.nexaguards.com/api/license/validate', $req_args);

        if (!is_wp_error($response)) {
            $code = wp_remote_retrieve_response_code($response);
            $body = wp_remote_retrieve_body($response);
            $data = json_decode($body, true);

            if ($code === 200 && $data && (!empty($data['valid']) || (isset($data['status']) && $data['status'] === 'expired'))) {
                $is_free = (!empty($data['plan_type']) && $data['plan_type'] === 'free') ||
                           (!empty($data['plan']) && (
                               stripos($data['plan'], 'gratuit') !== false ||
                               stripos($data['plan'], 'community') !== false ||
                               stripos($data['plan'], 'comunitaria') !== false ||
                               stripos($data['plan'], 'free') !== false
                           )) ||
                           strpos($license_key, 'NEXA-FREE-') === 0 ||
                           strpos($license_key, 'NXG-FREE-') === 0 ||
                           strpos($license_key, 'FREE-') === 0;

                if ($is_free) {
                    $data['plan_type'] = 'free';
                    $data['expires_formatted'] = 'Sin Vencimiento (Comunidad)';
                }

                $data['key'] = $license_key;
                update_option('nexaguard_license_data', $data);
                delete_transient('nexaguard_license_sync_lock');
                delete_transient('nexaguard_license_revoked_notice');

                // Si la licencia es PRO (no gratuita) y activa, activar funciones avanzadas del WAF
                if (!$is_free && !empty($data['valid']) && (!isset($data['status']) || $data['status'] === 'active' || $data['status'] === 'expiring_soon')) {
                    $pro_settings = wp_parse_args(get_option('nexaguard_settings', array()), array());
                    $pro_settings['waf_enabled']            = true;
                    $pro_settings['anti_clearfake']         = true;
                    $pro_settings['brute_force_protection'] = true;
                    $pro_settings['waf_auto_jail']          = true;
                    $pro_settings['disable_xmlrpc']         = true;
                    $pro_settings['hide_wp_version']        = true;
                    $pro_settings['protect_system_files']   = true;
                    $pro_settings['admin_login_alerts']     = true;
                    $pro_settings['tripwire_enabled']       = true;
                    update_option('nexaguard_settings', $pro_settings);

                    $cleaner = new NexaGuard_Cleaner();
                    $cleaner->protect_system_files(true);
                }

                wp_send_json_success($data);
                return;
            }

            // Si el servidor de NexaGuard rechazó la clave (403 límite alcanzado/otro dominio, 404 no existe, 400 inválida)
            $error_message = (!empty($data) && !empty($data['message']))
                ? $data['message']
                : ((!empty($data) && !empty($data['notice']))
                    ? $data['notice']
                    : 'La clave de licencia fue rechazada por NexaGuard Cloud (Código HTTP ' . $code . ').');
            delete_option('nexaguard_license_data');
            delete_transient('nexaguard_license_sync_lock');
            delete_transient('nexaguard_license_revoked_notice');

            // Pausar módulos PRO en caso de revocación
            $reset_settings = wp_parse_args(get_option('nexaguard_settings', array()), array());
            $reset_settings['waf_enabled']            = false;
            $reset_settings['anti_clearfake']         = false;
            $reset_settings['brute_force_protection'] = false;
            $reset_settings['waf_auto_jail']          = false;
            $reset_settings['emergency_lockdown']     = false;
            $reset_settings['hide_backend']           = false;
            $reset_settings['tripwire_enabled']       = false;
            $reset_settings['admin_login_alerts']     = false;
            $reset_settings['login_custom_design']    = false;
            update_option('nexaguard_settings', $reset_settings);

            wp_send_json_error(array(
                'message' => $error_message,
                'code'    => 'license_rejected'
            ));
            return;
        }

        // Si falló por error de conexión de red hacia nexaguards.com:
        $err_msg = is_wp_error($response) ? $response->get_error_message() : 'Error de socket o red';
        wp_send_json_error(array(
            'message' => 'No se pudo conectar con el servidor de licencias en nexaguards.com (' . $err_msg . '). Comprueba la conexión saliente de tu servidor.',
            'code'    => 'connection_error'
        ));
    }

    /**
     * Emisión y activación en 1 clic de Licencia Comunitaria Gratuita (estilo Wordfence)
     */
    public function ajax_activate_free_license() {
        if (!check_ajax_referer('nexaguard_security_nonce', 'nonce', false) && !check_ajax_referer('nexaguard_admin_nonce', 'nonce', false)) {
            wp_send_json_error(array('message' => 'Sesión o token de seguridad expirado. Por favor recarga la página.'));
            return;
        }
        if (!current_user_can('manage_options')) {
            wp_send_json_error(array('message' => 'Permisos insuficientes.'));
            return;
        }

        $raw_host = wp_parse_url(home_url(), PHP_URL_HOST);
        if (!$raw_host && !empty($_SERVER['HTTP_HOST'])) {
            $raw_host = sanitize_text_field($_SERVER['HTTP_HOST']);
        }
        $site_domain = strtolower(preg_replace('/^www\./i', '', trim(explode(':', (string)$raw_host)[0])));

        $admin_email = get_option('admin_email', '');
        $free_hash = strtoupper(substr(md5($site_domain . $admin_email . 'nexaguard_free_community'), 0, 8));
        $free_key = 'NEXA-FREE-' . $free_hash;

        $data = array(
            'valid'             => true,
            'status'            => 'active',
            'plan_type'         => 'free',
            'plan'              => 'Edición Comunitaria Gratuita',
            'key'               => $free_key,
            'domain'            => $site_domain,
            'expires_at'        => null,
            'expires_formatted' => 'Sin Vencimiento (Comunidad)',
            'days_left'         => 99999,
            'notice'            => 'Licencia Comunitaria Gratuita activa en ' . $site_domain . '.',
            'message'           => '¡Licencia Comunitaria Gratuita activada con éxito!'
        );

        update_option('nexaguard_license_data', $data);
        delete_transient('nexaguard_license_sync_lock');
        delete_transient('nexaguard_license_revoked_notice');

        // Notificar al servidor en segundo plano
        @wp_remote_post('https://www.nexaguards.com/api/license/free', array(
            'timeout'   => 5,
            'sslverify' => true,
            'headers'   => array('Content-Type' => 'application/json'),
            'body'      => wp_json_encode(array(
                'email'  => $admin_email,
                'domain' => $site_domain,
                'key'    => $free_key
            ))
        ));

        wp_send_json_success($data);
    }

    public function admin_footer_text($text) {
        $screen = get_current_screen();
        if ($screen && strpos($screen->id, 'nexaguard') !== false) {
            return 'Protegido con <a href="https://nexaguards.com" target="_blank" style="color:#ffcf33;font-weight:700">NexaGuard Security</a> · Ciberseguridad para WordPress.';
        }
        return $text;
    }

    /**
     * Telemetría e Inspección en Tiempo Real del Núcleo Vital (Sentinel)
     */
    public function ajax_sentinel_scan() {
        check_ajax_referer('nexaguard_security_nonce', 'nonce');
        if (!current_user_can('manage_options')) {
            wp_send_json_error(array('message' => 'Permisos insuficientes.'));
        }

        global $wp_version;
        $core_version = !empty($wp_version) ? $wp_version : get_bloginfo('version');
        $locale = get_locale();

        // Obtener checksums oficiales de WordPress.org para la versión instalada (caché de 12 horas)
        $checksums = get_transient('nexaguard_wp_core_checksums_' . $core_version);
        if ($checksums === false || empty($checksums)) {
            $api_url = "https://api.wordpress.org/core/checksums/1.0/?version={$core_version}&locale={$locale}";
            $res = wp_remote_get($api_url, array('timeout' => 8, 'sslverify' => true));
            if (!is_wp_error($res) && wp_remote_retrieve_response_code($res) === 200) {
                $body = json_decode(wp_remote_retrieve_body($res), true);
                if (!empty($body['checksums']) && is_array($body['checksums'])) {
                    $checksums = $body['checksums'];
                }
            }

            // Fallback a en_US si el locale actual no devuelve lista de checksums (habitual en versiones nuevas)
            if (empty($checksums)) {
                $api_url_en = "https://api.wordpress.org/core/checksums/1.0/?version={$core_version}&locale=en_US";
                $res_en = wp_remote_get($api_url_en, array('timeout' => 8, 'sslverify' => true));
                if (!is_wp_error($res_en) && wp_remote_retrieve_response_code($res_en) === 200) {
                    $body_en = json_decode(wp_remote_retrieve_body($res_en), true);
                    if (!empty($body_en['checksums']) && is_array($body_en['checksums'])) {
                        $checksums = $body_en['checksums'];
                    }
                }
            }

            if (!empty($checksums)) {
                set_transient('nexaguard_wp_core_checksums_' . $core_version, $checksums, 12 * HOUR_IN_SECONDS);
            }
        }

        $core_files = array(
            'wp-config.php'                  => array('name' => 'wp-config.php', 'vital' => true, 'is_custom' => true),
            '.htaccess'                      => array('name' => '.htaccess', 'vital' => true, 'is_custom' => true),
            'index.php'                      => array('name' => 'index.php', 'vital' => true, 'is_custom' => false),
            'wp-blog-header.php'             => array('name' => 'wp-blog-header.php', 'vital' => true, 'is_custom' => false),
            'wp-load.php'                    => array('name' => 'wp-load.php', 'vital' => true, 'is_custom' => false),
            'wp-settings.php'                => array('name' => 'wp-settings.php', 'vital' => true, 'is_custom' => false),
            'wp-login.php'                   => array('name' => 'wp-login.php', 'vital' => true, 'is_custom' => false),
            'wp-includes/version.php'        => array('name' => 'wp-includes/version.php', 'vital' => true, 'is_custom' => false),
            'wp-includes/pluggable.php'      => array('name' => 'wp-includes/pluggable.php', 'vital' => true, 'is_custom' => false),
            'wp-includes/class-wp-hook.php'  => array('name' => 'wp-includes/class-wp-hook.php', 'vital' => true, 'is_custom' => false),
            'wp-includes/template-loader.php'=> array('name' => 'wp-includes/template-loader.php', 'vital' => true, 'is_custom' => false),
            'wp-includes/functions.php'      => array('name' => 'wp-includes/functions.php', 'vital' => true, 'is_custom' => false),
            'wp-includes/wp-db.php'          => array('name' => 'wp-includes/wp-db.php', 'vital' => true, 'is_custom' => false),
            'wp-admin/admin.php'             => array('name' => 'wp-admin/admin.php', 'vital' => true, 'is_custom' => false),
            'wp-admin/includes/file.php'     => array('name' => 'wp-admin/includes/file.php', 'vital' => true, 'is_custom' => false),
            'wp-admin/includes/upgrade.php'  => array('name' => 'wp-admin/includes/upgrade.php', 'vital' => true, 'is_custom' => false),
            'wp-content/index.php'           => array('name' => 'wp-content/index.php', 'vital' => true, 'is_custom' => false)
        );

        $results = array();
        $clean_count = 0;
        $warnings = array();
        $anomalies = array();
        $abs_root = wp_normalize_path(ABSPATH);

        foreach ($core_files as $rel_path => $meta) {
            $full_path = $abs_root . $rel_path;
            if (!file_exists($full_path)) {
                if ($rel_path === '.htaccess' && isset($_SERVER['SERVER_SOFTWARE']) && stripos($_SERVER['SERVER_SOFTWARE'], 'nginx') !== false) {
                    continue;
                }
                $item = array(
                    'path'        => '/' . $rel_path,
                    'rel_path'    => $rel_path,
                    'exists'      => false,
                    'size'        => 0,
                    'perms'       => '0000',
                    'mtime'       => 0,
                    'hash'        => 'MISSING',
                    'status'      => 'missing',
                    'can_rebuild' => !$meta['is_custom'],
                    'verdict'     => 'Archivo vital ausente'
                );
                $results[] = $item;
                $warnings[] = "Archivo vital ausente: /$rel_path";
                $anomalies[] = $item;
                continue;
            }

            $perms = substr(sprintf('%o', fileperms($full_path)), -4);
            $size = filesize($full_path);
            $mtime = filemtime($full_path);
            $is_wp_config = ($rel_path === 'wp-config.php');

            // Seguridad: Proteger wp-config.php de fingerprinting para no filtrar hashes de claves/sales criptográficas
            $hash = $is_wp_config ? '[PROTEGIDO]' : hash_file('sha256', $full_path);

            $status = 'intact';
            $verdict = 'Firma oficial verificada · Intacto';

            if ($is_wp_config) {
                if (intval($perms, 8) > intval('0644', 8)) {
                    $status = 'warning';
                    $verdict = "Permisos débiles ($perms). Se aconseja 0640 o 0440.";
                    $warnings[] = "wp-config.php tiene permisos vulnerables ($perms).";
                    $anomalies[] = array(
                        'path'        => '/' . $rel_path,
                        'rel_path'    => $rel_path,
                        'exists'      => true,
                        'perms'       => $perms,
                        'hash'        => '[PROTEGIDO]',
                        'status'      => 'warning',
                        'can_harden'  => true,
                        'can_rebuild' => false,
                        'verdict'     => "Permisos vulnerables ($perms) · Se aconseja endurecer permisos"
                    );
                }
            } elseif (!$meta['is_custom'] && !empty($checksums) && isset($checksums[$rel_path])) {
                $expected_md5 = $checksums[$rel_path];
                $content = @file_get_contents($full_path);
                $md5_raw = md5($content);
                $md5_normalized = md5(str_replace("\r\n", "\n", $content));

                // Soporte para paquetes de idioma oficiales (como es_ES) en wp-includes/version.php
                $is_clean_file = ($md5_raw === $expected_md5 || $md5_normalized === $expected_md5);
                if (!$is_clean_file && $rel_path === 'wp-includes/version.php') {
                    $content_no_locale = preg_replace('/\$wp_local_package\s*=\s*[\'"][^\'"]+[\'"];\s*/', '', str_replace("\r\n", "\n", $content));
                    if (md5($content_no_locale) === $expected_md5) {
                        $is_clean_file = true;
                    } elseif (strpos($content, '$wp_version') !== false && !preg_match('/(eval|base64_decode|assert|create_function|passthru|shell_exec|system|exec)\s*\(/i', $content)) {
                        $is_clean_file = true;
                    }
                }

                if (!$is_clean_file) {
                    $status = 'tampered';
                    $verdict = '🚨 Firma alterada (Código modificado)';
                    $warnings[] = "El archivo vital /$rel_path fue alterado o modificado respecto a la versión oficial de WordPress $core_version.";
                    $anomalies[] = array(
                        'path'        => '/' . $rel_path,
                        'rel_path'    => $rel_path,
                        'exists'      => true,
                        'perms'       => $perms,
                        'hash'        => substr($hash, 0, 16) . '…',
                        'status'      => 'tampered',
                        'can_rebuild' => !$meta['is_custom'],
                        'can_harden'  => false,
                        'verdict'     => 'Código alterado / Posible inyección'
                    );
                }
            }

            if ($status === 'intact') {
                $clean_count++;
            }

            $results[] = array(
                'path'        => '/' . $rel_path,
                'rel_path'    => $rel_path,
                'exists'      => true,
                'size'        => $size,
                'perms'       => $perms,
                'mtime'       => $mtime,
                'hash'        => $is_wp_config ? '[PROTEGIDO]' : (substr($hash, 0, 16) . '…'),
                'full_hash'   => $is_wp_config ? '[PROTEGIDO]' : $hash,
                'status'      => $status,
                'verdict'     => $verdict
            );
        }

        $total = count($results);
        $integrity_pct = $total > 0 ? round(($clean_count / $total) * 100) : 100;

        wp_send_json_success(array(
            'files'         => $results,
            'anomalies'     => $anomalies,
            'total'         => $total,
            'intact_count'  => $clean_count,
            'warnings'      => $warnings,
            'has_anomalies' => !empty($anomalies),
            'integrity_pct' => $integrity_pct,
            'wp_version'    => $core_version,
            'reinstall_url' => admin_url('update-core.php'),
            'checked_at'    => current_time('H:i:s'),
            'timestamp'     => time()
        ));
    }

    /**
     * Endurecimiento Automático de Permisos de wp-config.php (Hardening)
     */
    public function ajax_sentinel_harden() {
        check_ajax_referer('nexaguard_security_nonce', 'nonce');
        if (!current_user_can('manage_options')) {
            wp_send_json_error(array('message' => 'Permisos insuficientes.'));
        }

        $config_file = ABSPATH . 'wp-config.php';
        $hardened = false;
        if (file_exists($config_file)) {
            $hardened = @chmod($config_file, 0440);
            if (!$hardened) {
                $hardened = @chmod($config_file, 0640);
            }
        }

        wp_send_json_success(array(
            'hardened' => $hardened,
            'message'  => 'Permisos de wp-config.php endurecidos a modo seguro solo-lectura (0440) exitosamente.'
        ));
    }

    /**
     * Reconstrucción 1-Clic de Archivo Vital Oficial desde WordPress.org
     */
    public function ajax_sentinel_restore_file() {
        check_ajax_referer('nexaguard_security_nonce', 'nonce');
        if (!current_user_can('manage_options')) {
            wp_send_json_error(array('message' => 'Permisos insuficientes.'));
        }

        $rel_path = isset($_POST['file']) ? sanitize_text_field(ltrim(trim($_POST['file']), '/\\')) : '';
        if (empty($rel_path)) {
            wp_send_json_error(array('message' => 'Ruta de archivo no especificada.'));
        }

        $cleaner = new NexaGuard_Cleaner();
        $result = $cleaner->restore_core_file(ABSPATH . $rel_path);

        if (!empty($result['success'])) {
            wp_send_json_success($result);
        } else {
            wp_send_json_error($result);
        }
    }

    /**
     * Reconstrucción Masiva de Todos los Archivos Vitales de WordPress (PRO)
     */
    public function ajax_sentinel_rebuild_all_vital() {
        check_ajax_referer('nexaguard_security_nonce', 'nonce');
        if (!current_user_can('manage_options')) {
            wp_send_json_error(array('message' => 'Permisos insuficientes.'));
        }

        $cleaner = new NexaGuard_Cleaner();
        $vital_files = array(
            'index.php',
            'wp-blog-header.php',
            'wp-load.php',
            'wp-settings.php',
            'wp-login.php',
            'wp-includes/version.php',
            'wp-includes/pluggable.php',
            'wp-content/index.php'
        );

        $restored = 0;
        $details = array();

        foreach ($vital_files as $rel) {
            $full_path = ABSPATH . $rel;
            $res = $cleaner->restore_core_file($full_path);
            if (!empty($res['success'])) {
                $restored++;
                $details[] = "✓ /$rel restaurado con copia oficial.";
            } else {
                $details[] = "⚠️ /$rel: " . (isset($res['message']) ? $res['message'] : 'Error');
            }
        }

        global $wp_version;
        $core_version = !empty($wp_version) ? $wp_version : get_bloginfo('version');

        wp_send_json_success(array(
            'restored' => $restored,
            'total'    => count($vital_files),
            'details'  => $details,
            'message'  => "¡Se han reconstruido y verificado {$restored} archivos vitales con copias oficiales inmaculadas de WordPress.org (v{$core_version})!"
        ));
    }
}

// Iniciar plugin
NexaGuard_Plugin::get_instance();
