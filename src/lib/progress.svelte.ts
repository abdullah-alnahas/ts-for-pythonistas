// Per-course, per-lesson "done" state + resume affordance, persisted to
// localStorage. Svelte 5 runes module.
import type { CourseId } from '$lib/courses';

export interface LastViewed {
	slug: string;
	scrollY: number;
}

interface CourseProgress {
	done: Record<string, boolean>;
	last: LastViewed | null;
}

/** Classic keeps its original unprefixed keys; AK courses are namespaced. */
export function storageKeys(courseId: CourseId): { done: string; last: string } {
	return courseId === 'classic'
		? { done: 'tsfp-progress', last: 'tsfp-last' }
		: { done: `tsfp-progress:${courseId}`, last: `tsfp-last:${courseId}` };
}

function loadDone(courseId: CourseId): Record<string, boolean> {
	if (typeof localStorage === 'undefined') return {};
	try {
		return JSON.parse(localStorage.getItem(storageKeys(courseId).done) ?? '{}');
	} catch {
		return {};
	}
}

function loadLast(courseId: CourseId): LastViewed | null {
	if (typeof localStorage === 'undefined') return null;
	try {
		const raw = localStorage.getItem(storageKeys(courseId).last);
		if (!raw) return null;
		const v = JSON.parse(raw) as Partial<LastViewed>;
		if (typeof v.slug !== 'string') return null;
		return { slug: v.slug, scrollY: typeof v.scrollY === 'number' ? v.scrollY : 0 };
	} catch {
		return null;
	}
}

export const progress = $state<{ courses: Record<string, CourseProgress> }>({ courses: {} });

function slot(courseId: CourseId): CourseProgress {
	return (progress.courses[courseId] ??= { done: {}, last: null });
}

export function hydrateProgress(courseId: CourseId = 'classic'): void {
	if (progress.courses[courseId]) return;
	progress.courses[courseId] = { done: loadDone(courseId), last: loadLast(courseId) };
}

export function courseDone(courseId: CourseId): Record<string, boolean> {
	return slot(courseId).done;
}

export function courseLast(courseId: CourseId): LastViewed | null {
	return slot(courseId).last;
}

export function toggleDone(courseId: CourseId, slug: string): void {
	const s = slot(courseId);
	s.done = { ...s.done, [slug]: !s.done[slug] };
	if (typeof localStorage !== 'undefined') {
		localStorage.setItem(storageKeys(courseId).done, JSON.stringify(s.done));
	}
}

export function isDone(courseId: CourseId, slug: string): boolean {
	return !!slot(courseId).done[slug];
}

export function doneCount(courseId: CourseId): number {
	return Object.values(slot(courseId).done).filter(Boolean).length;
}

export function setLastViewed(courseId: CourseId, slug: string, scrollY: number): void {
	const s = slot(courseId);
	s.last = { slug, scrollY };
	if (typeof localStorage !== 'undefined') {
		localStorage.setItem(storageKeys(courseId).last, JSON.stringify(s.last));
	}
}
