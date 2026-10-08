/**
 * WordPress dependencies
 */
import { __ } from '@wordpress/i18n';

/**
 * SolidWP dependencies
 */
import { Heading, Text, TextSize, TextWeight } from '@ithemes/ui';

/**
 * Internal dependencies
 */
import { HiResIcon } from '@ithemes/security-ui';
import { AllClearCard } from '@ithemes/security-style-guide';
import {
	StyledSurface,
	BodyContainer,
	StyledSection,
} from './styles';

export default function LockoutsAllClear() {
	return (
		<StyledSurface>
			<BodyContainer>
				<StyledSection>
					<Heading
						level={ 4 }
						size={ TextSize.NORMAL }
						weight={ TextWeight.HEAVY }
						text={ __( 'All Clear!', 'it-l10n-ithemes-security-pro' ) }
						align="center"
					/>
					<Text
						as="p"
						text={ __( 'No users are currently locked out of your site.', 'it-l10n-ithemes-security-pro' ) }
						align="center"
					/>
				</StyledSection>
				<HiResIcon icon={ <AllClearCard /> } isSmall />
			</BodyContainer>
		</StyledSurface>
	);
}
