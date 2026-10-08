/**
 * External dependencies
 */
import styled from '@emotion/styled';

/**
 * Internal dependencies
 */
import { ExportsList } from '@ithemes/security.import-export.ui';

export const StyledExportsList = styled( ExportsList )`
	border: 1px solid ${ ( { theme } ) => theme.colors.border.normal };
	border-top: none;
`;
