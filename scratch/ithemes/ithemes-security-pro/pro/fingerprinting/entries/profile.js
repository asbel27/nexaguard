/**
 * WordPress dependencies
 */
import { registerPlugin } from '@wordpress/plugins';
import { setLocaleData, __ } from '@wordpress/i18n';

// Silence warnings until JS i18n is stable.
setLocaleData( { '': {} }, 'ithemes-security-pro' );

/**
 * Internal dependencies
 */
import App from './profile/app.js';
import { UserProfileFill } from '@ithemes/security.pages.profile';

registerPlugin( 'itsec-fingerprinting-profile', {
	render() {
		return (
			<UserProfileFill>
				{ ( { name, userId, user } ) => (
					name === 'itsec-fingerprinting-profile' && (
						<App userId={ userId } user={ user } />
					)
				) }
			</UserProfileFill>
		);
	},
	order: 5,
	label: __( 'Trusted Devices', 'it-l10n-ithemes-security-pro' ),
	scope: 'solid-security-user-profile',
	isAvailable: ( user, currentUserId, canManage ) => {
		return user._links[ 'ithemes-security:trusted-devices' ] && canManage;
	},
} );
