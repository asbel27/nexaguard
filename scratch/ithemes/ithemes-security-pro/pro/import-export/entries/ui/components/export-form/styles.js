/**
 * External dependencies
 */
import styled from '@emotion/styled';
import { withTheme } from '@rjsf/core';

/**
 * WordPress dependencies
 */
import {
	Card,
	CardBody,
	CardHeader,
	CheckboxControl,
	Icon,
} from '@wordpress/components';

/**
 * SolidWP dependencies
 */
import { Heading, Text } from '@ithemes/ui';
import Theme from '@ithemes/security-rjsf-theme';

export const StyledSectionHeading = styled( Heading )`
	margin: 1rem 0;
	@media screen and (min-width: ${ ( { theme } ) => theme.breaks.medium }px) {
		margin: 2rem 0 1rem;
	}
`;

export const StyledCardContainer = styled( Card )`
	margin-bottom: 1.5rem;
`;

export const StyledFormCardHeader = styled( CardHeader )`
	padding: 0.75rem 1.5rem !important;
	flex-direction: column !important;
	justify-content: flex-start !important;
	align-items: flex-start !important;
	gap: 1rem;
	color: ${ ( { theme } ) => theme.colors.text.dark };
	& .components-base-control__field {
		display: flex;
		align-items: center;
		margin-bottom: 0;
		& input[type="text"] {
			margin-left: 12px;
		}
		& label {
			white-space: nowrap;
			margin-bottom: 0;
		}
	}

	@media screen and (min-width: ${ ( { theme } ) => theme.breaks.small }px) {
		flex-direction: row !important;
		align-items: center !important;
		gap: 2rem !important;
	}
`;

export const StyledFormCardBody = styled( CardBody )`
	display: flex;
	flex-direction: column;
	padding: 0 1.25rem 1rem !important;
`;

export const StyledSourceCard = styled( Card )`
	margin: 0.75rem 0;
`;

export const StyledToolTipIcon = styled( Icon )`
	fill: ${ ( { theme } ) => theme.colors.text.muted };
`;

export const StyledCheckboxControl = styled( CheckboxControl )`
	& .components-checkbox-control__label {
		color: ${ ( { theme } ) => theme.colors.text.dark };
	}
`;

export const StyledSourceDescription = styled( Text )`
	margin-left: 2rem;
`;

const SchemaForm = withTheme( Theme );

export const StyledSourceForm = styled( SchemaForm )`
	display: ${ ( { isExpanded } ) => ! isExpanded && 'none' };
	margin: 0.5rem 1.75rem 0;
	max-width: 820px;
	padding: 0.875rem 0;
	border-top: 1px solid ${ ( { theme } ) => theme.colors.border.normal };
	color: ${ ( { theme } ) => theme.colors.text.dark };
	& p {
		color: ${ ( { theme } ) => theme.colors.text.muted };
		font-size: 0.75rem;
	}
	@media screen and (min-width: ${ ( { theme } ) => theme.breaks.medium }px) {
		& .itsec-components-checkbox-group-control__options {
			display: flex;
			flex-direction: column;
			flex-wrap: wrap;
			max-height: 300px;
		}
	}
`;
