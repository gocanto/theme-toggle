import type { ExtensionState, PopupMessage } from '@/types/settings';

export function isExtensionRuntimeAvailable() {
	return typeof chrome !== 'undefined' && Boolean(chrome.tabs && chrome.storage && chrome.scripting);
}

export async function queryActiveTab() {
	const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });

	return {
		id: tab?.id || null,
		url: tab?.url || '',
	};
}

export function sendToTab(tabId: number | null, message: PopupMessage) {
	return new Promise<ExtensionState>((resolve, reject) => {
		if (!tabId) {
			reject(new Error('No active tab'));

			return;
		}

		chrome.tabs.sendMessage(tabId, message, (response: ExtensionState) => {
			const error = chrome.runtime.lastError;

			if (error) {
				reject(new Error(error.message));

				return;
			}

			resolve(response);
		});
	});
}

export async function injectContentScript(tabId: number | null) {
	if (!tabId) {
		throw new Error('No active tab');
	}

	await chrome.scripting.executeScript({
		target: { tabId, allFrames: true },
		files: ['src/content.js'],
	});
}
