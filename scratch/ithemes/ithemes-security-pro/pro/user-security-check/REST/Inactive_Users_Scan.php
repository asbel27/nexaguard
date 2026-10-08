<?php

namespace iThemesSecurity\User_Security_Check\REST;

class Inactive_Users_Scan extends \WP_REST_Controller {

	protected $namespace = 'ithemes-security/v1';
	protected $rest_base = 'user-security-check/inactive-users-scan';

	public function register_routes() {
		register_rest_route( $this->namespace, $this->rest_base, [
			'callback'            => [ $this, 'get_items' ],
			'permission_callback' => 'ITSEC_Core::current_user_can_manage',
		] );
		register_rest_route( $this->namespace, $this->rest_base . '/(?P<id>[\d]+)/mute', [
			'methods'             => \WP_REST_Server::CREATABLE,
			'callback'            => [ $this, 'mute_issue' ],
			'permission_callback' => 'ITSEC_Core::current_user_can_manage',
		] );
		register_rest_route( $this->namespace, $this->rest_base . '/(?P<id>[\d]+)/unmute', [
			'methods'             => \WP_REST_Server::CREATABLE,
			'callback'            => [ $this, 'unmute_issue' ],
			'permission_callback' => 'ITSEC_Core::current_user_can_manage',
		] );
		register_rest_route( $this->namespace, $this->rest_base . '/(?P<id>[\d]+)/demote', [
			'methods'             => \WP_REST_Server::CREATABLE,
			'callback'            => [ $this, 'demote_user' ],
			'permission_callback' => [ $this, 'demote_user_permissions_check' ],
		] );
	}

	/**
	 * Runs a scan for inactive users.
	 *
	 * @param \WP_REST_Request $request
	 *
	 * @return \WP_Error|\WP_REST_Response
	 */
	public function get_items( $request ) {
		$users  = \ITSEC_User_Security_Check_Utility::get_inactive_users( true, true );
		$issues = [];

		foreach ( $users as $user ) {
			$issues[] = $this->prepare_response_for_collection(
				$this->prepare_item_for_response( $user, $request )
			);
		}

		return new \WP_REST_Response( $issues );
	}

	public function mute_issue( \WP_REST_Request $request ) {
		if ( ! $user = get_userdata( $request['id'] ) ) {
			return new \WP_Error(
				'rest_not_found',
				__( 'Issue not found.', 'it-l10n-ithemes-security-pro' ),
				[ 'status' => \WP_Http::NOT_FOUND ]
			);
		}

		update_user_meta( $user->ID, '_solid_activity_ignore', [
			'user' => get_current_user_id(),
			'time' => \ITSEC_Core::get_current_time_gmt(),
		] );

		return $this->prepare_item_for_response( $user, $request );
	}

	public function unmute_issue( \WP_REST_Request $request ) {
		if ( ! $user = get_userdata( $request['id'] ) ) {
			return new \WP_Error(
				'rest_not_found',
				__( 'Issue not found.', 'it-l10n-ithemes-security-pro' ),
				[ 'status' => \WP_Http::NOT_FOUND ]
			);
		}

		delete_user_meta( $user->ID, '_solid_activity_ignore' );

		return $this->prepare_item_for_response( $user, $request );
	}

	public function demote_user( \WP_REST_Request $request ) {
		if ( ! $user = get_userdata( $request['id'] ) ) {
			return new \WP_Error(
				'rest_not_found',
				__( 'Issue not found.', 'it-l10n-ithemes-security-pro' ),
				[ 'status' => \WP_Http::NOT_FOUND ]
			);
		}

		$to_remove = \ITSEC_Lib_Canonical_Roles::get_real_roles_for_canonical( 'administrator', 'editor' );

		foreach ( $to_remove as $role ) {
			$user->remove_role( $role );
		}

		$user->add_role( 'author' );
	}

	public function demote_user_permissions_check( \WP_REST_Request $request ) {
		return \ITSEC_Core::current_user_can_manage() && current_user_can( 'promote_user', $request['id'] );
	}

	/**
	 * Prepares a user for response.
	 *
	 * @param \WP_User         $item
	 * @param \WP_REST_Request $request
	 *
	 * @return \WP_Error|\WP_REST_Response
	 */
	public function prepare_item_for_response( $item, $request ) {
		$days = \ITSEC_User_Security_Check_Utility::get_inactive_user_days();

		$response = new \WP_REST_Response( [
			'id'          => $item->ID,
			'component'   => 'inactive-users',
			'title'       => $item->display_name,
			'description' => wp_sprintf(
			/* translators: 1. User display name. 2. Number of days. 3. Role name. */
				_n(
					'%1$s has been inactive for %2$s day and has the %3$l role.',
					'%1$s has been inactive for %2$s days and has the %3$l role.',
					$days,
					'it-l10n-ithemes-security-pro'
				),
				$item->display_name,
				number_format_i18n( $days ),
				array_map( function ( $role ) {
					if ( isset( wp_roles()->role_names[ $role ] ) ) {
						return translate_user_role( wp_roles()->role_names[ $role ] );
					}

					return $role;
				}, $item->roles )
			),
			'severity'    => 'low',
			'meta'        => [
				'roles' => $item->roles,
			],
			'muted'       => (bool) get_user_meta( $item->ID, '_solid_activity_ignore', true ),
		] );

		if ( current_user_can( 'promote_user', $item->ID ) && get_role( 'author' ) ) {
			$response->add_link(
				\ITSEC_Lib_REST::get_link_relation( 'demote-user' ),
				rest_url( sprintf( '%s/%s/%d/demote', $this->namespace, $this->rest_base, $item->ID ) ),
				[
					'title'    => __( 'Demote to Author', 'it-l10n-ithemes-security-pro' ),
					'snackbar' => __( 'User demoted to Author', 'it-l10n-ithemes-security-pro' ),
				]
			);
		}

		if ( $response->get_data()['muted'] ) {
			$response->add_link(
				\ITSEC_Lib_REST::get_link_relation( 'unmute-issue' ),
				rest_url( sprintf( '%s/%s/%d/unmute', $this->namespace, $this->rest_base, $item->ID ) ),
				[
					'title' => __( 'Unmute Issue', 'it-l10n-ithemes-security-pro' )
				]
			);
		} else {
			$response->add_link(
				\ITSEC_Lib_REST::get_link_relation( 'mute-issue' ),
				rest_url( sprintf( '%s/%s/%d/mute', $this->namespace, $this->rest_base, $item->ID ) ),
				[
					'title' => __( 'Mute Issue', 'it-l10n-ithemes-security-pro' )
				]
			);
		}

		return $response;
	}
}
