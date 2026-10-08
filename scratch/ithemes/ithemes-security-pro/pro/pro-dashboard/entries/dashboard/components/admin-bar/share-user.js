/**
 * WordPress dependencies
 */
import { Dropdown, Tooltip } from '@wordpress/components';
import { __, sprintf } from '@wordpress/i18n';
import { useDispatch, useSelect } from '@wordpress/data';
import { useViewportMatch } from '@wordpress/compose';

/**
 * iThemes dependencies
 */
import { Heading, Button, TextSize, TextVariant, TextWeight } from '@ithemes/ui';

/**
 * Internal dependencies
 */
import { getAvatarUrl } from '@ithemes/security.dashboard.dashboard';
import Recipient from './recipient';
import { StyledRecipientTrigger, StyledShareRecipient, StyledAvatar, StyledShareRecipientFooter, StyledShareRecipientHeader } from './styles';

export default function ShareUser( { dashboardId, userId, user } ) {
	const isExpanded = useViewportMatch( 'medium', '<' );
	const { dashboard } = useSelect( ( select ) => ( {
		dashboard: select( 'ithemes-security/dashboard' ).getDashboardForEdit(
			dashboardId
		),
	} ), [ dashboardId ] );
	const { saveDashboard } = useDispatch( 'ithemes-security/dashboard' );

	const onRemove = ( ) => {
		const sharing = [];

		for ( const share of dashboard.sharing ) {
			if ( share.type !== 'user' ) {
				sharing.push( share );
			} else if ( ! share.users.includes( userId ) ) {
				sharing.push( share );
			} else {
				const without = {
					...share,
					users: share.users.filter(
						( id ) => id !== userId
					),
				};

				sharing.push( without );
			}
		}

		saveDashboard( { ...dashboard, sharing } );
	};

	const label = user
			? user.name
			: sprintf(
				/* translators: 1. The user id. */
				__( 'User #%d', 'it-l10n-ithemes-security-pro' ),
				userId
			),
		avatar = getAvatarUrl( user );

	return (
		<Dropdown
			headerTitle={ sprintf(
				/* translators: 1. The dashboard title. */
				__( 'Share Settings for %s', 'it-l10n-ithemes-security-pro' ),
				label
			) }
			focusOnMount="container"
			expandOnMobile
			renderToggle={ ( { isOpen, onToggle } ) => (
				<Tooltip text={ label }>
					<StyledRecipientTrigger
						aria-pressed={ isOpen }
						aria-label={ label }
						onClick={ onToggle }
						variant=""
					>
						<Recipient avatar={ avatar } />
					</StyledRecipientTrigger>
				</Tooltip>
			) }
			renderContent={ () => (
				<StyledShareRecipient isExpanded={ isExpanded }>
					<StyledShareRecipientHeader>
						<StyledAvatar src={ avatar } alt="" />
						<Heading
							level={ 3 }
							size={ TextSize.LARGE }
							variant={ TextVariant.DARK }
							weight={ TextWeight.HEAVY }
							text={ label }
						/>
					</StyledShareRecipientHeader>
					<StyledShareRecipientFooter>
						<Button variant="tertiary" onClick={ onRemove } text={ __( 'Remove', 'it-l10n-ithemes-security-pro' ) } />
					</StyledShareRecipientFooter>
				</StyledShareRecipient>
			) }
		/>
	);
}
