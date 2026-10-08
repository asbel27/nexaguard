/**
 * WordPress dependencies
 */
import { render } from '@wordpress/element';
import domReady from '@wordpress/dom-ready';
import { setLocaleData } from '@wordpress/i18n';

// Silence warnings until JS i18n is stable.
setLocaleData( { '': {} }, 'ithemes-security-pro' );

/**
 * Internal dependencies
 */
import App from './alerts/app.js';

domReady( () => {
	const toolbarEl = document.getElementById( 'wp-admin-bar-itsec_fingerprinting_login_alerts' );
	const portalEl = document.getElementById( 'itsec-fingerprinting-alerts-root' );
	const noticesEl = document.getElementById( 'wpbody' ) ?? document.body;

	if ( toolbarEl && portalEl ) {
		render(
			<App
				portalEl={ portalEl }
				noticesEl={ noticesEl }
				userId={ Number.parseInt( portalEl.dataset.user, 10 ) }
				blockedUrl={ portalEl.dataset.resetUrl }
				usesRestrict={ portalEl.dataset.usesRestrict }
				showNotice={ portalEl.dataset.showNotice === '1' }
			/>,
			toolbarEl
		);
	}
} );
