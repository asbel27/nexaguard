/**
 * WordPress dependencies
 */
import { useDispatch, useSelect } from '@wordpress/data';
import { ToggleControl } from '@wordpress/components';
import { __ } from '@wordpress/i18n';

/**
 * SolidWP dependencies
 */
import { Badge } from '@ithemes/ui';
import { MODULES_STORE_NAME } from '@ithemes/security.packages.data';

/**
 * Internal dependencies
 */
import { StyledEnableScheduling } from './styles';

export default function EnableScheduling() {
	const { module } = useSelect( ( select ) => ( {
		module: select( MODULES_STORE_NAME ).getEditedModule( 'malware-scheduling' ),
	} ), [] );
	const { editModule } = useDispatch( MODULES_STORE_NAME );

	return (
		<StyledEnableScheduling>
			<ToggleControl
				label={ __( 'Scheduled Site Scan', 'it-l10n-ithemes-security-pro' ) }
				checked={ module.status.selected === 'active' } onChange={ ( checked ) => editModule( 'malware-scheduling', {
					status: {
						selected: checked ? 'active' : 'inactive',
					},
				} ) }
				__nextHasNoMarginBottom
			/>
			<Badge text={ __( 'Recommended Feature', 'it-l10n-ithemes-security-pro' ) } variant="infoAccent" />
		</StyledEnableScheduling>
	);
}
