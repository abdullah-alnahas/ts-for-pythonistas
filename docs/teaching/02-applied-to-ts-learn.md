# Principles Applied to ts-learn

How each principle does / should land in *this* app, grounded in the actual lessons (`src/lib/content/01-…12-*.md`), the `:::compare` / `:::quiz` / `:::play` directives (`src/lib/render.ts`), the exercises (`src/lib/exercises.ts`), the leetcode suggestions (`src/lib/leetcode.ts`), the playground, and search.

**Verdict up front:** ts-learn is already *unusually well-aligned* for an expert audience. The voice is terse, Python-anchored, and confrontational about misconceptions in exactly the right way. The gaps are about *consistency, assessment depth, spacing/interleaving, and offloading depth to a glossary* — not about rewriting the voice.

---

## The Python→TS mapping spine — the app's core asset

The entire course is one long **analogical bridge** (Principle 2), and it's executed well:

- `01`: TS↔mypy, but "inverted" — names the relationship explicitly.
- `03`: structural typing ↔ `Protocol`, with the precise nuance ("opt-in there, default here").
- `07`: generics ↔ `TypeVar`, even citing Python 3.12 `def first[T]` and PEP 696 defaults.
- `12`: `.d.ts` ↔ `.pyi`, `@types/x` ↔ stubs on PyPI, `as` ↔ `typing.cast`.

The `:::compare` directive renders Python|TS side-by-side — textbook **dual coding** (Principle 20) for relational facts. **Keep and lean on this harder.** It's the single highest-leverage component in the app.

**Where the bridge is correctly *broken* (conceptual change, Principle 10):**
- `01`: "types are a compile-time fiction" — kills the runtime-types intuition with the erased-JS reveal.
- `03`: nominal-Python vs structural-TS, plus the fresh-literal excess-property "sharp corner."
- `12`: `[] == false` is `true`; `[]`/`{}` are **truthy** (opposite of Python) — the highest-value negative-transfer correction in the whole course.

This is the app's best pedagogy. The improvement is to make these confrontations *predictive* (see below), not merely stated.

---

## Cognitive load & minimalism (Principles 3, 15) — mostly excellent, a few leaks

**Doing well:** lessons open with a one-sentence model (`01`: "TS = JavaScript + a static type layer that is checked, then deleted"), use tables for knob/option lookup (`12` tsconfig table), and skip "what is a type." This respects the expert and protects competence (SDT, Principle 23).

**Where it likely over-explains (extraneous load / insulting an expert):**
- `02 Primitives & variables` — for a 7-yr dev, "let/const, annotations, inference, primitive types" risks being mostly known. The *only* expert-worthy beats here are: `const` ≠ Python rebind semantics, literal types, `number` has no int/float split, structural inference width. **Compress to those; cut the rest or push to glossary.**
- `07` repeats "this is the same inference mypy does" / "identical idea" several times — once is transfer, thrice is padding. The novel material (`keyof`/`T[K]` indexed access) deserves the space instead.
- General pattern: prose lines that restate the code comment immediately above them (split-attention redundancy). Trim where the code already says it.

**Where it likely under-challenges:**
- The genuinely TS-only, no-Python-analog material — `11 Advanced & utility types` ("the part Python has nothing like"), conditional/mapped types, variance, `keyof`+`T[K]` — is where an expert *wants* to spend time and where worked examples should be *richest* (expertise reversal cuts the other way when there's no prior chunk). Make sure `11` is the densest, not a victim of uniform brevity.

---

## Worked examples & expertise reversal (Principle 4)

- Lessons mostly show **one** tight example per idea — correct fading for experts.
- Risk: a few lessons drift toward 2–3 near-identical examples (the generics inference trio). Cut to one + a problem.
- **Action:** for the *new-chunk* topics (`11`, narrowing flow-analysis in `08`), allow more worked steps; for the *transfer* topics (`02`, `07` basics), one example max, then straight to retrieval.

---

## Retrieval, productive failure, Feynman (Principles 5, 16, 22) — strong, can be sharper

The `:::quiz` directive is the app's retrieval engine, and the questions are **already aimed high on Bloom's** (Principle 12): `07`'s "why does the unconstrained version fail, and what one change fixes it?" is Analyze/Create, not Remember. The "Show answer" `<details>` is a clean retrieval gate. The answers double as **Feynman articulation**.

**Gaps:**
- Only **one quiz per lesson.** Retrieval and spacing want *more* touches. Add 2–3 micro-retrievals per lesson, including a couple that recall *earlier* lessons (spacing, Principle 6).
- Quizzes are end-of-lesson only. A **"predict the output before you read on"** prompt placed *before* the explanation would convert passive reading into **productive failure** (Principle 16) — especially for the misconception beats (`01` erasure, `12` truthiness). The `:::play` widget is perfect for this: "predict, then Run."
- No cross-lesson or end-of-course **cumulative retrieval**. Add a mixed review (interleaving, Principle 7) that pulls from many lessons at once.

---

## Interleaving & spacing (Principles 6, 7)

- Current structure is **blocked**: each lesson is one topic, practiced once, never revisited. That's the weak axis.
- `05` already interleaves *within* a lesson (unions vs intersections vs discriminated unions) — good. Extend the idea *across* lessons.
- **Actions:** (1) cumulative quizzes that mix topics; (2) deliberately resurface the high-decay primitives (`unknown` vs `any`, excess-property checks, two empty values) in later lessons' examples; (3) a final interleaved challenge set.

---

## Immediate feedback & deliberate practice (Principles 18, 13)

- The **playground** (`:::play`, live `tsc`-in-browser) is the ideal tight feedback loop (Principle 18) — and `01` uses it brilliantly: "see the type error *and* the program still executing." This single interaction teaches erasure better than any paragraph.
- The **exercises** (`src/lib/exercises.ts`, checked via `assert`/`assertEqual`/`assertThrows`) are deliberate practice (Principle 13) with immediate feedback. Good.
- **Gaps for an expert:** the `setup-story` `double` exercise is trivially easy (Bloom: Apply at best). Exercises should bite at the *TS-specific edge*: write a correct discriminated-union exhaustive `switch`, a `T extends keyof T` getter, a user-defined type guard, a branded type. Calibrate difficulty *up* for the no-Python-analog topics.
- **Compiler feedback is the real signal in TS** — consider exercises checked by *type errors* (does it compile / does it correctly reject), not only runtime asserts, since that's where TS lives.

## LeetCode suggestions (`src/lib/leetcode.ts`)

- Honest framing in `why` ("LeetCode compiles it with tsc, exactly the erase-then-run pipeline") ties practice to the lesson — good relatedness/relevance (Principles 1, 23).
- Risk: classic algorithm problems exercise *general coding*, not *TS type features* — near-zero germane load on the actual subject for an expert. Keep them as optional autonomy-supporting extras, but lean toward LeetCode's TS/JS track and problems that actually stress *types* (generics, narrowing) where possible.

---

## Concreteness fading, chunking, scaffolding (Principles 19, 21, 11)

- One-sentence models + recap bullets = explicit **chunking** (Principle 21). Excellent and consistent. Keep every lesson's "one-sentence model" and "Recap."
- Concreteness fading (Principle 19) is mostly right: concrete example → general rule → recap. Just fade *faster* on transfer topics.
- Scaffolding is appropriately thin. Don't add more.

---

## Misconceptions worth confronting head-on (the highest-value list)

Where Python intuition produces *confident wrong answers* — each deserves a predict-then-reveal moment:

1. **Types exist at runtime** → erasure; no `isinstance` on interfaces (`01`, `03`). ✅ covered, make predictive.
2. **`[]`/`{}`/`""`/`0` are falsy** → `[]`/`{}` are **truthy** in JS (`12`). ✅ covered — promote it, it's the nastiest.
3. **One empty value (`None`)** → `null` *and* `undefined`, with different origins (`06`).
4. **Nominal classes** → structural-by-default, even classes (`03`, `10`).
5. **`==` works like Python** → coercion hell; `===` always (`12`).
6. **`as` is a cast/conversion** → it converts *nothing*; unchecked override (`12`).
7. **`any` is like `typing.Any` and fine** → `any` *spreads* and disables checking; `unknown` is the real analog (`12`). The CLAUDE.md "never any" rule makes this personally relevant.
8. **Generics need explicit type args** → inference does it; you rarely write `f<T>()` (`07`).

---

## Autonomy, competence, relatedness (Principle 23) — the app respects all three

- **Autonomy:** sidebar nav, search, skippable lessons, "Open in TS Playground." Keep non-linear.
- **Competence:** `progress.svelte.ts` "Mark lesson done" + tracking gives visible progress; well-aimed quizzes calibrate challenge. *Don't* let any lesson under-challenge (competence needs real stakes).
- **Relatedness:** the relentless Python anchoring connects new material to the learner's professional identity — even the `any` note references *their own* CLAUDE.md. This is the app's emotional engine.

---

## Bottom line

ts-learn already embodies minimalism, transfer, dual coding, and high-Bloom retrieval better than most courses. The leverage now is: **(1) confront misconceptions predictively, (2) add spacing/interleaving/cumulative retrieval, (3) calibrate exercise difficulty up for no-analog topics and down on insulting basics, and (4) offload optional depth to a glossary** so the main path stays the lean, fast, expert-respecting spine it already mostly is.
