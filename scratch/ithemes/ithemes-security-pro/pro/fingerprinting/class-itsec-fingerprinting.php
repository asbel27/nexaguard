<?php

use iThemesSecurity\Contracts\Runnable;

/**
 * Class ITSEC_Fingerprinting
 */
class ITSEC_Fingerprinting implements Runnable {

	const FORCE_CHANGE_META = '_itsec_password_fingerprint_force_changed';
	private const NOTIFY_BLOCKED_META = 'solid_security_notify_device_blocked';
	const AJAX_ACTION = 'itsec-fingerprint-action';
	const CONFIRM_ACTION = 'itsec-fingerprint-confirm';
	const HJP_COOKIE = 'itsec-fingerprint-shp';
	const PENDING_DAYS = 5;

	/** @var string */
	private $provider_class_2fa;

	/** @var string */
	private $login_message;

	/** @var string */
	private $show_admin_bar;

	/** @var bool */
	private $_authed;

	/**
	 * Run the Fingerprinting module.
	 */
	public function run() {
		add_action( 'init', array( $this, 'register_meta' ) );
		add_filter( 'itsec_fingerprint_sources', array( $this, 'register_sources' ) );
		add_action( 'itsec_fingerprint_denied', array( $this, 'rescue_account' ) );
		add_action( 'after_password_reset', array( $this, 'after_password_reset' ) );
		add_action( 'deleted_user', array( $this, 'clear_fingerprints_on_user_delete' ) );

		if ( $this->should_run_fingerprint_checks_for_request() ) {
			add_action( 'wp_login', array( $this, 'handle_fingerprint' ), 100, 2 );
			add_filter( 'attach_session_information', array( $this, 'attach_fingerprint_to_session' ), 10, 2 );
			add_filter( 'authenticate', array( $this, 'block_denied_fingerprints' ), 30, 2 );
			add_filter( 'authenticate', array( $this, 'override_auth_error_when_forced_change' ), 1000, 2 );

			if ( isset( $GLOBALS['current_user'] ) && $GLOBALS['current_user'] instanceof WP_User && $GLOBALS['current_user']->exists() ) {
				add_action( 'itsec_initialized', array( $this, 'on_auth' ), 1000 );
			} else {
				add_action( 'set_current_user', array( $this, 'on_auth' ), - 1000 );
			}
		}

		if ( ITSEC_Modules::get_setting( 'fingerprinting', 'restrict_capabilities' ) ) {
			add_action( 'itsec_initialized', array( $this, 'run_restrict_capabilities' ) );
		}

		// Admin Bar
		add_action( 'wp_enqueue_scripts', array( $this, 'prepare_admin_bar' ) );
		add_action( 'admin_enqueue_scripts', array( $this, 'prepare_admin_bar' ) );
		add_action( 'admin_bar_menu', array( $this, 'admin_bar' ), 200 );
		add_action( 'admin_footer', array( $this, 'render_admin_bar_root' ) );
		add_action( 'wp_footer', array( $this, 'render_admin_bar_root' ) );
		add_action( 'wp_ajax_' . self::AJAX_ACTION, array( $this, 'handle_ajax_action' ) );
		add_action( 'wp_ajax_' . self::CONFIRM_ACTION, array( $this, 'ajax_send_confirm_email' ) );
		add_filter( 'heartbeat_received', array( $this, 'admin_bar_heartbeat' ), 10, 2 );

		// Fingerprint actions
		add_action( 'login_form_itsec-approve-fingerprint', array( $this, 'handle_fingerprint_action_url' ) );
		add_action( 'login_form_itsec-deny-fingerprint', array( $this, 'handle_fingerprint_action_url' ) );

		// Login Interstitials
		add_action( 'itsec_login_interstitial_initialize_same_browser', array( $this, 'login_interstitial_initialize_same_browser' ) );
		add_action( 'itsec_login_interstitial_async_action_confirmation_before_confirm', array( $this, 'login_interstitial_async_action_confirmation' ) );

		// Logging
		add_action( 'itsec_fingerprint_created', array( $this, 'log_create' ), 10, 3 );
		add_action( 'itsec_fingerprint_approved', array( $this, 'log_status' ), 10, 3 );
		add_action( 'itsec_fingerprint_auto_approved', array( $this, 'log_status' ), 10, 3 );
		add_action( 'itsec_fingerprint_auto_approve_delayed', array( $this, 'log_status' ), 10, 3 );
		add_action( 'itsec_fingerprint_denied', array( $this, 'log_status' ), 10, 3 );

		// Scheduler
		add_action( 'itsec_scheduled_approve-fingerprints', array( $this, 'approve_pending_fingerprints' ) );

		// Notifications
		add_filter( 'itsec_notifications', array( $this, 'register_notifications' ) );
		add_filter( 'itsec_unrecognized-login_notification_strings', array( $this, 'unrecognized_login_strings' ) );

		add_filter( 'debug_information', [ $this, 'add_site_health_info' ], 11 );

		// Plumbing replaceable by closures
		add_filter( 'login_message', array( $this, 'login_message' ) );
		add_action( 'itsec-two-factor-successful-authentication', array( $this, 'record_2fa_provider' ), 10, 2 );

		// Device confirmation flow
		add_action( 'in_admin_header', array( $this, 'render_trusted_devices_confirmation' ), 9 );
		add_action( 'admin_enqueue_scripts', array( $this, 'enqueue_trusted_device_confirmation_scripts' ) );
		add_action( 'wp_footer', array( $this, 'render_trusted_devices_confirmation' ), 9 );
		add_action( 'wp_enqueue_scripts', array( $this, 'enqueue_trusted_device_confirmation_scripts' ) );

		// Device block flow
		add_action( 'in_admin_header', array( $this, 'render_trusted_devices_blocked' ), 9 );
		add_action( 'admin_enqueue_scripts', array( $this, 'enqueue_trusted_devices_blocked_script' ) );
		add_action( 'wp_footer', array( $this, 'render_trusted_devices_blocked' ), 9 );
		add_action( 'wp_enqueue_scripts', array( $this, 'enqueue_trusted_devices_blocked_script' ) );
	}

	public function run_restrict_capabilities() {

		if ( ! ITSEC_Core::get_notification_center()->is_notification_enabled( 'unrecognized-login' ) ) {
			return;
		}

		add_filter( 'user_has_cap', array( __CLASS__, 'restrict_capabilities' ), 10, 4 );
		add_filter( 'wp_pre_insert_user_data', array( $this, 'prevent_updating_protected_user_fields' ), 10, 3 );
		add_action( 'personal_options_update', array( $this, 'block_profile_email_confirmation' ), 0 );
		add_action( 'user_profile_update_errors', array( $this, 'add_errors_when_updating_protected_user_fields' ), 10, 3 );
		add_action( 'admin_print_styles-profile.php', array( $this, 'style_profile_page_to_prevent_updating_protected_user_fields' ) );
	}

	/**
	 * Should fingerprint checks be run for the current request.
	 *
	 * @return bool
	 */
	private function should_run_fingerprint_checks_for_request() {

		if ( ITSEC_Lib::is_loopback_request() ) {
			return false;
		}

		return true;
	}

	public function register_meta() {
		register_meta( 'user', self::NOTIFY_BLOCKED_META, [
			'single'       => true,
			'type'         => 'boolean',
			'show_in_rest' => true,
		] );
	}

	/**
	 * Register sources with the Fingerprinting library.
	 *
	 * @param array $sources
	 *
	 * @return array
	 */
	public function register_sources( $sources ) {
		$sources[] = new ITSEC_Fingerprint_Source_IP();
		$sources[] = new ITSEC_Fingerprint_Source_User_Agent();

		return $sources;
	}

	/**
	 * Check for an unrecognized login attempt.
	 *
	 * @param string  $username
	 * @param WP_User $user
	 */
	public function handle_fingerprint( $username, $user ) {

		ITSEC_Lib::clear_cookie( self::HJP_COOKIE );
		delete_user_meta( $user->ID, self::FORCE_CHANGE_META );

		if ( ! ITSEC_Lib_Fingerprinting::applies_to_user( $user ) ) {
			return;
		}

		$fingerprint = $this->when_no_fingerprint( $user );

		/**
		 * Fires when a user logs in after the fingerprint has been determined.
		 *
		 * @param ITSEC_Fingerprint $fingerprint
		 * @param WP_User           $user
		 */
		do_action( 'itsec_login_with_fingerprint', $fingerprint, $user );

		if ( $fingerprint->is_approved() ) {
			ITSEC_Dashboard_Util::record_event( 'fingerprint-login-known' );
		} elseif ( $fingerprint->is_pending_auto_approval() ) {
			ITSEC_Dashboard_Util::record_event( 'fingerprint-login-unknown-auto-approved' );
		} elseif ( $fingerprint->is_pending() ) {
			ITSEC_Dashboard_Util::record_event( 'fingerprint-login-unknown' );
		}
	}

	/**
	 * Attach the fingerprint hash to the session.
	 *
	 * @param array $info
	 * @param int   $user_id
	 *
	 * @return array
	 */
	public function attach_fingerprint_to_session( $info, $user_id ) {
		if ( ! is_int( $user_id ) ) {
			$user_id = (int) $user_id; // Handle plugins that pass numeric strings for user ids.
		}

		require_once( ITSEC_Core::get_core_dir() . 'lib/class-itsec-lib-fingerprinting.php' );

		if ( ! ITSEC_Lib_Fingerprinting::applies_to_user( $user_id ) ) {
			return $info;
		}

		$fingerprint = ITSEC_Lib_Fingerprinting::calculate_fingerprint_from_global_state( $user_id );

		if ( $hash = $fingerprint->calculate_hash() ) {
			$info['itsec_fingerprint_hash'] = $hash;
		}

		return $info;
	}

	/**
	 * When the user is authenticated with the session token, check if their fingerprint has changed.
	 */
	public function on_auth() {

		// We only want to run this once, even if set_current_user() is used later in the request.
		if ( $this->_authed ) {
			return;
		}

		$this->_authed = true;

		if ( ! $token = wp_get_session_token() ) {
			return;
		}

		$user = wp_get_current_user();

		if ( ! $user || ! $user->exists() ) {
			return;
		}

		require_once( ITSEC_Core::get_core_dir() . 'lib/class-itsec-lib-fingerprinting.php' );

		if ( ! ITSEC_Lib_Fingerprinting::applies_to_user( $user ) ) {
			return;
		}

		$sm      = WP_Session_Tokens::get_instance( $user->ID );
		$session = $sm->get( $token );

		if ( ! isset( $session['itsec_fingerprint_hash'] ) ) {
			$fingerprint = $this->when_no_fingerprint( $user );

			$session['itsec_fingerprint_hash'] = $fingerprint->calculate_hash();
			$sm->update( $token, $session );

			return;
		}

		$hash = $session['itsec_fingerprint_hash'];

		$fingerprint = ITSEC_Lib_Fingerprinting::calculate_fingerprint_from_global_state( $user );

		if ( hash_equals( $hash, $fingerprint->calculate_hash() ) ) {
			return;
		}

		$shp  = ITSEC_Modules::get_setting( 'fingerprinting', 'session_hijacking_protection' );
		$prev = ITSEC_Fingerprint::get_by_hash( $user, $hash );

		// If there is another fingerprint with this hash, then just update the hash.
		if ( $stored = ITSEC_Lib_Fingerprinting::get_stored_fingerprint( $fingerprint ) ) {
			$session['itsec_fingerprint_hash'] = $stored->calculate_hash();
			$sm->update( $token, $session );
			$stored->was_seen();

			ITSEC_Dashboard_Util::record_event( 'fingerprint-session-switched-known' );
			ITSEC_Log::add_debug( 'fingerprinting', 'session_switched_known', array(
				'to'    => $stored->get_uuid(),
				'from'  => $prev ? $prev->get_uuid() : '',
				'token' => $token,
			) );

			if ( $shp && ( $fingerprint->is_denied() || $fingerprint->is_pending() ) ) {
				$this->destroy_session( $fingerprint, $prev );
			}

			return;
		}

		$match = ITSEC_Lib_Fingerprinting::check_for_match( $fingerprint );

		if ( ! $match ) {
			$fingerprint->create();

			if ( $shp ) {
				$this->destroy_session( $fingerprint, $prev );
			}

			return;
		}

		$this->handle_fingerprint_comparison( $match, false );

		if ( ! $shp || $match->get_match_percent() >= 50 ) {
			$session['itsec_fingerprint_hash'] = $fingerprint->calculate_hash();
			$sm->update( $token, $session );

			ITSEC_Dashboard_Util::record_event( 'fingerprint-session-switched-unknown' );
			ITSEC_Log::add_debug( 'fingerprinting', 'session_switched_unknown', array(
				'to'    => $fingerprint->get_uuid(),
				'from'  => $prev ? $prev->get_uuid() : '',
				'match' => $match->get_match_percent(),
				'token' => $token,
			) );

			return;
		}

		if ( ! $shp ) {
			return;
		}

		$this->destroy_session( $fingerprint, $prev );
	}

	/**
	 * Destroy the current session.
	 *
	 * @param ITSEC_Fingerprint      $fingerprint $fingerprint
	 * @param ITSEC_Fingerprint|null $prev
	 */
	private function destroy_session( $fingerprint, $prev ) {
		ITSEC_Dashboard_Util::record_event( 'fingerprint-session-destroyed' );
		ITSEC_Log::add_action( 'fingerprinting', 'session_destroyed', array(
			'to'    => $fingerprint->get_uuid(),
			'from'  => $prev ? $prev->get_uuid() : '',
			'token' => wp_get_session_token(),
		) );

		wp_clear_auth_cookie();
		wp_destroy_current_session();
		ITSEC_Lib::set_cookie( self::HJP_COOKIE, true );
		auth_redirect();
	}

	/**
	 * Trigger this when there is no fingerprint associated with the session and you need one to be.
	 *
	 * @param WP_User $user
	 *
	 * @return ITSEC_Fingerprint
	 */
	private function when_no_fingerprint( $user ) {

		$fingerprint = ITSEC_Lib_Fingerprinting::calculate_fingerprint_from_global_state( $user );

		if ( $known = ITSEC_Lib_Fingerprinting::get_stored_fingerprint( $fingerprint ) ) {
			$known->was_seen();

			return $known;
		}

		if ( ! ITSEC_Lib_Fingerprinting::get_user_fingerprints( $user ) ) {
			$fingerprint->approve();
			$fingerprint->create();

			return $fingerprint;
		}

		$match = ITSEC_Lib_Fingerprinting::check_for_match( $fingerprint );

		if ( $match ) {
			$this->handle_fingerprint_comparison( $match );
		} else {
			$fingerprint->create();
			$this->send_unrecognized_login( $fingerprint );
		}

		return $fingerprint;
	}

	/**
	 * Handle the fingerprint comparison.
	 *
	 * @param ITSEC_Fingerprint_Comparison $match
	 * @param bool                         $send_email Whether to send the email.
	 */
	private function handle_fingerprint_comparison( ITSEC_Fingerprint_Comparison $match, $send_email = true ) {
		switch ( true ) {
			case $match->get_match_percent() >= 85:
				$match->get_unknown()->auto_approve();
				$match->get_unknown()->create();
				break;
			case $match->get_match_percent() >= 50:
				$match->get_unknown()->delay_auto_approve();
				$match->get_unknown()->create();
				$send_email && $this->send_unrecognized_login( $match->get_unknown() );
				break;
			default:
				$match->get_unknown()->create();
				$send_email && $this->send_unrecognized_login( $match->get_unknown() );
				break;
		}

		ITSEC_Log::add_debug( 'fingerprinting', 'comparison', array(
			'known'   => $match->get_known()->get_uuid(),
			'unknown' => $match->get_unknown()->get_uuid(),
			'percent' => $match->get_match_percent(),
			'scores'  => $match->get_scores(),
			'action'  => current_action(),
		) );
	}

	/**
	 * Block a user from logging in if it is an exact match with a denied fingerprint.
	 *
	 * @param WP_User|WP_Error|null $user_or_error
	 * @param string                $username
	 *
	 * @return WP_User|WP_Error|null
	 */
	public function block_denied_fingerprints( $user_or_error, $username ) {

		if ( ! $user = get_user_by( 'login', $username ) ) {
			return $user_or_error;
		}

		require_once( ITSEC_Core::get_core_dir() . 'lib/class-itsec-lib-fingerprinting.php' );

		if ( ! ITSEC_Lib_Fingerprinting::applies_to_user( $user ) ) {
			return $user_or_error;
		}

		$fingerprint = ITSEC_Lib_Fingerprinting::calculate_fingerprint_from_global_state( $user );
		$stored      = ITSEC_Lib_Fingerprinting::get_stored_fingerprint( $fingerprint );

		if ( ! $stored || ! $stored->is_denied() ) {
			return $user_or_error;
		}

		$fingerprint->was_seen();
		ITSEC_Dashboard_Util::record_event( 'fingerprint-login-blocked' );
		ITSEC_Log::add_notice( 'fingerprinting', 'denied_fingerprint_blocked', array(
			'uuid' => $stored->get_uuid(),
		) );

		$error = is_wp_error( $user_or_error ) ? $user_or_error : new WP_Error();
		$error->add(
			'itsec-fingerprinting-authenticate-denied-fingerprint',
			__( 'This device is blocked from logging in to this account.', 'it-l10n-ithemes-security-pro' )
		);

		return $error;
	}

	/**
	 * When auth failed because
	 *
	 * @param WP_User|WP_Error|null $user_or_error
	 * @param string                $username
	 *
	 * @return WP_User|WP_Error|null
	 */
	public function override_auth_error_when_forced_change( $user_or_error, $username ) {
		if (
			is_wp_error( $user_or_error ) &&
			$user_or_error->get_error_message( 'itsec-fingerprinting-authenticate-denied-fingerprint' )
		) {
			return $user_or_error;
		}

		if (
			! $user_or_error instanceof WP_User &&
			( $user = get_user_by( 'login', $username ) ) &&
			get_user_meta( $user->ID, self::FORCE_CHANGE_META, true )
		) {
			return new WP_Error(
				'itsec-fingerprinting-forced-change',
				sprintf(
					esc_html__( 'For security purposes, your password was reset. %1$sRequest a new password%2$s.', 'it-l10n-ithemes-security-pro' ),
					'<a href="' . esc_url( wp_lostpassword_url() ) . '">',
					'</a>'
				)
			);
		}

		return $user_or_error;
	}

	/**
	 * "rescue" an account by clearing all session tokens,
	 * changing the password, and forcing a password change.
	 *
	 * @param ITSEC_Fingerprint $fingerprint
	 */
	public function rescue_account( ITSEC_Fingerprint $fingerprint ) {
		$user = $fingerprint->get_user();
		$snap = $fingerprint->get_snapshot();

		WP_Session_Tokens::get_instance( $user->ID )->destroy_all();
		wp_set_password( wp_generate_password( 36, true, true ), $user->ID );
		update_user_meta( $user->ID, self::FORCE_CHANGE_META, true );

		if ( isset( $snap['user_email'] ) && $user->user_email !== $snap['user_email'] ) {
			wp_update_user( array( 'ID' => $user->ID, 'user_email' => $snap['user_email'] ) );
		}
	}

	/**
	 * Fires
	 *
	 * @param WP_User $user
	 *
	 * @return void
	 */
	public function after_password_reset( $user ) {
		if ( get_user_meta( $user->ID, self::FORCE_CHANGE_META, true ) ) {
			update_user_meta( $user->ID, self::NOTIFY_BLOCKED_META, true );
		}
	}

	/**
	 * Clear fingerprints when a user is deleted.
	 *
	 * @param int $user_id
	 */
	public function clear_fingerprints_on_user_delete( $user_id ) {
		global $wpdb;

		$wpdb->delete( $wpdb->base_prefix . 'itsec_fingerprints', array( 'fingerprint_user' => $user_id ), array( 'fingerprint_user' => '%d' ) );
	}

	/**
	 * Restrict capabilities when on an unrecognized device.
	 *
	 * @param array   $all_caps
	 * @param array   $required_caps
	 * @param array   $args
	 * @param WP_User $user
	 *
	 * @return array
	 */
	public static function restrict_capabilities( $all_caps, $required_caps, $args, $user ) {

		if ( get_current_user_id() !== $user->ID ) {
			return $all_caps;
		}

		require_once( ITSEC_Core::get_core_dir() . 'lib/class-itsec-lib-fingerprinting.php' );

		$applies = ITSEC_Lib_Fingerprinting::applies_to_user( $user );
		$current = ITSEC_Lib_Fingerprinting::get_current_fingerprint();
		$is_safe = ITSEC_Lib_Fingerprinting::is_current_fingerprint_safe();

		if ( ! $applies || $is_safe ) {
			return $all_caps;
		}

		return array_diff_key( $all_caps, array_flip( self::get_capabilities_to_remove( $user, $current ) ) );
	}

	/**
	 * Checks if the given user and device will have their capabilities restricted.
	 *
	 * @param WP_User           $user
	 * @param ITSEC_Fingerprint $fingerprint
	 *
	 * @return bool
	 */
	private static function is_restricting_user( WP_User $user, ITSEC_Fingerprint $fingerprint ): bool {
		if ( ! ITSEC_Modules::get_setting( 'fingerprinting', 'restrict_capabilities' ) ) {
			return false;
		}

		if ( $fingerprint->is_approved() || $fingerprint->is_auto_approved() ) {
			return false;
		}

		$caps = $user->get_role_caps();

		foreach ( self::get_capabilities_to_remove( $user, $fingerprint ) as $cap ) {
			if ( ! empty( $caps[ $cap ] ) ) {
				return true;
			}
		}

		return false;
	}

	/**
	 * Checks if a user is eligible for capability restricting.
	 *
	 * @param WP_User $user
	 *
	 * @return bool
	 */
	private static function is_restrict_eligible( WP_User $user ): bool {
		$caps = $user->get_role_caps();

		foreach ( self::get_capabilities_to_remove( $user ) as $cap ) {
			if ( ! empty( $caps[ $cap ] ) ) {
				return true;
			}
		}

		return false;
	}

	/**
	 * Gets the list of capabilities to remove from a user when restricted.
	 *
	 * @param WP_User                $user
	 * @param ITSEC_Fingerprint|null $fingerprint
	 *
	 * @return string[]
	 */
	private static function get_capabilities_to_remove( WP_User $user, ITSEC_Fingerprint $fingerprint = null ) {
		$to_remove = array(
			'activate_plugins',
			'create_users',
			'delete_plugins',
			'delete_users',
			'edit_files',
			'edit_plugins',
			'edit_users',
			'install_plugins',
			'install_themes',
			'level_8',
			'level_9',
			'level_10',
			'manage_options',
			'promote_users',
			'remove_users',
			'unfiltered_upload',
			ITSEC_Core::get_required_cap(),
		);

		/**
		 * Filter the capabilities to remove when a user is on an unrecognized device.
		 *
		 * @param array                  $to_remove
		 * @param WP_User                $user
		 * @param ITSEC_Fingerprint|null $fingerprint
		 */
		return apply_filters( 'itsec_fingerprinting_caps_to_remove', $to_remove, $user, $fingerprint );
	}

	/**
	 * Prevent a user updating their email or password when they are on a unrecognized device.
	 *
	 * @param array $data
	 * @param bool  $update
	 * @param int   $user_id
	 *
	 * @return array
	 */
	public function prevent_updating_protected_user_fields( $data, $update, $user_id ) {

		if ( ! $update || ! $user_id || (int) get_current_user_id() !== (int) $user_id ) {
			return $data;
		}

		require_once( ITSEC_Core::get_core_dir() . 'lib/class-itsec-lib-fingerprinting.php' );

		if ( ! ITSEC_Lib_Fingerprinting::applies_to_user( $user_id ) || ITSEC_Lib_Fingerprinting::is_current_fingerprint_safe() ) {
			return $data;
		}

		$fields = $this->get_protected_user_fields( get_userdata( $user_id ), ITSEC_Lib_Fingerprinting::get_current_fingerprint() );

		$data = array_diff_key( $data, array_flip( $fields ) );

		return $data;
	}

	/**
	 * Block the confirm new email flow on the profile page. This overrides the default update user flow so needs to be removed
	 * for our error message to appear.
	 *
	 * @param int $user_id
	 */
	public function block_profile_email_confirmation( $user_id ) {

		if ( ! $user_id ) {
			return;
		}

		require_once( ITSEC_Core::get_core_dir() . 'lib/class-itsec-lib-fingerprinting.php' );

		if ( ! ITSEC_Lib_Fingerprinting::applies_to_user( $user_id ) || ITSEC_Lib_Fingerprinting::is_current_fingerprint_safe() ) {
			return;
		}

		if ( ! in_array( 'user_email', $this->get_protected_user_fields( get_userdata( $user_id ), ITSEC_Lib_Fingerprinting::get_current_fingerprint() ), true ) ) {
			return;
		}

		remove_action( 'personal_options_update', 'send_confirmation_on_profile_email' );
	}

	/**
	 * Add errors if the user tries to update their email or password.
	 *
	 * @param WP_Error $errors
	 * @param bool     $update
	 * @param stdClass $user
	 */
	public function add_errors_when_updating_protected_user_fields( $errors, $update, $user ) {

		if ( ! $update ) {
			return;
		}

		require_once( ITSEC_Core::get_core_dir() . 'lib/class-itsec-lib-fingerprinting.php' );

		if ( ! ITSEC_Lib_Fingerprinting::applies_to_user( $user ) || ITSEC_Lib_Fingerprinting::is_current_fingerprint_safe() ) {
			return;
		}

		if ( ! $_user = get_userdata( $user->ID ) ) {
			return;
		}

		foreach ( $this->get_protected_user_fields( $_user, ITSEC_Lib_Fingerprinting::get_current_fingerprint() ) as $field ) {
			if ( ! isset( $user->$field ) ) {
				continue;
			}

			if ( 'user_pass' === $field ) {
				$errors->add(
					'itsec_fingerprint_protected',
					esc_html__( 'You cannot update your password on an unrecognized device. Please check your email to confirm this new device.', 'it-l10n-ithemes-security-pro' ),
					compact( 'field' )
				);

				return;
			}

			if ( $user->$field === $_user->$field ) {
				continue;
			}

			switch ( $field ) {
				case 'user_email':
					$errors->add(
						'itsec_fingerprint_protected',
						esc_html__( 'You cannot update your email on an unrecognized device. Please check your email to confirm this new device.', 'it-l10n-ithemes-security-pro' ),
						compact( 'field' )
					);
					break;
				default:
					$errors->add(
						'itsec_fingerprint_protected',
						sprintf( esc_html__( 'You cannot update the "%s" field on an unrecognized device. Please check your email to confirm this new device.', 'it-l10n-ithemes-security-pro' ), str_replace( 'user_', '', $field ) ),
						compact( 'field' )
					);
					break;
			}
		}
	}

	/**
	 * Style the profile.php page to disable inputs that are protected.
	 */
	public function style_profile_page_to_prevent_updating_protected_user_fields() {
		require_once( ITSEC_Core::get_core_dir() . 'lib/class-itsec-lib-fingerprinting.php' );

		if ( ! ITSEC_Lib_Fingerprinting::applies_to_user() || ITSEC_Lib_Fingerprinting::is_current_fingerprint_safe() ) {
			return;
		}

		$fields = $this->get_protected_user_fields( wp_get_current_user(), ITSEC_Lib_Fingerprinting::get_current_fingerprint() );

		echo '<style type="text/css">';

		if ( in_array( 'user_email', $fields, true ) ) {
			echo '.user-email-wrap { display: none; }';
		}

		if ( in_array( 'user_pass', $fields, true ) ) {
			echo '#password, .user-pass2-wrap { display: none;}';
		}

		echo '</style>';
	}

	/**
	 * Get the fields that should be protected from self-editing when on a unrecognized device.
	 *
	 * @param WP_User                $user
	 * @param ITSEC_Fingerprint|null $fingerprint
	 *
	 * @return array
	 */
	private function get_protected_user_fields( $user, $fingerprint ) {
		$fields = array( 'user_pass', 'user_email' );

		/**
		 * Filter the user fields that should be protected from self-editing when on a unrecognized device.
		 *
		 * @param array                  $fields
		 * @param WP_User                $user
		 * @param ITSEC_Fingerprint|null $fingerprint
		 */
		return apply_filters( 'itsec_fingerprinting_protected_user_fields', $fields, $user, $fingerprint );
	}

	/**
	 * Prepare the admin bar fingerprints manager by printing templates and enqueuing JavaScript.
	 */
	public function prepare_admin_bar() {
		if ( ! is_admin_bar_showing() || ! is_user_logged_in() ) {
			return;
		}

		require_once( ITSEC_Core::get_core_dir() . 'lib/class-itsec-lib-fingerprinting.php' );

		if ( ! ITSEC_Lib_Fingerprinting::applies_to_user() ) {
			return;
		}

		if ( ! ITSEC_Lib_Fingerprinting::is_current_fingerprint_safe() ) {
			if ( $this->show_confirmation_modal() ) {
				$this->show_admin_bar = 'unknown';
			}

			return;
		}

		$this->show_admin_bar = 'alerts';

		wp_enqueue_script( 'itsec-fingerprinting-alerts' );
		wp_enqueue_style( 'itsec-fingerprinting-alerts' );
	}

	/**
	 * Customize the admin bar to include tools for approving/denying a fingerprint.
	 *
	 * @param WP_Admin_Bar $admin_bar
	 */
	public function admin_bar( $admin_bar ) {

		if ( ! $this->show_admin_bar ) {
			return;
		}

		if ( $this->show_admin_bar === 'unknown' ) {
			$admin_bar->add_menu( array(
				'parent' => 'top-secondary',
				'id'     => 'itsec-fingerprinting',
				'title'  => esc_html__( 'Unrecognized Login Mode', 'it-l10n-ithemes-security-pro' ),
			) );

			return;
		}

		$admin_bar->add_node( array(
			'parent' => 'top-secondary',
			'title'  => __( 'Login Alerts', 'it-l10n-ithemes-security-pro' ),
			'id'     => 'itsec_fingerprinting_login_alerts',
		) );
	}

	public function render_admin_bar_root() {
		if ( ! $this->show_admin_bar ) {
			return;
		}

		$user  = wp_get_current_user();
		$count = ITSEC_Fingerprint::count_all_for_user( wp_get_current_user(), [
			'status' => [ ITSEC_Fingerprint::S_PENDING, ITSEC_Fingerprint::S_PENDING_AUTO_APPROVE ],
		] );

		printf(
			'<div id="itsec-fingerprinting-alerts-root" data-user="%s" data-reset-url="%s" data-uses-restrict="%d" data-show-notice="%d"></div>',
			esc_attr( $user->ID ),
			esc_attr( add_query_arg(
				[
					'action'                 => 'lostpassword',
					'itsec_from_fingerprint' => true,
				],
				wp_login_url()
			) ),
			self::is_restrict_eligible( $user ),
			(bool) $count
		);
	}

	/**
	 * Handle an Ajax action to approve or deny fingerprints.
	 */
	public function handle_ajax_action() {
		if ( ! isset( $_REQUEST['nonce'] ) || ! wp_verify_nonce( $_REQUEST['nonce'], self::AJAX_ACTION ) ) {
			wp_send_json_success( array(
				'message' => esc_html__( 'Request expired, please refresh and try again.', 'it-l10n-ithemes-security-pro' ),
			) );
		}

		require_once( ITSEC_Core::get_core_dir() . 'lib/class-itsec-lib-fingerprinting.php' );

		if ( ! ITSEC_Lib_Fingerprinting::applies_to_user() ) {
			wp_send_json_error( esc_html__( 'Trusted Devices is not enabled for your account.', 'it-l10n-ithemes-security-pro' ) );
		}

		if ( ! ITSEC_Lib_Fingerprinting::is_current_fingerprint_safe() ) {
			$current = ITSEC_Lib_Fingerprinting::get_current_fingerprint();

			if ( $current && ( $current->is_pending() || $current->is_pending_auto_approval() ) ) {
				$this->send_unrecognized_login( $current ); // Todo: Replace with dedicated confirm email.
			}

			wp_send_json_error( array(
				'message' => esc_html__( "Your current device is unconfirmed, so you do not have permission to approve new devices. Check your email for a link to approve this current device.", 'it-l10n-ithemes-security-pro' )
			) );
		}

		if ( ! isset( $_REQUEST['itsec_uuid'], $_REQUEST['itsec_action'] ) ) {
			wp_send_json_error( array(
				'message' => esc_html__( 'Invalid request format.', 'it-l10n-ithemes-security-pro' ),
			) );
		}

		$fingerprint = ITSEC_Fingerprint::get_by_uuid( $_REQUEST['itsec_uuid'] );

		if ( ! $fingerprint || $fingerprint->get_user()->ID !== get_current_user_id() || ! $fingerprint->can_change_status() ) {
			wp_send_json_error( array(
				'message' => esc_html__( 'Invalid Device', 'it-l10n-ithemes-security-pro' ),
			) );
		}

		switch ( $_REQUEST['itsec_action'] ) {
			case 'approve':
				if ( ! $fingerprint->approve() ) {
					wp_send_json_error( array( 'message' => esc_html__( 'Failed to approve device. Please refresh and try again, then contact a site administrator.', 'it-l10n-ithemes-security-pro' ) ) );
				}

				wp_send_json_success( array(
					'message' => esc_html__( 'Device approved!', 'it-l10n-ithemes-security-pro' ),
				) );
			case 'deny':
				if ( ! $fingerprint->deny() ) {
					wp_send_json_error( array( 'message' => esc_html__( 'Failed to block device. Please refresh and try again, then contact a site administrator.', 'it-l10n-ithemes-security-pro' ) ) );
				}

				wp_send_json_success( array(
					'message' => esc_html__( 'Device blocked. For security purposes you must reset your password immediately.', 'it-l10n-ithemes-security-pro' ),
					'url'     => $this->get_reset_pass_url( $fingerprint->get_user() ),
				) );
			default:
				wp_send_json_error( array(
					'message' => esc_html__( 'Invalid request format.', 'it-l10n-ithemes-security-pro' )
				) );
		}
	}

	/**
	 * Handle the ajax request to send the confirmation email.
	 */
	public function ajax_send_confirm_email() {
		if ( ! isset( $_REQUEST['nonce'] ) || ! wp_verify_nonce( $_REQUEST['nonce'], self::CONFIRM_ACTION ) ) {
			wp_send_json_error( array(
				'message' => esc_html__( 'Request expired. Please refresh and try again.', 'it-l10n-ithemes-security-pro' )
			) );
		}

		require_once( ITSEC_Core::get_core_dir() . 'lib/class-itsec-lib-fingerprinting.php' );

		if ( ! ITSEC_Lib_Fingerprinting::applies_to_user() ) {
			wp_send_json_error( esc_html__( 'Trusted Devices is not enabled for your account.', 'it-l10n-ithemes-security-pro' ) );
		}

		$current = ITSEC_Lib_Fingerprinting::get_current_fingerprint();

		if ( ! $current ) {
			$current = $this->when_no_fingerprint( wp_get_current_user() );
		}

		if ( ! $current->is_pending() && ! $current->is_pending_auto_approval() ) {
			wp_send_json_error( array( 'message' => esc_html__( 'No pending device found.', 'it-l10n-ithemes-security-pro' ) ) );
		}

		$this->send_unrecognized_login( $current ); // Todo: Replace with dedicated confirm email.

		wp_send_json_success( array(
			'message' => esc_html__( 'Confirmation email resent! Click the Confirm Device button to approve this device.', 'it-l10n-ithemes-security-pro' )
		) );
	}

	/**
	 * Heartbeat toolbar to provide new fingerprints.
	 *
	 * @param array $response
	 * @param array $request
	 *
	 * @return array
	 */
	public function admin_bar_heartbeat( $response, $request ) {

		if ( empty( $request['itsec_fingerprinting'] ) || empty( $request['itsec_fingerprinting']['request'] ) ) {
			return $response;
		}

		require_once( ITSEC_Core::get_core_dir() . 'lib/class-itsec-lib-fingerprinting.php' );

		if ( ! ITSEC_Lib_Fingerprinting::applies_to_user() ) {
			return $response;
		}

		if ( ! ITSEC_Lib_Fingerprinting::is_current_fingerprint_safe() ) {
			$response['itsec_fingerprinting']['unauthorized'] = true;

			return $response;
		}

		$uuids = isset( $request['itsec_fingerprinting']['uuids'] ) ? $request['itsec_fingerprinting']['uuids'] : array();

		$fingerprints = ITSEC_Lib_Fingerprinting::get_user_fingerprints( false, array(
			'exclude' => $uuids,
			'status'  => array( ITSEC_Fingerprint::S_PENDING, ITSEC_Fingerprint::S_PENDING_AUTO_APPROVE ),
		) );

		$new    = array();
		$remove = array();

		foreach ( $fingerprints as $fingerprint ) {
			$new[] = $this->get_fingerprint_info( $fingerprint, array( 'maps' => array( 'small', 'large' ) ) );
		}

		foreach ( $uuids as $uuid ) {
			// Ensure a user can only query for the existence of uuids that belong to their account.
			if ( ! ( $fingerprint = ITSEC_Fingerprint::get_by_uuid( $uuid ) ) || $fingerprint->get_user()->ID !== get_current_user_id() ) {
				$remove[] = $uuid;
			}
		}

		$response['itsec_fingerprinting']['new']    = $new;
		$response['itsec_fingerprinting']['remove'] = $remove;

		return $response;
	}

	/**
	 * Record the fingerprint of the session that initialized the same browser status.
	 *
	 * @param ITSEC_Login_Interstitial_Session $session
	 */
	public function login_interstitial_initialize_same_browser( ITSEC_Login_Interstitial_Session $session ) {
		ITSEC_Lib::load( 'fingerprinting' );
		$fingerprint = ITSEC_Lib_Fingerprinting::calculate_fingerprint_from_global_state( $session->get_user() );

		$session->set_state( array_merge( $session->get_state(), array( 'fingerprint' => wp_json_encode( $fingerprint ) ) ) );
		$session->save();
	}

	/**
	 * Display a summary of the fingerprint that will be logged in on the async action confirmation.
	 *
	 * @param ITSEC_Login_Interstitial_Session $session
	 */
	public function login_interstitial_async_action_confirmation( ITSEC_Login_Interstitial_Session $session ) {
		$state = $session->get_state();

		if ( ! isset( $state['fingerprint'] ) ) {
			return;
		}

		ITSEC_Lib::load( 'fingerprinting' );

		if ( ! $fingerprint = ITSEC_Fingerprint::from_json( $state['fingerprint'] ) ) {
			return;
		}

		$info     = $this->get_fingerprint_info( $fingerprint, array( 'maps' => array( 'small' ) ) );
		$rows     = array();
		$location = '';

		if ( $info['ip'] ) {
			require_once( ITSEC_Core::get_core_dir() . 'lib/class-itsec-lib-geolocation.php' );
			$headers[] = esc_html__( 'Location', 'it-l10n-ithemes-security-pro' );

			if ( $info['location'] ) {
				$rows[] = array(
					esc_html__( 'Location', 'it-l10n-ithemes-security-pro' ),
					$location = $info['location'] . " ({$info['ip']})"
				);
			} else {
				$rows[] = array(
					esc_html__( 'Location', 'it-l10n-ithemes-security-pro' ),
					$location = $info['ip']
				);
			}
		}

		if ( ITSEC_Lib_Browser::BROWSER_UNKNOWN !== $info['browser'] ) {
			$rows[] = array(
				esc_html__( 'Browser', 'it-l10n-ithemes-security-pro' ),
				$info['browser'],
			);
		}

		if ( ITSEC_Lib_Browser::PLATFORM_UNKNOWN !== $info['platform'] ) {
			$rows[] = array(
				esc_html__( 'Platform', 'it-l10n-ithemes-security-pro' ),
				$info['platform'],
			);
		}

		if ( $info['map-small'] ) {
			if ( $location ) {
				$alt = esc_attr( sprintf( __( 'Map of %s', 'it-l10n-ithemes-security-pro' ), $location ) );
			} else {
				$alt = esc_attr__( 'Map of login location', 'it-l10n-ithemes-security-pro' );
			}

			echo "<img src=\"{$info['map-small']}\" alt='{$alt}' style='width: 100%'>";
		}

		if ( $rows ) {
			echo '<dl style="grid-template: auto / min-content 1fr;grid-gap: .25em .5em;display: grid;margin: 1em 0;">';
			foreach ( $rows as list( $label, $value ) ) {
				echo '<dt style="color: #606A73;">' . $label . '</dt>';
				echo '<dd style="color: #7E8993;">' . esc_html( $value ) . '</dd>';
			}
			echo '</dl>';
		}
	}

	/**
	 * Send the unrecognized login email.
	 *
	 * @param ITSEC_Fingerprint $fingerprint
	 *
	 * @return bool True if successfully sent.
	 */
	public function send_unrecognized_login( ITSEC_Fingerprint $fingerprint ) {

		$nc = ITSEC_Core::get_notification_center();

		if ( ! $nc->is_notification_enabled( 'unrecognized-login' ) ) {
			return false;
		}

		$info = $this->get_fingerprint_info( $fingerprint, array( 'maps' => 'medium' ) );

		$device_info = array();

		if ( $info['location'] ) {
			$device_info['location']['label']    = esc_html__( 'Location', 'it-l10n-ithemes-security-pro' );
			$device_info['location']['value']    = esc_html( $info['location'] );
			$device_info['location']['position'] = 'left';
		}

		$time = ITSEC_Lib::date_format_i18n_and_local_timezone(
			$fingerprint->get_created_at()->format( 'U' ),
			get_option( 'date_format' ) . get_option( 'time_format' )
		);

		$device_info['date']['label']    = esc_html__( 'Occurred', 'it-l10n-ithemes-security-pro' );
		$device_info['date']['value']    = esc_html( $time );
		$device_info['date']['position'] = 'right';

		if ( $info['ip'] ) {
			$device_info['ip']['label']    = esc_html__( 'IP', 'it-l10n-ithemes-security-pro' );
			$device_info['ip']['value']    = esc_html( $info['ip'] );
			$device_info['ip']['position'] = 'left';
		}

		if ( ITSEC_Lib_Browser::PLATFORM_UNKNOWN !== $info['platform'] ) {
			$device_info['platform']['label']    = esc_html__( 'Platform', 'it-l10n-ithemes-security-pro' );
			$device_info['platform']['value']    = esc_html( $info['platform'] );
			$device_info['platform']['position'] = 'right';
		}

		if ( ITSEC_Lib_Browser::BROWSER_UNKNOWN !== $info['browser'] ) {
			$device_info['browser']['label']    = esc_html__( 'Browser', 'it-l10n-ithemes-security-pro' );
			$device_info['browser']['value']    = esc_html( $info['browser'] . " ({$info['browser_ver']})" );
			$device_info['browser']['position'] = 'left';
		}
		if ( $this->provider_class_2fa ) {
			// This code path is only executed if the 2FA module has already been loaded.
			$instances = ITSEC_Two_Factor_Helper::get_instance()->get_all_provider_instances();

			$device_info['two-factor']['label']    = esc_html__( 'Two-Factor', 'it-l10n-ithemes-security-pro' );
			$device_info['two-factor']['value']    = isset( $instances[ $this->provider_class_2fa ] )
				? esc_html( $instances[ $this->provider_class_2fa ]->get_label() )
				: esc_html( $this->provider_class_2fa );
			$device_info['two-factor']['position'] = 'right';
		}

		$mail = $nc->mail( 'unrecognized-login' );

		$mail->add_user_header( esc_html__( 'Unrecognized Login', 'it-l10n-ithemes-security-pro' ), esc_html__( 'Unrecognized Login', 'it-l10n-ithemes-security-pro' ) );

		$mail->add_text( ITSEC_Lib::replace_tags( $nc->get_message( 'unrecognized-login' ), array(
			'display_name' => $fingerprint->get_user()->display_name,
			'username'     => $fingerprint->get_user()->user_login,
			'site_title'   => get_bloginfo( 'name', 'display' ),
			'location'     => "<b>{$info['location']}</b>",
			'ip'           => "<b>{$info['ip']}</b>",
			'browser'      => "<b>{$info['browser']}</b>",
			'platform'     => "<b>{$info['platform']}</b>",
			'time'         => $info['time'],
			'date'         => $info['date'],
		) ) );

		if ( $info['map-medium'] ) {
			$mail->add_image( $info['map-medium'], 560 );
		}

		$confirm_text = sprintf(
			__( '%1$sIf this is a login was you%2$s or someone you recognize click “Yes, it was me” to avoid being notified about another login on that device.', 'it-l10n-ithemes-security-pro' ),
			'<b>',
			'</b>'
		);

		$block_text = sprintf(
			__( '%1$sIf this was not you%2$s click the “No, secure account” button below to lock that user out of your account. Then we’ll prompt you to reset your password for your protection.', 'it-l10n-ithemes-security-pro' ),
			'<b>',
			'</b>'
		);

		$buttons = [
			'block'   => [
				'text'   => esc_html__( 'No, secure account', 'it-l10n-ithemes-security-pro' ),
				'action' => $this->get_fingerprint_action_link( $fingerprint, 'deny' ),
			],
			'confirm' => [
				'text'   => esc_html__( 'Yes, it was me', 'it-l10n-ithemes-security-pro' ),
				'action' => $this->get_fingerprint_action_link( $fingerprint, 'approve' ),
			],
		];

		$mail->add_device( $device_info );
		$mail->add_text( $confirm_text, 'dark' );
		$mail->add_text( $block_text, 'dark' );
		$mail->add_device_action_row( $buttons );

		if ( $fingerprint->is_pending_auto_approval() ) {
			$confirm_message = esc_html__( 'This device will be automatically marked as trusted in a few days, but click the button below to do it immediately.', 'it-l10n-ithemes-security-pro' );
		} else {
			$confirm_message = esc_html__( 'If this was you, please confirm your device by clicking the "Confirm this device" button.', 'it-l10n-ithemes-security-pro' );
		}

		$mail->add_text( '<i>' . $confirm_message . '</i>' );

		if ( $info['credit'] ) {
			$mail->add_divider();
			$mail->add_text( $info['credit'] );
		}

		$mail->add_user_footer();
		$mail->set_recipients( array( $fingerprint->get_user()->user_email ) );

		return $nc->send( 'unrecognized-login', $mail );
	}

	/**
	 * Get information about a fingerprint.
	 *
	 * @param ITSEC_Fingerprint $fingerprint
	 * @param array             $args
	 *
	 * @return array
	 */
	public static function get_fingerprint_info( ITSEC_Fingerprint $fingerprint, array $args = array() ) {

		$args = wp_parse_args( $args, array(
			'maps' => true,
		) );

		require_once( ITSEC_Core::get_core_dir() . 'lib/class-itsec-lib-browser.php' );

		$data = array(
			'uuid'        => $fingerprint->get_uuid(),
			'created_at'  => $fingerprint->get_created_at()->format( 'Y-m-d H:i:s' ),
			'browser'     => ITSEC_Lib_Browser::BROWSER_UNKNOWN,
			'browser_ver' => '',
			'platform'    => ITSEC_Lib_Browser::PLATFORM_UNKNOWN,
			'ip'          => '',
			'location'    => '',
			'map-small'   => '',
			'map-medium'  => '',
			'map-large'   => '',
			'credit'      => '',
			'date-time'   => ITSEC_Lib::date_format_i18n_and_local_timezone( $fingerprint->get_created_at()->format( 'U' ) ),
			'date'        => ITSEC_Lib::date_format_i18n_and_local_timezone( $fingerprint->get_created_at()->format( 'U' ), 'M j, Y' ),
			'time'        => ITSEC_Lib::date_format_i18n_and_local_timezone( $fingerprint->get_created_at()->format( 'U' ), 'g:ia' ),
			'title'       => esc_html__( 'Unrecognized Login', 'it-l10n-ithemes-security-pro' ), // __( 'Unrecognized login near New York, United States', 'it-l10n-ithemes-security-pro' ),
		);

		$values = $fingerprint->get_values();

		if ( isset( $values['ip'] ) ) {
			$ip = $data['ip'] = $values['ip']->get_value();

			require_once( ITSEC_Core::get_core_dir() . 'lib/class-itsec-lib-geolocation.php' );
			require_once( ITSEC_Core::get_core_dir() . 'lib/class-itsec-lib-static-map-api.php' );

			if ( ! is_wp_error( $geolocate = ITSEC_Lib_Geolocation::geolocate( $ip ) ) ) {
				/* translators: 1. Location Label */
				$data['title']    = sprintf( esc_html__( 'Unrecognized login near %s', 'it-l10n-ithemes-security-pro' ), $geolocate['label'] );
				$data['credit']   = $geolocate['credit'];
				$data['location'] = $geolocate['label'];

				$maps = $args['maps'];

				if ( true === $maps || ( is_array( $maps ) && in_array( 'small', $maps, true ) ) ) {
					if ( ! is_wp_error( $small = ITSEC_Lib_Static_Map_API::get_map( array(
						'lat'    => $geolocate['lat'],
						'long'   => $geolocate['long'],
						'width'  => '255',
						'height' => '115',
					) ) ) ) {
						$data['map-small'] = $small;
					}
				}

				if ( true === $maps || ( is_array( $maps ) && in_array( 'medium', $maps, true ) ) ) {
					if ( ! is_wp_error( $medium = ITSEC_Lib_Static_Map_API::get_map( array(
						'lat'    => $geolocate['lat'],
						'long'   => $geolocate['long'],
						'width'  => '560',
						'height' => '315',
					) ) ) ) {
						$data['map-medium'] = $medium;
					}
				}

				if ( true === $maps || ( is_array( $maps ) && in_array( 'large', $maps, true ) ) ) {
					if ( ! is_wp_error( $large = ITSEC_Lib_Static_Map_API::get_map( array(
						'lat'    => $geolocate['lat'],
						'long'   => $geolocate['long'],
						'width'  => '600',
						'height' => '200',
					) ) ) ) {
						$data['map-large'] = $large;
					}
				}
			}
		}

		if ( isset( $values['header-user-agent'] ) ) {
			$browser = new ITSEC_Lib_Browser( $values['header-user-agent']->get_value() );

			$data['browser']     = $browser->getBrowser();
			$data['platform']    = $browser->getPlatform();
			$data['browser_ver'] = $browser->getVersion();
		}

		return $data;
	}

	/**
	 * Handle an action on the WP Login page to either approve or deny a fingerprint.
	 */
	public function handle_fingerprint_action_url() {
		if ( ! isset( $_REQUEST['itsec_user'], $_REQUEST['itsec_uuid'], $_REQUEST['itsec_hash'] ) ) {
			return;
		}

		$user_id = (int) $_REQUEST['itsec_user'];
		$uuid    = $_REQUEST['itsec_uuid'];
		$actual  = $_REQUEST['itsec_hash'];

		$expected = hash_hmac( ITSEC_Lib::get_hash_algo(), "{$uuid}|{$user_id}", wp_salt() );

		if ( ! hash_equals( $actual, $expected ) ) {
			wp_die(
				__( 'Failed to confirm the device because the URL was invalid.', 'it-l10n-ithemes-security-pro' ),
				__( 'Invalid URL', 'it-l10n-ithemes-security-pro' ),
				[ 'response' => 403 ]
			);
		}

		require_once( ITSEC_Core::get_core_dir() . 'lib/class-itsec-lib-fingerprinting.php' );

		if ( ! ITSEC_Lib_Fingerprinting::applies_to_user( $user_id ) ) {
			wp_die( __( 'Trusted Devices is not enabled for your account.', 'it-l10n-ithemes-security-pro' ) );
		}

		$fingerprint = ITSEC_Fingerprint::get_by_uuid( $uuid );

		if ( ! $fingerprint || $fingerprint->get_user()->ID !== $user_id ) {
			wp_die( esc_html__( 'Invalid device identifier.', 'it-l10n-ithemes-security-pro' ) );
		}

		if ( 'POST' !== strtoupper( $_SERVER['REQUEST_METHOD'] ) ) {
			$form_action = ITSEC_Lib::get_login_url( $_REQUEST['action'], '', 'login_post' );
			$form_inputs = [
				'itsec_user' => $_REQUEST['itsec_user'] ?? '',
				'itsec_uuid' => $_REQUEST['itsec_uuid'] ?? '',
				'itsec_hash' => $_REQUEST['itsec_hash'] ?? '',
			];

			add_filter( 'wp_die_handler', function () {
				return '_scalar_wp_die_handler';
			}, 100 );
			wp_die( ITSEC_Lib::render( __DIR__ . '/templates/confirm.php', [
				'title'       => esc_html__( 'Are You Sure?', 'it-l10n-ithemes-security-pro' ),
				'mode'        => $_REQUEST['action'] === 'itsec-approve-fingerprint' ? 'approve' : 'deny',
				'device'      => ITSEC_Fingerprinting::get_fingerprint_info( $fingerprint ),
				'form_action' => $form_action,
				'form_inputs' => $form_inputs,
			], false ) );
		}

		switch ( $_REQUEST['action'] ) {
			case 'itsec-approve-fingerprint':
				if ( ! $fingerprint->approve() ) {
					if ( ! $fingerprint->can_change_status() ) {
						wp_die( esc_html__( 'This device is no longer modifiable, please contact a site administrator.', 'it-l10n-ithemes-security-pro' ) );
					}

					wp_die( esc_html__( 'Failed to confirm the new device. Please contact a site administrator.', 'it-l10n-ithemes-security-pro' ) );
				}

				add_filter( 'wp_die_handler', function () {
					return '_scalar_wp_die_handler';
				}, 100 );
				wp_die( ITSEC_Lib::render( __DIR__ . '/templates/device-approved.php', [
					'title'      => esc_html__( 'Device Approved', 'it-l10n-ithemes-security-pro' ),
					'can_manage' => user_can( $user_id, ITSEC_Core::get_required_cap() ),
				], false ) );
			case 'itsec-deny-fingerprint':
				$user = $fingerprint->get_user();

				if ( ! $fingerprint->deny() ) {
					if ( ! $fingerprint->can_change_status() ) {
						wp_die( esc_html__( 'This device is no longer modifiable, please contact a site administrator.', 'it-l10n-ithemes-security-pro' ) );
					}

					wp_die( esc_html__( 'Failed to block the new device. Please contact a site administrator.', 'it-l10n-ithemes-security-pro' ) );
				}

				$url = $this->get_reset_pass_url( $user );
				wp_safe_redirect( $url );
				die;
		}
	}

	/**
	 * Get the URL to reset your password.
	 *
	 * @param WP_User $user
	 *
	 * @return string
	 */
	private function get_reset_pass_url( $user ) {
		return add_query_arg( array(
			'key'                    => get_password_reset_key( $user ),
			'login'                  => rawurlencode( $user->user_login ),
			'itsec_from_fingerprint' => true,
		), ITSEC_Lib::get_login_url( 'rp' ) );
	}

	/**
	 * Get a link to wp-login.php that will perform an action on the fingerprint.
	 *
	 * @param ITSEC_Fingerprint $fingerprint Fingerprint to work on.
	 * @param string            $action      One of either 'approve' or 'deny'.
	 *
	 * @return string
	 */
	private function get_fingerprint_action_link( ITSEC_Fingerprint $fingerprint, $action ) {
		return add_query_arg( array(
			'itsec_user' => $fingerprint->get_user()->ID,
			'itsec_uuid' => $fingerprint->get_uuid(),
			'itsec_hash' => hash_hmac( ITSEC_Lib::get_hash_algo(), "{$fingerprint->get_uuid()}|{$fingerprint->get_user()->ID}", wp_salt() ),
		), ITSEC_Lib::get_login_url( "itsec-{$action}-fingerprint" ) );
	}

	/**
	 * Log fingerprint creation.
	 *
	 * @param ITSEC_Fingerprint $fingerprint
	 */
	public function log_create( $fingerprint ) {
		ITSEC_Log::add_debug( 'fingerprinting', 'created', array(
			'uuid'   => $fingerprint->get_uuid(),
			'status' => $fingerprint->get_status(),
		), array( 'user_id' => $fingerprint->get_user()->ID ) );
	}

	/**
	 * Log the fingerprint status changing.
	 *
	 * @param ITSEC_Fingerprint $fingerprint
	 * @param string            $suffix
	 * @param string            $context
	 */
	public function log_status( $fingerprint, $suffix, $context = '' ) {

		if ( ITSEC_Fingerprint::S_DENIED === $fingerprint->get_status() ) {
			$method = 'add_action';
		} else {
			$method = 'add_debug';
		}

		$code = "status::{$fingerprint->get_status()}";

		if ( 'override' === $context ) {
			$code .= ',override';
		}

		ITSEC_Log::$method( 'fingerprinting', $code, array(
			'uuid'      => $fingerprint->get_uuid(),
			'scheduled' => doing_action( 'itsec_scheduled_approve-fingerprints' ),
		) );

		$record = in_array( $fingerprint->get_status(), [
			ITSEC_Fingerprint::S_APPROVED,
			ITSEC_Fingerprint::S_AUTO_APPROVED,
			ITSEC_Fingerprint::S_DENIED
		], true );

		if ( $record ) {
			ITSEC_Dashboard_Util::record_event( "fingerprint-status-{$fingerprint->get_status()}" );
		}
	}

	/**
	 * Auto approve any fingerprints that have been pending auto-approval for at least two days.
	 *
	 * @param ITSEC_Job $job
	 */
	public function approve_pending_fingerprints( $job ) {

		require_once( ITSEC_Core::get_core_dir() . 'lib/class-itsec-lib-fingerprinting.php' );

		$data  = $job->get_data();
		$after = isset( $data['after'] ) ? $data['after'] : 0;

		global $wpdb;
		$rows = $wpdb->get_results( $wpdb->prepare(
			"SELECT * FROM {$wpdb->base_prefix}itsec_fingerprints WHERE `fingerprint_status` = %s AND `fingerprint_created_at` < %s AND `fingerprint_id` > %d LIMIT 100",
			ITSEC_Fingerprint::S_PENDING_AUTO_APPROVE,
			date( 'Y-m-d H:i:s', ITSEC_Core::get_current_time_gmt() - self::PENDING_DAYS * DAY_IN_SECONDS ),
			$after
		) );

		$last_id = 0;

		foreach ( $rows as $row ) {
			if ( $fingerprint = ITSEC_Fingerprint::_hydrate_fingerprint( $row ) ) {
				$last_id = $row->fingerprint_id;
				$fingerprint->auto_approve();
			}
		}

		if ( count( $rows ) < 100 ) {
			return;
		}

		$job->reschedule_in( 300, array( 'after' => $last_id ) );
	}

	/**
	 * Register Fingerprint related notifications.
	 *
	 * @param array $notifications
	 *
	 * @return array
	 */
	public function register_notifications( $notifications ) {
		$notifications['unrecognized-login'] = array(
			'subject_editable' => true,
			'message_editable' => true,
			'schedule'         => ITSEC_Notification_Center::S_NONE,
			'recipient'        => ITSEC_Notification_Center::R_USER,
			'tags'             => array( 'username', 'display_name', 'location', 'ip', 'browser', 'platform', 'site_title', 'date', 'time' ),
			'module'           => 'fingerprinting',
			'optional'         => array( 'default' => false ),
		);

		return $notifications;
	}

	/**
	 * Get the notification strings for the Unrecognized Login.
	 *
	 * @return array
	 */
	public function unrecognized_login_strings() {
		return array(
			'label'       => __( 'Unrecognized Login', 'it-l10n-ithemes-security-pro' ),
			'description' => sprintf(
				__( 'The %1$sTrusted Devices%2$s module sends users a notification if there is a login from an unrecognized device.', 'it-l10n-ithemes-security-pro' ),
				ITSEC_Core::get_link_for_settings_route( ITSEC_Core::get_settings_module_route( 'fingerprinting' ) ),
				'</a>'
			),
			'subject'     => __( 'New Login from Unrecognized Device', 'it-l10n-ithemes-security-pro' ),
			'message'     => __( 'On {{ $date }} at {{ $time }} an unrecognized device successfully logged in to your account.', 'it-l10n-ithemes-security-pro' ),
			'tags'        => array(
				'username'     => __( 'The recipient’s WordPress username.', 'it-l10n-ithemes-security-pro' ),
				'display_name' => __( 'The recipient’s WordPress display name.', 'it-l10n-ithemes-security-pro' ),
				'location'     => __( 'The approximate location of the login.', 'it-l10n-ithemes-security-pro' ),
				'ip'           => __( 'The IP address used when logging in.', 'it-l10n-ithemes-security-pro' ),
				'browser'      => __( 'The web browser used to login.', 'it-l10n-ithemes-security-pro' ),
				'platform'     => __( 'The platform used to login (Apple, Windows, etc…)', 'it-l10n-ithemes-security-pro' ),
				'date'         => __( 'The date the login occurred.', 'it-l10n-ithemes-security-pro' ),
				'time'         => __( 'The time the login occurred.', 'it-l10n-ithemes-security-pro' ),
				'site_title'   => __( 'The WordPress Site Title. Can be changed under Settings → General → Site Title', 'it-l10n-ithemes-security-pro' ),
			)
		);
	}

	public function add_site_health_info( $info ) {
		global $wpdb;

		$users        = count( $wpdb->get_col(
			"SELECT COUNT(*) FROM {$wpdb->base_prefix}itsec_fingerprints GROUP BY fingerprint_user",
		) );
		$fingerprints = $wpdb->get_var(
			"SELECT COUNT(*) FROM {$wpdb->base_prefix}itsec_fingerprints",
		);

		$info['solid-security']['fields']['fingerprints-users'] = [
			'label' => __( 'Trusted Devices Users', 'it-l10n-ithemes-security-pro' ),
			'value' => $users,
			'debug' => $users,
		];

		$info['solid-security']['fields']['fingerprints-total'] = [
			'label' => __( 'Trusted Devices Total', 'it-l10n-ithemes-security-pro' ),
			'value' => $fingerprints,
			'debug' => $fingerprints,
		];

		return $info;
	}

	/**
	 * Record the Two-Factor provider class used to authenticate.
	 *
	 * @param int    $_
	 * @param string $provider
	 */
	public function record_2fa_provider( $_, $provider ) {
		$this->provider_class_2fa = $provider;
	}

	/**
	 * Add the desired login message above the login form.
	 *
	 * @param string $message
	 *
	 * @return string
	 */
	public function login_message( $message ) {
		if ( $this->login_message ) {
			$message .= '<div class="message"><p>' . $this->login_message . '</p></div>';
		} elseif ( ! empty( $_GET['itsec_from_fingerprint'] ) ) {
			$message = '<div class="message"><p>' . esc_html__( 'Device blocked. For security purposes you must reset your password immediately.', 'it-l10n-ithemes-security-pro' ) . '</p></div>';
		} elseif ( ! empty( $_COOKIE[ self::HJP_COOKIE ] ) ) {
			$message .= '<div class="message"><p>' . esc_html__( 'For security purposes you must log in again.', 'it-l10n-ithemes-security-pro' ) . '</p></div>';
		}

		return $message;
	}

	/**
	 * Render the trusted devices confirmation module.
	 *
	 */
	public function render_trusted_devices_confirmation() {
		if ( ! $this->show_confirmation_modal() ) {
			return;
		}

		$user_id = get_current_user_id();
		$request = new WP_REST_Request( 'GET', "/ithemes-security/v1/trusted-devices/$user_id/current" );
		$request->set_query_params( [
			'_fields' => [
				'id',
				'status',
				'uses',
				'created_at',
				'last_seen',
				'approved_at',
				'location',
				'ip',
				'browser',
				'browser_version',
				'platform',
				'maps',
			],
		] );
		$response = rest_do_request( $request );
		if ( $response->is_error() ) {
			return;
		}

		add_filter( 'itsec_fingerprinting_caps_to_remove', '__return_empty_array' );
		$can_manage = ITSEC_Core::current_user_can_manage();
		remove_filter( 'itsec_fingerprinting_caps_to_remove', '__return_empty_array' );

		printf(
			'<div id="itsec-confirmation-root" data-device="%s" data-user="%s" data-can-manage="%s" data-is-admin="%s"></div>',
			esc_attr( json_encode( $response->get_data() ) ),
			esc_attr( get_current_user_id() ),
			esc_attr( $can_manage ),
			esc_attr( is_admin() )
		);
	}

	/**
	 * Enqueues JavaScript for trusted devices confirmation.
	 *
	 * @return void
	 */
	public function enqueue_trusted_device_confirmation_scripts() {
		if ( ! $this->show_confirmation_modal() ) {
			return;
		}

		wp_enqueue_script( 'itsec-fingerprinting-confirmation' );
		wp_enqueue_style( 'itsec-fingerprinting-confirmation' );
	}

	protected function show_confirmation_modal(): bool {
		if ( ! ITSEC_Core::get_notification_center()->is_notification_enabled( 'unrecognized-login' ) ) {
			return false;
		}

		if ( ! ITSEC_Lib_Fingerprinting::applies_to_user() ) {
			return false;
		}

		$fingerprint = ITSEC_Lib_Fingerprinting::get_current_fingerprint();

		if ( ! $fingerprint || ! self::is_restricting_user( wp_get_current_user(), $fingerprint ) ) {
			return false;
		}

		return true;
	}

	/**
	 * Render the trusted devices block module.
	 */
	public function render_trusted_devices_blocked() {
		$user = wp_get_current_user();

		if ( ! get_user_meta( $user->ID, self::NOTIFY_BLOCKED_META, true ) ) {
			return;
		}

		?>
		<div id="itsec-fingerprinting-blocked-root" data-user="<?php echo esc_attr( $user->ID ); ?>" data-can-manage="<?php echo esc_attr( ITSEC_Core::current_user_can_manage() ); ?>"></div>
		<?php
	}

	/**
	 * Enqueues JavaScript for trusted devices block.
	 *
	 * @return void
	 */
	public function enqueue_trusted_devices_blocked_script() {
		if ( ! get_user_meta( get_current_user_id(), self::NOTIFY_BLOCKED_META, true ) ) {
			return;
		}

		wp_enqueue_script( 'itsec-fingerprinting-blocked' );
		wp_enqueue_style( 'itsec-fingerprinting-blocked' );
	}
}
