<script setup lang="ts">
import { Moon } from '@lucide/vue';
import { Switch } from '@components/ui/switch';

defineProps<{
	enabled: boolean;
	hostLabel: string;
}>();

const emit = defineEmits<{
	'update:enabled': [enabled: boolean];
}>();
</script>

<template>
	<header class="flex items-center justify-between gap-3">
		<div class="min-w-0">
			<div class="flex items-center gap-2">
				<Moon class="size-4 text-sky-300" aria-hidden="true" />
				<h1 class="truncate text-base font-semibold">Dark Mode Lite</h1>
			</div>
			<p class="mt-1 truncate text-xs text-muted-foreground">{{ hostLabel }}</p>
		</div>
		<Switch :checked="enabled" label="Enable extension globally" @update:checked="emit('update:enabled', $event)" />
	</header>
</template>
