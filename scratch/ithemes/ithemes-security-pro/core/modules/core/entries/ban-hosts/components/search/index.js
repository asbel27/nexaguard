/**
 * External dependencies
 */
import { omitBy } from 'lodash';

/**
 * WordPress dependencies
 */
import { __, sprintf } from '@wordpress/i18n';
import { useState } from '@wordpress/element';
import { useSelect } from '@wordpress/data';

/**
 * iThemes dependencies
 */
import { SearchControl } from '@ithemes/ui';

/**
 * Internal dependencies
 */
import { StyledSearchControlContainer, StyledSelectControl } from './styles';

function useActorsSelect( emptyLabel = '' ) {
	const { types, byType } = useSelect( ( select ) => {
		const selectTypes =
			select( 'ithemes-security/core' ).getActorTypes() || [];
		const selectByType = {};

		for ( const type of selectTypes ) {
			selectByType[ type.slug ] = select(
				'ithemes-security/core'
			).getActors( type.slug );
		}

		return { types: selectTypes, byType: selectByType };
	}, [] );

	const options = [];
	options.push( {
		label: emptyLabel,
		value: '',
	} );

	for ( const type of types ) {
		options.push( {
			label: sprintf(
				/* translators: 1. Actor type label */
				__( 'Any %s', 'it-l10n-ithemes-security-pro' ),
				type.label
			),
			value: type.slug,
			optgroup: type.label,
		} );

		for ( const actor of byType[ type.slug ] || [] ) {
			options.push( {
				label: actor.label,
				value: type.slug + ':' + actor.id,
				optgroup: type.label,
			} );
		}
	}

	return options;
}

export default function Search( { query, isQuerying, queryId } ) {
	const actors = useActorsSelect( __( 'All', 'it-l10n-ithemes-security-pro' ) );
	const [ search, setSearch ] = useState( {
		search: '',
		actor_id: '',
		actor_type: '',
	} );
	const onSearch = ( change ) => {
		const newSearch = { ...search, ...change };
		setSearch( newSearch );
		query( queryId, {
			...omitBy( newSearch, ( value ) => value === '' ),
			per_page: 100,
		} );
	};

	return (
		<StyledSearchControlContainer>
			<StyledSelectControl
				options={ actors }
				hideLabelFromVision
				__nextHasNoMarginBottom
				label={ __( 'Ban Reason', 'it-l10n-ithemes-security-pro' ) }
				value={
					search.actor_type && search.actor_id
						? search.actor_type + ':' + search.actor_id
						: search.actor_type
				}
				onChange={ ( change ) => {
					if ( change === '' ) {
						onSearch( { actor_type: '', actor_id: '' } );
					} else {
						const [ actorType, actorId = '' ] = change.split( ':' );
						onSearch( {
							actor_type: actorType,
							actor_id: actorId,
						} );
					}
				} }
			/>
			<SearchControl
				placeholder={ __( 'Search Bans', 'it-l10n-ithemes-security-pro' ) }
				value={ search.search }
				onChange={ ( term ) => onSearch( { search: term } ) }
				isSearching={ isQuerying }
				size="small"
			/>
		</StyledSearchControlContainer>
	);
}
