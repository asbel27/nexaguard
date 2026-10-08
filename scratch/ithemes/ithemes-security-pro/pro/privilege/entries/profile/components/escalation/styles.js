/**
 * External dependencies
 */
import styled from '@emotion/styled';

/**
 * SolidWP dependencies
 */
import { Button, Text } from '@ithemes/ui';

export const StyledEscalation = styled.div`
	display: grid;
	grid-gap: 1.25rem;
	grid-template-areas: 
		'title'
		'escalated'
		'error'
		'clearButton';

	@media screen and (min-width: ${ ( { theme } ) => theme.breaks.medium }px) {
		grid-template-columns: 0.25fr 0.5fr 0.25fr;
		grid-template-areas: 
			'title escalated clearButton'
			'. error .';
	}
`;

export const StyledTitle = styled( Text )`
	grid-area: title
`;

export const StyledEscalationText = styled( Text )`
	grid-area: escalated;
`;

export const StyledClearButton = styled( Button )`
	grid-area: clearButton;
	max-width: 200px;
`;

export const StyledError = styled( Text )`
	grid-area: error;
	color: #D63638;
`;
