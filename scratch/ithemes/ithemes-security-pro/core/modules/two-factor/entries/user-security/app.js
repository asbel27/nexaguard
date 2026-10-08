/**
 * External dependencies
 */
import { identity } from 'lodash';

/**
 * WordPress dependencies
 */
import { __ } from '@wordpress/i18n';
import { useSelect } from '@wordpress/data';

/**
 * SolidWP dependencies
 */
import { FiltersGroupDropdown } from '@ithemes/ui';

/**
 * Internal dependencies
 */
import { MODULES_STORE_NAME } from '@ithemes/security.packages.data';
import {
	EditingModalActionFill,
	EditingModalActionButton,
	UserSecurityFilterFill,
} from '@ithemes/security.pages.user-security';
import './style.scss';

export default function App() {
	const { protectUserGroup } = useSelect( ( select ) => ( {
		protectUserGroup: select( MODULES_STORE_NAME ).getSetting( 'two-factor', 'protect_user_group' ),
	} ), [] );

	return (
		<>
			<EditingModalActionFill>
				<EditingModalActionButton
					title={ __( 'Remind Users to Set Up Two-Factor Authentication', 'it-l10n-ithemes-security-pro' ) }
					description={ __( 'Send a reminder by email to prompt users to set up Two-Factor Authentication for increased login security.', 'it-l10n-ithemes-security-pro' ) }
					buttonText={ __( 'Send a Two-Factor Reminder Email', 'it-l10n-ithemes-security-pro' ) }
					slug="send-2fa-reminder"
					confirmationText={ __( 'Sending Two-Factor Reminder', 'it-l10n-ithemes-security-pro' ) }
				/>
			</EditingModalActionFill>
			<UserSecurityFilterFill>
				<FiltersGroupDropdown
					slug="solid_2fa"
					title={ __( 'Two Factor Authentication', 'it-l10n-ithemes-security-pro' ) }
					options={ [
						{ value: 'enabled', label: __( 'Has Enabled', 'it-l10n-ithemes-security-pro' ), summary: __( '2FA Enabled', 'it-l10n-ithemes-security-pro' ) },
						protectUserGroup?.length > 0 && { value: 'enforced-not-configured', label: __( 'Enforced, Not Configured', 'it-l10n-ithemes-security-pro' ), summary: __( '2FA Enforced', 'it-l10n-ithemes-security-pro' ) },
						{ value: 'not-enabled', label: __( 'Does Not Have Enabled', 'it-l10n-ithemes-security-pro' ), summary: __( '2FA Not Enabled', 'it-l10n-ithemes-security-pro' ) },
					].filter( identity ) }
				/>
			</UserSecurityFilterFill>
		</>
	);
}
