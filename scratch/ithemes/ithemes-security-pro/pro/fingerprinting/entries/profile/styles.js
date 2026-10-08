/**
 * External dependencies
 */
import styled from '@emotion/styled';

/**
 * WordPress dependencies
 */
import { Spinner } from '@wordpress/components';

/**
 * SolidWP dependencies
 */
import { Button, Heading, Notice, Surface } from '@ithemes/ui';

export const StyledApp = styled.div`
	max-width: 1200px;
	min-height: 450px;
	display: flex;
	flex-direction: column;
`;

export const StyledHeadingSection = styled.div`
	display: flex;
	align-items: center;
`;

export const StyledHeading = styled( Heading )`
	margin: 2rem 2rem 1rem 0;
`;

export const StyledSpinner = styled( Spinner )`
	margin-top: -4px !important;
	& path {
		stroke: ${ ( { theme } ) => theme.colors.primary.base };
	}
`;

export const StyledNotice = styled( Notice )`
	width: fit-content;
	background: ${ ( { theme } ) => theme.colors.surface.warning };
	margin-bottom: 1rem;
`;

export const StyledDevices = styled.div`
	display: flex;
	flex-wrap: wrap;
	flex-direction: column;
	gap: 1.5rem;
	max-width: 1200px;
	@media screen and (min-width: ${ ( { theme } ) => theme.breaks.small }px) {
		flex-direction: row;
	}
`;

export const StyledNoDevices = styled( Surface )`
	padding: 12px;
	border-left: 4px solid ${ ( { theme } ) => theme.colors.border.info };
	position: relative;
	max-width: 515px;
`;

export const StyledDismissButton = styled( Button )`
	position: absolute;
	top: 8px;
	right: 6px;
	box-shadow: none !important;
	& svg {
		fill: #1E1E1E;
	}
`;

export const StyledSaveButton = styled( Button )`
	width: fit-content;
`;
