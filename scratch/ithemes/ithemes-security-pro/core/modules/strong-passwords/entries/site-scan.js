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
import App from './site-scan/app.js';
import { store } from '@ithemes/security.pages.site-scan';

registerPlugin( 'itsec-strong-passwords-site-scan', {
	render() {
		return <App />;
	},
} );

dispatch( store ).registerScanComponent( {
	slug: 'passwords',
	priority: 20,
	label: __( 'Password', 'it-l10n-ithemes-security-pro' ),
	description: __( 'Check for insecure password use on your site', 'it-l10n-ithemes-security-pro' ),

	async execute() {
		return apiFetch( {
			method: 'GET',
			path: '/ithemes-security/v1/strong-passwords/scan',
		} );
	},
} );
