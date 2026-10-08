/**
 * External dependencies
 */
import styled from '@emotion/styled';
import contrast from 'contrast';

/**
 * iThemes dependencies
 */
import { Button } from '@ithemes/ui';

export const StyledDropdownToggle = styled( Button )`
	&.components-button {
		background: ${ ( { theme } ) => theme.colors.surface.primary };
		border: 1px solid ${ ( { theme } ) => theme.colors.border.input };
		box-shadow: none;
	}

	&:active {
		background-color: ${ ( { theme } ) => theme.colors.surface.tertiary };
	}
`;

export const StyledShare = styled.div`
	display: flex;
	flex-grow: 1;
	align-items: center;
	gap: 0.5rem;
`;

export const StyledRecipients = styled.div`
	display: flex;
	align-items: center;

	& > * {
		display: flex;
		margin-left: -1.5em;
		transition: all 300ms ease;

		&:first-child {
			margin-left: 0;
		}

		&:hover {
			margin-right: .5em;
		}

		&:last-child:hover {
			margin-right: 0;
		}

		&:hover + * {
			margin-left: 0;
		}
	}
`;

export const StyledRecipient = styled.span`
	display: flex;
	align-items: center;
	justify-content: center;
	width: 2.25rem;
	height: 2.25rem;
`;

export const StyledRecipientAbbr = styled( StyledRecipient )`
	color: ${ ( { theme, backgroundColor } ) => contrast( backgroundColor ) === 'light' ? theme.colors.text.dark : theme.colors.text.white };
	background-color: ${ ( { backgroundColor } ) => backgroundColor };
	border-radius: 50%;
`;

export const StyledRecipientText = styled.span`
	font-size: 1rem;
`;

export const StyledAvatar = styled.img`
	height: 2.25rem;
	width: 2.25rem;
	border-radius: 50%;
`;

export const StyledRecipientTrigger = styled( Button )`
	padding: 0;

	&:hover {
		box-shadow: none !important;
	}
`;

export const StyledShareRecipient = styled.div`
	width: ${ ( { isExpanded } ) => isExpanded ? '100%' : '200px' };
	display: flex;
	flex-direction: column;
	gap: 0.5rem;
`;

export const StyledShareRecipientHeader = styled.header`
	display: flex;
	align-items: center;
	gap: 0.75rem;
`;

export const StyledShareRecipientFooter = styled.footer`
	text-align: right;
`;
