import { describe, it, expect } from 'vitest';
import { COURSES, getCourseBySlug, getCourseById, courseNeighbors } from './courses';

describe('course registry', () => {
	it('has the four courses', () => {
		expect(COURSES.map((c) => c.id).sort()).toEqual(['app', 'both', 'checker', 'classic']);
	});
	it('maps AK slugs to courses and classic to empty slug', () => {
		expect(getCourseBySlug('build-an-app')?.id).toBe('app');
		expect(getCourseBySlug('how-types-work')?.id).toBe('checker');
		expect(getCourseBySlug('understand-and-build')?.id).toBe('both');
		expect(getCourseById('classic').routeSlug).toBe('');
	});
	it('returns undefined for unknown slugs', () => {
		expect(getCourseBySlug('lesson')).toBeUndefined();
		expect(getCourseBySlug('glossary')).toBeUndefined();
	});
	it('computes prev/next within a course', () => {
		const app = getCourseById('app');
		const first = app.lessons[0].slug;
		expect(courseNeighbors('app', first).prev).toBeUndefined();
	});
});
