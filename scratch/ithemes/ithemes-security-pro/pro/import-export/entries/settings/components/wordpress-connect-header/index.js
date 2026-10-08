/**
 * External dependencies
 */
import { get, last, sortBy } from 'lodash';

/**
 * WordPress dependencies
 */
import { __, sprintf } from '@wordpress/i18n';
import { decodeEntities } from '@wordpress/html-entities';
import { useSelect } from '@wordpress/data';

/**
 * Solid dependencies
 */
import { Heading, Text, TextSize, TextVariant } from '@ithemes/ui';

/**
 * Internal dependencies
 */
import { STORE_NAME } from '@ithemes/security.import-export.data';
import {
	StyledWordPressConnectHeader,
	StyledSpinner,
	StyledLogo,
	StyledDetails,
} from './styles';

export default function ConnectingToHeader( { showSpinner, isConnected } ) {
	const { url, discovery } = useSelect(
		( select ) => ( {
			url: select( STORE_NAME ).getWpConnectSiteUrl(),
			discovery: select( STORE_NAME ).getWpConnectDiscoveryResult(),
		} ),
		[]
	);
	const home = get( discovery, [ 'data', 'index', 'home' ] );
	const name = get( discovery, [ 'data', 'index', 'name' ] );
	const image = get( discovery, [
		'data',
		'index',
		'_embedded',
		'wp:featuredmedia',
		0,
	] );
	const imageSize = image && getClosestSize( image, { width: 50 } );
	/* translators: 1. Site name. */
	const title = isConnected ? __( 'Connected to %s', 'it-l10n-ithemes-security-pro' ) : __( 'Connecting to %s', 'it-l10n-ithemes-security-pro' );

	return (
		<StyledWordPressConnectHeader>
			{ imageSize && (
				<StyledLogo
					src={ imageSize.source_url }
					height={ imageSize.height }
					width={ imageSize.width }
					alt={ image.alt_text }
				/>
			) }
			<StyledDetails>
				<Heading
					level={ 3 }
					variant={ TextVariant.DARK }
					size={ TextSize.NORMAL }
					text={ sprintf( title, home || url ) }
				/>
				{ name && (
					<Text
						variant={ TextVariant.MUTED }
						text={ decodeEntities( name ) }
					/>
				) }
			</StyledDetails>
			{ showSpinner && <StyledSpinner /> }
		</StyledWordPressConnectHeader>
	);
}

function getClosestSize( image, match ) {
	const property = match.width ? 'width' : 'height';
	const sorted = sortBy( image.media_details.sizes, property );

	for ( const size of sorted ) {
		if ( size[ property ] > match[ property ] ) {
			return size;
		}
	}

	if ( sorted.length ) {
		return last( sorted );
	}

	return {
		height: image.media_details.height || match.height,
		width: image.media_details.width || match.width,
		source_url: image.source_url,
	};
}
