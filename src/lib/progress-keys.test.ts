import { describe, it, expect } from 'vitest';
import { storageKeys } from './progress.svelte';

describe('storageKeys', () => {
	it('keeps classic keys unprefixed (back-compat)', () => {
		expect(storageKeys('classic')).toEqual({ done: 'tsfp-progress', last: 'tsfp-last' });
	});
	it('namespaces other courses', () => {
		expect(storageKeys('app')).toEqual({ done: 'tsfp-progress:app', last: 'tsfp-last:app' });
		expect(storageKeys('checker')).toEqual({
			done: 'tsfp-progress:checker',
			last: 'tsfp-last:checker'
		});
	});
});
