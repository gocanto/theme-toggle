import { describe, expect, it } from 'vitest';
import { DEFAULT_SETTINGS, EXTENSION_MESSAGE_SOURCE } from '@/types/settings';
import { ContentScriptInjectionFailed, injectContentScript, NoActiveTab, sendToTab, TabMessageFailed, type ChromeRuntimeApi } from '@composables/PopupController/chromeRuntime';

describe('chrome runtime helpers', () => {
	it('returns parsed tab state for successful messages', async () => {
		const runtime = createRuntime({
			response: {
				settings: {
					...DEFAULT_SETTINGS,
					mode: 'soft',
				},
				host: 'example.com',
				active: true,
				siteEnabled: true,
			},
		});

		const result = await sendToTab(1, { source: EXTENSION_MESSAGE_SOURCE, type: 'get-state' }, runtime);

		expect(result).toEqual({
			_tag: 'ok',
			value: {
				settings: {
					...DEFAULT_SETTINGS,
					mode: 'soft',
				},
				host: 'example.com',
				active: true,
				siteEnabled: true,
			},
		});
	});

	it('returns typed message failures', async () => {
		const noTab = await sendToTab(null, { source: EXTENSION_MESSAGE_SOURCE, type: 'get-state' });

		const runtimeError = await sendToTab(1, { source: EXTENSION_MESSAGE_SOURCE, type: 'get-state' }, createRuntime({ lastErrorMessage: 'Receiving end does not exist' }));

		const invalidResponse = await sendToTab(1, { source: EXTENSION_MESSAGE_SOURCE, type: 'get-state' }, createRuntime({ response: null }));

		expect(noTab._tag).toBe('err');
		expect(noTab._tag === 'err' && noTab.error).toBeInstanceOf(NoActiveTab);
		expect(runtimeError._tag).toBe('err');
		expect(runtimeError._tag === 'err' && runtimeError.error).toBeInstanceOf(TabMessageFailed);
		expect(invalidResponse._tag).toBe('err');
		expect(invalidResponse._tag === 'err' && invalidResponse.error).toBeInstanceOf(TabMessageFailed);
	});

	it('returns typed injection results', async () => {
		const success = await injectContentScript(1, createRuntime({}));

		const noTab = await injectContentScript(null, createRuntime({}));

		const failed = await injectContentScript(1, createRuntime({ injectionError: new Error('blocked') }));

		expect(success).toEqual({ _tag: 'ok', value: undefined });
		expect(noTab._tag).toBe('err');
		expect(noTab._tag === 'err' && noTab.error).toBeInstanceOf(NoActiveTab);
		expect(failed._tag).toBe('err');
		expect(failed._tag === 'err' && failed.error).toBeInstanceOf(ContentScriptInjectionFailed);
	});
});

function createRuntime(options: { response?: unknown; lastErrorMessage?: string; injectionError?: Error }): ChromeRuntimeApi {
	return {
		runtime: {
			get lastError() {
				return options.lastErrorMessage === undefined ? undefined : { message: options.lastErrorMessage };
			},
		},
		tabs: {
			async query() {
				return [{ id: 1, url: 'https://example.com' }];
			},
			sendMessage(_tabId, _message, callback) {
				callback(options.response);
			},
		},
		scripting: {
			async executeScript() {
				if (options.injectionError) {
					throw options.injectionError;
				}
			},
		},
	};
}
