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
import App from './blocked/app.js';

domReady( () => {
	const el = document.getElementById( 'itsec-fingerprinting-blocked-root' );

	if ( el ) {
		render(
			<App />,
			el
		);
	}
} );
