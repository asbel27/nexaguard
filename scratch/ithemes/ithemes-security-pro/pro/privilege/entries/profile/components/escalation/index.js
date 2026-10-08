/**
 * WordPress dependencies
 */
import { __, sprintf } from '@wordpress/i18n';
import { createInterpolateElement, useCallback } from '@wordpress/element';
import apiFetch from '@wordpress/api-fetch';
import { dateI18n } from '@wordpress/date';
import { useDispatch } from '@wordpress/data';

/**
 * SolidWP dependencies
 */
import { Text, TextVariant, TextWeight } from '@ithemes/ui';

/**
 * Internal dependencies
 */
import { useAsync } from '@ithemes/security-hocs';
import { coreStore } from '@ithemes/security.packages.data';
import {
	StyledEscalation,
	StyledEscalationText,
	StyledTitle,
	StyledClearButton,
	StyledError,
} from './styles';

export default function Escalation( {
	userId,
	isEscalated,
	tempRoleExpiration,
	maxPermission,
} ) {
	const { fetchUser } = useDispatch( coreStore );

	const clearEscalation = useCallback(
		() =>
			apiFetch( {
				method: 'POST',
				path: 'ithemes-security/rpc/privilege/clear',
				data: {
					id: userId,
				},
			} )
				.then( () => fetchUser( userId ) ),
		[ userId, fetchUser ]
	);

	const { status, execute, error } = useAsync( clearEscalation, false );

	return (
		<StyledEscalation>
			<StyledTitle
				variant={ TextVariant.DARK }
				weight={ TextWeight.HEAVY }
				text={ __( 'Set Temporary Role', 'it-l10n-ithemes-security-pro' ) }
			/>
			{ maxPermission && ! isEscalated && (
				<Text text={ __( 'This user has already been permanently upgraded to the maximum level. No further action can be taken.', 'it-l10n-ithemes-security-pro' ) } />
			) }
			{ isEscalated && (
				<>
					<StyledEscalationText as="p">{
						createInterpolateElement( sprintf(
						/* translators: 1. Temporary user role. 2. Role expiration. */
							__( 'The user has already been temporarily upgraded to the role of <b>%1$s</b>. This upgrade expires at <b>%2$s</b>.', 'it-l10n-ithemes-security-pro' ),
							isEscalated,
							dateI18n( 'M d, Y g:i A', tempRoleExpiration )
						), {
							b: <strong></strong>,
						} ) }
					</StyledEscalationText>
					{ error && (
						<StyledError text={ error.message } />
					) }
					<StyledClearButton
						onClick={ execute }
						isBusy={ status === 'pending' }
						variant="primary"
						text={ __( 'Click to Clear User Privilege' ) }
					/>
				</>
			) }

		</StyledEscalation>
	);
}
