import { parseCourse, type Lesson } from '$lib/parse-course';
const files = import.meta.glob('./*.md', { query: '?raw', import: 'default', eager: true }) as Record<
	string,
	string
>;
export const lessons: Lesson[] = parseCourse(files);
