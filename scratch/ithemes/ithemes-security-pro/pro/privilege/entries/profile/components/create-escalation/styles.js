/**
 * External dependencies
 */
import styled from '@emotion/styled';

/**
 * WordPress dependencies
 */
import { TextControl } from '@wordpress/components';

/**
 * SolidWP dependencies
 */
import { Button, Text } from '@ithemes/ui';

export const StyledForm = styled.form`
	display: grid;
	grid-template-columns: 0.75fr 0.25fr;
	gap: 1.25rem 0.5rem;
	grid-auto-flow: row;
	grid-template-areas:
		"title ."
		"description ."
		"label ."
		"role days"
		"error ."
		"button .";
	align-items: center;
	@media screen and (min-width: ${ ( { theme } ) => theme.breaks.small }px) {
		grid-template-columns: 1fr 1fr 0.5fr 0.5fr;
		gap: 0.5rem 1rem;
		grid-template-areas:
			"title role days button"
			"description role days button"
			". error . .";
	}
`;

export const StyledTitle = styled( Text )`
	grid-area: title
`;

export const StyledLabel = styled( Text )`
	grid-area: label;
`;

export const StyledRoles = styled.div`
	grid-area: role;
	& label {
		text-transform: none !important;
		font-family: 'SF Pro Text', sans-serif;
		font-size: 0.813rem !important;
		color: ${ ( { theme } ) => theme.colors.text.dark }
	}
`;

export const StyledDays = styled( TextControl )`
	grid-area: days;
	& label {
		text-transform: none !important;
		font-family: 'SF Pro Text', sans-serif;
		font-size: 0.813rem !important;
		color: ${ ( { theme } ) => theme.colors.text.dark }
	}
`;

export const StyledDescription = styled( Text )`
	grid-area: description;
`;

export const StyledUpdateButton = styled( Button )`
	grid-area: button;
	border-color: ${ ( { theme } ) => theme.colors.primary.base };
`;

export const StyledError = styled( Text )`
	grid-area: error;
	color: #D63638;
`;
