/**
 * WordPress dependencies
 */
import { __ } from '@wordpress/i18n';

/**
 * SolidWP dependencies
 */
import { Text, TextVariant, TextWeight } from '@ithemes/ui';

/**
 * Internal dependencies
 */
import {
	StyledDevice,
	StyledDeviceDetails,
	StyledDeviceSection,
	StyledMap,
} from './styles';

export default function Device( { device, hasGeolocation, hasMap, isFront } ) {
	return (
		<StyledDevice>
			{ hasMap && (
				<StyledMap map={ device.maps.small } />
			) }

			{ isFront ? (
				<DeviceUserView device={ device } hasGeolocation={ hasGeolocation } />
			) : (
				<DeviceAdminView device={ device } hasGeolocation={ hasGeolocation } />
			) }

		</StyledDevice>
	);
}

function DeviceAdminView( { device, hasGeolocation } ) {
	return (
		<StyledDeviceDetails>
			{ hasGeolocation && (
				<StyledDeviceSection>
					<Text variant={ TextVariant.MUTED } text={ __( 'Location', 'it-l10n-ithemes-security-pro' ) } />
					<Text
						variant={ TextVariant.DARK }
						weight={ TextWeight.HEAVY }
						text={ device.location }
					/>
				</StyledDeviceSection>
			) }
			<StyledDeviceSection>
				<Text variant={ TextVariant.MUTED } text={ __( 'Browser', 'it-l10n-ithemes-security-pro' ) } />
				<Text
					variant={ TextVariant.DARK }
					weight={ TextWeight.HEAVY }
					text={ `${ device.browser } (${ device.browser_version })` }
				/>
			</StyledDeviceSection>
			<StyledDeviceSection>
				<Text variant={ TextVariant.MUTED } text={ __( 'IP', 'it-l10n-ithemes-security-pro' ) } />
				<Text
					variant={ TextVariant.DARK }
					weight={ TextWeight.HEAVY }
					text={ device.ip }
				/>
			</StyledDeviceSection>
			<StyledDeviceSection>
				<Text variant={ TextVariant.MUTED } text={ __( 'Platform', 'it-l10n-ithemes-security-pro' ) } />
				<Text
					variant={ TextVariant.DARK }
					weight={ TextWeight.HEAVY }
					text={ device.platform }
				/>
			</StyledDeviceSection>
		</StyledDeviceDetails>
	);
}

function DeviceUserView( { device, hasGeolocation } ) {
	return (
		<StyledDeviceDetails>
			<StyledDeviceSection>
				<Text variant={ TextVariant.MUTED } text={ device.ip } />
				{ hasGeolocation && (
					<Text variant={ TextVariant.DARK } text={ device.location } />
				)
				}
			</StyledDeviceSection>
			<StyledDeviceSection>
				<Text variant={ TextVariant.MUTED } text={ device.platform } />
				<Text variant={ TextVariant.DARK } text={ `${ device.browser } (${ device.browser_version })` } />
			</StyledDeviceSection>
		</StyledDeviceDetails>
	);
}
