/**
 * WordPress dependencies
 */
import { createPortal, useState } from '@wordpress/element';
import { useDispatch, useSelect } from '@wordpress/data';
import { __ } from '@wordpress/i18n';
import { store as noticesStore } from '@wordpress/notices';
import { Button, Popover, Icon } from '@wordpress/components';

/**
 * SolidWP dependencies
 */
import { Root, solidTheme } from '@ithemes/ui';

/**
 * Internal dependencies
 */
import { trustedDevicesStore } from '@ithemes/security.packages.data';
import Panel from '../panel';
import DeviceModal from '../device-modal';
import { StyledSnackbarList, StyledToolbarText } from './styles';
import noticeIcon from './icon';

export default function Toolbar( { noticesEl, userId, blockedUrl, usesRestrict, showNotice } ) {
	const [ isToggled, setIsToggled ] = useState( false );
	const [ deviceDetails, setDeviceDetails ] = useState( null );
	const { createNotice } = useDispatch( noticesStore );
	const { saveItem, refreshQuery } = useDispatch( trustedDevicesStore );

	const { snackbarNotices } = useSelect( ( select ) => ( {
		snackbarNotices: select( noticesStore ).getNotices( 'ithemes-security-device-alerts' ),
	} ), [] );

	const viewDeviceDetails = ( device ) => {
		setDeviceDetails( device );
		setIsToggled( false );
	};

	const updateDeviceDetails = ( device, newStatus ) => {
		saveItem( {
			...device,
			status: {
				raw: newStatus,
			},
		} );

		if ( newStatus === 'ignored' ) {
			createNotice(
				'success',
				__( 'Device ignored', 'it-l10n-ithemes-security-pro' ),
				{
					type: 'snackbar',
					context: 'ithemes-security-device-alerts',
				}
			);
		}
		if ( newStatus === 'approved' ) {
			createNotice(
				'success',
				__( 'Device approved', 'it-l10n-ithemes-security-pro' ),
				{
					type: 'snackbar',
					context: 'ithemes-security-device-alerts',
				}
			);
		}
		if ( newStatus === 'denied' ) {
			window.location = blockedUrl;
		}

		setDeviceDetails( null );
		setIsToggled( false );
		refreshQuery( 'alerts' );
	};

	const { removeNotice } = useDispatch( noticesStore );

	return (
		<Root theme={ solidTheme }>
			<Button
				className="ab-item ab-empty-item"
				onClick={ () => setIsToggled( ! isToggled ) }
				aria-expanded={ isToggled }
			>
				<StyledToolbarText>
					{ __( 'Login Alerts', 'it-l10n-ithemes-security-pro' ) }
					{ showNotice && (
						<Icon icon={ noticeIcon } />
					) }
				</StyledToolbarText>
			</Button>
			{ isToggled && (
				<Popover
					noArrow
					expandOnMobile
					focusOnMount="container"
					position="bottom center"
					headerTitle={ __( 'Login Alerts', 'it-l10n-ithemes-security-pro' ) }
					onClose={ () => setIsToggled( false ) }
					onFocusOutside={ () => setIsToggled( false ) }
				>
					<Panel
						onClose={ () => setIsToggled( false ) }
						viewDeviceDetails={ viewDeviceDetails }
						userId={ userId }
					/>
				</Popover>
			) }

			{ deviceDetails && (
				<DeviceModal
					device={ deviceDetails }
					onClose={ () => setDeviceDetails( null ) }
					updateDevice={ updateDeviceDetails }
					usesRestrict={ usesRestrict }
				/>
			) }

			{ createPortal(
				<StyledSnackbarList
					notices={ snackbarNotices }
					onRemove={ ( id ) => ( removeNotice( id, 'ithemes-security' ) ) }
				/>, noticesEl ) }
		</Root>
	);
}
