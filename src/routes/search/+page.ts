// The search page reads ?q= from the live URL and runs the in-memory index in
// the browser. Prerender a static shell (ssr=false → no server render, just the
// client mount point) so a direct hit / refresh to /search returns a real 200
// page on a static host; the client then reads ?q= and runs the index on mount.
export const prerender = true;
export const ssr = false;
