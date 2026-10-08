/**
 * WordPress dependencies
 */
import { __, sprintf } from '@wordpress/i18n';

/**
 * SolidWP dependencies
 */
import { Text, TextVariant, TextWeight } from '@ithemes/ui';

/**
 * Internal dependencies
 */
import {
	StyledBrowser,
	StyledDeviceDetails,
	StyledIP,
	StyledLocation,
	StyledPlatform,
	StyledSectionLabel,
} from './styles';

export default function Device( { device, hasGeolocation } ) {
	return (
		<StyledDeviceDetails hasGeolocation={ hasGeolocation }>
			<StyledLocation>
				<StyledSectionLabel
					variant={ TextVariant.MUTED }
					text={ device.location ? __( 'Location', 'it-l10n-ithemes-security-pro' ) : __( 'IP', 'it-l10n-ithemes-security-pro' ) }
				/>
				<Text
					variant={ TextVariant.DARK }
					weight={ TextWeight.HEAVY }
					text={ device.location ? device.location : device.ip }
				/>
			</StyledLocation>

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
						text={ __( 'IP', 'it-l10n-ithemes-security-pro' ) }
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
		</StyledDeviceDetails>
	);
}
