# Exemplar Teardown — what the best dev-learning resources actually do

Pattern extraction from widely-loved, non-hypey developer-learning resources, aimed
at `ts-learn` (TypeScript for an expert Python dev; markdown lessons in
`src/lib/content/*.md`). Every move is attributed. The target voice is **craft, not
marketing** — engagement tricks that read as salesy are flagged as anti-patterns at the
end.

Grounding: `ts-learn`'s spine is a Python→TS mapping with three directives —
`:::compare` (side-by-side Py/TS), `:::quiz` (predict → `:::answer` reveal), `:::play`
(runnable editor) — plus ASCII diagrams, "this *will* bite you" callouts, and a `Recap`.
Lessons 01/03/12 already do predict-before-reveal, dual-coded diagrams, and earlier-lesson
recall well. The teardown below is calibrated to extend *that* machine, not replace it.

---

## Part 1 — Per-resource teardown

### Books & long-form guides

**The Rust Programming Language ("the Book")**
- *Opens* each concept with the smallest compiling example, then breaks it deliberately
  to show the error. Errors are first-class teaching material, not footnotes.
- *Pacing*: "here's the rule → here's why the naive thing fails → here's the idiom." The
  borrow checker chapters teach by *fighting the compiler on the reader's behalf* —
  showing the exact `error[E0382]` text and decoding it.
- *Expert/novice tension*: handled with forward-reference signposting ("we'll cover
  lifetimes in Ch. 10") so it never over-explains in place.
- *Reusable move*: **Error-message-as-lesson** — show the real diagnostic verbatim, then
  translate it.

**Bob Nystrom — *Crafting Interpreters*** (verified: craftinginterpreters.com)
- *Cadence*: "begins with working code and ends with working code… never more than a few
  pages from being able to compile and run something." The steady drumbeat of runnable
  progress is the engagement engine.
- *Asides* are a distinct visual channel: optional historical/contextual boxes that
  "acknowledge the reader's likely confusion at exactly the moments when confusion is
  most natural." Depth lives *off the main column* so the spine stays fast.
- *Design Notes* between chapters: mini-essays on the *why* of design choices — taste,
  not mechanics.
- *Hand-drawn illustrations* signal "personal, crafted work, not a mass-produced
  textbook," and memory/parse-tree diagrams beat machine-generated ones for clarity.
- *Challenges* at chapter end extend without blocking.
- *Reusable moves*: **Always-runnable cadence**, **Aside channel** (depth beside, not in,
  the path), **Confusion-timed reassurance**, **Design-note voice**.

**Eloquent JavaScript (Haverbeke)**
- *Opens* chapters with an epigraph + a real-world metaphor before any code (Chapter on
  higher-order functions opens with abstraction-as-vocabulary).
- *Exercises* are embedded and runnable in-page; the book *is* the sandbox.
- *Voice*: literary, calm, assumes intelligence. Few exclamation marks.
- *Reusable move*: **Metaphor-before-mechanics** (one concrete image, then the formal rule).

**The TypeScript Handbook**
- *Strength*: precise reference prose with "TypeScript vs JavaScript behavior" call-outs;
  the "everyday types" / "narrowing" pages teach control-flow analysis by *tracing what
  the compiler knows at each line*.
- *Weakness to learn from*: it's reference-shaped, not journey-shaped — low "keep going"
  pull. ts-learn already beats it on narrative; borrow only its **control-flow tracing**
  precision (show the narrowed type at each branch).

**You Don't Know JS (Kyle Simpson)**
- *Move*: refuses hand-waving — takes a thing the reader thinks they know (`this`,
  coercion) and proves their model is incomplete with adversarial examples.
- *Tension*: explicitly written for people who "already use JS" — respects prior
  knowledge, then destabilizes it. Directly relevant to an expert-Python audience.
- *Reusable move*: **Destabilize-the-confident-model** — surface the reader's wrong
  prior, then break it on purpose (ts-learn's `[]` truthy beat is exactly this).

**Effective TypeScript (Vanderkam)**
- *Structure*: numbered "Items" ("Prefer X to Y"), each a self-contained recipe with a
  **"Things to Remember"** bullet list at the end. Scannable, reference-able, opinionated.
- *Voice*: prescriptive but reasoned — every rule earns itself with a failure case.
- *Reusable move*: **Named, opinionated item with a takeaway box** (ts-learn's `Recap` is
  the seed of this).

**A Tour of Go**
- *Move*: every page is a live editable runnable example with a **Run** button; prose is
  minimal scaffolding around the code. Linear "Next" with a progress sense.
- *Tension*: zero hand-holding; assumes you can read code. Perfect for experts.
- *Reusable move*: **Code-first page, prose-second** — the `:::play` *is* the lesson, text
  annotates it.

**The Little Schemer (Q&A / Socratic)**
- *Move*: entire book is a two-column question→answer dialogue. The reader is *always*
  answering, never just reading. Builds concepts by relentless tiny increments.
- *Reusable move*: **Socratic micro-step** — pose the next question before giving the next
  fact (ts-learn's predict-`:::quiz` is a lighter form of this).

### Blogs & authors

**Josh Comeau**
- *Opens* with the reader's felt pain ("CSS feels like it's fighting you") then reframes
  it as a *mental model gap*, not a skill gap.
- *Interactivity*: inline live widgets you manipulate to feel the rule (flexbox playground
  inside the prose).
- *Voice*: warm, first-person, generous with "here's what confused me." Crucially **not**
  salesy in the teaching itself.
- *Reusable move*: **Mental-model reframe** (the bug isn't you, it's your model) +
  **manipulable inline widget**.

**Julia Evans / Wizard Zines** (verified: wizardzines.com, jvns.ca)
- *Move*: "teaches specifics as opposed to high-level overviews… topics breaking down
  something very particular." Radical scoping — half a page of the 6 grep flags you
  actually use, not all 40.
- *Hand-drawn comics* make hard topics "feel less intimidating"; the craft challenge is
  "simplifying a topic without making it technically incorrect."
- *Emotional honesty*: the debugging zine names that "feelings make debugging harder" —
  addresses affect, not just facts.
- *Reusable moves*: **Aggressive scoping** (teach the 6 things used daily), **emotional
  honesty** (name the frustration), **friendly hand-drawn visual register**.

**Dan Abramov (overreacted.io)**
- *Move*: long, patient "let's build the wrong mental model and then fix it" essays
  ("A Complete Guide to useEffect"). Embraces *productive confusion* over the full arc.
- *Voice*: humble, exploratory — "I used to think X."
- *Reusable move*: **Wrong-model-first arc** at lesson scale.

**Amos / fasterthanlime**
- *Move*: narrative debugging — drags the reader through the *actual investigation*,
  dead ends included, with the compiler/strace output shown raw. Dialogue with an
  imagined skeptical reader.
- *Voice*: irreverent but technically uncompromising; depth is the whole point.
- *Reusable move*: **Investigation narrative** (show the path, not just the destination) —
  use sparingly for the gnarliest beats.

**Bartosz Ciechanowski** (verified: ciechanow.ski)
- *Move*: draggable/animatable simulations that "visually reinforce the textual breakdowns
  without dominating the narrative." Interaction is *subordinate to* the explanation —
  you manipulate to *feel* a rule, then the prose names it.
- *Voice*: "conversational tone with light humor and analogies that foster shared
  discovery."
- *Reusable move*: **Manipulate-then-name** — the interaction earns the abstraction.

**Maggie Appleton**
- *Move*: visual-essay register — illustrated metaphors, "digital garden" linking, terms
  defined as first-class linkable nodes.
- *Reusable move*: **Term-as-node** (every key term is a stable, linkable definition) —
  directly validates ts-learn's planned glossary `[[term]]` engine.

**Kent C. Dodds**
- *Move*: "teach the thing by removing the magic" — builds the abstraction from scratch so
  the API stops feeling arbitrary. Strong on *why this exists*.
- *Reusable move*: **Demystify-by-rebuilding** (good for `11` utility types: show the
  mapped-type that *is* `Partial<T>`).

### Interactive courses

**exercism**
- *Move*: tiny problems + human mentor feedback + multiple-approaches discussion. Learning
  by *doing then comparing solutions*. Autonomy: pick your track, pick your pace.
- *Reusable move*: **Solve-then-compare** (after an exercise, show 2 idiomatic solutions
  and contrast them).

**Execute Program (Gary Bernhardt)** (verified: executeprogram.com)
- *Move*: "courses made up primarily of code examples, not text, and all examples are
  interactive." Hundreds of tiny executable examples "slowly increasing in complexity."
- *Spaced repetition*: re-surfaces a concept on day 0,1,3,8,20… "just when you're on the
  verge of forgetting." You *cannot* cram — the schedule paces you.
- *Reusable moves*: **Executable-example-as-primary-content**, **spaced re-surfacing of
  high-decay facts** (ts-learn's planned cumulative/interleaved review set is this).

**TypeHero / Type Challenges**
- *Move*: puzzle framing — type-level problems with a failing test you make pass. The
  type-checker *is* the grader; the red/green loop is the dopamine.
- *Tension*: graded difficulty (easy→extreme), expert-friendly, zero prose padding.
- *Reusable move*: **Make-the-type-checker-green** (a `:::play` whose goal is "remove the
  error," not "read the output").

**Svelte / SvelteKit interactive tutorial**
- *Move*: split-pane — instructions left, editable code + live preview right; each step is
  a tiny diff from the last with the *exact lines to change* highlighted. "Next" cadence
  with a visible chapter map.
- *Reusable move*: **Minimal-diff stepping** (each example changes one thing from the
  prior; name what changed).

---

## Part 2 — Consolidated pattern library

Named patterns the ts-learn author can reuse. Each: what it is · who does it well · why it
works · how to apply to a TS-for-Python lesson.

**P1 — Always-Runnable Cadence**
What: never leave the reader more than a screen from something they can Run. · Who:
Crafting Interpreters, Tour of Go, Execute Program. · Why: continuous small wins sustain
flow and prove claims empirically. · Apply: ensure each lesson has a `:::play` *early*
(not only at the end); the playground that shows type-erasure live (lesson 01) is the
template — replicate per lesson.

**P2 — Predict → Run → Reveal (Productive Failure)**
What: make the reader commit a guess before showing the answer. · Who: Little Schemer
(Socratic), Execute Program, YDKJS. · Why: a wrong prediction creates the "surprise" that
cements correction far better than passive reading. · Apply: ts-learn already nails this
in `:::quiz`/`:::answer` on the erasure (01), excess-property (03), `==`/truthiness (12)
beats. Spread it to every misconception, especially negative-transfer-from-Python ones.

**P3 — Destabilize-the-Confident-Model**
What: surface the reader's likely-wrong prior, then break it deliberately. · Who: YDKJS,
Abramov (wrong-model-first), Comeau (mental-model reframe). · Why: experts learn by *prior
revision*, not blank-slate filling — you must dislodge before you build. · Apply: this is
ts-learn's superpower with a Python expert. Lead negative-transfer lessons with "your
Python instinct says X" → break it (`[]` is truthy; `Coord` *is* a `Point`; types vanish).

**P4 — Aside Channel (depth beside the path)**
What: a distinct visual lane for optional depth so the spine stays fast. · Who: Crafting
Interpreters (asides/design notes), Appleton (linked nodes). · Why: serves both the expert
who wants more and the reader who wants momentum, without forcing a choice. · Apply:
exactly the planned **glossary `[[term]]`** engine. Move "by the way…" digressions
(variance, coercion algorithm, MRO) off-column into glossary entries; keep the lesson lean.

**P5 — Error-Message / Checker-as-Lesson**
What: show the real diagnostic verbatim, then decode it; or make passing the checker the
goal. · Who: Rust Book (error[E0382]), Type Challenges (make-it-green). · Why: the
compiler is the authority the reader will actually face — teaching its voice transfers
directly. · Apply: in lessons with sharp errors (`unknown` won't let you call; excess
property; `'height' does not exist`), quote the *exact* TS error text, then translate.
Add `:::play` tasks framed as "make this compile."

**P6 — Compare-Spine (the bridge table)**
What: persistent side-by-side of the known thing and the new thing. · Who: every good
bridge-teaching resource; ts-learn's `:::compare` + the mypy/tsc table (01). · Why: maps
new knowledge onto an existing schema — the fastest path for an expert. · Apply: keep
`:::compare` as the backbone, but ensure each pairing ends with the *one line of
difference* called out (lesson 12's `default` export note does this well).

**P7 — Manipulate-then-Name**
What: let the reader feel a rule via interaction before formalizing it. · Who: Ciechanowski,
Comeau, Svelte tutorial. · Why: embodied/experiential grounding makes the abstraction
stick. · Apply: where ts-learn can't render a physics sim, the `:::play` is the analog —
frame it as "change the string to a number and Run; *now* here's the rule." Lesson 01
already gestures at this; make it explicit.

**P8 — Minimal-Diff Stepping**
What: each example changes exactly one thing from the prior; name the change. · Who:
Svelte tutorial, Crafting Interpreters code snippets. · Why: isolates one variable of
learning at a time — low cognitive load, clear causality. · Apply: in densify-needing
lessons (11 utility types, 08 narrowing), build the type up one transform at a time rather
than presenting the finished form.

**P9 — Takeaway Box / Named Item**
What: an opinionated, scannable closing list per unit. · Who: Effective TS ("Things to
Remember"), Rust Book chapter summaries. · Why: gives a re-readable spine and a sense of
"I now own these N facts." · Apply: ts-learn's `Recap` already is this — keep it tight,
imperative, and opinionated ("`any` off, `unknown` on").

**P10 — Spaced Re-Surfacing**
What: bring back high-decay facts on widening intervals / interleaved. · Who: Execute
Program, exercism. · Why: combats forgetting; the single biggest lever on retention. ·
Apply: the planned cumulative/interleaved review set (`unknown` vs `any`, excess-property,
the two empties). Also cheap inline version: each lesson's `:::quiz` recalls an *earlier*
lesson (03 already recalls 01; 12 recalls 08) — make that a standing rule.

**P11 — Aggressive Scoping**
What: teach the 6 things used daily, not the 40 that exist. · Who: Julia Evans, Tour of
Go. · Why: completeness is the enemy of momentum; experts can look up the rest. · Apply:
ts-learn's "depth to glossary" rule operationalizes this. In tsconfig (12), it already
shows the ~6 knobs that matter, not all of them — keep that discipline everywhere.

**P12 — Emotional Honesty (no hype)**
What: name the frustration/confusion plainly; reassure at the moment of difficulty. · Who:
Julia Evans (feelings make debugging hard), Crafting Interpreters (confusion-timed asides),
Abramov ("I used to think"). · Why: lowers affective filter; builds trust that the author
is on the reader's side. · Apply: a one-line "this feels backwards at first" (lesson 03
already says this) at the hardest beats. NOT cheerleading — acknowledgement.

**P13 — Demystify-by-Rebuilding**
What: build the magic abstraction from primitives so it stops feeling arbitrary. · Who:
Kent C. Dodds, Crafting Interpreters. · Why: ownership through construction; removes "cargo
cult" usage. · Apply: lesson 11 — show the one-line mapped type that *is* `Partial<T>`
before listing the utility types, so they read as derivable, not memorized.

---

## Part 3 — Which patterns best fit ts-learn (and why)

Ranked for *this* audience (expert Python dev) and *this* machine (compare/quiz/play +
glossary):

1. **P3 Destabilize-the-Confident-Model** — the highest-leverage pattern here. The whole
   premise is "you know Python; here's where that instinct lies to you." Every
   negative-transfer beat should open by naming the Python prior, then breaking it. Already
   strong; make it the default lesson opening for no-direct-analog topics.
2. **P2 Predict→Run→Reveal** — already the signature move; the plan says extend it to every
   misconception. Yes. It's the engine of "I want to keep going" because each reveal is a
   small earned surprise.
3. **P4 Aside Channel (glossary)** — solves the expert-vs-novice tension structurally: the
   spine stays brief (no hand-holding, per the voice rules), depth is one hover away. This
   is the single biggest structural upgrade available and the plan already scopes it.
4. **P10 Spaced Re-Surfacing + P6 Compare-Spine** — retention lever + the bridge that makes
   everything fast for a Python expert. Compare-spine is already the backbone; keep it.
5. **P5 Checker-as-Lesson** — underused in ts-learn today. Quoting the *exact* TS error and
   framing `:::play` as "make it compile" would sharpen the feedback loop cheaply.
6. **P9 Takeaway Box, P11 Aggressive Scoping, P12 Emotional Honesty** — already present in
   spirit (`Recap`, depth-to-glossary, "feels backwards"); just apply consistently across
   all 12 via the standardized skeleton (B2.4 in the plan).
7. **P13 Demystify-by-Rebuilding, P8 Minimal-Diff Stepping** — targeted at the
   densify-needing, no-Python-analog lessons (11 utility types, 08 narrowing) where the
   plan already calls for *more* worked steps.

Lower fit for now: **P7 Manipulate-then-Name** beyond the existing `:::play` (no sim
runtime), and **Amos-style Investigation Narrative** (great but long — reserve for one or
two marquee gotchas, e.g. the `==` coercion deep-dive, and put it in the glossary).

---

## Part 4 — Anti-patterns to avoid (the "engagement that reads as hype" list)

Flagged explicitly because the target voice is substance, not growth-hacking.

- **Hype openers / clickbait curiosity gaps** — "The ONE TypeScript trick Python devs
  don't know!", "You're using types WRONG." Manufactured suspense insults an expert.
  Replace with an honest stake: "Your Python instinct here is `[]` is falsy. In JS it
  isn't. Here's the cost." (P3, not hype.)
- **Faux-enthusiasm / exclamation spam** — "Generics are AWESOME!! 🚀". The good resources
  (Eloquent JS, Effective TS, the TS Handbook) are calm. Emotional honesty (P12) ≠
  cheerleading. Acknowledge difficulty; don't sell excitement.
- **Engagement-bait gamification** — streak-shaming, fake urgency, point confetti for
  trivial actions. Execute Program's spacing is *learning-science*, not a Duolingo guilt
  loop; keep the science, drop the manipulation. The lesson-completion beat (A1.8) should
  be a quiet, earned confirmation, not a slot-machine.
- **Padding for "time on page"** — restating an adjacent code comment in prose, long
  preambles. The plan's B1.2 (trim insulting/redundant prose) is the antidote. Tour of Go
  and Julia Evans win by *cutting*, not padding.
- **Over-explaining to an expert (anti-P3)** — re-teaching what `const`/`let` "means" to
  someone who writes Python daily. Hand-holding reads as disrespect. Forward-reference and
  move on (Rust Book signposting).
- **Comprehensiveness theater** — listing all 40 utility types / all tsconfig flags
  because completeness feels rigorous. It kills momentum (anti-P11). Teach the daily 6;
  glossary the rest.
- **Interactivity for its own sake** — a widget that doesn't change what the reader
  understands. Ciechanowski's rule: interaction must reinforce the explanation, "without
  dominating." A `:::play` with no predict/learn purpose is decoration.
- **Tooltip/aside misuse** — dumping full deep text into a hover, hover-only with no
  keyboard/touch path, `title=` tooltips. (Already enumerated in the plan's glossary
  anti-patterns — restated here as the craft version of P4: the aside must be *brief* in
  hover, *full* on click.)

---

### One-line synthesis

The best resources keep the reader **always one Run from a win** (P1), **always one
prediction from a reveal** (P2), and **always one hover from depth** (P4) — while
respecting the expert by **breaking their confident wrong model** (P3) instead of selling
them excitement. ts-learn already has the machine for all four; the work is applying them
*consistently* and moving depth off the spine.

## Sources
- [Crafting Interpreters — Nystrom](https://craftinginterpreters.com/) and [Table of Contents](https://craftinginterpreters.com/contents.html)
- [Execute Program](https://www.executeprogram.com/) and [Spaced Repetition](https://www.executeprogram.com/spaced-repetition); [mike.place on Execute Program](https://mike.place/2020/executeprogram/)
- [Bartosz Ciechanowski — ciechanow.ski](https://ciechanow.ski/)
- [Julia Evans — jvns.ca](https://jvns.ca/), [Wizard Zines comics](https://wizardzines.com/comics/), [Pocket Guide to Debugging](https://wizardzines.com/zines/debugging-guide/)
