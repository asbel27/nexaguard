/**
 * WordPress dependencies
 */
import { __ } from '@wordpress/i18n';
import { createInterpolateElement } from '@wordpress/element';
import { Icon } from '@wordpress/components';
import { chevronRight } from '@wordpress/icons';

/**
 * SolidWP dependencies
 */
import {
	Heading,
	Text,
	TextSize,
	TextVariant,
	TextWeight,
} from '@ithemes/ui';

/**
 * Internal dependencies
 */
import { RestrictedDevice } from '@ithemes/security-style-guide';
import {
	StyledModalBody,
	StyledHeader,
	StyledTextPill,
	StyledTextContainer,
	StyledLinkContainer,
	StyledCapabilities,
} from './styles';

export default function ModalBody( { canManage = true } ) {
	return (
		<StyledModalBody>
			<StyledHeader>
				{ canManage && (
					<StyledTextPill variant={ TextVariant.MUTED } text={ __( 'Trusted Devices', 'it-l10n-ithemes-security-pro' ) } />
				) }
				<RestrictedDevice />
			</StyledHeader>
			<StyledTextContainer>
				<Heading
					level={ 2 }
					size={ TextSize.LARGE }
					variant={ TextVariant.DARK }
					weight={ TextWeight.HEAVY }
					text={ __( 'You are logged in on an unrecognized device', 'it-l10n-ithemes-security-pro' ) }
				/>
				<Text
					variant={ TextVariant.MUTED }
					text={ createInterpolateElement(
						__( 'You are signed in on an unknown device or in an unknown location. Since Trusted Devices is enabled on this site and this device has not already been approved you will have restricted access on this device. This device won’t be able to edit sensitive information or perform certain administrative tasks <b>until it is confirmed</b>.', 'it-l10n-ithemes-security-pro' ), {
							b: <strong />,
						}
					) }
				/>
			</StyledTextContainer>

			<StyledLinkContainer href="https://go.solidwp.com/unrecognized-login-mode">
				<Text
					variant={ TextVariant.MUTED } text={ __( 'Learn more about Trusted Devices and unrecognized login mode ("limited access")', 'it-l10n-ithemes-security-pro' ) }
				/>
				<Icon icon={ chevronRight } style={ { fill: '#6817c5' } } />
			</StyledLinkContainer>

			<StyledTextContainer>
				<Text
					variant={ TextVariant.DARK }
					weight={ TextWeight.HEAVY }
					text={ __( 'Restricted capabilities:', 'it-l10n-ithemes-security-pro' ) }
				/>
				<StyledCapabilities>
					<li><Text variant={ TextVariant.MUTED } text={ __( 'Install/delete plugins & themes', 'it-l10n-ithemes-security-pro' ) } /></li>
					<li><Text variant={ TextVariant.MUTED } text={ __( 'Activate/deactivate plugins & themes', 'it-l10n-ithemes-security-pro' ) } /></li>
					<li><Text variant={ TextVariant.MUTED } text={ __( 'Edit posts, pages, etc. created by other users', 'it-l10n-ithemes-security-pro' ) } /></li>
					<li><Text variant={ TextVariant.MUTED } text={ __( 'Change the author for posts, pages, etc.', 'it-l10n-ithemes-security-pro' ) } /></li>
					<li><Text variant={ TextVariant.MUTED } text={ __( 'Other capabilities, depending upon your site’s plugins and themes', 'it-l10n-ithemes-security-pro' ) } /></li>
				</StyledCapabilities>
			</StyledTextContainer>

			<Text
				variant={ TextVariant.MUTED }
				text={ __( 'Send a confirmation email to approve or block this device or continue with limited access and capabilities.', 'it-l10n-ithemes-security-pro' ) }
			/>
		</StyledModalBody>
	);
}
