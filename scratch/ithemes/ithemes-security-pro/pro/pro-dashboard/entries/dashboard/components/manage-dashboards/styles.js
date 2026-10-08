/**
 * External dependencies
 */
import styled from '@emotion/styled';
import { keyframes } from '@emotion/css';

/**
 * iThemes dependencies
 */
import { Button, Surface, TextWeight } from '@ithemes/ui';

export const StyledManageDashboards = styled.div`
	padding: 0.25rem 0.75rem;
	width: ${ ( { isExpanded } ) => isExpanded ? '100%' : '300px' };
	display: flex;
	flex-direction: column;
	gap: 0.5rem;
`;
export const StyledHeader = styled.header`
	display: flex;
	flex-direction: column;
	gap: 0.5rem;
`;

export const StyledDashboardsList = styled.ul`
	display: flex;
	flex-direction: column;
	gap: 0.5rem;
	margin: 0;
`;

export const StyledFooter = styled.footer`
	display: flex;
`;

export const StyledCreateDashboard = styled( Button )`
	flex: 1;
	background-color: ${ ( { theme } ) => theme.colors.surface.secondary } !important;
`;

const pulseFade = keyframes`
	0% {
		opacity: .5;
	}
	
	25% {
		opacity: 1;
	}
	
	60% {
		opacity: .5;
	}
	
	100% {
		opacity: .5;
	}
`;

export const StyledDashboard = styled( Surface, {
	shouldForwardProp: ( propName ) => propName !== 'isDeleting' }
)`
	display: flex;
	flex-direction: column;
	gap: 0.5rem;
	padding: 0.75rem 0.5rem;
	margin: 0;

	${ ( { isDeleting } ) => isDeleting && `animation: ${ pulseFade } 3s ease-out infinite normal;` }
`;

export const StyledDashboardHeader = styled.header`
	display: flex;
	align-items: center;
	justify-content: flex-start;
	gap: 0.75rem;
`;

export const StyledDashboardLink = styled( Button )`
	font-weight: ${ TextWeight.HEAVY };
`;

export const StyledDashboardMeta = styled.section`
	display: flex;
	flex-direction: column;
	gap: 0.25rem;
`;

export const StyledDashboardActions = styled.footer`
	display: flex;
	gap: 0.5rem;
	justify-content: space-between;
`;

export const StyledDashboardAction = styled( Button )`
	flex: 1;
`;
