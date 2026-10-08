/**
 * External dependencies
 */

/**
 * WordPress dependencies
 */
import { __, sprintf } from '@wordpress/i18n';
import {
	brush as themeIcon,
	check as checkIcon,
	closeSmall as closeIcon,
	plugins as pluginIcon,
	wordpress as coreIcon,
	external as linkIcon,
} from '@wordpress/icons';

/**
 * SolidWP dependencies
 */
import { Button, Text } from '@ithemes/ui';

/**
 * Internal dependencies
 */
import {
	StyledTableSection,
	StyledVulnerabilityName,
	StyledVulnerabilityVersion,
	StyledVulnerabilityDetail,
	StyledVulnerability,
	StyledSeverity,
	StyledStatusCheck,
	StyledStatusRedCircle,
	StyledNoWrapCell,
} from './styles';

function vulnerabilityIcon( type ) {
	switch ( type.toLowerCase() ) {
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

function severityColor( score ) {
	switch ( true ) {
		case score < 3:
			return '#B8E6BF';
		case score < 7:
			return '#FFC518';
		case score < 9:
			return '#FFABAF';
		default:
			return '#D63638';
	}
}

function statusIcon( fixStatus ) {
	switch ( fixStatus ) {
		case '':
			return <StyledStatusRedCircle icon={ closeIcon } style={ { fill: '#D75A4B' } } />;
		default:
			return <StyledStatusCheck icon={ checkIcon } style={ { fill: '#FFFFFF' } } />;
	}
}

function statusText( fixStatus ) {
	switch ( fixStatus ) {
		case '':
			return __( 'No Fix', 'it-l10n-ithemes-security-pro' );
		default:
			return __( 'Fix Available', 'it-l10n-ithemes-security-pro' );
	}
}

function createdAtDaysAgo( createdAt ) {
	createdAt = new Date( createdAt );
	const now = new Date();
	return Math.round( ( now.getTime() - createdAt.getTime() ) / ( 1000 * 3600 * 24 ) );
}

export default function PatchstackTable( { items } ) {
	return (
		<StyledTableSection as="section">
			<table className="itsec-card-vulnerable-software__table">
				<thead>
					<tr>
						<Text as="th" text={ __( 'Type', 'it-l10n-ithemes-security-pro' ) } />
						<Text as="th" text={ __( 'Vulnerability', 'it-l10n-ithemes-security-pro' ) } />
						<Text as="th" text={ __( 'Severity', 'it-l10n-ithemes-security-pro' ) } />
						<Text as="th" text={ __( 'Status', 'it-l10n-ithemes-security-pro' ) } />
						<Text as="th" text={ __( 'Date', 'it-l10n-ithemes-security-pro' ) } />
						<Text as="th" text={ __( 'Action', 'it-l10n-ithemes-security-pro' ) } />
					</tr>
				</thead>
				{ items.length > 0 &&
					( <tbody>
						{ items.map( ( vulnerability ) => {
							const id = vulnerability.id;
							return (
								<tr key={ id }>
									<td><Text icon={ vulnerabilityIcon( vulnerability.product_type ) } text={ vulnerability.product_type } /></td>
									<td>
										<StyledVulnerability>
											<StyledVulnerabilityName weight={ 500 } text={ vulnerability.product_name || vulnerability.product_slug } />
											<StyledVulnerabilityVersion text={ vulnerability.affected_in } />
											<StyledVulnerabilityDetail text={ vulnerability.vuln_type } />
										</StyledVulnerability>
									</td>
									<td><StyledSeverity backgroundColor={ severityColor( vulnerability.cvss_score ) } status={ vulnerability.status } weight={ 600 } text={ vulnerability.cvss_score } /></td>
									<td>
										<Text icon={ statusIcon( vulnerability.fixed_in ) } iconSize={ 16 } text={ statusText( vulnerability.fixed_in ) } />
									</td>
									<StyledNoWrapCell>
										<Text
											text={ sprintf(
											/* translators: 1. Human time diff. */
												__( '%s days ago', 'it-l10n-ithemes-security-pro' ),
												createdAtDaysAgo( vulnerability.created_at )
											) }
										/>
									</StyledNoWrapCell>
									<StyledNoWrapCell>
										<Button
											icon={ linkIcon }
											iconSize={ 15 }
											iconPosition="right"
											href={ vulnerability.direct_url }
											text={ __( 'View Details', 'it-l10n-ithemes-security-pro' ) }
											variant="link"
											target="_blank"
										/>
									</StyledNoWrapCell>
								</tr>
							);
						} ) }
					</tbody> )
				}

				{ ( items.length === 0 &&
					( <tbody><tr><td colSpan="6">{ __( 'No vulnerabilities found', 'it-l10n-ithemes-security-pro' ) }</td></tr></tbody> )
				) }

			</table>
		</StyledTableSection>
	);
}
