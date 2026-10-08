/**
 * WordPress dependencies
 */
import { __ } from '@wordpress/i18n';
import { useSelect } from '@wordpress/data';

/**
 * Solid dependencies
 */
import { PageHeader } from '@ithemes/ui';

/**
 * Internal dependencies
 */
import { OnboardHeader } from '@ithemes/security.pages.settings';
import { Markup } from '@ithemes/security-ui';
import { store as uiStore } from '@ithemes/security.user-groups.ui';
import { PageHeaderFill } from '../';
import { StyledPageWrapper } from './styles';

export default function OnboardPage( { module, children } ) {
	const { createdDefaultGroups } = useSelect( ( select ) => ( {
		createdDefaultGroups: select( uiStore ).hasCreatedDefaultGroups(),
	} ), [] );

	return (
		<StyledPageWrapper>
			<PageHeaderFill>
				<PageHeader
					title={
						createdDefaultGroups
							? __( 'Default User Groups', 'it-l10n-ithemes-security-pro' )
							: __( 'Custom User Groups', 'it-l10n-ithemes-security-pro' )
					}
					description={
						createdDefaultGroups
							? __( 'Click any default user group to edit its features or its members.', 'it-l10n-ithemes-security-pro' )
							: __( 'Create custom user groups for each set of users you want to have a different security policy.', 'it-l10n-ithemes-security-pro' )
					}
				/>
			</PageHeaderFill>
			<OnboardHeader
				title={ module.title }
				description={ <Markup content={ module.help } noWrap /> }
				showNext
				showIndicator
			/>
			{ children }
		</StyledPageWrapper>
	);
}
