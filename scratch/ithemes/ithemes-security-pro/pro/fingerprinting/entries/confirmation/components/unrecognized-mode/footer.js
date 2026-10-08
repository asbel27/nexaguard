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
import { StyledFooter, StyledFooterButtons } from './styles';

export default function ModalFooter( { sendEmail, onDismiss } ) {
	return (
		<StyledFooter>
			<StyledFooterButtons>
				<Button
					variant="muted"
					onClick={ () => onDismiss( true ) }
					text={ __( 'Continue with limited access', 'it-l10n-ithemes-security-pro' ) }
				/>
				<Button
					variant="primary"
					onClick={ sendEmail }
					text={ __( 'Send confirmation email', 'it-l10n-ithemes-security-pro' ) }
				/>
			</StyledFooterButtons>
		</StyledFooter>
	);
}
