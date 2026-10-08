/**
 * WordPress dependencies
 */
import { useDispatch, useSelect } from '@wordpress/data';
import { __ } from '@wordpress/i18n';
import { useEffect, useState } from '@wordpress/element';
import { Flex } from '@wordpress/components';

/**
 * Internal dependencies
 */
import { STORE_NAME } from '@ithemes/security.import-export.data';
import { OnboardHeader, useNavigation } from '@ithemes/security.pages.settings';
import { CheckboxGroupControl } from '@ithemes/security-components';
import { ResultSummary } from '@ithemes/security-ui';
import {
	RoleMapping,
	UserMapping,
} from '../../components';
import { StyledNext } from './styles';

export default function ImportSummary() {
	const { goNext } = useNavigation();
	const { result, data, sources, selectedSources } = useSelect(
		( select ) => ( {
			result: select( STORE_NAME ).getImportExportValidationResult(),
			data: select( STORE_NAME ).getImportExportData(),
			sources: select( STORE_NAME ).getSources(),
			selectedSources: select( STORE_NAME ).getImportSources(),
		} ),
		[]
	);
	const {
		applyExportData,
		editImportSources: setSelectedSources,
	} = useDispatch( STORE_NAME );
	useEffect( () => {
		setSelectedSources( Object.keys( data?.sources || {} ) );
	}, [ data, setSelectedSources ] );
	const sourceOptions = sources
		.filter( ( source ) => data?.sources[ source.slug ] )
		.map( ( source ) => ( {
			value: source.slug,
			label: source.title,
			help: source.description,
		} ) );
	const [ isApplying, setIsApplying ] = useState( false );
	const onContinue = async () => {
		setIsApplying( true );
		await applyExportData();
		setIsApplying( false );
		goNext();
	};

	return (
		<>
			<OnboardHeader
				title={ __( 'Export Data', 'it-l10n-ithemes-security-pro' ) }
				description={ __(
					'Choose what Solid Security info you’d like to import.',
					'it-l10n-ithemes-security-pro'
				) }
			/>
			<Flex direction="column" justify="left" gap={ 6 } expanded={ false }>
				<ResultSummary result={ result } />
				{ data && (
					<>
						<CheckboxGroupControl
							hideLabelFromVision
							label={ __( 'Export Data', 'it-l10n-ithemes-security-pro' ) }
							value={ selectedSources }
							onChange={ setSelectedSources }
							options={ sourceOptions }
							style="chicklet"
						/>
						{ selectedSources.length > 0 && (
							<>
								<UserMapping />
								<RoleMapping />
							</>
						) }
					</>
				) }
				<StyledNext
					onClick={ onContinue }
					variant="primary"
					isBusy={ isApplying }
					disabled={ isApplying || ! selectedSources.length }
					text={ __( 'Next', 'it-l10n-ithemes-security-pro' ) }
				/>
			</Flex>
		</>
	);
}
