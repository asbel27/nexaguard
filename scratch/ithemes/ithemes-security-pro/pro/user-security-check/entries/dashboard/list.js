/**
 * External dependencies
 */
import { get } from 'lodash';

/**
 * WordPress dependencies
 */
import { __, sprintf } from '@wordpress/i18n';
import { useSelect, useDispatch } from '@wordpress/data';
import { useState } from '@wordpress/element';
import { addFilter } from '@wordpress/hooks';
import { pin as pinIcon } from '@wordpress/icons';

/**
 * iThemes dependencies
 */
import {
	Text,
	Button,
	Heading,
	MasterDetail,
	MasterDetailBackButton,
	TextSize,
	TextWeight,
} from '@ithemes/ui';

/**
 * Internal dependencies
 */
import {
	CardHeader,
	CardHeaderTitle,
} from '@ithemes/security.dashboard.dashboard';
import { SplitButton, FlexSpacer } from '@ithemes/security-components';
import UserInfo from './user-info';
import Filter from './filter';
import { getTwoFactor, useCardLink } from './utils';
import { StyledFooter, StyledListCard, StyledUserAvatar, StyledUserCell, StyledUserHeader } from './styles';

function SecurityProfileList( {
	card,
	config,
	eqProps,
	dashboardId,
} ) {
	const { profileCards } = useSelect( ( select ) => ( {
		profileCards: select( 'ithemes-security/dashboard' )
			.getDashboardCards( dashboardId )
			.filter( ( maybeCard ) => maybeCard.card === 'security-profile' )
			.map( ( profileCard ) => get( profileCard, [ 'data', 'user', 'id' ] ) ),
	} ), [ dashboardId ] );
	const { saveDashboardCard } = useDispatch( 'ithemes-security/dashboard' );

	const [ selectedId, setSelectedId ] = useState( card.data.users[ 0 ]?.id );

	const pinUser = ( user ) => {
		saveDashboardCard( dashboardId, {
			card: 'security-profile',
			settings: {
				user,
			},
		}
		);
	};

	const isSmall =
		eqProps[ 'max-width' ] && eqProps[ 'max-width' ].includes( '760px' );

	return (
		<StyledListCard>
			<CardHeader>
				<CardHeaderTitle card={ card } config={ config } />
				{ ! isSmall && <Filter card={ card } inHeader /> }
			</CardHeader>
			<MasterDetail
				masters={ card.data.users }
				getId={ ( user ) => user.id }
				onSelect={ setSelectedId }
				selectedId={ selectedId }
				isSinglePane={ isSmall }
				isBorderless
				renderMaster={ ( user ) => (
					<MasterRender user={ user } />
				) }
				renderDetail={ ( user ) => (
					<DetailRender
						user={ user }
						card={ card }
						pinUser={ pinUser }
						profileCards={ profileCards }
						isSmall={ isSmall }
						onSelect={ setSelectedId }
						selectedId={ selectedId }
					/>
				) }
				renderBeforeList={ () => (
					isSmall && <Filter card={ card } />
				) }
				renderAfterList={ () => (
					<Footer card={ card } />
				) }
				renderBeginList={ () => (
					<thead>
						<tr>
							<th scope="column">
								{ __( 'User', 'it-l10n-ithemes-security-pro' ) }
							</th>
							<th scope="column">
								{ __( 'Role', 'it-l10n-ithemes-security-pro' ) }
							</th>
							<th scope="column">
								{ __( '2FA', 'it-l10n-ithemes-security-pro' ) }
							</th>
						</tr>
					</thead>
				) }
			/>
		</StyledListCard>
	);
}

function MasterRender( { user } ) {
	return (
		<>
			<StyledUserCell scope="row">
				<StyledUserAvatar src={ user.avatar } alt="" />
				<Text text={ user.name } />
			</StyledUserCell>
			<td>
				<Text text={ user.role } />
			</td>
			<td>
				<Text { ...getTwoFactor( user.two_factor ) } />
			</td>
		</>
	);
}

function DetailRender( { user, pinUser, profileCards, card, isSmall, onSelect, selectedId } ) {
	return (
		<>
			<StyledUserHeader>
				<StyledUserAvatar src={ user.avatar } alt="" />
				<Heading level={ 3 } size={ TextSize.LARGE } text={ user.name } weight={ TextWeight.HEAVY } />
				{ ! profileCards.includes( user.id ) && (
					<Button
						onClick={ () => pinUser( user.id ) }
						variant="tertiary"
						text={ __( 'Pin', 'it-l10n-ithemes-security-pro' ) }
						icon={ pinIcon }
					/>
				) }
				<FlexSpacer />
				<MasterDetailBackButton
					isSinglePane={ isSmall }
					onSelect={ onSelect }
					selectedId={ selectedId }
				/>
			</StyledUserHeader>
			<UserInfo user={ user } card={ card } />
		</>
	);
}

function Footer( { card } ) {
	const { refreshDashboardCard } = useDispatch(
		'ithemes-security/dashboard'
	);

	const forceLink =
		card._links?.[ 'ithemes-security:force-password-change' ]?.[ 0 ];
	const clearLink =
		card._links?.[ 'ithemes-security:clear-password-change' ]?.[ 0 ];

	const { execute: forceExecute, status: forceStatus } = useCardLink(
		forceLink,
		() => refreshDashboardCard( card.id ),
		false
	);

	const { execute: clearExecute, status: clearStatus } = useCardLink(
		clearLink,
		() => refreshDashboardCard( card.id ),
		false
	);

	if ( ! forceLink ) {
		return null;
	}

	return (
		<StyledFooter as="footer">
			<SplitButton
				variant="primary"
				isBusy={
					forceStatus === 'pending' || clearStatus === 'pending'
				}
				text={ forceLink.title }
				onClick={ () => forceExecute() }
				controls={ [
					clearLink && {
						title: clearLink.title,
						onClick() {
							clearExecute();
						},
					},
				] }
			/>
		</StyledFooter>
	);
}

export const slug = 'security-profile-list';
export const settings = {
	render: SecurityProfileList,
	elementQueries: [
		{
			type: 'width',
			dir: 'max',
			px: 760,
		},
	],
};

addFilter(
	'ithemes-security.dashboard.getCardTitle.security-profile',
	'ithemes-security/security-profile/default',
	function( title, card ) {
		if ( card.data.user && card.data.user.name ) {
			return sprintf(
				/* translators: 1. The user's name. */
				__( 'Security Profile – %s', 'it-l10n-ithemes-security-pro' ),
				card.data.user.name
			);
		}

		if ( card.settings && card.settings.user ) {
			return sprintf(
				/* translators: 1. The user ID. */
				__( 'User (%d) Security Profile', 'it-l10n-ithemes-security-pro' ),
				card.settings.user
			);
		}

		return title;
	}
);
