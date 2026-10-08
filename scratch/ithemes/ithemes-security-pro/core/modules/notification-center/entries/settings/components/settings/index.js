/**
 * WordPress dependencies
 */
import { __ } from '@wordpress/i18n';
import { useState } from '@wordpress/element';

/**
 * Solid dependencies
 */
import { PageHeader } from '@ithemes/ui';

/**
 * Internal dependencies
 */
import { Save, SettingsForm } from '..';
import { StyledSettings } from './styles';

export default function Settings( {
	usersAndRoles,
	apiError,
} ) {
	const [ errors, setErrors ] = useState( [] );

	return (
		<>
			<StyledSettings>
				<PageHeader
					title={ __( 'Notifications', 'it-l10n-ithemes-security-pro' ) }
					description={ __(
						'Manage and configure email notifications sent by Solid Security related to various features.',
						'it-l10n-ithemes-security-pro'
					) }
					hasBorder
				/>
				<SettingsForm usersAndRoles={ usersAndRoles } errors={ errors } apiError={ apiError } hasPadding />
			</StyledSettings>
			<Save setErrors={ setErrors } />
		</>
	);
}
