/**
 * WordPress dependencies
 */
import { __ } from '@wordpress/i18n';
import { format } from '@wordpress/date';

/**
 * SolidWP dependencies
 */
import { Heading, Text, TextSize, TextVariant, TextWeight } from '@ithemes/ui';

/**
 * Internal dependencies
 */
import { StyledHeader, StyledHeading, StyledBadge } from './styles.js';

export default function ModalHeader( { canManage } ) {
	const requestDate = format( 'M j, Y g:i a', new window.Date() );

	return (
		<StyledHeader>
			<StyledHeading>
				<Heading
					level={ 2 }
					size={ TextSize.LARGE }
					variant={ TextVariant.DARK }
					weight={ TextWeight.HEAVY }
					text={ __( 'You are logged in on a new device', 'it-l10n-ithemes-security-pro' ) }
				/>
				{ canManage && (
					<StyledBadge text={ __( 'Trusted Devices', 'it-l10n-ithemes-security-pro' ) } />
				) }
			</StyledHeading>
			<Text
				variant={ TextVariant.MUTED }
				weight={ TextWeight.HEAVY }
				text={ requestDate }
			/>
		</StyledHeader>
	);
}
