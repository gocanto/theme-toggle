import type { ExtensionState, Settings } from '@/types/settings';
import { DEFAULT_SETTINGS, EXTENSION_MESSAGE_SOURCE, migrateSettings } from '@/types/settings';
import { canInjectIntoTab, buildPopupState } from '@composables/PopupController/popupState';
import { injectContentScript, sendToTab } from '@composables/PopupController/chromeRuntime';

interface PopupRuntimeContext {
	activeTabId: number | null;
	activeTabUrl: string;
	isExtensionRuntime: boolean;
}

export async function readSettings(isExtensionRuntime: boolean) {
	if (!isExtensionRuntime) {
		return DEFAULT_SETTINGS;
	}

	const settings = await chrome.storage.sync.get(null);

	return migrateSettings(settings as Partial<Settings>);
}

export async function writeSettings(isExtensionRuntime: boolean, nextSettings: Settings) {
	if (!isExtensionRuntime) {
		return;
	}

	await chrome.storage.sync.set(nextSettings);
}

export function mergeSettingsPatch(existing: Settings, patch: Partial<Settings>) {
	return migrateSettings({
		...existing,
		...patch,
		siteOverrides: {
			...existing.siteOverrides,
			...(patch.siteOverrides || {}),
		},
	});
}

export async function applySettingsToActiveTab(context: PopupRuntimeContext, nextSettings: Settings): Promise<ExtensionState> {
	if (!context.isExtensionRuntime || !canInjectIntoTab(context.activeTabUrl)) {
		await writeSettings(context.isExtensionRuntime, nextSettings);

		return buildPopupState(nextSettings, context.activeTabUrl);
	}

	try {
		return await sendToTab(context.activeTabId, {
			source: EXTENSION_MESSAGE_SOURCE,
			type: 'set-settings',
			patch: nextSettings,
		});
	} catch {
		try {
			await injectContentScript(context.activeTabId);

			return await sendToTab(context.activeTabId, {
				source: EXTENSION_MESSAGE_SOURCE,
				type: 'set-settings',
				patch: nextSettings,
			});
		} catch {
			await writeSettings(context.isExtensionRuntime, nextSettings);

			return buildPopupState(nextSettings, context.activeTabUrl);
		}
	}
}

export async function getStateFromTab(context: PopupRuntimeContext) {
	try {
		return await sendToTab(context.activeTabId, { source: EXTENSION_MESSAGE_SOURCE, type: 'get-state' });
	} catch (error) {
		if (!canInjectIntoTab(context.activeTabUrl)) {
			throw error;
		}

		await injectContentScript(context.activeTabId);

		return sendToTab(context.activeTabId, { source: EXTENSION_MESSAGE_SOURCE, type: 'get-state' });
	}
}

export async function getState(context: PopupRuntimeContext) {
	if (context.isExtensionRuntime && canInjectIntoTab(context.activeTabUrl)) {
		return getStateFromTab(context);
	}

	return buildPopupState(await readSettings(context.isExtensionRuntime), context.activeTabUrl);
}
