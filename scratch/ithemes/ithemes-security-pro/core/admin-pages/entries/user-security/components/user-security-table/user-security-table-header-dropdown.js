/**
 * WordPress dependencies
 */
import { __ } from '@wordpress/i18n';
import { useDispatch } from '@wordpress/data';

import {
	chevronUp as chevronUpIcon,
	chevronDown as chevronDownIcon,
} from '@wordpress/icons';

/**
 * SolidWP dependencies
 */
import { TextSize, TextVariant } from '@ithemes/ui';

/**
 * Internal dependencies
 */
import {
	StyledButton, StyledCaretDropdownButton,
	StyledDropdown,
	StyledHeadingUserCheckboxOption,
	StyledTextUserCheckboxOption,
	StyledUserCheckboxDropdownContent,
} from './styles';
import { userSecurityStore } from '@ithemes/security.packages.data';

export function UserSecurityTableHeaderDropdown() {
	const { updateUserSelectionType } = useDispatch( userSecurityStore );

	return (
		<StyledDropdown
			popoverProps={ { placement: 'bottom-start' } }
			renderToggle={ ( { isOpen, onToggle } ) => (
				<StyledCaretDropdownButton
					variant="tertiary"
					onClick={ onToggle }
					aria-expanded={ isOpen }
					icon={ isOpen ? chevronUpIcon : chevronDownIcon }
					align="center"
				/>
			) }
			renderContent={ () =>
				<StyledUserCheckboxDropdownContent>
					<StyledHeadingUserCheckboxOption
						level={ 2 }
						size={ TextSize.LARGE }
						variant={ TextVariant.DARK }
						weight={ 600 }
						text={ __( 'User Selection', 'it-l10n-ithemes-security-pro' ) }
					/>
					<StyledTextUserCheckboxOption
						text={ __( 'Checkbox Options', 'it-l10n-ithemes-security-pro' ) }
						textTransform="uppercase"
						variant={ TextVariant.MUTED }
						size={ TextSize.SMALL }
					/>
					<StyledButton
						onClick={ () => {
							updateUserSelectionType( 'all' );
						} }
						text={ __( 'All', 'it-l10n-ithemes-security-pro' ) }
						variant="tertiary"
						align="left"
					/>
					<StyledButton
						onClick={ () => {
							updateUserSelectionType( 'window' );
						} }
						text={ __( 'Only this page', 'it-l10n-ithemes-security-pro' ) }
						variant="tertiary"
						align="left"
					/>
					<StyledButton
						onClick={ () => {
							updateUserSelectionType( 'none' );
						} }
						text={ __( 'None', 'it-l10n-ithemes-security-pro' ) }
						variant="tertiary"
						align="left"
					/>
				</StyledUserCheckboxDropdownContent>
			}
		/>
	);
}
