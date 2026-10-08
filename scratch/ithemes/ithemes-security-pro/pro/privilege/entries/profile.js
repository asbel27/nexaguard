/**
 * WordPress dependencies
 */
import { registerPlugin } from '@wordpress/plugins';
import { setLocaleData, __ } from '@wordpress/i18n';
import apiFetch from '@wordpress/api-fetch';

// Silence warnings until JS i18n is stable.
setLocaleData( { '': {} }, 'ithemes-security-pro' );

/**
 * Internal dependencies
 */
import App from './profile/app.js';
import { UserProfileFill } from '@ithemes/security.pages.profile';

registerPlugin( 'itsec-privilege-profile', {
	render() {
		return (
			<UserProfileFill>
				{ ( { name, userId } ) => (
					name === 'itsec-privilege-profile' && (
						<App
							userId={ userId }
						/>
					)
				) }
			</UserProfileFill>
		);
	},
	order: 4,
	label: __( 'Privilege Escalation', 'it-l10n-ithemes-security-pro' ),
	scope: 'solid-security-user-profile',
	isAvailable: () => {
		return apiFetch( {
			method: 'OPTIONS',
			path: 'ithemes-security/rpc/privilege/escalate',
			parse: false,
		} ).then( ( response ) => {
			return !! response.headers.get( 'allow' )?.includes( 'POST' );
		} );
	},
} );
