/**
 * External dependencies
 */
import styled from '@emotion/styled';

/**
 * WordPress dependencies.
 */
import { __ } from '@wordpress/i18n';
import { useDispatch, useSelect } from '@wordpress/data';

/**
 * SolidWP dependencies
 */
import {
	Surface,
	SurfaceVariant,
	Text,
	TextSize,
	TextVariant,
} from '@ithemes/ui';
import { DateRangeControl } from '@ithemes/security-ui';

/**
 * Internal dependencies
 */
import {
	CardHeader,
	CardHeaderTitle,
	CardFooterSchemaActions,
} from '@ithemes/security.dashboard.dashboard';
import { shortenNumber } from '@ithemes/security-utils';

const StyledSurface = styled( Surface )`
	display: flex;
	flex-direction: column;
	height: 100%;
`;

const StyledList = styled.ul`
	display: grid;
	grid-template-columns: 1fr 1fr;
	grid-row: auto;
	height: 100%;
	width: 100%;
	margin: 0 auto;
`;

const StyledListItem = styled.li`
	display: flex;
	align-items: center;
	flex-direction: column;
	justify-content: space-evenly;
	margin: 0;
	padding: 1rem;
	&:nth-child(1) {
		border-bottom: 1px solid ${ ( { theme } ) => theme.colors.border.normal };
		border-right: 1px solid ${ ( { theme } ) => theme.colors.border.normal };
	}
	&:nth-child(2) {
		border-bottom: 1px solid ${ ( { theme } ) => theme.colors.border.normal };
	}
	&:nth-child(3) {
		border-right: 1px solid ${ ( { theme } ) => theme.colors.border.normal };
	}
`;

function VersionManagement( { card, config } ) {
	const { period } = useSelect( ( select ) => ( {
		period: select( 'ithemes-security/dashboard' ).getDashboardCardQueryArgs( card.id )?.period ??
			config.query_args.period?.default,
	} ), [ card.id, config ] );

	const { queryDashboardCard } = useDispatch( 'ithemes-security/dashboard' );
	const boxes = [
		{
			label: __( 'WordPress Updates', 'it-l10n-ithemes-security-pro' ),
			textVariant: TextVariant.DARK,
			value: card.data.counts.core,
		},
		{
			label: __( 'Plugin Updates', 'it-l10n-ithemes-security-pro' ),
			textVariant: TextVariant.DARK,
			value: card.data.counts.plugin,
		},
		{
			label: __( 'Theme Updates', 'it-l10n-ithemes-security-pro' ),
			textVariant: TextVariant.DARK,
			value: card.data.counts.theme,
		},
		{
			label: __( 'Total Updates', 'it-l10n-ithemes-security-pro' ),
			textVariant: TextVariant.ACCENT,
			value: card.data.all,
		},
	];

	const onPeriodChange = ( newPeriod ) => {
		return queryDashboardCard( card.id, { period: newPeriod } );
	};

	return (
		<StyledSurface variant={ SurfaceVariant.PRIMARY }>
			<CardHeader>
				<CardHeaderTitle card={ card } config={ config } />
				<DateRangeControl value={ period } onChange={ onPeriodChange } />
			</CardHeader>
			<StyledList>
				{ boxes.map( ( box, i ) => (
					<StyledListItem key={ i }>
						<Text
							align="center"
							size={ TextSize.GIGANTIC }
							variant={ box.textVariant }
							text={ shortenNumber( box.value ) } />
						<Text
							align="center"
							weight={ 600 }
							variant={ box.textVariant }
							text={ box.label } />
					</StyledListItem>
				) ) }
			</StyledList>
			<CardFooterSchemaActions card={ card } />
		</StyledSurface>
	);
}

export const slug = 'version-management';
export const settings = {
	render: VersionManagement,
};
