/**
 * WordPress dependencies
 */
import { __, sprintf } from '@wordpress/i18n';
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
import { CORE_STORE_NAME as coreStore } from '@ithemes/security.packages.data';

import { Text, TextWeight } from '@ithemes/ui';

function InactiveUserIssue( { issue } ) {
	const { roles } = useSelect( ( select ) => ( {
		roles: select( coreStore ).getRoles(),
	} ), [] );

	if ( ! roles ) {
		return null;
	}
	const userRole = issue.meta.roles.map( ( role ) => roles[ role ]?.label ?? role ).join( ', ' );
	return (
		<SiteScanIssue key={ issue.id } issue={ issue } icon={ shield }>
			<ScanIssueDetailContent>
				<ScanIssueDetailColumn>
					<Text text={ __( 'Action Details:', 'it-l10n-ithemes-security-pro' ) } weight={ TextWeight.HEAVY } />
					<ScanIssueText text={
						sprintf(
							/* translators: The inactive users role */
							__( 'If the user no longer needs %s access, you can remove them from the site.', 'it-l10n-ithemes-security-pro' ),
							userRole
						)
					}
					/>
					<ScanIssueText text={ __( 'Alternatively, you can reduce their privilege to Author capabilities.', 'it-l10n-ithemes-security-pro' ) } />
				</ScanIssueDetailColumn>
			</ScanIssueDetailContent>
			<SiteScanIssueActions issue={ issue } />
		</SiteScanIssue>
	);
}
export default function App() {
	const { issues } = useSelect( ( select ) => ( {
		issues: select( store ).getIssuesForComponent( 'inactive-users' ),
	} ), [] );
	return (
		<>
			<SiteScanIssuesFill>
				{ issues.filter( ( issue ) => ! issue.muted ).map( ( issue ) => (
					<InactiveUserIssue key={ issue.id } issue={ issue } />
				) ) }
			</SiteScanIssuesFill>

			<SiteScanMutedIssuesFill>
				{ issues.filter( ( issue ) => issue.muted ).map( ( issue ) => (
					<InactiveUserIssue key={ issue.id } issue={ issue } />
				) ) }
			</SiteScanMutedIssuesFill>
		</>
	);
}
