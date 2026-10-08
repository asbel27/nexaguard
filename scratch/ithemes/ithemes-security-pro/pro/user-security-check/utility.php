<?php

class ITSEC_User_Security_Check_Utility {

	public static function get_inactive_user_days() {
		return apply_filters( 'itsec_inactive_user_days', 30 );
	}

	/**
	 * Gets the list of inactive users.
	 *
	 * @param bool $include_notified Whether to include users who have been notified already.
	 *
	 * @return WP_User[]
	 */
	public static function get_inactive_users( bool $include_notified, bool $include_ignored ): array {
		$max_days = self::get_inactive_user_days();
		$args     = [
			'meta_query' => [
				[
					'key'     => 'itsec_user_activity_last_seen',
					'value'   => time() - ( $max_days * DAY_IN_SECONDS ),
					'compare' => '<=',
				],
			],
		];

		if ( ! $include_notified ) {
			$args['meta_query'][] = [
				'key'     => 'itsec_user_activity_last_seen_notification_sent',
				'compare' => 'NOT EXISTS',
			];
		}

		if ( ! $include_ignored ) {
			$args['meta_query'][] = [
				'key'     => '_solid_activity_ignore',
				'compare' => 'NOT EXISTS',
			];
		}

		return ITSEC_Lib_Canonical_Roles::get_users_with_canonical_role( [ 'administrator', 'editor' ], $args );
	}

	/**
	 * Send a Two-Factor setup reminder.
	 *
	 * @param WP_User      $recipient User to send the reminder to.
	 * @param WP_User|null $requester Person requesting the user setup 2fa. Used to personalize the message.
	 *
	 * @return true|WP_Error
	 */
	public static function send_2fa_reminder( WP_User $recipient, WP_User $requester = null ) {
		_deprecated_function( __METHOD__, '8.0', 'ITSEC_Two_Factor::send_setup_reminder' );

		if ( ! ITSEC_Modules::is_active( 'two-factor' ) ) {
			return new WP_Error( 'itsec.user-security-check.2fa-inactive', __( 'The Two-Factor module is not active.', 'it-l10n-ithemes-security-pro' ) );
		}

		return ITSEC_Two_Factor::get_instance()->send_setup_reminder( $recipient, $requester );
	}
}
