// Lightweight client-side full-text search over the lessons. Builds a section
// index (split on `## ` headings) at module load, strips markdown/code/custom
// blocks to plain text, and ranks by term frequency with a heading boost.
import { base } from '$app/paths';
import type { Lesson } from '$lib/parse-course';
import { lessons as classicLessons } from './content';
import { entries as glossaryEntries } from './glossary';

export type SearchKind = 'lesson' | 'glossary';

export interface SearchHit {
	kind: SearchKind;
	/** Route path to navigate to: /lesson/<slug> or /glossary/<slug>. */
	href: string;
	slug: string;
	lessonTitle: string;
	lessonOrder: number;
	heading: string;
	snippet: string;
	score: number;
}

interface Section {
	kind: SearchKind;
	href: string;
	slug: string;
	lessonTitle: string;
	lessonOrder: number;
	heading: string;
	text: string;
	lower: string;
}

function stripMarkdown(md: string): string {
	return md
		.replace(/```[\s\S]*?```/g, ' ') // fenced code
		.replace(/:::[a-z]+[\s\S]*?\n:::/g, ' ') // custom blocks (compare/quiz/play)
		.replace(/!?\[([^\]]*)\]\([^)]*\)/g, '$1') // links/images -> text
		.replace(/[#>|*_~`]/g, ' ') // md punctuation
		.replace(/\s+/g, ' ')
		.trim();
}

function buildSections(lessons: Lesson[], lessonHrefPrefix: string): Section[] {
	const out: Section[] = [];
	for (const l of lessons) {
		for (const part of l.body.split(/\n(?=##\s)/)) {
			const hm = /^##\s+(.*)/.exec(part);
			const heading = hm ? hm[1].trim() : l.title;
			const text = stripMarkdown(part);
			if (!text) continue;
			out.push({
				kind: 'lesson',
				href: `${lessonHrefPrefix}/${l.slug}`,
				slug: l.slug,
				lessonTitle: l.title,
				lessonOrder: l.order,
				heading,
				text,
				lower: (heading + ' ' + text).toLowerCase()
			});
		}
	}
	// A3.6: index glossary entries too, so "what is X" finds the glossary.
	for (const e of glossaryEntries) {
		const text = stripMarkdown(e.short + '\n\n' + e.body);
		if (!text) continue;
		out.push({
			kind: 'glossary',
			href: `${base}/glossary/${e.slug}`,
			slug: e.slug,
			lessonTitle: 'Glossary',
			lessonOrder: 99,
			heading: e.term,
			text,
			lower: (e.term + ' ' + text).toLowerCase()
		});
	}
	return out;
}

// Default (classic) sections built at module load for backward compatibility.
const defaultSections: Section[] = buildSections(classicLessons, `${base}/lesson`);

function countOccurrences(haystack: string, needle: string): number {
	let n = 0;
	let i = haystack.indexOf(needle);
	while (i !== -1) {
		n++;
		i = haystack.indexOf(needle, i + needle.length);
	}
	return n;
}

function snippet(text: string, term: string): string {
	const i = text.toLowerCase().indexOf(term);
	if (i === -1) return text.slice(0, 140) + (text.length > 140 ? '…' : '');
	const start = Math.max(0, i - 50);
	const end = Math.min(text.length, i + term.length + 90);
	return (start > 0 ? '…' : '') + text.slice(start, end).trim() + (end < text.length ? '…' : '');
}

function runSearch(sections: Section[], query: string): SearchHit[] {
	const terms = query
		.toLowerCase()
		.split(/\s+/)
		.map((t) => t.trim())
		.filter((t) => t.length >= 2);
	if (terms.length === 0) return [];

	const hits: SearchHit[] = [];
	for (const s of sections) {
		let score = 0;
		let matchedAll = true;
		for (const term of terms) {
			const inHeading = countOccurrences(s.heading.toLowerCase(), term);
			const inText = countOccurrences(s.lower, term);
			if (inText === 0) matchedAll = false;
			score += inHeading * 5 + inText;
		}
		if (!matchedAll || score === 0) continue;
		hits.push({
			kind: s.kind,
			href: s.href,
			slug: s.slug,
			lessonTitle: s.lessonTitle,
			lessonOrder: s.lessonOrder,
			heading: s.heading,
			snippet: snippet(s.text, terms[0]),
			score
		});
	}
	return hits.sort((a, b) => b.score - a.score).slice(0, 30);
}

/** Search across classic lessons + glossary (default, backward-compatible). */
export function search(query: string): SearchHit[] {
	return runSearch(defaultSections, query);
}

/**
 * Search scoped to a specific set of lessons.
 * Pass the lesson href prefix (e.g. `${base}/lesson` or `${base}/build-an-app/lesson`).
 */
export function searchCourse(
	lessons: Lesson[],
	lessonHrefPrefix: string,
	query: string
): SearchHit[] {
	const sections = buildSections(lessons, lessonHrefPrefix);
	return runSearch(sections, query);
}
