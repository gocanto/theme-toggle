import type { ExtensionState, Settings } from '@/types/settings';
import { normalizeHost } from '@/types/settings';

/** Extract a normalized host from a tab URL. */
export function getActiveHost(activeTabUrl: string) {
	if (!activeTabUrl) {
		return '';
	}

	try {
		const url = new URL(activeTabUrl);

		return normalizeHost(url.hostname || '');
	} catch {
		return '';
	}
}

/** Check whether a tab URL supports content-script injection. */
export function canInjectIntoTab(activeTabUrl: string) {
	if (!activeTabUrl) {
		return false;
	}

	try {
		const url = new URL(activeTabUrl);

		return url.protocol === 'http:' || url.protocol === 'https:';
	} catch {
		return false;
	}
}

/** Build popup state from settings and the active tab URL. */
export function buildPopupState(nextSettings: Settings, activeTabUrl: string): ExtensionState {
	const host = getActiveHost(activeTabUrl);
	const siteEnabled = nextSettings.siteOverrides?.[host] ?? true;

	return {
		settings: nextSettings,
		host,
		active: Boolean(nextSettings.enabled && siteEnabled),
		siteEnabled,
	};
}
