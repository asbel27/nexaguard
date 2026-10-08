/**
 * Internal dependencies
 */
import ModalHeader from './header';
import Device from './device';
import ModalFooter from './footer';

export default function NewDevice( {
	canManage,
	device,
	hasGeolocation,
	hasMap,
	isFront,
	onDismiss,
	sendEmail,
} ) {
	return (
		<>
			<ModalHeader canManage={ canManage } />
			<Device
				device={ device }
				hasGeolocation={ hasGeolocation }
				hasMap={ hasMap }
				isFront={ isFront }
			/>
			<ModalFooter
				canManage={ canManage }
				isFront={ isFront }
				onDismiss={ onDismiss }
				sendEmail={ sendEmail }
			/>
		</>
	);
}
