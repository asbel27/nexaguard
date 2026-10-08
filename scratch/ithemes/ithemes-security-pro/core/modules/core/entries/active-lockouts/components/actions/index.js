/**
 * WordPress dependencies
 */
import { Button } from '@wordpress/components';
import { __ } from '@wordpress/i18n';

/**
 * Internal dependencies
 */
import { FlexSpacer } from '@ithemes/security-components';
import { CardFooter } from '@ithemes/security.dashboard.dashboard';

export default function ActiveLockoutActions( {
	isReleaseAvailable,
	selectedId,
	releasingIds,
	onRelease,
	isBannable,
	banningIds,
	onBan,
} ) {
	return (
		<CardFooter>
			<FlexSpacer />
			{ isReleaseAvailable &&
				<span>
					<Button
						variant="primary"
						aria-disabled={ releasingIds.includes(
							selectedId
						) }
						isBusy={ releasingIds.includes( selectedId ) }
						onClick={ onRelease }
					>
						{ __( 'Release Lockout', 'it-l10n-ithemes-security-pro' ) }
					</Button>
				</span>
			}
			{ isBannable &&
				<span>
					<Button
						variant="primary"
						aria-disabled={ banningIds.includes(
							selectedId
						) }
						isBusy={ banningIds.includes( selectedId ) }
						onClick={ onBan }
					>
						{ __( 'Ban', 'it-l10n-ithemes-security-pro' ) }
					</Button>
				</span>
			}
		</CardFooter>
	);
}
