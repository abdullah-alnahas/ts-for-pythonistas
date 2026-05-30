# ts-learn — Consolidated Revamp Plan (2-Stream Parallel Execution)

Merges the UX plan (`docs/ux/03-revamp-plan.md`) and the pedagogy plan (`docs/teaching/03-revamp-plan.md`) into **two work streams that execute 100% in parallel with zero shared files and zero build-time dependencies.**

## Guiding rules (both streams)
- Voice: **brief, clear, engaging. No beginner hand-holding.** Expert Python→TS audience.
- Inline stays lean; depth goes to the **glossary** (hover = brief side-note, click = full page).
- Smallest diff that achieves the goal. Don't break working functionality.

---

## The parallelism contract (why there are no collisions)

Partition is by **file ownership**, not by feature. Every file has exactly one owner. The two streams never edit the same file, and neither imports a *new* module the other creates.

| Concern | Owner |
|---|---|
| All `*.svelte` (layout, home, lesson, search, playground, sidebar, components) | **Stream A** |
| All routes (`src/routes/**`) incl. new `/glossary` routes | **Stream A** |
| `src/lib/render.ts`, `progress.svelte.ts`, `search.ts`, `playground.ts`, `index.ts` | **Stream A** |
| `src/lib/styles/global.css` | **Stream A** |
| New glossary content (`src/lib/glossary/**`) + glossary entries | **Stream A** |
| The 12 lesson markdown files `src/lib/content/*.md` | **Stream B** |
| `src/lib/exercises.ts`, `src/lib/leetcode.ts` (data only, signatures frozen) | **Stream B** |
| `docs/**` planning notes for own stream | each its own subfolder |

**Decoupling guarantees:**
1. Stream B uses **only existing** markdown directives (`:::compare`, `:::quiz`, `:::play`) and existing markdown. So B's files render correctly no matter what A does. A's new `[[glossary]]` directive is **additive** in `render.ts` — unknown directives already pass through, so nothing B writes breaks, and A doesn't need B.
2. Stream B must **not change the exported types/signatures** of `exercises.ts` / `leetcode.ts` (only the data, plus *optional* fields). So A's components keep compiling against the same interface.
3. Stream A builds the glossary **end-to-end with its own glossary entries and cross-links** — it does NOT depend on B inserting any `[[term]]` into lessons. The glossary is fully demonstrable on its own index + entry pages.
4. Neither stream imports a new module authored by the other.

**Deferred to a tiny post-merge integration pass (NOT part of either parallel stream):**
- Sprinkling `[[term]]` glossary links into the lesson prose (needs both A's directive and B's final prose — do after both land).
- Wiring quiz/exercise *outcomes* into spaced-repetition resurfacing (needs A's progress engine + B's question set — do after both land).

---

## STREAM A — Shell, Accessibility & Glossary Engine

Owns the chrome, navigation, a11y, and the whole glossary system. All sourced from the UX plan, plus the glossary engine that the pedagogy plan also asked for.

### A1 — A11y & quick wins (UX Phase 1)
- **A1.1 Global `:focus-visible` ring** — one consistent high-contrast focus style for `.btn`, theme toggle, `<summary>`, sidebar/roadmap links, prev/next, search. *(Focus visibility, keyboard a11y. S — `global.css`.)*
- **A1.2 Contrast audit + fixes** — `--fg-muted` small text, amber warnings, pills on tinted bg vs WCAG AA 4.5:1 in both themes; adjust tokens. *(WCAG. S–M.)*
- **A1.3 Bigger button-like prev/next** — convert `.navlink` to card/button targets with explicit labels ("← Previous: Unions" / "Next: Narrowing →"). *(Fitts, mapping, peak-end. S.)*
- **A1.4 Playground hydrating skeleton** — render "Loading interactive playground…" placeholder in `.play-mount`, reserve height, before client `$effect` hydrates. *(Visibility of status, no CLS, Doherty. S.)*
- **A1.5 Search empty/zero state** — helpful prompt + sample queries when no query; sample-query nudge on no-results. *(Empty-state-as-onboarding. S.)*
- **A1.6 ARIA on stateful widgets** — `aria-pressed` on theme toggle; `role="progressbar"` + `aria-valuenow/min/max` on progress bar. *(Semantic a11y. S.)*
- **A1.7 `prefers-reduced-motion` guard** — wrap progress-bar transition and all future popover/scroll motion. *(Reduced-motion a11y. S.)*
- **A1.8 Stronger lesson-completion beat** — on "Mark done": brief celebratory confirmation + "X / 12 done" + big Next CTA inline. *(Peak-End, Goal-Gradient. S–M.)*

### A2 — Navigation & structure (UX Phase 2)
- **A2.1 Per-lesson sticky TOC** — build from `##` headings (emit heading ids in `render.ts`), anchor links, sticky on wide / collapsible on mobile. *(Recognition over recall, wayfinding, F-pattern. M.)*
- **A2.2 Group lessons into named phases in sidebar** — *Foundations (01–04)*, *The Type System (05–08)*, *Functions & Classes (09–10)*, *Advanced & JS Reality (11–12)*. *(Miller's Law, chunking, serial-position. M.)*
- **A2.3 Mobile sidebar as drawer** — replace tall static stack <880px with hamburger/drawer or slim expandable top bar. *(Responsive ergonomics, Fitts. M.)*
- **A2.4 Resume affordance** — persist last-viewed lesson + scroll pos in `progress.svelte.ts`; "Continue where you left off" on home/sidebar. *(Zeigarnik, user control. M.)*
- **A2.5 Course-completion finale** — real "course complete" state/page at 12/12. *(Peak-End, Goal-Gradient. M.)*

### A3 — THE GLOSSARY ENGINE (UX Phase 2 item 14 + pedagogy 2.1; largest item, L)
Build end-to-end and self-contained (own entries, own cross-links). Build order:
1. **Entry schema + index page** `/glossary` — markdown entries with frontmatter `term`, `summary` (hover text), `domain` (ts|js|py|swe), body = deep explanation + examples. Index is searchable/alphabetized, grouped by domain. Static, no popover yet. Add to sidebar **Tools** group.
2. **Full term pages** `/glossary/[slug]` — deep explanation, examples, Python/JS anchoring, cross-links to related entries.
3. **Markdown extension** for inline triggers in `render.ts` — `[[term]]` (or `{gloss:slug}`) → styled trigger (dotted/dashed accent underline) + preview text from the entry's `summary`. Single source of truth.
4. **Accessible popover component** — hover → brief side-note (1–2 sentences); ~100–150ms open delay; close grace period + tolerance (diagonal problem); hoverable popover; one-at-a-time; dismiss on leave-after-grace / `Esc` / scroll / route-change / click-outside. **Keyboard:** real `<button>`/`<a>` in tab order, focus opens preview, `Esc` closes, Enter/click navigates; `aria-describedby` to popover; no focus-steal on hover. **Positioning:** right-margin side-note on wide screens, flip/clamp to viewport, never cover the term; connector to source.
5. **Touch / bottom-sheet variant** — first tap opens preview + "Read full →" affordance; bottom sheet on small screens (no hover-only, no iOS double-tap hack); ≥44px tap target; reduced-motion; final a11y audit.
6. **Search integration** — index glossary entries into existing search (`search.ts`) so "what is X" hits glossary too.

**Seed entries** (so the engine is demonstrable independent of lessons): variance (covariance/contravariance), conditional types, mapped types, `infer`, declaration merging, branded types; JS event loop, prototype chain, `this` binding, `==` coercion algorithm, TDZ; Python descriptor protocol, MRO/C3, `__slots__`, GIL, `typing.Protocol` structural matching; structural-vs-nominal typing, type erasure, Hindley–Milner, soundness vs completeness. Cross-link these to each other (demonstrates the `[[term]]` directive on glossary pages themselves).

**Anti-patterns to avoid:** hover-only no keyboard/touch; instant-disappear popover; tooltip covering term/next line; full deep text in hover; inconsistent signifier; `title=` tooltips; auto-open on scroll/load; focus trap/steal.

### A4 — Polish (UX Phase 3)
- **A4.1 Motion/microinteraction pass** — subtle reduced-motion-aware transitions on popovers, TOC active-section highlight, done-checkmarks. *(Aesthetic-Usability, microinteractions. M.)*
- **A4.2 Error states for in-browser engine** — graceful "compiler failed to load — retry" in lesson `:::play` embeds. *(Error recovery, visibility. S–M.)*
- **A4.3 Consistent microcopy voice** — align search placeholders, brief-but-engaging copy in the shell. *(Consistency, aesthetic-usability. S.)*

### Stream A — file allowlist
`src/routes/**`, all `src/lib/components/*.svelte`, `src/lib/render.ts`, `src/lib/progress.svelte.ts`, `src/lib/search.ts`, `src/lib/playground.ts`, `src/lib/content/index.ts`, `src/lib/styles/global.css`, NEW `src/lib/glossary/**`, NEW `src/routes/glossary/**`, `src/app.html`, `src/app.d.ts`.
**Do NOT touch:** any `src/lib/content/*.md` lesson file, `src/lib/exercises.ts`, `src/lib/leetcode.ts`.

---

## STREAM B — Lesson Content & Exercises

Owns the teaching substance. All sourced from the pedagogy plan. Pure content/data — no `.svelte`, no routes, no engine code. Uses **only existing** directives (`:::compare`, `:::quiz`, `:::play`).

### B1 — Content quick wins (pedagogy Phase 0)
- **B1.1 Predict-before-reveal on misconception beats** — add a `:::play` (or pre-`:::quiz`) *above* the explanation in `01` (erasure), `12` (`[]` truthy, `==`), `03` (excess-property), `06` (null/undefined): "Predict the output, then Run." *(Productive failure + conceptual change + retrieval. S–M.)*
- **B1.2 Trim insulting/redundant prose** — cut hand-holding in `02` (let/const, primitives) and repeated "same as mypy" in `07`; delete prose that restates an adjacent code comment. *(Cognitive load / minimalism; protect competence. S.)*
- **B1.3 Add 2–3 micro-retrievals per lesson** — short `:::quiz` items, at least one recalling an *earlier* lesson. *(Retrieval + spacing. M.)*
- **B1.4 Calibrate trivial exercises up** — in `exercises.ts`, replace `setup-story`'s `double` and similar with TS-edge tasks: exhaustive discriminated-union `switch`, `T extends keyof T` getter, user-defined guard, branded type. *(Deliberate practice; Bloom Analyze+; expertise reversal. M.)*
- **B1.5 Promote the truthiness misconception** (`12`) — flagged "this *will* bite you" callout; highest-value negative-transfer correction. *(Conceptual change; expert blind spot. S.)*

### B2 — Content restructure (pedagogy Phase 2.2–2.5)
- **B2.1 Move depth off the main path** — every "by the way…", advanced footnote, Python-internals aside leaves the lesson. **Because the glossary directive may not exist yet, do NOT write `[[term]]` into lessons in this pass.** Instead: cut the digression and collect it into `docs/teaching/glossary-candidates.md` (term + the deep text) for the post-merge linking pass. Lessons get *shorter* now; links get added later. *(Just-in-time, load. M.)*
- **B2.2 Densify no-analog lessons** — `11` (utility types), conditional/mapped types, variance, `08` flow analysis need *more* worked steps, not uniform brevity. *(Worked examples; expertise reversal reversed. M–L.)*
- **B2.3 Add type-flow / assignability diagrams** — dual coding via ASCII/mermaid-in-markdown for structural assignability (`03`), narrowing flow (`08`), erase pipeline (`01`). Use only markdown that the existing renderer already supports. *(Dual coding, chunking. M.)*
- **B2.4 Standardize lesson skeleton** — one-sentence model → 1 `:::compare` → predict-`:::play` → tight body → 2–3 retrievals → recap. Apply consistently across all 12. *(Concreteness fading, chunking, minimalism. M.)*

### B3 — Assessment data (pedagogy Phase 1, data-only portion)
- **B3.1 Difficulty calibration per topic** — in `exercises.ts`, tag exercises Apply/Analyze/Create via an **optional** field (don't change required signature); load the hardest sets onto no-Python-analog topics (`11`, `08`), keep transfer topics light. *(Expertise reversal; Bloom. M.)*
- **B3.2 Cumulative/interleaved review question set** — author a mixed-topic question set as **data** (extend `exercises.ts` data or add entries tagged `review`) resurfacing high-decay primitives (`unknown` vs `any`, excess-property checks, two empties). *(Engine/route that consumes it is Stream A or a later pass — B only provides the data, signatures frozen.)* *(Interleaving + spacing + desirable difficulty. M.)*
- **B3.3 LeetCode framing pass** — in `leetcode.ts`, bias suggestions toward problems that stress *types* not just algorithms; keep honest `why` framing. *(Autonomy/relatedness; deliberate practice. S.)*

### Stream B — file allowlist
`src/lib/content/01-*.md` … `12-*.md` (the 12 lessons), `src/lib/exercises.ts`, `src/lib/leetcode.ts`, NEW `docs/teaching/glossary-candidates.md`.
**Constraints:** use only existing markdown directives; do NOT add `[[term]]`/glossary syntax; do NOT change exported types/function signatures of `exercises.ts`/`leetcode.ts` (data + optional fields only); do NOT touch `index.ts`, any `.svelte`, routes, `render.ts`, `progress.svelte.ts`, `search.ts`, `global.css`.

---

## After both streams land (sequential, ~30 min, not parallel)
1. Insert `[[term]]` glossary links into lesson prose using A's directive + B's `glossary-candidates.md`.
2. Promote any B glossary-candidate deep texts into real `src/lib/glossary/**` entries (or merge with A's seeds).
3. Wire B's review question set into A's progress/`/review` engine + spaced-repetition resurfacing.
4. Full build + a11y + reduced-motion + mobile pass.
