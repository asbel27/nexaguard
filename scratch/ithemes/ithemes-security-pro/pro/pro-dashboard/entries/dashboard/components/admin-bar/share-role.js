/**
 * External dependencies
 */
import { get } from 'lodash';

/**
 * WordPress dependencies
 */
import { Dropdown, Tooltip } from '@wordpress/components';
import { __, sprintf } from '@wordpress/i18n';
import { useSelect, useDispatch } from '@wordpress/data';
import { useViewportMatch } from '@wordpress/compose';

/**
 * Internal dependencies
 */
import Recipient from './recipient';
import { StyledRecipientTrigger, StyledShareRecipient, StyledShareRecipientFooter, StyledShareRecipientHeader } from './styles';
import { Heading, Button, TextSize, TextVariant, TextWeight } from '@ithemes/ui';

export default function ShareRole( { dashboardId, role } ) {
	const isExpanded = useViewportMatch( 'medium', '<' );
	const { dashboard, roles } = useSelect(
		( select ) => ( {
			dashboard: select(
				'ithemes-security/dashboard'
			).getDashboardForEdit( dashboardId ),
			roles: select( 'ithemes-security/core' ).getRoles(),
		} ),
		[ dashboardId ]
	);
	const { saveDashboard } = useDispatch( 'ithemes-security/dashboard' );

	const onRemove = () => {
		const sharing = [];

		for ( const share of dashboard.sharing ) {
			if ( share.type !== 'role' ) {
				sharing.push( share );
			} else if ( ! share.roles.includes( role ) ) {
				sharing.push( share );
			} else {
				const without = {
					...share,
					roles: share.roles.filter(
						( maybeRole ) => maybeRole !== role
					),
				};

				sharing.push( without );
			}
		}

		return saveDashboard( { ...dashboard, sharing } );
	};

	const label = get( roles, [ role, 'label' ], role );

	return (
		<Dropdown
			headerTitle={ sprintf(
				/* translators: 1. The dashboard name. */
				__( 'Share Settings for %s', 'it-l10n-ithemes-security-pro' ),
				label
			) }
			focusOnMount="container"
			expandOnMobile
			renderToggle={ ( { isOpen, onToggle } ) => (
				<Tooltip text={ label }>
					<StyledRecipientTrigger
						aria-pressed={ isOpen }
						onClick={ onToggle }
						aria-label={ label }
						variant=""
					>
						<Recipient label={ label } slug={ role } />
					</StyledRecipientTrigger>
				</Tooltip>
			) }
			renderContent={ () => (
				<StyledShareRecipient isExpanded={ isExpanded }>
					<StyledShareRecipientHeader>
						<Heading
							level={ 3 }
							variant={ TextVariant.DARK }
							size={ TextSize.LARGE }
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
