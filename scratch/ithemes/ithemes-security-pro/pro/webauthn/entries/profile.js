/**
 * WordPress dependencies
 */
import { registerPlugin } from '@wordpress/plugins';
import { __, setLocaleData } from '@wordpress/i18n';

// Silence warnings until JS i18n is stable.
setLocaleData( { '': {} }, 'ithemes-security-pro' );

/**
 * Internal dependencies
 */
import App from './profile/app.js';
import { UserProfileFill } from '@ithemes/security.pages.profile';

registerPlugin( 'itsec-webauthn-profile', {
	render() {
		return (
			<UserProfileFill>
				{ ( { name, userId, user, useShadow } ) => (
					name === 'itsec-webauthn-profile' && (
						<App userId={ userId } user={ user } useShadow={ useShadow } />
					)
				) }
			</UserProfileFill>
		);
	},
	order: 2,
	label: __( 'Passkeys', 'it-l10n-ithemes-security-pro' ),
	scope: 'solid-security-user-profile',
	isAvailable: ( user, currentUserId ) => {
		return !! user.itsec_passwordless_login?.available_methods.includes( 'webauthn' ) && user.id === currentUserId;
	},
} );
