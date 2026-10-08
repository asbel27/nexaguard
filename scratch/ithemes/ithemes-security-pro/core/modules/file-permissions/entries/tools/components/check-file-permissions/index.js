/**
 * External dependencies
 */
import { map } from 'lodash';

/**
 * WordPress dependencies
 */
import { useSelect } from '@wordpress/data';
import { __ } from '@wordpress/i18n';

/**
 * SolidWP dependencies
 */
import { Text, TextSize } from '@ithemes/ui';

/**
 * Internal dependencies
 */
import { toolsStore } from '@ithemes/security.packages.data';
import {
	StyledCheckFilePermissionsToolTable,
	StyledCheckFilePermissionsToolTH,
	StyledFilePermissionsToolSurface,
} from './style';
import './style.scss';

export default function FilePermissions() {
	const { result } = useSelect( ( select ) => ( {
		result: select( toolsStore ).getLastResult( 'check-file-permissions' ),
	} ), [] );

	if ( ! result || ! result.isSuccess() ) {
		return null;
	}

	const header = (
		<tr>
			<StyledCheckFilePermissionsToolTH as="th" text={ __( 'Relative Path', 'it-l10n-ithemes-security-pro' ) } />
			<StyledCheckFilePermissionsToolTH as="th" text={ __( 'Suggestion', 'it-l10n-ithemes-security-pro' ) } />
			<StyledCheckFilePermissionsToolTH as="th" text={ __( 'Value', 'it-l10n-ithemes-security-pro' ) } />
			<StyledCheckFilePermissionsToolTH as="th" text={ __( 'Result', 'it-l10n-ithemes-security-pro' ) } />
			<StyledCheckFilePermissionsToolTH as="th" text={ __( 'Status', 'it-l10n-ithemes-security-pro' ) } />
		</tr>
	);

	return (
		<StyledFilePermissionsToolSurface className="itsec-check-file-permissions-results">
			<StyledCheckFilePermissionsToolTable>
				<thead>{ header }</thead>
				<tbody>
					{ map( result.data, ( row, path ) => (
						<tr key={ path }>
							<Text as="th" text={ row.path } />
							<Text as="td" text={ row.suggested } />
							<Text as="td" text={ row.actual } />
							<Text
								as="td"
								text={ row.actual === row.suggested
									? __( 'Ok', 'it-l10n-ithemes-security-pro' )
									: __( 'Warning', 'it-l10n-ithemes-security-pro' ) }
							/>
							<Text
								as="td"
								aria-hidden
							>
								<Text
									indicator={ row.actual === row.suggested
										? '#00BA37'
										: '#F4C520' }
									iconSize={ 20 }
									size={ TextSize.EXTRA_LARGE }
								/>
							</Text>
						</tr>
					) ) }
				</tbody>
			</StyledCheckFilePermissionsToolTable>
		</StyledFilePermissionsToolSurface>
	);
}
