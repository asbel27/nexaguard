/**
 * External dependencies
 */
import styled from '@emotion/styled';

/**
 * WordPress dependencies
 */
import { Modal } from '@wordpress/components';

/**
 * SolidWP dependencies
 */
import { Button } from '@ithemes/ui';

export const StyledModal = styled( Modal )`
	width: 300px;
`;

export const StyledBlock = styled.div`
	position: relative;
	display: flex;
	flex-direction: column;
	align-items: center;
	gap: ${ ( { theme: { getSize } } ) => getSize( 0.5 ) };
`;

export const StyledClose = styled( Button )`
	position: absolute;
	top: ${ ( { theme: { getSize } } ) => getSize( -1.5 ) };
	right: ${ ( { theme: { getSize } } ) => getSize( -1.5 ) };
	box-shadow: inset 0 0 0 1px transparent !important;
	& svg {
		fill: ${ ( { theme } ) => theme.colors.text.normal };
	}
`;
