/**
 * WordPress dependencies
 */
import { createPortal } from '@wordpress/element';
import { Popover, SlotFillProvider } from '@wordpress/components';

/**
 * Internal dependencies
 */
import Toolbar from './components/toolbar';
import './style.scss';

export default function App( { portalEl, noticesEl, userId, blockedUrl, usesRestrict, showNotice } ) {
	return (
		<SlotFillProvider>
			{ createPortal( <Popover.Slot />, portalEl ) }
			<Toolbar
				noticesEl={ noticesEl }
				userId={ userId }
				blockedUrl={ blockedUrl }
				usesRestrict={ usesRestrict }
				showNotice={ showNotice }
			/>
		</SlotFillProvider>
	);
}
