/**
 * External dependencies
 */
import styled from '@emotion/styled';

/**
 * SolidWP dependencies
 */
import { Text } from '@ithemes/ui';

export const StyledHeader = styled.header`
	display: flex;
	flex-direction: column;
	margin: 1rem 0;
	gap: 1rem;
	@media screen and (min-width: ${ ( { theme } ) => theme.breaks.small }px) {
		flex-direction: row;
		align-items: center;
	}
	@media screen and (min-width: ${ ( { theme } ) => theme.breaks.medium }px) {
		gap: 2rem;
	}
`;

export const StyledDivider = styled( Text )`
	display: none;
	@media screen and (min-width: ${ ( { theme } ) => theme.breaks.small }px) {
		color: #D9D9D9;
		display: inherit;
	}
`;
