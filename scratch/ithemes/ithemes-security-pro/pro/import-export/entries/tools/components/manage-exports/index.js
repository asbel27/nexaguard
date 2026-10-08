/**
 * External dependencies
 */
import { kebabCase, omit } from 'lodash';
import { saveAs } from 'file-saver';
import { Link } from 'react-router-dom';

/**
 * WordPress dependencies
 */
import { __ } from '@wordpress/i18n';
import { gmdate } from '@wordpress/date';
import { useSelect, useDispatch } from '@wordpress/data';
import { useState } from '@wordpress/element';
import { download, trash, upload } from '@wordpress/icons';

/**
 * SolidWP dependencies
 */
import {
	Button,
	TextSize,
	TextVariant,
} from '@ithemes/ui';
import { FlexSpacer } from '@ithemes/security-ui';
import { useSet, withNavigate } from '@ithemes/security-hocs';
import { useGlobalNavigationUrl } from '@ithemes/security-utils';
import { STORE_NAME } from '@ithemes/security.import-export.data';

/**
 * Internal dependencies
 */
import { ExportsList } from '@ithemes/security.import-export.ui';
import {
	StyledSectionHeading,
	StyledCard,
	StyledCardHeader,
	StyledButtonsContainer,
	StyledCardBody,
} from './styles';

const waitFor = ( ms ) => new Promise( ( res ) => setTimeout( res, ms ) );

export default function ManageExports() {
	const [ isDeleting, setIsDeleting ] = useState( false );
	const [ isDownloading, setIsDownloading ] = useState( false );
	const [ selected, addSelected, removeSelected, setSelected ] = useSet();
	const { exports, sources, isLoading } = useSelect(
		( select ) => ( {
			exports: select( STORE_NAME ).getExports(),
			sources: select( STORE_NAME ).getSources(),
			isLoading: ! select( STORE_NAME ).hasFinishedResolution( 'getExports' ),
		} ),
		[]
	);
	const { deleteExports } = useDispatch( STORE_NAME );
	const importUrl = useGlobalNavigationUrl( 'settings', '/import' );

	const onDelete = async () => {
		setIsDeleting( true );
		await deleteExports( selected );
		setIsDeleting( false );
		setSelected( [] );
	};

	const onDownload = async () => {
		setIsDownloading( true );
		for ( const item of exports ) {
			if ( selected.includes( item.id ) ) {
				const blob = new window.Blob(
					[ JSON.stringify( omit( item, [ '_links' ] ) ) ],
					{
						type: 'text/plain;charset=utf-8',
					}
				);
				const name = item.metadata.title
					? kebabCase( item.metadata.title )
					: gmdate( 'y-m-d', item.metadata.exported_at );
				saveAs( blob, `itsec-export-${ name }.json` );
				await waitFor( 1000 );
			}
		}
		setIsDownloading( false );
	};

	return (
		<>
			<StyledSectionHeading
				level={ 2 }
				size={ TextSize.LARGE }
				variant={ TextVariant.DARK }
				weight={ 600 }
				text={ __( 'Import and Export', 'it-l10n-ithemes-security-pro' ) }
			/>
			<StyledCard>
				<StyledCardHeader size="extraSmall" isBorderless>
					<StyledButtonsContainer>
						<Button
							icon={ download }
							variant="tertiary"
							text={ __( 'Download', 'it-l10n-ithemes-security-pro' ) }
							disabled={ selected.length === 0 || isDownloading }
							isBusy={ isDownloading }
							onClick={ onDownload }
						/>
						<Button
							icon={ trash }
							variant="tertiary"
							text={ __( 'Delete', 'it-l10n-ithemes-security-pro' ) }
							disabled={ selected.length === 0 || isDeleting }
							isBusy={ isDeleting }
							onClick={ onDelete }
						/>
					</StyledButtonsContainer>

					<FlexSpacer />

					<StyledButtonsContainer>
						<Button
							href={ importUrl }
							icon={ upload }
							variant="tertiary"
							text={ __( 'Import', 'it-l10n-ithemes-security-pro' ) }
						/>
						<Link
							to={ '/export' }
							component={ withNavigate( Button ) }
							variant="secondary"
						>
							{ __( 'Create New Export', 'it-l10n-ithemes-security-pro' ) }
						</Link>
					</StyledButtonsContainer>
				</StyledCardHeader>
				<StyledCardBody>
					<ExportsList
						exports={ exports }
						sources={ sources }
						selected={ selected }
						addSelected={ addSelected }
						removeSelected={ removeSelected }
						setSelected={ setSelected }
						isLoading={ isLoading }
					/>
				</StyledCardBody>
			</StyledCard>
		</>
	);
}
