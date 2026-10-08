/**
 * WordPress dependencies
 */
import { __, sprintf } from '@wordpress/i18n';
import { useSelect } from '@wordpress/data';
import { createInterpolateElement } from '@wordpress/element';
import { Icon } from '@wordpress/components';
import {
	brush as themeIcon,
	plugins as pluginIcon,
	wordpress as coreIcon,
	shield,
	external,
} from '@wordpress/icons';

/**
 * iThemes dependencies
 */
import {
	SiteScanIssue,
	SiteScanIssuesFill,
	SiteScanMutedIssuesFill,
	SiteScanIssueActions,
	ScanIssueDetailContent,
	ScanIssueDetailColumn,
	ScanIssueText,
	store,
} from '@ithemes/security.pages.site-scan';
import { useGlobalNavigationUrl } from '@ithemes/security-utils';
import { Button, Text, TextVariant, TextWeight } from '@ithemes/ui';

function vulnerabilityIcon( type ) {
	switch ( type ) {
		case 'plugin':
			return pluginIcon;
		case 'theme':
			return themeIcon;
		case 'wordpress':
			return coreIcon;
		default:
			return undefined;
	}
}

function VulnerabilityIssue( { issue } ) {
	const detailsUrl = useGlobalNavigationUrl( 'vulnerabilities', `/vulnerability/${ issue.id }` );
	const allowedActions = [
		'ithemes-security:mute-vulnerability',
		'ithemes-security:unmute-vulnerability',
	];
	if ( issue._links[ 'ithemes-security:fix-vulnerability' ] ) {
		allowedActions.push( 'ithemes-security:fix-vulnerability' );
	} else {
		allowedActions.push( 'ithemes-security:deactivate-vulnerable-software' );
	}
	return (
		<SiteScanIssue key={ issue.id } issue={ issue } icon={ vulnerabilityIcon( issue.component ) } >
			<ScanIssueDetailContent>
				<ScanIssueDetailColumn>
					<Text
						as="p"
						variant={ TextVariant.DARK }
						text={
							sprintf(
							/* translators: Vulnerable software version. */
								__( 'Vulnerable Version: %s', 'it-l10n-ithemes-security-pro' ),
								issue.meta.details.affected_in )
						} />
					{ issue.meta.details.fixed_in && (
						<Text
							as="p"
							variant={ TextVariant.DARK }
							text={
								sprintf(
									/* translators: Fixed software version. */
									__( 'Fixed Version: %s', 'it-l10n-ithemes-security-pro' ),
									issue.meta.details.fixed_in )
							} />
					) }
				</ScanIssueDetailColumn>
				<ScanIssueDetailColumn>
					<Text text={ __( 'Action Details:', 'it-l10n-ithemes-security-pro' ) } weight={ TextWeight.HEAVY } />
					{ issue.meta.details.fixed_in ? (
						<ScanIssueText>
							{ __( 'The software needs to be updated to have the latest improvements released by the developer. ', 'it-l10n-ithemes-security-pro' ) }
							{ createInterpolateElement(
								__( 'View the <a>Vulnerability Details <icon/></a> for more info.', 'it-l10n-ithemes-security-pro' ),
								{
									// eslint-disable-next-line jsx-a11y/anchor-has-content
									a: <a href={ detailsUrl } target="_blank" rel="noreferrer"></a>,
									icon: <Icon icon={ external } size={ 15 } />,
								}
							) }
						</ScanIssueText>
					) : (
						<ScanIssueText text={
							<>
								{ issue.component === 'plugin' && (
									__( 'If no update is available, you should deactivate the plugin.', 'it-l10n-ithemes-security-pro' )
								) }
								{ issue.component === 'theme' && (
									__( 'If no update is available, you should switch themes.', 'it-l10n-ithemes-security-pro' )
								) }
							</>
						}
						/>
					)
					}
				</ScanIssueDetailColumn>
			</ScanIssueDetailContent>
			<SiteScanIssueActions issue={ issue } allowedActions={ allowedActions } />
		</SiteScanIssue>
	);
}

function SafeBrowsingIssue( { issue } ) {
	return (
		<SiteScanIssue key={ issue.id } issue={ issue } icon={ shield } >
			<ScanIssueDetailContent>
				<ScanIssueDetailColumn>
					<Button variant="link" href={ issue.meta.link } icon={ external } iconPosition="right" text={ __( 'Learn more' ) } />
				</ScanIssueDetailColumn>
			</ScanIssueDetailContent>
		</SiteScanIssue>
	);
}

export default function App() {
	const { issues } = useSelect( ( select ) => ( {
		issues: select( store ).getIssuesForComponentGroup( 'site-scanner' ),
	} ), [] );
	return (
		<>
			<SiteScanIssuesFill>
				{ issues.filter( ( issue ) => ! issue.muted ).map( ( issue ) => (
					issue.component !== 'blacklist'
						? <VulnerabilityIssue key={ issue.id } issue={ issue } />
						: <SafeBrowsingIssue key={ issue.id } issue={ issue } />
				) ) }
			</SiteScanIssuesFill>

			<SiteScanMutedIssuesFill>
				{ issues.filter( ( issue ) => issue.muted ).map( ( issue ) => (
					issue.component !== 'blacklist'
						? <VulnerabilityIssue key={ issue.id } issue={ issue } />
						: <SafeBrowsingIssue key={ issue.id } issue={ issue } />
				) ) }
			</SiteScanMutedIssuesFill>
		</>
	);
}
