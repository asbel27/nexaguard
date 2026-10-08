/**
 * Internal dependencies
 */
import ModalBody from './body';
import ModalFooter from './footer';

export default function UnrecognizedDevice( { canManage, onDismiss, sendEmail } ) {
	return (
		<>
			<ModalBody canManage={ canManage } />
			<ModalFooter onDismiss={ onDismiss } sendEmail={ sendEmail } />
		</>
	);
}
