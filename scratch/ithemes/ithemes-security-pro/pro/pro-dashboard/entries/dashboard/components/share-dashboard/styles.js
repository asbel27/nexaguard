/**
 * External dependencies
 */
import styled from '@emotion/styled';

/**
 * iThemes dependencies
 */
import { Button, Text } from '@ithemes/ui';

/**
 * Internal dependencies
 */
import { AsyncSelect } from '@ithemes/security-ui';

export const StyledShareDashboard = styled.form`
	width: ${ ( { isExpanded } ) => isExpanded ? '100%' : '300px' };
	padding: 0.25rem 0.75rem;
	display: flex;
	flex-direction: column;
	gap: 0.5rem;
`;

export const StyledShareDashboardHeader = styled.header`
	display: flex;
	flex-direction: column;
	gap: 0.5rem;
`;

export const StyledShareDashboardTab = styled.section`
	display: flex;
	flex-direction: column;
	gap: 0.5rem;
	margin-top: 0.75rem;
`;

export const StyledShareDashboardFooter = styled.footer`
	display: flex;
	justify-content: space-between;
	align-items: center;
	border-top: 1px solid ${ ( { theme } ) => theme.colors.border.normal };
	margin-top: 1.5rem;
	padding-top: 1.5rem;
`;

export const StyledShareButton = styled( Button )`
	margin-left: auto;
`;

export const StyledAddUserControl = styled.div`
	display: flex;
	gap: 0.5rem;
	align-items: center;
`;

export const StyledSelectUserControl = styled( AsyncSelect )`
	flex-grow: 1;
  
	input:focus {
		box-shadow: none;
	}
`;

export const StyledShareSection = styled.section`
	display: flex;
	flex-direction: column;
	gap: 0.25rem;
`;

export const StyledShareSectionLegend = styled( Text )`
	display: contents;	
`;
