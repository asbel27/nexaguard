<?php

class ITSEC_Privilege {

	function run() {

		add_action( 'admin_init', array( $this, 'admin_init' ) );

		add_action( 'itsec_security_digest_attach_additional_info', array( $this, 'customize_security_digest' ), 10, 2 );

		add_action( 'plugins_loaded', array( $this, 'escalate_user' ), 1 );
		add_action( 'switch_blog', array( $this, 'escalate_user' ) );

	}

	/**
	 * Process resetting form
	 *
	 * @since 1.11
	 *
	 * @return void
	 */
	public function admin_init() {
		//if they've clicked a button hide the notice
		if ( isset( $_GET['itsec-clear-privilege'] ) && wp_verify_nonce( $_GET['_wpnonce'], 'itsec_clear_privilege' ) && ITSEC_Core::current_user_can_manage() ) {
			delete_user_meta( absint( $_GET['itsec-clear-privilege'] ), 'itsec_privilege_role' );
			delete_user_meta( absint( $_GET['itsec-clear-privilege'] ), 'itsec_privilege_expires' );

			wp_redirect( admin_url( 'user-edit.php' ) . '?user_id=' . absint( $_GET['itsec-clear-privilege'] ), '302' );
			exit();
		}
	}

	/**
	 * Converts saved role integer to appropriate string
	 *
	 * @since 1.11
	 *
	 * @param int $role the current role
	 *
	 * @return bool|string the current role string of false if invalid input
	 */
	private function convert_current_role( $role ) {
		switch ( $role ) {
			case 1:
				return 'editor';
			case 2:
				return 'administrator';
			case 3:
				return 'super-admin';
			default:
				return false;
		}
	}

	/**
	 * Returns the role of the current user
	 *
	 * @since 1.11
	 *
	 * @param wp_user $user WP_User object
	 *
	 * @return int current role
	 */
	private function get_current_role( $user ) {

		if ( is_multisite() && $user->has_cap( 'manage_network_options' ) ) {

			return 3;

		} elseif ( $user->has_cap( 'manage_options' ) ) {

			return 2;

		} elseif ( $user->has_cap( 'moderate_comments' ) ) {

			return 1;

		}

		return 0;

	}

	/**
	 * Process the user role upgrade
	 *
	 * @since 1.11
	 *
	 * @return void
	 */
	public function escalate_user() {

		global $wp_roles, $super_admins;

		if ( ! is_callable( 'wp_get_current_user' ) ) {
			return;
		}

		$current_user = wp_get_current_user();

		if ( ! is_object( $current_user ) || ! isset( $current_user->ID ) ) {
			return;
		}

		$temp_role         = intval( get_user_meta( $current_user->ID, 'itsec_privilege_role', true ) );
		$temp_role_expires = intval( get_user_meta( $current_user->ID, 'itsec_privilege_expires', true ) );

		if ( $temp_role > 0 && $temp_role_expires > 0 ) {
			if ( ITSEC_Core::get_current_time_gmt() > $temp_role_expires ) {

				delete_user_meta( $current_user->ID, 'itsec_privilege_role' );
				delete_user_meta( $current_user->ID, 'itsec_privilege_expires' );

			} else {
				$temp_role_converted    = $this->convert_current_role( $temp_role );
				$current_role_converted = $this->convert_current_role( $this->get_current_role( $current_user ) );

				if ( $temp_role === 3 ) {
					$temp_role_converted = 'administrator';
				}

				if ( ! is_array( $super_admins ) ) {
					$super_admins = array( $current_user->user_login );
				}

				$current_user->allcaps  = $wp_roles->roles[ $temp_role_converted ]['capabilities']; //Set new capabilities
				$current_user->roles[0] = strtolower( $temp_role_converted ); //Set new role
				unset( $current_user->caps[ $current_role_converted ] ); //Delete old capabilities
				$current_user->caps[ $temp_role_converted ] = true; //Turn on current capabilities
			}

		}

	}

	/**
	 * Requires a unique nicename on profile update or activate.
	 *
	 * @since 1.11
	 *
	 * @param \WP_Error $errors Profile entry errors.
	 *
	 * @return void
	 */
	public function user_profile_update_errors( $errors ) {

		$errors->add( 'user_error', __( 'You must select a valid number of days (greater than 0) for temporary role expiration.', 'it-l10n-ithemes-security-pro' ) );

	}

	/**
	 * Customize the security digest to include information about privilege escalations.
	 *
	 * @param ITSEC_Mail              $mail
	 * @param ITSEC_Notify_Data_Proxy $data
	 */
	public function customize_security_digest( $mail, $data ) {

		if ( ! $data->has_message( 'privilege-escalation' ) ) {
			return;
		}

		$escalations = $data->get_messages_of_type( 'privilege-escalation' );

		$mail->add_section_heading( esc_html__( 'Privilege Escalations', 'it-l10n-ithemes-security-pro' ) );
		$mail->add_text( esc_html__( 'The following users have been escalated since the last email.', 'it-l10n-ithemes-security-pro' ) );

		$rows = array();

		foreach ( $escalations as $escalation ) {

			switch ( $escalation['role'] ) {
				case 3:
					$role = esc_html__( 'Network Administrator', 'it-l10n-ithemes-security-pro' );
					break;
				case 2:
					$role = esc_html__( 'Administrator', 'it-l10n-ithemes-security-pro' );
					break;
				case 1:
					$role = esc_html__( 'Editor', 'it-l10n-ithemes-security-pro' );
					break;
				default:
					$role = $escalation['role'];
					break;
			}

			if ( get_userdata( $escalation['user_id'] ) ) {
				$username = $escalation['username'];
			} else {
				/* translators: 1. Username. */
				$username = sprintf( esc_html__( '%s (deleted)', 'it-l10n-ithemes-security-pro' ), $escalations['username'] );
			}

			$rows[] = array(
				$username,
				$role,
				( $user = get_userdata( $escalation['performed_by'] ) ) ? $user->user_login : "#{$user->ID}",
				ITSEC_Lib::date_format_i18n_and_local_timezone( $escalation['time'] ),
				ITSEC_Lib::date_format_i18n_and_local_timezone( $escalation['expires'] ),
			);
		}

		$mail->add_table( array(
			esc_html__( 'User', 'it-l10n-ithemes-security-pro' ),
			esc_html__( 'Role', 'it-l10n-ithemes-security-pro' ),
			esc_html__( 'Performed By', 'it-l10n-ithemes-security-pro' ),
			esc_html__( 'Escalated At', 'it-l10n-ithemes-security-pro' ),
			esc_html__( 'Expiration', 'it-l10n-ithemes-security-pro' ),
		), $rows );
	}
}
