import { describe, expect, it } from 'vitest';
import { DEFAULT_SETTINGS, EXTENSION_MESSAGE_SOURCE, parsePopupMessage, parseSettings, parseSettingsPatch, parseThemeMode } from '@/types/settings';

describe('settings parsers', () => {
	it('fills defaults around valid stored settings', () => {
		const settings = parseSettings({
			enabled: false,
			mode: 'soft',
			brightness: 120,
			contrast: 88,
			sepia: 12,
			siteOverrides: {
				'www.example.com': false,
				'invalid.example': 'off',
			},
		});

		expect(settings).toEqual({
			...DEFAULT_SETTINGS,
			enabled: false,
			mode: 'soft',
			brightness: 120,
			contrast: 88,
			sepia: 12,
			siteOverrides: {
				'example.com': false,
			},
		});
	});

	it('normalizes invalid values safely', () => {
		expect(
			parseSettings({
				enabled: 'yes',
				mode: 'unknown',
				brightness: 1000,
				contrast: 'high',
				sepia: -20,
				siteOverrides: null,
			}),
		).toEqual({
			...DEFAULT_SETTINGS,
			brightness: 150,
			sepia: 0,
		});
	});

	it('preserves legacy invert migration behavior', () => {
		expect(parseSettings({ mode: 'invert' }).mode).toBe('smart');
		expect(parseSettings({ mode: 'invert', settingsVersion: 2 }).mode).toBe('invert');
	});

	it('parses theme modes and settings patches from unknown input', () => {
		expect(parseThemeMode('invert')).toBe('invert');
		expect(parseThemeMode('invalid')).toBe(DEFAULT_SETTINGS.mode);
		expect(parseSettingsPatch({ mode: 'soft', brightness: 40, siteOverrides: { 'www.site.test': true } })).toEqual({
			mode: 'soft',
			brightness: 50,
			siteOverrides: {
				'site.test': true,
			},
		});
	});
});

describe('popup message parser', () => {
	it('accepts known messages and parses patches', () => {
		expect(parsePopupMessage({ source: EXTENSION_MESSAGE_SOURCE, type: 'get-state' })).toEqual({
			source: EXTENSION_MESSAGE_SOURCE,
			type: 'get-state',
		});

		expect(parsePopupMessage({ source: EXTENSION_MESSAGE_SOURCE, type: 'set-settings', patch: { mode: 'soft', sepia: 25 } })).toEqual({
			source: EXTENSION_MESSAGE_SOURCE,
			type: 'set-settings',
			patch: {
				mode: 'soft',
				sepia: 25,
			},
		});
	});

	it('rejects unrelated messages', () => {
		expect(parsePopupMessage({ source: 'other-extension', type: 'get-state' })).toBeNull();
		expect(parsePopupMessage({ source: EXTENSION_MESSAGE_SOURCE, type: 'unknown' })).toBeNull();
		expect(parsePopupMessage(null)).toBeNull();
	});
});
