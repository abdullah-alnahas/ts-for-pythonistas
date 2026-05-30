import { error } from '@sveltejs/kit';
import { entries as glossaryEntries, getEntry, relatedEntries, DOMAIN_LABELS } from '$lib/glossary';
import { renderGlossary } from '$lib/render';
import type { EntryGenerator } from './$types';

export const prerender = true;

export const entries: EntryGenerator = () => glossaryEntries.map((e) => ({ slug: e.slug }));

export async function load({ params }: { params: { slug: string } }) {
	const entry = getEntry(params.slug);
	if (!entry) throw error(404, `No glossary entry: ${params.slug}`);
	const html = await renderGlossary(entry.body);
	const related = relatedEntries(entry).map((r) => ({
		slug: r.slug,
		term: r.term,
		short: r.short
	}));
	return {
		entry: {
			slug: entry.slug,
			term: entry.term,
			short: entry.short,
			domain: entry.domain,
			domainLabel: DOMAIN_LABELS[entry.domain]
		},
		html,
		related
	};
}
