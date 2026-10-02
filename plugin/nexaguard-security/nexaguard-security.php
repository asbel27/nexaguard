<?php
/**
 * Plugin Name: NexaGuard Security · Antimalware & Blindaje Forense
 * Plugin URI: https://nexaguards.com
 * Description: Protección experta para WordPress: escáner forense profundo de archivos y base de datos, erradicación de backdoors y webshells, limpieza de malware (ClearFake, ClickFix, EtherHiding) y blindaje en tiempo real (WAF).
 * Version: 1.1.0
 * Author: NexaGuard Cybersecurity Team
 * Author URI: https://nexaguards.com
 * License: GPLv2 or later
 * Text Domain: nexaguard-security
 */

if (!defined('ABSPATH')) {
    exit;
}

define('NEXAGUARD_VERSION', '1.1.0');
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

        // Aviso en el pie de página de administración
        add_filter('admin_footer_text', array($this, 'admin_footer_text'));
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

        wp_enqueue_style(
            'nexaguard-admin-css',
            NEXAGUARD_URL . 'assets/admin.css',
            array(),
            NEXAGUARD_VERSION
        );

        wp_enqueue_script(
            'nexaguard-admin-js',
            NEXAGUARD_URL . 'assets/admin.js',
            array('jquery'),
            NEXAGUARD_VERSION,
            true
        );

        wp_localize_script('nexaguard-admin-js', 'nexaguardData', array(
            'ajax_url' => admin_url('admin-ajax.php'),
            'nonce'    => wp_create_nonce('nexaguard_security_nonce'),
            'site_url' => site_url(),
        ));
    }

    public function render_admin_page() {
        include NEXAGUARD_DIR . 'inc/view-scanner.php';
    }

    public function render_waf_page() {
        include NEXAGUARD_DIR . 'inc/view-waf.php';
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

        $settings = array(
            'block_php_uploads' => !empty($_POST['block_php_uploads']),
            'disable_xmlrpc'    => !empty($_POST['disable_xmlrpc']),
            'hide_wp_version'   => !empty($_POST['hide_wp_version']),
            'waf_enabled'       => !empty($_POST['waf_enabled']),
            'anti_clearfake'    => !empty($_POST['anti_clearfake'])
        );

        update_option('nexaguard_settings', $settings);

        // Si se activó bloquear PHP en uploads, regenerar o quitar .htaccess
        $cleaner = new NexaGuard_Cleaner();
        if ($settings['block_php_uploads']) {
            $cleaner->protect_uploads_htaccess(true);
        } else {
            $cleaner->protect_uploads_htaccess(false);
        }

        wp_send_json_success(array('message' => 'Configuración de seguridad guardada con éxito.'));
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

    public function admin_footer_text($text) {
        $screen = get_current_screen();
        if ($screen && strpos($screen->id, 'nexaguard') !== false) {
            return 'Protegido con <a href="https://nexaguards.com" target="_blank" style="color:#ffcf33;font-weight:700">NexaGuard Security</a> · Ciberseguridad para WordPress.';
        }
        return $text;
    }
}

// Iniciar plugin
NexaGuard_Plugin::get_instance();
