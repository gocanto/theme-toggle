/** Display modes supported by the extension. */
export type ThemeMode = 'smart' | 'invert' | 'soft';

/** Persisted user settings for the extension. */
export interface Settings {
	enabled: boolean;
	mode: ThemeMode;
	brightness: number;
	contrast: number;
	sepia: number;
	settingsVersion: number;
	siteOverrides: Record<string, boolean>;
}

/** Parsed settings fields that may be updated by UI, storage, or messages. */
export interface SettingsPatch {
	enabled?: boolean;
	mode?: ThemeMode;
	brightness?: number;
	contrast?: number;
	sepia?: number;
	settingsVersion?: number;
	siteOverrides?: Record<string, boolean>;
}

/** Current extension state rendered by the popup. */
export interface ExtensionState {
	settings: Settings;
	host: string;
	active: boolean;
	siteEnabled: boolean;
}

/** Default settings used when storage or messages omit fields. */
export const DEFAULT_SETTINGS = {
	enabled: true,
	mode: 'smart',
	brightness: 100,
	contrast: 92,
	sepia: 0,
	settingsVersion: 2,
	siteOverrides: {},
} satisfies Settings;

/** Stable message source used to ignore unrelated runtime messages. */
export const EXTENSION_MESSAGE_SOURCE = 'dark-mode-lite';

/** Runtime messages accepted by the popup/content-script boundary. */
export type PopupMessage =
	| { source: typeof EXTENSION_MESSAGE_SOURCE; type: 'get-state' }
	| { source: typeof EXTENSION_MESSAGE_SOURCE; type: 'set-settings'; patch: SettingsPatch }
	| { source: typeof EXTENSION_MESSAGE_SOURCE; type: 'toggle-site' };

/** Normalize a hostname for settings lookup. */
export function normalizeHost(host: string) {
	return host.replace(/^www\./, '');
}

/** Parse a theme mode from untrusted input. */
export function parseThemeMode(input: unknown): ThemeMode {
	if (input === 'smart' || input === 'invert' || input === 'soft') {
		return input;
	}

	return DEFAULT_SETTINGS.mode;
}

/** Parse untrusted settings into a normalized settings patch. */
export function parseSettingsPatch(input: unknown): SettingsPatch {
	if (!isRecord(input)) {
		return {};
	}

	const patch: SettingsPatch = {};

	if (typeof input.enabled === 'boolean') {
		patch.enabled = input.enabled;
	}

	if (typeof input.mode === 'string') {
		patch.mode = parseThemeMode(input.mode);
	}

	const brightness = parseNumberInRange(input.brightness, 50, 150);

	if (brightness !== undefined) {
		patch.brightness = brightness;
	}

	const contrast = parseNumberInRange(input.contrast, 50, 150);

	if (contrast !== undefined) {
		patch.contrast = contrast;
	}

	const sepia = parseNumberInRange(input.sepia, 0, 100);

	if (sepia !== undefined) {
		patch.sepia = sepia;
	}

	const settingsVersion = parseFiniteNumber(input.settingsVersion);

	if (settingsVersion !== undefined) {
		patch.settingsVersion = settingsVersion;
	}

	const siteOverrides = parseSiteOverrides(input.siteOverrides);

	if (siteOverrides !== undefined) {
		patch.siteOverrides = siteOverrides;
	}

	return patch;
}

/** Parse untrusted settings into a complete normalized settings object. */
export function parseSettings(input: unknown): Settings {
	const patch = parseSettingsPatch(input);

	const nextSettings: Settings = {
		...DEFAULT_SETTINGS,
		...patch,
		siteOverrides: {
			...DEFAULT_SETTINGS.siteOverrides,
			...(patch.siteOverrides ?? {}),
		},
	};

	if (isLegacyInvertSettings(input)) {
		nextSettings.mode = 'smart';
	}

	nextSettings.settingsVersion = DEFAULT_SETTINGS.settingsVersion;

	return nextSettings;
}

/** Migrate stored settings from older versions into the current settings shape. */
export function migrateSettings(storedSettings?: unknown): Settings {
	return parseSettings(storedSettings);
}

/** Parse an extension state response from an untrusted runtime message. */
export function parseExtensionState(input: unknown): ExtensionState | null {
	if (!isRecord(input)) {
		return null;
	}

	const settings = parseSettings(input.settings);
	const host = typeof input.host === 'string' ? normalizeHost(input.host) : '';
	const siteEnabled = typeof input.siteEnabled === 'boolean' ? input.siteEnabled : (settings.siteOverrides[host] ?? true);
	const active = typeof input.active === 'boolean' ? input.active : Boolean(settings.enabled && siteEnabled);

	return {
		settings,
		host,
		active,
		siteEnabled,
	};
}

/** Parse a popup/content-script message from untrusted runtime input. */
export function parsePopupMessage(input: unknown): PopupMessage | null {
	if (!isRecord(input) || input.source !== EXTENSION_MESSAGE_SOURCE) {
		return null;
	}

	if (input.type === 'get-state') {
		return { source: EXTENSION_MESSAGE_SOURCE, type: 'get-state' };
	}

	if (input.type === 'toggle-site') {
		return { source: EXTENSION_MESSAGE_SOURCE, type: 'toggle-site' };
	}

	if (input.type === 'set-settings') {
		return {
			source: EXTENSION_MESSAGE_SOURCE,
			type: 'set-settings',
			patch: parseSettingsPatch(input.patch),
		};
	}

	return null;
}

function isRecord(input: unknown): input is Record<string, unknown> {
	return typeof input === 'object' && input !== null && !Array.isArray(input);
}

function parseFiniteNumber(input: unknown): number | undefined {
	if (typeof input !== 'number' || !Number.isFinite(input)) {
		return undefined;
	}

	return input;
}

function parseNumberInRange(input: unknown, min: number, max: number): number | undefined {
	const number = parseFiniteNumber(input);

	if (number === undefined) {
		return undefined;
	}

	return Math.min(max, Math.max(min, number));
}

function parseSiteOverrides(input: unknown): Record<string, boolean> | undefined {
	if (!isRecord(input)) {
		return undefined;
	}

	const siteOverrides: Record<string, boolean> = {};

	for (const [host, enabled] of Object.entries(input)) {
		if (typeof enabled === 'boolean') {
			siteOverrides[normalizeHost(host)] = enabled;
		}
	}

	return siteOverrides;
}

function isLegacyInvertSettings(input: unknown) {
	if (!isRecord(input)) {
		return false;
	}

	return !parseFiniteNumber(input.settingsVersion) && input.mode === 'invert';
}
