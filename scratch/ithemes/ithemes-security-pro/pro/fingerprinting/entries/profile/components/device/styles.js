/**
 * External dependencies
 */
import styled from '@emotion/styled';

/**
 * SolidWP dependencies
 */
import { Surface, Text } from '@ithemes/ui';

export const StyledDeviceSurface = styled( Surface )`
	padding: 1rem;
	border: 1px solid ${ ( { theme, hasError } ) => hasError ? '#B32D2E' : theme.colors.border.normal };
	@media screen and (min-width: ${ ( { theme } ) => theme.breaks.medium }px) {
		max-width: 350px;
	}
`;

export const StyledDeviceDetails = styled.div`
	display: grid;
	grid-template-columns: 1fr 1fr;
	grid-template-areas: ${ ( { hasGeolocation } ) => hasGeolocation
		? `"location created" "ip platform" "browser last-seen" "status ."`
		: `"location created"  "browser platform" "status last-seen"` };
	gap: 0.75rem 1.25rem;
`;

export const StyledDeviceSection = styled.div`
	display: flex;
	flex-direction: column;
	gap: 0.25rem 0;
`;

export const StyledSectionLabel = styled( Text )`
	font-size: 0.75rem;
`;

export const StyledLocation = styled( StyledDeviceSection )`
	grid-area: location;
`;

export const StyledCreated = styled( StyledDeviceSection )`
	grid-area: created;
`;

export const StyledIP = styled( StyledDeviceSection )`
	grid-area: ip;
`;

export const StyledPlatform = styled( StyledDeviceSection )`
	grid-area: platform;
`;

export const StyledBrowser = styled( StyledDeviceSection )`
	grid-area: browser;
`;

export const StyledLastSeen = styled( StyledDeviceSection )`
	grid-area: last-seen;
`;

export const StyledStatus = styled( StyledDeviceSection )`
	grid-area: status;
`;

export const StyledError = styled( Text )`
	color: #B32D2E;
	margin-bottom: 0.75rem;
`;
