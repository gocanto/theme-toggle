<script setup lang="ts">
import { Primitive } from 'reka-ui';
import { type VariantProps, cva } from 'class-variance-authority';
import { type HTMLAttributes } from 'vue';
import { cn } from '@dml/ui/utils';

const buttonVariants = cva(
	'inline-flex shrink-0 items-center justify-center gap-2 rounded-md border border-transparent text-sm font-medium whitespace-nowrap transition-colors outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background disabled:pointer-events-none disabled:opacity-50 [&_svg]:size-4 [&_svg]:shrink-0',
	{
		variants: {
			variant: {
				default: 'bg-primary text-primary-foreground hover:bg-primary/90',
				secondary: 'bg-secondary text-secondary-foreground hover:bg-secondary/80',
				outline: 'border-border bg-background text-foreground hover:bg-accent hover:text-accent-foreground',
				ghost: 'text-foreground hover:bg-accent hover:text-accent-foreground',
			},
			size: {
				default: 'h-9 px-4',
				sm: 'h-8 px-2.5 text-xs',
				lg: 'h-11 px-6 text-base',
				icon: 'size-9 p-0',
			},
		},
		defaultVariants: {
			variant: 'default',
			size: 'default',
		},
	},
);

type ButtonVariants = VariantProps<typeof buttonVariants>;

const props = withDefaults(
	defineProps<{
		class?: HTMLAttributes['class'];
		variant?: ButtonVariants['variant'];
		size?: ButtonVariants['size'];
		as?: string;
		asChild?: boolean;
	}>(),
	{ as: 'button' },
);
</script>

<template>
	<Primitive :as="as" :as-child="asChild" :class="cn(buttonVariants({ variant, size }), props.class)">
		<slot />
	</Primitive>
</template>
