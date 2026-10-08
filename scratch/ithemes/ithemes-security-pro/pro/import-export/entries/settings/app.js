/**
 * External dependencies
 */
import { Link } from 'react-router-dom';

/**
 * WordPress dependencies
 */
import { useDispatch } from '@wordpress/data';
import { __ } from '@wordpress/i18n';
import { createInterpolateElement } from '@wordpress/element';

/**
 * Solid dependencies
 */
import { Notice, Text } from '@ithemes/ui';

/**
 * Internal dependencies
 */
import {
	ONBOARD_STORE_NAME,
	OnboardSiteTypeBeforeFill,
} from '@ithemes/security.pages.settings';
import { STORE_NAME } from '@ithemes/security.import-export.data';
import { useSingletonEffect } from '@ithemes/security-hocs';
import { Result } from '@ithemes/security-utils';
import { Import } from './pages';

export default function App() {
	useCompletionSteps();

	return (
		<>
			<Import />
			<OnboardSiteTypeBeforeFill>
				<OnboardImportLink />
			</OnboardSiteTypeBeforeFill>
		</>
	);
}

function OnboardImportLink() {
	return (
		<Notice
			text={
				<Text>
					{ createInterpolateElement(
						__(
							'Do you have Security settings you’d like to import? You can import settings from a WordPress site running Solid Security or an export file you downloaded. <a>Click here to import settings</a>.',
							'it-l10n-ithemes-security-pro'
						),
						{
							a: <Link to="/import" />,
						}
					) }
				</Text>
			}
		/>
	);
}

function useCompletionSteps() {
	const { registerCompletionStep } = useDispatch( ONBOARD_STORE_NAME );
	const { completeImport, resetImport, wpConnectReset } = useDispatch(
		STORE_NAME
	);
	useSingletonEffect( useCompletionSteps, () => {
		registerCompletionStep( {
			id: 'import',
			label: __( 'Complete Import', 'it-l10n-ithemes-security-pro' ),
			priority: 100,
			activeCallback( { root } ) {
				return root === 'import';
			},
			async callback() {
				const result = await completeImport();

				if ( result.type !== Result.SUCCESS ) {
					throw {
						code: result.error.getErrorCode(),
						message: result.error.getAllErrorMessages().join( ' ' ),
					};
				} else {
					await resetImport();
					await wpConnectReset();
				}
			},
		} );
	} );
}
