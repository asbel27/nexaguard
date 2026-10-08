/**
 * WordPress dependencies
 */
import { __ } from '@wordpress/i18n';
import { useCallback } from '@wordpress/element';
import apiFetch from '@wordpress/api-fetch';

/**
 * iThemes dependencies
 */
import { Text, Button, TextWeight, TextVariant } from '@ithemes/ui';

/**
 * Internal dependencies
 */
import { useAsync } from '@ithemes/security-hocs';
import { Result } from '@ithemes/security-utils';
import { getPasswordStrength, getTwoFactor, useNoticeCreator } from './utils';
import { StyledUserInfoTable, StyledTh, StyledTd, StyledLabel, StyledUserActions } from './styles';

function Row( { label, text, children } ) {
	return (
		<tr>
			<StyledTh scope="row">
				<StyledLabel text={ label } variant={ TextVariant.MUTED } weight={ TextWeight.HEAVY } />
			</StyledTh>
			<StyledTd>
				{ text && <Text text={ text } variant={ TextVariant.DARK } weight={ TextWeight.HEAVY } /> }
				{ children }
			</StyledTd>
		</tr>
	);
}

export default function UserInfo( { card, user } ) {
	return (
		<>
			<section>
				<StyledUserInfoTable>
					<tbody>
						<Row label={ __( 'Role', 'it-l10n-ithemes-security-pro' ) } text={ user.role } />
						<Row label={ __( 'Password Strength', 'it-l10n-ithemes-security-pro' ) }>
							<Text weight={ TextWeight.HEAVY } { ...getPasswordStrength( user.password_strength ) } />
						</Row>
						{ user.password_last_changed && (
							<Row label={ __( 'Password Age', 'it-l10n-ithemes-security-pro' ) } text={ user.password_last_changed.diff } />
						) }
						<Row label={ __( 'Two-Factor', 'it-l10n-ithemes-security-pro' ) }>
							<Text weight={ TextWeight.HEAVY } { ...getTwoFactor( user.two_factor ) } />
						</Row>
						{ user.last_active && (
							<Row label={ __( 'Last Seen', 'it-l10n-ithemes-security-pro' ) } text={ user.last_active.diff } />
						) }
					</tbody>
				</StyledUserInfoTable>
			</section>
			<UserActions card={ card } user={ user } />
		</>
	);
}

function UserActions( { card, user } ) {
	return (
		<StyledUserActions as="footer">
			<ForceLogout card={ card } user={ user } />
			<TwoFactorReminder card={ card } user={ user } />
		</StyledUserActions>
	);
}

function TwoFactorReminder( { card, user } ) {
	const link =
		card._links?.[ 'ithemes-security:send-2fa-reminder' ]?.[ 0 ]?.href;

	const { execute, status, value, error } = useAsync(
		useCallback( () =>
			apiFetch( {
				url: link.replace( '{user_id}', user.id ),
				parse: false,
				method: 'POST',
			} )
				.then( Result.fromResponse )
				.catch(
					async ( response ) =>
						throw ( await Result.fromResponse( response ) )
				),
		[ link, user ]
		),
		false
	);
	useNoticeCreator( status, value, error );

	if (
		! link ||
		( user.two_factor !== 'enforced-not-configured' &&
			user.two_factor !== 'not-enabled' )
	) {
		return null;
	}

	return (
		<Button
			variant="primary"
			isBusy={ status === 'pending' }
			onClick={ execute }
		>
			{ __( 'Send Two-Factor Reminder', 'it-l10n-ithemes-security-pro' ) }
		</Button>
	);
}

function ForceLogout( { card, user } ) {
	const link = card._links?.[ 'ithemes-security:logout' ]?.[ 0 ]?.href;

	const { execute, status, value, error } = useAsync(
		useCallback( () =>
			apiFetch( {
				url: link.replace( '{user_id}', user.id ),
				parse: false,
				method: 'POST',
			} )
				.then( Result.fromResponse )
				.catch(
					async ( response ) =>
						throw ( await Result.fromResponse( response ) )
				),
		[ link, user ]
		),
		false
	);
	useNoticeCreator( status, value, error );

	if ( ! link ) {
		return null;
	}

	return (
		<Button
			variant="secondary"
			isBusy={ status === 'pending' }
			onClick={ execute }
		>
			{ __( 'Force Logout', 'it-l10n-ithemes-security-pro' ) }
		</Button>
	);
}
