<script setup lang="ts">
import { RotateCcw, Sparkles } from '@lucide/vue';
import { Button } from '@components/ui/button';

defineProps<{
	status: string;
}>();

const emit = defineEmits<{
	reset: [];
}>();
</script>

<template>
	<footer class="flex min-h-8 items-center justify-between gap-3">
		<Button variant="ghost" size="sm" title="Reset settings" @click="emit('reset')">
			<RotateCcw />
			Reset
		</Button>
		<span class="flex min-w-0 items-center gap-1 truncate text-xs text-muted-foreground" aria-live="polite">
			<Sparkles v-if="status" class="size-3" aria-hidden="true" />
			{{ status }}
		</span>
	</footer>

	<p class="border-t border-border pt-3 text-center text-xs text-muted-foreground">
		Made with love ❤️ by
		<a class="font-medium text-foreground underline-offset-4 hover:underline" href="https://gocanto.sh" target="_blank"> gocanto.sh </a>
	</p>
</template>
