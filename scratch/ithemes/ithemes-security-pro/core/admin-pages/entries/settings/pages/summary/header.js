/**
 * WordPress dependencies
 */
import { Flex, FlexItem } from '@wordpress/components';
import { __ } from '@wordpress/i18n';
import { useSelect } from '@wordpress/data';
import { createInterpolateElement } from '@wordpress/element';

/**
 * SolidWP dependencies
 */
import { Button, Heading, Text, TextSize, TextVariant, TextWeight } from '@ithemes/ui';

/**
 * Internal dependencies
 */
import { useGlobalNavigationUrl } from '@ithemes/security-utils';
import { Logo } from '@ithemes/security-ui';
import { vulnerabilitiesStore } from '@ithemes/security.packages.data';
import Improvements from './improvements';
import { StyledResolveVulnerabilities } from './styles';
import { SiteScanIcon, SoftwareVulnerabilityCard } from '../../components';
import { useHighlightedVulnerabilities } from '../../utils';

export default function Header( { installType } ) {
	const dashboardLink = useGlobalNavigationUrl( 'dashboard' ),
		settingsLink = useGlobalNavigationUrl( 'settings' ),
		vulnerabilitiesLink = useGlobalNavigationUrl( 'vulnerabilities' );
	const { vulnerabilities } = useSelect( ( select ) => ( {
		vulnerabilities: select( vulnerabilitiesStore ).getQueryResults( 'onboarding' ),
	} ), [] );

	return (
		<Flex direction="column" gap={ 8 } expanded={ false } align="start">
			<Logo size={ 44 } />
			<Flex as="header" direction="column" gap={ 2 } expanded={ false }>
				<Heading
					level={ 1 }
					text={ installType === 'free'
						? __( 'Great Work! Thanks to Solid Security Basic, your site is secure and ready for your users.', 'it-l10n-ithemes-security-pro' )
						: __( 'Great Work! Your site is ready and is more secure than ever!', 'it-l10n-ithemes-security-pro' ) }
					size={ TextSize.GIGANTIC }
					weight={ TextWeight.NORMAL }
				/>
				<Text
					text={ installType === 'free'
						? __( 'Use your security dashboard for insights into your users’ activity and potential threats to your site. From there you’ll be guided to actions you can take.', 'it-l10n-ithemes-security-pro' )
						: __( 'If you want to dig into your site’s security, check out your security dashboard, and make changes via settings.', 'it-l10n-ithemes-security-pro' ) }
					size={ TextSize.EXTRA_LARGE }
					variant={ TextVariant.DARK }
				/>
			</Flex>
			<Improvements installType={ installType } />
			{ vulnerabilities.length > 0 && (
				<ResolveVulnerabilities vulnerabilities={ vulnerabilities } link={ vulnerabilitiesLink } installType={ installType } />
			) }
			{ vulnerabilities.length === 0 && (
				<Flex gap={ 4 } justify="start">
					<Button
						variant={ installType === 'free' ? 'secondary' : 'primary' }
						href={ dashboardLink }
						text={ __( 'Dashboard', 'it-l10n-ithemes-security-pro' ) }
					/>
					<Button
						variant={ installType === 'free' ? 'secondary' : 'primary' }
						href={ settingsLink }
						text={ __( 'Settings', 'it-l10n-ithemes-security-pro' ) }
					/>
				</Flex>
			) }
		</Flex>
	);
}

function ResolveVulnerabilities( { vulnerabilities, link, installType } ) {
	const { show } = useHighlightedVulnerabilities( vulnerabilities, 1 );
	return (
		<StyledResolveVulnerabilities>
			<Flex gap={ 4 } align="flex-start">
				<Flex direction="column" gap={ 5 }>
					<Flex direction="column" gap={ 3 }>
						<Heading level={ 3 } size={ TextSize.HUGE } text={ __( 'Resolve the vulnerabilities we found', 'it-l10n-ithemes-security-pro' ) } weight={ TextWeight.NORMAL } />
						<Text
							text={ __( 'Now that your initial setup for Solid Security is complete, it’s time to take care of those vulnerabilities we detected earlier.', 'it-l10n-ithemes-security-pro' ) }
							variant={ TextVariant.MUTED }
						/>
					</Flex>
				</Flex>
				<SiteScanIcon found />
			</Flex>
			<SoftwareVulnerabilityCard { ...show[ 0 ] } />
			{ installType === 'free' && (
				<Flex direction="column" gap={ 2 }>
					<Heading level={ 5 } text={ __( 'Stay safe from critical vulnerabilities, even while you sleep', 'it-l10n-ithemes-security-pro' ) } size={ TextSize.SUBTITLE_SMALL } />
					<Text as="p" text={ createInterpolateElement(
						__( 'Patchstack’s Virtual Patching, available in <a>Solid Security Pro</a>, protects you against the most important vulnerabilities, 24/7.', 'it-l10n-ithemes-security-pro' ),
						{
							// eslint-disable-next-line jsx-a11y/anchor-has-content
							a: <a href="https://go.solidwp.com/go-pro-onboarding" />,
						}
					) } />
				</Flex>
			) }
			<FlexItem>
				<Button href={ link } text={ __( 'Manage Vulnerabilities', 'it-l10n-ithemes-security-pro' ) } variant="primary" />
			</FlexItem>
		</StyledResolveVulnerabilities>
	);
}
