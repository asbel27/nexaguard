<?php

final class ITSEC_Magic_Links_Privacy {

	public function __construct() {

		add_filter( 'itsec_get_privacy_policy_for_cookies', array( $this, 'get_privacy_policy_for_cookies' ) );
	}

	public function get_privacy_policy_for_cookies( $policy ) {
		$suggested_text = '<strong class="privacy-policy-tutorial">' . __( 'Suggested text:', 'it-l10n-ithemes-security-pro' ) . ' </strong>';

		$policy .= "<p>$suggested_text " . esc_html__( 'Magic links create a temporary cookie named “itsec-ml-lockout-bypass” that enables users to log in through a link sent to their email. This cookie references session data containing the user’s ID and IP address. It automatically expires after 30 minutes.', 'it-l10n-ithemes-security-pro' ) . "</p>\n";

		return $policy;
	}
}
new ITSEC_Magic_Links_Privacy();
