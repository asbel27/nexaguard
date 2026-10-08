/**
 * External dependencies
 */
import styled from '@emotion/styled';

/**
 * SolidWP dependencies
 */
import { Text } from '@ithemes/ui';

export const StyledModalBody = styled.div`
	display: flex;
	flex-direction: column;
	gap: ${ ( { theme: { getSize } } ) => getSize( 1.25 ) };
`;

export const StyledHeader = styled.div`
	display: flex;
	justify-content: center;
	align-items: center;
	background-color: #c3a2e8;
	height: 120px;
	width: 100%;
	border-radius: 4px;
	position: relative;
`;

export const StyledTextPill = styled( Text )`
	position: absolute;
	top: 8px;
	left: 8px;
	font-size: ${ ( { theme: { getSize } } ) => getSize( 0.625 ) };
	padding: ${ ( { theme: { getSize } } ) => getSize( 0.25 ) } ${ ( { theme: { getSize } } ) => getSize( 0.75 ) };
	background: #d2b9ee;
	border-radius: 40px;
`;

export const StyledTextContainer = styled.div`
	display: flex;
	flex-direction: column;
	gap: ${ ( { theme: { getSize } } ) => getSize( 0.5 ) };
`;

export const StyledLinkContainer = styled.a`
	border: 1px solid ${ ( { theme } ) => theme.colors.border.normal };
	padding: ${ ( { theme: { getSize } } ) => getSize( 0.75 ) };
	display: flex;
	gap: ${ ( { theme: { getSize } } ) => getSize( 1.5 ) };
	align-items: center;
	border-radius: 2px;
	text-decoration: none;
	&:hover {
		background: #e7e7e7;
	}
`;

export const StyledCapabilities = styled.ul`
	list-style-type: initial;
	margin: 0 0 0 ${ ( { theme: { getSize } } ) => getSize( 1.25 ) };
`;

export const StyledFooter = styled.div`
	display: flex;
	flex-direction: column;
	gap: ${ ( { theme: { getSize } } ) => getSize( 1.25 ) };
	margin-top: ${ ( { theme: { getSize } } ) => getSize( 1.25 ) };
`;

export const StyledFooterButtons = styled.div`
	display: flex;
	justify-content: space-between;
	& button {
		width: 47%;
	}
`;
