/**
 * WordPress dependencies
 */
import { __ } from '@wordpress/i18n';
import apiFetch from '@wordpress/api-fetch';
import { useCallback, useState } from '@wordpress/element';
import { useDispatch } from '@wordpress/data';
import { SelectControl } from '@wordpress/components';

/**
 * SolidWP dependencies
 */
import { TextVariant, TextWeight } from '@ithemes/ui';

/**
 * Internal dependencies
 */
import { coreStore } from '@ithemes/security.packages.data';
import { useAsync } from '@ithemes/security-hocs';
import {
	StyledDays,
	StyledDescription,
	StyledForm,
	StyledRoles,
	StyledTitle,
	StyledUpdateButton,
	StyledError,
} from './styles';

export default function CreateEscalation( { userId, userRoles } ) {
	const [ tempRole, setTempRole ] = useState( userRoles[ 0 ].role );
	const [ duration, setDuration ] = useState( 0 );

	const { fetchUser } = useDispatch( coreStore );

	const escalation = useCallback(
		() =>
			apiFetch( {
				method: 'POST',
				path: 'ithemes-security/rpc/privilege/escalate',
				data: {
					id: userId,
					role: tempRole,
					days: duration,
				},
			} )
				.then( () => fetchUser( userId ) ),
		[ userId, tempRole, duration, fetchUser ]
	);

	const {
		status: escalationStatus,
		execute: executeEscalation,
		error: escalationError,
	} = useAsync( escalation, false );

	return (
		<StyledForm>
			<StyledTitle
				variant={ TextVariant.DARK }
				weight={ TextWeight.HEAVY }
				text={ __( 'Set Temporary Role', 'it-l10n-ithemes-security-pro' ) }
			/>
			<StyledDescription
				variant={ TextVariant.MUTED }
				text={ __( 'Set the role which you would like to assign to the user temporarily and for how long you would like it to last.', 'it-l10n-ithemes-security-pro' ) }
			/>
			<StyledRoles>
				<SelectControl
					label={ __( 'Select a role for this user', 'it-l10n-ithemes-security-pro' ) }
					name="itsec_privilege_profile[role]"
					value={ tempRole }
					onChange={ setTempRole }
				>
					{ userRoles.map( ( { role, label } ) =>
						<option value={ role } key={ role }>{ label }</option>
					) }
				</SelectControl>
			</StyledRoles>
			<StyledDays
				label={ __( 'Day(s)', 'it-l10n-ithemes-security-pro' ) }
				id="itsec_privilege_expires"
				type="number"
				min="1"
				value={ duration }
				onChange={ setDuration }
			/>
			<StyledUpdateButton
				onClick={ executeEscalation }
				isBusy={ escalationStatus === 'pending' }
				variant="primary"
				text={ __( 'Update User', 'it-l10n-ithemes-security-pro' ) }
			/>

			{ escalationError && (
				<StyledError text={ escalationError.message } />
			) }
		</StyledForm>
	);
}
