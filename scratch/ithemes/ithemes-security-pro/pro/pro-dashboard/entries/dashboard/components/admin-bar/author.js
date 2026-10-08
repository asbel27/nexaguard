/**
 * External dependencies
 */
import { get } from 'lodash';

/**
 * WordPress dependencies
 */
import { useSelect } from '@wordpress/data';
import { Tooltip } from '@wordpress/components';

/**
 * Internal dependencies
 */
import { getAvatarUrl } from '@ithemes/security.dashboard.dashboard';
import Recipient from './recipient';

export default function Author( { dashboardId } ) {
	const { dashboard } = useSelect(
		( select ) => ( {
			dashboard: select(
				'ithemes-security/dashboard'
			).getDashboardForEdit( dashboardId ),
		} ),
		[ dashboardId ]
	);
	const author = get( dashboard, [ '_embedded', 'author', 0 ] );

	if ( ! author ) {
		return null;
	}

	return (
		<Tooltip text={ author.name }>
			<Recipient avatar={ getAvatarUrl( author ) } />
		</Tooltip>
	);
}
