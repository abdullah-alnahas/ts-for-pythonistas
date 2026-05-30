# Consolidated Engagement Findings — ts-learn

Synthesis of five research passes (`01`–`05` in this folder): flow psychology, narrative/curiosity, prose craft, the interactive medium, and a teardown of exemplary resources. Deduped and ranked. This is the single input to the enhancement plan.

**Audience reminder:** an expert Python dev learning TS. High skill → the flow channel sits *high*. Engagement comes from **intellectual momentum, honest tension, and craft — never hype.**

---

## The unifying thesis

All five passes converge on one model. A great ts-learn lesson keeps the reader:

> **always one Run from a win · always one prediction from a reveal · always one hover from depth — while breaking their confident wrong Python model instead of selling them excitement.**

The app already has the machine for this (`:::play`, `:::quiz`/`:::answer`, `:::compare`, `[[glossary]]`). The work is **applying these moves consistently across all 12 lessons, sharpening the prose, and adding a few interactive capabilities** — not rebuilding.

---

## Convergent themes (multiple passes agree → highest confidence)

These appeared independently in 3+ research docs. Treat as load-bearing.

1. **Predict-then-reveal is the core engine.** (All five.) Information-gap curiosity (Loewenstein) + generation effect (Slamecka & Graf) + productive failure. A committed guess before the answer converts passive reading into a scored move. Already strong in lessons 01/03/12 → make it the default at *every* sharp corner, at section and lesson scope, not only inside quiz blocks.

2. **Destabilize the confident model (the misconception beat).** (Docs 02, 05, 01.) For an expert, the most potent gap is *a belief about to be falsified*. Structure: **invoke the Python intuition → let them apply it → spring the gap.** Tie it to *their own likely keystrokes* ("you wrote the exact line you'd write in Python — that's the bug"). This is ts-learn's signature advantage with a Python audience. Make it the default opener for negative-transfer topics.

3. **Open with a felt problem, not a definition.** (Docs 01, 02, 05.) Definition-first openers (current `03`, `07`) front-load an abstraction with no referent. Lead with a problem/prediction that *creates* the question the definition will answer; **reveal the mechanism's name after the reader feels its effect**, so the term anchors instead of reads as jargon.

4. **Lesson = an arc, not a reference page.** (Docs 01, 02, 05.) Warmup (one-sentence model, cheap win) → build (the delta) → **peak** (hardest/most surprising corner) → rest (a `:::play` or diagram trough) → close (recap that *is* the peak restated as a test) → **one forward-hook line** into the next lesson. Peak-End (Kahneman): engineer the a-ha and the ending deliberately.

5. **Spend the expert's skill budget on the delta; never re-teach the known.** (Docs 01, 03, 05.) Re-explaining `let`/`const`/unions to a daily Python user breaks flow (boredom channel) and reads as disrespect. `:::compare` Python(left, known)|TS(right, new); **never explain the Python side**; end each compare with a one-line antithesis verdict ("Python checks the name; TS checks the shape").

6. **Depth goes beside the path, not on it (the aside channel).** (Docs 01, 04, 05.) The glossary `[[term]]` engine *is* Crafting Interpreters' aside channel / Appleton's term-as-node. Move every "by the way…" digression off-column so the spine stays lean and fast; the expert pulls depth on hover/click by choice.

7. **The anti-clickbait hard line.** (All five, emphatically.) Engagement = the satisfaction of understanding, never FOMO/hype. No emoji-as-emphasis, no `!` in body prose, no all-caps, no "one weird trick / nobody tells you", no fake urgency or scarcity, no gamified guilt. The calm register of Eloquent JS / Effective TS / the TS Handbook is the target.

---

## The technique inventory (by layer)

### Layer 1 — Flow & structure (doc 01)
- Clear goal at every grain: each lesson and section states its target in its first line (subtitle is a goal, not a label).
- Immediate, unambiguous feedback: `:::play` + predict-`:::quiz` are the feedback engines; tighten the guess→verdict loop.
- Challenge–skill pitched high (expert channel); lead with the non-obvious.
- Concentration without friction: resolve every reference inline or with a precise pointer; one idea per paragraph; no held-open forward-dependencies.
- Sense of control / low stakes: frame a wrong guess as the *expected* Python intuition misfiring — reward the guess, never "obviously…".
- Session pacing: deliberate rise/peak/rest/close; vary intensity (no flat plain, no uniform wall).

### Layer 2 — Narrative & curiosity (doc 02)
- Section unit = **question → tension → resolution**, not statement → elaboration.
- Misconception-then-correction beat tied to the reader's own code.
- Concrete-before-abstract: anchor on one vivid instance, then generalize.
- A **running spine object** (`User`/`settings`/`config`) carried across lessons so callbacks land on something already owned.
- Foreshadow → callback seams (intra-lesson and cross-lesson) to sustain open loops.
- Rhetorical levers (honest, not decorative): rhetorical question as gap-opener; strategic "you" for the reader's actions / "we" for shared reasoning; antithesis for cross-language contrast; the reveal (name-after-effect).
- Openings hook with a problem; closings resolve + one forward hook.

### Layer 3 — Prose craft & voice (doc 03)
- Williams: characters-as-subjects/actions-as-verbs; **given→new** cohesion (biggest flow lever); payload in the stress position (sentence end); kill nominalizations; stable topic strings.
- Zinsser/Strunk: cut clutter and throat-clearing ("it's worth noting", "basically"); omit needless words; concrete over abstract.
- Pinker: classic style (point at the thing in the world); name the curse-of-knowledge gap; vary sentence length — short hammer after a long setup ("It doesn't matter.").
- **Style sheet / banned list:** no exclamatory hype, empty intensifiers (incredibly/super/blazingly), fake urgency, marketing nouns (leverage/utilize/robust/seamless/powerful), emoji-spam, hollow hedges. `**bold**` the single key term per passage, not for volume. Dry wit allowed only when it teaches.
- Editing pass: **read each lesson aloud** — stumbles and salesy lilts flag rewrites.

### Layer 4 — The interactive medium (doc 04)
Doable with existing directives now:
- Standardize predict-then-reveal on every non-obvious result.
- Promote *surprising* static ` ```ts ` examples to `:::play` (highest value: "compiles but wrong" / "fails but you'd expect it to pass") so the reader mutates and watches the compiler react.
- "Make it fail / make it green" manipulation instructions over a `:::play`.
- Predict-the-error `:::quiz` immediately above a `:::play` of the same code.

Needs new `render.ts` capability (feeds the plan's "infra" track):
- Runnable `:::compare` (execute the TS column).
- A first-class `:::predict` commit gate (force a choice before reveal).
- **Inline inferred-type readout** in `:::play` (Victor "kill hidden state") — the single highest-leverage new capability; the narrowed/inferred type *is* the lesson.
- A small narrowing/assignability **visualizer** for 2–3 set-pieces (control-flow narrowing in 08, "has at least" assignability in 03).
- Inline diff highlighting in `:::compare` (the `diff` lang is already bundled).

Friction to kill: `:::play` hydration latency (lazy-hydrate on scroll, warm the worker; Doherty <400ms); inline/legible run errors; never lose edited playground state; no surprise navigation or modal/confetti interruptions.

### Layer 5 — Pattern library highlights (doc 05)
Ranked best-fit: **P3 Destabilize-the-confident-model** > **P2 Predict→Run→Reveal** > **P4 Aside channel (glossary)** > **P10 Spaced re-surfacing + P6 Compare-spine** > **P5 Checker-as-lesson** (underused: quote the *exact* TS error verbatim, then translate; frame `:::play` as "make it compile") > P9 Takeaway box / P11 Aggressive scoping / P12 Emotional honesty (acknowledge difficulty, never cheerlead) > **P13 Demystify-by-rebuilding** + **P8 Minimal-diff stepping** (for the densify-needing no-analog lessons 11/08). Reserve P7 manipulate-then-name and Amos-style investigation narrative for one or two marquee gotchas (put long ones in the glossary).

---

## The anti-clickbait line (merged litmus — every hook must pass)

| Curiosity (do) | Clickbait (never) |
|---|---|
| Open a *real* gap the section fully closes in-page | Tease a gap; under-deliver or never close it |
| "Predict: which compiles?" — answerable, real stakes | "The TS trick that will BLOW YOUR MIND 🤯" |
| Tension from a genuine misconception (`0 \|\| 50`) | Fake urgency: "you're using types WRONG" |
| Respect the expert who can be surprised | Talk down: "one weird trick", "nobody tells you" |
| Reveal a name *after* earning it | Withhold trivially to pad / force scrolling |
| Forward hook = a real question the next lesson answers | Cliffhanger that bait-switches |
| Emotion = the satisfaction of understanding | Emotion = FOMO, outrage, hype |

Three questions per hook: (1) Does the gap close in-page, completely? (2) Would an expert feel respected or manipulated? (3) Is the tension *true* or manufactured? Any fail → rewrite or cut. Celebration beats (lesson-done) stay quiet and earned, never slot-machine.

---

## Unified per-lesson checklist (merge of all four checklists, deduped)

**Opening**
- [ ] Opens with a felt problem or "predict this" — not a definition dump.
- [ ] If a Python intuition misleads here, the opener invokes it before breaking it.
- [ ] One-sentence model present in the first ~3 lines.

**Body — structure & curiosity**
- [ ] Every section opens with its goal/question (gap), not just a noun.
- [ ] Each section either opens or closes a gap — no pure-exposition paragraphs.
- [ ] At least one misconception-then-correction beat tied to the reader's own likely code.
- [ ] Concrete anchor example precedes each abstract rule; mechanism names revealed *after* the effect is felt.
- [ ] Nothing an expert Python dev already knows is re-explained; budget spent on the delta.
- [ ] Each `:::compare` ends with a one-line antithesis verdict; Python side unexplained.
- [ ] At least one intra-lesson foreshadow→payoff seam and one callback to an earlier lesson.

**Body — interactivity**
- [ ] Predict-before-reveal before every surprising behavior (placed *before* the explanation).
- [ ] Surprising static examples promoted to `:::play`; each `:::play` has a verb + expected result ("change X, predict, Run").
- [ ] Interactive beat sits at the point of *maximum doubt*, not as an afterthought.
- [ ] Where a *process* is described in prose/ASCII (narrowing, inference, assignability), flag it for a visualizer or at least a step-through `:::play`.

**Prose craft**
- [ ] Every sentence's subject is the real actor; given→new honored; payload in the stress position.
- [ ] No nominalizations where a verb works; no throat-clearing/empty intensifiers; no banned hype/marketing words; no stray `!` in prose.
- [ ] One idea per paragraph, stable topic string; sentence length varies (short hammer near each hard point); parallel ideas get parallel grammar.
- [ ] Every new TS term anchored to a Python equivalent or defined on first use — never dropped cold.
- [ ] Read the section aloud; rewrite anything you stumble on or that sounds salesy.

**Arc & close**
- [ ] Clear arc: warmup → build → peak (hardest corner) → rest beat → recap/capstone quiz.
- [ ] Recap closes every gap the lesson opened (no dangling teases).
- [ ] Ends on exactly one forward-hook line the next lesson genuinely answers.

**Anti-clickbait gate (all must pass)** — every opened gap closes in-page; no emoji/all-caps/"one weird trick"/fake urgency; tension always real; an expert would feel respected.

---

## Highest-leverage moves (where the plan should concentrate)

1. **Apply the standardized engagement skeleton to all 12 lessons** — problem-first open, misconception beat, arc, forward hook. (Content; biggest surface area.)
2. **Convert definition-first openers** (notably `03`, `07`) to problem/predict-first. (Content; cheap, high impact.)
3. **Spread predict-then-reveal + promote surprising statics to `:::play`** across every sharp corner. (Content + light authoring.)
4. **Prose-craft editing pass** (given→new, cut clutter, banned-list, read-aloud) on all lessons. (Content polish.)
5. **Establish the running spine object** and intra/cross-lesson foreshadow→callback seams. (Content continuity.)
6. **Move remaining digressions to the aside channel / glossary.** (Content + glossary.)
7. **Interactive capabilities** (infra, ranked): inline inferred-type readout in `:::play` → `:::predict` commit gate → runnable `:::compare` → 2–3 narrowing/assignability visualizers → `:::compare` diff highlighting. (Engine; deliver incrementally.)
8. **Checker-as-lesson:** quote exact TS errors; frame select `:::play` as "make it compile." (Content.)

**Layering note for the plan:** content/voice work (1–6, 8) is independent of interactive-engine work (7). They can run as two non-overlapping tracks (content files vs `render.ts`/components) exactly like the prior Stream A / Stream B split — preserve that for parallel execution.
