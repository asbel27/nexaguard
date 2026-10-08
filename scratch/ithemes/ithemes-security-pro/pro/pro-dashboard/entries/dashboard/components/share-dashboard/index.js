/**
 * External dependencies
 */
import { noop, once, isEmpty } from 'lodash';

/**
 * WordPress dependencies
 */
import { __, _n, sprintf } from '@wordpress/i18n';
import { useState } from '@wordpress/element';
import { useDispatch, useSelect } from '@wordpress/data';
import { useViewportMatch } from '@wordpress/compose';

/**
 * SolidWP dependencies
 */
import {
	Heading,
	TabPanel,
	Text,
	TextSize,
	TextVariant,
	TextWeight,
} from '@ithemes/ui';

/**
 * Internal dependencies
 */
import UserTab from './user-tab';
import RoleTab from './role-tab';
import {
	StyledShareButton,
	StyledShareDashboard,
	StyledShareDashboardFooter,
	StyledShareDashboardHeader,
} from './styles';

const getTabs = once( () => [
	{
		name: 'user',
		title: __( 'Users', 'it-l10n-ithemes-security-pro' ),
		Component: UserTab,
		type: 'button',
		count( share ) {
			return sprintf(
				/* translators: 1. The number of users. */
				_n( '%d user', '%d users', share.users.length, 'it-l10n-ithemes-security-pro' ),
				share.users.length
			);
		},
	},
	{
		name: 'role',
		title: __( 'Roles', 'it-l10n-ithemes-security-pro' ),
		type: 'button',
		Component: RoleTab,
		count( share ) {
			return sprintf(
				/* translators: 1. The number of roles. */
				_n( '%d role', '%d roles', share.roles.length, 'it-l10n-ithemes-security-pro' ),
				share.roles.length
			);
		},
	},
] );

export default function ShareDashboard( {
	dashboardId,
	close,
} ) {
	const isExpanded = useViewportMatch( 'medium', '<' );
	const [ shares, setShares ] = useState( {} );

	const { isSaving, dashboard } = useSelect( ( select ) => ( {
		isSaving: select( 'ithemes-security/dashboard' ).isSavingDashboard( dashboardId ),
		dashboard: select( 'ithemes-security/dashboard' ).getDashboardForEdit( dashboardId ),
	} ), [ dashboardId ] );

	const { saveDashboard: save } = useDispatch( 'ithemes-security/dashboard' );

	const onSubmit = async ( e ) => {
		e.preventDefault();

		if ( ! isSaving ) {
			await save( {
				...dashboard,
				sharing: [
					...dashboard.sharing,
					...Object.values( shares ).filter( ( share ) => share ),
				],
			} );
			setShares( {} );
			close();
		}
	};

	const tabs = getTabs();
	const summary = tabs.reduce( ( acc, cur ) => {
		if ( shares[ cur.name ] ) {
			acc.push( cur.count( shares[ cur.name ] ) );
		}

		return acc;
	}, [] );

	return (
		<StyledShareDashboard onSubmit={ onSubmit } isExpanded={ isExpanded }>
			<StyledShareDashboardHeader>
				{ ! isExpanded && (
					<Heading
						level={ 3 }
						size={ TextSize.NORMAL }
						variant={ TextVariant.DARK }
						weight={ TextWeight.HEAVY }
						text={ __( 'Share Dashboard', 'it-l10n-ithemes-security-pro' ) }
					/>
				) }
				<Text
					as="p"
					text={ __(
						'Give select users read-only access to this dashboard. Great for building client portals.',
						'it-l10n-ithemes-security-pro'
					) }
					size={ TextSize.SMALL }
					variant={ TextVariant.MUTED }
				/>
			</StyledShareDashboardHeader>
			<TabPanel tabs={ tabs }>
				{ ( { name, Component = noop } ) => (
					<Component
						dashboardId={ dashboardId }
						share={ shares[ name ] }
						onChange={ ( share ) =>
							setShares( { ...shares, [ name ]: share } )
						}
					/>
				) }
			</TabPanel>
			<StyledShareDashboardFooter>
				{ summary.length > 0 && (
					<Text
						variant={ TextVariant.MUTED }
						text={ sprintf(
							/* translators: 1. List of names. */
							__( '%s selected', 'it-l10n-ithemes-security-pro' ),
							summary.join( ', ' )
						) }
					/>
				) }
				<StyledShareButton
					variant="primary"
					type="submit"
					onClick={ onSubmit }
					isBusy={ isSaving }
					disabled={ isSaving || isEmpty( shares ) }
					text={ __( 'Share', 'it-l10n-ithemes-security-pro' ) }
				/>
			</StyledShareDashboardFooter>
		</StyledShareDashboard>
	);
}
