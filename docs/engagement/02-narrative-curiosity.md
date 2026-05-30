# Narrative, Curiosity & Rhetoric — the "why you keep reading" layer

How to make TS lessons *gripping* for an expert Python dev without fiction, hype, or fluff. This is the prose-pull layer that sits on top of the pedagogy in `teaching/01-principles.md`. Every technique below is principle-based, sourced, and shown with a tiny TS-teaching before/after.

The unifying mechanism: **respect the reader's intelligence, then weaponize their curiosity.** An expert keeps reading not because you yelled, but because you opened a question they now *need* closed.

---

## Part 1 — The techniques

### 1. Information-gap theory of curiosity (Loewenstein, 1994)

**Principle.** Curiosity is the felt deprivation of a specific missing piece of knowledge. It fires only when the reader (a) is aware of a gap and (b) cares about it. A gap they don't notice produces nothing; a gap that's all gap and no foothold produces overwhelm. The sweet spot: the reader knows *almost* enough to answer, and the last piece is missing. Structure: **open a gap → make them feel it → close it.**

The unit of a lesson section is therefore **question → tension → resolution**, not statement → elaboration.

Before (statement → elaboration — the gap never opens):
> TypeScript uses excess property checks on fresh object literals. A literal assigned inline is checked for extra properties, but the same object through a variable is not.

After (gap → tension → resolution):
> The "has at least" rule just told you extra properties are fine. So predict: which of these two compiles?
> ```ts
> const a: Opts = { width: 10, height: 20 };   // inline
> const tmp = { width: 10, height: 20 };
> const b: Opts = tmp;                          // via variable
> ```
> If you said "both," you just walked into the one sharp corner...

The lessons' `:::quiz` "predict before you read on" blocks are this technique already, well-executed (see `03-structural-typing.md`, `06-null-undefined.md`). The opportunity is to run the same move at the *section* and *lesson* level, not only inside quiz blocks.

### 2. The misconception-then-correction beat (negative transfer, made into a hook)

**Principle.** For an expert, the most potent gap is *a belief they already hold that's about to be falsified.* This is the dramatic core of teaching a second language: Python intuitions that mislead in TS. Cognitively this is the "expectation-violation" that drives attention (a known curiosity amplifier); pedagogically it's surfacing negative transfer (`teaching/01-principles.md` §2). The beat has three moves: **invoke the Python intuition → let them apply it → spring the gap.**

Before (states the fact, no belief is engaged):
> In JS, `0 || 50` returns `50` because `0` is falsy. Use `??` instead.

After (engages the belief, then breaks it):
> A user sets their volume to `0` to mute. Your `settings.volume || 50` resets them to 50. You wrote the exact line you'd write in Python (`volume or 50`) — and that's the bug. Both languages treat `0` as falsy; only one of them gave you a quieter operator to escape it.

The "you wrote the exact line you'd write in Python" callback is what makes it land — it's *their* code, not a hypothetical's.

### 3. Concrete-before-abstract: anchor, then generalize

**Principle.** A vivid specific instance is graspable; the general rule is not, until there's something to hang it on. Lead with one concrete case the reader can fully hold, *then* lift to the rule. (Polya; reflected in Nystrom's "code first, theory second.") Definition-first openers ("The core idea: TypeScript is structurally typed...") ask the reader to cache an abstraction before they have a referent for it.

Before (abstract-first — `03-structural-typing.md` and `07-generics.md` both currently open this way):
> TypeScript is structurally typed: a value fits a type if its shape matches, regardless of names.

After (anchor-first):
> You pass `console` to a function expecting a `{ log(msg: string): void }`. You never declared `console` to be that type. It just works. In Python with a nominal hint, that's a mypy error. Why does TS shrug? Because it checks *shape, not name* — and once you see that one rule, this whole lesson is a corollary.

Same facts; the after earns the abstraction instead of front-loading it.

### 4. A running example as the spine

**Principle.** A single scenario carried across a lesson (or arc) gives continuity, lets each new idea *do something* to a familiar object, and pays off as the example accretes meaning. *The Rust Book* builds a guessing game; *Eloquent JavaScript* (Haverbeke) runs a weasel/robot/village world; *Crafting Interpreters* builds one real language end-to-end. The spine converts a list of features into a story with a *subject*.

For ts-learn: a `User`/`config`/`settings` object already recurs informally across lessons — promote it to a deliberate spine so Lesson 6's `settings.volume` and Lesson 3's `User` shape are visibly the *same* object gaining a type story.

### 5. Foreshadow and call back (the arc made felt)

**Principle.** A forward reference plants a small open loop ("we'll see why `!` is a lie in a moment"); a callback closes one and rewards attention ("remember the `console` example? here's why it's safe to do that everywhere"). Open loops are a documented attention-sustainer; callbacks create the satisfaction of a paid-off setup. The lessons already do "Recall Lesson 03..." callbacks — that's the move; extend it to *intra-lesson* foreshadowing too.

Before: each section stands alone.
After: section 2 ends "...which sets up the one exception that trips everyone — next." Section 3 opens by paying that exact promissory note. The reader is pulled across the seam.

### 6. Rhetorical devices that work in technical prose

Each is a small, honest lever — not decoration.

- **The rhetorical question** as gap-opener. "So why does `{}` accept `42`?" beats "Note that `{}` accepts `42`." The question makes the reader *want* the sentence after it. (Used well in the quiz blocks; underused in body prose.)
- **Strategic second person.** "You'll reach for `||` here and it'll betray you" implicates the reader's own future keystrokes — far stickier than "developers often use `||`." Use "you" for the *action*; reserve "we" for shared reasoning ("let's trace what the compiler sees").
- **Antithesis / parallelism.** "Python checks the name; TypeScript checks the shape." The mirrored structure makes the contrast *memorable*, not just stated. This is the native rhetorical form of cross-language teaching — exploit it. (The `:::compare` blocks are antithesis in code; mirror them in a one-line prose verdict beneath.)
- **The reveal.** Withhold the name of the mechanism until after the reader has felt its effect, then name it. "...that typo-catching extra layer has a name: *excess property checks*." Naming-after-experiencing makes the term an anchor, not jargon.
- **The callback** (see §5) — rhetorically, the satisfaction of "oh, *that's* why he showed me `console` earlier."

Authors to steal the *mechanism* from (not the voice):

- **Nystrom (*Crafting Interpreters*)** — code first, then theory; relentless forward momentum where each chapter ends with a working thing and a hook into the next. Steal: end every section with a runnable result and an open loop.
- **The Rust Book** — names the misconception out loud ("you might think... but"), then the borrow checker *teaches by rejecting you*. Steal: dramatize the compiler error as a character that pushes back.
- **Haverbeke (*Eloquent JavaScript*)** — sustained running world; quietly raises stakes. Steal: the spine (§4).
- **Julia Evans** — radical concreteness; one tiny true thing per beat, zero hand-waving, the reader is never lost. Steal: shrink each claim to something checkable *right now*.
- **Bret Victor** — make the consequence *immediately visible*; the reader sees cause→effect, not a description of it. Steal: the `:::play` runnable blocks are this; lead with them more often ("change the input, watch `??` preserve the 0").
- **Josh Comeau** — warm second person + interactive widget at the exact moment of confusion; explains the *mental model*, not the API. Steal: put the interactive beat at the point of maximum doubt, not the end.
- **Dan Abramov** — "you probably think X. Here's why X is incomplete." Builds the correct model by demolishing the plausible-wrong one. Steal: the misconception beat (§2) as a whole-essay structure.
- **Why's Poignant Guide** — strip the whimsy, keep the *engine*: it never stops asking a question the next paragraph answers. Steal: the relentless gap-cadence, nothing else.

### 7. Openings that hook, closings that propel

**Opening principle.** Start with a *problem the reader can feel*, not a definition. A definition answers a question nobody asked yet; a problem *creates* the question the definition will resolve. The strongest opener is a misconception beat (§2) or a "predict this" (§1) — both are already in the lessons' toolkit, just not always at the top.

Before (definition-dump open):
> Generics: you know these from Python's `TypeVar`. TS uses angle brackets `<T>`.

After (problem-first open):
> You write a `first(xs)` that returns `xs[0]`. What type comes back? In Python you'd reach for `TypeVar`. In TS you'll write *less* than you expect — and the compiler will know the answer type before you do. Here's the machinery that makes that work.

**Closing principle.** End with **resolution + momentum**: snap the gap shut (the recap), then open a hairline crack into the next lesson. Don't end flat on a summary; end on a question the next lesson owns. The "Recap" sections do the resolution; add a one-line *forward hook* after them.

Before: `## Recap` (bulleted facts) — full stop.
After: Recap, then — "You can now describe a shape. But shapes can *lie*: two unrelated types with identical shapes are interchangeable, and that can be a bug. Lesson 4 is about making the compiler tell them apart."

---

## Part 2 — Applying it to ts-learn lesson structure

A lesson is an arc, not a reference page. Target skeleton:

1. **Cold open — a felt problem or a "predict this."** Ideally a Python intuition about to break (§2/§7). No definitions yet. ≤6 lines.
2. **Name the mechanism (the reveal).** Now that they feel the gap, give the rule its name and one-line model (§3/§6).
3. **Anchor example, then generalize** (§3). Concrete `console`/`settings` instance → the rule it implies.
4. **`:::compare` + a prose antithesis verdict** (§6). The code mirror, then one line: "Python checks the name; TS checks the shape."
5. **The sharp corner** as a `:::quiz` gap (§1), foreshadowed at the end of the prior section (§5).
6. **`:::play` at the point of maximum doubt** (§6, Victor/Comeau), not as an afterthought.
7. **Recap = gap closed**, then **one forward-hook line** into the next lesson (§7).

Carry the **spine object** (`User`/`settings`/`config`) across lessons so callbacks land on something the reader already owns (§4/§5).

Cadence rule (Why's engine, §6): no section should be pure exposition. Each one either *opens* a gap or *closes* one. If a paragraph does neither, it's reference material — move it to a callout or cut it.

---

## Part 3 — The anti-clickbait boundary (hard line)

The pull must be **intellectual curiosity and honest tension**, never manufactured hype. The line:

| Curiosity (do) | Clickbait (never) |
|---|---|
| Open a *real* gap the section then *fully* closes | Tease a gap and under-deliver, or never close it |
| "Predict: which of these compiles?" — answerable, stakes real | "The TS feature that will BLOW YOUR MIND 🤯" |
| Tension from a genuine misconception (`0 \|\| 50`) | Fake urgency: "you're using types WRONG" |
| Respect the reader as an expert who can be surprised | Talk down: "this one weird trick", "nobody tells you" |
| Reveal a name *after* earning it | Withhold trivially to pad / force scrolling |
| Forward hook = a real question the next lesson answers | Cliffhanger that bait-switches into something unrelated |
| Second person about *their code* and reasoning | Second person as flattery or pressure |
| Emotion = the satisfaction of understanding | Emotion = FOMO, outrage, hype |

Litmus test, three questions per hook:
1. **Does the gap close in-page, completely?** If not, it's a tease — cut or close it.
2. **Would an expert feel respected or manipulated?** Manipulated → rewrite.
3. **Is the tension *true*** (a real misconception, a real consequence) **or manufactured?** Manufactured → delete.

No emoji-as-emphasis, no "🔥", no all-caps, no "the secret nobody...", no fake scarcity. The reader stays because the *ideas* are pulling, and because you keep your promises. Curiosity is a debt you take on; clickbait is a debt you default on.

---

## Per-lesson checklist

Opening
- [ ] Opens with a felt problem or "predict this", **not** a definition dump.
- [ ] If a Python intuition misleads here, the opener *invokes it before breaking it* (§2).

Body
- [ ] Every section either opens a gap or closes one — no pure-exposition paragraphs (§1/cadence).
- [ ] At least one misconception-then-correction beat tied to *the reader's own likely code* (§2).
- [ ] Concrete anchor example precedes each abstract rule (§3).
- [ ] Mechanism names are *revealed after* the reader feels the effect, not front-loaded (§6).
- [ ] Each `:::compare` is followed by a one-line antithesis verdict ("Python X; TS Y") (§6).
- [ ] Rhetorical questions used as gap-openers in body prose, not only in quizzes (§6).
- [ ] "You" is used for the reader's actions/keystrokes; "we" for shared reasoning (§6).
- [ ] `:::play` / interactive beat sits at the point of *maximum doubt* (§6).

Arc & continuity
- [ ] At least one intra-lesson foreshadow → payoff seam (§5).
- [ ] Uses the shared spine object where natural; callbacks land on something already owned (§4/§5).
- [ ] At least one callback to an earlier lesson's idea (already common — keep it).

Closing
- [ ] Recap closes every gap the lesson opened (no dangling teases) (§7).
- [ ] Ends with exactly one forward-hook line that the next lesson genuinely answers (§7).

Anti-clickbait gate (all must pass)
- [ ] Every gap opened is fully closed in-page.
- [ ] No emoji-emphasis, no all-caps hype, no "one weird trick" / "nobody tells you".
- [ ] No fake urgency or scarcity; tension is always a *real* misconception or consequence.
- [ ] An expert reader would feel respected, not manipulated.
