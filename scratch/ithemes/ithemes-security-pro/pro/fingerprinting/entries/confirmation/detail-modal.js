/**
 * External dependencies
 */
import { ThemeProvider } from '@emotion/react';

/**
 * WordPress dependencies
 */
import { __ } from '@wordpress/i18n';
import { useState, useCallback, useEffect } from '@wordpress/element';
import apiFetch from '@wordpress/api-fetch';

/**
 * SolidWP dependencies
 */
import { solidTheme } from '@ithemes/ui';

/**
 * Internal dependencies
 */
import EmailConfirmation from './components/email-confirm';
import UnrecognizedDevice from './components/unrecognized-mode';
import { PageControl } from '@ithemes/security-ui';
import { useAsync } from '@ithemes/security-hocs';
import { StyledConfirmationModal } from './styles';
import './style.scss';

export default function DetailModal( { canManage, userId } ) {
	const [ isDismissed, setIsDismissed ] = useState( false );
	const [ currentPage, setCurrentPage ] = useState( 0 );

	const next = useCallback( ( ) => {
		setCurrentPage( 1 );
	}, [] );

	const previous = useCallback( ( ) => {
		setCurrentPage( 0 );
	}, [] );

	const sendEmail = useCallback(
		() =>
			apiFetch( {
				method: 'POST',
				path: `/ithemes-security/v1/trusted-devices/${ userId }/current/notify`,
			} ),
		[ userId ]
	);
	const { status, execute, error } = useAsync( sendEmail, false );

	useEffect( () => {
		if ( status === 'success' || status === 'error' ) {
			next();
		}
	}, [ status, next, error ] );

	return (
		<ThemeProvider theme={ solidTheme }>
			{ ! isDismissed && (
				<StyledConfirmationModal
					title={ __( 'Trusted devices confirmation' ) }
					onRequestClose={ () => {} }
					isDismissable={ false }
					__experimentalHideHeader
				>
					{ currentPage === 0 && (
						<UnrecognizedDevice
							canManage={ canManage }
							onDismiss={ setIsDismissed }
							sendEmail={ execute }
							next={ next }
						/>
					) }
					{ currentPage === 1 && (
						<EmailConfirmation
							onDismiss={ setIsDismissed }
							previous={ previous }
							error={ error }
						/>
					) }

					<PageControl
						currentPage={ currentPage }
						numberOfPages={ 2 }
						setCurrentPage={ setCurrentPage }
						allowNavigation={ false }
					/>
				</StyledConfirmationModal>
			) }

		</ThemeProvider>
	);
}
