/**
 * SolidWP dependencies
 */
import { Text, TextVariant } from '@ithemes/ui';

/**
 * Internal dependencies
 */
import { StyledDeviceDetails, StyledDeviceSection } from './styles';

export default function Device( { device } ) {
	return (
		<StyledDeviceDetails>
			<StyledDeviceSection>
				<Text variant={ TextVariant.MUTED } text={ device.platform } />
				<Text variant={ TextVariant.DARK } text={ `${ device.browser } (${ device.browser_version })` } />
			</StyledDeviceSection>
			<StyledDeviceSection>
				<Text variant={ TextVariant.MUTED } text={ device.ip } />
				{ device?.location && (
					<Text variant={ TextVariant.DARK } text={ device.location } />
				) }
			</StyledDeviceSection>
		</StyledDeviceDetails>
	);
}
