/**
 * External dependencies
 */
import { find, map } from 'lodash';
import styled from '@emotion/styled';
import { cx } from '@emotion/css';

/**
 * WordPress dependencies
 */
import { __, sprintf } from '@wordpress/i18n';
import { CheckboxControl, VisuallyHidden } from '@wordpress/components';
import { dateI18n } from '@wordpress/date';

/**
 * SolidWP dependencies
 */
import { Text } from '@ithemes/ui';

/**
 * Internal dependencies
 */
import './style.scss';

const StyledColumn = styled.td`
	width: 20%;
`;

const StyledCombinedCell = styled.div`
	display: flex;
	align-items: center;
	gap: 1rem;
`;

const StyledCheckboxControl = styled( CheckboxControl )`
	.components-base-control__field {
		margin-bottom: 0;
	}
`;

function ExportTableBody( { exports, onItemChange, selected, sources } ) {
	if ( ! exports.length ) {
		return (
			<tr>
				<td colSpan={ 3 }>{ __( 'No exports found.', 'it-l10n-ithemes-security-pro' ) }</td>
			</tr>
		);
	}

	return exports.map( ( item ) => (
		<tr key={ item.id }>
			<StyledColumn>
				<StyledCombinedCell>
					<StyledCheckboxControl
						label={
							<VisuallyHidden>
								{ sprintf(
									/* translators: Export title*/
									__( 'Select %s', 'it-l10n-ithemes-security-pro' ),
									item.metadata.title
								) }
							</VisuallyHidden>
						}
						checked={ selected.includes( item.id ) }
						onChange={ onItemChange( item.id ) }
					/>
					<Text
						text={ item.metadata.title }
					/>
				</StyledCombinedCell>
			</StyledColumn>
			<StyledColumn>
				{ dateI18n( 'M j, Y', item.metadata.exported_at ) }
			</StyledColumn>
			<td>
				{ Object.keys( item.sources )
					.map( ( source ) =>
						find( sources,
							{ slug: source } )?.title || source )
					.join( ', ' ) }
			</td>
		</tr>
	) );
}

export default function ExportsList( {
	exports,
	sources,
	singleSelection,
	selected,
	addSelected,
	removeSelected,
	setSelected,
	isLoading = false,
	className,
} ) {
	const onItemChange = ( item ) => ( checked ) => {
		if ( singleSelection ) {
			setSelected( checked ? [ item ] : [] );
		} else if ( checked ) {
			addSelected( item );
		} else {
			removeSelected( item );
		}
	};

	return (
		<table className={ cx( 'itsec-exports-list', className ) }>
			<thead>
				<tr>
					<StyledColumn as="th">
						<StyledCombinedCell>
							{ ! singleSelection && (
								<StyledCheckboxControl
									label={
										<VisuallyHidden>{ __( 'Select All Exports', 'it-l10n-ithemes-security-pro' ) } </VisuallyHidden>
									}
									checked={
										exports.length > 0 &&
										exports.every( ( item ) =>
											selected.includes( item.id )
										)
									}
									onChange={ ( checked ) => setSelected( checked ? map( exports, 'id' ) : [] ) }
								/>
							) }
							<Text
								textTransform="uppercase"
								text={ __( 'Name', 'it-l10n-ithemes-security-pro' ) }
							/>
						</StyledCombinedCell>
					</StyledColumn>
					<StyledColumn as="th">
						{ __( 'Date', 'it-l10n-ithemes-security-pro' ) }
					</StyledColumn>
					<th>
						{ __( 'Content', 'it-l10n-ithemes-security-pro' ) }
					</th>
				</tr>
			</thead>
			<tbody>
				{ isLoading ? (
					<tr>
						<td colSpan={ 3 }>
							{ __( 'Loading exports…', 'it-l10n-ithemes-security-pro' ) }
						</td>
					</tr>
				) : (
					<ExportTableBody exports={ exports } onItemChange={ onItemChange } selected={ selected } sources={ sources } />
				) }
			</tbody>
		</table>
	);
}
