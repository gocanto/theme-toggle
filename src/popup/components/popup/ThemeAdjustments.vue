<script setup lang="ts">
import { Slider } from '@components/ui/slider';
import type { Settings } from '@/types/settings';

type ThemeAdjustmentKey = 'brightness' | 'contrast' | 'sepia';

interface ThemeAdjustment {
	key: ThemeAdjustmentKey;
	label: string;
	max: number;
	min: number;
}

defineProps<{
	settings: Pick<Settings, ThemeAdjustmentKey>;
}>();

const emit = defineEmits<{
	commit: [key: ThemeAdjustmentKey, value: number];
	preview: [key: ThemeAdjustmentKey, value: number];
}>();

const adjustments: ThemeAdjustment[] = [
	{ key: 'brightness', label: 'Brightness', min: 50, max: 150 },
	{ key: 'contrast', label: 'Contrast', min: 50, max: 150 },
	{ key: 'sepia', label: 'Sepia', min: 0, max: 100 },
];
</script>

<template>
	<section class="grid gap-3 rounded-md border border-border bg-card p-3">
		<label v-for="adjustment in adjustments" :key="adjustment.key" class="grid gap-2">
			<span class="flex justify-between text-sm font-medium">
				{{ adjustment.label }}
				<output class="text-muted-foreground">{{ settings[adjustment.key] }}%</output>
			</span>
			<Slider
				:model-value="settings[adjustment.key]"
				:min="adjustment.min"
				:max="adjustment.max"
				:label="adjustment.label"
				@update:model-value="emit('preview', adjustment.key, $event)"
				@commit="emit('commit', adjustment.key, $event)"
			/>
		</label>
	</section>
</template>
