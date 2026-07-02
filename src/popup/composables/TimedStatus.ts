import { ref } from 'vue';

export class TimedStatus {
	readonly status = ref('');

	private statusTimer: number | null = null;

	constructor(private readonly duration = 1500) {}

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

	dispose() {
		if (!this.statusTimer) {
			return;
		}

		window.clearTimeout(this.statusTimer);
		this.statusTimer = null;
	}
}
