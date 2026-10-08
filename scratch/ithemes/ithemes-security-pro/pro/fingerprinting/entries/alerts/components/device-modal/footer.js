/**
 * WordPress dependencies
 */
import { __ } from '@wordpress/i18n';

/**
 * SolidWP dependencies
 */
import { Button } from '@ithemes/ui';

/**
 * Internal dependencies
 */
import { StyledFooter, StyledButtons, StyledIgnoreButton } from './styles';

export default function Footer( { device, updateDevice } ) {
	return (
		<StyledFooter>
			<StyledButtons>
				<Button
					variant="secondary"
					isDestructive
					onClick={ () => updateDevice( device, 'denied' ) }
					text={ __( 'No, secure account', 'it-l10n-ithemes-security-pro' ) }
				/>
				<Button
					variant="secondary"
					onClick={ () => updateDevice( device, 'approved' ) }
					text={ __( 'Yes, it was me', 'it-l10n-ithemes-security-pro' ) }
				/>
			</StyledButtons>
			<StyledIgnoreButton
				variant="muted"
				onClick={ () => updateDevice( device, 'ignored' ) }
				text={ __( 'Ignore', 'it-l10n-ithemes-security-pro' ) }
			/>
		</StyledFooter>
	);
}
