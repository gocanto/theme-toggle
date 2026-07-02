import { computed, ref } from 'vue';
import type { TimedStatus } from '@composables/TimedStatus';
import type { Settings, ThemeMode } from '@/types/settings';
import { DEFAULT_SETTINGS, migrateSettings } from '@/types/settings';
import { isExtensionRuntimeAvailable, queryActiveTab } from '@composables/PopupController/chromeRuntime';
import { buildPopupState, canInjectIntoTab, getActiveHost } from '@composables/PopupController/popupState';
import { applySettingsToActiveTab, getState, mergeSettingsPatch, readSettings } from '@composables/PopupController/settingsFlow';

export class PopupController {
	readonly activeTabId = ref<number | null>(null);

	readonly activeTabUrl = ref('');

	readonly currentState = ref(buildPopupState(DEFAULT_SETTINGS, this.activeTabUrl.value));

	readonly settings = computed(() => this.currentState.value.settings);

	readonly isExtensionRuntime = computed(() => isExtensionRuntimeAvailable());

	readonly hostLabel = computed(() => this.currentState.value.host || 'Preview mode');

	readonly siteActionLabel = computed(() => (this.currentState.value.siteEnabled ? 'Disable here' : 'Enable here'));

	constructor(private readonly status: TimedStatus) {}

	private get runtimeContext() {
		return {
			activeTabId: this.activeTabId.value,
			activeTabUrl: this.activeTabUrl.value,
			isExtensionRuntime: this.isExtensionRuntime.value,
		};
	}

	getActiveHost() {
		return getActiveHost(this.activeTabUrl.value);
	}

	canInjectIntoTab() {
		return canInjectIntoTab(this.activeTabUrl.value);
	}

	buildState(nextSettings: Settings) {
		return buildPopupState(nextSettings, this.activeTabUrl.value);
	}

	readSettings() {
		return readSettings(this.isExtensionRuntime.value);
	}

	applySettingsToActiveTab(nextSettings: Settings) {
		return applySettingsToActiveTab(this.runtimeContext, nextSettings);
	}

	getState() {
		return getState(this.runtimeContext);
	}

	async patchSettings(patch: Partial<Settings>, message = 'Saved') {
		const existing = this.currentState.value.settings || (await this.readSettings());

		const nextSettings = mergeSettingsPatch(existing, patch);

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

		const activeTab = await queryActiveTab();

		this.activeTabId.value = activeTab.id;
		this.activeTabUrl.value = activeTab.url;

		try {
			this.currentState.value = await this.getState();
		} catch (error) {
			this.currentState.value = this.buildState(await this.readSettings());

			this.showError(error);
		}
	}
}
