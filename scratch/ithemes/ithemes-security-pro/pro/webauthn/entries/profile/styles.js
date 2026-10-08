/**
 * External dependencies
 */
import styled from '@emotion/styled';

/**
 * WordPress dependencies
 */
import { Modal } from '@wordpress/components';

/**
 * SolidWP dependencies
 */
import { Heading } from '@ithemes/ui';

/**
 * Internal dependencies
 */
import { Credential } from '@ithemes/security.webauthn.manage';

export const StyledModal = styled( Modal )`
	width: ${ ( { theme: { getSize } } ) => getSize( 25 ) };
	max-width: 100%;
	margin: 5rem auto auto;

	.components-modal__content {
		padding: 0;
		header {
			position: sticky;
			top: 0;
		}
	}
`;

export const StyledHeading = styled( Heading )`
	margin: 2rem 0;
`;

export const StyledTextContainer = styled.div`
	max-width: 800px;
`;

export const StyledDevicesHeader = styled.header`
	display: flex;
	align-items: center;
	gap: 2rem;
`;

export const StyledCredentialList = styled.ul`
	list-style: none;
	display: flex;
	flex-wrap: wrap;
	gap: 0.75rem 1.5rem;
	margin: 1rem 0 0 0;
	padding: 0;
`;

export const StyledCredential = styled( Credential )`
	width: 15rem;
`;
