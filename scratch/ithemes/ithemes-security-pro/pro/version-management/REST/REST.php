<?php

namespace iThemesSecurity\Version_Management\REST;

use iThemesSecurity\Contracts\Runnable;

class REST implements Runnable {

	private $controllers;

	public function __construct( \WP_REST_Controller ...$controllers ) { $this->controllers = $controllers; }

	public function run() {
		add_action( 'rest_api_init', [ $this, 'register_routes' ] );
	}

	public function register_routes() {
		foreach ( $this->controllers as $controller ) {
			$controller->register_routes();
		}

		register_rest_route( 'ithemes-security/rpc', '/version-management/packages', [
			'callback'            => [ $this, 'get_packages' ],
			'permission_callback' => 'ITSEC_Core::current_user_can_manage',
		] );
	}

	public function get_packages(): array {
		if ( ! function_exists( 'get_plugins' ) ) {
			require_once ABSPATH . 'wp-admin/includes/plugin.php';
		}

		$packages = [];

		foreach ( get_plugins() as $file => $plugin ) {
			$packages[] = [
				'id'   => "plugin:{$file}",
				'name' => $plugin['Name'],
				'file' => $file,
				'kind' => 'plugin',
			];
		}

		foreach ( wp_get_themes() as $file => $theme ) {
			$packages[] = [
				'id'   => "theme:{$file}",
				'name' => $theme->get( 'Name' ),
				'file' => $file,
				'kind' => 'theme',
			];
		}

		return $packages;
	}
}
