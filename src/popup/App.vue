<script setup lang="ts">
import PopupFooter from '@popup/components/popup/PopupFooter.vue';
import PopupHeader from '@popup/components/popup/PopupHeader.vue';
import SiteControls from '@popup/components/popup/SiteControls.vue';
import ThemeAdjustments from '@popup/components/popup/ThemeAdjustments.vue';
import { usePopupController } from '@composables/usePopupController';
import type { Settings, ThemeMode } from '@/types/settings';

type ThemeAdjustmentKey = 'brightness' | 'contrast' | 'sepia';

type ThemeAdjustmentPatch = Partial<Pick<Settings, ThemeAdjustmentKey>>;

const { currentState, hostLabel, patchSettings, resetSettings, selectMode, settings, showError, siteActionLabel, status, toggleSite } = usePopupController();

function saveEnabled(enabled: boolean) {
	patchSettings({ enabled }).catch(showError);
}

function saveMode(mode: ThemeMode) {
	selectMode(mode).catch(showError);
}

function previewAdjustment(key: ThemeAdjustmentKey, value: number) {
	currentState.value.settings[key] = value;
}

function saveAdjustment(key: ThemeAdjustmentKey, value: number) {
	const patch: ThemeAdjustmentPatch = { [key]: value };

	patchSettings(patch).catch(showError);
}

function saveSiteToggle() {
	toggleSite().catch(showError);
}

function saveReset() {
	resetSettings().catch(showError);
}
</script>

<template>
	<main class="mx-auto grid w-80 gap-4 bg-background p-4 text-foreground">
		<PopupHeader :enabled="settings.enabled" :host-label="hostLabel" @update:enabled="saveEnabled" />
		<SiteControls
			:host="currentState.host"
			:selected-mode="settings.mode"
			:site-action-label="siteActionLabel"
			:site-enabled="currentState.siteEnabled"
			@select-mode="saveMode"
			@toggle-site="saveSiteToggle"
		/>
		<ThemeAdjustments :settings="settings" @preview="previewAdjustment" @commit="saveAdjustment" />
		<PopupFooter :status="status" @reset="saveReset" />
	</main>
</template>
