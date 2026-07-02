import { ok, type Result } from '@lib/result';
import type { ExtensionState, Settings, SettingsPatch } from '@/types/settings';
import { DEFAULT_SETTINGS, EXTENSION_MESSAGE_SOURCE, migrateSettings } from '@/types/settings';
import { canInjectIntoTab, buildPopupState } from '@composables/PopupController/popupState';
import { injectContentScript, sendToTab, type PopupRuntimeError } from '@composables/PopupController/chromeRuntime';

interface PopupRuntimeContext {
	activeTabId: number | null;
	activeTabUrl: string;
	isExtensionRuntime: boolean;
}

/** Read normalized extension settings from Chrome storage or defaults. */
export async function readSettings(isExtensionRuntime: boolean) {
	if (!isExtensionRuntime) {
		return DEFAULT_SETTINGS;
	}

	const settings = await chrome.storage.sync.get(null);

	return migrateSettings(settings);
}

/** Persist settings into Chrome storage when the extension runtime is available. */
export async function writeSettings(isExtensionRuntime: boolean, nextSettings: Settings) {
	if (!isExtensionRuntime) {
		return;
	}

	await chrome.storage.sync.set(nextSettings);
}

/** Merge a parsed settings patch into existing settings. */
export function mergeSettingsPatch(existing: Settings, patch: SettingsPatch) {
	return migrateSettings({
		...existing,
		...patch,
		siteOverrides: {
			...existing.siteOverrides,
			...(patch.siteOverrides || {}),
		},
	});
}

/** Apply settings to the active tab when possible, falling back to persisted settings. */
export async function applySettingsToActiveTab(context: PopupRuntimeContext, nextSettings: Settings): Promise<ExtensionState> {
	if (!context.isExtensionRuntime || !canInjectIntoTab(context.activeTabUrl)) {
		await writeSettings(context.isExtensionRuntime, nextSettings);

		return buildPopupState(nextSettings, context.activeTabUrl);
	}

	const message = {
		source: EXTENSION_MESSAGE_SOURCE,
		type: 'set-settings',
		patch: nextSettings,
	} satisfies Parameters<typeof sendToTab>[1];

	const firstAttempt = await sendToTab(context.activeTabId, message);

	if (firstAttempt._tag === 'ok') {
		return firstAttempt.value;
	}

	const injected = await injectContentScript(context.activeTabId);

	if (injected._tag === 'ok') {
		const secondAttempt = await sendToTab(context.activeTabId, message);

		if (secondAttempt._tag === 'ok') {
			return secondAttempt.value;
		}
	}

	await writeSettings(context.isExtensionRuntime, nextSettings);

	return buildPopupState(nextSettings, context.activeTabUrl);
}

/** Read extension state from the active tab, injecting the content script once if needed. */
export async function getStateFromTab(context: PopupRuntimeContext): Promise<Result<ExtensionState, PopupRuntimeError>> {
	const firstAttempt = await sendToTab(context.activeTabId, { source: EXTENSION_MESSAGE_SOURCE, type: 'get-state' });

	if (firstAttempt._tag === 'ok') {
		return firstAttempt;
	}

	if (!canInjectIntoTab(context.activeTabUrl)) {
		return firstAttempt;
	}

	const injected = await injectContentScript(context.activeTabId);

	if (injected._tag === 'err') {
		return injected;
	}

	return sendToTab(context.activeTabId, { source: EXTENSION_MESSAGE_SOURCE, type: 'get-state' });
}

/** Resolve popup state from the active tab or from persisted settings. */
export async function getState(context: PopupRuntimeContext): Promise<Result<ExtensionState, PopupRuntimeError>> {
	if (context.isExtensionRuntime && canInjectIntoTab(context.activeTabUrl)) {
		return getStateFromTab(context);
	}

	return ok(buildPopupState(await readSettings(context.isExtensionRuntime), context.activeTabUrl));
}
