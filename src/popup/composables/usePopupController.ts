import { onMounted, onUnmounted } from 'vue';
import { PopupController } from '@composables/PopupController';
import { TimedStatus } from '@composables/TimedStatus';

export function usePopupController() {
	const statusController = new TimedStatus();
	const popupController = new PopupController(statusController);

	onMounted(() => {
		popupController.init().catch((error: unknown) => {
			popupController.showError(error);
		});
	});

	onUnmounted(() => {
		statusController.dispose();
	});

	return {
		currentState: popupController.currentState,
		hostLabel: popupController.hostLabel,
		patchSettings: popupController.patchSettings.bind(popupController),
		resetSettings: popupController.resetSettings.bind(popupController),
		selectMode: popupController.selectMode.bind(popupController),
		settings: popupController.settings,
		showError: popupController.showError.bind(popupController),
		siteActionLabel: popupController.siteActionLabel,
		status: statusController.status,
		toggleSite: popupController.toggleSite.bind(popupController),
	};
}
