/**
 * WordPress dependencies
 */
import { __ } from '@wordpress/i18n';

/**
 * Internal dependencies
 */
import { Page } from '../page-registration';
import SiteType from './site-type';
import { ModulesOfTypePage, SingleModulePage, TabbedModulesPage } from './configure';
import SecureSite from './secure-site';
import Summary from './summary';

export default function Pages() {
	return (
		<>
			<Page
				id="site-type"
				title={ __( 'Website', 'it-l10n-ithemes-security-pro' ) }
				priority={ 0 }
				roots={ [ 'onboard' ] }
			>
				{ () => <SiteType /> }
			</Page>
			<Page
				id="global"
				title={ __( 'Global Settings', 'it-l10n-ithemes-security-pro' ) }
				priority={ 4 }
				roots={ [ 'onboard', 'settings', 'import' ] }
			>
				{ () => <SingleModulePage module="global" /> }
			</Page>
			<Page
				id="configure"
				title={ __( 'Features', 'it-l10n-ithemes-security-pro' ) }
				priority={ 6 }
				roots={ [ 'onboard', 'settings', 'import' ] }
			>
				{ () => <TabbedModulesPage exclude={ [ 'advanced' ] } /> }
			</Page>

			<Page
				id="advanced"
				title={ __( 'Advanced', 'it-l10n-ithemes-security-pro' ) }
				priority={ 25 }
				roots={ [ 'settings' ] }
			>
				{
					() => (
						<ModulesOfTypePage
							type="advanced"
							title={ __( 'Advanced', 'it-l10n-ithemes-security-pro' ) }
							description={ __( 'Configure advanced Solid Security settings.', 'it-l10n-ithemes-security-pro' ) }
						/>
					)
				}
			</Page>
			<Page
				id="secure-site"
				title={ __( 'Secure Site', 'it-l10n-ithemes-security-pro' ) }
				priority={ 95 }
				roots={ [ 'onboard', 'import' ] }
				hideFromNav
			>
				{ () => <SecureSite /> }
			</Page>
			<Page
				id="summary"
				title={ __( 'Summary', 'it-l10n-ithemes-security-pro' ) }
				priority={ 100 }
				roots={ [ 'onboard', 'import' ] }
				hideFromNav
			>
				{ () => <Summary /> }
			</Page>
		</>
	);
}

export { default as Onboard } from './onboard';
export { default as Settings } from './settings';
export { default as Import } from './import';
