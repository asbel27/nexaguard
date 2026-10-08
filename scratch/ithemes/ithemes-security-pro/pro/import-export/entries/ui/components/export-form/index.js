/**
 * External dependencies
 */
import classnames from 'classnames';
import { map } from 'lodash';

/**
 * WordPress dependencies
 */
import { __, sprintf } from '@wordpress/i18n';
import {
	CardBody,
	CardHeader,
	CheckboxControl,
	Flex,
	TextControl,
	Tooltip,
} from '@wordpress/components';
import { chevronDown, chevronUp, help } from '@wordpress/icons';
import { useEffect, useState } from '@wordpress/element';

/**
 * SolidWP dependencies
 */
import {
	Button,
	Text,
	TextSize,
	TextVariant,
} from '@ithemes/ui';
import { useSet } from '@ithemes/security-hocs';

/**
 * Internal dependencies
 */
import {
	StyledSectionHeading,
	StyledCardContainer,
	StyledFormCardBody,
	StyledFormCardHeader,
	StyledSourceCard,
	StyledCheckboxControl,
	StyledToolTipIcon,
	StyledSourceDescription,
	StyledSourceForm,
} from './styles';

export default function ExportForm( {
	sources,
	isCreating,
	createExport,
	titleRequired,
	children,
} ) {
	const [ title, setTitle ] = useState( '' );
	const [ options, setOptions ] = useState( {} );
	const [
		includedSources,
		addSource,
		removeSource,
		setIncludedSources,
	] = useSet( map( sources, 'slug' ) );
	useEffect( () => setIncludedSources(
		map( sources, 'slug' ) ),
	[ sources, setIncludedSources ]
	);

	const onSubmit = ( e ) => {
		e.preventDefault();
		createExport( {
			title,
			sources: includedSources,
			options,
		} );
	};

	return (
		<>
			<StyledSectionHeading
				level={ 2 }
				size={ TextSize.LARGE }
				variant={ TextVariant.DARK }
				weight={ 600 }
				text={ __( 'Create an export', 'it-l10n-ithemes-security-pro' ) }
			/>
			<form onSubmit={ onSubmit }>
				<StyledCardContainer>
					<StyledFormCardHeader>
						<TextControl
							label={ __( 'Export Name', 'it-l10n-ithemes-security-pro' ) }
							className="itsec-export-form__name"
							value={ title }
							onChange={ setTitle }
							required={ titleRequired }
						/>
						<CheckboxControl
							label={ __( 'Include All Data', 'it-l10n-ithemes-security-pro' ) }
							className="itsec-export-form__include-all"
							checked={ sources.every( ( source ) =>
								includedSources.includes( source.slug )
							) }
							onChange={ ( checked ) =>
								setIncludedSources(
									checked ? map( sources, 'slug' ) : []
								)
							}
						/>
					</StyledFormCardHeader>
					<StyledFormCardBody>
						{ sources.map( ( source, ...rest ) => (
							<SourcePanel
								key={ source.slug }
								source={ source }
								options={ options }
								setOptions={ setOptions }
								isIncluded={ includedSources.includes( source.slug ) }
								addSource={ addSource }
								removeSource={ removeSource }
								{ ...rest }
							/>
						) ) }
					</StyledFormCardBody>
				</StyledCardContainer>
				<Flex justify="end">
					{ children }
					<Button
						variant="primary"
						type="submit"
						disabled={ ! includedSources.length || isCreating }
						isBusy={ isCreating }
					>
						{ __( 'Create', 'it-l10n-ithemes-security-pro' ) }
					</Button>
				</Flex>
			</form>
		</>
	);
}

function SourcePanel( {
	source,
	options,
	setOptions,
	isIncluded,
	addSource,
	removeSource,
	...rest
} ) {
	const [ isExpanded, setIsExpanded ] = useState( false );

	return (
		<StyledSourceCard { ...rest }>
			<CardHeader>
				<Text variant={ TextVariant.DARK } weight={ 600 } text={ source.title } />
				<Tooltip text={ __( 'Helpful text', 'it-l10n-ithemes-security-pro' ) }>
					<span><StyledToolTipIcon icon={ help } /></span>
				</Tooltip>
			</CardHeader>
			<CardBody>
				<div style={ { display: 'flex', justifyContent: 'space-between' } }>
					<div>
						<StyledCheckboxControl
							label={ sprintf(
								/* translators: 1. Export source name. */
								__( 'Include “%s” in Export', 'it-l10n-ithemes-security-pro' ),
								source.title
							) }
							checked={ isIncluded }
							onChange={ ( checked ) =>
								checked
									? addSource( source.slug )
									: removeSource( source.slug )
							}
						/>
						<StyledSourceDescription
							as="p" size={ TextSize.SMALL }
							variant={ TextVariant.MUTED }
							text={ source.description }
						/>
					</div>
					{ source.options && isIncluded && (
						<Button
							aria-controls={ `export-source${ source.slug }` }
							aria-expanded={ isExpanded }
							icon={ isExpanded ? chevronUp : chevronDown }
							onClick={ () => setIsExpanded( ! isExpanded ) }
							variant="tertiary"
						/>
					) }
				</div>
				<div>
					{ source.options && isIncluded && (
						<SourceForm
							isExpanded={ isExpanded }
							id={ `export-source${ source.slug }` }
							source={ source }
							options={ options }
							setOptions={ setOptions }
						/>
					) }
				</div>
			</CardBody>
		</StyledSourceCard>
	);
}

function SourceForm( { isExpanded, id, source, options, setOptions } ) {
	return (
		<StyledSourceForm
			tagName="div"
			className={ classnames(
				'rjsf',
				'itsec-export-form__options-form',
				`itsec-export-form__options-form--${ source.slug }`
			) }
			additionalMetaSchemas={ [
				require( 'ajv/lib/refs/json-schema-draft-04.json' ),
			] }
			schema={ source.options }
			uiSchema={ source.options.uiSchema }
			idPrefix={ `itsec_${ source.slug }` }
			formData={ options[ source.slug ] }
			id={ id }
			onChange={ ( e ) => {
				setOptions( { ...options, [ source.slug ]: e.formData } );
			} }
			isExpanded={ isExpanded }
		>
			<></>
		</StyledSourceForm>
	);
}
