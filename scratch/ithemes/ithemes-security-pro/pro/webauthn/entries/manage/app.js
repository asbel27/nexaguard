/**
 * External dependencies
 */
import styled from '@emotion/styled';

/**
 * WordPress dependencies
 */
import { __ } from '@wordpress/i18n';
import { useSelect, useDispatch } from '@wordpress/data';

/**
 * iThemes dependencies
 */
import { solidTheme, Root } from '@ithemes/ui';

/**
 * Internal dependencies
 */
import { isAvailable } from '@ithemes/security.webauthn.utils';
import { STORE_NAME } from './store';
import AddCredential from './screens/add-credential';
import Rename from './screens/rename';
import Overview from './screens/overview';
import ManageCredentials from './screens/manage-credentials';
import { NotAvailable } from './components';

const modifiedTheme = {
	...solidTheme,
	sizes: {
		...solidTheme.sizes,
		text: {
			...solidTheme.sizes.text,
			small: '0.75rem',
		},
	},
};

const StyledApp = styled.div`
  --wp-admin-theme-color: ${ ( { theme } ) => theme.colors.primary.base };
  --wp-admin-theme-color-darker-10: ${ ( { theme } ) => theme.colors.primary.darker10 };
  --wp-admin-theme-color-darker-20: ${ ( { theme } ) => theme.colors.primary.darker20 };
`;

export default function App( { onExit, onComplete, isRequested } ) {
	const { screen } = useSelect( ( select ) => ( {
		screen: select( STORE_NAME ).getScreen(),
		canRegisterPlatform: select( STORE_NAME ).canRegisterPlatformAuthenticator(),
	} ), [] );
	const { navigateTo } = useDispatch( STORE_NAME );

	if ( ! isAvailable() ) {
		return ( <NotAvailable /> );
	}

	const skipText = isRequested ? __( 'Back', 'it-l10n-ithemes-security-pro' ) : __( 'Skip Setup', 'it-l10n-ithemes-security-pro' );
	const onSkip = () => isRequested ? navigateTo( 'manage-credentials' ) : onExit();

	return (
		<Root theme={ modifiedTheme }>
			<StyledApp>
				{ screen === 'manage-credentials' && <ManageCredentials
					onAddNew={ () => navigateTo( 'add-credential' ) }
					onComplete={ onComplete || onExit }
				/> }
				{ screen === 'add-credential' && <AddCredential
					skipText={ skipText }
					onSkip={ onSkip }
					onContinue={ () => navigateTo( 'rename' ) }
				/> }
				{ screen === 'rename' && <Rename
					onContinue={ () => navigateTo( isRequested ? 'manage-credentials' : 'overview' ) }
				/> }
				{ screen === 'overview' && <Overview
					onManage={ () => navigateTo( 'manage-credentials' ) }
					onContinue={ onComplete || onExit }
				/> }
			</StyledApp>
		</Root>
	);
}
