/**
 * External dependencies
 */
import styled from '@emotion/styled';

/**
 * WordPress dependencies
 */
import { ToggleControl } from '@wordpress/components';

/**
 * SolidWP dependencies
 */
import { Heading } from '@ithemes/ui';

export const StyledApp = styled.div`
	box-sizing: border-box;
	max-width: 800px;
	*,
	::before,
	::after {
		box-sizing: border-box;
	}
`;

export const StyledHeading = styled( Heading )`
	margin: 2rem 0;
`;

export const StyledToggleControl = styled( ToggleControl )`
	--wp-components-color-accent: #502CA1 !important;
	.components-form-toggle.is-checked .components-form-toggle__track {
		background-color: #502CA1;
	}
	input[type="checkbox"]:focus {
		box-shadow: 0 0 0 1px #502CA1 !important;
	}
`;

