import { entriesByDomain, entries } from '$lib/glossary';

export const prerender = true;

export function load() {
	return {
		groups: entriesByDomain(),
		total: entries.length
	};
}
