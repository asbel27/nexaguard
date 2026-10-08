/**
 * WordPress dependencies
 */
import { __, _n, sprintf } from '@wordpress/i18n';
import { dateI18n } from '@wordpress/date';
import { useViewportMatch } from '@wordpress/compose';
import { useState, useEffect } from '@wordpress/element';
import { useDispatch, useSelect } from '@wordpress/data';
import { Tooltip } from '@wordpress/components';

/**
 * SolidWP dependencies
 */
import {
	Button,
	Heading,
	Text,
	TextSize,
	TextVariant,
	TextWeight,
} from '@ithemes/ui';
import { Gear } from '@ithemes/security-style-guide';
import { HiResIcon } from '@ithemes/security-ui';
import { logsStore, modulesStore } from '@ithemes/security.packages.data';

/**
 * Internal dependencies
 */
import { getFlagEmoji, isApiError } from '@ithemes/security-utils';
import RuleProvider from '../rule-provider';
import LogsDetailModal from '../logs-detail-modal';
import {
	StyledLogsTable,
	StyledTableHeader,
	StyledSubheading,
	StyledSearchControl,
	StyledAction,
	StyledRule,
	StyledTableColumn,
	StyledCombinedColumn,
	StyledNoResultsContainer,
	StyledNotice,
	StyledEmptyState,
} from './styles';

const DEFAULT_QUERY = {
	module: [ 'firewall', 'lockout' ],
	code: [ 'BLOCK::%', 'host-lockout::%', 'host-triggered-blacklist' ],
	per_page: 20,
	_embed: 1,
};

export default function LogsTable() {
	const [ viewEntry, setViewEntry ] = useState( 0 );
	const { isQuerying, items, logStorageDuration } = useSelect(
		( select ) => ( {
			isQuerying: select( logsStore ).isQuerying( 'firewall' ),
			items: select( logsStore ).getQueryResults( 'firewall' ),
			logStorageDuration: select( modulesStore ).getSetting( 'global', 'log_rotation' ) ?? 60,
		} ),
		[]
	);
	const { query } = useDispatch( logsStore );
	useEffect( () => {
		query( 'firewall', DEFAULT_QUERY );
	}, [ query ] );

	const [ search, setSearch ] = useState( '' );
	const onSearch = () => query( 'firewall', { ...DEFAULT_QUERY, search } );
	const onSubmit = ( e ) => {
		e.preventDefault();
		onSearch();
	};

	const isSmall = useViewportMatch( 'medium', '<' );

	return (
		<StyledLogsTable>
			<StyledTableHeader>
				<Heading
					level={ 3 }
					size={ TextSize.LARGE }
					variant={ TextVariant.DARK }
					weight={ TextWeight.HEAVY }
					text={ __( 'Firewall Logs', 'it-l10n-ithemes-security-pro' ) }
				/>
				<StyledSubheading
					variant={ TextVariant.MUTED }
					text={ sprintf(
						/* translators: Number of days. */
						_n(
							'Firewall logs are stored for up to %d day and then archived.',
							'Firewall logs are stored for up to %d days and then archived.',
							logStorageDuration,
							'it-l10n-ithemes-security-pro'
						), logStorageDuration
					) }
				/>
				<form onSubmit={ onSubmit }>
					<StyledSearchControl
						label={ __( 'Search firewall logs', 'it-l10n-ithemes-security-pro' ) }
						value={ search }
						onChange={ setSearch }
						isSearching={ isQuerying }
						size="medium"
						placeholder={ __( 'Search by IP address or URL', 'it-l10n-ithemes-security-pro' ) }
						onSubmit={ onSearch }
					/>
				</form>
			</StyledTableHeader>
			<table className="itsec-firewall-logs-table">
				<thead>
					{ isSmall
						? (
							<tr>
								<th>{ __( 'Action & Origin', 'it-l10n-ithemes-security-pro' ) }</th>
								<th>{ __( 'Protected By', 'it-l10n-ithemes-security-pro' ) }</th>
							</tr>
						)
						: (
							<tr>
								<th>{ __( 'Action', 'it-l10n-ithemes-security-pro' ) }</th>
								<th>{ __( 'Rule', 'it-l10n-ithemes-security-pro' ) }</th>
								<th>{ __( 'Origin', 'it-l10n-ithemes-security-pro' ) }</th>
								<th>{ __( 'Date & Time', 'it-l10n-ithemes-security-pro' ) }</th>
								<th>{ __( 'Protected By', 'it-l10n-ithemes-security-pro' ) }</th>
							</tr>
						)
					}
				</thead>
				<tbody>
					{ isQuerying && (
						<tr>
							<td colSpan={ isSmall ? 2 : 5 }>
								<StyledNoResultsContainer>
									<StyledNotice text={ __( 'Data Loading', 'it-l10n-ithemes-security-pro' ) } />
								</StyledNoResultsContainer>
							</td>
						</tr>
					) }

					{ ( ! isQuerying && items.length > 0 ) &&
						( items.map( ( log ) => (
							<DynamicTableRow
								key={ log.id }
								log={ log }
								isSmall={ isSmall }
								viewEntry={ viewEntry }
								setViewEntry={ setViewEntry }
							/>
						) ) )
					}

					{ ! isQuerying && items.length === 0 && ( <EmptyState isSmall={ isSmall } /> ) }
				</tbody>
			</table>
		</StyledLogsTable>
	);
}

function DynamicTableRow( props ) {
	if ( props.log.module.raw === 'firewall' ) {
		return <FirewallTableRow { ...props } />;
	}

	if ( props.log.module.raw === 'lockout' ) {
		return <LockoutTableRow { ...props } />;
	}

	return null;
}

function FirewallTableRow( { log, isSmall, viewEntry, setViewEntry } ) {
	return (
		<LogsTableRow
			id={ log.id }
			action={ 'BLOCK' }
			actionText={ __( 'Block', 'it-l10n-ithemes-security-pro' ) }
			rule={ log._embedded?.[ 'ithemes-security:firewall-rule' ]?.[ 0 ].name }
			ip={ log.ip.raw }
			geolocation={ log._embedded?.[ 'ithemes-security:geolocate' ]?.[ 0 ] }
			date={ log.created_at }
			protectedBy={ log._embedded?.[ 'ithemes-security:firewall-rule' ]?.[ 0 ].provider }
			requestUrl={ log.url }
			requestMethod={ log.data.method }
			userAgent={ log.data.user_agent }
			isSmall={ isSmall }
			viewEntry={ viewEntry }
			setViewEntry={ setViewEntry }
		/>
	);
}

function LockoutTableRow( { log, isSmall, viewEntry, setViewEntry } ) {
	return (
		<LogsTableRow
			id={ log.id }
			action={ 'BLOCK' }
			actionText={ log.code.raw.code === 'host-triggered-blacklist'
				? __( 'Ban', 'it-l10n-ithemes-security-pro' )
				: __( 'Lockout', 'it-l10n-ithemes-security-pro' )
			}
			rule={ log.code.raw.code === 'host-triggered-blacklist'
				? __( 'Locked out too many times', 'it-l10n-ithemes-security-pro' )
				: ( log.data.module_details?.reason ?? log.data.module )
			}
			ip={ log.ip.raw }
			geolocation={ log._embedded?.[ 'ithemes-security:geolocate' ]?.[ 0 ] }
			date={ log.created_at }
			protectedBy={ 'solid' }
			requestUrl={ log.url }
			isSmall={ isSmall }
			viewEntry={ viewEntry }
			setViewEntry={ setViewEntry }
		/>
	);
}

function LogsTableRow( {
	id,
	actionText,
	action,
	rule,
	ip,
	geolocation,
	date,
	protectedBy,
	requestUrl,
	requestMethod,
	userAgent,
	isSmall,
	viewEntry,
	setViewEntry,
} ) {
	const flag = geolocation && ! isApiError( geolocation ) && (
		<Tooltip text={ geolocation.label }><span>{ getFlagEmoji( geolocation.country_code ) }{ ' ' }</span></Tooltip>
	);

	return (
		<tr>
			{ isSmall ? (
				<>
					<td>
						<StyledCombinedColumn>
							<StyledAction
								weight={ TextWeight.HEAVY }
								action={ action }
								text={ actionText }
								textTransform="uppercase"
							/>
							{ flag }
							{ ip }
						</StyledCombinedColumn>
					</td>
					<td>
						<StyledTableColumn>
							<RuleProvider provider={ protectedBy } />
							<Button text={ __( 'Details', 'it-l10n-ithemes-security-pro' ) } />
						</StyledTableColumn>
					</td>
				</>
			) : (
				<>
					<StyledAction
						as="td"
						action={ action }
						weight={ TextWeight.HEAVY }
						text={ actionText }
						textTransform="uppercase"
					/>
					<StyledRule as="td">
						{ rule || __( 'Unknown rule', 'it-l10n-ithemes-security-pro' ) }
					</StyledRule>
					<td>
						{ flag }
						{ ip }
					</td>

					<td>{ dateI18n( 'M d, Y - g:i:s', date ) }</td>
					<td>
						<StyledTableColumn>
							<RuleProvider provider={ protectedBy } />
							<Button
								aria-pressed={ viewEntry === id }
								onClick={ () => setViewEntry( id ) }
								text={ __( 'Details', 'it-l10n-ithemes-security-pro' ) }
							/>
						</StyledTableColumn>
					</td>
				</>
			) }
			{ viewEntry === id && (
				<LogsDetailModal
					actionText={ actionText }
					rule={ rule }
					ip={ ip }
					geolocation={ geolocation }
					date={ date }
					requestUrl={ requestUrl }
					requestMethod={ requestMethod }
					userAgent={ userAgent }
					onRequestClose={ () => setViewEntry( 0 ) }
				/>
			) }
		</tr>
	);
}

function EmptyState( { isSmall } ) {
	const { logTypeFile } = useSelect( ( select ) => ( {
		logTypeFile: select( modulesStore ).getSetting( 'global', 'log_type' ) === 'file',
	} ), [] );
	return (
		<tr>
			<td colSpan={ isSmall ? 2 : 5 }>
				{ logTypeFile ? (
					<StyledNoResultsContainer>
						<StyledNotice text={ __( 'To view logs inside Solid Security, you must enable database logging in Global Settings.', 'it-l10n-ithemes-security-pro' ) } />
					</StyledNoResultsContainer>
				) : (
					<StyledEmptyState>
						<HiResIcon icon={ <Gear /> } />
						<Text text={ __( 'We haven’t logged any activity yet.', 'it-l10n-ithemes-security-pro' ) } />
					</StyledEmptyState>
				) }
			</td>
		</tr>
	);
}
