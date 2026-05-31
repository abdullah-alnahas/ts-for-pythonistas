import type { Lesson } from '$lib/parse-course';
import { lessons as classicLessons } from '$lib/content';
import { lessons as appLessons } from '$lib/content-app';
import { lessons as checkerLessons } from '$lib/content-checker';
import { lessons as bothLessons } from '$lib/content-both';
import { lessons as syntaxLessons } from '$lib/content-syntax';

export type CourseId = 'classic' | 'app' | 'checker' | 'both' | 'syntax';

export interface Phase {
	label: string;
	range: [number, number];
}

export interface Course {
	id: CourseId;
	routeSlug: string; // '' for classic
	title: string;
	tagline: string;
	spine: string;
	lessons: Lesson[];
	phases: Phase[];
}

export const COURSES: Course[] = [
	{
		id: 'classic',
		routeSlug: '',
		title: 'Mapped to Python',
		tagline: 'Learn TS by anchoring every feature to its Python equivalent.',
		spine: 'Topic by topic, mapped to what you already know.',
		lessons: classicLessons,
		phases: [
			{ label: 'Foundations', range: [1, 4] },
			{ label: 'The Type System', range: [5, 8] },
			{ label: 'Functions & Classes', range: [9, 10] },
			{ label: 'Advanced & JS Reality', range: [11, 12] }
		]
	},
	{
		id: 'app',
		routeSlug: 'build-an-app',
		title: 'Build a Real App',
		tagline: 'Learn TS by growing one typed todo app, episode by episode.',
		spine: 'A typed CLI todo app that accretes types as you learn them.',
		lessons: appLessons,
		phases: [{ label: 'The Build', range: [1, 99] }]
	},
	{
		id: 'checker',
		routeSlug: 'how-types-work',
		title: 'How Types Really Work',
		tagline: 'Build a type checker by hand, then meet the one tsc gives you free.',
		spine: 'A from-scratch runtime checker; reveal tsc is its compile-time twin.',
		lessons: checkerLessons,
		phases: [{ label: 'From Scratch', range: [1, 99] }]
	},
	{
		id: 'both',
		routeSlug: 'understand-and-build',
		title: 'Understand It & Build It',
		tagline: 'Hand-build the safety net, watch tsc replace it, build the app for real.',
		spine: 'Checker by hand (Act 1) coupled to the growing todo app (Act 2+).',
		lessons: bothLessons,
		phases: [{ label: 'Understand & Build', range: [1, 99] }]
	},
	{
		id: 'syntax',
		routeSlug: 'from-python',
		title: 'Straight to Syntax',
		tagline: 'You already know how to program. Here is how you write TypeScript.',
		spine: 'One Python program, translated to idiomatic TS construct by construct.',
		lessons: syntaxLessons,
		phases: [
			{ label: 'The Basics', range: [1, 4] },
			{ label: 'Values & Types', range: [5, 10] },
			{ label: 'Structure & Runtime', range: [11, 16] }
		]
	}
];

export function getCourseById(id: CourseId): Course {
	const c = COURSES.find((x) => x.id === id);
	if (!c) throw new Error(`Unknown course id: ${id}`);
	return c;
}

export function getCourseBySlug(slug: string): Course | undefined {
	if (slug === '') return undefined;
	return COURSES.find((c) => c.routeSlug === slug);
}

export function courseLesson(id: CourseId, slug: string): Lesson | undefined {
	return getCourseById(id).lessons.find((l) => l.slug === slug);
}

export function courseNeighbors(id: CourseId, slug: string): { prev?: Lesson; next?: Lesson } {
	const ls = getCourseById(id).lessons;
	const i = ls.findIndex((l) => l.slug === slug);
	if (i === -1) return {};
	return { prev: ls[i - 1], next: ls[i + 1] };
}

/** AK route slugs only — used by the param matcher and prerender entries. */
export const AK_COURSES = COURSES.filter((c) => c.id !== 'classic');
