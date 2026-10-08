/**
 * External dependencies
 */
import { Link, useRouteMatch } from 'react-router-dom';

/**
 * WordPress dependencies
 */
import { __ } from '@wordpress/i18n';
import { FormFileUpload } from '@wordpress/components';
import { useDispatch } from '@wordpress/data';
import { useEffect } from '@wordpress/element';
import { arrowLeft as backIcon, upload as uploadIcon, wordpress as wordpressIcon } from '@wordpress/icons';

/**
 * Solid dependencies
 */
import { Button } from '@ithemes/ui';

/**
 * Internal dependencies
 */
import { withNavigate } from '@ithemes/security-hocs';
import { useGlobalNavigationUrl } from '@ithemes/security-utils';
import {
	OnboardBackActionFill,
	OnboardHeader,
	SelectableCard,
	useConfigContext,
	useNavigateTo,
} from '@ithemes/security.pages.settings';
import { STORE_NAME } from '@ithemes/security.import-export.data';
import { StyledDropZone, StyledExportChoices } from './styles';

export default function SelectImport( { baseUrl } ) {
	const navigateTo = useNavigateTo();
	const { url } = useRouteMatch();
	const { onboardComplete } = useConfigContext();
	const toolsUrl = useGlobalNavigationUrl( 'tools' );
	const { validateExportFile, resetImport } = useDispatch( STORE_NAME );

	const onReceiveFiles = async ( fileList ) => {
		if ( fileList.length ) {
			await validateExportFile( fileList[ 0 ] );
			navigateTo( `${ baseUrl }/summary` );
		}
	};
	useEffect( () => {
		resetImport();
	}, [ resetImport ] );

	const backProps = {
		text: __( 'Back', 'it-l10n-ithemes-security-pro' ),
		icon: backIcon,
		iconPosition: 'left',
		variant: 'tertiary',
	};

	return (
		<>
			<OnboardBackActionFill>
				{ onboardComplete && <Button href={ toolsUrl } { ...backProps } /> }
				{ ! onboardComplete && (
					<Link
						to="/onboard"
						component={ withNavigate( Button ) }
						{ ...backProps }
					/>
				) }
			</OnboardBackActionFill>
			<OnboardHeader
				title={ __( 'Select Export', 'it-l10n-ithemes-security-pro' ) }
				description={ __(
					'Either upload an export file or enter the URL of a website running Solid Security.',
					'it-l10n-ithemes-security-pro'
				) }
			/>
			<StyledExportChoices>
				<FormFileUpload
					onChange={ ( e ) => onReceiveFiles( e.target.files ) }
					accept="text/plain,application/json,application/zip"
					render={ ( { openFileDialog } ) => (
						<SelectableCard
							title={ __( 'Upload File', 'it-l10n-ithemes-security-pro' ) }
							description={ __(
								'Upload a Solid Security export file from your computer.',
								'it-l10n-ithemes-security-pro'
							) }
							icon={ uploadIcon }
							direction="vertical"
							onClick={ openFileDialog }
						/>
					) }
				/>
				<SelectableCard
					title={ __( 'WordPress Site', 'it-l10n-ithemes-security-pro' ) }
					description={ __(
						'Import from a WordPress site running Solid Security.',
						'it-l10n-ithemes-security-pro'
					) }
					icon={ wordpressIcon }
					direction="vertical"
					onClick={ () => navigateTo( `${ url }/wordpress-connect` ) }
				/>
			</StyledExportChoices>
			<StyledDropZone onFilesDrop={ onReceiveFiles } />
		</>
	);
}
