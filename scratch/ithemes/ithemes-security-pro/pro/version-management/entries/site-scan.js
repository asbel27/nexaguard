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

registerPlugin( 'itsec-version-management-site-scan', {
	render() {
		return <App />;
	},
} );

dispatch( store ).registerScanComponent( {
	slug: 'old-site-scan',
	priority: 2,
	label: __( 'Rogue Installs', 'it-l10n-ithemes-security-pro' ),
	description: __( 'Check for sites that are no longer in use.', 'it-l10n-ithemes-security-pro' ),
	async execute() {
		return apiFetch( {
			method: 'POST',
			path: '/ithemes-security/v1/version-management/old-site-scan',
		} );
	},
} );
