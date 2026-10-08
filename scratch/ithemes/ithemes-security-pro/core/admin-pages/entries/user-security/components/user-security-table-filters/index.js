/**
 * External dependencies
 */
import { isEmpty } from 'lodash';

/**
 * WordPress dependencies
 */
import { createSlotFill, Dropdown } from '@wordpress/components';
import { settings as filterIcon } from '@wordpress/icons';
import { __, sprintf } from '@wordpress/i18n';
import { useDispatch, useSelect } from '@wordpress/data';
import { useState } from '@wordpress/element';

/**
 * SolidWP dependencies
 */
import {
	Button,
	FiltersGroupCheckboxes,
	FiltersGroupDateRange,
} from '@ithemes/ui';

/**
 * Internal dependencies
 */
import {
	userSecurityStore,
	CORE_STORE_NAME as coreStore,
} from '@ithemes/security.packages.data';
import {
	StyledFilters,
	StyledFilterTools, StyledSearchDivider,
} from './styles';

const { Slot: UserSecurityFilterSlot, Fill: UserSecurityFilterFill } = createSlotFill( 'userSecurityFilters' );
export { UserSecurityFilterFill };

const { Slot: UserSecurityActionsSlot, Fill: UserSecurityActionsFill } = createSlotFill( 'UserSecurityActions' );
export { UserSecurityActionsFill };

const DEFAULT_FILTERS = {
	roles: [ 'administrator' ],
};

const QUERY_VARS = {
	per_page: 20,
	context: 'edit',
};

export function UserSecurityTableFilters() {
	const [ filters, setFilters ] = useState( DEFAULT_FILTERS );
	const { query } = useDispatch( userSecurityStore );
	const { isQuerying } = useSelect( ( select ) => ( {
		isQuerying: select( userSecurityStore ).isQuerying( 'main' ),
	} ), [] );
	const { roles } = useSelect( ( select ) => ( {
		roles: select( coreStore ).getRoles(),
	} ), [] );

	const roleOptions = Object.entries( roles || {} )
		.map( ( [ slug, role ] ) => ( {
			value: slug,
			label: role.label,
		} ) );

	const onApply = ( nextFilters ) => {
		setFilters( nextFilters );
		query( 'main', {
			...nextFilters,
			...QUERY_VARS,
		} );
	};

	const onReset = () => onApply( DEFAULT_FILTERS );

	return (
		<StyledFilterTools>
			<Dropdown
				popoverProps={ { focusOnMount: 'container' } }
				renderToggle={ ( { isOpen, onToggle } ) => (
					<Button
						icon={ filterIcon }
						onClick={ onToggle }
						aria-expanded={ isOpen }
						variant="tertiary"
						text={ sprintf(
							/* translators: 1. Filter for querying table */
							__( 'Filter (%d)', 'it-l10n-ithemes-security-pro' ),
							Object.keys( filters ).filter( ( key ) => ! isEmpty( filters[ key ] ) ).length
						) }
					/>
				) }
				renderContent={ () => (
					<StyledFilters
						initialValue={ filters }
						initialOpen={ [ 'user_group' ] }
						expandSingle
						isBusy={ isQuerying }
						onApply={ onApply }
					>
						<UserSecurityFilterSlot />
						<FiltersGroupCheckboxes
							slug="roles"
							title={ __( 'Role', 'it-l10n-ithemes-security-pro' ) }
							options={ roleOptions }
						/>
						<FiltersGroupDateRange
							slug="solid_last_seen"
							title={ __( 'User Last Seen', 'it-l10n-ithemes-security-pro' ) }
							presets={ [
								{
									time: 86_400,
									label: __( '24 hours', 'it-l10n-ithemes-security-pro' ),
									summary: __( 'Seen within 24 hours', 'it-l10n-ithemes-security-pro' ),
								},
								{
									time: 604_800,
									label: __( '7 days', 'it-l10n-ithemes-security-pro' ),
									summary: __( 'Seen within 7 days', 'it-l10n-ithemes-security-pro' ),
								},
								{
									time: 2_592_000,
									label: __( '30 days', 'it-l10n-ithemes-security-pro' ),
									summary: __( 'Seen within 30 days', 'it-l10n-ithemes-security-pro' ),
								},
							] }
							allowCustom
						/>
						<FiltersGroupCheckboxes
							slug="solid_password_strength"
							title={ __( 'Password Strength', 'it-l10n-ithemes-security-pro' ) }
							options={ [
								{ value: '1', label: __( 'Very Weak', 'it-l10n-ithemes-security-pro' ), summary: __( 'PW is very weak', 'it-l10n-ithemes-security-pro' ) },
								{ value: '2', label: __( 'Weak', 'it-l10n-ithemes-security-pro' ), summary: __( 'PW is weak', 'it-l10n-ithemes-security-pro' ) },
								{ value: '3', label: __( 'Medium', 'it-l10n-ithemes-security-pro' ), summary: __( 'PW is medium', 'it-l10n-ithemes-security-pro' ) },
								{ value: '4', label: __( 'Strong', 'it-l10n-ithemes-security-pro' ), summary: __( 'PW is strong', 'it-l10n-ithemes-security-pro' ) },
							] }
						/>
						<FiltersGroupDateRange
							slug="solid_password_changed"
							title={ __( 'Password Changed', 'it-l10n-ithemes-security-pro' ) }
							presets={ [
								{
									time: 604_800,
									label: __( 'Within 7 days', 'it-l10n-ithemes-security-pro' ),
									summary: __( 'PW changed within 7 days', 'it-l10n-ithemes-security-pro' ),
								},
								{
									time: 2_592_000,
									label: __( 'Within 30 days', 'it-l10n-ithemes-security-pro' ),
									summary: __( 'PW changed within 30 days', 'it-l10n-ithemes-security-pro' ),
								},
								{
									time: 7_776_000,
									label: __( 'Within 90 days', 'it-l10n-ithemes-security-pro' ),
									summary: __( 'PW changed within 90 days', 'it-l10n-ithemes-security-pro' ),
								},
							] }
							allowCustom
						/>
					</StyledFilters>
				) }
			/>
			<Button
				onClick={ onReset }
				variant="tertiary"
				text={ __( 'Reset All', 'it-l10n-ithemes-security-pro' ) }
			/>
			<StyledSearchDivider>&#124;</StyledSearchDivider>
			<UserSecurityActionsSlot />
		</StyledFilterTools>
	);
}
