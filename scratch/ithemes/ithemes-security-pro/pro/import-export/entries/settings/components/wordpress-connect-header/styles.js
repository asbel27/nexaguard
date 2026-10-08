/**
 * External dependencies
 */
import styled from '@emotion/styled';

/**
 * WordPress dependencies
 */
import { Spinner } from '@wordpress/components';

export const StyledWordPressConnectHeader = styled.div`
	display: grid;
	width: 100%;
	grid-gap: 0.5rem;
	grid-template-areas: "logo details spinner";
	grid-template-columns: fit-content(80px) auto fit-content(40px);
	align-items: center;
`;

export const StyledLogo = styled.img`
	grid-area: logo;
	width: auto;
	height: 50px;
`;

export const StyledDetails = styled.div`
	grid-area: details;
	align-self: stretch;
	display: flex;
	flex-direction: column;
	justify-content: space-between;
	gap: 0.5rem;
	margin: 0.25rem 0;  
`;

export const StyledSpinner = styled( Spinner )`
	grid-area: spinner;
	margin: 0 !important;
	width: 32px !important;
	height: 32px !important;
`;
