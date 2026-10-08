/**
 * External dependencies
 */
import memize from 'memize';

/**
 * WordPress dependencies
 */
import { __ } from '@wordpress/i18n';
import { useState } from '@wordpress/element';
import { useSelect, useDispatch } from '@wordpress/data';
import { CheckboxControl } from '@wordpress/components';
import apiFetch from '@wordpress/api-fetch';
import { addQueryArgs } from '@wordpress/url';

/**
 * iThemes dependencies
 */
import { Heading, List, ListItem, Text, Button, TextSize } from '@ithemes/ui';

/**
 * Internal dependencies
 */
import {
	StyledAddUserControl,
	StyledSelectUserControl,
	StyledShareDashboardTab,
	StyledShareSection,
	StyledShareSectionLegend,
} from './styles';

const loadUsers = memize( ( exclude = [] ) => ( search ) =>
	new Promise( ( resolve, reject ) => {
		apiFetch( {
			path: addQueryArgs( '/wp/v2/users', {
				search,
				per_page: 100,
				exclude,
			} ),
		} )
			.then( ( response ) =>
				resolve(
					response.map( ( user ) => ( {
						value: user.id,
						label: user.name,
						user,
					} ) )
				)
			)
			.catch( reject );
	} )
);

const excludedUsers = memize( ( sharing = [] ) =>
	[].concat( ...sharing.map( ( share ) => share.users || [] ) )
);

export default function UserTab( {
	dashboardId,
	share = { type: 'user', users: [] },
	onChange,
} ) {
	const { suggested, dashboard } = useSelect( ( select ) => ( {
		suggested: select(
			'ithemes-security/dashboard'
		).getSuggestedShareUsers(),
		dashboard: select( 'ithemes-security/dashboard' ).getDashboardForEdit(
			dashboardId
		),
	} ), [ dashboardId ] );

	const exclude = excludedUsers( dashboard.sharing ).concat(
		dashboard.created_by
	);
	const suggestedFiltered = suggested.filter(
		( user ) => ! exclude.includes( user.id )
	);

	return (
		<StyledShareDashboardTab>
			{ suggestedFiltered.length > 0 && (
				<StyledShareSection as="fieldset">
					<StyledShareSectionLegend as="legend" text={ __( 'Suggested Users', 'it-l10n-ithemes-security-pro' ) } />
					<List>
						{ suggestedFiltered.map( ( user ) => (
							<ListItem key={ user.id }>
								<CheckboxControl
									__nextHasNoMarginBottom
									label={ user.name }
									checked={ share.users.includes( user.id ) }
									onChange={ ( checked ) =>
										checked
											? onChange( {
												...share,
												users: [
													...share.users,
													user.id,
												],
											} )
											: onChange( {
												...share,
												users: share.users.filter(
													( userId ) =>
														userId !== user.id
												),
											} )
									}
								/>
							</ListItem>
						) ) }
					</List>
				</StyledShareSection>
			) }

			<AllUsersSection
				share={ share }
				onChange={ onChange }
				suggested={ suggested }
				exclude={ exclude }
			/>

		</StyledShareDashboardTab>
	);
}

function AllUsersSection( { share, onChange, suggested, exclude } ) {
	const { receiveUser } = useDispatch( 'ithemes-security/dashboard' );

	const [ selectedUser, setSelectedUser ] = useState( undefined );
	const [ selectSearch, setSelectSearch ] = useState( '' );

	const addUser = ( e ) => {
		e.preventDefault();

		if ( ! selectedUser ) {
			return;
		}

		receiveUser( selectedUser.user );
		onChange( { ...share, users: [ ...share.users, selectedUser.value ] } );
		setSelectedUser( false );
		setSelectSearch( '' );
	};

	const allUsers = share.users
		.filter(
			( userId ) =>
				! suggested.some(
					( suggestion ) => suggestion.id === userId
				)
		);

	return (
		<StyledShareSection>
			<Heading
				level={ 4 }
				size={ TextSize.NORMAL }
				text={ __( 'All Users', 'it-l10n-ithemes-security-pro' ) }
			/>
			{ allUsers.length > 0 && (
				<List>
					{ allUsers.map( ( userId ) => (
						<AddedUser key={ userId } userId={ userId } />
					) ) }
				</List>
			) }

			<Text
				as="label"
				htmlFor="itsec-share-dashboard__add-users-select"
				text={ __( 'Select a User', 'it-l10n-ithemes-security-pro' ) }
			/>

			<StyledAddUserControl>
				<StyledSelectUserControl
					className="itsec-share-dashboard__add-users-select-dropdown"
					inputId="itsec-share-dashboard__add-users-select"
					cacheOptions
					defaultOptions
					loadOptions={ loadUsers( exclude ) }
					value={ selectedUser }
					onChange={ ( option ) =>
						setSelectedUser( option )
					}
					inputValue={ selectSearch }
					onInputChange={ ( newSelect ) =>
						setSelectSearch( newSelect )
					}
					maxMenuHeight={ 150 }
					menuPlacement="top"
				/>

				<Button
					onClick={ addUser }
					disabled={ ! selectedUser }
					text={ __( 'Select', 'it-l10n-ithemes-security-pro' ) }
					variant="tertiary"
				/>
			</StyledAddUserControl>
		</StyledShareSection>
	);
}

function AddedUser( { userId } ) {
	const { user } = useSelect( ( select ) => ( {
		user: select( 'ithemes-security/dashboard' ).getUser( userId ),
	} ), [ userId ] );

	return <ListItem text={ user.name } />;
}
