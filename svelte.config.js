import adapter from '@sveltejs/adapter-static';

/** @type {import('@sveltejs/kit').Config} */
const config = {
	compilerOptions: {
		runes: ({ filename }) => (filename.split(/[/\\]/).includes('node_modules') ? undefined : true)
	},
	kit: {
		adapter: adapter({
			pages: 'build',
			assets: 'build',
			fallback: '200.html',
			precompress: false,
			strict: true
		}),
		// GitHub Pages project site is served under /<repo>; the CI sets BASE_PATH.
		// Empty locally so dev/preview keep working at the root.
		paths: { base: process.env.BASE_PATH || '' },
		prerender: { handleHttpError: 'warn' },
		// Inline per-page CSS into the prerendered <head> so first paint needs no
		// extra stylesheet round-trips (largest chunk ~17KB). Removes the
		// render-blocking <link rel=stylesheet> requests — the main mobile FCP cost.
		inlineStyleThreshold: 40960
	}
};

export default config;
