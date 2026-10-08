<?php

namespace iThemesSecurity\Modules\Privilege\REST;

use iThemesSecurity\Contracts\Runnable;

class REST implements Runnable {
	public function run() {
		$roles      = [
			'editor',
			'administrator',
		];
		$role_names = [
			__( 'Editor', 'it-l10n-ithemes-security-pro' ),
			__( 'Administrator', 'it-l10n-ithemes-security-pro' ),
		];

		if ( is_multisite() ) {
			$roles[]      = 'super-admin';
			$role_names[] = __( 'Network Administrator', 'it-l10n-ithemes-security-pro' );
		}

		register_rest_field('user', 'solid_privilege', [
			'get_callback' => function ( $user ) {
				$role    = get_user_meta( $user['id'], 'itsec_privilege_role', true );
				$expires = get_user_meta( $user['id'], 'itsec_privilege_expires', true );

				if ( ! $role) {
					return null;
				}

				$role_key = [
					'1' => 'editor',
					'2' => 'administrator',
					'3' => 'super-admin',
				];

				return [
					'role'    => $role_key[ $role ],
					'expires' => gmdate('Y-m-d\TH:i:s', $expires),
				];
			},
			'schema'       => [
				'type'       => ['object', 'null'],
				'properties' => [
					'role' => [
						'type'      => 'string',
						'enum'      => $roles,
						'enumNames' => $role_names,
						'context'   => ['edit'],
					],
				],
			],
		]);

		register_rest_route( 'ithemes-security/rpc', 'privilege/escalate', [
			'methods'             => \WP_REST_Server::CREATABLE,
			'callback'            => [ $this, 'escalate_callback' ],
			'permission_callback' => [ $this, 'escalate_permission_callback' ],
			'args'                => [
				'id'   => [
					'type'     => 'integer',
					'minimum'  => 0,
					'required' => true,
				],
				'role' => [
					'type'      => 'string',
					'required'  => true,
					'enum'      => $roles,
					'enumNames' => $role_names,
				],
				'days' => [
					'type'     => 'integer',
					'minimum'  => 0,
					'required' => true,
				],
			],
		] );

		register_rest_route( 'ithemes-security/rpc', 'privilege/clear', [
			'methods'             => \WP_REST_Server::CREATABLE,
			'callback'            => [ $this, 'clear_callback' ],
			'permission_callback' => [ $this, 'escalate_permission_callback' ],
			'args'                => [
				'id' => [
					'type'     => 'integer',
					'minimum'  => 0,
					'required' => true,
				],
			],
		] );
	}

	public function escalate_callback( \WP_REST_Request $request ) {
		$user = get_userdata( $request['id'] );

		if ( ! $user ) {
			return new \WP_Error(
				'itsec.privilege.rest.invalid-user',
				__( 'User not found.', 'it-l10n-ithemes-security-pro' ),
				array( 'status' => \WP_Http::BAD_REQUEST )
			);
		}

		switch ( $request['role'] ) {
			case 'editor':
				$role = '1';
				break;
			case 'administrator':
				$role = '2';
				break;
			case 'super-admin':
				$role = '3';
				break;
			default:
				// Can't happen due to schema validation.
				return new \WP_Error();
		}

		$exp = (string) ( \ITSEC_Core::get_current_time_gmt() + DAY_IN_SECONDS * $request['days'] );

		if ( get_user_meta( $user->ID, 'itsec_privilege_role', true ) !== $role ) {
			if ( ! update_user_meta( $user->ID, 'itsec_privilege_role', $role ) ) {
				return new \WP_Error(
					'itsec.privilege.rest.cannot-save',
					__( 'Sorry, the user could not be escalated.', 'it-l10n-ithemes-security-pro' ),
					[ 'status' => \WP_Http::INTERNAL_SERVER_ERROR ]
				);
			}
		}

		if ( get_user_meta( $user->ID, 'itsec_privilege_expires', true ) !== $exp ) {
			if ( ! update_user_meta( $user->ID, 'itsec_privilege_expires', $exp ) ) {
				return new \WP_Error(
					'itsec.privilege.rest.cannot-save',
					__( 'Sorry, the user could not be escalated.', 'it-l10n-ithemes-security-pro' ),
					[ 'status' => \WP_Http::INTERNAL_SERVER_ERROR ]
				);
			}
		}

		\ITSEC_Core::get_notification_center()->enqueue_data( 'digest', array(
			'type'         => 'privilege-escalation',
			'role'         => $role,
			'time'         => \ITSEC_Core::get_current_time_gmt(),
			'expires'      => $exp,
			'user_id'      => $user->ID,
			'username'     => $user->user_login, // Track username as user might be deleted by time digest sends.
			'performed_by' => get_current_user_id(),
		), false );

		return new \WP_REST_Response( null, \WP_Http::NO_CONTENT );
	}

	public function clear_callback( \WP_REST_Request $request ) {
		$user = get_userdata( $request['id'] );

		if ( ! $user ) {
			return new \WP_Error(
				'itsec.privilege.rest.invalid-user',
				__( 'User not found.', 'it-l10n-ithemes-security-pro' ),
				array( 'status' => \WP_Http::BAD_REQUEST )
			);
		}

		delete_user_meta( $user->ID, 'itsec_privilege_role' );
		delete_user_meta( $user->ID, 'itsec_privilege_expires' );

		return new \WP_REST_Response( null, \WP_HTTP::NO_CONTENT );
	}

	public function escalate_permission_callback( \WP_REST_Request $request ) {
		if ( ! \ITSEC_Core::current_user_can_manage() ) {
			return new \WP_Error(
				'itsec.privilege.rest.cannot-manage',
				__( 'Sorry, you are not allowed to manage Solid Security.', 'it-l10n-ithemes-security-pro' ),
				[ 'status' => rest_authorization_required_code() ]
			);
		}

		if ( ! current_user_can( 'promote_users' ) ) {
			return new \WP_Error(
				'itsec.privilege.rest.cannot-promote',
				__( 'Sorry, you are not allowed to escalate users.', 'it-l10n-ithemes-security-pro' ),
				[ 'status' => rest_authorization_required_code() ]
			);
		}

		if ( $request['id'] && ! current_user_can( 'promote_user', $request['id'] ) ) {
			return new \WP_Error(
				'itsec.privilege.rest.cannot-promote-user',
				__( 'Sorry, you are not allowed to escalate this user.', 'it-l10n-ithemes-security-pro' ),
				[ 'status' => rest_authorization_required_code() ]
			);
		}

		return true;
	}
}
