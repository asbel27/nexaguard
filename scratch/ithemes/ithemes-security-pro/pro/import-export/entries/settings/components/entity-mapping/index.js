/**
 * WordPress dependencies
 */
import { __, sprintf } from '@wordpress/i18n';
import { useDispatch, useSelect } from '@wordpress/data';
import { Flex, SelectControl } from '@wordpress/components';

/**
 * Solid dependencies
 */
import { Text, TextSize, TextVariant, TextWeight } from '@ithemes/ui';

/**
 * Internal dependencies
 */
import { EntitySelectControl } from '@ithemes/security-ui';
import { coreStore } from '@ithemes/security.packages.data';
import { STORE_NAME } from '@ithemes/security.import-export.data';

export function RoleMapping() {
	const { roles, targets, map } = useSelect(
		( select ) => ( {
			roles: select( coreStore ).getRoles(),
			map: select( STORE_NAME ).getImportRoleMap(),
			targets: select(
				STORE_NAME
			).getImportExportRoleReplacementTargets(),
		} ),
		[]
	);
	const { editImportRoleMap } = useDispatch( STORE_NAME );

	if ( ! targets.length || ! roles ) {
		return null;
	}

	return (
		<EntityMapping
			title={ __( 'Replace Roles', 'it-l10n-ithemes-security-pro' ) }
			description={ __(
				'Choose the user roles that best match the roles from the export.',
				'it-l10n-ithemes-security-pro'
			) }
		>
			{ targets.map( ( target ) => (
				<RoleTarget
					key={ target.slug }
					target={ target }
					value={ map }
					onChange={ editImportRoleMap }
					roles={ roles }
				/>
			) ) }
		</EntityMapping>
	);
}

export function UserMapping() {
	const { targets, map } = useSelect(
		( select ) => ( {
			map: select( STORE_NAME ).getImportUserMap(),
			targets: select(
				STORE_NAME
			).getImportExportUserReplacementTargets(),
		} ),
		[]
	);
	const { editImportUserMap } = useDispatch( STORE_NAME );

	if ( ! targets.length ) {
		return null;
	}

	return (
		<EntityMapping
			title={ __( 'Replace Users', 'it-l10n-ithemes-security-pro' ) }
			description={ __(
				'Choose the users that best match the users from the export.',
				'it-l10n-ithemes-security-pro'
			) }
		>
			{ targets.map( ( target ) => (
				<UserTarget
					key={ target.id }
					target={ target }
					value={ map }
					onChange={ editImportUserMap }
				/>
			) ) }
		</EntityMapping>
	);
}

function EntityMapping( { title, description, children } ) {
	return (
		<fieldset>
			<Flex direction="column" gap={ 5 } expanded={ false }>
				<Flex direction="column" gap={ 2 } expanded={ false }>
					<Text
						as="legend"
						size={ TextSize.SUBTITLE_SMALL }
						weight={ TextWeight.HEAVY }
						variant={ TextVariant.MUTED }
						text={ title }
					/>
					<Text
						variant={ TextVariant.MUTED }
						text={ description }
					/>
				</Flex>
				<Flex direction="column" gap={ 2 } expanded={ false }>
					{ children }
				</Flex>
			</Flex>
		</fieldset>
	);
}

function RoleTarget( { target, value, onChange, roles } ) {
	const options = Object.entries( roles )
		.map( ( [ slug, role ] ) => ( {
			value: slug,
			label: role.label,
		} ) )
		.concat( { value: '', label: '' } );

	return (
		<SelectControl
			label={ target.label }
			value={
				value[ target.slug ] ??
				( roles[ target.slug ] ? target.slug : '' )
			}
			onChange={ ( newRole ) =>
				onChange( { ...value, [ target.slug ]: newRole } )
			}
			options={ options }
		/>
	);
}

function UserTarget( { target, value, onChange } ) {
	return (
		<EntitySelectControl
			value={ value[ target.id ] || 0 }
			onChange={ ( id ) => onChange( { ...value, [ target.id ]: id } ) }
			label={ sprintf(
				/* translators: 1. User's name, 2. User's email address. */
				__( '%1$s (%2$s)', 'it-l10n-ithemes-security-pro' ),
				target.name,
				target.email
			) }
			path="/wp/v2/users"
			labelAttr="name"
		/>
	);
}
