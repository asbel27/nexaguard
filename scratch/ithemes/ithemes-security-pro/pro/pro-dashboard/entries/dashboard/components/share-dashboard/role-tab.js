/**
 * External dependencies
 */
import memize from 'memize';
import { pickBy, map, isEmpty } from 'lodash';

/**
 * WordPress dependencies
 */
import { CheckboxControl } from '@wordpress/components';
import { useSelect } from '@wordpress/data';
import { __ } from '@wordpress/i18n';

/**
 * iThemes dependencies
 */
import { List, ListItem, Text, TextVariant } from '@ithemes/ui';

/**
 * Internal dependencies
 */
import { StyledShareDashboardTab } from './styles';

const includesRoles = memize( ( sharing, role ) =>
	sharing.some(
		( share ) => share.type === 'role' && share.roles.includes( role )
	)
);

export default function RoleTab( {
	dashboardId,
	share = { type: 'role', roles: [] },
	onChange,
} ) {
	const { dashboard, roles } = useSelect(
		( select ) => ( {
			dashboard: select(
				'ithemes-security/dashboard'
			).getDashboardForEdit( dashboardId ),
			roles: select( 'ithemes-security/core' ).getRoles(),
		} ),
		[ dashboardId ]
	);
	const filtered = pickBy(
		roles,
		( _, role ) => ! includesRoles( dashboard.sharing, role )
	);

	const hasRoles = ! isEmpty( filtered );

	return (
		<StyledShareDashboardTab>
			{ ! hasRoles && (
				<Text text={ __( 'All roles already selected.', 'it-l10n-ithemes-security-pro' ) } variant={ TextVariant.MUTED } />
			) }
			{ hasRoles && (
				<List>
					{ map( filtered, ( role, slug ) => (
						<ListItem key={ slug }>
							<CheckboxControl
								__nextHasNoMarginBottom
								label={ role.label }
								checked={ share.roles.includes( slug ) }
								onChange={ ( checked ) =>
									checked
										? onChange( {
											...share,
											roles: [ ...share.roles, slug ],
										} )
										: onChange( {
											...share,
											roles: share.roles.filter(
												( maybeRole ) => slug !== maybeRole
											),
										} )
								}
							/>
						</ListItem>
					) ) }
				</List>
			) }
		</StyledShareDashboardTab>
	);
}
