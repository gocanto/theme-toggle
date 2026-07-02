(() => {
	const SCRIPT_VERSION = 5;

	const loader = globalThis as typeof globalThis & {
		__DARK_MODE_LITE_LOADED__?: number;
	};

	if ((loader.__DARK_MODE_LITE_LOADED__ || 0) >= SCRIPT_VERSION) {
		return;
	}

	loader.__DARK_MODE_LITE_LOADED__ = SCRIPT_VERSION;

	type ThemeMode = 'smart' | 'invert' | 'soft';

	interface Settings {
		enabled: boolean;
		mode: ThemeMode;
		brightness: number;
		contrast: number;
		sepia: number;
		settingsVersion: number;
		siteOverrides: Record<string, boolean>;
	}

	interface SettingsPatch {
		enabled?: boolean;
		mode?: ThemeMode;
		brightness?: number;
		contrast?: number;
		sepia?: number;
		settingsVersion?: number;
		siteOverrides?: Record<string, boolean>;
	}

	interface ExtensionState {
		settings: Settings;
		host: string;
		active: boolean;
		siteEnabled: boolean;
	}

	type PopupMessage =
		| { source: typeof MESSAGE_SOURCE; type: 'get-state' }
		| { source: typeof MESSAGE_SOURCE; type: 'set-settings'; patch: SettingsPatch }
		| { source: typeof MESSAGE_SOURCE; type: 'toggle-site' };

	interface Color {
		r: number;
		g: number;
		b: number;
		a: number;
	}

	type StoredStyle = Record<string, { value: string; priority: string }>;

	const MESSAGE_SOURCE = 'dark-mode-lite';
	const STYLE_ID = 'dark-mode-lite-style';
	const LEGACY_STYLE_ID = 'personal-dark-mode-lite-style';
	const ROOT_ATTR = 'data-dm-lite-active';
	const MODE_ATTR = 'data-dm-lite-mode';
	const LEGACY_ROOT_ATTR = 'data-pdm-lite-active';
	const LEGACY_MODE_ATTR = 'data-pdm-lite-mode';

	const DEFAULT_SETTINGS: Settings = {
		enabled: true,
		mode: 'smart',
		brightness: 100,
		contrast: 92,
		sepia: 0,
		settingsVersion: 2,
		siteOverrides: {},
	};

	let settings = { ...DEFAULT_SETTINGS };
	let smartObserver: MutationObserver | null = null;
	let smartScanTimer = 0;

	const originalStyles = new Map<HTMLElement, StoredStyle>();

	function normalizeHost(host: string) {
		return host.replace(/^www\./, '');
	}

	function getHost() {
		return normalizeHost(location.hostname || '');
	}

	function getSiteState(nextSettings = settings) {
		const host = getHost();
		const override = nextSettings.siteOverrides?.[host];

		return override ?? true;
	}

	function isActive(nextSettings = settings) {
		return Boolean(nextSettings.enabled && getSiteState(nextSettings));
	}

	function clamp(value: unknown, min: number, max: number) {
		const number = Number(value);

		if (!Number.isFinite(number)) {
			return min;
		}

		return Math.min(max, Math.max(min, number));
	}

	function parseColor(value: string) {
		const match = String(value).match(/rgba?\(([^)]+)\)/);
		const colorChannels = match?.[1];

		if (!colorChannels) {
			return null;
		}

		const parts = colorChannels.split(',').map((part) => Number.parseFloat(part.trim()));
		const r = parts[0];
		const g = parts[1];
		const b = parts[2];
		const a = parts[3] ?? 1;

		if (r === undefined || g === undefined || b === undefined || ![r, g, b, a].every(Number.isFinite) || a === 0) {
			return null;
		}

		return { r, g, b, a };
	}

	function luminance(color: Color) {
		const toLinear = (channel: number) => {
			const value = channel / 255;

			return value <= 0.03928 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4;
		};

		return 0.2126 * toLinear(color.r) + 0.7152 * toLinear(color.g) + 0.0722 * toLinear(color.b);
	}

	function rememberStyle(element: HTMLElement, property: string) {
		let original = originalStyles.get(element);

		if (!original) {
			original = {};
			originalStyles.set(element, original);
		}

		if (!Object.hasOwn(original, property)) {
			original[property] = {
				value: element.style.getPropertyValue(property),
				priority: element.style.getPropertyPriority(property),
			};
		}
	}

	function setImportant(element: HTMLElement, property: string, value: string) {
		rememberStyle(element, property);
		element.style.setProperty(property, value, 'important');
	}

	function restoreSmartStyles() {
		for (const [element, styles] of originalStyles) {
			if (!element?.style) {
				continue;
			}

			for (const [property, original] of Object.entries(styles)) {
				if (original.value) {
					element.style.setProperty(property, original.value, original.priority);
				} else {
					element.style.removeProperty(property);
				}
			}
		}

		originalStyles.clear();
	}

	function isSkippableElement(element: HTMLElement) {
		return ['SCRIPT', 'STYLE', 'META', 'LINK', 'NOSCRIPT', 'IMG', 'VIDEO', 'PICTURE', 'CANVAS', 'SVG', 'PATH', 'IFRAME'].includes(element.tagName);
	}

	function smartenElement(element: Element) {
		if (!(element instanceof HTMLElement) || isSkippableElement(element)) {
			return;
		}

		const computed = getComputedStyle(element);
		const bg = parseColor(computed.backgroundColor);
		const text = parseColor(computed.color);
		const isRootSurface = element === document.body || element === document.documentElement;

		if (isRootSurface) {
			setImportant(element, 'background-color', '#111318');
			setImportant(element, 'color', '#e9edf5');

			return;
		}

		if (bg) {
			const bgLuma = luminance(bg);

			if (bgLuma > 0.78) {
				setImportant(element, 'background-color', '#171b22');
			} else if (bgLuma > 0.58) {
				setImportant(element, 'background-color', '#202632');
			}
		}

		if (text) {
			const textLuma = luminance(text);

			if (element.closest('a')) {
				setImportant(element, 'color', '#8ab4ff');
			} else if (textLuma < 0.42) {
				setImportant(element, 'color', '#e9edf5');
			}
		}

		for (const side of ['top', 'right', 'bottom', 'left']) {
			const property = `border-${side}-color`;
			const border = parseColor(computed.getPropertyValue(property));

			if (border && luminance(border) > 0.52) {
				setImportant(element, property, 'rgba(255, 255, 255, 0.18)');
			}
		}
	}

	function scanSmartMode() {
		smartScanTimer = 0;
		if (!isActive(settings) || settings.mode !== 'smart') {
			return;
		}

		const elements = [document.documentElement, document.body, ...document.querySelectorAll('body *')];

		for (let index = 0; index < elements.length && index < 5000; index += 1) {
			const element = elements[index];

			if (element) {
				smartenElement(element);
			}
		}
	}

	function scheduleSmartScan() {
		if (smartScanTimer) {
			return;
		}

		smartScanTimer = window.setTimeout(scanSmartMode, 80);
	}

	function startSmartMode() {
		scheduleSmartScan();
		if (smartObserver) {
			return;
		}

		smartObserver = new MutationObserver(scheduleSmartScan);
		smartObserver.observe(document.documentElement, {
			childList: true,
			subtree: true,
		});
	}

	function stopSmartMode() {
		if (smartObserver) {
			smartObserver.disconnect();
			smartObserver = null;
		}

		if (smartScanTimer) {
			window.clearTimeout(smartScanTimer);
			smartScanTimer = 0;
		}

		restoreSmartStyles();
	}

	function parseThemeMode(input: unknown): ThemeMode {
		if (input === 'smart' || input === 'invert' || input === 'soft') {
			return input;
		}

		return DEFAULT_SETTINGS.mode;
	}

	function parseSettingsPatch(input: unknown): SettingsPatch {
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

	function migrateSettings(storedSettings?: unknown): Settings {
		const patch = parseSettingsPatch(storedSettings);

		const nextSettings: Settings = {
			...DEFAULT_SETTINGS,
			...patch,
			siteOverrides: {
				...DEFAULT_SETTINGS.siteOverrides,
				...(patch.siteOverrides ?? {}),
			},
		};

		if (isLegacyInvertSettings(storedSettings)) {
			nextSettings.mode = 'smart';
		}

		nextSettings.settingsVersion = DEFAULT_SETTINGS.settingsVersion;

		return nextSettings;
	}

	function parsePopupMessage(input: unknown): PopupMessage | null {
		if (!isRecord(input) || input.source !== MESSAGE_SOURCE) {
			return null;
		}

		if (input.type === 'get-state') {
			return { source: MESSAGE_SOURCE, type: 'get-state' };
		}

		if (input.type === 'toggle-site') {
			return { source: MESSAGE_SOURCE, type: 'toggle-site' };
		}

		if (input.type === 'set-settings') {
			return {
				source: MESSAGE_SOURCE,
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

	function createCSS(nextSettings: Settings) {
		const brightness = clamp(nextSettings.brightness, 50, 150);
		const contrast = clamp(nextSettings.contrast, 50, 150);
		const sepia = clamp(nextSettings.sepia, 0, 100);

		return `
      html[${ROOT_ATTR}="true"] {
        color-scheme: dark !important;
        --dm-lite-bg: #111318;
        --dm-lite-surface: #1a1d24;
        --dm-lite-surface-2: #232833;
        --dm-lite-text: #e9edf5;
        --dm-lite-muted: #aab2c2;
        --dm-lite-link: #8ab4ff;
        --dm-lite-border: rgba(255, 255, 255, 0.22);
      }

      html[${ROOT_ATTR}="true"][${MODE_ATTR}="smart"],
      html[${ROOT_ATTR}="true"][${MODE_ATTR}="smart"] body {
        background: var(--dm-lite-bg) !important;
        color: var(--dm-lite-text) !important;
      }

      html[${ROOT_ATTR}="true"][${MODE_ATTR}="smart"] :where(
        p,
        span,
        li,
        label,
        strong,
        em,
        small,
        h1,
        h2,
        h3,
        h4,
        h5,
        h6,
        code,
        pre,
        th,
        td
      ) {
        color: var(--dm-lite-text) !important;
        border-color: var(--dm-lite-border) !important;
      }

      html[${ROOT_ATTR}="true"][${MODE_ATTR}="smart"] :where(a, a *) {
        color: var(--dm-lite-link) !important;
      }

      html[${ROOT_ATTR}="true"][${MODE_ATTR}="smart"] :where(
        [style*="background: white"],
        [style*="background:white"],
        [style*="background-color: white"],
        [style*="background-color:white"],
        [style*="background: rgb(255"],
        [style*="background-color: rgb(255"]
      ) {
        background: var(--dm-lite-bg) !important;
        background-color: var(--dm-lite-bg) !important;
      }

      html[${ROOT_ATTR}="true"][${MODE_ATTR}="smart"] img,
      html[${ROOT_ATTR}="true"][${MODE_ATTR}="smart"] video,
      html[${ROOT_ATTR}="true"][${MODE_ATTR}="smart"] picture,
      html[${ROOT_ATTR}="true"][${MODE_ATTR}="smart"] canvas,
      html[${ROOT_ATTR}="true"][${MODE_ATTR}="smart"] svg,
      html[${ROOT_ATTR}="true"][${MODE_ATTR}="smart"] iframe {
        filter: brightness(${brightness}%) contrast(${contrast}%) sepia(${sepia}%) !important;
      }

      html[${ROOT_ATTR}="true"][${MODE_ATTR}="smart"] input,
      html[${ROOT_ATTR}="true"][${MODE_ATTR}="smart"] textarea,
      html[${ROOT_ATTR}="true"][${MODE_ATTR}="smart"] select,
      html[${ROOT_ATTR}="true"][${MODE_ATTR}="smart"] button {
        background-color: var(--dm-lite-surface) !important;
        border-color: var(--dm-lite-border) !important;
        color: var(--dm-lite-text) !important;
      }

      html[${ROOT_ATTR}="true"][${MODE_ATTR}="invert"] {
        background: white !important;
        filter: invert(1) hue-rotate(180deg) brightness(${brightness}%) contrast(${contrast}%) sepia(${sepia}%) !important;
      }

      html[${ROOT_ATTR}="true"][${MODE_ATTR}="invert"] img,
      html[${ROOT_ATTR}="true"][${MODE_ATTR}="invert"] video,
      html[${ROOT_ATTR}="true"][${MODE_ATTR}="invert"] picture,
      html[${ROOT_ATTR}="true"][${MODE_ATTR}="invert"] canvas,
      html[${ROOT_ATTR}="true"][${MODE_ATTR}="invert"] iframe,
      html[${ROOT_ATTR}="true"][${MODE_ATTR}="invert"] svg,
      html[${ROOT_ATTR}="true"][${MODE_ATTR}="invert"] [style*="background-image"] {
        filter: invert(1) hue-rotate(180deg) !important;
      }

      html[${ROOT_ATTR}="true"][${MODE_ATTR}="soft"],
      html[${ROOT_ATTR}="true"][${MODE_ATTR}="soft"] body {
        background: var(--dm-lite-bg) !important;
        color: var(--dm-lite-text) !important;
      }

      html[${ROOT_ATTR}="true"][${MODE_ATTR}="soft"] body,
      html[${ROOT_ATTR}="true"][${MODE_ATTR}="soft"] main,
      html[${ROOT_ATTR}="true"][${MODE_ATTR}="soft"] article,
      html[${ROOT_ATTR}="true"][${MODE_ATTR}="soft"] section,
      html[${ROOT_ATTR}="true"][${MODE_ATTR}="soft"] aside,
      html[${ROOT_ATTR}="true"][${MODE_ATTR}="soft"] header,
      html[${ROOT_ATTR}="true"][${MODE_ATTR}="soft"] footer,
      html[${ROOT_ATTR}="true"][${MODE_ATTR}="soft"] nav,
      html[${ROOT_ATTR}="true"][${MODE_ATTR}="soft"] div,
      html[${ROOT_ATTR}="true"][${MODE_ATTR}="soft"] form,
      html[${ROOT_ATTR}="true"][${MODE_ATTR}="soft"] dialog {
        background-color: var(--dm-lite-bg) !important;
        border-color: var(--dm-lite-border) !important;
      }

      html[${ROOT_ATTR}="true"][${MODE_ATTR}="soft"] p,
      html[${ROOT_ATTR}="true"][${MODE_ATTR}="soft"] span,
      html[${ROOT_ATTR}="true"][${MODE_ATTR}="soft"] li,
      html[${ROOT_ATTR}="true"][${MODE_ATTR}="soft"] label,
      html[${ROOT_ATTR}="true"][${MODE_ATTR}="soft"] strong,
      html[${ROOT_ATTR}="true"][${MODE_ATTR}="soft"] em,
      html[${ROOT_ATTR}="true"][${MODE_ATTR}="soft"] h1,
      html[${ROOT_ATTR}="true"][${MODE_ATTR}="soft"] h2,
      html[${ROOT_ATTR}="true"][${MODE_ATTR}="soft"] h3,
      html[${ROOT_ATTR}="true"][${MODE_ATTR}="soft"] h4,
      html[${ROOT_ATTR}="true"][${MODE_ATTR}="soft"] h5,
      html[${ROOT_ATTR}="true"][${MODE_ATTR}="soft"] h6,
      html[${ROOT_ATTR}="true"][${MODE_ATTR}="soft"] code,
      html[${ROOT_ATTR}="true"][${MODE_ATTR}="soft"] pre,
      html[${ROOT_ATTR}="true"][${MODE_ATTR}="soft"] table,
      html[${ROOT_ATTR}="true"][${MODE_ATTR}="soft"] th,
      html[${ROOT_ATTR}="true"][${MODE_ATTR}="soft"] td {
        color: var(--dm-lite-text) !important;
        border-color: var(--dm-lite-border) !important;
      }

      html[${ROOT_ATTR}="true"][${MODE_ATTR}="soft"] a {
        color: var(--dm-lite-link) !important;
      }

      html[${ROOT_ATTR}="true"][${MODE_ATTR}="soft"] input,
      html[${ROOT_ATTR}="true"][${MODE_ATTR}="soft"] textarea,
      html[${ROOT_ATTR}="true"][${MODE_ATTR}="soft"] select,
      html[${ROOT_ATTR}="true"][${MODE_ATTR}="soft"] button {
        background-color: var(--dm-lite-surface) !important;
        border-color: var(--dm-lite-border) !important;
        color: var(--dm-lite-text) !important;
      }

      html[${ROOT_ATTR}="true"][${MODE_ATTR}="soft"] input::placeholder,
      html[${ROOT_ATTR}="true"][${MODE_ATTR}="soft"] textarea::placeholder {
        color: var(--dm-lite-muted) !important;
      }

      html[${ROOT_ATTR}="true"][${MODE_ATTR}="soft"] pre,
      html[${ROOT_ATTR}="true"][${MODE_ATTR}="soft"] code,
      html[${ROOT_ATTR}="true"][${MODE_ATTR}="soft"] blockquote {
        background-color: var(--dm-lite-surface-2) !important;
      }
    `;
	}

	function cleanupLegacyNamespace(root = document.documentElement) {
		document.getElementById(LEGACY_STYLE_ID)?.remove();
		root.removeAttribute(LEGACY_ROOT_ATTR);
		root.removeAttribute(LEGACY_MODE_ATTR);
	}

	function ensureStyle() {
		const existingStyle = document.getElementById(STYLE_ID);

		if (existingStyle instanceof HTMLStyleElement) {
			return existingStyle;
		}

		const style = document.createElement('style');

		style.id = STYLE_ID;
		style.setAttribute('data-owner', 'dark-mode-lite');
		(document.documentElement || document.head || document).appendChild(style);

		return style;
	}

	function applySettings(nextSettings: unknown) {
		const previousMode = settings.mode;

		settings = migrateSettings(nextSettings);

		const root = document.documentElement;
		const active = isActive(settings);

		cleanupLegacyNamespace(root);

		const style = ensureStyle();
		const mode = ['smart', 'soft', 'invert'].includes(settings.mode) ? settings.mode : 'smart';

		style.textContent = createCSS(settings);
		root.setAttribute(MODE_ATTR, mode);

		if (previousMode === 'smart' && (!active || mode !== 'smart')) {
			stopSmartMode();
		}

		if (active) {
			root.setAttribute(ROOT_ATTR, 'true');
			if (mode === 'smart') {
				startSmartMode();
			}
		} else {
			root.removeAttribute(ROOT_ATTR);
			stopSmartMode();
		}
	}

	function readSettings() {
		chrome.storage.sync.get(null, (storedSettings) => {
			applySettings(storedSettings);
		});
	}

	function updateSettings(patch: SettingsPatch, callback?: (state: ExtensionState) => void) {
		const nextSettings = migrateSettings({
			...settings,
			...patch,
			siteOverrides: patch.siteOverrides ? { ...patch.siteOverrides } : { ...settings.siteOverrides },
		});

		chrome.storage.sync.set(nextSettings, () => {
			applySettings(nextSettings);
			callback?.(getState());
		});
	}

	function getState(): ExtensionState {
		return {
			settings,
			host: getHost(),
			active: isActive(settings),
			siteEnabled: getSiteState(settings),
		};
	}

	chrome.runtime.onMessage.addListener((rawMessage, _sender, sendResponse) => {
		const message = parsePopupMessage(rawMessage);

		if (!message) {
			return false;
		}

		if (message.type === 'get-state') {
			sendResponse(getState());

			return false;
		}

		if (message.type === 'set-settings') {
			updateSettings(message.patch || {}, sendResponse);

			return true;
		}

		if (message.type === 'toggle-site') {
			const host = getHost();

			const siteOverrides = {
				...settings.siteOverrides,
				[host]: !getSiteState(settings),
			};

			updateSettings({ siteOverrides }, sendResponse);

			return true;
		}

		return false;
	});

	chrome.storage.onChanged.addListener((changes, areaName) => {
		if (areaName !== 'sync') {
			return;
		}

		const nextSettings: Record<string, unknown> = { ...settings };

		for (const [key, change] of Object.entries(changes)) {
			nextSettings[key] = change.newValue;
		}

		applySettings(nextSettings);
	});

	readSettings();
})();
