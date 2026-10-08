/**
 * WordPress dependencies
 */
import { __ } from '@wordpress/i18n';
import { useEffect } from '@wordpress/element';
import { useSelect, useDispatch } from '@wordpress/data';
import { desktop, closeSmall } from '@wordpress/icons';

/**
 * SolidWP dependencies
 */
import { Text, TextWeight } from '@ithemes/ui';

/**
 * Internal dependencies
 */
import { trustedDevicesStore } from '@ithemes/security.packages.data';
import { getSelf } from '@ithemes/security-utils';
import { useLocalStorage } from '@ithemes/security-hocs';
import Device from './components/device';
import TrustedDevicesPagination from './components/pagination';
import TrustedDevicesHeader from './components/header';
import {
	StyledApp,
	StyledHeadingSection,
	StyledHeading,
	StyledSpinner,
	StyledNotice,
	StyledDevices,
	StyledNoDevices,
	StyledDismissButton,
	StyledSaveButton,
} from './styles';
import './styles.scss';

export function isImmutableDevice( device ) {
	return device.status.raw === 'approved' || device.status.raw === 'denied';
}

export default function App( { userId } ) {
	const [ isDismissed, setIsDismissed ] = useLocalStorage( 'itsecNoTrustedDevices' );
	const [ hideImmutableDeviceNotice, setHideImmutableDeviceNotice ] = useLocalStorage( 'itsecImmutableTrustedDeviceNotice' );

	const { query, saveEditedItems } = useDispatch( trustedDevicesStore );
	useEffect( () => {
		query( 'profile', userId, { per_page: 6 } );
	}, [ query, userId ] );

	const { devices, isQuerying, hasChanges, isSaving } = useSelect( ( select ) => ( {
		devices: select( trustedDevicesStore ).getQueryResults( 'profile' ),
		isQuerying: select( trustedDevicesStore ).isQuerying( 'profile' ),
		hasChanges: select( trustedDevicesStore ).getDirtyItems().length > 0,
		isSaving: select( trustedDevicesStore ).isSavingAnyItems(),
	} ), [] );

	const showNotice = devices.find( isImmutableDevice );

	return (
		<StyledApp>
			<StyledHeadingSection>
				<StyledHeading
					level={ 3 }
					weight={ TextWeight.HEAVY }
					text={ __( 'Trusted Devices', 'it-l10n-ithemes-security-pro' ) }
				/>

				{ isQuerying && (
					<Text
						icon={ <StyledSpinner /> }
						iconPosition="right"
						weight={ TextWeight.HEAVY }
						text={ __( 'Fetching devices…', 'it-l10n-ithemes-security-pro' ) }
					/>
				) }
			</StyledHeadingSection>
			<TrustedDevicesHeader userId={ userId } />
			{ devices.length > 0 && (
				<>
					{ ( showNotice && ! hideImmutableDeviceNotice ) &&
						<StyledNotice
							type="warning"
							onDismiss={ () => setHideImmutableDeviceNotice( true ) }
							text={ __( 'Devices set to “Approved” or “Denied” statuses can not be changed or edited', 'it-l10n-ithemes-security-pro' ) }
						/>
					}
					<StyledDevices>

						{ devices.map( ( device, i ) => (
							<Device self={ getSelf( device ) } key={ i } />
						) ) }
					</StyledDevices>
				</>
			) }
			{ ( ! isQuerying && devices.length === 0 && ! isDismissed ) && (
				<StyledNoDevices>
					<Text icon={ desktop } iconPosition="left" text={ __( 'No devices found', 'it-l10n-ithemes-security-pro' ) } />
					<StyledDismissButton icon={ closeSmall } onClick={ () => setIsDismissed( true ) } />
				</StyledNoDevices>
			) }
			<TrustedDevicesPagination />
			<StyledSaveButton
				variant="primary"
				disabled={ ! hasChanges }
				isBusy={ isSaving }
				onClick={ () => {
					saveEditedItems();
				} }
				text={ __( 'Save Changes', 'it-l10n-ithemes-security-pro' ) }
			/>
		</StyledApp>
	);
}
