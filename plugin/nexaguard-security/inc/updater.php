<?php
/**
 * NexaGuard Security - Sistema de Auto-Actualización Nativo
 * Permite actualizar el plugin automáticamente desde GitHub / nexaguards.com
 * sin necesidad de reinstalar ni perder configuraciones.
 */

if (!defined('ABSPATH')) {
    exit;
}

class NexaGuard_Updater {
    private static $plugin_file = 'nexaguard-security/nexaguard-security.php';
    private static $slug = 'nexaguard-security';
    private static $remote_urls = array(
        'https://raw.githubusercontent.com/asbel27/nexaguard/main/public/downloads/info.json',
        'https://www.nexaguards.com/downloads/info.json'
    );

    public static function init() {
        // Hooks nativos del gestor de actualizaciones de WordPress
        add_filter('pre_set_site_transient_update_plugins', array(__CLASS__, 'check_update'));
        add_filter('plugins_api', array(__CLASS__, 'plugin_info'), 20, 3);
        add_filter('upgrader_source_selection', array(__CLASS__, 'fix_source_folder'), 10, 4);

        // AJAX para comprobación y actualización instantánea desde el panel NexaGuard
        add_action('wp_ajax_nexaguard_check_update', array(__CLASS__, 'ajax_check_update'));
        add_action('wp_ajax_nexaguard_perform_update', array(__CLASS__, 'ajax_perform_update'));
    }

    /**
     * Consulta el manifiesto de versión remota
     */
    public static function get_remote_info($force = false) {
        $transient_key = 'nexaguard_update_info';
        if (!$force) {
            $cached = get_transient($transient_key);
            if ($cached !== false && is_object($cached)) {
                return $cached;
            }
        }

        $data = null;
        foreach (self::$remote_urls as $url) {
            $res = wp_remote_get($url, array(
                'timeout' => 8,
                'sslverify' => true,
                'headers' => array(
                    'Accept' => 'application/json',
                    'User-Agent' => 'WordPress/' . get_bloginfo('version') . '; NexaGuard/' . NEXAGUARD_VERSION
                )
            ));

            if (!is_wp_error($res) && wp_remote_retrieve_response_code($res) === 200) {
                $body = wp_remote_retrieve_body($res);
                $json = json_decode($body);
                if ($json && !empty($json->version)) {
                    $data = $json;
                    break;
                }
            }
        }

        if ($data) {
            set_transient($transient_key, $data, 1 * HOUR_IN_SECONDS);
            return $data;
        }

        return null;
    }

    /**
     * Inyecta la actualización en el transient de WordPress
     */
    public static function check_update($transient) {
        if (empty($transient) || !is_object($transient)) {
            $transient = new stdClass();
        }

        $remote = self::get_remote_info();
        if (!$remote || empty($remote->version)) {
            return $transient;
        }

        $current_ver = defined('NEXAGUARD_VERSION') ? NEXAGUARD_VERSION : '1.0.0';
        $download_url = !empty($remote->download_url) ? $remote->download_url : (!empty($remote->fallback_download_url) ? $remote->fallback_download_url : '');

        if (version_compare($remote->version, $current_ver, '>')) {
            $item = new stdClass();
            $item->id = self::$plugin_file;
            $item->slug = self::$slug;
            $item->plugin = self::$plugin_file;
            $item->new_version = $remote->version;
            $item->url = !empty($remote->homepage) ? $remote->homepage : 'https://www.nexaguards.com';
            $item->package = $download_url;
            $item->icons = array(
                'default' => 'https://www.nexaguards.com/assets/favicon.png'
            );
            $item->banners = array();
            $item->tested = !empty($remote->tested) ? $remote->tested : '6.7';
            $item->requires_php = !empty($remote->requires_php) ? $remote->requires_php : '7.4';

            $transient->response[self::$plugin_file] = $item;
            if (isset($transient->no_update[self::$plugin_file])) {
                unset($transient->no_update[self::$plugin_file]);
            }
        } else {
            $item = new stdClass();
            $item->id = self::$plugin_file;
            $item->slug = self::$slug;
            $item->plugin = self::$plugin_file;
            $item->new_version = $current_ver;
            $item->url = 'https://www.nexaguards.com';
            $item->package = '';

            $transient->no_update[self::$plugin_file] = $item;
            if (isset($transient->response[self::$plugin_file])) {
                unset($transient->response[self::$plugin_file]);
            }
        }

        return $transient;
    }

    /**
     * Muestra la ventana modal "Ver detalles" de la versión en el admin de WordPress
     */
    public static function plugin_info($res, $action, $args) {
        if ($action !== 'plugin_information') {
            return $res;
        }

        if (!isset($args->slug) || $args->slug !== self::$slug) {
            return $res;
        }

        $remote = self::get_remote_info();
        if (!$remote) {
            return $res;
        }

        $download_url = !empty($remote->download_url) ? $remote->download_url : (!empty($remote->fallback_download_url) ? $remote->fallback_download_url : '');

        $info = new stdClass();
        $info->name = !empty($remote->name) ? $remote->name : 'NexaGuard Security';
        $info->slug = self::$slug;
        $info->version = $remote->version;
        $info->author = '<a href="https://www.nexaguards.com" target="_blank">NexaGuard Cybersecurity Team</a>';
        $info->homepage = 'https://www.nexaguards.com';
        $info->download_link = $download_url;
        $info->tested = !empty($remote->tested) ? $remote->tested : '6.7';
        $info->requires_php = !empty($remote->requires_php) ? $remote->requires_php : '7.4';
        $info->last_updated = !empty($remote->last_updated) ? $remote->last_updated : date('Y-m-d');
        
        $info->sections = array(
            'description' => !empty($remote->sections->description) ? $remote->sections->description : 'Protección de nivel forense para WordPress.',
            'changelog' => !empty($remote->sections->changelog) ? $remote->sections->changelog : 'Novedades de la versión.'
        );

        $info->banners = array(
            'low' => 'https://www.nexaguards.com/assets/favicon.png',
            'high' => 'https://www.nexaguards.com/assets/favicon.png'
        );

        return $info;
    }

    /**
     * Asegura que el directorio del plugin conserve siempre el nombre nexaguard-security
     */
    public static function fix_source_folder($source, $remote_source, $upgrader, $hook_extra = array()) {
        global $wp_filesystem;

        if (isset($hook_extra['plugin']) && $hook_extra['plugin'] === self::$plugin_file) {
            $correct_dir = trailingslashit($remote_source) . self::$slug;
            if ($source !== $correct_dir && $wp_filesystem->exists($source)) {
                $wp_filesystem->move($source, $correct_dir);
                return trailingslashit($correct_dir);
            }
        }

        return $source;
    }

    /**
     * AJAX: Comprobar actualización bajo demanda desde el panel NexaGuard
     */
    public static function ajax_check_update() {
        check_ajax_referer('nexaguard_admin_nonce', 'nonce');

        if (!current_user_can('manage_options')) {
            wp_send_json_error(array('message' => 'No tienes permisos suficientes.'));
        }

        // Forzar limpieza de caché de transients
        delete_transient('nexaguard_update_info');
        delete_site_transient('update_plugins');

        $remote = self::get_remote_info(true);
        if (!$remote || empty($remote->version)) {
            wp_send_json_error(array('message' => 'No se pudo conectar con el servidor de versiones de NexaGuard.'));
        }

        $current_ver = defined('NEXAGUARD_VERSION') ? NEXAGUARD_VERSION : '1.0.0';
        $has_update = version_compare($remote->version, $current_ver, '>');

        wp_send_json_success(array(
            'current_version' => $current_ver,
            'remote_version' => $remote->version,
            'has_update' => $has_update,
            'changelog' => !empty($remote->sections->changelog) ? $remote->sections->changelog : '',
            'message' => $has_update 
                ? '¡Nueva versión ' . esc_html($remote->version) . ' disponible!'
                : 'Tienes instalada la última versión disponible (' . esc_html($current_ver) . ').'
        ));
    }

    /**
     * AJAX: Ejecutar la actualización en vivo sin salir del panel
     */
    public static function ajax_perform_update() {
        check_ajax_referer('nexaguard_admin_nonce', 'nonce');

        if (!current_user_can('update_plugins')) {
            wp_send_json_error(array('message' => 'No tienes permisos para actualizar plugins.'));
        }

        include_once ABSPATH . 'wp-admin/includes/class-wp-upgrader.php';
        include_once ABSPATH . 'wp-admin/includes/plugin-install.php';
        include_once ABSPATH . 'wp-admin/includes/plugin.php';

        $remote = self::get_remote_info(true);
        if (!$remote || empty($remote->version)) {
            wp_send_json_error(array('message' => 'No se pudo obtener la información de la actualización.'));
        }

        $skin = new WP_Ajax_Upgrader_Skin();
        $upgrader = new Plugin_Upgrader($skin);

        // Preparamos el transient antes de invocar la actualización
        delete_site_transient('update_plugins');
        wp_update_plugins();

        $result = $upgrader->upgrade(self::$plugin_file);

        if (is_wp_error($result)) {
            wp_send_json_error(array('message' => $result->get_error_message()));
        } elseif ($result === false) {
            wp_send_json_error(array('message' => 'La actualización no pudo completarse. Comprueba los permisos de escritura del servidor.'));
        }

        // Reactivar el plugin para asegurar continuidad operativa
        activate_plugin(self::$plugin_file);

        wp_send_json_success(array(
            'message' => '¡NexaGuard Security se ha actualizado con éxito a la versión ' . esc_html($remote->version) . '!',
            'version' => $remote->version
        ));
    }
}

