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
import DetailModal from './confirmation/detail-modal.js';
import ConfirmationModal from './confirmation/confirmation-modal';

domReady( () => {
	const el = document.getElementById( 'itsec-confirmation-root' );
	const canManage = el.dataset.canManage === '1';
	const userId = Number.parseInt( el.dataset.user, 10 );
	const isFront = el.dataset.isAdmin !== '1';

	if ( el ) {
		render(
			<ConfirmationModal
				canManage={ canManage }
				userId={ userId }
				device={ JSON.parse( el.dataset.device ) }
				isFront={ isFront }
			/>,
			document.getElementById( 'itsec-confirmation-root' ) );
	}

	const toolbarItem = document.getElementById( 'wp-admin-bar-itsec-fingerprinting' );
	toolbarItem.addEventListener( 'click', function() {
		const container = document.createElement( 'div' );
		document.body.append( container );
		render(
			<DetailModal canManage={ canManage } userId={ userId } />,
			container
		);
	} );
} );
