// Per-lesson "done" state + resume affordance, persisted to localStorage.
// Svelte 5 runes module.
const KEY = 'tsfp-progress';
const LAST_KEY = 'tsfp-last';

function load(): Record<string, boolean> {
	if (typeof localStorage === 'undefined') return {};
	try {
		return JSON.parse(localStorage.getItem(KEY) ?? '{}');
	} catch {
		return {};
	}
}

interface LastViewed {
	slug: string;
	scrollY: number;
}

function loadLast(): LastViewed | null {
	if (typeof localStorage === 'undefined') return null;
	try {
		const raw = localStorage.getItem(LAST_KEY);
		if (!raw) return null;
		const v = JSON.parse(raw) as Partial<LastViewed>;
		if (typeof v.slug !== 'string') return null;
		return { slug: v.slug, scrollY: typeof v.scrollY === 'number' ? v.scrollY : 0 };
	} catch {
		return null;
	}
}

export const progress = $state<{ done: Record<string, boolean>; last: LastViewed | null }>({
	done: {},
	last: null
});

let hydrated = false;

export function hydrateProgress(): void {
	if (hydrated) return;
	progress.done = load();
	progress.last = loadLast();
	hydrated = true;
}

export function toggleDone(slug: string): void {
	progress.done = { ...progress.done, [slug]: !progress.done[slug] };
	if (typeof localStorage !== 'undefined') {
		localStorage.setItem(KEY, JSON.stringify(progress.done));
	}
}

export function isDone(slug: string): boolean {
	return !!progress.done[slug];
}

export function doneCount(): number {
	return Object.values(progress.done).filter(Boolean).length;
}

/** A2.4: record the last lesson the user viewed and their scroll position. */
export function setLastViewed(slug: string, scrollY: number): void {
	progress.last = { slug, scrollY };
	if (typeof localStorage !== 'undefined') {
		localStorage.setItem(LAST_KEY, JSON.stringify(progress.last));
	}
}

export function getLastViewed(): LastViewed | null {
	return progress.last;
}
