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
    private static $remote_urls = array(
        'https://raw.githubusercontent.com/asbel27/nexaguard/main/public/downloads/info.json',
        'https://www.nexaguards.com/downloads/info.json'
    );

    public static function get_plugin_file() {
        if (defined('NEXAGUARD_FILE')) {
            return plugin_basename(NEXAGUARD_FILE);
        }
        return plugin_basename(dirname(dirname(__FILE__)) . '/nexaguard-security.php');
    }

    public static function get_plugin_slug() {
        $file = self::get_plugin_file();
        $dir = dirname($file);
        return ($dir === '.' || empty($dir)) ? 'nexaguard-security' : $dir;
    }

    public static function init() {
        // Hooks nativos del gestor de actualizaciones de WordPress (tanto en lectura como en guardado)
        add_filter('site_transient_update_plugins', array(__CLASS__, 'check_update'));
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
    public static function get_remote_info($force = false, &$error = null) {
        $transient_key = 'nexaguard_update_info';
        if (!$force) {
            $cached = get_transient($transient_key);
            if ($cached !== false && is_object($cached) && !empty($cached->version)) {
                return $cached;
            }
        }

        $data = null;
        $last_err = '';
        foreach (self::$remote_urls as $url) {
            // Anti-caché con timestamp para forzar que CDN (Fastly de raw.githubusercontent.com) no sirva datos viejos
            $fetch_url = $force ? add_query_arg('t', time(), $url) : $url;
            $res = wp_remote_get($fetch_url, array(
                'timeout' => 8,
                'sslverify' => false,
                'headers' => array(
                    'Accept' => 'application/json',
                    'User-Agent' => 'WordPress/' . get_bloginfo('version') . '; NexaGuard/' . (defined('NEXAGUARD_VERSION') ? NEXAGUARD_VERSION : '1.0.0')
                )
            ));

            if (is_wp_error($res)) {
                $last_err = $res->get_error_message();
                continue;
            }

            $code = wp_remote_retrieve_response_code($res);
            if ($code === 200) {
                $body = wp_remote_retrieve_body($res);
                $json = json_decode($body);
                if ($json && !empty($json->version)) {
                    $data = $json;
                    break;
                } else {
                    $last_err = 'JSON recibido no contiene versión válida';
                }
            } else {
                $last_err = 'Respuesta HTTP ' . $code;
            }
        }

        if ($data) {
            set_transient($transient_key, $data, 1 * HOUR_IN_SECONDS);
            return $data;
        }

        $error = $last_err;
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

        $plugin_file = self::get_plugin_file();
        $plugin_slug = self::get_plugin_slug();
        $current_ver = defined('NEXAGUARD_VERSION') ? NEXAGUARD_VERSION : '1.0.0';
        $download_url = !empty($remote->download_url) ? $remote->download_url : (!empty($remote->fallback_download_url) ? $remote->fallback_download_url : '');

        if (version_compare($remote->version, $current_ver, '>')) {
            $item = new stdClass();
            $item->id = $plugin_file;
            $item->slug = $plugin_slug;
            $item->plugin = $plugin_file;
            $item->new_version = $remote->version;
            $item->url = !empty($remote->homepage) ? $remote->homepage : 'https://www.nexaguards.com';
            $item->package = $download_url;
            $item->icons = array(
                'default' => 'https://www.nexaguards.com/assets/favicon.png'
            );
            $item->banners = array();
            $item->tested = !empty($remote->tested) ? $remote->tested : '6.7';
            $item->requires_php = !empty($remote->requires_php) ? $remote->requires_php : '7.4';

            if (!isset($transient->response)) {
                $transient->response = array();
            }
            $transient->response[$plugin_file] = $item;
            if (isset($transient->no_update[$plugin_file])) {
                unset($transient->no_update[$plugin_file]);
            }
        } else {
            $item = new stdClass();
            $item->id = $plugin_file;
            $item->slug = $plugin_slug;
            $item->plugin = $plugin_file;
            $item->new_version = $current_ver;
            $item->url = 'https://www.nexaguards.com';
            $item->package = '';

            if (!isset($transient->no_update)) {
                $transient->no_update = array();
            }
            $transient->no_update[$plugin_file] = $item;
            if (isset($transient->response[$plugin_file])) {
                unset($transient->response[$plugin_file]);
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

        $plugin_slug = self::get_plugin_slug();
        if (!isset($args->slug) || ($args->slug !== $plugin_slug && $args->slug !== 'nexaguard-security')) {
            return $res;
        }

        $remote = self::get_remote_info();
        if (!$remote) {
            return $res;
        }

        $download_url = !empty($remote->download_url) ? $remote->download_url : (!empty($remote->fallback_download_url) ? $remote->fallback_download_url : '');

        $info = new stdClass();
        $info->name = !empty($remote->name) ? $remote->name : 'NexaGuard Security';
        $info->slug = $plugin_slug;
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
     * Asegura que el directorio del plugin conserve siempre el nombre del slug correcto
     */
    public static function fix_source_folder($source, $remote_source, $upgrader, $hook_extra = array()) {
        global $wp_filesystem;

        $plugin_file = self::get_plugin_file();
        $plugin_slug = self::get_plugin_slug();

        if (isset($hook_extra['plugin']) && $hook_extra['plugin'] === $plugin_file) {
            $correct_dir = trailingslashit($remote_source) . $plugin_slug;
            $clean_source = untrailingslashit($source);
            $clean_correct = untrailingslashit($correct_dir);
            if ($clean_source !== $clean_correct && $wp_filesystem && $wp_filesystem->exists($source)) {
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
        if (!check_ajax_referer('nexaguard_security_nonce', 'nonce', false) && !check_ajax_referer('nexaguard_admin_nonce', 'nonce', false)) {
            wp_send_json_error(array('message' => 'Token de seguridad caducado. Por favor recarga la página.'));
        }

        if (!current_user_can('manage_options')) {
            wp_send_json_error(array('message' => 'No tienes permisos suficientes.'));
        }

        // Limpiar transient en caché para forzar consulta en vivo
        delete_transient('nexaguard_update_info');

        $err = '';
        $remote = self::get_remote_info(true, $err);
        if (!$remote || empty($remote->version)) {
            $err_msg = !empty($err) ? ' (' . $err . ')' : '';
            wp_send_json_error(array('message' => 'No se pudo conectar con los servidores de NexaGuard Cloud' . $err_msg));
        }

        $current_ver = defined('NEXAGUARD_VERSION') ? NEXAGUARD_VERSION : '1.0.0';
        $has_update = version_compare($remote->version, $current_ver, '>');

        // Actualizar el transient de WordPress inmediatamente sin esperas lentas externas
        $plugin_transient = get_site_transient('update_plugins');
        if (!is_object($plugin_transient)) {
            $plugin_transient = new stdClass();
        }
        $plugin_transient = self::check_update($plugin_transient);
        set_site_transient('update_plugins', $plugin_transient);

        wp_send_json_success(array(
            'current_version' => $current_ver,
            'remote_version' => $remote->version,
            'has_update' => $has_update,
            'changelog' => !empty($remote->sections->changelog) ? $remote->sections->changelog : '',
            'message' => $has_update 
                ? '¡Nueva versión v' . esc_html($remote->version) . ' disponible!'
                : 'Tienes instalada la última versión disponible (' . esc_html($current_ver) . ').'
        ));
    }

    /**
     * AJAX: Ejecutar la actualización en vivo sin salir del panel
     */
    public static function ajax_perform_update() {
        if (!check_ajax_referer('nexaguard_security_nonce', 'nonce', false) && !check_ajax_referer('nexaguard_admin_nonce', 'nonce', false)) {
            wp_send_json_error(array('message' => 'Token de seguridad caducado. Por favor recarga la página.'));
        }

        if (!current_user_can('update_plugins')) {
            wp_send_json_error(array('message' => 'No tienes permisos para actualizar plugins.'));
        }

        include_once ABSPATH . 'wp-admin/includes/class-wp-upgrader.php';
        include_once ABSPATH . 'wp-admin/includes/plugin-install.php';
        include_once ABSPATH . 'wp-admin/includes/plugin.php';
        include_once ABSPATH . 'wp-admin/includes/file.php';

        $remote = self::get_remote_info(true);
        if (!$remote || empty($remote->version)) {
            wp_send_json_error(array('message' => 'No se pudo obtener la información de la actualización.'));
        }

        $plugin_file = self::get_plugin_file();
        $plugin_slug = self::get_plugin_slug();
        $download_url = !empty($remote->download_url) ? $remote->download_url : (!empty($remote->fallback_download_url) ? $remote->fallback_download_url : '');

        if (empty($download_url)) {
            wp_send_json_error(array('message' => 'No se encontró la URL de descarga del paquete.'));
        }

        // Inyectamos el paquete explícitamente en el transient de WordPress antes de invocar la actualización
        $plugin_transient = get_site_transient('update_plugins');
        if (!is_object($plugin_transient)) {
            $plugin_transient = new stdClass();
        }
        if (!isset($plugin_transient->response)) {
            $plugin_transient->response = array();
        }

        $item = new stdClass();
        $item->id = $plugin_file;
        $item->slug = $plugin_slug;
        $item->plugin = $plugin_file;
        $item->new_version = $remote->version;
        $item->url = !empty($remote->homepage) ? $remote->homepage : 'https://www.nexaguards.com';
        $item->package = $download_url;
        $plugin_transient->response[$plugin_file] = $item;
        set_site_transient('update_plugins', $plugin_transient);

        $skin = new WP_Ajax_Upgrader_Skin();
        $upgrader = new Plugin_Upgrader($skin);
        $result = $upgrader->upgrade($plugin_file);

        if (is_wp_error($result)) {
            wp_send_json_error(array('message' => $result->get_error_message()));
        } elseif ($result === false) {
            $error_messages = array();
            if ($skin->get_errors() && $skin->get_errors()->has_errors()) {
                $error_messages = $skin->get_errors()->get_error_messages();
            }
            $err_txt = !empty($error_messages) ? implode(' ', $error_messages) : 'La actualización no pudo completarse. Comprueba los permisos de escritura del servidor.';
            wp_send_json_error(array('message' => $err_txt));
        }

        // Reactivar el plugin para asegurar continuidad operativa
        activate_plugin($plugin_file);

        // Limpiar transient tras actualización exitosa
        delete_transient('nexaguard_update_info');

        wp_send_json_success(array(
            'message' => '¡NexaGuard Security se ha actualizado con éxito a la versión ' . esc_html($remote->version) . '!',
            'version' => $remote->version
        ));
    }
}
