/**
 * WordPress dependencies
 */
import { __ } from '@wordpress/i18n';
import { useState } from '@wordpress/element';
import { closeSmall } from '@wordpress/icons';
import { useDispatch } from '@wordpress/data';

/**
 * SolidWP dependencies
 */
import {
	Text,
	TextSize,
	TextVariant,
	TextWeight,
	Root,
	solidTheme,
} from '@ithemes/ui';

/**
 * Internal dependencies
 */
import { coreStore } from '@ithemes/security.packages.data';
import { StyledModal, StyledBlock, StyledClose } from './styles';

export default function App() {
	const { saveCurrentUser } = useDispatch( coreStore );

	const [ isOpen, setIsOpen ] = useState( true );
	const closeModal = () => {
		setIsOpen( false );
		saveCurrentUser( { meta: {
			solid_security_notify_device_blocked: null,
		} } );
	};
	return (
		<Root theme={ solidTheme }>
			{ isOpen && (
				<StyledModal
					title={ __( 'Device Blocked' ) }
					onRequestClose={ closeModal }
					__experimentalHideHeader
				>
					<StyledBlock>
						<StyledClose icon={ closeSmall } onClick={ closeModal } />
						<Text
							size={ TextSize.LARGE }
							variant={ TextVariant.DARK }
							weight={ TextWeight.HEAVY }
							text={ __( 'Device blocked and Password reset' ) }
						/>
						<Text
							align="center"
							variant={ TextVariant.MUTED }
							text={ __( 'You have successfully blocked the unrecognized device and reset your password.', 'it-l10n-ithemes-security-pro' ) }
						/>
					</StyledBlock>
				</StyledModal>
			) }
		</Root>
	);
}
