/**
 * WordPress dependencies
 */
import { __ } from '@wordpress/i18n';
import { plus as newIcon } from '@wordpress/icons';

/**
 * Solid dependencies
 */
import { Button, Text, TextVariant } from '@ithemes/ui';

/**
 * Internal dependencies
 */
import { useGlobalNavigationUrl } from '@ithemes/security-utils';
import { FirewallBasic, FirewallNoRules, VulnerabilitySuccess } from '@ithemes/security-style-guide';
import { HiResIcon } from '@ithemes/security-ui';
import { withNavigate } from '@ithemes/security-hocs';
import { StyledEmptyState, StyledContent, StyledLink } from './styles';

export function EmptyStateBasic() {
	return (
		<StyledEmptyState>
			<StyledContent>
				<HiResIcon icon={ <FirewallBasic /> } />
				<Text
					variant={ TextVariant.DARK }
					weight={ 700 }
					text={ __( 'Your site has no firewall rules installed.', 'it-l10n-ithemes-security-pro' ) }
				/>
				<StyledLink
					to="/rules/new"
					component={ withNavigate( Button ) }
					variant="primary"
					icon={ newIcon }
					text={ __( 'Create a Rule', 'it-l10n-ithemes-security-pro' ) }
				/>
			</StyledContent>
		</StyledEmptyState>
	);
}

export function EmptyStateProHasVulnerabilities() {
	const vulnerabilitiesUrl = useGlobalNavigationUrl( 'vulnerabilities' );
	return (
		<StyledEmptyState>
			<StyledContent>
				<HiResIcon icon={ <FirewallNoRules /> } />
				<Text
					align="center"
					variant={ TextVariant.DARK }
					weight={ 700 }
					text={ __( 'Your site has vulnerable software installed, but there are no firewall rules available.', 'it-l10n-ithemes-security-pro' ) }
				/>
				<Text
					align="center"
					variant={ TextVariant.DARK }
					text={ __( 'Visit the vulnerabilities page to learn how to keep your site safe.', 'it-l10n-ithemes-security-pro' ) }
				/>
				<Button
					href={ vulnerabilitiesUrl }
					variant="primary"
					text={ __( 'View Vulnerabilities', 'it-l10n-ithemes-security-pro' ) }
				/>
			</StyledContent>
		</StyledEmptyState>
	);
}

export function EmptyStatePro() {
	return (
		<StyledEmptyState>
			<StyledContent>
				<HiResIcon icon={ <VulnerabilitySuccess /> } />
				<Text
					align="center"
					variant={ TextVariant.DARK }
					weight={ 700 }
					text={ __( 'No firewall rules are active on your site because you have no vulnerable software installed.', 'it-l10n-ithemes-security-pro' ) }
				/>
				<Text
					align="center"
					variant={ TextVariant.DARK }
					text={ __( 'Keep up the good work!', 'it-l10n-ithemes-security-pro' ) }
				/>
			</StyledContent>
		</StyledEmptyState>
	);
}
