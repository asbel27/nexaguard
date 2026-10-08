/**
 * External dependencies
 */
import styled from '@emotion/styled';

/**
 * WordPress dependencies
 */
import { useDispatch, useSelect } from '@wordpress/data';
import { __ } from '@wordpress/i18n';

/**
 * SolidWP dependencies
 */
import { MessageList } from '@ithemes/ui';

/**
 * Internal dependencies
 */
import { PageContainer, PageHeader } from '@ithemes/security.pages.tools';
import { ExportForm } from '@ithemes/security.import-export.ui';
import { STORE_NAME } from '@ithemes/security.import-export.data';

const StyledMessageList = styled( MessageList )`
	margin: 1rem 0;
`;

export default function CreateExport() {
	const { sources, isCreating, lastResult } = useSelect( ( select ) => ( {
		sources: select( STORE_NAME ).getSources(),
		isCreating: select( STORE_NAME ).isCreatingExport(),
		lastResult: select( STORE_NAME ).getLastCreatedExportResult(),
	} ),
	[] );

	const { createExport } = useDispatch( STORE_NAME );

	return (
		<PageContainer>
			<PageHeader />

			{ lastResult?.isSuccess() && (
				<StyledMessageList
					type="success"
					hasBorder
					messages={ [
						__( 'Export created.', 'it-l10n-ithemes-security-pro' ),
					] }
				/>
			) }
			<ResultSummary result={ lastResult } hasBorder />

			{ sources.length > 0 && (
				<ExportForm
					sources={ sources }
					isCreating={ isCreating }
					createExport={ createExport }
					titleRequired
				/>
			) }
		</PageContainer>
	);
}

function ResultSummary( { result, hasBorder } ) {
	return (
		<>
			<MessageList hasBorder={ hasBorder } messages={ result?.success ?? [] } type="success" />
			<MessageList hasBorder={ hasBorder } messages={ result?.warning ?? [] } type="warning" />
			<MessageList hasBorder={ hasBorder } messages={ result?.info ?? [] } type="info" />
		</>
	);
}
