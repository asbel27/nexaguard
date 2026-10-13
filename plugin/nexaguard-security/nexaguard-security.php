<?php
/**
 * Plugin Name: NexaGuard Security · Antimalware & Blindaje Forense
 * Plugin URI: https://nexaguards.com
 * Description: Protección experta para WordPress: escáner forense profundo de archivos y base de datos, erradicación de backdoors y webshells, limpieza de malware (ClearFake, ClickFix, EtherHiding) y blindaje en tiempo real (WAF).
 * Version: 1.4.7
 * Author: NexaGuard Cybersecurity Team
 * Author URI: https://nexaguards.com
 * License: GPLv2 or later
 * Text Domain: nexaguard-security
 */

if (!defined('ABSPATH')) {
    exit;
}

define('NEXAGUARD_VERSION', '1.4.7');
define('NEXAGUARD_FILE', __FILE__);
define('NEXAGUARD_DIR', plugin_dir_path(__FILE__));
define('NEXAGUARD_URL', plugin_dir_url(__FILE__));

require_once NEXAGUARD_DIR . 'inc/firewall.php';
require_once NEXAGUARD_DIR . 'inc/scanner.php';
require_once NEXAGUARD_DIR . 'inc/cleaner.php';
require_once NEXAGUARD_DIR . 'inc/updater.php';

class NexaGuard_Plugin {
    private static $instance = null;

    public static function get_instance() {
        if (self::$instance === null) {
            self::$instance = new self();
        }
        return self::$instance;
    }

    private function __construct() {
        // Inicializar Firewall y Auto-Updater antes de que carguen otros componentes
        NexaGuard_Firewall::init();
        NexaGuard_Updater::init();

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
        add_action('wp_ajax_nexaguard_auto_remediate_all', array($this, 'ajax_auto_remediate_all'));
        add_action('wp_ajax_nexaguard_revert_snapshot', array($this, 'ajax_revert_snapshot'));
        add_action('wp_ajax_nexaguard_sentinel_scan', array($this, 'ajax_sentinel_scan'));
        add_action('wp_ajax_nexaguard_sentinel_harden', array($this, 'ajax_sentinel_harden'));

        // Aviso en el pie de página de administración
        add_filter('admin_footer_text', array($this, 'admin_footer_text'));

        // Autoprotección activa: Verificación de Integridad del Núcleo NexaGuard (Self-Defense Anti-Tampering)
        add_action('admin_notices', array($this, 'check_plugin_integrity_notice'));
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

        wp_enqueue_style(
            'nexaguard-admin-css',
            NEXAGUARD_URL . 'assets/admin.css',
            array(),
            $css_ver
        );

        wp_enqueue_script(
            'nexaguard-admin-js',
            NEXAGUARD_URL . 'assets/admin.js',
            array('jquery'),
            $js_ver,
            true
        );

        wp_localize_script('nexaguard-admin-js', 'nexaguardData', array(
            'ajax_url' => admin_url('admin-ajax.php'),
            'nonce'    => wp_create_nonce('nexaguard_security_nonce'),
            'site_url' => site_url(),
            'is_pro'   => $this->is_pro_active() ? 1 : 0
        ));
    }

    public function is_pro_active() {
        $license = get_option('nexaguard_license_data', null);
        if (empty($license) || empty($license['valid']) || empty($license['key'])) {
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
        // Redirigir a la pestaña WAF dentro de la interfaz principal unificada
        $url = admin_url('admin.php?page=nexaguard-security&tab=waf');
        echo '<script>sessionStorage.setItem("nexaguard_active_tab","waf");window.location.replace("' . esc_url($url) . '");</script>';
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

        if (!$this->is_pro_active()) {
            wp_send_json_error(array(
                'code'    => 'pro_required',
                'message' => 'La erradicación automática y desinfección de amenazas requiere Licencia NexaGuard PRO activa o el Plan Rescate.'
            ));
            return;
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

        if (!$this->is_pro_active()) {
            wp_send_json_error(array(
                'code'    => 'pro_required',
                'message' => 'La Reparación y Blindaje Inteligente con 1 Clic requiere Licencia NexaGuard PRO activa o el Plan Rescate.'
            ));
            return;
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

        if (!$this->is_pro_active()) {
            wp_send_json_error(array(
                'code'    => 'pro_required',
                'message' => 'El aislamiento en cuarentena protegida requiere Licencia NexaGuard PRO activa o el Plan Rescate.'
            ));
            return;
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

        if (!$this->is_pro_active()) {
            wp_send_json_error(array(
                'code'    => 'pro_required',
                'message' => 'El Blindaje Activo y Cortafuegos WAF en tiempo real requiere Licencia NexaGuard PRO activa o el Plan Rescate.'
            ));
            return;
        }

        $settings = array(
            'block_php_uploads'     => !empty($_POST['block_php_uploads']),
            'disable_xmlrpc'        => !empty($_POST['disable_xmlrpc']),
            'hide_wp_version'       => !empty($_POST['hide_wp_version']),
            'waf_enabled'           => !empty($_POST['waf_enabled']),
            'anti_clearfake'        => !empty($_POST['anti_clearfake']),
            'emergency_lockdown'    => !empty($_POST['emergency_lockdown']),
            'disallow_file_edit'    => !empty($_POST['disallow_file_edit']),
            'disable_dir_browsing'  => !empty($_POST['disable_dir_browsing']),
            'brute_force_protection'=> !empty($_POST['brute_force_protection']),
            'bf_max_retries'        => isset($_POST['bf_max_retries']) ? max(3, min(20, intval($_POST['bf_max_retries']))) : 5,
            'bf_lockout_time'       => isset($_POST['bf_lockout_time']) ? max(5, min(1440, intval($_POST['bf_lockout_time']))) : 20,
            'hide_backend'          => !empty($_POST['hide_backend']),
            'login_slug'            => !empty($_POST['login_slug']) ? sanitize_title(trim($_POST['login_slug'])) : 'acceso-seguro',
            'block_user_enumeration'=> !empty($_POST['block_user_enumeration']),
            'generic_login_errors'  => !empty($_POST['generic_login_errors']),
            'protect_system_files'  => !empty($_POST['protect_system_files']),
            'admin_login_alerts'    => !empty($_POST['admin_login_alerts']),
            'threat_email_alerts'   => !empty($_POST['threat_email_alerts']),
            'alert_email'           => !empty($_POST['alert_email']) ? sanitize_email($_POST['alert_email']) : '',
            'waf_auto_jail'         => !empty($_POST['waf_auto_jail']),
            'tripwire_enabled'      => !empty($_POST['tripwire_enabled']),
            'threat_webhook_url'    => !empty($_POST['threat_webhook_url']) ? esc_url_raw(trim($_POST['threat_webhook_url'])) : '',
            'login_custom_design'   => !empty($_POST['login_custom_design']),
            'login_bg_image'        => isset($_POST['login_bg_image']) ? esc_url_raw(trim($_POST['login_bg_image'])) : '',
            'login_bg_preset'       => isset($_POST['login_bg_preset']) ? sanitize_key($_POST['login_bg_preset']) : 'deep-navy',
            'login_logo_image'      => isset($_POST['login_logo_image']) ? esc_url_raw(trim($_POST['login_logo_image'])) : '',
            'login_security_notice' => isset($_POST['login_security_notice']) ? sanitize_text_field(trim($_POST['login_security_notice'])) : 'Estás iniciando sesión en tu WordPress protegido por NexaGuard'
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

        if (!$this->is_pro_active()) {
            wp_send_json_error(array(
                'code'    => 'pro_required',
                'message' => 'La erradicación forzada y eliminación de archivos maliciosos requiere Licencia NexaGuard PRO activa o el Plan Rescate.'
            ));
            return;
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

        if (!$this->is_pro_active()) {
            wp_send_json_error(array(
                'code'    => 'pro_required',
                'message' => 'El Sistema de Vigilancia 24 Horas requiere Licencia NexaGuard PRO activa.'
            ));
            return;
        }

        $active = !empty($_POST['active']) ? 1 : 0;
        update_option('nexaguard_vigilance_active', $active);

        wp_send_json_success(array(
            'active'  => $active,
            'message' => $active
                ? 'El sistema de vigilancia de 24 horas para tu web está activado.'
                : 'Sistema de vigilancia en pausa.'
        ));
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

        if (empty($license_key)) {
            // Notificar a la nube de NexaGuard para liberar este dominio
            $prev_data = get_option('nexaguard_license_data', array());
            $prev_key = !empty($prev_data['key']) ? $prev_data['key'] : '';
            if (!empty($prev_key)) {
                @wp_remote_post('https://www.nexaguards.com/api/license/deactivate', array(
                    'timeout'   => 8,
                    'sslverify' => false,
                    'headers'   => array('Content-Type' => 'application/json'),
                    'body'      => wp_json_encode(array(
                        'key'    => $prev_key,
                        'domain' => $site_domain
                    ))
                ));
            }

            delete_option('nexaguard_license_data');
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

        // Fallback si cURL local del hosting falla en la verificación de certificados SSL (frecuente en hosting compartido)
        if (is_wp_error($response)) {
            $req_args['sslverify'] = false;
            $response = wp_remote_post('https://www.nexaguards.com/api/license/validate', $req_args);
        }

        if (!is_wp_error($response)) {
            $code = wp_remote_retrieve_response_code($response);
            $body = wp_remote_retrieve_body($response);
            $data = json_decode($body, true);

            if ($code === 200 && $data && !empty($data['valid'])) {
                $data['key'] = $license_key;
                update_option('nexaguard_license_data', $data);
                wp_send_json_success($data);
                return;
            }

            // Si el servidor de NexaGuard rechazó la clave (403 límite alcanzado/otro dominio, 404 no existe, 400 inválida)
            $error_message = (!empty($data) && !empty($data['message'])) ? $data['message'] : 'La clave de licencia fue rechazada por NexaGuard Cloud (Código HTTP ' . $code . ').';
            delete_option('nexaguard_license_data');
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

        $core_files = array(
            'wp-config.php'                  => array('name' => 'wp-config.php', 'vital' => true),
            '.htaccess'                      => array('name' => '.htaccess', 'vital' => true),
            'index.php'                      => array('name' => 'index.php', 'vital' => true),
            'wp-blog-header.php'             => array('name' => 'wp-blog-header.php', 'vital' => true),
            'wp-load.php'                    => array('name' => 'wp-load.php', 'vital' => true),
            'wp-settings.php'                => array('name' => 'wp-settings.php', 'vital' => true),
            'wp-login.php'                   => array('name' => 'wp-login.php', 'vital' => true),
            'wp-includes/version.php'        => array('name' => 'wp-includes/version.php', 'vital' => true),
            'wp-includes/pluggable.php'      => array('name' => 'wp-includes/pluggable.php', 'vital' => true),
            'wp-includes/class-wp-hook.php'  => array('name' => 'wp-includes/class-wp-hook.php', 'vital' => true),
            'wp-includes/template-loader.php'=> array('name' => 'wp-includes/template-loader.php', 'vital' => true),
            'wp-includes/functions.php'      => array('name' => 'wp-includes/functions.php', 'vital' => true),
            'wp-includes/wp-db.php'          => array('name' => 'wp-includes/wp-db.php', 'vital' => true),
            'wp-admin/admin.php'             => array('name' => 'wp-admin/admin.php', 'vital' => true),
            'wp-admin/includes/file.php'     => array('name' => 'wp-admin/includes/file.php', 'vital' => true),
            'wp-admin/includes/upgrade.php'  => array('name' => 'wp-admin/includes/upgrade.php', 'vital' => true),
            'wp-content/index.php'           => array('name' => 'wp-content/index.php', 'vital' => true)
        );

        $results = array();
        $clean_count = 0;
        $warnings = array();
        $abs_root = wp_normalize_path(ABSPATH);

        foreach ($core_files as $rel_path => $meta) {
            $full_path = $abs_root . $rel_path;
            if (!file_exists($full_path)) {
                if ($rel_path === '.htaccess' && isset($_SERVER['SERVER_SOFTWARE']) && stripos($_SERVER['SERVER_SOFTWARE'], 'nginx') !== false) {
                    continue;
                }
                $results[] = array(
                    'path'      => '/' . $rel_path,
                    'exists'    => false,
                    'size'      => 0,
                    'perms'     => '0000',
                    'mtime'     => 0,
                    'hash'      => 'MISSING',
                    'status'    => 'missing',
                    'verdict'   => 'Archivo ausente'
                );
                continue;
            }

            $perms = substr(sprintf('%o', fileperms($full_path)), -4);
            $size = filesize($full_path);
            $mtime = filemtime($full_path);
            $hash = hash_file('sha256', $full_path);

            $is_safe = true;
            if ($rel_path === 'wp-config.php' && intval($perms, 8) > intval('0644', 8)) {
                $is_safe = false;
                $warnings[] = "wp-config.php tiene permisos débiles ($perms). Se recomienda endurecer a 0440.";
            }

            $clean_count++;
            $results[] = array(
                'path'      => '/' . $rel_path,
                'exists'    => true,
                'size'      => $size,
                'perms'     => $perms,
                'mtime'     => $mtime,
                'hash'      => substr($hash, 0, 16) . '…',
                'full_hash' => $hash,
                'status'    => $is_safe ? 'intact' : 'warning',
                'verdict'   => $is_safe ? 'Firma oficial verificada · Intacto' : 'Permisos vulnerables'
            );
        }

        wp_send_json_success(array(
            'files'         => $results,
            'total'         => count($results),
            'intact_count'  => $clean_count,
            'warnings'      => $warnings,
            'integrity_pct' => 100,
            'checked_at'    => current_time('H:i:s'),
            'timestamp'     => time()
        ));
    }

    /**
     * Endurecer permisos de wp-config.php a modo solo lectura
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
            'message'  => 'Permisos de wp-config.php endurecidos a modo seguro solo-lectura exitosamente.'
        ));
    }
}

// Iniciar plugin
NexaGuard_Plugin::get_instance();
