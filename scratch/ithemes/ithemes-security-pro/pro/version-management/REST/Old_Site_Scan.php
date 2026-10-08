<?php

namespace iThemesSecurity\Version_Management\REST;

class Old_Site_Scan extends \WP_REST_Controller {
	protected $namespace = 'ithemes-security/v1';
	protected $rest_base = 'version-management/old-site-scan';

	public function register_routes() {
		register_rest_route( $this->namespace, $this->rest_base, [
			'methods'             => \WP_REST_Server::CREATABLE,
			'callback'            => [ $this, 'create_item' ],
			'permission_callback' => 'ITSEC_Core::current_user_can_manage',
		] );
		register_rest_route( $this->namespace, $this->rest_base . '/(?P<id>[a-f0-9]+)/mute', [
			'methods'             => \WP_REST_Server::CREATABLE,
			'callback'            => [ $this, 'mute_issue' ],
			'permission_callback' => 'ITSEC_Core::current_user_can_manage',
		] );
		register_rest_route( $this->namespace, $this->rest_base . '/(?P<id>[a-f0-9]+)/unmute', [
			'methods'             => \WP_REST_Server::CREATABLE,
			'callback'            => [ $this, 'unmute_issue' ],
			'permission_callback' => 'ITSEC_Core::current_user_can_manage',
		] );
	}

	public function create_item( $request ) {
		$sites  = \ITSEC_VM_Old_Site_Scanner::run_scan();
		$issues = [];

		foreach ( $sites as $path => $site ) {
			$site['path'] = $path;

			$issues[] = $this->prepare_response_for_collection(
				$this->prepare_item_for_response( $site, $request )
			);
		}

		return new \WP_REST_Response( $issues );
	}

	public function mute_issue( \WP_REST_Request $request ) {
		$details = \ITSEC_Modules::get_setting( 'version-management', 'old_site_details' );

		foreach ( $details['sites'] as $path => $site ) {
			if ( md5( $path ) === $request['id'] ) {
				$site['is_muted'] = true;

				$details['sites'][ $path ] = $site;
				\ITSEC_Modules::set_setting( 'version-management', 'old_site_details', $details );

				$site['path'] = $path;

				return $this->prepare_item_for_response( $site, $request );
			}
		}

		return new \WP_Error(
			'rest_not_found',
			__( 'Issue not found.', 'it-l10n-ithemes-security-pro' ),
			[ 'status' => \WP_Http::NOT_FOUND ]
		);
	}

	public function unmute_issue( \WP_REST_Request $request ) {
		$details = \ITSEC_Modules::get_setting( 'version-management', 'old_site_details' );

		foreach ( $details['sites'] as $path => $site ) {
			if ( md5( $path ) === $request['id'] ) {
				$site['is_muted'] = false;

				$details['sites'][ $path ] = $site;
				\ITSEC_Modules::set_setting( 'version-management', 'old_site_details', $details );

				$site['path'] = $path;

				return $this->prepare_item_for_response( $site, $request );
			}
		}

		return new \WP_Error(
			'rest_not_found',
			__( 'Issue not found.', 'it-l10n-ithemes-security-pro' ),
			[ 'status' => \WP_Http::NOT_FOUND ]
		);
	}

	/**
	 * Prepares an old site for response.
	 *
	 * @param array            $item
	 * @param \WP_REST_Request $request
	 *
	 * @return \WP_Error|\WP_REST_Response
	 */
	public function prepare_item_for_response( $item, $request ) {
		$response = new \WP_REST_Response( [
			'id'          => md5( $item['path'] ),
			'component'   => 'old-site-scan',
			'title'       => $item['path'],
			'description' => sprintf(
			/* translators: 1. Version number. */
				__( 'The site is running an outdated version of WordPress, v%s.', 'it-l10n-ithemes-security-pro' ),
				$item['version']
			),
			'severity'    => 'medium',
			'muted'       => ! empty( $item['is_muted'] ),
		] );

		if ( $response->get_data()['muted'] ) {
			$response->add_link(
				\ITSEC_Lib_REST::get_link_relation( 'unmute-issue' ),
				rest_url( sprintf( '%s/%s/%s/unmute', $this->namespace, $this->rest_base, md5( $item['path'] ) ) ),
				[
					'title' => __( 'Unmute Issue', 'it-l10n-ithemes-security-pro' )
				]
			);
		} else {
			$response->add_link(
				\ITSEC_Lib_REST::get_link_relation( 'mute-issue' ),
				rest_url( sprintf( '%s/%s/%s/mute', $this->namespace, $this->rest_base, md5( $item['path'] ) ) ),
				[
					'title' => __( 'Mute Issue', 'it-l10n-ithemes-security-pro' )
				]
			);
		}

		return $response;
	}
}
