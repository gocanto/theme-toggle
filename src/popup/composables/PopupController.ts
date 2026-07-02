import { computed, ref } from 'vue';
import { DEFAULT_SETTINGS, type ExtensionState, type PopupMessage, type Settings, type ThemeMode, migrateSettings, normalizeHost } from '@/types/settings';
import type { TimedStatus } from './TimedStatus';

export class PopupController {
	readonly activeTabId = ref<number | null>(null);

	readonly activeTabUrl = ref('');

	readonly currentState = ref<ExtensionState>(this.buildState(DEFAULT_SETTINGS));

	readonly settings = computed(() => this.currentState.value.settings);

	readonly isExtensionRuntime = computed(() => typeof chrome !== 'undefined' && Boolean(chrome.tabs && chrome.storage && chrome.scripting));

	readonly hostLabel = computed(() => this.currentState.value.host || 'Preview mode');

	readonly siteActionLabel = computed(() => (this.currentState.value.siteEnabled ? 'Disable here' : 'Enable here'));

	constructor(private readonly status: TimedStatus) {}

	getActiveHost() {
		if (!this.activeTabUrl.value) {
			return '';
		}

		try {
			const url = new URL(this.activeTabUrl.value);

			return normalizeHost(url.hostname || '');
		} catch {
			return '';
		}
	}

	canInjectIntoTab() {
		if (!this.activeTabUrl.value) {
			return false;
		}

		try {
			const url = new URL(this.activeTabUrl.value);

			return url.protocol === 'http:' || url.protocol === 'https:';
		} catch {
			return false;
		}
	}

	buildState(nextSettings: Settings): ExtensionState {
		const host = this.getActiveHost();
		const siteEnabled = nextSettings.siteOverrides?.[host] ?? true;

		return {
			settings: nextSettings,
			host,
			active: Boolean(nextSettings.enabled && siteEnabled),
			siteEnabled,
		};
	}

	sendToTab(message: PopupMessage) {
		return new Promise<ExtensionState>((resolve, reject) => {
			if (!this.activeTabId.value) {
				reject(new Error('No active tab'));

				return;
			}

			chrome.tabs.sendMessage(this.activeTabId.value, message, (response: ExtensionState) => {
				const error = chrome.runtime.lastError;

				if (error) {
					reject(new Error(error.message));

					return;
				}

				resolve(response);
			});
		});
	}

	async injectContentScript() {
		if (!this.activeTabId.value) {
			throw new Error('No active tab');
		}

		await chrome.scripting.executeScript({
			target: { tabId: this.activeTabId.value, allFrames: true },
			files: ['src/content.js'],
		});
	}

	async readSettings() {
		if (!this.isExtensionRuntime.value) {
			return DEFAULT_SETTINGS;
		}

		const settings = await chrome.storage.sync.get(null);

		return migrateSettings(settings as Partial<Settings>);
	}

	async writeSettings(nextSettings: Settings) {
		if (!this.isExtensionRuntime.value) {
			return;
		}

		await chrome.storage.sync.set(nextSettings);
	}

	async applySettingsToActiveTab(nextSettings: Settings) {
		if (!this.isExtensionRuntime.value || !this.canInjectIntoTab()) {
			await this.writeSettings(nextSettings);

			return this.buildState(nextSettings);
		}

		try {
			return await this.sendToTab({
				source: 'personal-dark-mode-lite',
				type: 'set-settings',
				patch: nextSettings,
			});
		} catch {
			try {
				await this.injectContentScript();

				return await this.sendToTab({
					source: 'personal-dark-mode-lite',
					type: 'set-settings',
					patch: nextSettings,
				});
			} catch {
				await this.writeSettings(nextSettings);

				return this.buildState(nextSettings);
			}
		}
	}

	async getStateFromTab() {
		try {
			return await this.sendToTab({ source: 'personal-dark-mode-lite', type: 'get-state' });
		} catch (error) {
			if (!this.canInjectIntoTab()) {
				throw error;
			}

			await this.injectContentScript();

			return this.sendToTab({ source: 'personal-dark-mode-lite', type: 'get-state' });
		}
	}

	async getState() {
		if (this.isExtensionRuntime.value && this.canInjectIntoTab()) {
			return this.getStateFromTab();
		}

		return this.buildState(await this.readSettings());
	}

	async patchSettings(patch: Partial<Settings>, message = 'Saved') {
		const existing = this.currentState.value.settings || (await this.readSettings());

		const nextSettings = migrateSettings({
			...existing,
			...patch,
			siteOverrides: {
				...existing.siteOverrides,
				...(patch.siteOverrides || {}),
			},
		});

		this.currentState.value = await this.applySettingsToActiveTab(nextSettings);

		this.status.set(message);
	}

	async replaceSettings(nextSettings: Settings, message = 'Saved') {
		const normalizedSettings = migrateSettings(nextSettings);

		this.currentState.value = await this.applySettingsToActiveTab(normalizedSettings);

		this.status.set(message);
	}

	async selectMode(mode: ThemeMode) {
		const host = this.currentState.value.host || this.getActiveHost();
		const siteOverrides = { ...this.currentState.value.settings.siteOverrides };

		if (host) {
			siteOverrides[host] = true;
		}

		await this.patchSettings({ mode, siteOverrides }, 'Saved');
	}

	async toggleSite() {
		const host = this.currentState.value.host || this.getActiveHost();

		if (!host) {
			this.status.set('Open a website tab');

			return;
		}

		const siteEnabled = this.currentState.value.settings.siteOverrides?.[host] ?? true;

		await this.patchSettings(
			{
				siteOverrides: {
					...this.currentState.value.settings.siteOverrides,
					[host]: !siteEnabled,
				},
			},
			siteEnabled ? 'Disabled here' : 'Enabled here',
		);
	}

	async resetSettings() {
		await this.replaceSettings(DEFAULT_SETTINGS, 'Reset');
	}

	showError(error: unknown) {
		console.error(error);
		this.status.set(error instanceof Error ? error.message : 'Unavailable');
	}

	async init() {
		if (!this.isExtensionRuntime.value) {
			this.currentState.value = this.buildState(DEFAULT_SETTINGS);

			return;
		}

		const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });

		this.activeTabId.value = tab?.id || null;
		this.activeTabUrl.value = tab?.url || '';

		try {
			this.currentState.value = await this.getState();
		} catch (error) {
			this.currentState.value = this.buildState(await this.readSettings());

			this.showError(error);
		}
	}
}
