import { error } from '@sveltejs/kit';
import { getCourseBySlug, courseLesson, courseNeighbors, AK_COURSES } from '$lib/courses';
import { renderMarkdown } from '$lib/render';
import type { EntryGenerator } from './$types';

export const prerender = true;

export const entries: EntryGenerator = () =>
	AK_COURSES.flatMap((c) => c.lessons.map((l) => ({ course: c.routeSlug, slug: l.slug })));

export async function load({ params }: { params: { course: string; slug: string } }) {
	const course = getCourseBySlug(params.course);
	if (!course) throw error(404, `No course: ${params.course}`);
	const lesson = courseLesson(course.id, params.slug);
	if (!lesson) throw error(404, `No lesson: ${params.slug}`);
	const { html, toc } = await renderMarkdown(lesson.body);
	return {
		courseId: course.id,
		courseSlug: course.routeSlug,
		courseTitle: course.title,
		lesson,
		html,
		toc,
		totalLessons: course.lessons.length,
		...courseNeighbors(course.id, params.slug)
	};
}
