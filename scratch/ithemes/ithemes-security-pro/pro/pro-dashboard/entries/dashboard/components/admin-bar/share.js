/**
 * External dependencies
 */
import { get, find } from 'lodash';

/**
 * WordPress dependencies
 */
import { Dropdown } from '@wordpress/components';
import { useSelect } from '@wordpress/data';
import { __ } from '@wordpress/i18n';
import { SVG, Path } from '@wordpress/primitives';

/**
 * iThemes dependencies
 */
import { Button } from '@ithemes/ui';

/**
 * Internal dependencies
 */
import ShareDashboard from '../share-dashboard';
import ShareUser from './share-user';
import ShareRole from './share-role';
import { StyledRecipients, StyledShare } from './styles';

export default function Share( { dashboardId } ) {
	const { dashboard } = useSelect(
		( select ) => ( {
			dashboard: select(
				'ithemes-security/dashboard'
			).getDashboardForEdit( dashboardId ),
		} ),
		[ dashboardId ]
	);
	const getUser = ( id ) =>
		find(
			get(
				dashboard,
				[ '_embedded', 'ithemes-security:shared-with' ],
				[]
			),
			{ id }
		);

	return (
		<StyledShare>
			<Dropdown
				popoverProps={ { position: 'bottom right' } }
				expandOnMobile
				focusOnMount="container"
				headerTitle={ __( 'Share with User', 'it-l10n-ithemes-security-pro' ) }
				renderToggle={ ( { isOpen, onToggle } ) => (
					<Button
						label={ __( 'Share Dashboard', 'it-l10n-ithemes-security-pro' ) }
						aria-pressed={ isOpen }
						onClick={ onToggle }
						icon={ shareIcon }
						variant="tertiary"
					/>
				) }
				renderContent={ ( { onClose } ) => (
					<ShareDashboard
						dashboardId={ dashboardId }
						close={ onClose }
					/>
				) }
			/>
			<StyledRecipients>
				{ get( dashboard, 'sharing', [] )
					.filter( ( share ) => share.type === 'user' )
					.map( ( share ) =>
						share.users.map( ( userId ) => (
							<ShareUser
								share={ share }
								userId={ userId }
								user={ getUser( userId ) }
								dashboardId={ dashboardId }
								key={ userId }
							/>
						) )
					) }
				{ get( dashboard, 'sharing', [] )
					.filter( ( share ) => share.type === 'role' )
					.map( ( share ) =>
						share.roles.map( ( role ) => (
							<ShareRole
								share={ share }
								role={ role }
								dashboardId={ dashboardId }
								key={ role }
							/>
						) )
					) }
			</StyledRecipients>
		</StyledShare>
	);
}

const shareIcon = (
	<SVG width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
		<Path d="M12 2.5L12 15.5M12 2.5L9 5.5M12 2.5L15 5.5" stroke="currentColor" strokeWidth="1.5" />
		<Path fillRule="evenodd" clipRule="evenodd" d="M8.5 9H7C5.89543 9 5 9.89543 5 11V18C5 19.1046 5.89543 20 7 20H17C18.1046 20 19 19.1046 19 18V11C19 9.89543 18.1046 9 17 9H15.5V10.5H17C17.2761 10.5 17.5 10.7239 17.5 11V18C17.5 18.2761 17.2761 18.5 17 18.5H7C6.72386 18.5 6.5 18.2761 6.5 18V11C6.5 10.7239 6.72386 10.5 7 10.5H8.5V9Z" />
	</SVG>
);
