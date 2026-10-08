/**
 * WordPress dependencies
 */
import { __ } from '@wordpress/i18n';
import { dateI18n } from '@wordpress/date';
import { arrowRight } from '@wordpress/icons';

/**
 * SolidWP dependencies
 */
import { Text, TextVariant, TextWeight } from '@ithemes/ui';

/**
 * Internal dependencies
 */
import Device from '../device';
import { StyledCard, StyledNotice, StyledDetails, StyledButton } from './styles';

export default function DeviceCard( { device, viewDeviceDetails } ) {
	const openModal = ( ) => {
		viewDeviceDetails( device );
	};

	return (
		<StyledCard>
			<StyledNotice>
				<Text
					variant={ TextVariant.DARK }
					weight={ TextWeight.HEAVY }
					text={ __( 'Unrecognized login to your account', 'it-l10n-ithemes-security-pro' ) }
				/>
				<Text
					variant={ TextVariant.MUTED }
					text={ __( 'Do you recognize this login?', 'it-l10n-ithemes-security-pro' ) }
				/>
			</StyledNotice>
			<StyledDetails>
				<Text text={ dateI18n( 'M. j, Y g:i A', device.created_at ) } />
				<Device device={ device } />
			</StyledDetails>
			<StyledButton
				icon={ arrowRight }
				iconPosition="right"
				variant="link"
				onClick={ openModal }
				text={ __( 'View device details', 'it-l10n-ithemes-security-pro' ) }
			/>
		</StyledCard>
	);
}
