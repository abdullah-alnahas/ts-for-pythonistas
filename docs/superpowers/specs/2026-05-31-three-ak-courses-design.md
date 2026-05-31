# Design: Three Karpathy-style TypeScript courses + course switcher

**Date:** 2026-05-31
**Status:** Approved design (pending written-spec review)

## Goal

The site currently ships one TypeScript course ("Mapped to Python") for experienced
Python developers. Add **three new courses** that teach the same TypeScript surface in
[Andrej Karpathy's teaching style](../../ak-teaching-style.md) (build-from-scratch,
anti-magic, one running artifact, live error-fixing, "now you try"), each with a
different *spine*. The existing course stays live and is *enhanced* (not rewritten)
toward the same style. A switcher lets the reader pick a course.

## Audience & voice (ALL courses, including classic)

- Primary audience: experienced **Python developers and SWEs**.
- Primary analogy anchor stays **Python** (the Rosetta mapping).
- Pull in **C++ and Java** for contrast where it sharpens a point — e.g. structural vs
  nominal typing (Java/C++ name-based), generics vs C++ templates / Java generics,
  `null` vs `nullptr` / `Optional<T>`, compile step vs interpreter, erasure.
- Karpathy voice: motivation before mechanism, intuition before formalism, anti-magic,
  anthropomorphize the compiler, perform errors instead of hiding them, "we"/"you"/"I"
  register, one analogy per hard concept reused consistently.

## The four courses

| id (internal) | Card name | URL | Spine |
|---|---|---|---|
| `classic` | **Mapped to Python** | `/` (unchanged) | Existing topic-by-topic course, enhanced toward AK style |
| `app` | **Build a Real App** | `/build-an-app` | One typed todo app that grows every episode |
| `checker` | **How Types Really Work** | `/how-types-work` | Hand-build a type checker from scratch, reveal `tsc` |
| `both` | **Understand It & Build It** | `/understand-and-build` | Flagship: hand-built checker *coupled with* the growing app |

Internal ids (`both`/`app`/`checker`) name the content dirs; the URL slug is the
reader-facing `[course]` route param.

## A. Course model (registry)

New `src/lib/courses.ts` — single source of truth.

```ts
interface Course {
  id: 'classic' | 'app' | 'checker' | 'both';
  routeSlug: string;        // '', 'build-an-app', 'how-types-work', 'understand-and-build'
  title: string;            // card name
  tagline: string;
  spine: string;            // one-line description of the running artifact
  lessons: Lesson[];
}
```

- The existing `src/lib/content/index.ts` markdown-glob + frontmatter parser is factored
  into a shared `parseCourse(globResult)` helper so all four loaders reuse one parser
  (no duplication). `classic` keeps reading `src/lib/content/`.
- New dirs: `src/lib/content-app/`, `src/lib/content-checker/`, `src/lib/content-both/`.
  Same frontmatter (`title`, `subtitle`) + same embedded-component conventions
  (Compare blocks, Predict, Exercises, LeetCode, Playground).
- Registry API: `getCourse(id|slug)`, `courseLessons(id)`, `getLesson(id, slug)`,
  `neighbors(id, slug)`. `lessons` stays exported (= classic) for back-compat with any
  consumer that does not pass a course.

## B. Routing & switch

- **Classic unchanged:** `/`, `/lesson/[slug]`. Live GitHub Pages URLs preserved
  (deployed under base path `/ts-for-pythonistas`; internal links keep the `{base}/`
  prefix — see memory `ts-learn-deploy`).
- **Three AK courses share ONE parameterized tree:**
  - `/[course]/` — course landing (roadmap, switcher).
  - `/[course]/lesson/[slug]` — lesson page.
  - `EntryGenerator` prerenders the cartesian product (each AK course × its slugs).
  - One `+layout`, one `Sidebar`, one lesson `+page` — no per-course duplication.
- **Switcher UI:** four cards on home `/` (the "about"/landing surface) and on each
  course landing, plus a compact course-switch control in the sidebar header. Active
  course persisted in `localStorage['ts-learn:course']`. A reader who picks a course
  lands on that course's `/[course]/` (classic → `/`).
- **Sidebar** reads the active course's lessons + phases reactively (phase groupings
  defined per course in the registry).

## C. Progress / glossary / search

- **Progress namespaced per course.** `progress.svelte.ts` gains an optional `courseId`.
  Storage key: classic keeps `tsfp-progress` (+ `tsfp-last`); others use
  `tsfp-progress:<id>` (+ `tsfp-last:<id>`). No cross-course collision; each course shows
  its own `X / N done` and resume target.
- **Glossary** stays global and shared by all four courses, but entries are rewritten to
  AK voice (anti-magic, anchored to Python with C++/Java contrast). New entries added as
  the AK courses need them.
- **Search** indexes the **active course's** lessons (small change to `search/+page.ts`
  to read from the registry by active course id).
- **Interactive components reused unchanged:** Playground, Predict, Exercises, LeetCode,
  Compare blocks, Toc. AK "now you try" exercises = Predict + Exercises.

## D. The running artifact (spine spec — locked)

A **typed CLI todo app**, accreting types episode by episode:

```
Task = { id; title; status; createdAt; tags? }
status: 'todo' | 'doing' | 'done'        // union -> discriminated narrowing
ops:    add · list · complete · edit · filter(status|tag)
Store<T>                                  // generics episode
command handlers                          // functions episode
class TaskStore (optional OO take)        // classes episode
Partial<Task> / Pick / Omit for edits     // utility-types episode
strict tsconfig                           // capstone
gotchas: == vs === · in-place mutation · JSON.parse returns any ·
         types vanish at runtime (callback to Act 1)
```

`app` and `both` build this app; `checker` does not (its artifact is the checker).

## E. Episode arcs (full topic coverage in each AK course, ~10–12 eps)

Every AK episode follows the template: **cold-open demo → motivate (Python/C++/Java
anchor) → build from scratch live → hit the wall → introduce the abstraction → reveal →
recap + foreshadow → "now you try."**

Topic set every AK course must cover (threaded differently): setup/why-types, primitives,
structural typing, interface vs type, unions & intersections, null/undefined, generics,
narrowing & guards, functions, classes, utility types, JS-reality gotchas.

- **Build a Real App (`app`, ~10):** cold-open a JS bug types would catch → go straight to
  annotations → the same todo app grows, one new TS idea per episode, no checker detour →
  strict capstone.
- **How Types Really Work (`checker`, ~10):** "what *is* a type check?" → hand-build a
  runtime checker, one type-kind per episode (string → object shape → union → generic) →
  reveal `tsc` is the compile-time, structural version. No app. **Honest framing: you
  rebuilt the mental model, not `tsc` itself** (per AK anti-magic + the doc's own caveat
  that language tooling does not rebuild 1:1 like micrograd→PyTorch).
- **Understand It & Build It (`both`, ~12, flagship):** ship the JS bug → hand-build
  runtime guards for the app's data → *wall* ("exhausting, and it only catches bugs AFTER
  the code runs") → reveal `tsc`, **delete the hand guards on camera**, add annotations →
  app keeps growing in real TS with periodic "remember the checker?" callbacks → strict
  capstone. The checker is Act 1 of the app's spine, not a parallel artifact.

## F. Classic course enhancement (not rewrite)

- Keep all slugs, structure, ordering, embedded components.
- Adapt toward AK style: add cold-opens, perform errors (show the red squiggly + fix),
  anti-magic phrasing, "now you try" prompts where missing, and C++/Java contrast notes.
- Touch is lighter than the 3 new courses — enhancement, not reconstruction.

## G. Performance gate (hard requirement)

- **Lighthouse: 100 on Performance/Accessibility/Best-Practices/SEO desktop AND mobile,
  except mobile Performance = 99** (known mobile-FCP ceiling — see memory
  `lighthouse-mobile-sidebar`; CDN does not fix it).
- All new pages prerendered through the existing build-time shiki + marked pipeline.
  **No new client-side dependencies.** Switcher = static cards + a `localStorage` write +
  normal link. Sidebar course-switch = link. No runtime markdown, no client highlighter.
- Reuse existing fonts/images/CSS; no new render-blocking resources.

## H. What stays untouched

- Classic routes (`/`, `/lesson/[slug]`) keep their URLs and prerendered output (content
  edited, wiring unchanged).
- `progress.svelte.ts` only *gains* an optional `courseId` param defaulting to the classic
  keys — existing calls keep working byte-for-byte.

## I. Verification

- `npm run build` clean (all four courses prerender; cartesian entries generate).
- Classic routes render identical to before (spot-check 2–3 lessons).
- Switcher persists active course across reloads; per-course progress isolates (set done
  in `app`, confirm `checker`/classic unaffected).
- Browser spot-check: each AK landing + one lesson per AK course (components mount, code
  highlights, Predict/Exercises work).
- **Lighthouse run** on: classic home, classic lesson, one AK landing, one AK lesson —
  desktop all 100, mobile all 100 except Performance ≥ 99.
- Type-check + lint clean (project hooks).

## J. Out of scope

- No build-time markdown include/transclude system (per-course dirs accept authoring-time
  reuse; forcing includes is more fragile than the duplication it saves).
- No change to glossary popover mechanics, playground engine, or deploy pipeline.
- No new course beyond the three; classic is enhanced in place.
