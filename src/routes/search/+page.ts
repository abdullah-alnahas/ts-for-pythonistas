// The search page reads ?q= from the live URL and runs the in-memory index in
// the browser, so it can't be prerendered to static HTML (the global
// prerender=true in +layout.ts would otherwise try to and fail at build time).
export const prerender = false;
export const ssr = false;
