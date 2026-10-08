/**
 * External dependencies
 */
import styled from '@emotion/styled';

/**
 * WordPress dependencies
 */
import { DropZone } from '@wordpress/components';

export const StyledExportChoices = styled.div`
	display: flex;
	gap: 3.25rem;
  
	& > * {
		flex-grow: 1;
		width: 100%;
	}
`;

export const StyledDropZone = styled( DropZone )`
	display: block;
`;
