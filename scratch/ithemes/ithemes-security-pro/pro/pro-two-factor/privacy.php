<?php

final class ITSEC_Pro_Two_Factor_Privacy {

	public function __construct() {
		$settings = ITSEC_Modules::get_settings( 'two-factor' );

		if ( ! $settings['remember_group'] ) {
			return;
		}

		add_filter( 'itsec_get_privacy_policy_for_cookies', array( $this, 'get_privacy_policy_for_cookies' ) );
	}

	public function get_privacy_policy_for_cookies( $policy ) {
		$suggested_text = '<strong class="privacy-policy-tutorial">' . __( 'Suggested text:', 'it-l10n-ithemes-security-pro' ) . ' </strong>';

		$policy .= "<p>$suggested_text " . esc_html__( 'Some users can enable the "Remember This Device" feature to skip Two-Factor when using the same device. This generates a cookie named “itsec_remember_2fa”. It contains no personal data and expires after 30 days.', 'it-l10n-ithemes-security-pro' ) . "</p>\n";

		return $policy;
	}
}
new ITSEC_Pro_Two_Factor_Privacy();
