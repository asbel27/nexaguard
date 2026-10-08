/**
 * External dependencies
 */
import { uniqueId, isArray } from 'lodash';

/**
 * WordPress dependencies
 */
import { __, _x } from '@wordpress/i18n';
import { useDispatch } from '@wordpress/data';
import { useCallback, useEffect } from '@wordpress/element';
import apiFetch from '@wordpress/api-fetch';

/**
 * Internal dependencies
 */
import { Result, transformApiErrorToList } from '@ithemes/security-utils';
import { useAsync } from '@ithemes/security-hocs';

export function getTwoFactor( twoFactor ) {
	switch ( twoFactor ) {
		case 'enabled':
			return { indicator: '#00BA37', text: __( 'Enabled', 'it-l10n-ithemes-security-pro' ) };
		case 'not-enabled':
			return { indicator: '#D63638', text: __( 'Disabled', 'it-l10n-ithemes-security-pro' ) };
		case 'not-available':
			return { indicator: '#D63638', text: __( 'Inactive', 'it-l10n-ithemes-security-pro' ) };
		case 'enforced-not-configured':
			return { indicator: '#FFC518', text: __( 'Enforced', 'it-l10n-ithemes-security-pro' ) };
		default:
			return { indicator: '#FFC518', text: twoFactor };
	}
}

export function getPasswordStrength( strength ) {
	switch ( strength ) {
		case 0:
		case 1:
			return { indicator: '#D63638', text: _x( 'Very Weak', 'password strength', 'it-l10n-ithemes-security-pro' ) };
		case 2:
			return { indicator: '#FF8528', text: _x( 'Weak', 'password strength', 'it-l10n-ithemes-security-pro' ) };
		case 3:
			return { indicator: '#FFC518', text: _x( 'Medium', 'password strength', 'it-l10n-ithemes-security-pro' ) };
		case 4:
			return { indicator: '#00BA37', text: _x( 'Strong', 'password strength', 'it-l10n-ithemes-security-pro' ) };
		default:
			return { indicator: '#545454', text: _x( 'Unknown', 'password strength', 'it-l10n-ithemes-security-pro' ) };
	}
}

export function useCardLink( link, onComplete, immediate = true ) {
	const { execute, status, value, error } = useAsync(
		useCallback(
			( data ) =>
				apiFetch( {
					url: link?.href,
					method: isArray( link?.methods )
						? link?.methods[ 0 ]
						: link?.methods,
					parse: false,
					data,
				} )
					.then( ( response ) => {
						onComplete?.( response );

						return Result.fromResponse( response );
					} )
					.catch(
						async ( response ) =>
							throw ( await Result.fromResponse( response ) )
					),
			[ link, onComplete ]
		),
		immediate
	);
	useNoticeCreator( status, value, error );

	return { execute, status, value, error };
}

/**
 * Creates notices from the async response.
 *
 * @param {string} status
 * @param {Result} value
 * @param {Result} error
 */
export function useNoticeCreator( status, value, error ) {
	const { createNotice, removeNotice } = useDispatch( 'core/notices' );

	useEffect( () => {
		const autoDismiss = ( type, message ) => {
			const id = uniqueId( 'security-profile-action' );
			createNotice( type, message, { context: 'ithemes-security', id } );
			setTimeout( () => removeNotice( id, 'ithemes-security' ), 5000 );
		};

		if ( status === 'error' ) {
			const message = transformApiErrorToList( error.error ).join( ' ' );
			createNotice(
				'error',
				message || __( 'An unknown error occurred.', 'it-l10n-ithemes-security-pro' ),
				{ context: 'ithemes-security' }
			);
		} else if ( status === 'success' ) {
			if ( value.success.length > 0 ) {
				autoDismiss( 'success', value.success.join( ' ' ) );
			}

			if ( value.info.length > 0 ) {
				autoDismiss( 'info', value.info.join( ' ' ) );
			}

			if ( value.warning.length > 0 ) {
				autoDismiss( 'warning', value.warning.join( ' ' ) );
			}
		}
	}, [ status, value, error, createNotice, removeNotice ] );
}
