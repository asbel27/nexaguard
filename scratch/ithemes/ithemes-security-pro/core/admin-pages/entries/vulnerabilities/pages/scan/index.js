/**
 * External dependencies
 */
import { Link, useHistory } from 'react-router-dom';

/**
 * WordPress dependencies
 */
import { useDispatch } from '@wordpress/data';
import { useEffect } from '@wordpress/element';
import { __ } from '@wordpress/i18n';

/**
 * Solid WP dependencies
 */
import { Button, Surface, Text, TextSize, TextVariant, TextWeight } from '@ithemes/ui';

/**
 * Internal dependencies
 */
import { siteScannerStore, vulnerabilitiesStore } from '@ithemes/security.packages.data';
import { withNavigate } from '@ithemes/security-hocs';
import VulnerableSoftwareHeader from '../../components/vulnerable-software-header';
import { BeforeHeaderSlot } from '../../components/before-header';
import { StyledPageContainer, StyledPageHeader } from '../../components/styles';
import { StyledButtonsContainer, ScanningContainer, StyledSpinner } from './styles';

export default function Scan() {
	const history = useHistory();
	const { runScan, refreshQuery: refreshScans } = useDispatch( siteScannerStore );
	const { refreshQuery: refreshVulnerabilities } = useDispatch( vulnerabilitiesStore );
	useEffect( () => {
		runScan()
			.then( () => Promise.allSettled( [
				refreshScans( 'main' ),
				refreshVulnerabilities( 'main' ),
			] ) )
			.then( () => history.replace( '/active' ) );
	}, [ history, refreshScans, refreshVulnerabilities, runScan ] );

	return (
		<StyledPageContainer>
			<BeforeHeaderSlot />
			<StyledPageHeader>
				<StyledButtonsContainer>
					<Link to="/database" component={ withNavigate( Button ) } text={ __( 'Browse Vulnerability Database', 'it-l10n-ithemes-security-pro' ) } />
					<Link to="/scan" component={ withNavigate( Button ) } variant="primary" disabled text={ __( 'Scan for vulnerabilities', 'it-l10n-ithemes-security-pro' ) } />
				</StyledButtonsContainer>
			</StyledPageHeader>
			<Surface as="section">
				<VulnerableSoftwareHeader />
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
					<tbody>
						<tr>
							<td colSpan={ 6 }>
								<ScanningContainer>
									<StyledSpinner />
									<Text
										text={ __( 'Scanning for vulnerabilities…', 'it-l10n-ithemes-security-pro' ) }
										size={ TextSize.LARGE }
										weight={ TextWeight.HEAVY }
										variant={ TextVariant.DARK }
									/>
									<Text
										text={ __( 'Currently checking your site for any vulnerable plugins, themes, or WordPress Core.', 'it-l10n-ithemes-security-pro' ) }
										size={ TextSize.SMALL }
										align="center"
										variant={ TextVariant.MUTED }
									/>
								</ScanningContainer>
							</td>
						</tr>
					</tbody>
				</table>
			</Surface>
		</StyledPageContainer>
	);
}
