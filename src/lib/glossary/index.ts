// Glossary engine — single source of truth for term entries.
//
// Entries are markdown files under `./entries/*.md` with frontmatter:
//   term:    human-readable name (e.g. "Discriminated union")
//   short:   1–2 sentence hover/preview text (plain, no markdown)
//   domain:  ts | js | py | swe
//   related: optional comma-separated list of slugs to cross-link
// Body = the deep explanation (markdown; may itself use [[term]] links).
//
// The filename (sans extension) is the slug. Both the inline `[[term]]`
// directive (build-time, in render.ts) and the `/glossary` routes read from
// here, so the preview text and full page never drift.

const files = import.meta.glob('./entries/*.md', {
	query: '?raw',
	import: 'default',
	eager: true
}) as Record<string, string>;

export type Domain = 'ts' | 'js' | 'py' | 'swe';

export const DOMAIN_LABELS: Record<Domain, string> = {
	ts: 'TypeScript',
	js: 'JavaScript',
	py: 'Python',
	swe: 'General SWE'
};

export interface GlossaryEntry {
	slug: string;
	term: string;
	short: string;
	domain: Domain;
	related: string[];
	body: string;
}

function isDomain(v: string): v is Domain {
	return v === 'ts' || v === 'js' || v === 'py' || v === 'swe';
}

function parseFrontmatter(raw: string): { meta: Record<string, string>; body: string } {
	const m = /^---\n([\s\S]*?)\n---\n?/.exec(raw);
	if (!m) return { meta: {}, body: raw };
	const meta: Record<string, string> = {};
	for (const line of m[1].split('\n')) {
		const idx = line.indexOf(':');
		if (idx === -1) continue;
		meta[line.slice(0, idx).trim()] = line.slice(idx + 1).trim();
	}
	return { meta, body: raw.slice(m[0].length) };
}

export const entries: GlossaryEntry[] = Object.entries(files)
	.map(([path, raw]) => {
		const slug = path.replace(/^.*\//, '').replace(/\.md$/, '');
		const { meta, body } = parseFrontmatter(raw);
		const domain = isDomain(meta.domain ?? '') ? (meta.domain as Domain) : 'swe';
		const related = (meta.related ?? '')
			.split(',')
			.map((s) => s.trim())
			.filter(Boolean);
		return {
			slug,
			term: meta.term ?? slug,
			short: meta.short ?? '',
			domain,
			related,
			body
		};
	})
	.sort((a, b) => a.term.localeCompare(b.term));

const bySlug = new Map(entries.map((e) => [e.slug, e]));

// Build a lookup keyed by normalized term text so `[[discriminated union]]`,
// `[[Discriminated Union]]`, and `[[discriminated-union]]` all resolve.
function normalizeKey(s: string): string {
	return s
		.toLowerCase()
		.replace(/[\s_-]+/g, ' ')
		.trim();
}

const byKey = new Map<string, GlossaryEntry>();
for (const e of entries) {
	byKey.set(normalizeKey(e.slug), e);
	byKey.set(normalizeKey(e.term), e);
}

export function getEntry(slug: string): GlossaryEntry | undefined {
	return bySlug.get(slug);
}

/** Resolve a `[[term]]` / `[[slug]]` / `[[Display|slug]]` reference. */
export function resolveTerm(ref: string): GlossaryEntry | undefined {
	return byKey.get(normalizeKey(ref));
}

export function entriesByDomain(): { domain: Domain; label: string; items: GlossaryEntry[] }[] {
	const order: Domain[] = ['ts', 'js', 'py', 'swe'];
	return order
		.map((domain) => ({
			domain,
			label: DOMAIN_LABELS[domain],
			items: entries.filter((e) => e.domain === domain)
		}))
		.filter((g) => g.items.length > 0);
}

export function relatedEntries(entry: GlossaryEntry): GlossaryEntry[] {
	return entry.related.map((s) => bySlug.get(s)).filter((e): e is GlossaryEntry => !!e);
}
