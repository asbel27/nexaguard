/**
 * WordPress dependencies
 */
import { __ } from '@wordpress/i18n';
import { useSelect } from '@wordpress/data';

/**
 * SolidWP dependencies
 */
import { TextSize, TextVariant, TextWeight } from '@ithemes/ui';

/**
 * Internal dependencies
 */
import { coreStore } from '@ithemes/security.packages.data';
import CreateEscalation from './components/create-escalation';
import Escalation from './components/escalation';
import { StyledEscalationContainer, StyledHeading } from './styles';

function getRoles( isMultisite ) {
	const roles = [
		{
			role: '',
			label: __( 'Select Role', 'it-l10n-ithemes-security-pro' ),
			value: '0',
		},
		{
			role: 'editor',
			label: __( 'Editor', 'it-l10n-ithemes-security-pro' ),
			value: '1',
		},
		{
			role: 'administrator',
			label: __( 'Administrator', 'it-l10n-ithemes-security-pro' ),
			value: '2',
		},
	];
	if ( isMultisite ) {
		roles.push(
			{
				role: 'super-admin',
				label: __( 'Network Administrator', 'it-l10n-ithemes-security-pro' ),
				value: '3',
			}
		);
	}
	return roles;
}

export default function App( {
	adminUrl,
	clearPrivilegeNonce,
	userId,
} ) {
	const { isMultisite, user } = useSelect( ( select ) => ( {
		isMultisite: select( coreStore ).getSiteInfo()?.multisite,
		user: select( coreStore ).getUser( userId ),
	} ), [ userId ] );

	const isEscalated = user?.solid_privilege?.role;
	const tempRoleExpiration = user?.solid_privilege?.expires;

	const maxPermission = user?.roles.includes( 'administrator' ) || user?.roles.includes( 'super-admin' );

	const roles = getRoles( isMultisite );

	const availableRoles = roles.filter( ( role ) =>
		! user.roles.includes( role.role )
	);

	return (
		<StyledEscalationContainer>
			<StyledHeading
				level={ 3 }
				size={ TextSize.LARGE }
				variant={ TextVariant.DARK }
				weight={ TextWeight.HEAVY }
				text={ __( 'Temporary Privilege Escalation', 'it-l10n-ithemes-security-pro' ) }
			/>

			{ isEscalated || maxPermission ? (
				<Escalation
					adminUrl={ adminUrl }
					clearPrivilegeNonce={ clearPrivilegeNonce }
					isEscalated={ isEscalated }
					tempRoleExpiration={ tempRoleExpiration }
					userId={ userId }
					userRoles={ availableRoles }
					maxPermission={ maxPermission }
				/>
			) : (
				<CreateEscalation
					tempRoleExpiration={ tempRoleExpiration }
					userId={ userId }
					userRoles={ availableRoles }
				/>
			) }
		</StyledEscalationContainer>
	);
}
