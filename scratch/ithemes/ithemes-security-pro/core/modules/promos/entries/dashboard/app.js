/**
 * External dependencies
 */
import { ThemeProvider, useTheme } from '@emotion/react';

/**
 * WordPress dependencies
 */
import { __ } from '@wordpress/i18n';
import { useMemo } from '@wordpress/element';
import { close as dismissIcon } from '@wordpress/icons';

/**
 * Internal dependencies
 */
import { TextVariant, TextWeight } from '@ithemes/ui';
import {
	BelowToolbarFill,
	EditCardsFill,
} from '@ithemes/security.dashboard.api';
import {
	useConfigContext,
	PromoCard,
} from '@ithemes/security.dashboard.dashboard';
import { StellarSale } from '@ithemes/security.promos.components';
import { useLocalStorage } from '@ithemes/security-hocs';
import { StyledBFCMBanner, StyledBFCMButton, StyledBFCMDismiss, StyledBFCMHeading, StyledBFCMText, StyledBFCMTextContainer, StyledLogo } from './styles';

export default function App() {
	const { installType } = useConfigContext();

	return (
		<>
			<BelowToolbarFill>
				{ ( { page, dashboardId } ) =>
					dashboardId > 0 && page === 'view-dashboard' && (
						<>
							<StellarSale installType={ installType } />
							<BlackFridayCyberMondayBanner installType={ installType } />
						</>
					)
				}
			</BelowToolbarFill>
			{ installType === 'free' && (
				<EditCardsFill>
					<PromoCard title={ __( 'Trusted Devices', 'it-l10n-ithemes-security-pro' ) } />
					<PromoCard title={ __( 'Updates Summary', 'it-l10n-ithemes-security-pro' ) } />
					<PromoCard title={ __( 'User Security Profiles', 'it-l10n-ithemes-security-pro' ) } />
				</EditCardsFill>
			) }
		</>
	);
}

// November 26, 2024 UTC
const saleStart = Date.UTC( 2024, 10, 26, 0, 0, 0 );
// December 8, 2024 (inclusive of all US timezones)
const saleEnd = Date.UTC( 2024, 11, 9, 9, 59, 59 );

function BlackFridayCyberMondayBanner( { installType } ) {
	const [ isDismissed, setIsDismissed ] = useLocalStorage( 'solidSecurityBFCM2024' );
	const baseTheme = useTheme();
	const theme = useMemo( () => ( {
		...baseTheme,
		colors: {
			...baseTheme.colors,
			text: {
				...baseTheme.colors.text,
				white: '#F9FAF9',
			},
		},
	} ), [ baseTheme ] );

	if ( saleStart > Date.now() || saleEnd < Date.now() ) {
		return null;
	}

	if ( isDismissed ) {
		return null;
	}

	return (
		<ThemeProvider theme={ theme }>
			<StyledBFCMBanner>
				<StyledBFCMTextContainer>
					<StyledBFCMHeading
						level={ 2 }
						variant={ TextVariant.WHITE }
						weight={ TextWeight.HEAVY }
						text={ __( 'Save 40% on SolidWP', 'it-l10n-ithemes-security-pro' ) }
					/>
					<StyledBFCMText
						variant={ TextVariant.WHITE }
						text={ __( 'Purchase new products during the Black Friday Sale.' ) }
					/>
					<StyledBFCMButton
						href={ installType === 'free' ? 'https://go.solidwp.com/bfcm24-go-pro' : 'https://go.solidwp.com/bfcm24-solid-security-pro-get-solid-suite' }
						weight={ 500 }
					>
						{ __( 'Get Solid Suite', 'it-l10n-ithemes-security-pro' ) }
					</StyledBFCMButton>
				</StyledBFCMTextContainer>
				<StyledBFCMDismiss
					label={ __( 'Dismiss', 'it-l10n-ithemes-security-pro' ) }
					icon={ dismissIcon }
					onClick={ () => setIsDismissed( true ) }
				/>
				<StyledLogo />
			</StyledBFCMBanner>
		</ThemeProvider>
	);
}
