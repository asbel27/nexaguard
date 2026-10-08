/**
 * External dependencies
 */
import { Link } from 'react-router-dom';

/**
 * WordPress dependencies
 */
import { __ } from '@wordpress/i18n';
import { useDispatch, useSelect } from '@wordpress/data';
import { Button } from '@wordpress/components';

/**
 * Internal dependencies
 */
import { OnboardHeader, useNavigateTo } from '@ithemes/security.pages.settings';
import { STORE_NAME } from '@ithemes/security.import-export.data';
import { ResultSummary } from '@ithemes/security-components';
import { withNavigate } from '@ithemes/security-hocs';
import { ExportForm } from '@ithemes/security.import-export.ui';
import { WordPressConnectHeader } from '../../components';
import { useWpConnectAuthGuard } from '../../utils';

export default function WordPressCreate( { baseUrl } ) {
	useWpConnectAuthGuard();
	const navigateTo = useNavigateTo();
	const { sources, isCreating, result } = useSelect(
		( select ) => ( {
			sources: select( STORE_NAME ).getWpConnectSources(),
			isCreating: select( STORE_NAME ).wpConnectIsCreating(),
			result: select( STORE_NAME ).getWpConnectExport(),
		} ),
		[]
	);
	const { wpConnectCreateExport, validateExportData } = useDispatch(
		STORE_NAME
	);
	const createExport = async ( data ) => {
		const createResult = await wpConnectCreateExport( data );
		if ( createResult.isSuccess() ) {
			await validateExportData( createResult.data );
			navigateTo( `${ baseUrl }/summary` );
		}
	};

	return (
		<>
			<OnboardHeader title={ __( 'Create New Export', 'it-l10n-ithemes-security-pro' ) } />
			<ResultSummary result={ result } hasBorder />
			<WordPressConnectHeader isConnected />
			<ExportForm
				sources={ sources }
				isCreating={ isCreating }
				createExport={ createExport }
			>
				<Link
					to={ baseUrl + '/wordpress-select' }
					variant="secondary"
					text={ __( 'Select an existing export', 'it-l10n-ithemes-security-pro' ) }
					component={ withNavigate( Button ) }
				/>
			</ExportForm>
		</>
	);
}
