# Prose-Craft & Voice for ts-learn

**Lens:** micro-craft — sentence rhythm, cohesion, voice, readability. The goal is *fluid, clear, intelligent prose* for an expert Python dev: the register of a great textbook or a sharp engineering blog. **Not** marketing, not clickbait, not social-media hype.

The good news from reading the existing lessons: the voice is already mostly right — plain, confident, specific, dryly witty ("It's `# type: ignore`-grade", "a lie detector you disable"). This doc codifies *why* that works so it stays consistent, and flags the few habits that slip.

---

## 1. Principles (source → one line)

- **Williams, *Style*** — Put **characters in subjects, actions in verbs.** "The compiler tracks nullability" beats "nullability tracking is performed."
- **Williams — given→new / old-before-new.** Open a sentence with information the reader already has; end with the new thing. This is the single biggest lever for flow.
- **Williams — stress position / end-weight.** The end of a sentence is the emphatic slot. Put the payload there, not a trailing qualifier.
- **Williams — kill nominalizations.** Verbs hidden inside nouns ("perform a check", "make an assignment") slow prose. Unbury them ("check", "assign").
- **Williams — topic strings.** Keep paragraph subjects consistent so the reader tracks one thread, not a shuffle of subjects.
- **Zinsser, *On Writing Well*** — **cut clutter; simplicity.** Every word must earn its place. Delete throat-clearing ("It's worth noting that", "Basically").
- **Zinsser — warm, clear, human voice.** Write to one smart reader, not an audience.
- **Strunk & White** — **omit needless words; prefer the concrete and specific** to the vague and abstract.
- **Pinker, *Sense of Style*** — **classic style: joint attention.** Show the reader a thing in the world; point at it together. Beware the **curse of knowledge** — name what an expert-in-X-but-novice-in-TS doesn't yet know.
- **Pinker — vary sentence length; use the short sentence as a hammer** after a long one. ("It doesn't matter." after a setup.)
- **Pinker** — prefer the **right concrete example** over an abstract restatement; one good example replaces a paragraph of definition.

---

## 2. The Fluidity Toolkit (concrete moves, with TS-teaching rewrites)

### M1 — Characters as subjects, actions as verbs
Find the real actor; make it the grammatical subject.
- ✗ *Erasure of the type annotation is what occurs during compilation.*
- ✓ **`tsc` erases the annotation when it compiles.**

### M2 — Honor given→new
Start with the known, end with the new. Reorder, don't rewrite.
- ✗ *A typo-catching extra layer that only fires on fresh literals is the excess-property check.*
- ✓ **The excess-property check is a typo-catching extra layer that only fires on fresh literals.** (Subject = the term just introduced; payload lands at the end.)

### M3 — Put the payload in the stress position
End the sentence on the word that matters.
- ✗ *`??` only falls back on `null`/`undefined`, unlike `||` which is the point.*
- ✓ **`||` falls back on any falsy value; `??` falls back only on `null`/`undefined`.** (Contrast lands last.)

### M4 — Unbury nominalizations
- ✗ *Make an assignment of `null` to the variable.* → ✓ **Assign `null` to the variable.**
- ✗ *Perform a check of the shape at runtime.* → ✓ **Check the shape at runtime.**

### M5 — Cut throat-clearing and empty intensifiers
- ✗ *It's worth noting that this is basically a really important distinction.*
- ✓ **This distinction matters.**
Delete: *basically, essentially, of course, simply, just, actually, really, very, quite, it turns out.* Keep `just`/`simply` only when literally true (one step), never as reassurance.

### M6 — Short sentence after long
A long mechanism sentence, then a flat verdict.
- ✓ *The object `{ x: 1, y: 2 }` was never declared to be a `Point`.* **It doesn't matter.** *It has the shape, so it is a `Point` as far as the type system cares.* (This is the existing Lesson 03 rhythm — keep doing this.)

### M7 — Maintain a topic string across the paragraph
Keep the subject stable. If a paragraph is *about* `??`, start its sentences with `??` / "it" / "the operator", not a new noun each time.

### M8 — Classic style: point at the thing
Replace meta-talk about the concept with the concept shown.
- ✗ *This section will explain how nullability is propagated by the type system.*
- ✓ **Pass a `User | undefined` to a function and the compiler refuses `u.name` until you guard it:** *(then the code block).*

### M9 — Name the curse-of-knowledge gap explicitly
The reader knows Python cold and TS not at all. Anchor every new TS idea to the Python they already hold, then state the *difference* plainly.
- ✓ **Python has one empty value: `None`. JS/TS has two: `null` and `undefined`.** (Lesson 06 nails this — known thing first, new delta second.)

### M10 — Parallelism for parallel ideas
Lists and contrasts read faster when their grammar matches.
- ✗ *`?.` chains safely, `??` is for falling back, and asserting non-null is what `!` does.*
- ✓ **`?.` chains safely, `??` falls back on null/undefined, `!` asserts non-null.** (verb-first, three times.)

### M11 — One concrete word beats an abstraction
- ✗ *utilize*, *leverage*, *functionality*, *in order to*, *a number of*
- ✓ *use*, *use*, *feature/it does X*, *to*, *several / three*

### M12 — Let one example carry the weight
After a one-line rule, show the smallest code that proves it; don't restate the rule in prose. The lessons already do this with `:::play` and predict-then-reveal `:::quiz` — that *is* joint attention. Keep it.

---

## 3. Style Sheet — the ts-learn voice

**Register:** a senior engineer explaining TS to a peer who knows Python deeply. Calm, exact, occasionally dry. Earns trust by being right and brief, never by selling.

**Do**
- Address the reader as **you**; refer to TS/the compiler as the actor.
- Lead each section with the **one-sentence model**, then develop it. (See Lesson 01's "The one-sentence model" — exemplary.)
- Use **Python as the anchor**, then state the **delta** in one plain sentence.
- Vary sentence length on purpose; land hard truths in short sentences.
- Use `**bold**` for the *single* key term in a passage, not for emphasis-by-volume.
- Dry wit is allowed when it teaches (`# type: ignore`-grade, "a lie detector you disable"). It must clarify, not decorate.
- Prefer present tense, active voice, second person.

**Don't / Banned**
- **Exclamatory hype:** "Amazing!", "Let's dive in!", "This is huge!", "game-changer", "supercharge", "unlock". No `!` in body prose except inside code/output (`// bug!` is fine — it's annotating output).
- **Empty intensifiers:** incredibly, super, amazingly, extremely, ridiculously, blazingly, mind-blowing.
- **Fake urgency / FOMO:** "you NEED to know this", "stop doing X right now", "in 2026 you can't afford…".
- **Throat-clearing:** "It's worth noting", "Needless to say", "At the end of the day", "Basically/Essentially", "As we all know".
- **Hollow hedges:** "kind of", "sort of", "pretty much", "I think" — be definite or cut it.
- **Marketing nouns:** leverage, utilize, synergy, robust, seamless, powerful, cutting-edge, best-in-class.
- **Emoji-spam** and 🚀-style decoration in lesson prose.
- **Curse-of-knowledge jargon** dropped without an anchor (don't say "variance" / "discriminated union" cold — tie to a Python idea or define on first use).
- **Passive evasion** of the actor: "mistakes were made" → say who/what does it (`tsc` does it).

**Punctuation/format**
- Em dash for the sharp aside — like this — sparingly.
- One idea per paragraph; 2–5 sentences. Break a paragraph the moment the subject changes.
- Code blocks carry the example; prose states the rule. Don't narrate code line-by-line — comment the line instead.

---

## 4. Per-lesson editing checklist

Run this pass on each `src/lib/content/*.md` after the content is right. Read it **aloud** — the ear catches what the eye skips.

**Sentence level**
- [ ] Every sentence's grammatical **subject is the real actor** (TS, the compiler, the value, you). No buried actors.
- [ ] Each sentence **opens on given info, ends on new** info (given→new).
- [ ] The **last word/phrase** of key sentences is the payload, not a trailing qualifier.
- [ ] No **nominalizations** where a verb works ("make a check" → "check").
- [ ] Killed: *basically, essentially, just(filler), really, very, of course, it's worth noting, simply(filler)*.
- [ ] No **banned hype/intensifier/marketing** words (§3). No stray `!` in prose.

**Paragraph level**
- [ ] One idea per paragraph; stable **topic string** (subjects don't shuffle).
- [ ] Section opens with a **one-sentence model**, then develops it.
- [ ] **Sentence length varies**; at least one short hammer-sentence near each hard point.
- [ ] Parallel ideas use **parallel grammar** (lists, contrasts, recaps).

**Teaching-specific (curse of knowledge)**
- [ ] Every new TS concept is **anchored to a Python equivalent**, then the **delta** stated plainly.
- [ ] Concepts are **shown** (code/`:::play`/`:::quiz`), not just described; prose doesn't restate what the code already proves.
- [ ] First use of any term (variance, narrowing, branding, discriminated union) is **defined or anchored**, never dropped cold.
- [ ] Concrete words over abstractions (`use` not `utilize`; a real example over "various scenarios").

**Final**
- [ ] Read the section aloud once. Any place you stumble, run out of breath, or hear a salesy lilt — rewrite that sentence.
