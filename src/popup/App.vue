<script setup lang="ts">
import { Ban, Check, MonitorCog, Moon, RotateCcw, Sparkles } from '@lucide/vue';
import { onMounted, onUnmounted } from 'vue';
import { Button } from '@/popup/components/ui/button';
import { Slider } from '@/popup/components/ui/slider';
import { Switch } from '@/popup/components/ui/switch';
import { PopupController } from '@/popup/composables/PopupController';
import { TimedStatus } from '@/popup/composables/TimedStatus';
import { cn } from '@/lib/utils';
import type { ThemeMode } from '@/types/settings';

const modes: Array<{ value: ThemeMode; label: string }> = [
	{ value: 'smart', label: 'Smart' },
	{ value: 'invert', label: 'Invert' },
	{ value: 'soft', label: 'Soft' },
];

const statusController = new TimedStatus();
const popupController = new PopupController(statusController);
const status = statusController.status;
const currentState = popupController.currentState;
const hostLabel = popupController.hostLabel;
const settings = popupController.settings;
const siteActionLabel = popupController.siteActionLabel;
const init = popupController.init.bind(popupController);
const patchSettings = popupController.patchSettings.bind(popupController);
const resetSettings = popupController.resetSettings.bind(popupController);
const selectMode = popupController.selectMode.bind(popupController);
const showError = popupController.showError.bind(popupController);
const toggleSite = popupController.toggleSite.bind(popupController);

onMounted(() => {
	init().catch(showError);
});

onUnmounted(() => {
	statusController.dispose();
});
</script>

<template>
	<main class="mx-auto grid w-80 gap-4 bg-background p-4 text-foreground">
		<header class="flex items-center justify-between gap-3">
			<div class="min-w-0">
				<div class="flex items-center gap-2">
					<Moon class="size-4 text-sky-300" aria-hidden="true" />
					<h1 class="truncate text-base font-semibold">Dark Mode Lite</h1>
				</div>
				<p class="mt-1 truncate text-xs text-muted-foreground">{{ hostLabel }}</p>
			</div>
			<Switch :checked="settings.enabled" label="Enable extension globally" @update:checked="patchSettings({ enabled: $event }).catch(showError)" />
		</header>

		<section class="grid gap-3 rounded-md border border-border bg-card p-3">
			<div class="flex items-center justify-between gap-3">
				<div class="flex min-w-0 items-center gap-2">
					<MonitorCog class="size-4 text-emerald-300" aria-hidden="true" />
					<span class="truncate text-sm font-medium">Site</span>
				</div>
				<Button variant="outline" size="sm" :disabled="!currentState.host" @click="toggleSite().catch(showError)">
					<component :is="currentState.siteEnabled ? Ban : Check" />
					{{ siteActionLabel }}
				</Button>
			</div>

			<div class="grid grid-cols-3 overflow-hidden rounded-md border border-border" role="group" aria-label="Mode">
				<Button
					v-for="mode in modes"
					:key="mode.value"
					:class="cn('h-8 rounded-none border-0 text-xs', settings.mode === mode.value && 'bg-primary text-primary-foreground hover:bg-primary/90')"
					:variant="settings.mode === mode.value ? 'default' : 'ghost'"
					@click="selectMode(mode.value).catch(showError)"
				>
					{{ mode.label }}
				</Button>
			</div>
		</section>

		<section class="grid gap-3 rounded-md border border-border bg-card p-3">
			<label class="grid gap-2">
				<span class="flex justify-between text-sm font-medium">
					Brightness
					<output class="text-muted-foreground">{{ settings.brightness }}%</output>
				</span>
				<Slider
					:model-value="settings.brightness"
					:min="50"
					:max="150"
					label="Brightness"
					@update:model-value="currentState.settings.brightness = $event"
					@commit="patchSettings({ brightness: $event }).catch(showError)"
				/>
			</label>

			<label class="grid gap-2">
				<span class="flex justify-between text-sm font-medium">
					Contrast
					<output class="text-muted-foreground">{{ settings.contrast }}%</output>
				</span>
				<Slider
					:model-value="settings.contrast"
					:min="50"
					:max="150"
					label="Contrast"
					@update:model-value="currentState.settings.contrast = $event"
					@commit="patchSettings({ contrast: $event }).catch(showError)"
				/>
			</label>

			<label class="grid gap-2">
				<span class="flex justify-between text-sm font-medium">
					Sepia
					<output class="text-muted-foreground">{{ settings.sepia }}%</output>
				</span>
				<Slider
					:model-value="settings.sepia"
					:min="0"
					:max="100"
					label="Sepia"
					@update:model-value="currentState.settings.sepia = $event"
					@commit="patchSettings({ sepia: $event }).catch(showError)"
				/>
			</label>
		</section>

		<footer class="flex min-h-8 items-center justify-between gap-3 border-t border-border pt-3">
			<Button variant="ghost" size="sm" title="Reset settings" @click="resetSettings().catch(showError)">
				<RotateCcw />
				Reset
			</Button>
			<span class="flex min-w-0 items-center gap-1 truncate text-xs text-muted-foreground" aria-live="polite">
				<Sparkles v-if="status" class="size-3" aria-hidden="true" />
				{{ status }}
			</span>
		</footer>

		<p class="text-center text-xs text-muted-foreground">
			Made with love ❤️ by
			<a class="font-medium text-foreground underline-offset-4 hover:underline" href="https://gocanto.sh" target="_blank"> gocanto.sh </a>
		</p>
	</main>
</template>
