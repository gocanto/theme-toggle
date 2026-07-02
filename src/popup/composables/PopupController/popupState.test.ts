import { describe, expect, it } from 'vitest';
import { DEFAULT_SETTINGS } from '@/types/settings';
import { buildPopupState, canInjectIntoTab, getActiveHost } from '@composables/PopupController/popupState';

describe('popup state helpers', () => {
	it('extracts normalized hosts from tab URLs', () => {
		expect(getActiveHost('https://www.example.com/path')).toBe('example.com');
		expect(getActiveHost('notaurl')).toBe('');
		expect(getActiveHost('')).toBe('');
	});

	it('checks injectable tab URLs', () => {
		expect(canInjectIntoTab('https://example.com')).toBe(true);
		expect(canInjectIntoTab('http://example.com')).toBe(true);
		expect(canInjectIntoTab('chrome://extensions')).toBe(false);
		expect(canInjectIntoTab('notaurl')).toBe(false);
		expect(canInjectIntoTab('')).toBe(false);
	});

	it('builds popup state from settings and tab URL', () => {
		expect(
			buildPopupState(
				{
					...DEFAULT_SETTINGS,
					siteOverrides: {
						'example.com': false,
					},
				},
				'https://www.example.com/path',
			),
		).toEqual({
			settings: {
				...DEFAULT_SETTINGS,
				siteOverrides: {
					'example.com': false,
				},
			},
			host: 'example.com',
			active: false,
			siteEnabled: false,
		});
	});
});
