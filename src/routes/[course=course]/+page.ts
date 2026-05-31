import { error } from '@sveltejs/kit';
import { getCourseBySlug, AK_COURSES } from '$lib/courses';
import type { EntryGenerator } from './$types';

export const prerender = true;
export const entries: EntryGenerator = () => AK_COURSES.map((c) => ({ course: c.routeSlug }));

export function load({ params }: { params: { course: string } }) {
	const course = getCourseBySlug(params.course);
	if (!course) throw error(404, `No course: ${params.course}`);
	return {
		courseId: course.id,
		courseSlug: course.routeSlug,
		title: course.title,
		tagline: course.tagline,
		spine: course.spine,
		lessons: course.lessons.map((l) => ({
			slug: l.slug,
			order: l.order,
			title: l.title,
			subtitle: l.subtitle
		}))
	};
}
