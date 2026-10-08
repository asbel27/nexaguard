/**
 * SolidWP dependencies
 */
import { BeforeImportExportToolsFill, ExportFill } from '@ithemes/security.pages.tools';

/**
 * Internal dependencies
 */
import ManageExports from './components/manage-exports';
import CreateExport from './pages/create-export';

export default function App() {
	return (
		<>
			<BeforeImportExportToolsFill>
				<ManageExports />
			</BeforeImportExportToolsFill>
			<ExportFill>
				<CreateExport />
			</ExportFill>
		</>
	);
}
