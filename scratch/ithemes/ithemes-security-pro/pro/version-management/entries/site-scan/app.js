/**
 * WordPress dependencies
 */
import { __ } from '@wordpress/i18n';
import { useSelect } from '@wordpress/data';
import { shield } from '@wordpress/icons';

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
import { Text, TextWeight } from '@ithemes/ui';

function OldSiteScanIssue( { issue } ) {
	return (
		<SiteScanIssue key={ issue.id } issue={ issue } icon={ shield }>
			<ScanIssueDetailContent>
				<ScanIssueDetailColumn>
					<Text text={ __( 'Action Details:', 'it-l10n-ithemes-security-pro' ) } weight={ TextWeight.HEAVY } />
					<ScanIssueText text={ __( 'If the site is no longer in use, it should be removed from the filesystem.', 'it-l10n-ithemes-security-pro' ) } />
					<ScanIssueText text={ __( 'Otherwise, make sure to update WordPress to the latest version.', 'it-l10n-ithemes-security-pro' ) } />
				</ScanIssueDetailColumn>
			</ScanIssueDetailContent>
			<SiteScanIssueActions issue={ issue } />
		</SiteScanIssue>
	);
}

export default function App() {
	const { issues } = useSelect( ( select ) => ( {
		issues: select( store ).getIssuesForComponent( 'old-site-scan' ),
	} ), [] );
	return (
		<>
			<SiteScanIssuesFill>
				{ issues.filter( ( issue ) => ! issue.muted ).map( ( issue ) => (
					<OldSiteScanIssue key={ issue.id } issue={ issue } />
				) ) }
			</SiteScanIssuesFill>

			<SiteScanMutedIssuesFill>
				{ issues.filter( ( issue ) => issue.muted ).map( ( issue ) => (
					<OldSiteScanIssue key={ issue.id } issue={ issue } />
				) ) }
			</SiteScanMutedIssuesFill>
		</>
	);
}
