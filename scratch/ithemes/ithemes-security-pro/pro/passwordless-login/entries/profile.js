/**
 * WordPress dependencies
 */
import { registerPlugin } from '@wordpress/plugins';
import { setLocaleData, __ } from '@wordpress/i18n';

/**
 * Internal dependencies
 */
import App from './profile/app.js';
import { UserProfileFill } from '@ithemes/security.pages.profile';

export { App };

// Silence warnings until JS i18n is stable.
setLocaleData( { '': {} }, 'ithemes-security-pro' );

registerPlugin( 'itsec-passwordless-login-profile', {
	render() {
		return (
			<UserProfileFill>
				{ ( { name, userId, useShadow } ) => (
					name === 'itsec-passwordless-login-profile' && (
						<App userId={ userId } useShadow={ useShadow } />
					)
				) }
			</UserProfileFill>
		);
	},
	order: 1,
	label: __( 'Passwordless Login', 'it-l10n-ithemes-security-pro' ),
	scope: 'solid-security-user-profile',
	isAvailable: ( user ) => {
		return !! user.itsec_passwordless_login?.available;
	},
} );
