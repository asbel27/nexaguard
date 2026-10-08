/**
 * WordPress dependencies
 */
import { __ } from '@wordpress/i18n';
import { useEffect } from '@wordpress/element';
import { useSelect, useDispatch } from '@wordpress/data';

/**
 * SolidWP dependencies
 */
import { Notice, Surface, SurfaceVariant, Text, TextVariant, TextWeight } from '@ithemes/ui';

/**
 * Internal dependencies
 */
import { trustedDevicesStore } from '@ithemes/security.packages.data';
import { StyledHeader, StyledSubheading, StyledEmptyState } from './styles';
import DeviceCard from '../card';

export default function Panel( { userId, viewDeviceDetails } ) {
	const { query } = useDispatch( trustedDevicesStore );
	useEffect( () => {
		query( 'alerts', userId, {
			status: [ 'pending', 'pending-auto-approve' ],
			_fields: [
				'id',
				'status',
				'uses',
				'created_at',
				'last_seen',
				'approved_at',
				'location',
				'ip',
				'browser',
				'browser_version',
				'platform',
				'maps',
				'_links',
			],
		} );
	}, [ query, userId ] );
	const { devices, isQuerying } = useSelect( ( select ) => ( {
		devices: select( trustedDevicesStore ).getQueryResults( 'alerts' ),
		isQuerying: select( trustedDevicesStore ).isQuerying( 'alerts' ),
	}
	), [] );

	return (
		<Surface className="itsec-fingerprinting-alerts-panel" variant={ SurfaceVariant.PRIMARY }>
			<StyledHeader>
				<Text variant={ TextVariant.ACCENT } weight={ TextWeight.HEAVY } text={ __( 'Urgent Login Alert' ) } />
				<StyledSubheading variant={ TextVariant.MUTED } text={ __( 'Important notice(s) about an unrecognized device login', 'it-l10n-ithemes-security-pro' ) } />
			</StyledHeader>

			{ ! isQuerying && devices.length > 0 && (
				devices.map( ( device ) => (
					<DeviceCard key={ device.id } device={ device } viewDeviceDetails={ viewDeviceDetails } />
				) )
			) }

			{ ! isQuerying && devices.length === 0 && (
				<StyledEmptyState>
					<Notice text={ __( 'Keep up the good work! There are no unrecognized logins at this time.', 'it-l10n-ithemes-security-pro' ) } />
				</StyledEmptyState>
			) }
		</Surface>
	);
}
