/**
 * External dependencies
 */
import styled from '@emotion/styled';

/**
 * WordPress dependencies
 */
import { Card, CardBody, CardHeader } from '@wordpress/components';

/**
 * SolidWP dependencies
 */
import { Heading } from '@ithemes/ui';

export const StyledSectionHeading = styled( Heading )`
	margin: 1rem 0;
`;

export const StyledCard = styled( Card )`
	box-shadow: none !important;
	border: 1px solid ${ ( { theme } ) => theme.colors.border.normal }
`;

export const StyledCardHeader = styled( CardHeader )`
	padding: 0.5rem 1.25rem !important;
`;

export const StyledButtonsContainer = styled.div`
	display: flex;
	flex-direction: column;
	justify-content: flex-end;
	gap: 1.25rem;
	@media screen and (min-width: ${ ( { theme } ) => theme.breaks.small }px) {
		flex-direction: row;
	}
`;

export const StyledCardBody = styled( CardBody )`
	&.components-card__body {
		padding: 0;
	}
`;
