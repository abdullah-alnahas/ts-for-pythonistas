// Provide Svelte 5 rune stubs for Vitest (node environment).
// $state in .svelte.ts files is compiled away by the Svelte plugin when
// used inside SvelteKit, but plain Vitest needs a minimal stub so that
// module-level $state() calls don't throw ReferenceError.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
(globalThis as any).$state = <T>(v: T): T => v;
