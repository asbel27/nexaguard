/**
 * WordPress dependencies
 */
import { withSelect } from '@wordpress/data';
import { compose } from '@wordpress/compose';

/**
 * iThemes dependencies
 */
import {
	Heading,
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
import UserInfo from './user-info';
import UserForm from './user-form';
import { StyledPinnedUserCard, StyledUserAvatar, StyledUserHeader } from './styles';

function Pinned( { card, config, canEdit, dashboardId } ) {
	const user = card.data.user;

	return (
		<StyledPinnedUserCard>
			{ user && (
				<>
					<StyledUserHeader className="itsec-card__drag-handle">
						<StyledUserAvatar src={ user.avatar } alt="" />
						<Heading level={ 3 } size={ TextSize.LARGE } text={ user.name } weight={ TextWeight.HEAVY } />
					</StyledUserHeader>
					<UserInfo user={ user } card={ card } />
				</>
			) }
			{ ! user && (
				<>
					<CardHeader>
						<CardHeaderTitle card={ card } config={ config } />
					</CardHeader>
					{ canEdit && (
						<UserForm card={ card } dashboardId={ dashboardId } />
					) }
				</>
			) }
		</StyledPinnedUserCard>
	);
}

export const slug = 'security-profile';

export const settings = {
	render: compose( [
		withSelect( ( select, ownProps ) => ( {
			canEdit: select( 'ithemes-security/dashboard' ).canEditCard(
				ownProps.dashboardId,
				ownProps.card.id
			),
		} ) ),
	] )( Pinned ),
	elementQueries: [
		{
			type: 'width',
			dir: 'max',
			px: 250,
		},
	],
};
