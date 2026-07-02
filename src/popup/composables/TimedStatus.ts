import { ref } from 'vue';

/** Manages a temporary popup status message. */
export class TimedStatus {
	readonly status = ref('');

	private statusTimer: number | null = null;

	constructor(private readonly duration = 1500) {}

	/** Set a status message and clear it after the configured duration. */
	set(text: string) {
		this.status.value = text;
		if (this.statusTimer) {
			window.clearTimeout(this.statusTimer);
		}

		this.statusTimer = window.setTimeout(() => {
			this.status.value = '';
			this.statusTimer = null;
		}, this.duration);
	}

	/** Clear any pending status timeout. */
	dispose() {
		if (!this.statusTimer) {
			return;
		}

		window.clearTimeout(this.statusTimer);
		this.statusTimer = null;
	}
}
