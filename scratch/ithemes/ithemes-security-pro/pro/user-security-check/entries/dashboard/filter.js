/**
 * External dependencies
 */
import { map } from 'lodash';

/**
 * WordPress dependencies
 */
import { useDebounce, useViewportMatch } from '@wordpress/compose';
import { useDispatch, useSelect } from '@wordpress/data';
import { useCallback, useEffect, useMemo, useState } from '@wordpress/element';
import { __, sprintf } from '@wordpress/i18n';
import { settings as filterIcon } from '@wordpress/icons';
import { Dropdown } from '@wordpress/components';

/**
 * iThemes dependencies
 */
import { Button, FiltersGroupCheckboxes } from '@ithemes/ui';

/**
 * Internal dependencies
 */
import { StyledFilter, StyledFiltersPopover, StyledSearchControl } from './styles';

const initialOpen = [ 'roles' ];
export default function Filter( { card, inHeader } ) {
	const isExpanded = useViewportMatch( 'medium', '<' );

	const { roles, config, isQuerying } = useSelect(
		( select ) => ( {
			roles: select( 'ithemes-security/core' ).getRoles(),
			config: select( 'ithemes-security/dashboard' ).getAvailableCard(
				card.card
			),
			isQuerying: select(
				'ithemes-security/dashboard'
			).isQueryingDashboardCard( card.id ),
		} ),
		[ card.id, card.card ]
	);
	const { queryDashboardCard } = useDispatch( 'ithemes-security/dashboard' );
	const query = useCallback(
		( searchParam, filters ) => {
			queryDashboardCard( card.id, {
				search: searchParam,
				roles: filters.roles,
			} );
		},
		[ card.id, queryDashboardCard ]
	);
	const debounced = useDebounce( query, 300 );

	const initialFilters = useMemo( () => ( {
		roles: config.query_args.roles?.default || [],
	} ), [ config ] );
	const [ search, setSearch ] = useState( '' );
	const [ filters, setFilters ] = useState( initialFilters );

	useEffect( () => debounced( search, filters ), [
		search,
		filters,
		debounced,
	] );

	return (
		<StyledFilter inHeader={ inHeader }>
			<StyledSearchControl
				label={ __( 'Search Users', 'it-l10n-ithemes-security-pro' ) }
				placeholder={ __( 'Search Users' ) }
				value={ search }
				onChange={ setSearch }
				isSearching={ isQuerying }
				size="small"
			/>
			{ config.query_args.roles && (
				<Dropdown
					popoverProps={ { position: 'bottom' } }
					headerTitle={ __( 'Select Roles', 'it-l10n-ithemes-security-pro' ) }
					focusOnMount="container"
					expandOnMobile
					contentClassName="itsec-popover-no-padding"
					renderToggle={ ( { isOpen, onToggle } ) => (
						<Button
							icon={ filterIcon }
							onClick={ onToggle }
							aria-expanded={ isOpen }
							label={ sprintf(
								/* translators: 1. Number of roles. */
								__( 'Roles (%d)', 'it-l10n-ithemes-security-pro' ),
								filters.roles.length
							) }
							variant="tertiary"
						/>
					) }
					renderContent={ () => (
						<StyledFiltersPopover
							isExpanded={ isExpanded }
							initialValue={ filters }
							onApply={ setFilters }
							isBusy={ isQuerying }
							maxSummaryFilters={ 0 }
							initialOpen={ initialOpen }
						>
							<FiltersGroupCheckboxes
								slug="roles"
								title={ __( 'Roles', 'it-l10n-ithemes-security-pro' ) }
								options={ map( roles, ( role, slug ) => ( {
									value: slug,
									label: role.label,
								} ) ) }
							/>
						</StyledFiltersPopover>
					) }
				/>
			) }
		</StyledFilter>
	);
}
