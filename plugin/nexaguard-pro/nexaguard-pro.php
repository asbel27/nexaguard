<?php
/**
 * Plugin Name: NexaGuard – Malware Scanner & Web Security PRO
 * Plugin URI: https://www.nexaguards.com
 * Description: Complemento profesional avanzado de NexaGuard Security: Reconstrucción oficial de archivos vitales del núcleo con 1 clic, endurecimiento profundo de sistema y servidor, cortafuegos Layer 7 con Auto-Cárcel 24H y erradicación automatizada de malware.
 * Version: 2.0.0
 * Author: NexaGuard Cybersecurity Team
 * Author URI: https://www.nexaguards.com
 * Text Domain: nexaguard-malware-scanner-pro
 * Domain Path: /languages
 * Requires at least: 5.8
 * Requires PHP: 7.4
 */

if (!defined('ABSPATH')) {
    exit;
}

define('NEXAGUARD_PRO_VERSION', '2.0.0');
define('NEXAGUARD_PRO_ACTIVE', true);
define('NEXAGUARD_PRO_DIR', plugin_dir_path(__FILE__));
define('NEXAGUARD_PRO_URL', plugin_dir_url(__FILE__));
define('NEXAGUARD_PRO_FILE', __FILE__);

// Cargar Módulos Empresariales
require_once NEXAGUARD_PRO_DIR . 'inc/class-pro-reconstructor.php';
require_once NEXAGUARD_PRO_DIR . 'inc/class-pro-hardening.php';
require_once NEXAGUARD_PRO_DIR . 'inc/class-pro-waf.php';
require_once NEXAGUARD_PRO_DIR . 'inc/class-pro-remediation.php';
require_once NEXAGUARD_PRO_DIR . 'inc/class-pro-license.php';

class NexaGuard_Pro {
    private static $instance = null;

    public static function get_instance() {
        if (self::$instance === null) {
            self::$instance = new self();
        }
        return self::$instance;
    }

    private function __construct() {
        // Inicializar componentes
        NexaGuard_Pro_WAF::init();
        NexaGuard_Pro_License::init();

        // Menú y activos en el panel de WordPress
        add_action('admin_menu', array($this, 'register_pro_menu'), 20);
        add_action('admin_enqueue_scripts', array($this, 'enqueue_pro_assets'));

        // Endpoints AJAX PRO
        add_action('wp_ajax_nexaguard_pro_activate_license', array($this, 'ajax_activate_license'));
        add_action('wp_ajax_nexaguard_pro_deactivate_license', array($this, 'ajax_deactivate_license'));
        add_action('wp_ajax_nexaguard_pro_rebuild_vital', array($this, 'ajax_rebuild_vital'));
        add_action('wp_ajax_nexaguard_pro_rebuild_all_vital', array($this, 'ajax_rebuild_all_vital'));
        add_action('wp_ajax_nexaguard_pro_apply_hardening', array($this, 'ajax_apply_hardening'));
        add_action('wp_ajax_nexaguard_pro_regenerate_salts', array($this, 'ajax_regenerate_salts'));
        add_action('wp_ajax_nexaguard_pro_auto_remediate', array($this, 'ajax_auto_remediate'));
        add_action('wp_ajax_nexaguard_pro_unjail_ip', array($this, 'ajax_unjail_ip'));
        add_action('wp_ajax_nexaguard_pro_clear_jail', array($this, 'ajax_clear_jail'));

        // Interceptar y potenciar las acciones AJAX del plugin base si está activo
        add_action('wp_ajax_nexaguard_sentinel_restore_file', array($this, 'ajax_sentinel_restore_override'), 1);
        add_action('wp_ajax_nexaguard_sentinel_rebuild_all_vital', array($this, 'ajax_sentinel_rebuild_all_override'), 1);
        add_action('wp_ajax_nexaguard_auto_remediate_all', array($this, 'ajax_auto_remediate_override'), 1);

        // Aviso si el plugin gratuito no está instalado
        add_action('admin_notices', array($this, 'check_base_plugin_notice'));
    }

    public function check_base_plugin_notice() {
        if (!defined('NEXAGUARD_VERSION')) {
            echo '<div class="notice notice-info is-dismissible" style="border-left-color:#eab308;padding:12px 16px;">';
            echo '<p><strong>⚡ NexaGuard PRO está activo.</strong> Para una protección forense completa, se recomienda tener instalado también <em>NexaGuard – Malware Scanner</em> desde WordPress.org.</p>';
            echo '</div>';
        }
    }

    public function register_pro_menu() {
        $parent = defined('NEXAGUARD_VERSION') ? 'nexaguard-security' : null;

        if ($parent) {
            add_submenu_page(
                $parent,
                'NexaGuard PRO Suite',
                '<span style="color:#f59e0b;font-weight:700;">⚡ NexaGuard PRO</span>',
                'manage_options',
                'nexaguard-pro-suite',
                array($this, 'render_pro_page')
            );
        } else {
            add_menu_page(
                'NexaGuard PRO Suite',
                'NexaGuard PRO',
                'manage_options',
                'nexaguard-pro-suite',
                array($this, 'render_pro_page'),
                'dashicons-shield-alt',
                80
            );
        }
    }

    public function enqueue_pro_assets($hook) {
        if (strpos($hook, 'nexaguard') === false) {
            return;
        }

        wp_enqueue_style('nexaguard-pro-css', NEXAGUARD_PRO_URL . 'assets/pro-admin.css', array(), NEXAGUARD_PRO_VERSION);
        wp_enqueue_script('nexaguard-pro-js', NEXAGUARD_PRO_URL . 'assets/pro-admin.js', array('jquery'), NEXAGUARD_PRO_VERSION, true);

        wp_localize_script('nexaguard-pro-js', 'nexaguardProData', array(
            'ajax_url' => admin_url('admin-ajax.php'),
            'nonce'    => wp_create_nonce('nexaguard_pro_nonce'),
            'is_active'=> NexaGuard_Pro_License::is_active() ? 1 : 0
        ));
    }

    // --- AJAX HANDLERS ---

    public function ajax_activate_license() {
        check_ajax_referer('nexaguard_pro_nonce', 'nonce');
        if (!current_user_can('manage_options')) {
            wp_send_json_error(array('message' => 'Permisos insuficientes.'));
        }

        $key = isset($_POST['license_key']) ? sanitize_text_field($_POST['license_key']) : '';
        $res = NexaGuard_Pro_License::activate_license($key);

        if (!empty($res['success'])) {
            wp_send_json_success($res);
        } else {
            wp_send_json_error($res);
        }
    }

    public function ajax_deactivate_license() {
        check_ajax_referer('nexaguard_pro_nonce', 'nonce');
        if (!current_user_can('manage_options')) {
            wp_send_json_error(array('message' => 'Permisos insuficientes.'));
        }

        $res = NexaGuard_Pro_License::deactivate_license();
        wp_send_json_success($res);
    }

    public function ajax_rebuild_vital() {
        check_ajax_referer('nexaguard_pro_nonce', 'nonce');
        if (!current_user_can('manage_options')) {
            wp_send_json_error(array('message' => 'Permisos insuficientes.'));
        }

        $file = isset($_POST['file']) ? sanitize_text_field($_POST['file']) : '';
        $res = NexaGuard_Pro_Reconstructor::restore_core_file(ABSPATH . ltrim($file, '/'));

        if (!empty($res['success'])) {
            wp_send_json_success($res);
        } else {
            wp_send_json_error($res);
        }
    }

    public function ajax_rebuild_all_vital() {
        check_ajax_referer('nexaguard_pro_nonce', 'nonce');
        if (!current_user_can('manage_options')) {
            wp_send_json_error(array('message' => 'Permisos insuficientes.'));
        }

        $res = NexaGuard_Pro_Reconstructor::rebuild_all_vital_files();
        wp_send_json_success($res);
    }

    public function ajax_apply_hardening() {
        check_ajax_referer('nexaguard_pro_nonce', 'nonce');
        if (!current_user_can('manage_options')) {
            wp_send_json_error(array('message' => 'Permisos insuficientes.'));
        }

        $res = NexaGuard_Pro_Hardening::apply_full_hardening();
        wp_send_json_success($res);
    }

    public function ajax_regenerate_salts() {
        check_ajax_referer('nexaguard_pro_nonce', 'nonce');
        if (!current_user_can('manage_options')) {
            wp_send_json_error(array('message' => 'Permisos insuficientes.'));
        }

        $res = NexaGuard_Pro_Hardening::regenerate_security_salts();
        if (!empty($res['success'])) {
            wp_send_json_success($res);
        } else {
            wp_send_json_error($res);
        }
    }

    public function ajax_auto_remediate() {
        check_ajax_referer('nexaguard_pro_nonce', 'nonce');
        if (!current_user_can('manage_options')) {
            wp_send_json_error(array('message' => 'Permisos insuficientes.'));
        }

        $res = NexaGuard_Pro_Remediation::auto_remediate_all();
        wp_send_json_success($res);
    }

    public function ajax_unjail_ip() {
        check_ajax_referer('nexaguard_pro_nonce', 'nonce');
        if (!current_user_can('manage_options')) {
            wp_send_json_error(array('message' => 'Permisos insuficientes.'));
        }

        $ip = isset($_POST['ip']) ? sanitize_text_field($_POST['ip']) : '';
        $res = NexaGuard_Pro_WAF::unjail_ip($ip);
        wp_send_json_success(array('success' => $res, 'message' => "IP {$ip} liberada de la cárcel."));
    }

    public function ajax_clear_jail() {
        check_ajax_referer('nexaguard_pro_nonce', 'nonce');
        if (!current_user_can('manage_options')) {
            wp_send_json_error(array('message' => 'Permisos insuficientes.'));
        }

        NexaGuard_Pro_WAF::clear_all_jail();
        wp_send_json_success(array('message' => 'Registro de IPs en cárcel vaciado con éxito.'));
    }

    // --- OVERRIDES PARA EL PLUGIN BASE ---

    public function ajax_sentinel_restore_override() {
        if (!empty($_POST['file'])) {
            $file = sanitize_text_field($_POST['file']);
            $res = NexaGuard_Pro_Reconstructor::restore_core_file(ABSPATH . ltrim($file, '/'));
            wp_send_json_success($res);
            exit;
        }
    }

    public function ajax_sentinel_rebuild_all_override() {
        $res = NexaGuard_Pro_Reconstructor::rebuild_all_vital_files();
        wp_send_json_success($res);
        exit;
    }

    public function ajax_auto_remediate_override() {
        $res = NexaGuard_Pro_Remediation::auto_remediate_all();
        wp_send_json_success($res);
        exit;
    }

    // --- VISTA PRINCIPAL DEL PANEL PRO ---

    public function render_pro_page() {
        $license_data = NexaGuard_Pro_License::get_license_data();
        $is_active = NexaGuard_Pro_License::is_active();
        $jailed_ips = get_option('nexaguard_pro_jailed_ips', array());
        $waf_logs = get_option('nexaguard_pro_waf_logs', array());
        $hardening = get_option('nexaguard_pro_hardening_status', array());
        $vital_files = NexaGuard_Pro_Reconstructor::get_vital_files();

        include NEXAGUARD_PRO_DIR . 'inc/view-pro-dashboard.php';
    }
}

// Iniciar NexaGuard PRO Suite
NexaGuard_Pro::get_instance();

