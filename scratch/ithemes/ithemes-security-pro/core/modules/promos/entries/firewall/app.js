/**
 * WordPress dependencies
 */
import { __ } from '@wordpress/i18n';
import { createInterpolateElement } from '@wordpress/element';
import { useSelect } from '@wordpress/data';
import { external, closeSmall as dismissIcon } from '@wordpress/icons';
import { Flex } from '@wordpress/components';

/**
 * SolidWP dependencies
 */
import { Button, Heading, Text, TextSize, TextVariant, TextWeight } from '@ithemes/ui';

/**
 * Internal dependencies
 */
import { AsideHeaderFill, FirewallBannerFill, BeforeCreateFirewallRuleFill } from '@ithemes/security.pages.firewall';
import { coreStore } from '@ithemes/security.packages.data';
import { useLocalStorage } from '@ithemes/security-hocs';
import { Patchstack } from '@ithemes/security-style-guide';
import {
	StyledAsideHeader,
	StyledPatchstackBanner,
	StyledTextContainer,
	StyledPatchstackLogo,
	StyledPatchstackButton,
	StyledPatchstackDismiss,
	StyledBeforeCreateRulePromo,
} from './styles';

export default function App() {
	const { installType, hasPatchstack, isLiquidWeb } = useSelect(
		( select ) => ( {
			installType: select( coreStore ).getInstallType(),
			hasPatchstack: select( coreStore ).hasPatchstack(),
			isLiquidWeb: select( coreStore ).isLiquidWebCustomer(),
		} ),
		[]
	);

	return (
		<>
			{ ! hasPatchstack && ! isLiquidWeb && (
				<FirewallBannerFill>
					<PatchstackBanner installType={ installType } />
				</FirewallBannerFill>
			) }

			{ installType === 'free' && (
				<AsideHeaderFill>
					{ installType === 'free' && (
						<StyledAsideHeader>
							<Button
								iconPosition="right"
								text={ __( 'Upgrade', 'it-l10n-ithemes-security-pro' ) }
								variant="secondary"
								href="https://go.solidwp.com/upgrade-virtual-patching"
								target="_blank"
							/>
							<Text
								text={ createInterpolateElement(
									__( 'Upgrade to enable automatic protection with <strong>virtual patches</strong>.', 'it-l10n-ithemes-security-pro' ),
									{
										strong: <strong />,
									}
								) }
								variant={ TextVariant.MUTED }
							/>
						</StyledAsideHeader>
					) }
				</AsideHeaderFill>
			) }
			{ ( installType === 'free' || ( ! hasPatchstack && ! isLiquidWeb ) ) && (
				<BeforeCreateFirewallRuleFill>
					<BeforeCreateRulePromo installType={ installType } />
				</BeforeCreateFirewallRuleFill>
			) }
		</>
	);
}

function PatchstackBanner( { installType } ) {
	const [ isDismissed, setIsDismissed ] = useLocalStorage( 'patchstackPromo' );

	if ( isDismissed ) {
		return null;
	}
	return (
		<StyledPatchstackBanner>
			<StyledTextContainer>
				<StyledPatchstackLogo />
				<Text
					text={
						installType === 'free'
							? __( 'Rest easy at night. Upgrade to Solid Security Pro with Patchstack and reduce your WordPress website’s risk to nearly zero thanks to Patchstack’s automated Virtual Patching. Vulnerabilities are patched when your attention is elsewhere and even when a patch hasn’t been released. Go Pro.', 'it-l10n-ithemes-security-pro' )
							: createInterpolateElement(
								__( 'Thank you for being an iThemes Security Pro customer. You recently upgraded to Solid Security Pro and we hope you’re enjoying all the great <a>new features</a>. For even more protection, we suggest enabling Patchstack. This automatically patches vulnerabilities when your attention is elsewhere or before a patch is even released. Purchase an additional license per site.', 'it-l10n-ithemes-security-pro' ), {
									// eslint-disable-next-line jsx-a11y/anchor-has-content
									a: <a href="https://go.solidwp.com/all-the-great-new-features" />,
								}
							) }
					variant={ TextVariant.MUTED }
				/>
			</StyledTextContainer>
			<StyledPatchstackDismiss
				label={ __( 'Dismiss', 'it-l10n-ithemes-security-pro' ) }
				icon={ dismissIcon }
				onClick={ () => setIsDismissed( true ) }
			/>
			<StyledPatchstackButton
				text={ installType === 'free'
					? __( 'Upgrade Now', 'it-l10n-ithemes-security-pro' )
					: __( 'Enable Patchstack', 'it-l10n-ithemes-security-pro' ) }
				icon={ external }
				iconPosition="right"
				href={ installType === 'free'
					? 'https://go.solidwp.com/patchstack-banner-upgrade-now'
					: 'https://go.solidwp.com/enable-patchstack'
				}
			/>
		</StyledPatchstackBanner>
	);
}

function BeforeCreateRulePromo( { installType } ) {
	return (
		<StyledBeforeCreateRulePromo as="aside">
			<Flex direction="column" gap={ 3 } expanded={ false } align="start">
				<Patchstack height={ 12 } />
				<Flex direction="column" gap={ 2 } expanded={ false }>
					<Heading
						level={ 3 }
						size={ TextSize.LARGE }
						weight={ TextWeight.HEAVY }
						variant={ TextVariant.DARK }
						text={ __( 'Confused by Firewall Rules? Automate it!', 'it-l10n-ithemes-security-pro' ) }
					/>
					<Text
						variant={ TextVariant.MUTED }
						text={ installType === 'free'
							? __( 'We know creating Firewall Rules can be complex, but thanks to our Patchstack integration, Solid Security Pro automatically patches your website vulnerabilities with no action required. Upgrade to Pro with a Patchstack license to be protected while you sleep!', 'it-l10n-ithemes-security-pro' )
							: __( 'We know creating custom Firewall Rules can be complex, but thanks to our Patchstack integration, Solid Security automatically patches your website vulnerabilities with no action required. Upgrade to a Patchstack license and be protected while you sleep!', 'it-l10n-ithemes-security-pro' )
						}
					/>
				</Flex>
				<Button
					variant="primary"
					text={ installType === 'free'
						? __( 'Get Solid Security Pro + Patchstack', 'it-l10n-ithemes-security-pro' )
						: __( 'Upgrade to a Patchstack License', 'it-l10n-ithemes-security-pro' ) }
					icon={ external }
					iconPosition="right"
					iconGap={ 0 }
					href={ installType === 'free'
						? 'https://go.solidwp.com/patchstack-banner-upgrade-now'
						: 'https://go.solidwp.com/enable-patchstack'
					}
				/>
			</Flex>
		</StyledBeforeCreateRulePromo>
	);
}
