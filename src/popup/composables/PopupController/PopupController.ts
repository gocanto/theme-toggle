import { computed, ref } from 'vue';
import type { TimedStatus } from '@composables/TimedStatus';
import type { Settings, SettingsPatch, ThemeMode } from '@/types/settings';
import { DEFAULT_SETTINGS, migrateSettings } from '@/types/settings';
import { isExtensionRuntimeAvailable, queryActiveTab } from '@composables/PopupController/chromeRuntime';
import { buildPopupState, canInjectIntoTab, getActiveHost } from '@composables/PopupController/popupState';
import { applySettingsToActiveTab, getState, mergeSettingsPatch, readSettings } from '@composables/PopupController/settingsFlow';

/** Coordinates popup UI state with Chrome extension runtime state. */
export class PopupController {
	readonly activeTabId = ref<number | null>(null);

	readonly activeTabUrl = ref('');

	readonly currentState = ref(buildPopupState(DEFAULT_SETTINGS, this.activeTabUrl.value));

	readonly settings = computed(() => this.currentState.value.settings);

	readonly isExtensionRuntime = computed(() => isExtensionRuntimeAvailable());

	readonly hostLabel = computed(() => this.currentState.value.host || 'Preview mode');

	readonly siteActionLabel = computed(() => (this.currentState.value.siteEnabled ? 'Disable here' : 'Enable here'));

	constructor(private readonly status: TimedStatus) {}

	/** Runtime context required by popup settings operations. */
	private get runtimeContext() {
		return {
			activeTabId: this.activeTabId.value,
			activeTabUrl: this.activeTabUrl.value,
			isExtensionRuntime: this.isExtensionRuntime.value,
		};
	}

	/** Return the normalized host for the active tab. */
	getActiveHost() {
		return getActiveHost(this.activeTabUrl.value);
	}

	/** Check whether the active tab can receive the extension content script. */
	canInjectIntoTab() {
		return canInjectIntoTab(this.activeTabUrl.value);
	}

	/** Build popup state for the current active tab URL. */
	buildState(nextSettings: Settings) {
		return buildPopupState(nextSettings, this.activeTabUrl.value);
	}

	/** Read normalized extension settings. */
	readSettings() {
		return readSettings(this.isExtensionRuntime.value);
	}

	/** Apply settings to the active tab and persist when needed. */
	applySettingsToActiveTab(nextSettings: Settings) {
		return applySettingsToActiveTab(this.runtimeContext, nextSettings);
	}

	/** Read popup state from the active tab or persisted settings. */
	getState() {
		return getState(this.runtimeContext);
	}

	/** Merge and save a settings patch. */
	async patchSettings(patch: SettingsPatch, message = 'Saved') {
		const existing = this.currentState.value.settings || (await this.readSettings());

		const nextSettings = mergeSettingsPatch(existing, patch);

		this.currentState.value = await this.applySettingsToActiveTab(nextSettings);

		this.status.set(message);
	}

	/** Replace all settings with a normalized settings object. */
	async replaceSettings(nextSettings: Settings, message = 'Saved') {
		const normalizedSettings = migrateSettings(nextSettings);

		this.currentState.value = await this.applySettingsToActiveTab(normalizedSettings);

		this.status.set(message);
	}

	/** Select a theme mode and ensure the active site is enabled. */
	async selectMode(mode: ThemeMode) {
		const host = this.currentState.value.host || this.getActiveHost();
		const siteOverrides = { ...this.currentState.value.settings.siteOverrides };

		if (host) {
			siteOverrides[host] = true;
		}

		await this.patchSettings({ mode, siteOverrides }, 'Saved');
	}

	/** Toggle the extension override for the current host. */
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

	/** Restore default settings. */
	async resetSettings() {
		await this.replaceSettings(DEFAULT_SETTINGS, 'Reset');
	}

	/** Render an unexpected or typed runtime failure in the popup status. */
	showError(error: unknown) {
		console.error(error);
		this.status.set(error instanceof Error ? error.message : 'Unavailable');
	}

	/** Initialize popup state from the current runtime context. */
	async init() {
		if (!this.isExtensionRuntime.value) {
			this.currentState.value = this.buildState(DEFAULT_SETTINGS);

			return;
		}

		const activeTab = await queryActiveTab();

		this.activeTabId.value = activeTab.id;
		this.activeTabUrl.value = activeTab.url;

		const state = await this.getState();

		if (state._tag === 'ok') {
			this.currentState.value = state.value;

			return;
		}

		{
			this.currentState.value = this.buildState(await this.readSettings());

			this.showError(state.error);
		}
	}
}
