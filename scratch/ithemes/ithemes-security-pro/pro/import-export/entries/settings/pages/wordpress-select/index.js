/**
 * External dependencies
 */
import { Link } from 'react-router-dom';
import { find } from 'lodash';

/**
 * WordPress dependencies
 */
import { useDispatch, useSelect } from '@wordpress/data';
import { useState } from '@wordpress/element';
import { Button, Flex } from '@wordpress/components';
import { __ } from '@wordpress/i18n';

/**
 * Internal dependencies
 */
import { OnboardHeader, useNavigateTo } from '@ithemes/security.pages.settings';
import { FlexSpacer } from '@ithemes/security-ui';
import { withNavigate } from '@ithemes/security-hocs';
import { STORE_NAME } from '@ithemes/security.import-export.data';
import { WordPressConnectHeader } from '../../components';
import { useWpConnectAuthGuard } from '../../utils';
import { StyledExportsList } from './styles';

export default function WordPressSelect( { baseUrl } ) {
	useWpConnectAuthGuard( { allowLax: true } );
	const navigateTo = useNavigateTo();
	const { exports, sources, isLoading } = useSelect(
		( select ) => ( {
			exports: select( STORE_NAME ).getWpConnectExports(),
			sources: select( STORE_NAME ).getWpConnectSources(),
			isLoading:
				! select( STORE_NAME ).hasFinishedResolution(
					'getWpConnectExports'
				) ||
				! select( STORE_NAME ).hasFinishedResolution(
					'getWpConnectSources'
				),
		} ),
		[]
	);
	const { validateExportData } = useDispatch( STORE_NAME );
	const [ selected, setSelected ] = useState( [] );
	const onSelect = async ( e ) => {
		e.preventDefault();
		const selectedExport = find( exports, { id: selected[ 0 ] } );
		if ( selectedExport ) {
			await validateExportData( selectedExport );
			navigateTo( `${ baseUrl }/summary` );
		}
	};

	return (
		<>
			<OnboardHeader
				title={ __( 'Pick from WordPress', 'it-l10n-ithemes-security-pro' ) }
				description={ __(
					'Select an existing Solid Security export or create a new one.',
					'it-l10n-ithemes-security-pro'
				) }
			/>
			<Flex onSubmit={ onSelect } as="form" direction="column" justify="left" gap={ 8 }>
				<WordPressConnectHeader isConnected />
				<StyledExportsList
					exports={ exports }
					sources={ sources }
					singleSelection
					selected={ selected }
					setSelected={ setSelected }
					isLoading={ isLoading }
				/>
				<Flex>
					<FlexSpacer />
					<Link
						to={ `${ baseUrl }/wordpress-create` }
						component={ withNavigate( Button ) }
						disabled={ selected.length > 0 }
						text={ __( 'Create Export', 'it-l10n-ithemes-security-pro' ) }
						variant="secondary"
					/>
					<Button
						disabled={ selected.length === 0 }
						text={ __( 'Select Export', 'it-l10n-ithemes-security-pro' ) }
						variant="primary"
						type="submit"
					/>
				</Flex>
			</Flex>
		</>
	);
}
