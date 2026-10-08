/**
 * External dependencies
 */
import styled from '@emotion/styled';

/**
 * WordPress dependencies
 */
import { Icon } from '@wordpress/components';

/**
 * SolidWP dependencies
 */
import { Text } from '@ithemes/ui';

export const StyledHeading = styled.div`
	display: flex;
	justify-content: space-between;
`;

export const StyledDevice = styled.div`
	display: flex;
	flex-direction: column;
	gap: ${ ( { theme: { getSize } } ) => getSize( 1.25 ) };
	padding: ${ ( { theme: { getSize } } ) => getSize( 1 ) };
	border: 1px solid ${ ( { theme } ) => theme.colors.border.normal };
`;

export const StyledMap = styled( 'div', { shouldForwardProp: ( propName ) => propName !== 'map' } )`
	height: 200px;
	background-image: ${ ( { map } ) => `url(${ map })` };
	background-size: contain;
`;

export const StyledDeviceDetails = styled.div`
	display: grid;
	grid-template-columns: 1fr 1fr;
	gap: ${ ( { theme: { getSize } } ) => getSize( 0.75 ) };
`;

export const StyledDeviceSection = styled.div`
	display: flex;
	flex-direction: column;
	gap: ${ ( { theme: { getSize } } ) => getSize( 0.25 ) };
`;

export const StyledHeader = styled.div`
	display: flex;
	flex-direction: column;
	gap: ${ ( { theme: { getSize } } ) => getSize( 0.75 ) };
	margin-bottom: ${ ( { theme: { getSize } } ) => getSize( 1.5 ) };
`;

export const StyledBadge = styled( Text )`
	font-size: ${ ( { theme: { getSize } } ) => getSize( 0.625 ) };
	line-height: ${ ( { theme: { getSize } } ) => getSize( 1 ) };
	padding: ${ ( { theme: { getSize } } ) => `${ getSize( 0.25 ) } ${ getSize( 0.5 ) }` };
	border-radius: 40px;
	background-color: #F3EDFA !important;
	color: ${ ( { theme } ) => theme.colors.text.muted } !important;
`;

export const StyledFooter = styled.div`
	display: flex;
	flex-direction: column;
	gap: ${ ( { theme: { getSize } } ) => getSize( 1.25 ) };
	margin-top: ${ ( { theme: { getSize } } ) => getSize( 1.25 ) };
`;

export const StyledIconContainer = styled.div`
	display: flex;
	gap: ${ ( { theme: { getSize } } ) => getSize( 0.25 ) };
	& p {
		margin: 0;
		line-height: ${ ( { theme: { getSize } } ) => getSize( 1 ) };
		color: ${ ( { theme } ) => theme.colors.text.muted };
	}
	& a {
		color: ${ ( { theme } ) => theme.colors.text.accent };
	}
`;

export const StyledInfoIcon = styled( Icon )`
	width: ${ ( { theme: { getSize } } ) => getSize( 2 ) };
`;

export const StyledFooterButtons = styled.div`
	display: flex;
	justify-content: space-between;
	& button {
		width: 47%;
	}
`;
