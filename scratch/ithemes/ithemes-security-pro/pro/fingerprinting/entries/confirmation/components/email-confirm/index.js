/**
 * WordPress dependencies
 */
import { __ } from '@wordpress/i18n';
import { closeSmall, arrowLeft } from '@wordpress/icons';

/**
 * SolidWP dependencies
 */
import { Button, Heading, TextSize, TextVariant } from '@ithemes/ui';

/**
 * Internal dependencies
 */
import {
	StyledConfirmationContainer,
	StyledConfirmation,
	StyledHeader,
	StyledEmailSent,
	StyledEmailError,
	StyledClose,
	StyledConfirmationText,
} from './styles';

export default function EmailConfirmation( { isFront, onDismiss, error, previous } ) {
	return (
		<StyledConfirmationContainer>
			{ error ? (
				<StyledConfirmation>
					<StyledHeader hasError isFront={ isFront }>
						<StyledEmailError />
					</StyledHeader>
					<Heading
						level={ 2 }
						size={ TextSize.LARGE }
						variant={ TextVariant.DARK }
						text={ __( 'There was an error sending the confirmation email', 'it-l10n-ithemes-security-pro' ) }
					/>
					<StyledConfirmationText
						align="center"
						variant={ TextVariant.MUTED }
						text={ __( 'Please return to the previous screen and try again.', 'it-l10n-ithemes-security-pro' ) }
					/>
					<Button
						variant="muted"
						icon={ arrowLeft }
						onClick={ previous }
						text={ __( 'Back to the previous screen', 'it-l10n-ithemes-security-pro' ) }
					/>
				</StyledConfirmation>
			) : (
				<>
					<StyledClose icon={ closeSmall } onClick={ () => onDismiss( true ) } />
					<StyledConfirmation>
						<StyledHeader isFront={ isFront }>
							<StyledEmailSent />
						</StyledHeader>
						<Heading
							level={ 2 }
							size={ TextSize.LARGE }
							variant={ TextVariant.DARK }
							text={ __( 'Email Sent', 'it-l10n-ithemes-security-pro' ) }
						/>
						<StyledConfirmationText
							align="center"
							variant={ TextVariant.MUTED }
							text={ __( 'A confirmation email was sent to the email on file. Click the link inside the confirmation email and you will be directed back here with proper access granted.', 'it-l10n-ithemes-security-pro' ) }
						/>
					</StyledConfirmation>
				</>
			) }

		</StyledConfirmationContainer>
	);
}
