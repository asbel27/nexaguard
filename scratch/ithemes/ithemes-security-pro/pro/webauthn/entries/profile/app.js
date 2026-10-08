/**
 * WordPress dependencies
 */
import { __ } from '@wordpress/i18n';
import { createInterpolateElement, useState, Fragment } from '@wordpress/element';
import { useSelect, useDispatch } from '@wordpress/data';

/**
 * SolidWP dependencies
 */
import {
	Button,
	TextSize,
	TextWeight,
	TextVariant,
	ShadowPortal,
} from '@ithemes/ui';

/**
 * Internal dependencies
 */
import { store, App as ManageCredentials, LearnMore } from '@ithemes/security.webauthn.manage';
import {
	StyledModal,
	StyledHeading,
	StyledTextContainer,
	StyledDevicesHeader,
	StyledCredentialList,
	StyledCredential,
} from './styles.js';
import './styles.scss';

const styleSheetIds = [ 'wp-components-css' ];

export default function App( { useShadow } ) {
	const [ isOpen, setIsOpen ] = useState( false );
	const [ isRequested, setIsRequested ] = useState( false );
	const { credentials } = useSelect( ( select ) => ( {
		credentials: select( store ).getCredentials(),
	} ), [ ] );

	const { navigateTo } = useDispatch( store );

	const onOpen = () => {
		if ( credentials.length > 0 ) {
			navigateTo( 'manage-credentials' );
			setIsRequested( true );
		} else {
			navigateTo( 'add-credential' );
			setIsRequested( false );
		}
		setIsOpen( true );
	};

	const Container = useShadow ? ShadowPortal : Fragment;
	const containerProps = useShadow ? { styleSheetIds, inherit: true } : {};

	return (
		<>
			<Container { ...containerProps }>
				<StyledTextContainer>
					<StyledHeading
						level={ 3 }
						size={ TextSize.LARGE }
						variant={ TextVariant.DARK }
						weight={ TextWeight.HEAVY }
						text={ __( 'Passkeys', 'it-l10n-ithemes-security-pro' ) }
					/>
					<p>
						{ createInterpolateElement(
							__( 'Passkeys <b>improve security</b> and <b>speed up the login process</b> by using authentication built into your device instead of passwords. This can mean biometrics like Face ID, Touch ID, or Windows Hello. If your device doesn’t have those capabilities, don’t worry, you can still use passkeys.', 'it-l10n-ithemes-security-pro' ),
							{
								b: <strong />,
							}
						) }
						{ __( ' Advanced users can also use external security keys like a YubiKey or Titan Key.', 'it-l10n-ithemes-security-pro' ) }
					</p>
					<p>
						{ __( 'When authenticating with a passkey, your personal information never leaves your device. Hackers can’t leak passkeys or trick you into sharing them.', 'it-l10n-ithemes-security-pro' ) }
						{ ' ' }
						<LearnMore textSize={ TextSize.NORMAL } />
					</p>

					{ credentials.length === 0 && (
						<Button
							variant="secondary"
							aria-expanded={ isOpen }
							onClick={ onOpen }
							text={ __( 'Setup Passkeys', 'it-l10n-ithemes-security-pro' ) }
						/>
					) }

					{ credentials.length > 0 && (
						<>
							<StyledDevicesHeader>
								<h4>{ __( 'Registered Passkeys', 'it-l10n-ithemes-security-pro' ) }</h4>
								<Button
									variant="secondary"
									aria-expanded={ isOpen }
									onClick={ onOpen }
									text={ __( 'Manage Passkeys', 'it-l10n-ithemes-security-pro' ) }
								/>
							</StyledDevicesHeader>
							<StyledCredentialList>
								{ credentials.map( ( credential ) => (
									<StyledCredential key={ credential.id } credential={ credential } as="li" />
								) ) }
							</StyledCredentialList>
						</>
					) }
				</StyledTextContainer>
			</Container>
			{ isOpen && (
				<StyledModal
					className="manage-passkeys-modal"
					onRequestClose={ () => setIsOpen( false ) }
					__experimentalHideHeader
					contentLabel={ __( 'Manage Passkeys', 'it-l10n-ithemes-security-pro' ) }
				>
					{ useShadow ? (
						<ShadowPortal styleSheetIds={ styleSheetIds }>
							<ManageCredentials onExit={ () => setIsOpen( false ) } isRequested={ isRequested } />
						</ShadowPortal>
					) : <ManageCredentials onExit={ () => setIsOpen( false ) } isRequested={ isRequested } /> }
				</StyledModal>
			) }
		</>
	);
}
