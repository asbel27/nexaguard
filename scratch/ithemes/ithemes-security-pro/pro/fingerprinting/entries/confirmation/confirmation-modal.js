/**
 * WordPress dependencies
 */
import { __ } from '@wordpress/i18n';
import { useState, useCallback, useEffect } from '@wordpress/element';
import apiFetch from '@wordpress/api-fetch';

/**
 * SolidWP dependencies
 */
import { solidTheme, Root } from '@ithemes/ui';

/**
 * Internal dependencies
 */
import EmailConfirmation from './components/email-confirm';
import { PageControl } from '@ithemes/security-ui';
import { useAsync, useLocalStorage } from '@ithemes/security-hocs';
import { StyledConfirmationModal } from './styles';
import NewDevice from './components/new-device';

export default function ConfirmationModal( { canManage, device, userId, isFront } ) {
	const [ isDismissed, setIsDismissed ] = useLocalStorage( `solidDeviceDismissed${ device.id }` );
	const [ currentPage, setCurrentPage ] = useState( 0 );

	const hasGeolocation = device.location;
	const displayMap = device.maps;

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
		<Root theme={ solidTheme }>
			{ ! isDismissed && (
				<StyledConfirmationModal
					title={ __( 'Trusted devices confirmation' ) }
					onRequestClose={ () => {} }
					isDismissable={ false }
					__experimentalHideHeader
				>
					{ currentPage === 0 && (
						<NewDevice
							canManage={ canManage }
							device={ device }
							hasGeolocation={ hasGeolocation }
							hasMap={ displayMap }
							isFront={ isFront }
							next={ next }
							onDismiss={ setIsDismissed }
							sendEmail={ execute }
						/>
					) }
					{ currentPage === 1 && (
						<EmailConfirmation
							isFront={ isFront }
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
		</Root>
	);
}

