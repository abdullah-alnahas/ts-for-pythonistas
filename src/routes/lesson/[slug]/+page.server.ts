import { error } from '@sveltejs/kit';
import { lessons, getLesson, neighbors } from '$lib/content';
import { renderMarkdown } from '$lib/render';
import type { EntryGenerator } from './$types';

export const prerender = true;

export const entries: EntryGenerator = () => lessons.map((l) => ({ slug: l.slug }));

// Server load: runs only at build (prerender). Keeps marked + shiki out of the
// client bundle; the rendered HTML is serialized into the static page data.
export async function load({ params }: { params: { slug: string } }) {
	const lesson = getLesson(params.slug);
	if (!lesson) throw error(404, `No lesson: ${params.slug}`);
	const { html, toc } = await renderMarkdown(lesson.body);
	return { lesson, html, toc, totalLessons: lessons.length, ...neighbors(params.slug) };
}
