/**
 * External dependencies
 */
import styled from '@emotion/styled';

/**
 * Internal dependencies
 */
import { EmailSent, EmailError } from '@ithemes/security-style-guide';
import { Button, Text } from '@ithemes/ui';

export const StyledConfirmationContainer = styled.div`
	position: relative;
	margin-top: ${ ( { theme: { getSize } } ) => getSize( 0.75 ) };
`;

export const StyledHeader = styled( 'div', { shouldForwardProp: ( propName ) => propName !== 'hasError' && propName !== 'isFront' } )`
	display: flex;
	justify-content: center;
	align-items: center;
	background-color: ${ ( { hasError, isFront } ) => hasError || isFront ? '#f6f7f7' : '#c3a2e8' };
	height: 120px;
	width: 100%;
	border-radius: 4px;
	position: relative;
	overflow: hidden;
`;

export const StyledEmailSent = styled( EmailSent )`
	position: absolute;
	top: -35px;
	height: 160%;
`;

export const StyledEmailError = styled( EmailError )`
	position: absolute;
	top: -35px;
	height: 160%;
`;

export const StyledClose = styled( Button )`
	position: absolute;
	top: ${ ( { theme: { getSize } } ) => getSize( -2.25 ) };
	right: ${ ( { theme: { getSize } } ) => getSize( -0.25 ) };
	box-shadow: inset 0 0 0 1px transparent !important;
	& svg {
		fill: ${ ( { theme } ) => theme.colors.text.normal };
	}
`;

export const StyledConfirmation = styled.div`
	display: flex;
	flex-direction: column;
	align-items: center;
	gap: ${ ( { theme: { getSize } } ) => getSize( 1.5 ) };
`;

export const StyledConfirmationText = styled( Text )`
	font-size: ${ ( { theme: { getSize } } ) => getSize( 0.75 ) };
`;
