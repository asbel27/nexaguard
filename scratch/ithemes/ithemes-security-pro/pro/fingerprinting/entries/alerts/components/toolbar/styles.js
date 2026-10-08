/**
 * External dependencies
 */
import styled from '@emotion/styled';

/**
 * WordPress dependencies
 */
import { SnackbarList } from '@wordpress/components';

export const StyledSnackbarList = styled( SnackbarList )`
	position: absolute;
	top: 10px;

	body > & {
		top: 40px;
		left: 20px;
	}
`;

export const StyledToolbarText = styled.span`
	display: flex;
	gap: 4px;
	align-items: center;
`;
