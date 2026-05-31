import { describe, it, expect } from 'vitest';
import { parseCourse, type Lesson } from './parse-course';

const files: Record<string, string> = {
	'./02-primitives.md': '---\ntitle: Primitives\nsubtitle: nums and strings\n---\nbody two',
	'./01-intro.md': '---\ntitle: Intro\n---\nbody one'
};

describe('parseCourse', () => {
	it('sorts by numeric order prefix', () => {
		const ls = parseCourse(files);
		expect(ls.map((l) => l.order)).toEqual([1, 2]);
	});
	it('derives slug from filename without the NN- prefix', () => {
		const ls = parseCourse(files);
		expect(ls[0].slug).toBe('intro');
		expect(ls[1].slug).toBe('primitives');
	});
	it('reads title/subtitle from frontmatter, falling back to slug', () => {
		const ls = parseCourse(files);
		expect(ls[0].title).toBe('Intro');
		expect(ls[0].subtitle).toBe('');
		expect(ls[1].subtitle).toBe('nums and strings');
	});
	it('strips frontmatter from the body', () => {
		const ls = parseCourse(files);
		expect(ls[0].body.trim()).toBe('body one');
	});
});
