/**
 * WordPress dependencies
 */
import { useSelect, useDispatch } from '@wordpress/data';
import { __ } from '@wordpress/i18n';
import { useViewportMatch } from '@wordpress/compose';

/**
 * iThemes dependencies
 */
import { Heading, Text, TextSize, TextVariant, TextWeight } from '@ithemes/ui';

/**
 * Internal dependencies
 */
import Dashboard from './dashboard';
import {
	StyledManageDashboards,
	StyledHeader,
	StyledDashboardsList,
	StyledFooter,
	StyledCreateDashboard,
} from './styles';

export default function ManageDashboards( { close } ) {
	const isExpanded = useViewportMatch( 'medium', '<' );

	const { currentUserId, canCreate, dashboards } = useSelect(
		( select ) => ( {
			canCreate: select(
				'ithemes-security/dashboard'
			).canCreateDashboards(),
			dashboards: select(
				'ithemes-security/dashboard'
			).getAvailableDashboards(),
			currentUserId:
				select( 'ithemes-security/core' ).getCurrentUser()?.id || 0,
		} ),
		[]
	);
	const { viewCreateDashboard } = useDispatch( 'ithemes-security/dashboard' );

	return (
		<StyledManageDashboards isExpanded={ isExpanded }>
			<StyledHeader>
				{ ! isExpanded && (
					<Heading
						level={ 3 }
						size={ TextSize.NORMAL }
						variant={ TextVariant.DARK }
						weight={ TextWeight.HEAVY }
						text={ __( 'Manage Dashboards', 'it-l10n-ithemes-security-pro' ) } />
				) }
				<Text
					as="p"
					size={ TextSize.SMALL }
					variant={ TextVariant.MUTED }
					text={ __(
						'Switch, manage, or create new dashboards.',
						'it-l10n-ithemes-security-pro'
					) } />
			</StyledHeader>
			<StyledDashboardsList>
				{ dashboards.map( ( dashboard ) => (
					<Dashboard
						key={ dashboard.id }
						dashboard={ dashboard }
						currentUserId={ currentUserId }
						close={ close }
					/>
				) ) }
			</StyledDashboardsList>
			{ canCreate && (
				<StyledFooter>
					<StyledCreateDashboard
						variant="tertiary"
						align="center"
						onClick={ () => {
							viewCreateDashboard();
							close();
						} }
						text={ __( 'Create New Dashboard', 'it-l10n-ithemes-security-pro' ) }
					/>
				</StyledFooter>
			) }
		</StyledManageDashboards>
	);
}
