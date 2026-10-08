<?php

namespace iThemesSecurity\WebAuthn\REST;

use iThemesSecurity\User_Groups;
use iThemesSecurity\WebAuthn\DTO\AuthenticatorAttachment;
use iThemesSecurity\WebAuthn\DTO\AuthenticatorSelectionCriteria;
use iThemesSecurity\WebAuthn\DTO\BinaryString;
use iThemesSecurity\WebAuthn\DTO\PublicKeyCredential;
use iThemesSecurity\WebAuthn\DTO\PublicKeyCredentialUserEntity;
use iThemesSecurity\WebAuthn\DTO\ResidentKeyRequirement;
use iThemesSecurity\WebAuthn\DTO\UserVerificationRequirement;
use iThemesSecurity\WebAuthn\PublicKeyCredentialCreationOptions_Factory;
use iThemesSecurity\WebAuthn\PublicKeyCredentialUserEntity_Factory;
use iThemesSecurity\WebAuthn\RegistrationCeremony;
use iThemesSecurity\WebAuthn\Session_Storage;

final class RegisterCredential extends \WP_REST_Controller {

	/** @var RegistrationCeremony */
	private $ceremony;

	/** @var PublicKeyCredentialCreationOptions_Factory */
	private $options_factory;

	/** @var Session_Storage */
	private $session_storage;

	/** @var PublicKeyCredentialUserEntity_Factory */
	private $user_entity_factory;

	/** @var User_Groups\Matcher */
	private $matcher;

	public function __construct(
		RegistrationCeremony $ceremony,
		PublicKeyCredentialCreationOptions_Factory $options_factory,
		Session_Storage $session_storage,
		PublicKeyCredentialUserEntity_Factory $user_entity_factory,
		User_Groups\Matcher $matcher

	) {
		$this->namespace           = 'ithemes-security/rpc';
		$this->rest_base           = 'webauthn/register-credential';
		$this->ceremony            = $ceremony;
		$this->options_factory     = $options_factory;
		$this->session_storage     = $session_storage;
		$this->user_entity_factory = $user_entity_factory;
		$this->matcher             = $matcher;
	}

	public function register_routes() {

		register_rest_route( $this->namespace, sprintf( '/%s', $this->rest_base ), [
			'methods'             => 'POST',
			'callback'            => [ $this, 'start_callback' ],
			'permission_callback' => '__return_true',
			'args'                => [
				'authenticatorSelection' => [
					'type'       => 'object',
					'properties' => [
						'authenticatorAttachment' => [
							'type' => 'string',
							'enum' => AuthenticatorAttachment::ALL,
						],
						'residentKey'             => [
							'type' => 'string',
							'enum' => ResidentKeyRequirement::ALL,
						],
						'userVerification'        => [
							'type' => 'string',
							'enum' => UserVerificationRequirement::ALL,
						],
					],
				],
				'email'                   => [
					'type'      => 'string',
					'minLength' => 1,
					'format'    => 'email',
				],
				'captcha'                 => [
					'type' => 'string',
				],
			],
		] );
		register_rest_route( $this->namespace, sprintf( '/%s/(?P<token>[\w\-]+)/create', $this->rest_base ), [
			'methods'             => 'POST',
			'callback'            => [ $this, 'register_callback' ],
			'permission_callback' => '__return_true',
			'args'                => [
				'token'      => [
					'type'      => 'string',
					'minLength' => 1,
				],
				'label'      => [
					'type'      => 'string',
					'minLength' => 1,
				],
				'credential' => [
					'required'   => true,
					'type'       => 'object',
					'properties' => [
						'id'       => [
							'type'     => 'string',
							'required' => true,
						],
						'type'     => [
							'type'     => 'string',
							'required' => true,
						],
						'response' => [
							'type'     => 'object',
							'required' => true,
						],
					],
				],
			]
		] );
	}

	public function start_callback( \WP_REST_Request $request ): \WP_REST_Response {
		$authenticatorSelection = null;
		$current_user = wp_get_current_user();

		if ( ! $current_user->exists() && self::use_recaptcha() ) {
			if ( ! $request['captcha'] ) {
				return rest_convert_error_to_response( new \WP_Error(
					'itsec.webauthn.rest.register-credential.missing-captcha',
					__( 'CAPTCHA is required.', 'it-l10n-ithemes-security-pro' ),
					[ 'status' => \WP_Http::BAD_REQUEST ]
				) );
			}
			$captcha_check = $this->validate_recaptcha( $request['captcha'] );
			if ( $captcha_check ) {
				return $captcha_check;
			}
		}

		if ( $request['authenticatorSelection'] ) {
			if ( 'required' === \ITSEC_Modules::get_setting( 'passwordless-login', 'passkey_user_verification' ) ) {
				$userVerification = UserVerificationRequirement::REQUIRED;
			} else {
				$userVerification = UserVerificationRequirement::PREFERRED;
			}

			$authenticatorSelection = new AuthenticatorSelectionCriteria(
				$request['authenticatorSelection']['authenticatorAttachment'] ?? null,
				$request['authenticatorSelection']['residentKey'] ?? ResidentKeyRequirement::DISCOURAGED,
				$request['authenticatorSelection']['userVerification'] ?? $userVerification
			);
		}

		if ( ! $current_user->exists() ) {

			$registration_check = $this->user_registration_check( $request['email'] );
			if ( $registration_check ) {
				return $registration_check;
			}

			// Create a User Entity since the WP_User doesn't exist yet.
			$user_entity = new PublicKeyCredentialUserEntity (
				new BinaryString( random_bytes( 32 ) ),
				$request['email'],
				$request['email']
			);
		} else {
			$webauthn_available_check = $this->webauthn_available_for_user_roles( $current_user->roles );

			if ( $webauthn_available_check ) {
				return $webauthn_available_check;
			}
			$user_entity = $this->user_entity_factory->make( $current_user );
			if ( ! $user_entity->is_success() ) {
				return $user_entity->as_rest_response();
			}
			$user_entity = $user_entity->get_data();
		}

		$creation_options = $this->options_factory->make( $user_entity, $authenticatorSelection );

		if ( ! $creation_options->is_success() ) {
			return $creation_options->as_rest_response();
		}

		$persisted = $this->session_storage->persist_creation_options( $creation_options->get_data() );

		if ( ! $persisted->is_success() ) {
			return $persisted->as_rest_response();
		}

		$response = $creation_options->as_rest_response();
		$response->add_link(
			\ITSEC_Lib_REST::get_link_relation( 'webauthn-create-credential' ),
			rest_url( sprintf( '%s/%s/%s/create', $this->namespace, $this->rest_base, \ITSEC_Lib::url_safe_b64_encode( $persisted->get_data() ) ) )
		);

		return $response;
	}

	public function register_callback( \WP_REST_Request $request ): \WP_REST_Response {
		$token            = \ITSEC_Lib::url_safe_b64_decode( $request['token'] );
		$creation_options = $this->session_storage->get_creation_options( $token );

		if ( ! $creation_options->is_success() ) {
			return $creation_options->as_rest_response();
		}

		// Create a new WP User if needed.
		$user = wp_get_current_user();
		$new_user = false;
		if ( ! $user->exists() ) {
			$new_user = true;

			$email = $creation_options->get_data()->get_user()->get_name();

			$check = $this->user_registration_check( $email );
			if ( $check ) {
				return $check;
			}

			$user = [
				'user_login' => $email,
				'user_email' => $email,
				'user_pass'  => wp_generate_password( 20 ),
				'role'       => get_option( 'default_role', 'subscriber' ),
			];

			$user_id = wp_insert_user( $user );

			if ( is_wp_error( $user_id ) ) {
				return rest_convert_error_to_response( $user_id );
			}

			wp_set_current_user( $user_id );
		} else {
			$webauthn_available_check = $this->webauthn_available_for_user_roles( $user->roles );
			if ( $webauthn_available_check ) {
				return $webauthn_available_check;
			}
		}

		try {
			$credential = PublicKeyCredential::hydrateAttestation( $request['credential'] );
		} catch ( \Exception $e ) {
			return rest_convert_error_to_response( new \WP_Error(
				'itsec.webauthn.rest.register-credential.invalid-credential',
				__( 'The credential format is invalid.', 'it-l10n-ithemes-security-pro' ),
				[ 'status' => \WP_Http::BAD_REQUEST ]
			) );
		}

		$created = $this->ceremony->perform(
			$creation_options->get_data(),
			$credential,
			$request['label'] ?: ''
		);

		if ( $new_user ) {
			$linked = $this->user_entity_factory->link_webauthn_user( $user_id, $created->get_data()->get_user() );
			if ( ! $linked->is_success() ) {
				$created->get_data()->trash();
				return $linked->as_rest_response();
			}
		}

		if ( ! $created->is_success() ) {
			return $created->as_rest_response();
		}

		$route    = sprintf( '/ithemes-security/v1/webauthn/credentials/%s', $created->get_data()->get_id()->as_ascii_fast() );
		$response = rest_do_request( $route );
		$response->set_status( \WP_Http::CREATED );
		$response->header( 'Location', rest_url( $route ) );

		return $response;
	}

	/**
	 * Check if a new user can be registered.
	 *
	 * @param string $email An email address.
	 *
	 * @return \WP_REST_Response null if checks pass, else a WP_Rest_Response.
	 */
	protected function user_registration_check( string $email ): ?\WP_REST_Response {

		// Do not allow registration if registration is disabled.
		if ( ! get_option( 'users_can_register' ) ) {
			return rest_convert_error_to_response( new \WP_Error(
				'itsec.webauthn.rest.register-credential.registration-disabled',
				__( 'User registration is disabled.', 'it-l10n-ithemes-security-pro' ),
				[ 'status' => \WP_Http::BAD_REQUEST ]
			) );
		}

		// Do not allow registration if the email is already in use.
		if ( email_exists( $email ) ) {
			return rest_convert_error_to_response( new \WP_Error(
				'itsec.webauthn.rest.register-credential.email-in-use',
				__( 'The email is already in use.', 'it-l10n-ithemes-security-pro' ),
				[ 'status' => \WP_Http::BAD_REQUEST ]
			) );
		}

		$webauthn_available_check = $this->webauthn_available_for_user_roles( [ get_option( 'default_role', 'subscriber' ) ] );
		if ( $webauthn_available_check ) {
			return $webauthn_available_check;
		}

		return null;
	}

	/**
	 * Check if WebAuthn is available.
	 *
	 * For any user that attempts to register a WebAuthn credential,
	 * check that webauthn is an available method, and if the user role is allowed to use it.
	 *
	 * @param array $user_roles
	 *
	 * @return \WP_REST_Response|null
	 */
	public function webauthn_available_for_user_roles( array $user_roles ): ?\WP_REST_Response {
		// Ensure WebAuthn is enabled.
		if ( ! in_array( 'webauthn', \ITSEC_Passwordless_Login_Utilities::get_available_methods() ) ) {
			return rest_convert_error_to_response( new \WP_Error(
				'itsec.webauthn.rest.register-credential.webauthn-disabled',
				__( 'Passkey registration is disabled.', 'it-l10n-ithemes-security-pro' ),
				[ 'status' => \WP_Http::BAD_REQUEST ]
			) );
		}

		// Check that one of the user's roles is allowed to use WebAuthn.
		$groups        = \ITSEC_Modules::get_setting( 'passwordless-login', 'group' );
		$allowed_roles = array_filter( $user_roles, function( $role ) use ( $groups ) {
			return $this->matcher->matches( User_Groups\Match_Target::for_role( $role ), $groups );
		} );

		if ( ! $allowed_roles ) {
			return rest_convert_error_to_response( new \WP_Error(
				'itsec.webauthn.rest.register-credential.role-disabled',
				__( 'Passkey registration is not available for new users.', 'it-l10n-ithemes-security-pro' ) ),
				[ 'status' => \WP_Http::BAD_REQUEST ]
			);
		}

		return null;
	}

	protected function validate_recaptcha( $captcha ) {
		$recaptcha = array(
			'action' => \ITSEC_Recaptcha::A_REGISTER,
			'token' => $captcha,
		);

		$valid = \ITSEC_Recaptcha_API::validate( $recaptcha );

		if ( is_wp_error( $valid ) ) {
			return rest_convert_error_to_response( $valid );
		}

		return null;
	}

	protected static function use_recaptcha() {
		return \ITSEC_Modules::is_active( 'recaptcha' ) && \ITSEC_Recaptcha_API::is_registration_protected();
	}
}
