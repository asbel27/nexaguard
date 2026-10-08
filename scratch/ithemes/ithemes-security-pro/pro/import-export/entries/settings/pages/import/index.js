/**
 * External dependencies
 */
import { Switch, Route, useRouteMatch } from 'react-router-dom';
import styled from '@emotion/styled';

/**
 * WordPress dependencies
 */
import { __ } from '@wordpress/i18n';

/**
 * Internal dependencies
 */
import { Page } from '@ithemes/security.pages.settings';
import {
	SelectImport,
	WordPressConnect,
	WordPressSelect,
	WordPressCreate,
	ImportSummary,
} from '../';

const StyledWrapper = styled.div`
	width: 100%;
	max-width: 600px;
`;

export default function Import() {
	return (
		<Page
			id="select-export"
			title={ __( 'Select Export', 'it-l10n-ithemes-security-pro' ) }
			roots={ [ 'import' ] }
			priority={ 0 }
		>
			{ () => <Routes /> }
		</Page>
	);
}

function Routes() {
	const { path, url } = useRouteMatch();

	return (
		<StyledWrapper>
			<Switch>
				<Route
					path={ `${ path }/wordpress-create` }
					render={ () => <WordPressCreate baseUrl={ url } /> }
				/>
				<Route
					path={ `${ path }/wordpress-select` }
					render={ () => <WordPressSelect baseUrl={ url } /> }
				/>
				<Route
					path={ `${ path }/wordpress-connect` }
					render={ () => <WordPressConnect baseUrl={ url } /> }
				/>
				<Route
					path={ `${ path }/summary` }
					render={ () => <ImportSummary baseUrl={ url } /> }
				/>
				<Route
					path={ path }
					render={ () => <SelectImport baseUrl={ url } /> }
				/>
			</Switch>
		</StyledWrapper>
	);
}
