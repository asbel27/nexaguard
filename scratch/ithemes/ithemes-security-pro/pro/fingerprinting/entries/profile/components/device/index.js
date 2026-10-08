/**
 * WordPress dependencies
 */
import { __, sprintf } from '@wordpress/i18n';
import { dateI18n } from '@wordpress/date';
import { SelectControl } from '@wordpress/components';
import { useSelect, useDispatch } from '@wordpress/data';

/**
 * SolidWP dependencies
 */
import { Text, TextVariant, TextWeight } from '@ithemes/ui';

/**
 * Internal dependencies
 */
import { trustedDevicesStore } from '@ithemes/security.packages.data';
import { isImmutableDevice } from '../../app';
import {
	StyledDeviceSurface,
	StyledDeviceDetails,
	StyledLocation,
	StyledCreated,
	StyledIP,
	StyledPlatform,
	StyledBrowser,
	StyledLastSeen,
	StyledStatus,
	StyledSectionLabel,
	StyledError,
} from './styles';

const deviceStatus = [
	{
		value: 'approved',
		label: __( 'Approved', 'it-l10n-ithemes-security-pro' ),
	},
	{
		value: 'auto-approved',
		label: __( 'Auto-approved', 'it-l10n-ithemes-security-pro' ),
		disabled: true,
	},
	{
		value: 'pending-auto-approval',
		label: __( 'Pending Auto-approval', 'it-l10n-ithemes-security-pro' ),
		disabled: true,
	},
	{
		value: 'pending',
		label: __( 'Pending', 'it-l10n-ithemes-security-pro' ),
		disabled: true,
	},
	{
		value: 'ignored',
		label: __( 'Ignored', 'it-l10n-ithemes-security-pro' ),
	},
	{
		value: 'denied',
		label: __( 'Denied', 'it-l10n-ithemes-security-pro' ),
	},
];

export default function Device( { self } ) {
	const { device, error } = useSelect( ( select ) => ( {
		device: select( trustedDevicesStore ).getEditedItem( self ),
		error: select( trustedDevicesStore ).getLastSaveError( self ),
	} ), [ self ] );
	const { editItem } = useDispatch( trustedDevicesStore );
	const hasGeolocation = !! device?.location;

	return (
		<StyledDeviceSurface variant="primary" hasError={ error }>
			{ error && <StyledError as="p">{ error.message }</StyledError> }
			<StyledDeviceDetails hasGeolocation={ hasGeolocation }>
				<StyledLocation>
					<StyledSectionLabel
						variant={ TextVariant.MUTED }
						text={ device?.location ? __( 'Location', 'it-l10n-ithemes-security-pro' ) : __( 'IP address', 'it-l10n-ithemes-security-pro' ) }
					/>
					<Text
						variant={ TextVariant.DARK }
						weight={ TextWeight.HEAVY }
						text={ device?.location ? device.location : device.ip }
					/>
				</StyledLocation>
				<StyledCreated>
					<StyledSectionLabel
						variant={ TextVariant.MUTED }
						text={ __( 'Created', 'it-l10n-ithemes-security-pro' ) }
					/>
					<Text
						variant={ TextVariant.DARK }
						weight={ TextWeight.HEAVY }
						text={ dateI18n( 'M. j, Y g:i a', device.created_at ) }
					/>
				</StyledCreated>
				<StyledBrowser>
					<StyledSectionLabel
						variant={ TextVariant.MUTED }
						text={ __( 'Browser', 'it-l10n-ithemes-security-pro' ) }
					/>
					<Text
						variant={ TextVariant.DARK }
						weight={ TextWeight.HEAVY }
						text={
							sprintf(
								/* translators: 1. Browser type. 2. Browser version. */
								__( '%1$s (%2$s)', 'it-l10n-ithemes-security-pro' ),
								device.browser,
								device.browser_version
							)
						}
					/>
				</StyledBrowser>
				{ hasGeolocation && (
					<StyledIP>
						<StyledSectionLabel
							variant={ TextVariant.MUTED }
							text={ __( 'IP address', 'it-l10n-ithemes-security-pro' ) }
						/>
						<Text
							variant={ TextVariant.DARK }
							weight={ TextWeight.HEAVY }
							text={ device.ip }
						/>
					</StyledIP>
				) }
				<StyledPlatform>
					<StyledSectionLabel
						variant={ TextVariant.MUTED }
						text={ __( 'Platform', 'it-l10n-ithemes-security-pro' ) }
					/>
					<Text
						variant={ TextVariant.DARK }
						weight={ TextWeight.HEAVY }
						text={ device.platform }
					/>
				</StyledPlatform>
				<StyledStatus>
					<StyledSectionLabel
						variant={ TextVariant.MUTED }
						text={ __( 'Status', 'it-l10n-ithemes-security-pro' ) }
					/>
					<SelectControl
						value={ device.status.raw }
						onChange={ ( newStatus ) => editItem( self, { status: { raw: newStatus } } ) }
						options={ deviceStatus }
						disabled={ isImmutableDevice( device ) }
						__nextHasNoMarginBottom
					/>
				</StyledStatus>
				<StyledLastSeen>
					<StyledSectionLabel
						variant={ TextVariant.MUTED }
						text={ __( 'Last seen', 'it-l10n-ithemes-security-pro' ) }
					/>
					<Text
						variant={ TextVariant.DARK }
						weight={ TextWeight.HEAVY }
						text={ dateI18n( 'M. j, Y g:i a', device.last_seen ) }
					/>
				</StyledLastSeen>
			</StyledDeviceDetails>
		</StyledDeviceSurface>
	);
}
