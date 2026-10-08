/**
 * WordPress Dependencies
 */
import { __ } from '@wordpress/i18n';
import { useSelect } from '@wordpress/data';
import { Flex } from '@wordpress/components';

/**
 * iThemes Dependencies
 */
import { Heading, Text, TextSize, TextVariant, TextWeight } from '@ithemes/ui';

/**
 * Internal Dependencies
 */
import { MODULES_STORE_NAME } from '@ithemes/security.packages.data';
import { StyledImprovementsList, StyledImprovement } from './styles';

const improvements = [
	{
		text: __( 'User security strengthened', 'it-l10n-ithemes-security-pro' ),
		activeModules: [ 'two-factor', 'passwordless-login', 'fingerprinting' ],
	},
	{
		text: __( 'Brute force attacks blocked', 'it-l10n-ithemes-security-pro' ),
		activeModules: [ 'brute-force', 'network-brute-force', 'recaptcha' ],
	},
	{
		text: __( 'Scanning for vulnerable themes, plugins, and known malware', 'it-l10n-ithemes-security-pro' ),
		activeModules: [ 'malware-scheduling' ],
	},
	{
		text: __( 'Monitoring for suspicious file changes', 'it-l10n-ithemes-security-pro' ),
		activeModules: [ 'file-change' ],
	},
	{
		text: __( 'Banning bad bots and user agents', 'it-l10n-ithemes-security-pro' ),
		activeModules: [ 'ban-users' ],
	},
];

export default function Improvements() {
	const { allActiveModules } = useSelect( ( select ) => ( {
		allActiveModules: select( MODULES_STORE_NAME ).getActiveModules(),
	} ), [] );
	const enabledImprovements = improvements
		.filter( ( { activeModules } ) => activeModules.find(
			( activeModule ) => allActiveModules.includes( activeModule )
		) );

	if ( ! enabledImprovements.length ) {
		return null;
	}

	return (
		<Flex direction="column" gap={ 3 } justify="start" expanded={ false }>
			<Heading
				level={ 3 }
				size={ TextSize.LARGE }
				variant={ TextVariant.DARK }
				weight={ TextWeight.HEAVY }
				text={ __( 'Here are some notable improvements…', 'it-l10n-ithemes-security-pro' ) }
			/>
			<StyledImprovementsList>
				{ enabledImprovements.map( ( { text }, i ) => (
					<StyledImprovement key={ i }>
						<Text text={ text } />
					</StyledImprovement>
				) ) }
			</StyledImprovementsList>
		</Flex>
	);
}
