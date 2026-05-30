# 02 — Principles Applied to ts-learn

How each principle does / should play out in the real app. Grounded in actual source: `Sidebar.svelte`, `routes/+page.svelte` (home), `routes/lesson/[slug]/+page.svelte`, `routes/search/+page.svelte`, `routes/playground/+page.svelte`, `Playground.svelte`, `ExerciseCard.svelte`, `LeetCode.svelte`, `render.ts`, `progress.svelte.ts`, `global.css`.

**✅ = already done well · ⚠️ = violated/underused · 💡 = opportunity**

The app is already strong: clean type scale, dual-theme with proper Shiki dual highlighting, a fixed spacing rhythm, a focused 760px measure, side-by-side Python↔TS compare blocks, try-before-reveal quizzes, a real in-browser TS compiler. Most gaps are about *feedback states, navigation reach, a11y of custom widgets, and the missing glossary layer*.

---

## Anchoring to prior knowledge (the whole premise)

- ✅ The course's spine — "lead with the contrast, learn the surprise" (home `lead`) and `:::compare` Python-left / TS-right blocks — is textbook *anchoring to prior knowledge*. The Python-blue vs TS-blue label colors (`global.css` `.compare-label`) reinforce it via *similarity*.
- 💡 This anchoring should extend to the **glossary**: an entry on, say, "structural typing" should open with the Python framing the learner already holds, then the TS reality. The glossary is where anchoring scales beyond the linear lessons.

## Visibility of system status / Feedback / Doherty Threshold

- ✅ Strong where it exists: `progress-fill` bar, sidebar `done ✓` checkmarks, exercise `saved ✓`, `passed / total passing`, playground `✓ type-checks` vs `N type errors`, `Loading the TypeScript compiler (first run only)…`.
- ⚠️ **No skeleton/visible status during lesson nav.** Lessons render server-side, but the `:::play` blocks hydrate client-side in an `$effect` after `tick()` (`lesson/[slug]/+page.svelte`). Before hydration the `.play-mount` div is empty — a silent gap. Add a skeleton/placeholder ("Loading playground…") so there's no blank flash (Doherty, perceived performance, avoid layout shift).
- ⚠️ **Search has no loading/typing affordance** and the empty (no-query) state shows nothing at all (`search/+page.svelte`). A zero state ("Type to search 12 lessons") would teach and reassure (empty-state-as-onboarding).
- ⚠️ Playground "Run" busy state is good, but the first compile can take seconds with no progress indicator beyond text — consider a spinner/indeterminate bar (Doherty: mask latency >400ms).

## Hick's Law / Miller's Law / Chunking

- ✅ Sidebar is well chunked: **Tools** group + **Lessons** group with labels (`sidebar-group-label`). 12 lessons is within reason.
- ✅ Lessons themselves chunk via `## H2` sections with bottom borders, a clear recap, and one quiz — good working-memory management.
- ⚠️ As lessons or a glossary grow, a flat list of 12+ items in one scroll will strain Miller's Law. Consider grouping lessons into 3–4 named phases (Basics / Types / Generics & Advanced / JS Reality) — also helps *serial position* (the sagging middle gets a fresh "start").

## Fitts's Law / Targets

- ✅ Sidebar links and roadmap rows are full-width flex targets with padding — large, easy hits.
- ⚠️ The lesson **prev/next** `navlink`s are small text links (`font-size: 0.92rem`) at the page bottom — the single most-repeated navigation action in the app deserves bigger, button-like targets (Fitts + frequency).
- ⚠️ Theme toggle buttons are small (`0.78rem`, `0.3rem` padding) — borderline for touch (<44px). Acceptable as a low-frequency control, but worth a min-height bump.

## Jakob's Law / Consistency & Standards

- ✅ Layout is a conventional docs shell: fixed left sidebar + scrolling content (`global.css` `.sidebar-wrap` / `.app-shell`). Matches MDN/docs-site mental models.
- ⚠️ Two different search experiences: a sidebar mini-search that **navigates** to `/search`, plus the full `/search` page. Fine, but ensure consistent placeholder/voice. The sidebar input says "Search lessons…"; the page says "e.g. discriminated union…". Keep them consistent in promise.
- 💡 Glossary links should look like a **consistent, recognizable signifier** everywhere they appear (e.g. dotted underline) so users learn "this word has more behind it" once and reuse that knowledge (Jakob within the app).

## Recognition over Recall

- ✅ Active states in sidebar (`a.active`) and roadmap show "you are here." Progress checkmarks let users recognize what's left rather than recall it.
- ⚠️ **No in-page table of contents / heading anchors.** Long lessons (06, 09, 12 are 6–8KB) force the reader to scroll and *recall* structure. A sticky per-lesson TOC (built from `##` headings) supports recognition + wayfinding.
- 💡 The glossary is fundamentally a *recognition-over-recall* tool: instead of remembering what "discriminated union" means, the learner recognizes the styled term and hovers.

## Progressive Disclosure

- ✅ Already used well: `:::quiz` answers are `<details>` (try before reveal); the playground hides type diagnostics until Run; LeetCode practice is below the fold.
- 💡 **This is the glossary's reason to exist.** The content rule — "brief inline, link out to depth" — *is* progressive disclosure. Advanced asides (e.g. the `keyof`/indexed-access note in Lesson 07, the `async ⇒ Promise<T>` blockquote) should stay one line inline and link to a glossary page for learners who want the deep version. Today those asides are inline-only, so brevity and depth fight each other.

## Visual Hierarchy / Typography / Whitespace

- ✅ Excellent: clear scale (H1 2rem, H2 1.4rem, H3 1.12rem), `--maxw: 760px` measure, line-height 1.65, `kicker` eyebrow in accent, generous section margins. The *Aesthetic-Usability Effect* is working for the app.
- ✅ Whitespace and the 8px-ish rhythm are consistent; cards (`.ex`, `.pg`, `.quiz`) use *common region* correctly.
- ⚠️ Body is 17px/1.65 — good — but inline `code` at `0.86em` plus mono can get tight in dark mode; verify contrast (below).

## Gestalt (Proximity / Similarity / Common Region)

- ✅ Compare blocks, quiz cards, exercise cards, LeetCode cards all use bordered *common regions* — grouping is unambiguous.
- ✅ Difficulty pills (`.lc-diff.easy/medium/hard`) use *similarity* via consistent semantic color.
- 💡 Glossary side-notes (hover popovers) should read as a distinct *figure* over *ground* (subtle shadow/elevation, `--bg-elev`) so they're clearly a transient layer, not inline content.

## Von Restorff / Serial Position / Peak-End / Goal-Gradient / Zeigarnik

- ✅ Primary CTA on home (`.btn.primary`, TS-blue fill) is *isolated* from secondary actions — good Von Restorff.
- ✅ Progress bar + `done ✓` + per-exercise "🎉 All tests pass" hit *Goal-Gradient* and *Peak-End* (a satisfying micro-ending). The home "Continue → {lesson}" CTA leverages *Zeigarnik* (resume the unfinished task).
- ⚠️ **The lesson's *end* is underbuilt for Peak-End.** The footer is a "Mark done" button + small prev/next. The biggest emotional beat (finishing a lesson) deserves more: a celebratory confirmation, "you've done X/12", and a strong, obvious "Next lesson" CTA. Right now the *end* — which disproportionately shapes memory — is muted.
- ⚠️ Course-level completion has **no finale** (no "course complete" peak). Consider one.

## Cognitive Load Theory / Scaffolding / Concrete-before-abstract

- ✅ The pedagogy is sound: concrete compare examples → the rule → recap → active-recall quiz → exercises with immediate feedback → LeetCode transfer. That's *worked-example → faded practice* and *immediate feedback* done right (`ExerciseCard` runs real tests + shows TS diagnostics).
- ⚠️ Extraneous load risk: dense advanced asides inline (Lesson 07's `keyof`+indexed-access paragraph) raise intrinsic+extraneous load mid-lesson. **Move depth to the glossary** so the lesson flow stays light (germane load goes to the core mapping).

## Color & Contrast / WCAG / Accessibility

- ✅ Semantic, consistent color: TS-blue accent, Python-blue, `--ok` green, red `#cf222e` for errors, amber for warnings — never color-alone (icons `✓`/`✕`, text labels accompany).
- ✅ Dual theme with `prefers-color-scheme` + manual override persisted (`tsfp-theme`).
- ⚠️ **Verify contrast in both themes.** `--fg-muted` (#656d76 light / #9198a1 dark) on elevated/code backgrounds for small text (`.small` 0.82rem, mono diagnostics 0.78rem) is the likely AA-risk zone. The amber `#bf8700` warning text and difficulty pills on tinted `color-mix` backgrounds also need checking (≥4.5:1).
- ⚠️ **Focus visibility is partial.** Search inputs have `:focus` outlines, but generic `.btn`, `.theme-toggle button`, `<summary>`, sidebar links, and prev/next links rely on the browser default — easy to lose against tinted hover backgrounds. Add an explicit, consistent `:focus-visible` ring globally.
- ⚠️ **Custom-widget semantics.** The quiz uses native `<details>`/`<summary>` (good, accessible). But the theme toggle is a `role="group"` of buttons without indicating the *selected* one to AT (`aria-pressed` missing). Progress bar is a styled `<div>` with a `title` only — no `role="progressbar"`/`aria-valuenow`.
- ⚠️ **Heading order.** Lesson injects `data.html` whose top heading is `##` while the page renders the `<h1>` separately — verify no skipped levels and that injected `@html` headings are reachable.

## Responsive / Mobile

- ✅ Real responsive work: sidebar collapses to a top bar <880px, compare grid stacks <720px, page padding shrinks. Good.
- ⚠️ Below 880px the **entire sidebar becomes a tall static top block** (`position: static`) — brand + progress + search + Tools + all 12 lessons + theme toggle push the actual lesson far down the page. On mobile this is a lot of scroll before content. Consider a collapsed/hamburger nav.
- ⚠️ **Hover-based glossary will not work on touch** — must have a tap-to-open equivalent (see File 03 anti-patterns).

## Microinteractions / Performance / States

- ✅ `progress-fill` width transition, hover backgrounds, button states are tasteful microinteractions.
- ⚠️ Missing states catalog: search **empty/zero state**, lesson **playground-hydrating** state, and any **error** state if the TS engine fails to load (Playground has a runtime-error path, good; the embed in lessons should too).
- 💡 Honor `prefers-reduced-motion` for the progress-bar transition and any future popover animation.

---

## Where the glossary fits (cross-cutting)

The glossary is the missing UX surface that makes the "brief but clear, link out for depth" rule physically possible. Mapped to principles:

- **Progressive disclosure** — inline brevity, depth on demand.
- **Recognition over recall** — styled terms the learner recognizes instead of memorizing.
- **Cognitive load** — keeps lesson flow light; offloads intrinsic complexity to opt-in pages.
- **Anchoring** — each entry can re-anchor to Python/JS/general-SWE knowledge.
- **Jakob/consistency** — one consistent term signifier learned once, reused everywhere.
- **Information scent** — hover preview lets users judge whether the full page is worth a click before navigating.
- **A11y/Jakob risk** — hover-only is the classic anti-pattern; the glossary must be keyboard- and touch-first (detailed in File 03).
