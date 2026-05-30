# ts-learn Revamp Plan

Prioritized, actionable plan to sharpen the teaching experience for an expert Python→TS learner. Each item: **what / why (principle) / effort**. Effort = S (hours), M (a day), L (multi-day).

**Guiding constraint (applies to everything):** voice stays **brief, clear, engaging; no beginner hand-holding**. Advanced depth goes *off the main path* into a **glossary** (Phase 2). The default lesson is the lean spine; the glossary is the optional rabbit hole.

---

## Phase 0 — Quick wins (do first, low risk, high return)

| # | What | Why (principle) | Effort |
|---|------|-----------------|--------|
| 0.1 | **Add "predict before reveal" to the misconception beats.** Put a `:::play` (or a pre-quiz) *above* the explanation in `01` (erasure), `12` (`[]` truthy, `==`), `03` (excess-property), `06` (null/undefined). "Predict the output, then Run." | Productive failure (16) + conceptual change (10) + retrieval (5) | S–M |
| 0.2 | **Trim the insulting/redundant prose** in `02` (let/const, primitives) and the repeated "same as mypy" lines in `07`. Cut prose that restates an adjacent code comment. | Cognitive load / minimalism (3, 15); protect competence (23) | S |
| 0.3 | **Add 2–3 micro-retrievals per lesson** (short `:::quiz` items), at least one recalling an *earlier* lesson. | Retrieval (5) + spacing (6) | M |
| 0.4 | **Calibrate trivial exercises up.** Replace `setup-story`'s `double` and similar with TS-edge tasks (exhaustive discriminated-union `switch`, `T extends keyof T` getter, user-defined guard, branded type). | Deliberate practice (13); Bloom Analyze+ (12); expertise reversal (4) | M |
| 0.5 | **Promote the truthiness misconception** (`12`) to a flagged "this *will* bite you" callout — it's the highest-value negative-transfer correction. | Conceptual change (10); expert blind spot (9) | S |

---

## Phase 1 — Assessment & practice system

| # | What | Why (principle) | Effort |
|---|------|-----------------|--------|
| 1.1 | **Cumulative / interleaved review set.** A `/review` route (or end-of-course lesson) mixing questions across many lessons; resurfaces high-decay primitives (`unknown` vs `any`, excess-property checks, two empties). | Interleaving (7) + spacing (6) + desirable difficulty (8) | M–L |
| 1.2 | **Type-error-checked exercises.** Extend the exercise runner so an exercise can assert *"this must fail to compile"* / *"this must narrow correctly,"* not only runtime `assert`. TS lives at compile time — practice should too. | Deliberate practice (13); immediate feedback (18) | L |
| 1.3 | **Difficulty calibration per topic.** Tag exercises Apply/Analyze/Create; ensure no-Python-analog topics (`11`, `08` flow analysis) carry the hardest, richest sets, and transfer topics carry few/easy. | Expertise reversal (4); Bloom (12) | M |
| 1.4 | **Spaced resurfacing in `progress.svelte.ts`.** Track quiz/exercise outcomes; surface a "due for review" nudge on the home page for items answered wrong or seen long ago. | Spacing (6); SDT competence (23) | L |
| 1.5 | **Lean on LeetCode as optional autonomy extra**, biased toward problems that stress *types*, not just algorithms. Keep honest `why` framing. | Autonomy/relatedness (23); deliberate practice (13) | S |

---

## Phase 2 — Content restructure + the glossary (the big lever)

| # | What | Why (principle) | Effort |
|---|------|-----------------|--------|
| 2.1 | **Build the glossary feature** (detailed below). | Just-in-time (14); cognitive load (3); minimalism (15) | L |
| 2.2 | **Move depth off the main path into glossary entries.** Every "by the way…" digression, every advanced footnote, every Python-internals aside leaves the lesson and becomes a linked term. Lessons get *shorter*. | Just-in-time (14); load (3) | M (per lesson) |
| 2.3 | **Densify the no-analog lessons** (`11`, conditional/mapped types, variance). These need *more* worked steps, not uniform brevity — there's no prior chunk to lean on. | Expertise reversal, reversed (4); worked examples (4) | M–L |
| 2.4 | **Add type-flow / assignability diagrams** (dual coding) for structural assignability (`03`), narrowing flow (`08`), and the erase pipeline (`01`). | Dual coding (20); chunking (21) | M |
| 2.5 | **Standardize lesson skeleton:** one-sentence model → 1 `:::compare` → predict-`:::play` → tight body → 2–3 retrievals → recap. Codify the already-good pattern so every lesson fades fast and consistently. | Concreteness fading (19); chunking (21); minimalism (15) | M |

---

## The Glossary — pedagogy-first design

The glossary is **not** a dictionary bolted on. It is the mechanism that lets the main lessons stay lean while offering unlimited optional depth. It is the app's implementation of **just-in-time learning** (Principle 14) and **extraneous-load offloading** (Principle 3) for an expert audience that pulls detail on demand rather than having it pushed.

### Interaction model (core requirement)

- **Hover a glossary term → brief side-note** (a 1–3 sentence tooltip/popover). Just enough to keep reading without breaking flow. This is the *peek*.
- **Click a term → full standalone glossary page** with the deep explanation, examples, and links. This is the *dive*.
- **Why this split works:** hover serves the reader who needs a *reminder* (zero flow cost — no navigation, no context switch); click serves the reader who needs to *learn it properly* (full page, full attention). Two distinct cognitive needs, two distinct affordances — this is exactly the minimalist "support fast action, depth on demand" doctrine (Principle 15) and protects the main path's low extraneous load (Principle 3).
- **Flow protection:** the hover note must never require interaction to dismiss or it becomes friction; the click must open without losing lesson scroll position (new view or restorable back). Breaking reading flow would defeat the entire purpose.

### What belongs in the glossary vs inline

| Inline (in the lesson) | Glossary (linked term) |
|---|---|
| The one-sentence model and the *load-bearing* mapping | The deep "why," edge cases, spec-level detail |
| The single tightest example | Additional examples, variations, corner cases |
| The misconception confrontation (must be in-flow) | The full mechanism behind the misconception |
| Anything needed to do the next exercise | Anything that's *interesting but optional* |

**Rule of thumb:** if removing it makes the lesson *unable to support the next task*, it's inline. If it's "an expert might enjoy going deeper here," it's a glossary term.

### Scope: any advanced concept, not just TS

Per requirement, an entry can cover **TS, JS, Python, or general dev/SWE** — whatever a senior reader might want to dive on. Examples of legitimate entries:

- **TS:** variance (covariance/contravariance), conditional types, mapped types, declaration merging, `infer`, branding, distributive conditional types.
- **JS:** the event loop, prototype chain, `this` binding rules, coercion algorithm behind `==`, TDZ, modules vs CommonJS.
- **Python (advanced internals are fair game):** descriptor protocol, MRO/C3 linearization, `__slots__`, GIL, how `typing.Protocol` matches structurally, the metaclass machinery behind `TypeVar`, why `int(x)` differs from a TS `as`.
- **General SWE:** structural vs nominal typing theory, type erasure across languages (Java/TS parallels), Hindley–Milner inference, soundness vs completeness.

**Why this breadth helps the expert:** their curiosity and prior knowledge span all four. A glossary that can satisfy "wait, how does Python's descriptor protocol relate to this?" *uses* their expertise (transfer, Principle 2) and feeds autonomy + competence (Principle 23) — without polluting the lean TS spine.

### How the glossary serves the principles

- **Just-in-time (14):** depth appears exactly when the learner reaches for it, never before.
- **Cognitive load (3):** every term moved out of a lesson is extraneous load removed from the default path; the budget goes to germane learning.
- **Minimalism (15):** lessons stay action-first; the glossary is the "support error recovery / go deeper" channel without padding the main flow.
- **Transfer & analogical bridging (2):** Python-internals entries let the bridge run *both* directions on demand.
- **Autonomy (23):** the learner chooses depth. Hover = "I'm fine, just reminding me." Click = "I want the real thing." The system never decides for them.
- **Dual coding (20):** glossary pages have room for the diagram/example that the lean lesson can't afford.

### Build notes (pedagogy-driven, not prescriptive engineering)

- Author terms in markdown with frontmatter (`term`, short `summary` for the hover note, body for the page) — mirrors the existing lesson markdown pipeline (`src/lib/content/`, `render.ts`).
- Mark terms in lesson markdown with a directive (e.g. `[[variance]]` or a `:::term`-style inline) so authors can link inline without breaking the lean prose — same custom-extension approach already used for `:::compare`/`:::quiz`/`:::play`.
- The hover summary = the entry's `summary` field; the click target = the entry's page. One source, two surfaces.
- Glossary should be **searchable** alongside lessons (extend the existing search) — supports the just-in-time "I hit a wall, what is X" entry point.

---

## Suggested sequencing

1. **Phase 0** (a few days): immediate, visible improvement; de-risks nothing else.
2. **Phase 2.1–2.2** (glossary + offload): unlocks lean lessons; do early because every later content edit benefits.
3. **Phase 1** (assessment system): the durable-learning engine (spacing/interleaving/type-checked practice).
4. **Phase 2.3–2.5** (densify no-analog topics, diagrams, standardized skeleton): polish once the structure supports it.

**One-line philosophy:** keep the spine *lean and fast for an expert*, make the learner *predict and retrieve* instead of re-read, and push *all optional depth into a hover-then-click glossary* so the main path never insults their time.
