/**
 * External dependencies
 */
import styled from '@emotion/styled';

/**
 * WordPress dependencies
 */
import { Modal } from '@wordpress/components';
import { Icon } from '@wordpress/icons';

/**
 * SolidWP dependencies
 */
import { Button, Text } from '@ithemes/ui';

export const StyledModal = styled( Modal )`
	.components-modal__header .components-modal__header-heading {
		font-size: 1rem;
		line-height: 1.5rem;
		color: ${ ( { theme } ) => theme.colors.text.dark };
	}
`;

export const StyledModalContent = styled.div`
	display: flex;
	flex-direction: column;
	gap: 1.25rem;
	width: 480px;
`;

export const StyledMap = styled( 'div', { shouldForwardProp: ( propName ) => propName !== 'map' } )`
	height: 200px;
	background-image: ${ ( { map } ) => `url(${ map })` };
	background-size: contain;
`;

export const StyledTextContainer = styled.div`
	display: flex;
	flex-direction: column;
`;

export const StyledDeviceDetails = styled.div`
	display: grid;
	grid-template-columns: 1fr 1fr;
	grid-template-areas: ${ ( { hasGeolocation } ) => hasGeolocation
		? `"location browser" "ip platform"`
		: `"location browser"  "platform ."` };
	gap: 0.75rem 1.25rem;
	border: 1px solid ${ ( { theme } ) => theme.colors.border.normal };
	padding: 1rem;
`;

export const StyledDeviceSection = styled.div`
	display: flex;
	flex-direction: column;
	gap: 0.25rem 0;
`;

export const StyledSectionLabel = styled( Text )`
	font-size: 0.75rem;
`;

export const StyledLocation = styled( StyledDeviceSection )`
	grid-area: location;
`;

export const StyledIP = styled( StyledDeviceSection )`
	grid-area: ip;
`;

export const StyledPlatform = styled( StyledDeviceSection )`
	grid-area: platform;
`;

export const StyledBrowser = styled( StyledDeviceSection )`
	grid-area: browser;
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

export const StyledFooter = styled.div`
	display: flex;
	flex-direction: column;
	gap: ${ ( { theme: { getSize } } ) => getSize( 1 ) };
`;

export const StyledButtons = styled.div`
	display: flex;
	gap: ${ ( { theme: { getSize } } ) => getSize( 0.75 ) };
	& button {
		width: 50%;
	}
`;

export const StyledIgnoreButton = styled( Button )`
	box-shadow: none !important;
	&:hover {
		box-shadow: inset 0 0 0 1px #545454 !important;
	}
`;
