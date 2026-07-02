<script setup lang="ts">
import { Ban, Check, MonitorCog } from '@lucide/vue';
import { Button } from '@components/ui/button';
import { cn } from '@lib/utils';
import type { ThemeMode } from '@/types/settings';

defineProps<{
	host: string;
	selectedMode: ThemeMode;
	siteActionLabel: string;
	siteEnabled: boolean;
}>();

const emit = defineEmits<{
	'select-mode': [mode: ThemeMode];
	'toggle-site': [];
}>();

const modes: Array<{ value: ThemeMode; label: string }> = [
	{ value: 'smart', label: 'Smart' },
	{ value: 'invert', label: 'Invert' },
	{ value: 'soft', label: 'Soft' },
];
</script>

<template>
	<section class="grid gap-3 rounded-md border border-border bg-card p-3">
		<div class="flex items-center justify-between gap-3">
			<div class="flex min-w-0 items-center gap-2">
				<MonitorCog class="size-4 text-emerald-300" aria-hidden="true" />
				<span class="truncate text-sm font-medium">Site</span>
			</div>
			<Button variant="outline" size="sm" :disabled="!host" @click="emit('toggle-site')">
				<component :is="siteEnabled ? Ban : Check" />
				{{ siteActionLabel }}
			</Button>
		</div>

		<div class="grid grid-cols-3 overflow-hidden rounded-md border border-border" role="group" aria-label="Mode">
			<Button
				v-for="mode in modes"
				:key="mode.value"
				:class="cn('h-8 rounded-none border-0 text-xs', selectedMode === mode.value && 'bg-primary text-primary-foreground hover:bg-primary/90')"
				:variant="selectedMode === mode.value ? 'default' : 'ghost'"
				@click="emit('select-mode', mode.value)"
			>
				{{ mode.label }}
			</Button>
		</div>
	</section>
</template>
