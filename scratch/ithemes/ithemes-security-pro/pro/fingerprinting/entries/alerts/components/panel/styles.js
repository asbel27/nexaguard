/**
 * External dependencies
 */
import styled from '@emotion/styled';

/**
 * SolidWP dependencies
 */
import { Text } from '@ithemes/ui';

export const StyledHeader = styled.div`
	display: flex;
	flex-direction: column;
	padding: ${ ( { theme: { getSize } } ) => getSize( 1 ) };
	gap: ${ ( { theme: { getSize } } ) => getSize( 0.5 ) };
	
`;

export const StyledSubheading = styled( Text )`
	padding-bottom: ${ ( { theme: { getSize } } ) => getSize( 1 ) };
	border-bottom: 1px solid ${ ( { theme } ) => theme.colors.border.normal };
`;

export const StyledEmptyState = styled.div`
	display: flex;
	flex-direction: column;
	margin: 0 ${ ( { theme: { getSize } } ) => getSize( 1 ) } ${ ( { theme: { getSize } } ) => getSize( 1 ) };
`;
