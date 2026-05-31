import { parseCourse, type Lesson } from '$lib/parse-course';

export type { Lesson };

const files = import.meta.glob('./*.md', { query: '?raw', import: 'default', eager: true }) as Record<
	string,
	string
>;

export const lessons: Lesson[] = parseCourse(files);

export function getLesson(slug: string): Lesson | undefined {
	return lessons.find((l) => l.slug === slug);
}

export function neighbors(slug: string): { prev?: Lesson; next?: Lesson } {
	const i = lessons.findIndex((l) => l.slug === slug);
	if (i === -1) return {};
	return { prev: lessons[i - 1], next: lessons[i + 1] };
}
