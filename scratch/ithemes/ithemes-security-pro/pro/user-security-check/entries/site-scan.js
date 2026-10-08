/**
 * WordPress dependencies
 */
import { registerPlugin } from '@wordpress/plugins';
import { __, setLocaleData } from '@wordpress/i18n';
import { dispatch } from '@wordpress/data';
import apiFetch from '@wordpress/api-fetch';

// Silence warnings until JS i18n is stable.
setLocaleData( { '': {} }, 'ithemes-security-pro' );

/**
 * Internal dependencies
 */
import { store } from '@ithemes/security.pages.site-scan';
import App from './site-scan/app.js';

registerPlugin( 'itsec-user-security-check-site-scan', {
	render() {
		return <App />;
	},
} );

dispatch( store ).registerScanComponent( {
	slug: 'inactive-users',
	priority: 1,
	label: __( 'Inactive Users', 'it-l10n-ithemes-security-pro' ),
	description: __( 'Scan for inactive users registered on your site', 'it-l10n-ithemes-security-pro' ),
	async execute() {
		return apiFetch( {
			method: 'GET',
			path: '/ithemes-security/v1/user-security-check/inactive-users-scan',
		} );
	},
} );
