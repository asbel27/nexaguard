/**
 * External dependencies
 */
import styled from '@emotion/styled';

export const StyledDeviceDetails = styled.div`
	display: grid;
	grid-template-columns: 1fr 1fr;
	gap: ${ ( { theme: { getSize } } ) => getSize( 0.75 ) };
	border: 1px solid #e7e7e7;
	padding: ${ ( { theme: { getSize } } ) => getSize( 1 ) };
`;

export const StyledDeviceSection = styled.div`
	display: flex;
	flex-direction: column;
	gap: ${ ( { theme: { getSize } } ) => getSize( 0.25 ) };
`;
