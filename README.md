# TypeScript for Pythonistas

A self-contained course app that teaches TypeScript by mapping every feature to its
Python equivalent. Built for someone fluent in Python — leads with contrasts, skips
the basics.

**Live: https://abdullah-alnahas.github.io/ts-for-pythonistas/**

**Stack:** Bun · SvelteKit · Svelte 5 (runes) · `adapter-static` · `marked` + `shiki`.

## Run it

```bash
bun install
bun run dev          # dev server at http://localhost:5173
bun run build        # static site -> ./build
bun run preview      # serve the production build
bun run check        # svelte-check (type checking)
```

The build is fully static (prerendered) — drop `./build` on any static host.

## How it works

- **Lessons are markdown** in `src/lib/content/NN-slug.md` with `title` / `subtitle`
  frontmatter. `src/lib/content/index.ts` globs them, parses frontmatter, and orders
  by the `NN` prefix. To add or edit a lesson, just edit the markdown — no code changes.
- **Rendering happens at build time** in `src/routes/lesson/[slug]/+page.server.ts`
  (a server load), so the HTML is baked into the static pages and `shiki` stays out of
  the client bundle.
- **`src/lib/render.ts`** wires `marked` + `shiki` and adds two custom block syntaxes:

  Side-by-side Python | TypeScript:
  ````md
  :::compare
  ```python
  x = 1
  ```
  ```typescript
  const x = 1;
  ```
  :::
  ````

  Reveal-answer quick checks:
  ````md
  :::quiz
  The question (markdown).
  :::answer
  The answer (markdown).
  :::
  ````

- **Progress** (which lessons are marked done) and **theme** (auto/light/dark) persist
  to `localStorage` via `src/lib/progress.svelte.ts`.

## Curriculum

1. The setup story — compile/erase model
2. Primitives & variables
3. Structural typing
4. `interface` vs `type`
5. Union & intersection types
6. `null` vs `undefined`
7. Generics
8. Narrowing & type guards
9. Functions, deeply
10. Classes
11. Advanced & utility types
12. The JS reality layer & gotchas
