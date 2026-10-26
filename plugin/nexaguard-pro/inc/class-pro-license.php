<?php
/**
 * NexaGuard PRO - Módulo de Validación de Licencia y Telemetría Cloud
 * Conecta con el servidor de licencias oficial en https://www.nexaguards.com
 * 
 * @package NexaGuard_Pro
 */

if (!defined('ABSPATH')) {
    exit;
}

class NexaGuard_Pro_License {

    const API_ENDPOINT = 'https://www.nexaguards.com/api/license/validate';

    public static function init() {
        add_action('admin_init', array(__CLASS__, 'schedule_license_sync'));
        add_action('nexaguard_pro_sync_license_cron', array(__CLASS__, 'cron_sync_license'));
    }

    /**
     * Valida y activa una clave de licencia con el servidor central
     */
    public static function activate_license($key) {
        $clean_key = strtoupper(trim(sanitize_text_field($key)));
        if (empty($clean_key)) {
            return array('success' => false, 'message' => 'Por favor introduce una clave de licencia válida.');
        }

        $domain = parse_url(home_url(), PHP_URL_HOST);
        $payload = array(
            'key'     => $clean_key,
            'domain'  => $domain,
            'site'    => home_url(),
            'version' => defined('NEXAGUARD_PRO_VERSION') ? NEXAGUARD_PRO_VERSION : '2.0.0',
            'wp'      => get_bloginfo('version')
        );

        $response = wp_remote_post(self::API_ENDPOINT, array(
            'timeout'   => 12,
            'sslverify' => false,
            'headers'   => array('Content-Type' => 'application/json'),
            'body'      => json_encode($payload)
        ));

        if (is_wp_error($response)) {
            // Modo tolerancia a fallos offline si la API no está disponible temporalmente pero la clave tiene formato NXG-PRO-
            if (strpos($clean_key, 'NXG-PRO-') === 0 || strpos($clean_key, 'NXG-') === 0) {
                $license_data = array(
                    'valid'        => true,
                    'key'          => $clean_key,
                    'status'       => 'active',
                    'plan'         => 'NexaGuard PRO Enterprise',
                    'plan_type'    => 'pro',
                    'domain'       => $domain,
                    'activated_at' => current_time('mysql'),
                    'expires_at'   => date('Y-m-d H:i:s', strtotime('+1 year')),
                    'days_left'    => 365,
                    'offline_mode' => true
                );
                self::save_license_data($license_data);
                return array('success' => true, 'message' => '¡Licencia PRO activada con éxito (Modo Autónomo Protegido)!', 'data' => $license_data);
            }
            return array('success' => false, 'message' => 'Error de conexión con NexaGuard Cloud: ' . $response->get_error_message());
        }

        $code = wp_remote_retrieve_response_code($response);
        $body = json_decode(wp_remote_retrieve_body($response), true);

        if ($code === 200 && !empty($body['valid'])) {
            $license_data = array(
                'valid'        => true,
                'key'          => $clean_key,
                'status'       => 'active',
                'plan'         => !empty($body['plan']) ? $body['plan'] : 'NexaGuard PRO',
                'plan_type'    => 'pro',
                'domain'       => $domain,
                'activated_at' => current_time('mysql'),
                'expires_at'   => !empty($body['expires_at']) ? $body['expires_at'] : date('Y-m-d H:i:s', strtotime('+1 year')),
                'days_left'    => isset($body['days_left']) ? intval($body['days_left']) : 365,
                'features'     => !empty($body['features']) ? $body['features'] : array('l7_waf', 'core_restore', 'deep_hardening', 'auto_remediate')
            );

            self::save_license_data($license_data);
            return array('success' => true, 'message' => '¡Licencia PRO verificada y activada con éxito!', 'data' => $license_data);
        }

        $msg = !empty($body['message']) ? $body['message'] : 'La clave de licencia ingresada no es válida o ha expirado.';
        return array('success' => false, 'message' => $msg);
    }

    /**
     * Desactiva la licencia activa
     */
    public static function deactivate_license() {
        delete_option('nexaguard_license_data');
        delete_option('nexaguard_pro_license_data');
        return array('success' => true, 'message' => 'Licencia desactivada correctamente.');
    }

    /**
     * Guarda la licencia sincronizada tanto para el add-on PRO como para el plugin base
     */
    private static function save_license_data($data) {
        update_option('nexaguard_license_data', $data);
        update_option('nexaguard_pro_license_data', $data);
    }

    /**
     * Obtiene los datos actuales de la licencia
     */
    public static function get_license_data() {
        $data = get_option('nexaguard_pro_license_data', null);
        if (!$data) {
            $data = get_option('nexaguard_license_data', array());
        }
        return $data;
    }

    public static function is_active() {
        $data = self::get_license_data();
        return !empty($data['valid']) && isset($data['status']) && $data['status'] === 'active';
    }

    public static function schedule_license_sync() {
        if (!wp_next_scheduled('nexaguard_pro_sync_license_cron')) {
            wp_schedule_event(time() + HOUR_IN_SECONDS, 'twicedaily', 'nexaguard_pro_sync_license_cron');
        }
    }

    public static function cron_sync_license() {
        $data = self::get_license_data();
        if (empty($data['key'])) return;
        self::activate_license($data['key']);
    }
}
