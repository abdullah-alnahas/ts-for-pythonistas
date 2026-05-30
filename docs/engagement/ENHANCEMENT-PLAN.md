# ts-learn — Engagement Enhancement Plan

**Purpose.** Turn the consolidated engagement research (`CONSOLIDATED-FINDINGS.md`) into an
executable plan that makes the *content* trigger deep flow — engaging, fluid, indicative —
**without any marketing/clickbait voice.** This plan is about prose-craft, narrative flow,
curiosity structure, and interactivity *authoring*. It is **not** a structural/UX revamp
(that is `docs/CONSOLIDATED-PLAN.md`, already written — do not duplicate it).

Audience: an expert Python dev learning TS. The flow channel sits high; engagement comes from
**intellectual momentum, honest tension, and craft — never hype.**

---

## 1. Scope & non-goals

### In scope (what this plan changes)
- **Voice & prose craft** across all 12 lessons (`src/lib/content/*.md`): Williams given→new
  cohesion, cut clutter, banned-list enforcement, read-aloud pass, antithesis verdicts.
- **Curiosity & narrative structure**: problem-first openers, the misconception beat,
  predict-then-reveal at every sharp corner, arc shaping (warmup→build→peak→rest→close),
  forward-hooks, a running spine object, foreshadow→callback seams.
- **Interactivity authoring with existing directives**: promote surprising static ` ```ts `
  examples to `:::play`; add predict-`:::quiz` gates before reveals; "make it compile / make it
  fail" verbs over playgrounds; quote exact TS errors (checker-as-lesson). **No new directive
  syntax** is required for Track C.

### Explicitly deferred / out of scope
- **Big engine features** (inline inferred-type readout, `:::predict` commit gate, runnable
  `:::compare`, narrowing/assignability visualizers, `:::compare` diff highlighting). These are
  **Track E — engine, optional/secondary, delivered after the content work**. They do not block
  any Track C item.
- **Structural/UX/navigation/glossary system** — owned by the prior `CONSOLIDATED-PLAN.md`
  (TOC, sidebar phases, resume, completion finale, the glossary engine itself).
- **Adding raw `[[term]]` glossary links into lesson prose.** Deferred to a *coordinated*
  glossary pass (see §7 Non-goals guardrail). Track C may **note** good anchor candidates in a
  comment list but must not insert `[[term]]` markup, to avoid a render/content dependency on
  glossary-entry existence.
- Changing `exercises.ts` / `leetcode.ts` signatures (frozen).

---

## 2. Two tracks, non-overlapping file ownership

Partition is by **file ownership**, exactly like the prior Stream A/B split, so the two tracks
can run in parallel *or* a single agent can run them in sequence (C first, then E). Every file
has exactly one owner; the tracks never edit the same file.

| Track | Owns (allowlist) | Never touches |
|---|---|---|
| **Track C — Content** (the bulk) | `src/lib/content/01..12-*.md` **only** | `render.ts`, any `*.svelte`, `global.css`, `exercises.ts`, `leetcode.ts` |
| **Track E — Engine** (optional, secondary) | `src/lib/render.ts`, the playground/compare components (`*.svelte`), `src/lib/styles/global.css` | every `src/lib/content/*.md` |

**Zero-overlap confirmation.** Track C writes prose and uses only the *existing* directives
(`:::compare`, `:::quiz`/`:::answer`, `:::play`, and — only under the coordinated pass — `[[term]]`).
Track E changes how those directives render/execute. Because unknown/new directive *attributes*
already pass through `render.ts` harmlessly, Track E can ship new capabilities additively without
Track C ever editing a `.ts`/`.svelte`/`.css` file, and Track C's lessons render correctly no
matter what Track E does or doesn't ship. **No file is in both allowlists.**

**Sequencing guarantee.** If one agent does both: finish Track C entirely (content is the
high-leverage work), verify `bun run check` green, *then* optionally start Track E. Track E
features are authored so that lessons already written for Track C light up automatically (e.g.
once inline type-readout ships, the `:::play` blocks Track C promoted gain the readout with no
content edit).

---

## 3. The global engagement skeleton (every lesson must match)

Every lesson ends up matching this arc. It is the uniform rule the execution agent applies.

```
problem-first open  →  misconception beat  →  build/arc  →  compare-with-verdict
   →  predict-then-reveal at each sharp corner  →  rest beat  →  recap  →  forward-hook
```

1. **Problem-first open.** First ~3 lines pose a felt problem or a "predict this," not a
   definition. If a Python intuition misleads here, *invoke it before breaking it*. The
   one-sentence model may follow, but the *question* comes first.
2. **Misconception beat.** At least one "you'd write the exact line you'd write in Python —
   that's the bug" moment, tied to the reader's own likely keystrokes. Structure: invoke the
   Python intuition → let them apply it → spring the gap.
3. **Build / arc.** Warmup (cheap win) → build (the delta) → **peak** (hardest/most surprising
   corner) → rest (a `:::play` or diagram trough) → close.
4. **Compare-with-verdict.** Every `:::compare` ends with a one-line antithesis verdict
   ("Python checks the name; TS checks the shape"). **Never explain the Python side.**
5. **Predict-then-reveal at sharp corners.** Before every surprising result, a committed guess
   (`:::quiz` … `:::answer`) placed *before* the explanation, at the point of maximum doubt.
6. **Rest beat.** A `:::play` or a diagram after the peak so intensity varies (no flat wall).
7. **Recap.** Closes every gap the lesson opened — no dangling teases. The capstone quiz *is*
   the peak restated as a test.
8. **Forward-hook.** Exactly one closing line that names a real question the next lesson answers.

### Voice style sheet (the rules Track C enforces line-by-line)

- **Characters as subjects, actions as verbs.** The real actor is the grammatical subject; kill
  nominalizations where a verb works.
- **Given→new cohesion** (the biggest flow lever): start a sentence with the known, end on the
  new payload — payload in the **stress position** (sentence end).
- **One idea per paragraph; stable topic strings; parallel grammar for parallel ideas.**
- **Vary sentence length** — a short hammer after a long setup ("It doesn't matter.").
- **Concrete before abstract; reveal the mechanism's name *after* the effect is felt.**
- **`**bold**` the single key term per passage**, not for volume.
- **Spend the skill budget on the delta** — never re-explain `let`/`const`/unions/`TypeVar` to a
  daily Python user.
- **Dry wit allowed only when it teaches.** Difficulty acknowledged honestly, never cheerled.

### Banned list (delete on sight)
- Exclamatory hype; stray `!` in body prose; all-caps for emphasis; emoji-as-emphasis.
- "One weird trick", "nobody tells you", "the secret to", "blow your mind", "you're doing X wrong".
- Empty intensifiers: *incredibly, super, blazingly, really, very, just*.
- Marketing nouns: *leverage, utilize, robust, seamless, powerful, game-changer*.
- Throat-clearing: *it's worth noting, basically, of course, simply, as we all know*.
- Hollow hedges; fake urgency; scarcity; gamified guilt.

### Anti-clickbait gate (non-negotiable — every hook must pass all three)
1. **Does the opened gap close in-page, completely?** (No tease left dangling.)
2. **Would an expert feel respected or manipulated?** (No talking down, no padding.)
3. **Is the tension true or manufactured?** (Real misconception, not invented drama.)

Any fail → rewrite or cut. Celebration/lesson-done beats stay quiet and earned.

---

## 4. Per-lesson action tables (all 12)

Grounded in the actual current text. "Opener type" = what the lesson opens with *today*.
Effort tags: **S** ≤ ~20 min prose edit, **M** = restructure a section or add an interactive beat,
**L** = re-architect the opener + multiple beats.

### 01 — The setup story
- **Opener today:** definition-first ("The one-sentence model" + the mypy table). Strong predict
  quiz already at the erase step.
- **Misconception beat:** keep & sharpen the `: string` erasure reveal — frame it as "you expect
  `__annotations__`/`isinstance` to survive; they don't." Already the signature beat; tighten the
  invoke→apply→spring shape.
- **Promote to `:::play`:** the "tsc emits JS even on type error" block (`const n: number = "not a number"`)
  — currently static; make it a runnable "watch the error AND the run succeed."
- **Predict-then-reveal gaps:** add a one-line predict before the erase-pipeline ASCII diagram.
- **Forward-hook:** end on a line pointing at Lesson 02's literal-type narrowing / inference.
- **Prose fixes:** open with the *problem* ("Your `.py` runs as-is; your `.ts` cannot — something
  happens in between") **before** the one-sentence model. **Effort: M.**

### 02 — Primitives & variables
- **Opener today:** definition-first ("`const` is real"). Reasonable but flat.
- **Misconception beat:** lead with `5 / 2 === 2.5` (no floor division) or `String`-vs-`string`
  capitalization as the felt surprise; currently buried under "Surprises coming from Python."
- **Promote to `:::play`:** the literal-types block (`let mode: "dark" | "light"`) — let them try
  `mode = "blue"` and watch it fail; and the `const a / let b` widening pair.
- **Predict-then-reveal gaps:** add a predict before the literal-widening reveal (already a
  recap quiz; move a lighter predict *up* to the literal-types section, the sharp corner).
- **Forward-hook:** "literal types are the seed — Lesson 05 builds discriminated unions on them."
- **Prose fixes:** open with a problem ("Two Python reflexes break here: integer division and the
  ALL_CAPS constant"). **Effort: M.**

### 03 — Structural typing
- **Opener today:** **definition-first** ("The core idea" — a paragraph of abstraction). Findings
  flag this explicitly as a convert-to-problem-first target.
- **Misconception beat:** the excess-property corner is already an excellent predict (`(A)` vs `(B)`).
  Promote the *whole lesson opener* to invoke the nominal-typing instinct first: show the Python
  `Coord`/`Point` mypy error, ask "predict the TS equivalent," then spring "it's fine."
- **Promote to `:::play`:** the "has at least" block (`const n: Named = user`) and the `attach(console)`
  recap example — both are surprising and currently static.
- **Predict-then-reveal gaps:** keep the excess-property `:::quiz`; add a predict before the
  `{}` = "almost anything" gotcha (`const x: Anything = 42`).
- **Forward-hook:** "shape-matching raises a question: when do two ways to *name* a shape differ?
  → Lesson 04."
- **Prose fixes:** demote "The core idea" abstraction; reveal the term **structural** *after* the
  `Coord`/`Point` surprise lands. **Effort: L.**

### 04 — interface vs type
- **Opener today:** definition-first ("The split that doesn't exist in Python") — acceptable as a
  felt-problem framing already (the Python tools blur; TS has two).
- **Misconception beat:** the predict could be "which of these fails: `interface ID = string | number`?"
  — surface the "interface can't express a union" wall as a guess before the rule.
- **Promote to `:::play`:** declaration merging (`interface Box` twice) — let them watch two
  declarations merge, then watch `type T` twice error.
- **Predict-then-reveal gaps:** add the predict above; the lesson is currently reveal-heavy with
  one trailing quiz.
- **Forward-hook:** "Both name *one* shape. Lesson 05: naming a value that's *one of several* shapes."
- **Prose fixes:** add a one-line antithesis verdict to the `extends`/`&` compare. **Effort: M.**

### 05 — Union & intersection types
- **Opener today:** definition-first but soft ("Unions: familiar, but everywhere"). The genuinely
  new material (`&`, discriminated unions) arrives late.
- **Misconception beat:** the `&`/`|` "opposite of how the words sound" inversion is the negative-
  transfer beat — feature it as a predict ("`A & B` for objects — fewer fields or more?").
- **Promote to `:::play`:** already has the exhaustiveness `:::play` (keep, add the "add a square
  variant" verb prominently). Promote the `type Both / Either` block to a `:::play` too.
- **Predict-then-reveal gaps:** add a predict before the `string & number = never` edge case.
- **Forward-hook:** "Discriminated unions narrow by tag — but how does TS *track* that narrowing
  through your code? → Lesson 08." (Also seeds 06 via the truthiness link.)
- **Prose fixes:** move the "this is the pattern Python devs most wish they had" energy earlier.
  **Effort: M.**

### 06 — null vs undefined
- **Opener today:** **already problem-first** (opens with a predict quiz — exemplary). Use as the
  template for the others.
- **Misconception beat:** the `0 || 50` trap is the marquee beat — already a `:::play` and a
  capstone quiz. Tighten "Python's `or` has the same trap" antithesis.
- **Promote to `:::play`:** already strong (`volumeWith`). Consider promoting the `?.`/`??`/`!`
  operator block so they can mutate inputs.
- **Predict-then-reveal gaps:** add a predict before the `nickname?` key-presence subtlety
  (`"nickname" in u`).
- **Forward-hook:** "the compiler *tracks* nullability through your code — Lesson 08 shows how far
  that tracking goes."
- **Prose fixes:** minimal; this lesson is the model. **Effort: S.**

### 07 — Generics
- **Opener today:** **definition-first** ("Same concept, different syntax"). Findings flag `07`
  explicitly alongside `03` as a convert-to-problem-first target.
- **Misconception beat:** the negative-transfer is subtle (it's mostly familiar from `TypeVar`).
  The real delta is **inference** ("you rarely pass type args") and **`extends` as a bound, not
  inheritance." Open with a problem: "Write `first(xs)` — what's the return type? You never said."
- **Promote to `:::play`:** the inference block (`first([1,2,3])` etc.) and the `getProp` indexed-
  access getter — let them try `getProp(user, "xyz")` and watch it fail.
- **Predict-then-reveal gaps:** add a predict before "`extends` here means *assignable to*, not
  inheritance" (a Python dev reads `extends` as subclassing).
- **Forward-hook:** "`keyof` + indexed access hint at a whole type-level language → Lesson 11."
- **Prose fixes:** lead with the inference win, not the syntax table. **Effort: L.**

### 08 — Narrowing & type guards
- **Opener today:** definition-first ("What narrowing is"). Dense, no-Python-analog lesson — a
  densify/step-through candidate (P13/P8).
- **Misconception beat:** "after the `if` returns, `x` is `number` *with no check*" — narrowing by
  **elimination** has no mypy-depth analog; feature it as a predict over the ASCII flow diagram.
- **Promote to `:::play`:** the `in`-narrowing `Fish | Bird` block and the dangerously-wrong
  `isUser` guard (capstone) — let them run the broken guard and watch junk pass.
- **Predict-then-reveal gaps:** add a predict before the "narrowing forgotten across closures"
  gotcha — genuinely surprising, currently pure exposition.
- **Forward-hook:** "guards are *trusted, not verified* — Lesson 12 closes the loop on earning
  trust at the boundary (`unknown` + validation)."
- **Prose fixes:** this is a marquee lesson — flag the control-flow diagram for the Track E
  narrowing visualizer (set-piece #1). **Effort: M.**

### 09 — Functions, deeply
- **Opener today:** definition-first ("Parameters: optional, default, rest" — mostly familiar).
- **Misconception beat:** **no keyword arguments** is the real felt loss for a Python dev — promote
  it from mid-lesson to the opener as the problem ("`connect(timeout=30)` — gone. Now what?").
  Also `this` is call-site dynamic (no `self` analog) — the second beat.
- **Promote to `:::play`:** the detached-method `this` bug (`const f = counter.inc; f()`) — let
  them run it and watch `count` not increment; and the `void`-return `forEach`/`push` example.
- **Predict-then-reveal gaps:** add a predict before the `void`-accepts-a-value rule (counter-
  intuitive); currently explained directly.
- **Forward-hook:** "`this` and methods live on objects — Lesson 10 makes them classes (still
  structural)."
- **Prose fixes:** open on the options-object problem. **Effort: M.**

### 10 — Classes
- **Opener today:** definition-first ("The basics line up") — appropriate, but the surprises hide.
- **Misconception beat:** "classes are matched **structurally**, not by name" — a plain object
  satisfies a class type. Feature `show({ x: 1, y: 2 })` as a predict ("does a bare object pass
  where a `Point` instance is expected?"). The `private`-flips-to-nominal corner is the peak.
- **Promote to `:::play`:** the `show({x,y})` structural-class block and the `private a` vs `#b`
  runtime-privacy block (`acc["a"]` reaches in, `acc["#b"]` doesn't).
- **Predict-then-reveal gaps:** keep the "why does one private field flip the rule" quiz; add a
  predict before the `#field` runtime-privacy reveal.
- **Forward-hook:** "classes give runtime presence types lack — Lesson 11 goes the other way:
  computing types that never exist at runtime at all."
- **Prose fixes:** add antithesis verdicts to the abstract/implements compare. **Effort: M.**

### 11 — Advanced & utility types
- **Opener today:** definition-first but well-motivated ("This is where TS leaves Python behind").
  No-analog lesson — densify/step-through candidate; the ASCII derivations are strong.
- **Misconception beat:** less about negative transfer, more about awe-then-grounding. Open with a
  problem: "You have one `User` type and need its PATCH-body shape *without* re-listing fields —
  Python makes you copy; TS computes it." Then reveal `Partial<Omit<...>>`.
- **Promote to `:::play`:** the `as const` + `typeof ROLES[number]` derivation and the
  `Partial<Omit<User, ...>>` capstone — let them add a field and watch the derived type update.
- **Predict-then-reveal gaps:** add a predict before the conditional-type **distribution** over
  unions (the `Exclude` walk) — surprising that it maps member-by-member.
- **Predict + visualizer flag:** the mapped-type and `Exclude`-distribution ASCII blocks are
  Track E visualizer candidates (set-piece #2), but ship as step-through `:::play` first.
- **Forward-hook:** "all this computed type machinery vanishes at runtime — Lesson 12: what's
  actually left, and where the JS reality bites."
- **Prose fixes:** lead with the felt copy-paste pain. **Effort: M.**

### 12 — The JS reality layer & gotchas
- **Opener today:** definition-first ("`any` vs `unknown`"). Already has two excellent predicts
  (the `== "" / [] == false` block; and `any`/`unknown`).
- **Misconception beat:** **`[]` and `{}` are truthy** is the single highest-value Python
  correction — currently a blockquote with a `⚠️` emoji. **Remove the emoji** (banned), promote
  the truthiness predict to the *opener* as the felt problem ("`if (arr)` to check empty — you've
  written this a thousand times in Python; here it's always true").
- **Promote to `:::play`:** the `== "" / [] == false / Boolean([])` coercion block — let them run
  each line. (The capstone JSON-parse `unknown`-vs-`as` block can stay a quiz.)
- **Predict-then-reveal gaps:** already strong. Keep both predicts; ensure each sits *before* its
  explanation.
- **Forward-hook:** this is the last lesson — replace any forward-hook with a **course-closing**
  callback that ties to Lesson 01 ("types are erased, so trust at the boundary must be *earned*"
  — already present in the capstone; surface it as the deliberate ending).
- **Prose fixes:** strip the `⚠️` emoji and any `!` in prose; calm the "This *will* bite you"
  heading to an indicative statement. **Effort: M.**

**Cross-cutting note:** lessons 03 and 07 are the two true definition-first openers the findings
name; they get the L-effort opener rewrites. Lesson 06 is the exemplar template. Lesson 12 needs
the emoji/`!` cleanup most urgently (banned-list violation already in the source).

---

## 5. Continuity layer (the running spine)

Define one spine object carried across lessons so callbacks land on something already owned.

- **Spine object: `User`.** Already appears organically in 01, 03, 04, 06, 07, 08, 11, 12. Make it
  the *consistent* example value where a shape is needed, with a stable shape that grows:
  - 03 introduces `User` shape (`name`, plus `age`/`admin` for "has at least").
  - 04 names it two ways (`interface` vs `type`).
  - 06 adds `nickname?` (optional/nullable).
  - 07 makes `getProp(user, ...)` operate on it.
  - 08 writes the `isUser` guard for it (the dangerously-wrong one).
  - 11 derives `PublicUser`/`UserUpdate`/`UserPatch` from it.
  - 12 parses untrusted JSON *into* it (`isUser(raw)`), closing the spine.
- **Secondary spine: `Shape`** (discriminated union) — introduced in 05, reused in 07 (`Result`),
  08 (`Extract<Shape, {kind:"circle"}>`, exhaustiveness). Keep its variants identical across uses.

### Foreshadow → callback seams
- 01 erasure → called back explicitly in 02 (literal union erased), 03 (`instanceof Point` fails),
  04 ("both are erased"), 06 (`!` erased), 10 (`private` erased), 12 (whole-course callback).
  *(These already exist as "Recall Lesson 01" quizzes — preserve and make them the deliberate
  callback seam, don't add new ones cold.)*
- 02 literal types → foreshadow "powers discriminated unions (05)"; 05 calls back.
- 03 "has at least" → 06 callback (optional `nickname` satisfies it), 03→11 (excess vs mapped).
- 06 truthiness `||` trap → 08 callback (truthiness narrowing excludes `""`/`0`) → 12 (`[]` truthy).
- 05 discriminated unions → 08 callback (cleanest narrowing) and 07 (`Result<T,E>`).

**Rule for the execution agent:** strengthen the *existing* foreshadow/callback lines into one
explicit forward-hook (end of lesson) + one callback (the "Recall Lesson N" beat). Do not invent
new cross-references that create reading-order dependencies the reader can't satisfy.

---

## 6. Execution order & effort

Run top-to-bottom. Track C (1–4) is the deliverable; Track E (5) is optional and後.

1. **Skeleton + voice pass** — apply §3 banned-list, given→new, read-aloud to all 12. Strip the
   Lesson 12 `⚠️` emoji and any prose `!` first (active violations). **(All 12; S each, ~L total.)**
2. **Opener conversions** — rewrite the two definition-first openers (03, 07) to problem/predict-
   first; lighter problem-first reframes on 01, 02, 05, 09, 11, 12. **(L for 03/07; M for the rest.)**
3. **Curiosity beats** — add the missing predict-then-reveal gates and sharpen each misconception
   beat per §4; add one forward-hook line per lesson. **(M, spread across all 12.)**
4. **Interactivity authoring** — promote the listed static examples to `:::play` with a verb +
   expected result; add "make it compile / make it fail" instructions; quote exact TS errors
   verbatim where checker-as-lesson applies (05, 07, 08, 12). **(M, all 12.)**
5. **Optional glossary anchor pass** — *coordinated only.* If (and only if) the glossary entries
   exist, insert `[[term]]` at the digression points each lesson flags (branding in 03, `this`-
   param in 09, `==` coercion algorithm in 12, `noUncheckedIndexedAccess` tradeoffs in 12).
   Otherwise leave a comment list of anchor candidates. **(S; deferred.)**

**Track E — engine (optional, deliver after Track C), ranked by leverage (from findings §148):**
- **E1. Inline inferred-type readout in `:::play`** — the narrowed/inferred type *is* the lesson;
  highest-leverage new capability. **(L.)**
- **E2. `:::predict` first-class commit gate** — force a choice before reveal. **(M.)**
- **E3. Runnable `:::compare`** — execute the TS column. **(M–L.)**
- **E4. Narrowing/assignability visualizers** — 2–3 set-pieces: control-flow narrowing (08),
  "has at least" assignability (03), conditional-type distribution (11). **(L.)**
- **E5. `:::compare` inline diff highlighting** — `diff` lang already bundled. **(S–M.)**
- Plus the friction fixes from findings §79 (lazy-hydrate `:::play` on scroll, legible run errors,
  never lose edited state) — these belong to Track E / the playground component.

---

## 7. Definition of done & verification

The execution agent self-checks each lesson against the **unified per-lesson checklist** from
`CONSOLIDATED-FINDINGS.md` §102 (opening / body-structure / body-interactivity / prose-craft /
arc-close / anti-clickbait gate). A lesson is **done** when:

- [ ] Matches the §3 engagement skeleton: problem-first open, ≥1 misconception beat tied to the
      reader's own likely code, clear arc, ≥1 predict-then-reveal at the sharpest corner, recap
      that closes every opened gap, exactly one forward-hook.
- [ ] Every `:::compare` ends with a one-line antithesis verdict; the Python side is unexplained.
- [ ] Listed static examples promoted to `:::play`, each with a verb + expected result.
- [ ] **Read-aloud pass done** — anything that stumbles or sounds salesy is rewritten.
- [ ] **Banned list clean** — no emoji, no prose `!`, no marketing nouns/empty intensifiers/
      throat-clearing. (Lesson 12's `⚠️` removed.)
- [ ] **Anti-clickbait gate passes** on every hook (gap closes in-page; expert feels respected;
      tension is true).
- [ ] **Only existing directives used** (`:::compare`, `:::quiz`/`:::answer`, `:::play`). No new
      directive syntax in content. No raw `[[term]]` added unless the coordinated glossary pass
      (§6 step 5) is explicitly active.
- [ ] `exercises.ts` / `leetcode.ts` untouched.

**Global gates:**
- [ ] `bun run check` stays green after every lesson (the build parses the directives; a malformed
      `:::` block fails the render).
- [ ] Diffs are minimal and non-destructive — every working feature (quizzes reveal, playgrounds
      run, compares render) still works; correct TS in all code samples preserved.
- [ ] Track C touched **only** `src/lib/content/*.md`; Track E (if run) touched **only**
      `render.ts` / components / `global.css`. Confirm via `git diff --name-only`.

**Verification cadence:** after each lesson edit, run `bun run check`; at the end of Track C, do a
full read-aloud sweep of all 12 and a banned-list grep (`rg '!|⚠|🤯|leverage|utilize|robust|seamless'`
across `src/lib/content/`) to confirm zero violations.
