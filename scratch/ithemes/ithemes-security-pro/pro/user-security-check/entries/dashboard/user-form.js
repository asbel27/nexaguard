/**
 * WordPress dependencies
 */
import { __ } from '@wordpress/i18n';
import { addQueryArgs } from '@wordpress/url';
import { useState } from '@wordpress/element';
import { useDispatch } from '@wordpress/data';
import apiFetch from '@wordpress/api-fetch';

/**
 * iThemes dependencies
 */
import { Button, Text, TextVariant } from '@ithemes/ui';

/**
 * Internal dependencies
 */
import { StyledUserForm, StyledSelectUser, StyledSelectUserControl } from './styles';

const loadUsers = ( search ) =>
	new Promise( ( resolve, reject ) => {
		apiFetch( {
			path: addQueryArgs( '/wp/v2/users', {
				search,
				per_page: 100,
				itsec_global: true,
			} ),
		} )
			.then( ( response ) =>
				resolve(
					response.map( ( user ) => ( {
						value: user.id,
						label: user.name,
					} ) )
				)
			)
			.catch( reject );
	} );

export default function UserForm( { dashboardId, card } ) {
	const [ userInput, setUserInput ] = useState( 0 );
	const { saveDashboardCard } = useDispatch( 'ithemes-security/dashboard' );
	const save = ( update ) => saveDashboardCard( dashboardId, {
		...card,
		...update,
	} );

	return (
		<StyledUserForm>
			<Text
				as="label"
				htmlFor={ `itsec-card-security-profile__select-user-dropdown--${ card.id }` }
				variant={ TextVariant.DARK }
				text={ __( 'Select a User', 'it-l10n-ithemes-security-pro' ) }
			/>
			<StyledSelectUser>
				<StyledSelectUserControl
					addErrorBoundary={ false }
					inputId={ `itsec-card-security-profile__select-user-dropdown--${ card.id }` }
					cacheOptions
					defaultOptions
					loadOptions={ loadUsers }
					value={ userInput }
					onChange={ ( option ) => setUserInput( option ) }
					maxMenuHeight={ 150 }
				/>
				<Button
					onClick={ () =>
						save( {
							settings: {
								...( card.settings || {} ),
								user: userInput.value,
							},
						} )
					}
					text={ __( 'Select', 'it-l10n-ithemes-security-pro' ) }
					variant="secondary"
					disabled={ ! userInput?.value }
				/>
			</StyledSelectUser>
			<Text as="p" variant={ TextVariant.MUTED } text={ __( 'Select a user to monitor with this card.', 'it-l10n-ithemes-security-pro' ) } />
		</StyledUserForm>
	);
}
