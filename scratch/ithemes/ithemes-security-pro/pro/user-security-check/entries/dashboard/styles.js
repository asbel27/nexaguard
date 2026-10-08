/**
 * External dependencies
 */
import styled from '@emotion/styled';

/**
 * iThemes dependencies
 */
import { Surface, SearchControl, Text, Filters } from '@ithemes/ui';

/**
 * Internal dependencies
 */
import { AsyncSelect } from '@ithemes/security-ui';
import { LightGrayShieldInline } from '@ithemes/security-style-guide';

export const StyledListCard = styled.div`
	display: flex;
	flex-direction: column;
	height: 100%;
`;

export const StyledFooter = styled( Surface )`
	display: flex;
	align-items: center;
	justify-content: flex-end;
	position: sticky;
	bottom: 0;
	padding: 0.5rem 1.25rem;
	margin-top: auto;
	border-top: 1px solid ${ ( { theme } ) => theme.colors.border.normal };
`;

export const StyledUserCell = styled.th`
	display: flex;
	align-items: center;
	gap: 0.5rem;
`;

export const StyledUserAvatar = styled.img`
	width: 2rem;
	border-radius: 50%;
`;

export const StyledUserHeader = styled.header`
	display: flex;
	align-items: center;
	gap: 0.75rem;
	padding: 0.75rem 2rem;
	min-height: calc(36px + 1.5rem);
`;

export const StyledUserInfoTable = styled.table`
	width: 100%;
	border-spacing: 0;
	table-layout: fixed;
`;

const StyledCell = styled.div`
	padding: 0.75rem 2rem;
	border-top: 1px solid ${ ( { theme } ) => theme.colors.border.normal };
`;

export const StyledTh = styled( StyledCell.withComponent( 'th' ) )`
	text-align: left;
	width: 55%;
`;

export const StyledTd = StyledCell.withComponent( 'td' );

export const StyledLabel = styled( Text )`
	font-size: ${ ( { theme: { getSize } } ) => getSize( 0.875 ) };
`;

export const StyledUserActions = styled( Surface )`
	position: sticky;
	bottom: 0;
	display: flex;
	align-items: center;
	justify-content: flex-end;
	gap: 0.5rem;
	padding: 0.5rem 1.25rem;
	margin-top: auto;
	border-top: 1px solid ${ ( { theme } ) => theme.colors.border.normal };
`;

export const StyledPinnedUserCard = styled.div`
	display: flex;
	flex-direction: column;
	height: 100%;
`;

export const StyledUserForm = styled.section`
	padding: 0.75rem 2rem;
	display: flex;
	flex-direction: column;
	flex-grow: 1;
	justify-content: center;
	gap: 0.5rem;
	background: center no-repeat url("${ LightGrayShieldInline }");
	background-size: 60%;
`;

export const StyledSelectUser = styled.form`
	display: flex;
	align-items: center;
	gap: 0.5rem;
	justify-content: space-between;
`;

export const StyledSelectUserControl = styled( AsyncSelect )`
	flex-grow: 1;

	input:focus {
		box-shadow: none;
	}
`;

export const StyledFilter = styled.div`
	display: flex;
	align-items: center;
	padding: ${ ( { inHeader } ) => ! inHeader && '0.75rem 1.25rem' };
	border-bottom: ${ ( { theme, inHeader } ) =>
		! inHeader && `1px solid ${ theme.colors.border.normal }` };
	gap: 0.5rem;
`;

export const StyledSearchControl = styled( SearchControl )`
	flex-grow: 1;
`;

export const StyledFiltersPopover = styled( Filters )`
	width: ${ ( { isExpanded } ) => isExpanded ? '100%' : '350px' };
	max-width: ${ ( { isExpanded } ) => isExpanded && 'none' };
`;
