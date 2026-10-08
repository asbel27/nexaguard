/**
 * External dependencies
 */
import { Link } from 'react-router-dom';
import { isEmpty } from 'lodash';

/**
 * WordPress dependencies
 */
import { useDispatch, useSelect } from '@wordpress/data';
import { __, sprintf } from '@wordpress/i18n';
import { useState } from '@wordpress/element';
import { useViewportMatch } from '@wordpress/compose';
import {
	chevronLeftSmall,
	chevronRightSmall,
	settings as filterIcon,
} from '@wordpress/icons';
import { Dropdown } from '@wordpress/components';

/**
 * iTheme dependencies
 */
import {
	Button,
	FiltersGroupCheckboxes,
	Surface,
} from '@ithemes/ui';
import { siteScannerStore, vulnerabilitiesStore } from '@ithemes/security.packages.data';

/**
 * Internal dependencies
 */
import { withNavigate } from '@ithemes/security-hocs';
import VulnerableSoftwareHeader from '../../components/vulnerable-software-header';
import VulnerabilityTable from '../../components/vulnerability-table';
import { StyledPageContainer, StyledPageHeader } from '../../components/styles';
import { BeforeHeaderSlot } from '../../components/before-header';
import {
	StyledFilters,
	StyledFilterTools,
	StyledButtonsContainer,
	StyledPagination, StyledSearchDivider,
} from './styles';
import '../../style.scss';

const QUERY_ARGS = {
	per_page: 100,
};

export default function Active() {
	const initialFilter = { resolution: [ 'unresolved', 'patched', 'deactivated' ] };
	const [ filters, setFilters ] = useState( initialFilter );
	const { query, fetchQueryNextPage, fetchQueryPrevPage } = useDispatch( vulnerabilitiesStore );
	const { items, isQuerying, hasResolved, getScans, queryHasNextPage, queryHasPrevPage } = useSelect( ( select ) => ( {
		items: select( vulnerabilitiesStore ).getVulnerabilities(),
		isQuerying: select( vulnerabilitiesStore ).isQuerying( 'main' ),
		hasResolved: select( vulnerabilitiesStore ).hasFinishedResolution( 'getVulnerabilities' ),
		queryHasNextPage: select( vulnerabilitiesStore ).queryHasNextPage( 'main' ),
		queryHasPrevPage: select( vulnerabilitiesStore ).queryHasPrevPage( 'main' ),
		getScans: select( siteScannerStore ).getScans(),
	} ), [] );

	const isSmall = useViewportMatch( 'small', '<' );

	const onApply = ( nextFilters ) => {
		setFilters( nextFilters );
		query( 'main', { ...nextFilters, ...QUERY_ARGS } );
	};

	const onReset = ( ) => {
		setFilters( initialFilter );
		query( 'main', { ...initialFilter, ...QUERY_ARGS } );
		onApply( initialFilter );
	};

	const getPrev = () => {
		fetchQueryPrevPage( 'main', 'replace' );
	};

	const getNext = () => {
		fetchQueryNextPage( 'main', 'replace' );
	};

	const filterLength = Object.keys( filters ).filter( ( key ) => ! isEmpty( filters[ key ] ) ).length;

	return (
		<StyledPageContainer>
			<BeforeHeaderSlot />
			<StyledPageHeader isSmall={ isSmall }>
				<StyledFilterTools>
					<Dropdown
						popoverProps={ { focusOnMount: 'container' } }
						renderToggle={ ( { isOpen, onToggle } ) => (
							<Button
								icon={ filterIcon }
								onClick={ onToggle }
								aria-expanded={ isOpen }
								variant="tertiary"
								text={ sprintf(
									/* translators: 1. Number of filters. */
									__( 'Filter (%d)', 'it-l10n-ithemes-security-pro' ),
									filterLength
								) }
							/>
						) }
						renderContent={ () => (
							<StyledFilters
								initialValue={ filters }
								initialOpen={ [ 'software_type' ] }
								expandSingle
								isBusy={ isQuerying }
								onApply={ onApply }
							>
								<FiltersGroupCheckboxes
									slug="software_type"
									title={ __( 'Types', 'it-l10n-ithemes-security-pro' ) }
									options={ [
										{ value: 'theme', label: __( 'Themes', 'it-l10n-ithemes-security-pro' ) },
										{ value: 'plugin', label: __( 'Plugins', 'it-l10n-ithemes-security-pro' ) },
										{ value: 'wordpress', label: __( 'Core', 'it-l10n-ithemes-security-pro' ) },
									] }
								/>
								<FiltersGroupCheckboxes
									slug="resolution"
									title={ __( 'Status', 'it-l10n-ithemes-security-pro' ) }
									options={ [
										{ value: 'unresolved', label: __( 'Unresolved', 'it-l10n-ithemes-security-pro' ) },
										{ value: 'patched', label: __( 'Mitigated', 'it-l10n-ithemes-security-pro' ) },
										{ value: 'auto-updated', label: __( 'Auto-Updated', 'it-l10n-ithemes-security-pro' ) },
										{ value: 'updated', label: __( 'Updated', 'it-l10n-ithemes-security-pro' ) },
										{ value: 'muted', label: __( 'Muted', 'it-l10n-ithemes-security-pro' ) },
										{ value: 'deactivated', label: __( 'Deactivated', 'it-l10n-ithemes-security-pro' ) },
										{ value: 'deleted', label: __( 'Deleted', 'it-l10n-ithemes-security-pro' ) },
									] }
								/>
							</StyledFilters>
						) }
					/>
					{ filterLength > 0 &&
						<>
							<StyledSearchDivider>&#124;</StyledSearchDivider>
							<Button
								onClick={ onReset }
								variant="tertiary"
								text={ __( 'Reset all', 'it-l10n-ithemes-security-pro' ) }
							/>
						</>
					}
				</StyledFilterTools>
				<StyledButtonsContainer isSmall={ isSmall }>
					<Link to="/database" component={ withNavigate( Button ) } text={ __( 'Browse Vulnerability Database', 'it-l10n-ithemes-security-pro' ) } />
					<Link to="/scan" replace component={ withNavigate( Button ) } onClick={ onReset } variant="primary" text={ __( 'Scan for Vulnerabilities', 'it-l10n-ithemes-security-pro' ) } />
				</StyledButtonsContainer>
			</StyledPageHeader>

			<Surface as="section">
				<VulnerableSoftwareHeader />
				{ hasResolved && <VulnerabilityTable getScans={ getScans } items={ items } filters={ filters } /> }
			</Surface>
			<StyledPagination>
				<Button
					disabled={ ! queryHasPrevPage }
					icon={ chevronLeftSmall }
					iconGap={ 0 }
					variant="tertiary"
					onClick={ getPrev }
					text={ __( 'Prev', 'it-l10n-ithemes-security-pro' ) }
				/>
				<Button
					disabled={ ! queryHasNextPage }
					icon={ chevronRightSmall }
					iconPosition="right"
					iconGap={ 0 }
					variant="tertiary"
					onClick={ getNext }
					text={ __( 'Next', 'it-l10n-ithemes-security-pro' ) }
				/>
			</StyledPagination>
		</StyledPageContainer>
	);
}
