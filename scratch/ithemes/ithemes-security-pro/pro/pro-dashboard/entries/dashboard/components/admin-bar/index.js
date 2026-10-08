/**
 * WordPress dependencies
 */
import { useSelect } from '@wordpress/data';
import { decodeEntities } from '@wordpress/html-entities';
import { __ } from '@wordpress/i18n';
import { Dropdown } from '@wordpress/components';
import { chevronDown, chevronUp } from '@wordpress/icons';

/**
 * iThemes dependencies
 */
import { Heading, TextSize, TextWeight } from '@ithemes/ui';

/**
 * Internal dependencies
 */
import { AdminBarFill } from '@ithemes/security.dashboard.api';
import Author from './author';
import Share from './share';
import ManageDashboards from '../manage-dashboards';
import { StyledDropdownToggle } from './styles';

export default function AdminBar() {
	const {
		canEdit,
		canCreate,
		dashboards,
		dashboard,
		dashboardId,
	} = useSelect( ( select ) => {
		const _dashboardId = select(
			'ithemes-security/dashboard'
		).getViewingDashboardId();

		return {
			dashboardId: _dashboardId,
			canEdit: _dashboardId && select( 'ithemes-security/dashboard' ).canEditDashboard(
				_dashboardId
			),
			dashboard: _dashboardId && select( 'ithemes-security/dashboard' ).getDashboard(
				_dashboardId
			),
			canCreate: select(
				'ithemes-security/dashboard'
			).canCreateDashboards(),
			dashboards: select(
				'ithemes-security/dashboard'
			).getAvailableDashboards(),
		};
	}, [] );
	const title = (
		<Heading level={ 1 } size={ TextSize.NORMAL } weight={ TextWeight.NORMAL }>
			{ dashboard
				? decodeEntities( dashboard.label.rendered )
				: __( 'No Dashboard Selected', 'it-l10n-ithemes-security-pro' ) }
		</Heading>
	);

	return (
		<AdminBarFill type="primary">
			{ dashboardId && <Author dashboardId={ dashboardId } /> }
			<div>
				{ ! canCreate && dashboards.length <= 1 && dashboardId ? (
					title
				) : (
					<Dropdown
						popoverProps={ { position: 'bottom right' } }
						headerTitle={ __( 'Manage Dashboards', 'it-l10n-ithemes-security-pro' ) }
						expandOnMobile
						focusOnMount="container"
						renderToggle={ ( { isOpen, onToggle } ) => (
							<StyledDropdownToggle
								aria-expanded={ isOpen }
								onClick={ onToggle }
								text={ title }
								icon={ isOpen ? chevronUp : chevronDown }
								iconPosition="right"
							/>
						) }
						renderContent={ ( { onClose } ) => (
							<ManageDashboards
								dashboardId={ dashboardId }
								close={ onClose }
							/>
						) }
					/>
				) }
			</div>
			{ dashboard && canEdit && (
				<Share dashboardId={ dashboardId } />
			) }
		</AdminBarFill>
	);
}
