<?php

class ITSEC_User_Security_Check {
	public function run() {
		add_filter( 'itsec_send_notification_inactive-users', array( $this, 'check_inactive_accounts' ), 10, 2 );
		add_filter( 'itsec_notifications', array( $this, 'register_notifications' ) );
		add_filter( 'itsec_inactive-users_notification_strings', array( $this, 'inactive_users_strings' ) );
	}

	/**
	 * Iterate over all users who haven't been active in the last 30 days and email admins the results.
	 *
	 * @param bool $sent
	 * @param int  $last_sent
	 *
	 * @return bool
	 */
	public function check_inactive_accounts( $sent, $last_sent ) {
		if ( defined( 'ITSEC_DISABLE_INACTIVE_USER_CHECK' ) && ITSEC_DISABLE_INACTIVE_USER_CHECK ) {
			return false;
		}

		$max_days = ITSEC_User_Security_Check_Utility::get_inactive_user_days();
		$users    = ITSEC_User_Security_Check_Utility::get_inactive_users( false, false );

		if ( empty( $users ) ) {
			return true;
		}

		$nc   = ITSEC_Core::get_notification_center();
		$mail = $nc->mail();

		$mail->add_header(
			esc_html__( 'Inactive User Warning', 'it-l10n-ithemes-security-pro' ),
			esc_html__( 'Inactive User Warning', 'it-l10n-ithemes-security-pro' ),
			false,
			esc_html__( 'Please take the time to review the users and demote or delete any where it makes sense.', 'it-l10n-ithemes-security-pro' ),
		);
		$mail->add_info_box(
			sprintf(
				_n(
					'The following users have been inactive for more than %d day',
					'The following users have been inactive for more than %d days',
					$max_days,
					'it-l10n-ithemes-security-pro'
				),
				$max_days
			),
			'warning'
		);

		$table_rows = array();

		foreach ( $users as $user ) {
			update_user_meta( $user->ID, 'itsec_user_activity_last_seen_notification_sent', true );

			$roles = array_map( 'translate_user_role', $user->roles );
			$role  = wp_sprintf( '%l', $roles );

			$last_seen    = ITSEC_Lib_User_Activity::get_instance()->get_last_seen( $user->ID );
			$last_seen    = $last_seen ? ITSEC_Lib::human_time_diff_or_date( $last_seen ) : __( 'Unknown', 'it-l10n-ithemes-security-pro' );
			$table_rows[] = array( $user->user_login, $role, $last_seen );
		}

		$mail->add_table( array( esc_html__( 'Username', 'it-l10n-ithemes-security-pro' ), esc_html__( 'Role', 'it-l10n-ithemes-security-pro' ), esc_html__( 'Last Active', 'it-l10n-ithemes-security-pro' ) ), $table_rows );
		$mail->add_button( esc_html__( 'Edit Users', 'it-l10n-ithemes-security-pro' ), ITSEC_Mail::filter_admin_page_url( admin_url( 'admin.php?page=itsec&module=user-security-check' ) ) );
		$mail->add_footer();

		return $nc->send( 'inactive-users', $mail );
	}

	/**
	 * Register Two Factor Reminder and Inactive Users notifications.
	 *
	 * @param array $notifications
	 *
	 * @return array
	 */
	public function register_notifications( $notifications ) {
		$notifications['inactive-users'] = array(
			'subject_editable' => true,
			'schedule'         => ITSEC_Notification_Center::S_CONFIGURABLE,
			'recipient'        => ITSEC_Notification_Center::R_USER_LIST,
			'optional'         => true,
			'module'           => 'user-security-check',
		);

		return $notifications;
	}

	/**
	 * Get the translated strings for the Inactive Users email.
	 *
	 * @return array
	 */
	public function inactive_users_strings() {
		return array(
			'label'       => __( 'Inactive Users', 'it-l10n-ithemes-security-pro' ),
			'description' => __( 'The User Security Check module sends a list of users who have not been active in the last 30 days so you can consider demoting or removing users.', 'it-l10n-ithemes-security-pro' ),
			'subject'     => __( 'Inactive Users', 'it-l10n-ithemes-security-pro' ),
		);
	}
}
