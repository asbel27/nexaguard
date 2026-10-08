/**
 * WordPress dependencies
 */
import { useDispatch, useSelect } from '@wordpress/data';
import { chevronLeftSmall, chevronRightSmall } from '@wordpress/icons';
import { __ } from '@wordpress/i18n';

/**
 * Solid dependencies
 */
import { Button } from '@ithemes/ui';

/**
 * Internal dependencies
 */
import { trustedDevicesStore } from '@ithemes/security.packages.data';
import { StyledPagination } from './styles';

export default function TrustedDevicesPagination() {
	const { isQuerying, hasPrev, hasNext } = useSelect( ( select ) => ( {
		isQuerying: select( trustedDevicesStore ).isQuerying( 'profile' ),
		hasPrev: select( trustedDevicesStore ).queryHasPrevPage( 'profile' ),
		hasNext: select( trustedDevicesStore ).queryHasNextPage( 'profile' ),
	} ), [] );
	const { fetchQueryPrevPage, fetchQueryNextPage } = useDispatch( trustedDevicesStore );

	const getPrev = () => {
		fetchQueryPrevPage( 'profile', 'replace' );
	};

	const getNext = () => {
		fetchQueryNextPage( 'profile', 'replace' );
	};

	return (
		<StyledPagination>
			<Button
				disabled={ ! hasPrev || isQuerying }
				icon={ chevronLeftSmall }
				iconGap={ 0 }
				variant="tertiary"
				onClick={ getPrev }
				text={ __( 'Prev', 'it-l10n-ithemes-security-pro' ) }
			/>
			<Button
				disabled={ ! hasNext || isQuerying }
				icon={ chevronRightSmall }
				iconPosition="right"
				iconGap={ 0 }
				variant="tertiary"
				onClick={ getNext }
				text={ __( 'Next', 'it-l10n-ithemes-security-pro' ) }
			/>
		</StyledPagination>
	);
}
