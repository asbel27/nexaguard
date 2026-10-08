/**
 * External dependencies
 */
import { isEmpty } from 'lodash';

/**
 * WordPress dependencies
 */
import { __, sprintf } from '@wordpress/i18n';
import { useDispatch, useSelect } from '@wordpress/data';
import { useState } from '@wordpress/element';
import { Dropdown } from '@wordpress/components';
import { settings as filterIcon } from '@wordpress/icons';

/**
 * Solid dependencies
 */
import {
	Button,
	Text,
	Heading,
	FiltersGroupCheckboxes,
	FiltersGroupDropdown,
	TextSize,
	TextVariant,
	TextWeight,
} from '@ithemes/ui';

/**
 * Internal dependencies
 */
import { firewallStore } from '@ithemes/security.packages.data';
import { StyledRulesTableHeader, StyledSearchContainer, StyledSearchControl, StyledFilters, StyledSearchDivider } from './styles';

const QUERY_ARGS = {
	per_page: 100,
};
const INITIAL_FILTER = { paused: 'false' };

export default function RulesTableHeader() {
	const { isQuerying } = useSelect( ( select ) => ( {
		isQuerying: select( firewallStore ).isQuerying( 'main' ),
	} ), [] );
	const { query } = useDispatch( firewallStore );

	const [ search, setSearch ] = useState( '' );

	const onSearch = () => {
		query( 'main', { search, ...filters, ...QUERY_ARGS } );
	};
	const onSubmit = ( e ) => {
		e.preventDefault();
		onSearch();
	};

	const [ filters, setFilters ] = useState( INITIAL_FILTER );
	const onApplyFilters = ( nextFilters ) => {
		setFilters( nextFilters );
		query( 'main', { ...nextFilters, search, ...QUERY_ARGS } );
	};

	const filterLength = Object.keys( filters ).filter( ( key ) => ! isEmpty( filters[ key ] ) ).length;

	const onReset = () => {
		setSearch( '' );
		setFilters( INITIAL_FILTER );
		query( 'main', { ...INITIAL_FILTER, ...QUERY_ARGS } );
	};

	return (
		<StyledRulesTableHeader onSubmit={ onSubmit }>
			<Heading
				level={ 2 }
				size={ TextSize.LARGE }
				variant={ TextVariant.DARK }
				weight={ TextWeight.HEAVY }
				text={ __( 'Firewall Rules', 'it-l10n-ithemes-security-pro' ) }
			/>
			<Text
				text={ __( 'Firewall rules block requests based on patterns.', 'it-l10n-ithemes-security-pro' ) }
				variant={ TextVariant.MUTED }
				size={ TextSize.SMALL }
			/>
			<StyledSearchContainer role="search">
				<StyledSearchControl
					label={ __( 'Search firewall rules', 'it-l10n-ithemes-security-pro' ) }
					value={ search }
					onChange={ setSearch }
					isSearching={ isQuerying }
					size="medium"
					placeholder={ __( 'Search by title', 'it-l10n-ithemes-security-pro' ) }
					onSubmit={ onSearch }
				/>
				<Dropdown
					popoverProps={ { focusOnMount: 'container' } }
					renderToggle={ ( { isOpen, onToggle } ) => (
						<Button
							icon={ filterIcon }
							onClick={ onToggle }
							aria-expanded={ isOpen }
							variant="tertiary"
							text={ sprintf(
							/* translators: 1. Number of filters */
								__( 'Filter (%d)', 'it-l10n-ithemes-security-pro' ),
								filterLength
							) }
						/>
					) }
					renderContent={ () => (
						<StyledFilters
							initialValue={ filters }
							initialOpen="paused"
							expandSingle
							isBusy={ isQuerying }
							onApply={ onApplyFilters }
						>
							<FiltersGroupDropdown slug="paused" title={ __( 'Status', 'it-l10n-ithemes-security-pro' ) } options={ [
								{ value: 'false', label: __( 'Active', 'it-l10n-ithemes-security-pro' ), summary: __( 'Active Rules', 'it-l10n-ithemes-security-pro' ) },
								{ value: 'true', label: __( 'Inactive', 'it-l10n-ithemes-security-pro' ), summary: __( 'Inactive Rules', 'it-l10n-ithemes-security-pro' ) },
							] } />
							<FiltersGroupCheckboxes slug="provider" title={ __( 'Source', 'it-l10n-ithemes-security-pro' ) } options={ [
								{ value: 'patchstack', label: __( 'Patchstack', 'it-l10n-ithemes-security-pro' ) },
								{ value: 'solid', label: __( 'Solid Security', 'it-l10n-ithemes-security-pro' ) },
								{ value: 'user', label: __( 'Custom Rules', 'it-l10n-ithemes-security-pro' ) },
							] } />
						</StyledFilters>
					) }
				/>
				<StyledSearchDivider>&#124;</StyledSearchDivider>
				<Button
					onClick={ onReset }
					variant="tertiary"
					text={ __( 'Reset all', 'it-l10n-ithemes-security-pro' ) }
				/>
			</StyledSearchContainer>
		</StyledRulesTableHeader>
	);
}
