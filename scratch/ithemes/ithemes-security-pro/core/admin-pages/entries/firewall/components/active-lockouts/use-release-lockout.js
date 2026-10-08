/**
 * WordPress dependencies
 */
import { useCallback, useState } from '@wordpress/element';
import { useDispatch } from '@wordpress/data';
import apiFetch from '@wordpress/api-fetch';
import { __, sprintf } from '@wordpress/i18n';

export default function useReleaseLockoutFirewallPage( selectedId ) {
	const [ releasingIds, setReleasingIds ] = useState( [] );
	const { createNotice, removeNotice } = useDispatch( 'core/notices' );

	const callback = useCallback( async () => {
		const releaseUrl = '/ithemes-security/v1/lockouts/' + selectedId + '/release-lockout';
		const noticeId = `release-lockout-${ selectedId }`;

		setReleasingIds( ( ids ) => [ ...ids, selectedId ] );
		removeNotice( noticeId, 'ithemes-security' );

		try {
			await apiFetch( {
				path: releaseUrl,
				method: 'POST',
			} );
			setTimeout( () => removeNotice( noticeId, 'ithemes-security' ), 5000 );
			createNotice(
				'success',
				__( 'Lockout Released', 'it-l10n-ithemes-security-pro' ),
				{ id: noticeId, context: 'ithemes-security' }
			);

			return true;
		} catch ( e ) {
			createNotice(
				'error',
				sprintf(
					/* translators: 1. Error message */
					__( 'Error when releasing lockout: %s', 'it-l10n-ithemes-security-pro' ),
					e.message || __( 'An unexpected error occurred.', 'it-l10n-ithemes-security-pro' )
				),
				{ id: noticeId, context: 'ithemes-security' }
			);

			return false;
		} finally {
			setReleasingIds( ( ids ) => ids.filter( ( id ) => id !== selectedId ) );
		}
	}, [ createNotice, removeNotice, selectedId ] );

	return [ releasingIds, callback ];
}
