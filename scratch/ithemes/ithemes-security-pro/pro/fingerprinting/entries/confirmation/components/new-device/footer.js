/**
 * WordPress dependencies
 */
import { __ } from '@wordpress/i18n';
import { info } from '@wordpress/icons';
import { createInterpolateElement } from '@wordpress/element';

/**
 * SolidWP dependencies
 */
import { Button, Text, TextVariant } from '@ithemes/ui';

/**
 * Internal dependencies
 */
import { StyledFooter, StyledIconContainer, StyledInfoIcon, StyledFooterButtons } from './styles';

export default function ModalFooter( { canManage, sendEmail, onDismiss } ) {
	return (
		<StyledFooter>
			<Text
				variant={ TextVariant.MUTED }
				text={ __( 'You are logged in from an unrecognized device/device location. Confirm or ignore this device/device location below.', 'it-l10n-ithemes-security-pro' ) }
			/>
			{ canManage && (
				<StyledIconContainer>
					<StyledInfoIcon icon={ info } fill={ '#ffc518' } />
					<Text as="p">{
						createInterpolateElement( __( 'If you don’t want to trust this device, you can continue to use your site with reduced permissions. <a>Learn more about the Trusted Devices here</a>.', 'it-l10n-ithemes-security-pro' ), {
							// eslint-disable-next-line jsx-a11y/anchor-has-content
							a: <a href="https://go.solidwp.com/about-trusted-devices" />,
						} ) }</Text>
				</StyledIconContainer>
			) }
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
