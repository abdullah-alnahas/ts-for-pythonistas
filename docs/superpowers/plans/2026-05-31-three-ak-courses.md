# Three Karpathy-style TS Courses — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add three new Karpathy-style TypeScript courses (`app`, `checker`, `both`) alongside the existing "Mapped to Python" course, selectable via a course switcher, without breaking the live classic course or its Lighthouse scores.

**Architecture:** A course registry (`src/lib/courses.ts`) is the single source of truth over four markdown-content dirs. Classic keeps its routes (`/`, `/lesson/[slug]`); the three AK courses share one parameterized route tree (`/[course=course]/...`) guarded by a param matcher so existing top-level routes are never shadowed. Progress is namespaced per course in `localStorage`. All pages stay prerendered through the existing build-time shiki+marked pipeline — no new client dependencies.

**Tech Stack:** SvelteKit 2 (Svelte 5 runes), `@sveltejs/adapter-static`, marked + shiki (build-time render), Vitest (new, test-only — never shipped to the client bundle).

**Spec:** `docs/superpowers/specs/2026-05-31-three-ak-courses-design.md`

**Course identity table (used throughout):**

| id | routeSlug | landing URL | title (card) | builds app? | builds checker? |
|----|-----------|-------------|--------------|-------------|-----------------|
| `classic` | `''` | `/` | Mapped to Python | no | no |
| `app` | `build-an-app` | `/build-an-app` | Build a Real App | yes | no |
| `checker` | `how-types-work` | `/how-types-work` | How Types Really Work | no | yes |
| `both` | `understand-and-build` | `/understand-and-build` | Understand It & Build It | yes | yes |

**Content block syntax (mirror existing lessons exactly):** `:::compare` (python fence + typescript fence) `:::` · `:::predict` … `- ( )`/`- (x)` options … `:::answer` … `:::` · `:::play` (typescript fence) `:::` · `:::quiz` … `:::answer` … `:::`. Glossary links: `[[term]]` or `[[display label|slug]]`.

---

## Phase 0 — Test harness (pure-logic only)

### Task 0: Add Vitest (test-only, zero client-bundle impact)

**Files:**
- Modify: `package.json` (devDependencies + scripts)
- Create: `vitest.config.ts`
- Create: `src/lib/parse-course.test.ts` (smoke test proving the runner works)

- [ ] **Step 1: Install Vitest**

Run:
```bash
npm i -D vitest@^2
```

- [ ] **Step 2: Add the test script**

In `package.json` `"scripts"`, add:
```json
"test": "vitest run",
"test:watch": "vitest"
```

- [ ] **Step 3: Create `vitest.config.ts`**

```ts
import { defineConfig } from 'vitest/config';

export default defineConfig({
	test: {
		environment: 'node',
		include: ['src/**/*.test.ts']
	}
});
```

- [ ] **Step 4: Write a smoke test**

`src/lib/parse-course.test.ts`:
```ts
import { describe, it, expect } from 'vitest';

describe('vitest harness', () => {
	it('runs', () => {
		expect(1 + 1).toBe(2);
	});
});
```

- [ ] **Step 5: Run it**

Run: `npm test`
Expected: 1 passed.

- [ ] **Step 6: Commit**

```bash
git add package.json package-lock.json vitest.config.ts src/lib/parse-course.test.ts
git commit -m "test: add vitest harness (test-only)"
```

---

## Phase 1 — Course registry + parser refactor

### Task 1: Extract the shared markdown parser

**Files:**
- Create: `src/lib/parse-course.ts`
- Modify: `src/lib/parse-course.test.ts`
- Reference (do not change yet): `src/lib/content/index.ts:1-46`

The parser logic currently lives inline in `src/lib/content/index.ts`. Extract it so all four content dirs reuse one implementation. Vite requires the `import.meta.glob` call to stay in each content dir (glob arg must be a literal), so only the *parsing* moves here.

- [ ] **Step 1: Write failing tests**

Replace `src/lib/parse-course.test.ts` with:
```ts
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
```

- [ ] **Step 2: Run to verify it fails**

Run: `npm test`
Expected: FAIL — `Cannot find module './parse-course'`.

- [ ] **Step 3: Implement `src/lib/parse-course.ts`**

```ts
export interface Lesson {
	slug: string;
	order: number;
	title: string;
	subtitle: string;
	body: string;
}

function parseFrontmatter(raw: string): { meta: Record<string, string>; body: string } {
	const m = /^---\n([\s\S]*?)\n---\n?/.exec(raw);
	if (!m) return { meta: {}, body: raw };
	const meta: Record<string, string> = {};
	for (const line of m[1].split('\n')) {
		const idx = line.indexOf(':');
		if (idx === -1) continue;
		meta[line.slice(0, idx).trim()] = line.slice(idx + 1).trim();
	}
	return { meta, body: raw.slice(m[0].length) };
}

/** Turn a Vite `import.meta.glob('./*.md', {as raw})` result into ordered lessons. */
export function parseCourse(files: Record<string, string>): Lesson[] {
	return Object.entries(files)
		.map(([path, raw]) => {
			const file = path.replace(/^\.\//, '').replace(/\.md$/, '');
			const order = parseInt(file.slice(0, 2), 10);
			const slug = file.slice(3);
			const { meta, body } = parseFrontmatter(raw);
			return {
				slug,
				order,
				title: meta.title ?? slug,
				subtitle: meta.subtitle ?? '',
				body
			};
		})
		.sort((a, b) => a.order - b.order);
}
```

- [ ] **Step 4: Run to verify it passes**

Run: `npm test`
Expected: PASS (5 tests).

- [ ] **Step 5: Commit**

```bash
git add src/lib/parse-course.ts src/lib/parse-course.test.ts
git commit -m "refactor: extract parseCourse markdown parser"
```

### Task 2: Rewire classic content dir onto the shared parser

**Files:**
- Modify: `src/lib/content/index.ts`

Keep the exact public surface (`Lesson`, `lessons`, `getLesson`, `neighbors`) so existing importers (`Sidebar.svelte`, `done/+page.svelte`, `lesson/[slug]/+page.server.ts`, `+page.svelte`) keep working byte-for-byte.

- [ ] **Step 1: Replace the file body**

`src/lib/content/index.ts`:
```ts
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
```

- [ ] **Step 2: Type-check + build**

Run: `npm run check && npm run build`
Expected: no new errors; build still prerenders `/lesson/*` as before.

- [ ] **Step 3: Commit**

```bash
git add src/lib/content/index.ts
git commit -m "refactor: classic content uses shared parseCourse"
```

### Task 3: Create the three AK content dirs with one stub lesson each

A stub per course lets the registry + routes build before real content exists. Real episodes replace/extend these in Phases 7–9.

**Files:**
- Create: `src/lib/content-app/index.ts`, `src/lib/content-app/01-the-bug.md`
- Create: `src/lib/content-checker/index.ts`, `src/lib/content-checker/01-what-is-a-check.md`
- Create: `src/lib/content-both/index.ts`, `src/lib/content-both/01-the-bug.md`

- [ ] **Step 1: Create each `index.ts` (identical except the glob path is relative to its own dir)**

`src/lib/content-app/index.ts`:
```ts
import { parseCourse, type Lesson } from '$lib/parse-course';
const files = import.meta.glob('./*.md', { query: '?raw', import: 'default', eager: true }) as Record<
	string,
	string
>;
export const lessons: Lesson[] = parseCourse(files);
```
Repeat verbatim for `src/lib/content-checker/index.ts` and `src/lib/content-both/index.ts`.

- [ ] **Step 2: Create one stub markdown per dir**

`src/lib/content-app/01-the-bug.md`:
```markdown
---
title: The bug types would have caught
subtitle: We ship a todo app in plain JS, then watch it break
---

## Where we start

(stub — replaced in Phase 7)
```
`src/lib/content-checker/01-what-is-a-check.md`:
```markdown
---
title: What even is a type check?
subtitle: Before tsc, we build the idea by hand
---

## Where we start

(stub — replaced in Phase 9)
```
`src/lib/content-both/01-the-bug.md`:
```markdown
---
title: The bug types would have caught
subtitle: Ship it in JS, feel the pain, then build the safety net
---

## Where we start

(stub — replaced in Phase 8)
```

- [ ] **Step 3: Commit**

```bash
git add src/lib/content-app src/lib/content-checker src/lib/content-both
git commit -m "feat: scaffold three AK content dirs with stubs"
```

### Task 4: Build the course registry

**Files:**
- Create: `src/lib/courses.ts`
- Create: `src/lib/courses.test.ts`

- [ ] **Step 1: Write failing tests**

`src/lib/courses.test.ts`:
```ts
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
```

- [ ] **Step 2: Run to verify it fails**

Run: `npm test`
Expected: FAIL — `Cannot find module './courses'`.

- [ ] **Step 3: Implement `src/lib/courses.ts`**

```ts
import type { Lesson } from '$lib/parse-course';
import { lessons as classicLessons } from '$lib/content';
import { lessons as appLessons } from '$lib/content-app';
import { lessons as checkerLessons } from '$lib/content-checker';
import { lessons as bothLessons } from '$lib/content-both';

export type CourseId = 'classic' | 'app' | 'checker' | 'both';

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

// Phase groupings mirror the existing Sidebar phases for classic; AK phases are
// refined when their real episodes land (Phases 7–9). Ranges are inclusive of
// lesson `order`.
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
	}
];

export function getCourseById(id: CourseId): Course {
	const c = COURSES.find((x) => x.id === id);
	if (!c) throw new Error(`Unknown course id: ${id}`);
	return c;
}

export function getCourseBySlug(slug: string): Course | undefined {
	// Only AK slugs are addressable here; classic ('') is reached via '/'.
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
```

- [ ] **Step 4: Run to verify it passes**

Run: `npm test`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/lib/courses.ts src/lib/courses.test.ts
git commit -m "feat: course registry over four content dirs"
```

---

## Phase 2 — Per-course progress

### Task 5: Namespace progress by course

**Files:**
- Modify: `src/lib/progress.svelte.ts`
- Create: `src/lib/progress-keys.test.ts`

Existing callers pass no course and mean classic. Make `courseId` an explicit first arg, store each course's state under its own slot, and keep classic's `localStorage` keys exactly as they are (`tsfp-progress`, `tsfp-last`) for back-compat.

- [ ] **Step 1: Write failing test for key derivation**

`src/lib/progress-keys.test.ts`:
```ts
import { describe, it, expect } from 'vitest';
import { storageKeys } from './progress.svelte';

describe('storageKeys', () => {
	it('keeps classic keys unprefixed (back-compat)', () => {
		expect(storageKeys('classic')).toEqual({ done: 'tsfp-progress', last: 'tsfp-last' });
	});
	it('namespaces other courses', () => {
		expect(storageKeys('app')).toEqual({ done: 'tsfp-progress:app', last: 'tsfp-last:app' });
		expect(storageKeys('checker')).toEqual({
			done: 'tsfp-progress:checker',
			last: 'tsfp-last:checker'
		});
	});
});
```

- [ ] **Step 2: Run to verify it fails**

Run: `npm test`
Expected: FAIL — `storageKeys` is not exported.

- [ ] **Step 3: Rewrite `src/lib/progress.svelte.ts`**

```ts
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
```

- [ ] **Step 4: Run to verify it passes**

Run: `npm test`
Expected: PASS.

- [ ] **Step 5: Update classic callers to pass `'classic'`**

This step only changes call sites; behavior is identical. Make these edits:

`src/routes/+page.svelte` — replace progress usage:
```svelte
import { progress, hydrateProgress, courseDone, courseLast } from '$lib/progress.svelte';
hydrateProgress('classic');
const done = $derived(courseDone('classic'));
const doneCount = $derived(lessons.filter((l) => done[l.slug]).length);
const complete = $derived(doneCount >= lessons.length);
const last = $derived(courseLast('classic'));
const resume = $derived(
	(last && lessons.find((l) => l.slug === last.slug)) ??
		lessons.find((l) => !done[l.slug]) ??
		first
);
```
(Replace the prior `progress.done[...]`/`progress.last` references accordingly.)

`src/lib/components/Sidebar.svelte` — `hydrateProgress('classic')` and read `courseDone('classic')` where it currently reads `progress.done`. (Sidebar becomes fully course-aware in Task 9; this keeps it compiling now.)

`src/routes/done/+page.svelte` — `hydrateProgress('classic')`; replace `progress.done` reads with `courseDone('classic')`.

`src/routes/lesson/[slug]/+page.svelte` — `hydrateProgress('classic')`; `toggleDone('classic', lesson.slug)`; `setLastViewed('classic', lesson.slug, scrollY)`; read done via `isDone('classic', lesson.slug)` / `doneCount('classic')`.

- [ ] **Step 6: Type-check + build**

Run: `npm run check && npm run build`
Expected: clean; classic pages behave identically.

- [ ] **Step 7: Commit**

```bash
git add src/lib/progress.svelte.ts src/lib/progress-keys.test.ts src/routes/+page.svelte src/lib/components/Sidebar.svelte src/routes/done/+page.svelte "src/routes/lesson/[slug]/+page.svelte"
git commit -m "feat: namespace progress per course (classic keys unchanged)"
```

---

## Phase 3 — Parameterized AK routes

### Task 6: Add the `course` param matcher

**Files:**
- Create: `src/params/course.ts`
- Create: `src/params/course.test.ts`

The matcher restricts `[course=course]` to the three AK slugs, so the dynamic route can never shadow `/lesson`, `/glossary`, `/search`, `/playground`, `/done`.

- [ ] **Step 1: Write failing test**

`src/params/course.test.ts`:
```ts
import { describe, it, expect } from 'vitest';
import { match } from './course';

describe('course param matcher', () => {
	it('accepts the three AK slugs', () => {
		expect(match('build-an-app')).toBe(true);
		expect(match('how-types-work')).toBe(true);
		expect(match('understand-and-build')).toBe(true);
	});
	it('rejects other top-level segments', () => {
		for (const s of ['lesson', 'glossary', 'search', 'playground', 'done', '']) {
			expect(match(s)).toBe(false);
		}
	});
});
```

- [ ] **Step 2: Run to verify it fails**

Run: `npm test`
Expected: FAIL — module not found.

- [ ] **Step 3: Implement `src/params/course.ts`**

```ts
import type { ParamMatcher } from '@sveltejs/kit';
import { AK_COURSES } from '$lib/courses';

const slugs = new Set(AK_COURSES.map((c) => c.routeSlug));

export const match: ParamMatcher = (param) => slugs.has(param);
```

- [ ] **Step 4: Run to verify it passes**

Run: `npm test`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/params/course.ts src/params/course.test.ts
git commit -m "feat: course param matcher (guards AK route tree)"
```

### Task 7: AK lesson route (prerendered)

**Files:**
- Create: `src/routes/[course=course]/lesson/[slug]/+page.server.ts`
- Create: `src/routes/[course=course]/lesson/[slug]/+page.svelte`
- Reference: `src/routes/lesson/[slug]/+page.server.ts` and `.svelte` (mirror them, course-aware)

- [ ] **Step 1: Create the server loader**

`src/routes/[course=course]/lesson/[slug]/+page.server.ts`:
```ts
import { error } from '@sveltejs/kit';
import { getCourseBySlug, courseLesson, courseNeighbors } from '$lib/courses';
import { AK_COURSES } from '$lib/courses';
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
```

- [ ] **Step 2: Create the page**

Mirror `src/routes/lesson/[slug]/+page.svelte` but: read `data.courseId`/`data.courseSlug`; build all internal links as `{base}/{data.courseSlug}/lesson/{slug}`; pass `data.courseId` to every progress call (`hydrateProgress`, `isDone`, `toggleDone`, `doneCount`, `setLastViewed`); keep mounting `Playground`, `Predict`, `Toc`. Render `<LeetCode slug={lesson.slug}/>` and `<Exercises slug={lesson.slug}/>` unchanged — they return empty for AK slugs until data is added, so AK "now you try" lives inline via `:::predict`/`:::quiz`/`:::play`.

`src/routes/[course=course]/lesson/[slug]/+page.svelte`:
```svelte
<script lang="ts">
	import { mount, unmount, tick, onMount, untrack } from 'svelte';
	import { base } from '$app/paths';
	import Playground from '$lib/components/Playground.svelte';
	import Predict from '$lib/components/Predict.svelte';
	import Exercises from '$lib/components/Exercises.svelte';
	import LeetCode from '$lib/components/LeetCode.svelte';
	import Toc from '$lib/components/Toc.svelte';
	import {
		hydrateProgress,
		isDone,
		toggleDone,
		doneCount,
		setLastViewed
	} from '$lib/progress.svelte';

	let { data } = $props();
	const courseId = $derived(data.courseId);
	const courseSlug = $derived(data.courseSlug);
	hydrateProgress(data.courseId);

	const lesson = $derived(data.lesson);
	const done = $derived(isDone(courseId, lesson.slug));
	const total = $derived(data.totalLessons);
	const count = $derived(doneCount(courseId));
	// ... mirror the classic lesson page's body (TOC rail toggle, scroll restore,
	//     playground/predict mounting via decode+mountPlay) verbatim, with two
	//     substitutions: every progress call takes `courseId`, and every lesson
	//     href is `{base}/{courseSlug}/lesson/{neighbor.slug}`.
</script>
```
**Implementation note for the executor:** copy the full script + markup of `src/routes/lesson/[slug]/+page.svelte` into this file, then apply exactly these substitutions: (a) add `courseId`/`courseSlug` from `data`; (b) `hydrateProgress(courseId)`; (c) `isDone(courseId, …)`, `toggleDone(courseId, …)`, `doneCount(courseId)`, `setLastViewed(courseId, …)`; (d) prev/next + "back to course" links become `{base}/{courseSlug}/lesson/{slug}` and `{base}/{courseSlug}`. Do not change the playground/predict mounting logic.

- [ ] **Step 3: Build**

Run: `npm run build`
Expected: prerenders `/build-an-app/lesson/the-bug`, `/how-types-work/lesson/what-is-a-check`, `/understand-and-build/lesson/the-bug` (the stubs). No prerender errors.

- [ ] **Step 4: Commit**

```bash
git add "src/routes/[course=course]/lesson"
git commit -m "feat: parameterized AK lesson route (prerendered)"
```

### Task 8: AK course landing route

**Files:**
- Create: `src/routes/[course=course]/+page.ts`
- Create: `src/routes/[course=course]/+page.svelte`

- [ ] **Step 1: Create the loader**

`src/routes/[course=course]/+page.ts`:
```ts
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
```

- [ ] **Step 2: Create the landing page**

`src/routes/[course=course]/+page.svelte` — mirrors the classic home roadmap, course-aware, and embeds the switcher (Task 10):
```svelte
<script lang="ts">
	import { base } from '$app/paths';
	import CourseSwitcher from '$lib/components/CourseSwitcher.svelte';
	import { hydrateProgress, courseDone, courseLast } from '$lib/progress.svelte';

	let { data } = $props();
	hydrateProgress(data.courseId);
	const done = $derived(courseDone(data.courseId));
	const doneCount = $derived(data.lessons.filter((l) => done[l.slug]).length);
	const last = $derived(courseLast(data.courseId));
	const resume = $derived(
		(last && data.lessons.find((l) => l.slug === last.slug)) ??
			data.lessons.find((l) => !done[l.slug]) ??
			data.lessons[0]
	);
</script>

<svelte:head>
	<title>{data.title} — TypeScript for Pythonistas</title>
	<meta name="description" content={data.tagline} />
</svelte:head>

<div class="page">
	<main class="prose home">
		<div class="kicker">{data.spine}</div>
		<h1>{data.title}</h1>
		<p class="lead">{data.tagline}</p>

		<div class="cta-row">
			<a class="btn primary" href="{base}/{data.courseSlug}/lesson/{resume.slug}">
				{doneCount > 0 ? 'Continue' : 'Start'} → {resume.title}
			</a>
			<span class="muted">{doneCount} / {data.lessons.length} lessons done</span>
		</div>

		<h2>The roadmap</h2>
		<ol class="roadmap">
			{#each data.lessons as l}
				<li class:done={done[l.slug]}>
					<a href="{base}/{data.courseSlug}/lesson/{l.slug}">
						<span class="r-num">{String(l.order).padStart(2, '0')}</span>
						<span class="r-body">
							<span class="r-title">{l.title}</span>
							{#if l.subtitle}<span class="r-sub">{l.subtitle}</span>{/if}
						</span>
					</a>
				</li>
			{/each}
		</ol>

		<h2>Pick a different path</h2>
		<CourseSwitcher current={data.courseId} />
	</main>
</div>
```

- [ ] **Step 3: Build**

Run: `npm run build`
Expected: prerenders `/build-an-app`, `/how-types-work`, `/understand-and-build`. (Switcher import resolves after Task 10; if running tasks in order, create `CourseSwitcher.svelte` first or temporarily comment its use.)

- [ ] **Step 4: Commit**

```bash
git add "src/routes/[course=course]/+page.ts" "src/routes/[course=course]/+page.svelte"
git commit -m "feat: AK course landing route"
```

---

## Phase 4 — Switcher + course-aware sidebar

### Task 9: Make the sidebar course-aware

**Files:**
- Modify: `src/lib/components/Sidebar.svelte`

The sidebar must show the *active* course's lessons/phases, derived from the URL (source of truth), and offer a course switch. Classic (`/...`, `/lesson/...`) → classic; an AK slug prefix → that course.

- [ ] **Step 1: Derive active course from the URL**

In `Sidebar.svelte` `<script>`, replace the `import { lessons }` line and phase block with:
```ts
import { page } from '$app/state';
import { base } from '$app/paths';
import { COURSES, getCourseBySlug, getCourseById, type CourseId } from '$lib/courses';
import { hydrateProgress, courseDone } from '$lib/progress.svelte';

const activeCourse = $derived.by(() => {
	// page.url.pathname includes the base path; strip it, then read first segment.
	const path = page.url.pathname.slice(base.length).replace(/^\//, '');
	const seg = path.split('/')[0];
	return getCourseBySlug(seg) ?? getCourseById('classic');
});
hydrateProgress(activeCourse.id);
const done = $derived(courseDone(activeCourse.id));
const lessons = $derived(activeCourse.lessons);
const lessonHref = (slug: string) =>
	activeCourse.id === 'classic'
		? `${base}/lesson/${slug}`
		: `${base}/${activeCourse.routeSlug}/lesson/${slug}`;
const homeHref = $derived(activeCourse.id === 'classic' ? `${base}/` : `${base}/${activeCourse.routeSlug}`);
const phases = $derived(
	activeCourse.phases.map((p) => ({
		label: p.label,
		items: lessons.filter((l) => l.order >= p.range[0] && l.order <= p.range[1])
	}))
);
```

- [ ] **Step 2: Update the markup to use `lessonHref`/`homeHref` and a course `<select>`**

- Replace hard-coded `{base}/lesson/{l.slug}` with `{lessonHref(l.slug)}`, and the home/brand link with `{homeHref}`.
- Replace `progress.done[...]` reads with `done[...]`.
- Add a compact switch near the sidebar header:
```svelte
<label class="course-switch">
	<span class="sr-only">Course</span>
	<select
		value={activeCourse.id}
		onchange={(e) => {
			const c = getCourseById(e.currentTarget.value as CourseId);
			localStorage.setItem('ts-learn:course', c.id);
			goto(c.id === 'classic' ? `${base}/` : `${base}/${c.routeSlug}`);
		}}
	>
		{#each COURSES as c}
			<option value={c.id}>{c.title}</option>
		{/each}
	</select>
</label>
```
(`goto` is already imported in the sidebar.)

- [ ] **Step 3: Type-check + build**

Run: `npm run check && npm run build`
Expected: clean.

- [ ] **Step 4: Commit**

```bash
git add src/lib/components/Sidebar.svelte
git commit -m "feat: course-aware sidebar with course switch"
```

### Task 10: The `CourseSwitcher` card component + home integration

**Files:**
- Create: `src/lib/components/CourseSwitcher.svelte`
- Modify: `src/routes/+page.svelte` (home — add switcher + persist default)

- [ ] **Step 1: Create the component**

`src/lib/components/CourseSwitcher.svelte`:
```svelte
<script lang="ts">
	import { base } from '$app/paths';
	import { COURSES, type CourseId } from '$lib/courses';
	let { current }: { current?: CourseId } = $props();
	const href = (slug: string) => (slug === '' ? `${base}/` : `${base}/${slug}`);
	function remember(id: CourseId) {
		try {
			localStorage.setItem('ts-learn:course', id);
		} catch {
			/* ignore */
		}
	}
</script>

<ul class="course-cards">
	{#each COURSES as c}
		<li class:current={c.id === current}>
			<a href={href(c.routeSlug)} onclick={() => remember(c.id)}>
				<span class="cc-title">{c.title}</span>
				<span class="cc-tag">{c.tagline}</span>
				<span class="cc-spine">{c.spine}</span>
			</a>
		</li>
	{/each}
</ul>

<style>
	.course-cards {
		list-style: none;
		padding: 0;
		margin: 1rem 0 0;
		display: grid;
		gap: 0.75rem;
		grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
	}
	.course-cards a {
		display: flex;
		flex-direction: column;
		gap: 0.25rem;
		padding: 0.9rem 1rem;
		border: 1px solid var(--border, #d0d7de);
		border-radius: 10px;
		text-decoration: none;
		height: 100%;
	}
	.course-cards li.current a {
		border-color: var(--accent, #0969da);
	}
	.cc-title {
		font-weight: 650;
	}
	.cc-tag {
		font-size: 0.9rem;
	}
	.cc-spine {
		font-size: 0.8rem;
		opacity: 0.7;
	}
</style>
```

- [ ] **Step 2: Add the switcher to the classic home**

In `src/routes/+page.svelte`, import and render it near the roadmap:
```svelte
import CourseSwitcher from '$lib/components/CourseSwitcher.svelte';
```
Add before "How to read each lesson":
```svelte
<h2>Four ways to learn this</h2>
<p>Same TypeScript, four spines. Pick how you want to learn it — your choice is remembered.</p>
<CourseSwitcher current="classic" />
```

- [ ] **Step 3: Build + spot check**

Run: `npm run build`
Expected: clean; home shows 4 cards.

- [ ] **Step 4: Commit**

```bash
git add src/lib/components/CourseSwitcher.svelte src/routes/+page.svelte
git commit -m "feat: course switcher cards on home + landings"
```

---

## Phase 5 — Search scope

### Task 11: Scope search to the active course

**Files:**
- Modify: `src/routes/search/+page.ts`
- Modify: `src/routes/search/+page.svelte` (read active course from URL `?course=` or default classic)
- Reference: `src/lib/search.ts`

Keep classic search behavior the default; when arrived at from an AK course, search that course. The sidebar search form (Task 9) appends `&course=<routeSlug>` when the active course is not classic.

- [ ] **Step 1: Read course in the search loader**

In `src/routes/search/+page.ts`, resolve the course from `url.searchParams.get('course')` via `getCourseBySlug`, default to classic's `lessons`, and index *that* course's lessons. (Mirror the existing indexing call but feed it `course.lessons`.)

- [ ] **Step 2: Sidebar search submit carries the course**

In `Sidebar.svelte` `submitSearch`, append `&course=${activeCourse.routeSlug}` when `activeCourse.id !== 'classic'`.

- [ ] **Step 3: Build + check**

Run: `npm run check && npm run build`
Expected: clean.

- [ ] **Step 4: Commit**

```bash
git add src/routes/search/+page.ts src/routes/search/+page.svelte src/lib/components/Sidebar.svelte
git commit -m "feat: scope search to active course"
```

---

## Phase 6 — Authoring conventions (read before Phases 7–11)

These phases write markdown. They are verified by **render correctness**, not unit tests: after writing each episode, run `npm run build` (must prerender with no errors) and open the page in the browser (`npm run preview`) to confirm code highlights, `:::predict`/`:::quiz` reveal, and `:::play` mounts.

**AK episode template (every AK episode follows it):**
1. **Cold open** — the end state or a bug, in the first screenful.
2. **Motivate** — why it matters; anchor to Python, contrast C++/Java where it sharpens.
3. **Build from scratch** — smallest version, live, narrate every line; perform an error (`:::compare` / `:::play`).
4. **Hit the wall** — let the limitation bite.
5. **Introduce the abstraction** — as the efficient version of what we just built.
6. **Reveal** — the toy is the real thing (or, for TS, the real mental model).
7. **Recap + foreshadow** — one line back, one line forward.
8. **Now you try** — a `:::predict` or `:::quiz`, plus a `:::play` starter.

**Voice rules:** "we"/"you"/"I" register; anti-magic ("the compiler isn't guessing — here's exactly what it does"); anthropomorphize ("the compiler complains because…"); one analogy per hard concept, reused. **Honesty:** never claim you rebuilt `tsc`; you rebuilt the mental model.

**Cross-language contrast bank (reuse across courses):** structural vs nominal (TS/Python-duck-typing vs Java/C++ name-based); `T[]`/`Record<K,V>` vs `list[T]`/`dict`; generics vs C++ templates (monomorphized) / Java generics (erased) / Python `TypeVar`; `null`/`undefined` vs `nullptr`/`None`/`Optional<T>`; `===` vs `==`; compile step + erasure vs interpreter.

---

## Phase 7 — Course `app` content (Build a Real App, 10 episodes)

Each task below = **one episode file** in `src/lib/content-app/`. For every task: write the `.md` per the brief and the AK template, then `npm run build` (prerender clean), then commit `git add src/lib/content-app/NN-*.md && git commit -m "content(app): epNN <slug>"`. Replace the Phase-3 stub in Task 12. App-state shows what `todo.ts` looks like entering and leaving the episode.

### Task 12 — ep01 `01-the-bug.md` — "The bug types would have caught"
- **Cold open:** a 15-line plain-JS todo app; call `addTodo` with a typo'd field; it silently stores `undefined`, prints wrong later. No error until runtime.
- **Topic:** why types; compile step vs Python/JS interpreter; what "caught at build time" means.
- **App in → out:** none → `todo.js` (untyped) renamed `todo.ts`, still no annotations, `tsc --noEmit` already flags one thing.
- **Contrast:** Python ships the same bug to runtime; Java/C++ wouldn't compile.
- **Now you try:** `:::predict` — which line does `tsc` flag first? `:::play` the broken snippet.
- **Foreshadow:** "next: give `Task` a shape."

### Task 13 — ep02 `02-a-shape-for-task.md` — "Primitives + the Task shape"
- **Topic:** primitive annotations (`string`/`number`/`boolean`), `interface Task`, inference (don't over-annotate).
- **App in → out:** untyped `todo.ts` → `interface Task { id: number; title: string; done: boolean }` + a typed `tasks: Task[]`.
- **Contrast:** `dataclass`/`TypedDict` → `interface`; C++ `struct`/Java class fields.
- **Wall→reveal:** annotate everything (noisy) → let inference drop the obvious ones.
- **Now you try:** `:::quiz` on inferred vs annotated.

### Task 14 — ep03 `03-structural-typing.md` — "Why TS accepts that object"
- **Topic:** structural typing; excess-property checks on literals.
- **App in → out:** add an `addTask(input)` that accepts any object with the right shape.
- **Contrast:** Python duck typing (same) vs Java/C++ nominal (must name the type). This is the deliberate-novelty callout for nominal-typing folks.
- **Now you try:** `:::predict` whether a bigger object is assignable.

### Task 15 — ep04 `04-interface-vs-type.md` — "interface vs type"
- **Topic:** `interface` vs `type`, when each; unions need `type`.
- **App in → out:** introduce `type TaskId = number` and keep `interface Task`.
- **Contrast:** Python `TypeAlias`; Java has no structural alias.

### Task 16 — ep05 `05-status-union.md` — "A union for status + narrowing"
- **Topic:** unions, literal types, discriminated narrowing, exhaustive `switch` + `never`.
- **App in → out:** `done: boolean` → `status: 'todo' | 'doing' | 'done'`; a `label(status)` with exhaustive switch.
- **Contrast:** Python `Literal`/`Enum`; C++ `enum`; Java `enum` + `switch`.
- **Now you try:** `:::predict` what happens when you add a 4th status (the `never` error).

### Task 17 — ep06 `06-null-undefined.md` — "The find that might miss"
- **Topic:** `null` vs `undefined`, `strictNullChecks`, optional props, narrowing the maybe-missing.
- **App in → out:** `findTask(id)` returns `Task | undefined`; handle it; add `tags?: string[]`.
- **Contrast:** `Optional[X]`/`None`; `nullptr`; Java `Optional<T>` / NPE.

### Task 18 — ep07 `07-generic-store.md` — "A reusable Store<T>"
- **Topic:** generics, inference, constraints (`<T extends { id: number }>`).
- **App in → out:** hand-rolled task array → `class Store<T extends { id: number }>` (add/get/all); `Store<Task>`.
- **Contrast:** `TypeVar`/`Generic`; C++ templates (monomorphized); Java generics (erased) — tie erasure back to "types vanish."

### Task 19 — ep08 `08-typing-the-handlers.md` — "Functions: the command handlers"
- **Topic:** function types, params/returns, optional/default/rest params, call signatures.
- **App in → out:** `add`/`complete`/`edit`/`filter` command handlers typed; a `Command` function type.
- **Contrast:** `*args`/`**kwargs` → rest/optional; Python callable types.

### Task 20 — ep09 `09-a-class-or-not.md` — "Classes (an optional OO take)"
- **Topic:** classes, access modifiers, `implements`, why you often don't need them in TS.
- **App in → out:** offer `class TaskStore implements Store<Task>` as an alternative to the functional store; discuss tradeoff.
- **Contrast:** Python classes/`self`; Java/C++ access modifiers & interfaces.

### Task 21 — ep10 `10-utility-types-and-strict.md` — "Utility types + strict capstone & gotchas"
- **Topic:** `Partial`/`Pick`/`Omit`/`Record`; `Partial<Task>` for edits; turn on full `strict`; JS-reality gotchas (`===`, mutation, `JSON.parse` returns `any`, types vanish at runtime — callback to ep01).
- **App in → out:** `editTask(id, patch: Partial<Task>)`; final `tsconfig` strict; ship it.
- **Now you try:** `:::quiz` spotting a runtime-only bug types can't catch.
- **Foreshadow:** point to the `checker` course for "why tsc can do this."

(After Task 21, delete the stub: `git rm src/lib/content-app/01-the-bug.md` only if you renamed; here ep01 *is* `01-the-bug.md`, so just overwrite it in Task 12.)

---

## Phase 8 — Course `both` content (Understand It & Build It, 12 episodes)

Flagship. Act 1 (ep01–03) hand-builds a runtime checker for the app's data, hits the wall, reveals `tsc` and deletes the guards on camera. Act 2 (ep04–12) grows the same todo app in real TS with periodic "remember the checker?" callbacks. Files in `src/lib/content-both/`. Same per-task workflow + commit message `content(both): epNN <slug>`.

### Task 22 — ep01 `01-the-bug.md` — "Ship it in JS, feel the pain"
- Cold open the same silent runtime bug (as app/ep01) but frame toward "what if we caught this ourselves?"
- App: plain-JS todo app.
- Foreshadow: "we'll build a guard by hand."

### Task 23 — ep02 `02-guard-by-hand.md` — "A runtime checker, from scratch"
- **Topic:** write `isTask(value): boolean` by hand — check each field's `typeof`; `validateStatus`. Pure JS, no TS yet.
- **Reveal-in-progress:** this hand-checker IS what a type check is — a function from value to yes/no.
- Contrast: Python `isinstance`/manual validation; this is the mental model of a checker.

### Task 24 — ep03 `03-the-wall-and-tsc.md` — "The wall → meet tsc"
- **Wall:** guards everywhere, verbose, runtime cost, and they only fire *after* the code runs.
- **Reveal:** `tsc` does this at compile time, structurally, for free. **Delete the hand guards on camera**; add `interface Task` + annotations; same safety, zero runtime code.
- **Honesty beat:** you rebuilt the *mental model*, not `tsc`. Static structural ≠ runtime `typeof`.
- App: guards deleted; `interface Task` introduced (primitives + structural typing land here).

### Task 25 — ep04 `04-structural-typing.md` — "Why tsc accepts that shape"
- Topic: structural typing (callback: "your hand-checker also didn't care about the name, just the fields").
- Contrast: Java/C++ nominal.

### Task 26 — ep05 `05-interface-vs-type.md` — interface vs type, `type TaskId`.
### Task 27 — ep06 `06-status-union.md` — status union + discriminated narrowing + `never` (callback: "your `validateStatus` guard, now a type").
### Task 28 — ep07 `07-null-undefined.md` — `Task | undefined` from `findTask`; `strictNullChecks`; `tags?`.
### Task 29 — ep08 `08-generic-store.md` — `Store<T extends {id:number}>` (callback: "remember writing `isTask`? a generic checker would take the shape as a parameter — that's `<T>`").
### Task 30 — ep09 `09-functions.md` — typed command handlers; `Command` type.
### Task 31 — ep10 `10-classes.md` — optional `class TaskStore`; access modifiers; `implements`.
### Task 32 — ep11 `11-utility-types.md` — `Partial<Task>` edits; `Pick`/`Omit`/`Record`.
### Task 33 — ep12 `12-strict-and-gotchas.md` — strict capstone; JS-reality gotchas; final callback: "the runtime guard we deleted is exactly the bug class types DON'T catch — `JSON.parse` still returns `any`." Ship it.

Each of Tasks 25–33: write per brief + AK template + cross-language contrast, `npm run build`, commit.

---

## Phase 9 — Course `checker` content (How Types Really Work, 10 episodes)

No app. The artifact is the checker. Build one type-kind per episode; reveal `tsc` at the end. Files in `src/lib/content-checker/`. Commit `content(checker): epNN <slug>`.

### Task 34 — ep01 `01-what-is-a-check.md` — "What even is a type check?"
- Cold open: a value and a question — "is this a valid Task?" A type check is a function `value → ok|error`. Build `checkString(v)`.
- Contrast: Python `isinstance`; the idea is language-agnostic.

### Task 35 — ep02 `02-primitives.md` — `checkNumber`/`checkBoolean`; a `Checker = (v: unknown) => Result` type (in TS now, used to build the checker).
### Task 36 — ep03 `03-object-shapes.md` — `checkObject(shape)` — structural checking by hand; this is structural typing, demonstrated mechanically.
### Task 37 — ep04 `04-interface-as-shape.md` — relate the hand `shape` map to an `interface`/`type`; interface vs type.
### Task 38 — ep05 `05-unions.md` — `checkUnion(...checkers)`; literal checks; how narrowing falls out of "which branch passed."
### Task 39 — ep06 `06-optional-null.md` — `checkOptional`; modeling `null`/`undefined`; contrast `Optional`/`nullptr`.
### Task 40 — ep07 `07-generic-checkers.md` — `checkArray<T>(elem)` — a checker parameterized by another checker; THIS is generics; contrast templates/erasure.
### Task 41 — ep08 `08-narrowing.md` — type guards (`v is Task`) — connect the hand-checker's boolean to TS's `value is T` narrowing.
### Task 42 — ep09 `09-functions-and-composition.md` — composing checkers; function types; higher-order checkers.
### Task 43 — ep10 `10-the-reveal.md` — **Reveal:** `tsc` is this whole checker, run at compile time, structurally, before your code ever executes. Honesty beat (mental model, not the real compiler). Gotchas: erasure means your runtime checker still has a job (`JSON.parse`, IO boundaries) — tie to validation libraries (zod) as "the runtime twin." Capstone: a tiny composed validator.

Each Task 34–43: write per brief + template, `npm run build`, commit.

---

## Phase 10 — Classic course enhancement (lighter touch, 12 lessons)

Do **not** restructure or rename. For each existing file in `src/lib/content/`, enhance toward AK style: add a cold-open hook to the lesson's opening, ensure at least one performed error (`:::compare`/`:::play` showing the red squiggly + the fix), anti-magic phrasing, a `:::predict` or `:::quiz` "now you try" if absent, and one C++/Java contrast where it sharpens the existing Python anchor. Keep all slugs, frontmatter, and existing `:::` blocks.

For each task: edit the file, `npm run build`, `git commit -m "content(classic): enhance <slug> toward AK style"`.

- [ ] **Task 44** — `01-setup-story.md`: stronger cold-open (the bug that motivates the whole course).
- [ ] **Task 45** — `02-primitives-variables.md`: add a performed inference error; Java/C++ declaration contrast.
- [ ] **Task 46** — `03-structural-typing.md`: nominal-typing contrast (Java/C++) as deliberate-novelty callout.
- [ ] **Task 47** — `04-interface-vs-type.md`: add "now you try" predict.
- [ ] **Task 48** — `05-unions-intersections.md`: exhaustiveness `never` performed error.
- [ ] **Task 49** — `06-null-undefined.md`: `Optional`/`nullptr`/NPE contrast.
- [ ] **Task 50** — `07-generics.md`: C++ template / Java erasure contrast (already strong on Python — add the others).
- [ ] **Task 51** — `08-narrowing-guards.md`: cold-open with a guard bug.
- [ ] **Task 52** — `09-functions.md`: performed overload/param error.
- [ ] **Task 53** — `10-classes.md`: Java/C++ access-modifier contrast; anti-magic on `this`.
- [ ] **Task 54** — `11-utility-types.md`: "now you try" predict on `Partial`/`Pick`.
- [ ] **Task 55** — `12-js-reality-gotchas.md`: tie to the courses' shared gotchas list; cross-link the AK courses.

---

## Phase 11 — Glossary: AK voice + new entries

**Files:** `src/lib/glossary/entries/*.md`

- [ ] **Task 56** — Revoice existing entries toward AK style: each entry's `short` stays a crisp 1–2 sentences; bodies get anti-magic framing + a Python anchor and, where it helps, a C++/Java contrast. Do not change slugs or frontmatter keys (`term`, `short`, `domain`, `related`). After edits: `npm run build`, commit `docs(glossary): AK-voice existing entries`.
- [ ] **Task 57** — Add new entries the AK courses link to (create only those referenced by `[[…]]` in the new content; e.g. `runtime-check`, `type-guard`, `erasure`, `discriminated-union` if missing, `structural-vs-nominal`). For each: one file `slug.md` with `term`/`short`/`domain`/`related` + body. Run `npm run build` (the `[[…]]` resolver must find every referenced slug — a missing slug renders as plain text, so grep new content for `[[` and confirm each resolves). Commit `docs(glossary): add AK-course entries`.

**Cross-link check:**
- [ ] Run: `grep -rhoE '\[\[[^]]+\]\]' src/lib/content-app src/lib/content-both src/lib/content-checker | sort -u` — every referenced slug must exist under `src/lib/glossary/entries/`.

---

## Phase 12 — Verification

### Task 58 — Full build + type + unit gate

- [ ] Run: `npm test` — all unit tests pass.
- [ ] Run: `npm run check` — zero errors.
- [ ] Run: `npm run build` — prerenders classic (`/`, `/lesson/*`) + all three AK landings + every AK lesson (cartesian) with no prerender errors.
- [ ] Commit any fixes.

### Task 59 — Behavior spot-check (browser)

- [ ] Run: `npm run preview`. Use the `/browse` gstack skill (per CLAUDE.md, never the chrome MCP) to verify:
  - Home `/` shows 4 course cards; each links to its landing (classic → `/`).
  - Sidebar course `<select>` switches courses and nav swaps to that course's lessons.
  - An AK lesson renders: code highlights, `:::predict`/`:::quiz` reveal, `:::play` mounts the live playground.
  - Mark a lesson done in `app`; confirm classic + `checker` counts are unaffected (per-course progress isolation).
  - Active-course preference persists across reload.

### Task 60 — Lighthouse gate (hard requirement)

- [ ] Use `/benchmark` (gstack) or Lighthouse on the **production build** (`npm run build` + a static server, base path matching deploy) for: classic home, a classic lesson, one AK landing, one AK lesson.
- [ ] **Required:** Performance / Accessibility / Best-Practices / SEO = 100 on desktop and mobile, **except mobile Performance ≥ 99** (known mobile-FCP ceiling — memory `lighthouse-mobile-sidebar`).
- [ ] If any score regresses: confirm no new client dependency slipped in, all new pages are prerendered, and inline-style threshold still covers new CSS. Fix before sign-off.
- [ ] Final commit: `chore: verify three AK courses (build + lighthouse green)`.

---

## Self-review notes (author)

- **Spec coverage:** registry (Task 4) · classic untouched routes (Tasks 2, 6 matcher) · AK routes (7,8) · switcher (9,10) · per-course progress (5) · search scope (11) · todo-app spine (Phases 7,8 briefs) · three arcs (Phases 7/8/9) · classic enhancement (Phase 10) · glossary AK voice + entries (Phase 11) · Python-primary + C++/Java contrast (Phase 6 bank, used in every content task) · Lighthouse gate (Task 60). All spec sections map to a task.
- **Naming consistency:** `getCourseById`/`getCourseBySlug`/`courseLesson`/`courseNeighbors`/`AK_COURSES` used identically across Tasks 4, 6, 7, 8, 9, 10, 11. Progress API `hydrateProgress`/`isDone`/`toggleDone`/`doneCount`/`setLastViewed`/`courseDone`/`courseLast`/`storageKeys` consistent across Tasks 5, 7, 8, 9, 10. `routeSlug` values match the identity table everywhere.
- **No placeholders** in infra tasks (full code given). Content tasks carry concrete briefs (cold-open, app-state in→out, topics, contrast, now-you-try) — the authoring spec an executor needs; prose is the execution output.
