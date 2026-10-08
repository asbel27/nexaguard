/**
 * External dependencies
 */
import { get } from 'lodash';

/**
 * WordPress dependencies
 */
import { __, sprintf } from '@wordpress/i18n';
import { dateI18n } from '@wordpress/date';
import { useSelect, useDispatch } from '@wordpress/data';
import { decodeEntities } from '@wordpress/html-entities';

/**
 * iThemes dependencies
 */
import {
	Heading,
	Text,
	TextSize,
	TextWeight,
	TextVariant,
	SurfaceVariant,
} from '@ithemes/ui';

/**
 * Internal dependencies
 */
import {
	StyledDashboard,
	StyledDashboardHeader,
	StyledDashboardLink,
	StyledDashboardMeta,
	StyledDashboardActions,
	StyledDashboardAction,
} from './styles';

export default function Dashboard( {
	dashboard,
	currentUserId,
	close,
} ) {
	const { currentDashboard, isPrimary, isDeleting } = useSelect( ( select ) => ( {
		currentDashboard: select(
			'ithemes-security/dashboard'
		).getViewingDashboardId(),
		isPrimary:
			select( 'ithemes-security/dashboard' ).getPrimaryDashboard() ===
			dashboard.id,
		isDeleting: select( 'ithemes-security/dashboard' ).isDeletingDashboard(
			dashboard.id
		),
	} ), [ dashboard.id ] );
	const {
		viewDashboard,
		setPrimaryDashboard,
		deleteDashboard,
	} = useDispatch( 'ithemes-security/dashboard' );

	const title = decodeEntities( dashboard.label.rendered );
	const canDelete = dashboard.id !== currentDashboard &&
		! isPrimary &&
		currentUserId === dashboard.created_by;

	return (
		<StyledDashboard
			as="li"
			isDeleting={ isDeleting }
			variant={ SurfaceVariant.SECONDARY }
		>
			<StyledDashboardHeader>
				<Heading level={ 4 } size={ TextSize.NORMAL } weight={ TextWeight.HEAVY }>
					{ currentDashboard === dashboard.id ? (
						title
					) : (
						<StyledDashboardLink
							variant="link"
							onClick={ () => {
								viewDashboard( dashboard.id );
								close();
							} }
							text={ title }
						/>
					) }
				</Heading>
				{ isPrimary && (
					<Text
						variant={ TextVariant.MUTED }
						weight={ TextWeight.HEAVY }
						text={ __( '• Primary', 'it-l10n-ithemes-security-pro' ) }
					/>
				) }
			</StyledDashboardHeader>
			<StyledDashboardMeta>
				{ currentUserId !== dashboard.created_by && (
					<Text
						variant={ TextVariant.MUTED }
						text={ sprintf(
							/* translators: 1. A user's name. */
							__( 'Shared by %s', 'it-l10n-ithemes-security-pro' ),
							get(
								dashboard,
								[ '_embedded', 'author', 0, 'name' ],
								sprintf(
									/* translators: 1. A user ID. */
									__( 'User #%d', 'it-l10n-ithemes-security-pro' ),
									dashboard.created_by
								)
							)
						) }
					/>
				) }
				<Text
					variant={ TextVariant.MUTED }
					text={ sprintf(
						/* translators: 1. Formatted date. */
						__( 'Created on %s', 'it-l10n-ithemes-security-pro' ),
						dateI18n( 'M j, Y', dashboard.created_at )
					) }
				/>
			</StyledDashboardMeta>
			{ ( ! isPrimary || canDelete ) && (
				<StyledDashboardActions>
					{ ! isPrimary && (
						<StyledDashboardAction
							align="center"
							variant="tertiary"
							onClick={ () => setPrimaryDashboard( dashboard.id ) }
							text={ __( 'Make Primary', 'it-l10n-ithemes-security-pro' ) }
						/>
					) }
					{ canDelete && (
						<StyledDashboardAction
							align="center"
							variant="tertiary"
							isDestructive
							onClick={ () => deleteDashboard( dashboard.id ) }
							text={ __( 'Delete', 'it-l10n-ithemes-security-pro' ) }
						/>
					) }
				</StyledDashboardActions>
			) }
		</StyledDashboard>
	);
}
