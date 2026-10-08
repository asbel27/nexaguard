/**
 * External dependencies
 */
import { addDays, subDays } from 'date-fns';

/**
 * WordPress dependencies
 */
import { __ } from '@wordpress/i18n';
import { format } from '@wordpress/date';
import { useState } from '@wordpress/element';
import { useDispatch, useSelect } from '@wordpress/data';

/**
 * SolidWP dependencies
 */
import { Button, SearchControl } from '@ithemes/ui';

/**
 * Internal dependencies
 */
import { trustedDevicesStore } from '@ithemes/security.packages.data';
import { DateRangeControl } from '@ithemes/security-ui';
import { StyledDivider, StyledHeader } from './styles';
import '../../styles.scss';

function updateDateRange( newPeriod ) {
	const getPeriod = ( period ) => {
		switch ( period ) {
			case '24-hours':
				return 1;
			case 'week':
				return 7;
			case '30-days':
				return 30;
			default:
		}
	};

	let startDate, endDate;
	if ( typeof newPeriod === 'string' ) {
		startDate = subDays( new Date(), getPeriod( newPeriod ) ).setHours( 0, 0, 0 );
		endDate = addDays( startDate, getPeriod( newPeriod ) ).setHours( 23, 59, 59 );
	} else {
		startDate = newPeriod.start;
		endDate = newPeriod.end;
	}
	const lastSeenBefore = format( 'Y-m-d\\TH:i:s', endDate );
	const lastSeenAfter = format( 'Y-m-d\\TH:i:s', startDate );
	return { lastSeenBefore, lastSeenAfter };
}

export default function TrustedDevicesHeader( { userId } ) {
	const { isQuerying } = useSelect(
		( select ) => ( {
			isQuerying: select( trustedDevicesStore ).isQuerying( 'profile' ),
		} ), [] );
	const { query } = useDispatch( trustedDevicesStore );

	const [ search, setSearch ] = useState( '' );

	const onSearch = () => {
		query( 'profile', userId, { search } );
	};

	const onSubmit = ( e ) => {
		e.preventDefault();
		onSearch();
	};

	const [ period, setPeriod ] = useState( undefined );
	const onPeriodChange = ( newPeriod ) => {
		setPeriod( newPeriod );

		const { lastSeenBefore, lastSeenAfter } = updateDateRange( newPeriod );

		query( 'profile', userId, { per_page: 6, last_seen_before: lastSeenBefore, last_seen_after: lastSeenAfter } );
	};
	const onPeriodReset = () => {
		setPeriod( undefined );
		query( 'profile', userId, { per_page: 6 } );
	};

	return (
		<StyledHeader>
			<form onSubmit={ onSubmit }>
				<SearchControl
					label={ __( 'Search trusted devices', 'it-l10n-ithemes-security-pro' ) }
					value={ search }
					onChange={ setSearch }
					isSearching={ isQuerying }
					placeholder={ __( 'Search by IP address', 'it-l10n-ithemes-security-pro' ) }
					onSubmit={ onSearch }
				/>
			</form>
			<StyledDivider>&#124;</StyledDivider>
			<DateRangeControl className="itsec-apply-css-vars" value={ period } onChange={ onPeriodChange } />
			<Button
				variant="link"
				text={ __( 'Clear dates', 'it-l10n-ithemes-security-pro' ) }
				onClick={ onPeriodReset }
				disabled={ period === undefined }
			/>
		</StyledHeader>
	);
}
