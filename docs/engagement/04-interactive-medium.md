# 04 — Engagement Through the Interactive Medium

How the *medium itself* — not the prose — creates flow in `ts-learn`. The premise: an expert Python dev learns TypeScript fastest when they *run, predict, manipulate, and see results*, not when they read about them. This doc is about engagement and flow specifically (UX heuristics live in `docs/ux/`, pedagogy in `docs/teaching/`); here the unit of analysis is the *interactive moment*.

Grounded in current capability: `src/lib/render.ts` ships `:::play` (in-browser TS playground, hydrated client-side over a height-reserving skeleton), `:::quiz` (prompt → `<details>` reveal), `:::compare` (static Python/TS side-by-side — **not** runnable), and `[[term]]` glossary popovers. Lesson 08 already hand-draws a type-narrowing flow in ASCII; lesson 03 already uses "**Predict before you read on**" before a `:::quiz`. Those are the seams to widen.

---

## Principles (source → one line)

- **Reactive documents / "the reader runs the experiment"** (Victor, *Explorable Explanations*; Distill.pub) — engagement comes from the reader *changing a value and watching the consequence ripple*, not from a frozen example.
- **Learnable Programming: make state & behavior visible; kill hidden state** (Victor, *Learnable Programming*) — the environment should *show the data* the code is acting on; nothing important should be invisible or in the programmer's head.
- **Direct manipulation + immediate response** (Shneiderman; Victor) — continuous, reversible action on a visible object with instantly visible results is what produces the "I'm in control" feeling that sustains flow.
- **The active reader / "make the reader the protagonist"** (Nicky Case, *explorables*; Andy Matuschak) — the reader should *do the thing*, with their own input on screen, not watch the author do it.
- **Generation effect** (Slamecka & Graf) — information you *produce* (a prediction, a guess, a completed line) is retained far better than information you read. A committed guess is an engagement hook *and* a memory hook.
- **Predict-then-reveal / predict-then-run** (Hypothesis-driven debugging; Mazur peer instruction) — committing a guess *before* running creates a stake; the reveal then lands as confirmation or productive surprise. The commitment is the engagement, not the answer.
- **Doherty Threshold (<400ms) + microinteractions** (Doherty & Thadani; Saffer) — sub-400ms, legible feedback keeps the seeking loop alive; latency above ~1s breaks flow and trains the reader to stop poking.
- **Dual coding** (Paivio; Distill interactive figures) — a small interactive diagram of a *process* (type narrowing, assignability) beats a paragraph because the reader watches the mechanism move.
- **Flow: clear goals, immediate feedback, challenge≈skill** (Csikszentmihalyi) — each interactive block should have an obvious thing to do, an instant result, and difficulty matched to an expert (no hand-holding, no triviality).
- **Honest momentum, not gamified slop** (Self-Determination Theory: autonomy/competence/relatedness; Deterding on dark patterns) — forward motion should come from *real* competence signals (it compiled, you predicted right, the next lesson builds on this), never fake confetti, streak-guilt, or manipulative nags.

---

## Concrete interactive moves for ts-learn

### Doable with existing directives (authoring changes only)

- **Predict-then-reveal everywhere a result is non-obvious.** The `:::quiz` `<details>` already *is* a reveal mechanism. Standardize the lesson-03 pattern: open with a one-line "**Predict:** does this compile? what's the type of `x`?" then hide the answer. This converts passive reading into a committed guess (generation effect) with zero new code. Target: every "sharp corner" (excess-property check, `typeof null`, `||` vs `??`) gets a predict beat.
- **Turn assertion-style examples into runnable `:::play`.** Many examples currently sit in plain ` ```ts ` fences (e.g. the `isUser` bug in lesson 08, the `attach(console)` case in lesson 03). Promote the ones with a *surprising* result to `:::play` so the reader can mutate them and watch the error appear/vanish. The bug-hunt examples are the highest-value conversions — let the reader *break it further* and see the compiler react.
- **"Make it fail" challenges inside `:::play`.** Add a one-line instruction above a passing playground: "Add a property to `c` and watch the excess-property check fire — then route it through a variable and watch it pass." This is direct manipulation on a visible object; the reader generates the counterexample themselves.
- **Predict-the-error before revealing the playground.** Pair a `:::quiz` prompt ("what error, on which line?") immediately above a `:::play` of the same code. Guess → run → compare. The commitment is the engagement.

### Needs new capability (extend `render.ts`)

- **Runnable `:::compare` (predict-then-run side-by-side).** Today `:::compare` is static dual-coding. Add an optional "Run TS" affordance on the TS column so the reader can execute the right side and confirm the mapping holds. The Python column stays illustrative; the TS column becomes live. Smallest version: detect a flag in the fence info string and reuse the existing `play-mount` hydration on the right column.
- **A `:::predict` block (first-class commit gate).** A directive that renders the code, asks "compiles? / result? / inferred type?", **forces a choice** (radio or text) before unlocking the reveal/run. Encodes the generation effect as a primitive instead of leaning on `:::quiz` prose convention. Keep it lightweight: choice → store nothing server-side → reveal client-side.
- **Inline type readout in `:::play` (kill hidden state).** The single highest-leverage Victor move: on hover/caret, surface the *inferred type* at a position (`x: string`) the way the TS playground's quick-info does. Narrowing, inference, and assignability are exactly the "hidden state" the reader is here to learn — making the type visible at each point *is* the lesson. If the playground embeds the TS language service, expose hover quick-info; if not, a "show inferred types" toggle that annotates assignments.
- **A narrowing/assignability visualizer (dual-coding interactive).** Lesson 08's ASCII flow diagram and lesson 03's assignability box are begging to be live: a small widget where the reader picks the runtime value and *watches the union shrink* down each branch, or drags a shape into a slot and sees assignable/not. One focused SVG/DOM widget beats the paragraph. Scope it to 2–3 set-piece concepts (control-flow narrowing, "has at least" assignability, excess-property check), not every lesson.
- **Inline diff highlighting in `:::compare`.** For near-identical Python/TS snippets, highlight only the *deltas* (the `diff` lang is already bundled in `LANGS`). Draws the eye to the one thing that changed — legible feedback in the dual-coding view.

---

## Flow-breaking friction to fix

- **Hydration latency on `:::play`.** The skeleton (A1.4) prevents layout shift, but if the playground bundle/type-acquisition lands well over the Doherty threshold the reader pokes a dead box and gives up. Measure time-to-interactive per `:::play`; lazy-hydrate on scroll-into-view and warm the highlighter/TS worker on first interaction. Never show "Loading…" for >1s without a progress signal.
- **Run feedback that isn't instant or legible.** When a `:::play` runs, errors must appear *inline at the line*, fast, in plain language — not a generic console dump below. Slow or vague feedback kills the seeking loop. Pass/fail and error states need a distinct, immediate visual.
- **Reveal that loses place / state.** `<details>` reveal is good *because* it expands in place. Preserve that: never route a predict/quiz answer through navigation or a modal. Don't reset a `:::play`'s edited code on reveal or on re-render.
- **Surprise navigation & lost scroll.** Glossary `[[term]]` popovers must stay popovers on hover/focus — a full nav to `/glossary/...` mid-lesson is a flow break. Keep the deep page as the *optional pull* (read-more), with the popover satisfying the in-flow need. Returning must restore scroll.
- **Modal interruptions / "achievement" pop-ups.** None. No confetti spam, no toast nags. Any celebration must be in-place and silent-by-default (see momentum below).
- **Edited state that silently vanishes.** If a reader mutates a `:::play` then scrolls away or the section re-renders, their edits should survive within the session. Losing your experiment is the sharpest flow break of all.

---

## Honest momentum (not gamified slop)

- **Competence signals, not points.** "It compiled," "your prediction matched," "this builds on Lesson 05" are *real* feedback. Surface those; never invent a score.
- **Quiet progress, reader-owned.** A per-lesson "concepts you've run/predicted" indicator that *informs* without guilting. No streak counter that punishes a missed day; no red-dot pressure.
- **Optional depth as a pull, not a push.** The glossary popover and "go deeper" links are flow-preserving because the reader *chooses* to pull more — never interrupted by it.
- **Peak-End on the right beats.** Engineer the a-ha (the predict-wrong-then-see-why moment) and the lesson's final `:::quiz` as the memorable peak/end — through insight, not animation.

---

## Per-lesson checklist: where should this be interactive, not prose?

For each lesson, audit against these. A "yes" that's currently prose is a conversion opportunity.

1. **Is there a result the reader could predict before seeing?** → wrap in predict-then-reveal (`:::quiz` now, `:::predict` later).
2. **Does an example have a *surprising* compile error or inferred type?** → make it `:::play` so they can mutate and watch the compiler react. (Highest value: the "this compiles but is wrong" / "this fails but you'd expect it to pass" cases.)
3. **Is a Python→TS mapping asserted but not runnable?** → candidate for runnable `:::compare`.
4. **Am I describing a *process* (narrowing, inference, assignability flow) in a paragraph or ASCII art?** → candidate for a small visualizer; at minimum a `:::play` where they watch the type at each step.
5. **Is hidden state (the inferred/narrowed type) doing the teaching?** → expose it: inline type readout / "show inferred types" toggle.
6. **Is there a "break it yourself" move available?** → add a one-line manipulation instruction over a `:::play`.
7. **Does every interactive block respond <400ms with legible, in-place feedback?** → if not, it's friction, not engagement.

### First-pass targets (from the two lessons read)

- **03 Structural typing** — already has the gold-standard predict beat (excess-property check). Convert `attach(console)` and the `{}`/`object` gotcha to `:::play`; make the "has at least" assignability box a live assignable/not widget.
- **08 Narrowing & guards** — the ASCII control-flow diagram is the prime visualizer candidate (watch the union shrink per branch). Convert the `isUser` "compiles but wrong" example to `:::play` with a "make the guard correct" challenge; add predict-the-error before the truthiness/`!= null` examples.
