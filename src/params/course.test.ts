import { describe, it, expect } from 'vitest';
import { match } from './course';

describe('course param matcher', () => {
	it('accepts the AK slugs', () => {
		expect(match('build-an-app')).toBe(true);
		expect(match('how-types-work')).toBe(true);
		expect(match('understand-and-build')).toBe(true);
		expect(match('from-python')).toBe(true);
	});
	it('rejects other top-level segments', () => {
		for (const s of ['lesson', 'glossary', 'search', 'playground', 'done', '']) {
			expect(match(s)).toBe(false);
		}
	});
});
