<?php

namespace iThemesSecurity\Modules\Fingerprinting\REST;

final class Devices extends \WP_REST_Controller {

	const ID_PATTERN = '/(?P<id>[\\w_:-]+)';
	protected $namespace = 'ithemes-security/v1';
	protected $rest_base = 'trusted-devices' . '/(?P<user>[\d]+)';

	/** @var \ITSEC_Fingerprinting */
	private $fingerprinting;

	public function __construct( \ITSEC_Fingerprinting $fingerprinting ) { $this->fingerprinting = $fingerprinting; }

	public function register_routes() {
		register_rest_route( $this->namespace, $this->rest_base, [
			[
				'methods'             => \WP_REST_Server::READABLE,
				'callback'            => [ $this, 'get_items' ],
				'permission_callback' => [ $this, 'get_items_permissions_check' ],
				'args'                => array_merge(
					[
						'user' => [
							'type' => 'integer',
						],
					],
					$this->get_collection_params(),
				)
			],
			'schema' => [ $this, 'get_public_item_schema' ],
		] );
		register_rest_route( $this->namespace, $this->rest_base . '/current', [
			[
				'methods'             => \WP_REST_Server::READABLE,
				'callback'            => [ $this, 'get_current_item' ],
				'permission_callback' => 'is_user_logged_in',
				'args'                => [
					'user'    => [
						'type' => 'integer',
					],
					'context' => $this->get_context_param( [ 'default' => 'view' ] )
				],
			],
			'schema' => [ $this, 'get_public_item_schema' ],
		] );
		register_rest_route( $this->namespace, $this->rest_base . '/current/notify', [
			[
				'methods'             => \WP_REST_Server::CREATABLE,
				'callback'            => [ $this, 'notify_current_item' ],
				'permission_callback' => 'is_user_logged_in',
				'args'                => [
					'user'    => [
						'type' => 'integer',
					],
					'context' => $this->get_context_param( [ 'default' => 'view' ] )
				],
			],
			'schema' => [ $this, 'get_public_item_schema' ],
		] );
		register_rest_route( $this->namespace, $this->rest_base . self::ID_PATTERN, [
			[
				'methods'             => \WP_REST_Server::READABLE,
				'callback'            => [ $this, 'get_item' ],
				'permission_callback' => [ $this, 'get_item_permissions_check' ],
				'args'                => [
					'user'    => [
						'type' => 'integer',
					],
					'id'      => [
						'type' => 'string',
					],
					'context' => $this->get_context_param( [ 'default' => 'view' ] ),
				],
			],
			[
				'methods'             => 'PUT',
				'callback'            => [ $this, 'update_item' ],
				'permission_callback' => [ $this, 'update_item_permissions_check' ],
				'args'                => array_merge(
					[
						'user' => [
							'type' => 'integer',
						],
						'id'   => [
							'type' => 'string',
						],
					],
					$this->get_endpoint_args_for_item_schema( 'PUT' )
				),
			],
			'schema'      => [ $this, 'get_public_item_schema' ],
			'allow_batch' => [ 'v1' => true ],
		] );
	}

	public function get_items_permissions_check( $request ) {
		if ( ! \ITSEC_Core::current_user_can_manage() && get_current_user_id() !== $request['user'] ) {
			return new \WP_Error(
				'rest_cannot_view',
				__( 'Sorry, you are not allowed to view other trusted devices', 'it-l10n-ithemes-security-pro' ),
				[ 'status' => rest_authorization_required_code() ]
			);
		}

		if ( ! \ITSEC_Lib_Fingerprinting::is_current_fingerprint_safe() ) {
			return new \WP_Error(
				'rest_solid_unknown_device',
				__( 'Sorry, you cannot manage trusted devices from an unknown device.', 'it-l10n-ithemes-security-pro' ),
				[ 'status' => \WP_Http::FORBIDDEN ]
			);
		}

		return true;
	}

	public function get_items( $request ) {
		$data = [];
		$user = get_userdata( $request['user'] );

		if ( ! $user ) {
			return new \WP_Error(
				'rest_not_found',
				__( 'Sorry, that user does not exist', 'it-l10n-ithemes-security-pro' ),
				[ 'status' => \WP_Http::NOT_FOUND ]
			);
		}

		$args = [
			'per_page'         => $request['per_page'],
			'page'             => $request['page'],
			'status'           => $request['status'],
			'last_seen_before' => rest_parse_date( $request['last_seen_before'] ),
			'last_seen_after'  => rest_parse_date( $request['last_seen_after'] ),
			'search'           => $request['search'],
		];

		$results = \ITSEC_Fingerprint::get_all_for_user( $user, $args );

		foreach ( $results as $result ) {
			$data[] = $this->prepare_response_for_collection( $this->prepare_item_for_response( $result, $request ) );
		}

		$count = \ITSEC_Fingerprint::count_all_for_user( $user, $args );

		$response = new \WP_REST_Response( $data );

		if ( ! is_wp_error( $count ) ) {
			\ITSEC_Lib_REST::paginate( $request, $response, $count, $this->namespace . '/trusted-devices/' . $user->ID );
		}

		return $response;
	}

	public function get_item_permissions_check( $request ) {
		if ( ! \ITSEC_Core::current_user_can_manage() && get_current_user_id() !== $request['user'] ) {
			return new \WP_Error(
				'rest_cannot_view',
				__( 'Sorry, you are not allowed to view other trusted devices', 'it-l10n-ithemes-security-pro' ),
				[ 'status' => rest_authorization_required_code() ]
			);
		}

		if ( ! \ITSEC_Lib_Fingerprinting::is_current_fingerprint_safe() ) {
			return new \WP_Error(
				'rest_solid_unknown_device',
				__( 'Sorry, you cannot manage trusted devices from an unknown device.', 'it-l10n-ithemes-security-pro' ),
				[ 'status' => \WP_Http::FORBIDDEN ]
			);
		}

		return true;
	}

	public function get_item( $request ) {
		$user = get_userdata( $request['user'] );

		if ( ! $user ) {
			return new \WP_Error(
				'rest_not_found',
				__( 'Sorry, that user does not exist', 'it-l10n-ithemes-security-pro' ),
				[ 'status' => \WP_Http::NOT_FOUND ]
			);
		}

		$trusted_device = \ITSEC_Fingerprint::get_by_uuid( $request['id'] );

		if ( ! $trusted_device ) {
			return new \WP_Error(
				'rest_not_found',
				__( 'Sorry, that device does not exist', 'it-l10n-ithemes-security-pro' ),
				[ 'status' => \WP_Http::NOT_FOUND ]
			);
		}

		if ( $user->ID !== $trusted_device->get_user()->ID ) {
			return new \WP_Error(
				'rest_cannot_view',
				__( 'Sorry you are not allowed to view that trusted device', 'it-l10n-ithemes-security-pro' ),
				[ 'status' => \WP_Http::FORBIDDEN ]
			);
		}

		return $this->prepare_item_for_response( $trusted_device, $request );
	}

	public function get_current_item( \WP_REST_Request $request ) {
		if ( $request['user'] !== get_current_user_id() ) {
			return new \WP_Error(
				'rest_not_found',
				__( 'The current device was not found.', 'it-l10n-ithemes-security-pro' ),
				[ 'status' => \WP_Http::NOT_FOUND ]
			);
		}

		$device = \ITSEC_Lib_Fingerprinting::get_current_fingerprint();

		if ( ! $device ) {
			return new \WP_REST_Response( null, \WP_Http::NO_CONTENT );
		}

		return $this->prepare_item_for_response( $device, $request );
	}

	public function notify_current_item( \WP_REST_Request $request ) {
		if ( $request['user'] !== get_current_user_id() ) {
			return new \WP_Error(
				'rest_not_found',
				__( 'The current device was not found.', 'it-l10n-ithemes-security-pro' ),
				[ 'status' => \WP_Http::NOT_FOUND ]
			);
		}

		$device = \ITSEC_Lib_Fingerprinting::get_current_fingerprint();

		if ( ! $device ) {
			return new \WP_Error(
				'rest_not_found',
				__( 'The current device was not found.', 'it-l10n-ithemes-security-pro' ),
				[ 'status' => \WP_Http::NOT_FOUND ]
			);
		}

		if ( ! $device->can_change_status() ) {
			return new \WP_Error(
				'rest_solid_cannot_change_status',
				__( 'Sorry, this device can no longer be modified.', 'it-l10n-ithemes-security-pro' ),
				[ 'status' => \WP_Http::BAD_REQUEST ]
			);
		}

		if ( ! $this->fingerprinting->send_unrecognized_login( $device ) ) {
			return new \WP_Error(
				'rest_solid_send_notification_failed',
				__( 'Sorry, we could not send an email notification. Please try again later.', 'it-l10n-ithemes-security-pro' ),
				[ 'status' => \WP_Http::INTERNAL_SERVER_ERROR ]
			);
		}

		return new \WP_REST_Response( null, \WP_Http::NO_CONTENT );
	}

	public function update_item_permissions_check( $request ) {
		if ( ! \ITSEC_Core::current_user_can_manage() && get_current_user_id() !== $request['user'] ) {
			return new \WP_Error(
				'rest_cannot_update',
				__( 'Sorry, you are not allowed to update other trusted devices', 'it-l10n-ithemes-security-pro' ),
				[ 'status' => rest_authorization_required_code() ]
			);
		}

		if ( ! \ITSEC_Lib_Fingerprinting::is_current_fingerprint_safe() ) {
			return new \WP_Error(
				'rest_solid_unknown_device',
				__( 'Sorry, you cannot manage trusted devices from an unknown device.', 'it-l10n-ithemes-security-pro' ),
				[ 'status' => \WP_Http::FORBIDDEN ]
			);
		}

		return true;
	}

	public function update_item( $request ) {
		$user = get_userdata( $request['user'] );

		if ( ! $user ) {
			return new \WP_Error(
				'rest_not_found',
				__( 'Sorry, that user does not exist', 'it-l10n-ithemes-security-pro' ),
				[ 'status' => \WP_Http::NOT_FOUND ]
			);
		}

		$trusted_device = \ITSEC_Fingerprint::get_by_uuid( $request['id'] );

		if ( ! $trusted_device ) {
			return new \WP_Error(
				'rest_not_found',
				__( 'Sorry, that device does not exist', 'it-l10n-ithemes-security-pro' ),
				[ 'status' => \WP_Http::NOT_FOUND ]
			);
		}

		if ( ! $trusted_device->can_change_status() ) {
			return new \WP_Error(
				'rest_action_forbidden',
				__( 'Sorry, this device cannot be updated', 'it-l10n-ithemes-security-pro' ),
				[ 'status' => \WP_Http::FORBIDDEN ]
			);
		}

		$new_status = $request['status']['raw'];

		switch ( $new_status ) {
			case 'approved':
				$trusted_device->approve();
				break;
			case 'denied':
				$trusted_device->deny();
				break;
			case 'ignored':
				$trusted_device->ignore();
				break;
			default:
				return new \WP_Error(
					'rest_action_forbidden',
					__( 'Cannot update trusted_device status', 'it-l10n-ithemes-security-pro' ),
					[ 'status' => \WP_Http::FORBIDDEN ]
				);
		}

		return $this->prepare_item_for_response( $trusted_device, $request );
	}

	private function translate_item_rendered_string( $status ) {
		switch ( $status ) {
			case 'approved':
				return __( 'Approved', 'it-l10n-ithemes-security-pro' );
			case 'auto-approved':
				return __( 'Auto-Approved', 'it-l10n-ithemes-security-pro' );
			case 'pending-auto-approve':
				return __( 'Pending-Auto-Approve', 'it-l10n-ithemes-security-pro' );
			case 'pending':
				return __( 'Pending', 'it-l10n-ithemes-security-pro' );
			case 'ignored':
				return __( 'Ignored', 'it-l10n-ithemes-security-pro' );
			case 'denied':
				return __( 'Denied', 'it-l10n-ithemes-security-pro' );
		}
	}

	public function prepare_item_for_response( $item, $request ): \WP_REST_Response {
		if ( ! $item instanceof \ITSEC_Fingerprint ) {
			return new \WP_REST_Response();
		}

		$approved_at = '';

		if ( $item->get_approved_at() ) {
			$approved_at = mysql_to_rfc3339( $item->get_approved_at()->format( 'Y-m-d H:i:s' ) );
		}

		$fingerprint_info = \ITSEC_Fingerprinting::get_fingerprint_info( $item, array(
			'maps' => in_array( 'maps', wp_parse_slug_list( $request['_fields'] ) ),
		) );

		$data = [
			'id'              => $item->get_uuid(),
			'status'          => [
				'raw'      => $item->get_status(),
				'rendered' => $this->translate_item_rendered_string( $item->get_status() ),
			],
			'uses'            => (int) $item->get_uses(),
			'created_at'      => mysql_to_rfc3339( $item->get_created_at()->format( 'Y-m-d H:i:s' ) ),
			'last_seen'       => mysql_to_rfc3339( $item->get_last_seen()->format( 'Y-m-d H:i:s' ) ),
			'approved_at'     => $approved_at,
			'location'        => $fingerprint_info['location'],
			'ip'              => $fingerprint_info['ip'],
			'browser'         => $fingerprint_info['browser'],
			'browser_version' => $fingerprint_info['browser_ver'],
			'platform'        => $fingerprint_info['platform'],
		];

		$maps = array_filter( [
			'small'  => $fingerprint_info['map-small'],
			'medium' => $fingerprint_info['map-medium'],
			'large'  => $fingerprint_info['map-large'],
		] );

		if ( $maps ) {
			$data['maps'] = $maps;
		}

		$response = new \WP_REST_Response( $data );
		$response->add_links( $this->prepare_links( $item ) );

		return $response;
	}

	protected function prepare_links( \ITSEC_Fingerprint $fingerprint ): array {
		return [
			'self' => [
				'href' => rest_url( sprintf(
					'%s/trusted-devices/%d/%s',
					$this->namespace,
					$fingerprint->get_user()->ID,
					$fingerprint->get_uuid(),
				) ),
			],
		];
	}

	public function get_collection_params() {
		$params = parent::get_collection_params();

		$params['context']['default'] = 'view';
		$params['status']             = [
			'type'  => 'array',
			'items' => [
				'type' => 'string',
				'enum' => [
					\ITSEC_Fingerprint::S_APPROVED,
					\ITSEC_Fingerprint::S_AUTO_APPROVED,
					\ITSEC_Fingerprint::S_PENDING_AUTO_APPROVE,
					\ITSEC_Fingerprint::S_PENDING,
					\ITSEC_Fingerprint::S_IGNORED,
					\ITSEC_Fingerprint::S_DENIED,
				],
			],
		];
		$params['last_seen_before']   = [
			'type'   => 'string',
			'format' => 'date-time',
		];
		$params['last_seen_after']    = [
			'type'   => 'string',
			'format' => 'date-time',
		];

		return $params;
	}

	public function get_item_schema() {
		if ( $this->schema ) {
			return $this->schema;
		}

		$this->schema = [
			'type'       => 'object',
			'properties' => [
				'status' => [
					'type'                 => 'object',
					'additionalProperties' => false,
					'properties'           => [
						'raw'      => [
							'type' => 'string',
							'enum' => [
								\ITSEC_Fingerprint::S_APPROVED,
								\ITSEC_Fingerprint::S_AUTO_APPROVED,
								\ITSEC_Fingerprint::S_PENDING_AUTO_APPROVE,
								\ITSEC_Fingerprint::S_PENDING,
								\ITSEC_Fingerprint::S_IGNORED,
								\ITSEC_Fingerprint::S_DENIED,
							]
						],
						'rendered' => [
							'type' => 'string',
						]
					]
				],
				'maps'   => [
					'readonly'   => true,
					'type'       => 'object',
					'context'    => [ 'view', 'edit' ],
					'properties' => [
						'small'  => [
							'type'   => 'string',
							'format' => 'uri',
						],
						'medium' => [
							'type'   => 'string',
							'format' => 'uri',
						],
						'large'  => [
							'type'   => 'string',
							'format' => 'uri',
						],
					],
				],
			],
		];

		return $this->schema;
	}
}
