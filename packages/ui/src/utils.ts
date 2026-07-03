import { type ClassValue, clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

/** Merge conditional class lists and resolve Tailwind conflicts (shadcn-vue convention). */
export function cn(...inputs: ClassValue[]) {
	return twMerge(clsx(inputs));
}
