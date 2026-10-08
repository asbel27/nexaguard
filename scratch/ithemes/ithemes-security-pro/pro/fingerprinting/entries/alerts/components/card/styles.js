/**
 * External dependencies
 */
import styled from '@emotion/styled';

/**
 * SolidWP dependencies
 */
import { Button } from '@ithemes/ui';

export const StyledCard = styled.div`
	display: flex;
	flex-direction: column;
	gap: ${ ( { theme: { getSize } } ) => getSize( 0.5 ) };
	margin:
			0
			${ ( { theme: { getSize } } ) => getSize( 1 ) }
			${ ( { theme: { getSize } } ) => getSize( 0.5 ) }
			${ ( { theme: { getSize } } ) => getSize( 1 ) };
	border: 1px solid ${ ( { theme } ) => theme.colors.border.normal };
`;

export const StyledNotice = styled.div`
	display: flex;
	flex-direction: column;
	gap: ${ ( { theme: { getSize } } ) => getSize( 0.25 ) };
	padding: ${ ( { theme: { getSize } } ) => getSize( 0.75 ) };
	border-left: 4px solid #d63638;
`;

export const StyledDetails = styled.div`
	display: flex;
	flex-direction: column;
	gap: ${ ( { theme: { getSize } } ) => getSize( 0.5 ) };
	margin:
			${ ( { theme: { getSize } } ) => getSize( 0.5 ) }
			${ ( { theme: { getSize } } ) => getSize( 0.75 ) };
`;

export const StyledButton = styled( Button )`
	text-decoration: none !important;
	margin: 
			${ ( { theme: { getSize } } ) => getSize( -0.5 ) }
			${ ( { theme: { getSize } } ) => getSize( 0.75 ) }
			${ ( { theme: { getSize } } ) => getSize( 0.5 ) }
			!important;
`;
