import { err, ok, type Result } from '@lib/result';
import type { ExtensionState, PopupMessage } from '@/types/settings';
import { parseExtensionState } from '@/types/settings';

/** Minimal Chrome APIs used by the popup runtime adapter. */
export interface ChromeRuntimeApi {
	readonly tabs?: {
		query(options: chrome.tabs.QueryInfo): Promise<ReadonlyArray<{ readonly id?: number | undefined; readonly url?: string | undefined }>>;
		sendMessage(tabId: number, message: PopupMessage, callback: (response: unknown) => void): void;
	};
	readonly storage?: typeof chrome.storage;
	readonly scripting?: {
		executeScript(details: { target: { tabId: number; allFrames: boolean }; files: string[] }): Promise<unknown>;
	};
	readonly runtime?: {
		readonly lastError: chrome.runtime.LastError | undefined;
	};
}

/** Expected runtime failure when there is no active browser tab. */
export class NoActiveTab extends Error {
	readonly _tag = 'NoActiveTab';

	constructor() {
		super('No active tab');
	}
}

/** Expected runtime failure when a tab message cannot be delivered or parsed. */
export class TabMessageFailed extends Error {
	readonly _tag = 'TabMessageFailed';

	constructor(
		readonly reason: 'runtime-error' | 'invalid-response',
		readonly detail: unknown,
	) {
		super(reason === 'runtime-error' ? String(detail || 'Tab unavailable') : 'Invalid tab response');
	}
}

/** Expected runtime failure when the content script cannot be injected. */
export class ContentScriptInjectionFailed extends Error {
	readonly _tag = 'ContentScriptInjectionFailed';

	constructor(readonly detail: unknown) {
		super('Content script unavailable');
	}
}

/** Expected Chrome runtime failures handled by the popup controller. */
export type PopupRuntimeError = NoActiveTab | TabMessageFailed | ContentScriptInjectionFailed;

/** Check whether the required extension APIs are available. */
export function isExtensionRuntimeAvailable(runtime = getChromeRuntime()) {
	return Boolean(runtime?.tabs && runtime.storage && runtime.scripting);
}

/** Query the active tab from the current Chrome window. */
export async function queryActiveTab(runtime = getChromeRuntime()) {
	const [tab] = (await runtime?.tabs?.query({ active: true, currentWindow: true })) ?? [];

	return {
		id: tab?.id ?? null,
		url: tab?.url ?? '',
	};
}

/** Send a typed popup message to the active tab. */
export function sendToTab(tabId: number | null, message: PopupMessage, runtime = getChromeRuntime()): Promise<Result<ExtensionState, NoActiveTab | TabMessageFailed>> {
	return new Promise((resolve) => {
		if (!tabId) {
			resolve(err(new NoActiveTab()));

			return;
		}

		if (!runtime?.tabs) {
			resolve(err(new TabMessageFailed('runtime-error', 'Extension runtime unavailable')));

			return;
		}

		runtime.tabs.sendMessage(tabId, message, (response: unknown) => {
			const error = runtime.runtime?.lastError;

			if (error) {
				resolve(err(new TabMessageFailed('runtime-error', error.message)));

				return;
			}

			const state = parseExtensionState(response);

			if (!state) {
				resolve(err(new TabMessageFailed('invalid-response', response)));

				return;
			}

			resolve(ok(state));
		});
	});
}

/** Inject the extension content script into the active tab. */
export async function injectContentScript(tabId: number | null, runtime = getChromeRuntime()): Promise<Result<void, NoActiveTab | ContentScriptInjectionFailed>> {
	if (!tabId) {
		return err(new NoActiveTab());
	}

	try {
		await runtime?.scripting?.executeScript({
			target: { tabId, allFrames: true },
			files: ['src/content.js'],
		});

		return ok(undefined);
	} catch (error) {
		return err(new ContentScriptInjectionFailed(error));
	}
}

function getChromeRuntime(): ChromeRuntimeApi | undefined {
	return typeof chrome === 'undefined' ? undefined : chrome;
}
