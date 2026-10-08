/**
 * WordPress dependencies
 */
import { __, sprintf } from '@wordpress/i18n';
import { dateI18n } from '@wordpress/date';
import { createInterpolateElement } from '@wordpress/element';
import { info } from '@wordpress/icons';

/**
 * SolidWP dependencies
 */
import { Text, TextSize, TextWeight, TextVariant } from '@ithemes/ui';

/**
 * Internal dependencies
 */
import Device from './device';
import Footer from './footer';
import {
	StyledModal,
	StyledModalContent,
	StyledMap,
	StyledTextContainer,
	StyledIconContainer,
	StyledInfoIcon,
} from './styles';

export default function DeviceModal( { device, onClose, updateDevice, usesRestrict } ) {
	const hasGeolocation = device.location;
	const hasMap = device.maps;

	return (
		<StyledModal
			title={ __( 'We noticed an unrecognized login on another device. Do you recognize this login?' ) }
			onRequestClose={ onClose }
		>
			<StyledModalContent>
				{ hasMap && (
					<StyledMap map={ device.maps.small } />
				) }
				<StyledTextContainer>
					<Text
						size={ TextSize.LARGE }
						variant={ TextVariant.DARK }
						weight={ TextWeight.HEAVY }
						text={ hasGeolocation
							? sprintf(
								/* translators: Device location*/
								__( 'Unrecognized login near %s', 'it-l10n-ithemes-security-pro' ), device.location )
							: __( 'Unrecognized login', 'it-l10n-ithemes-security-pro' ) }
					/>
					<Text text={ dateI18n( 'M. j, Y g:i a', device.created_at ) } />
				</StyledTextContainer>

				<Device device={ device } hasGeolocation={ hasGeolocation } />

				<Text
					variant={ TextVariant.MUTED }
					text={ __( 'Confirm whether or not you recognize this device.', 'it-l10n-ithemes-security-pro' ) }
				/>
				<StyledIconContainer>
					<StyledInfoIcon icon={ info } fill={ '#ffc518' } />
					{ usesRestrict ? (
						<Text as="p">
							{
								createInterpolateElement(
									__( 'If you choose to ignore this notice the device will continue to have access to your account. <a>Learn more about the Trusted Device here</a>.', 'it-l10n-ithemes-security-pro' ),
									{
										// eslint-disable-next-line jsx-a11y/anchor-has-content
										a: <a href="https://go.solidwp.com/about-trusted-devices" style={ { display: 'inline-block' } } />,
									}
								)
							}
						</Text>
					) : (
						<Text as="p">
							{
								createInterpolateElement(
									__( 'If you choose to ignore this notice the device will continue to have access to your account but with limited capabilities and restricted access. <a>Learn more about the Trusted Device here</a>.', 'it-l10n-ithemes-security-pro' ),
									{
										// eslint-disable-next-line jsx-a11y/anchor-has-content
										a: <a href="https://go.solidwp.com/about-trusted-devices" style={ { display: 'inline-block' } } />,
									}
								)
							}
						</Text>
					) }

				</StyledIconContainer>
				<Footer device={ device } updateDevice={ updateDevice } />
			</StyledModalContent>
		</StyledModal>
	);
}
