---
term: Soundness vs completeness
short: A sound type system never accepts a program that will type-error at runtime; a complete one never rejects a valid program. Real systems trade one for the other.
domain: swe
related: variance, hindley-milner, type-erasure, mypy
---

Two properties a type system might aim for:

- **Soundness** — "no false negatives." If it type-checks, it won't have a
  type error at runtime. The checker never *misses* a real error.
- **Completeness** — "no false positives." Every program that *would* run
  correctly is accepted. The checker never rejects valid code.

By a Rice's-theorem argument you generally can't have both for a useful
language, so designers choose where to compromise.

**TypeScript deliberately chooses ergonomics over soundness** in spots:

- array/property [[variance|covariance]] (the unsound-write hole),
- `any` (an escape hatch that disables checking),
- bivariant method parameters,
- non-exhaustive but convenient narrowing.

These make TS *unsound but pleasant*. Languages like Haskell ([[Hindley–Milner]])
lean harder toward soundness; Python's gradual typing is explicitly unsound at
the dynamic boundary.

## If you know precision and recall

The two properties map onto the ML confusion matrix — but **the mapping
flips depending on which outcome you label "positive,"** so fix that first.

The intuitive choice is **positive = "the checker accepts the program"**
(it predicts "this is type-safe"):

- A **false positive** is accepting a program that actually type-errors at
  runtime — an unsoundness. Driving false positives to zero is
  **precision = 1**, which is exactly **soundness**. (When a sound checker
  passes your code, you can trust the pass — that *is* precision.)
- A **false negative** is rejecting a program that would have run fine — an
  incompleteness. Catching every genuinely-safe program is **recall = 1**,
  which is exactly **completeness**.

So under the natural framing: **sound ⇔ precision**, **complete ⇔ recall**.

Watch the convention, though. Flip "positive" to mean **"the checker flags
an error"** (treat it as a bug *detector*) and the labels swap: soundness
becomes recall (catch every real bug — no misses) and completeness becomes
precision (no false alarms). Same facts, mirrored matrix — which is why
people sometimes state it the other way around. The takeaway that survives
either framing: **soundness is about trusting what the checker accepts;
completeness is about not rejecting valid code.** And the familiar
precision/recall trade-off is the same tension designers face — push to
catch every real error (more soundness) and you reject more valid programs
(less completeness), and vice versa.

## Are they related? Can a checker be both?

They are **independent** properties, not opposites: a checker can be
neither, sound-only, complete-only, or (in restricted cases) both. They
*feel* opposed only because of where the trade-off bites in practice.

For a real, Turing-complete language, **you cannot have both at once.**
"Will this program hit a type error at runtime?" is undecidable (a Rice's-
theorem consequence), so any checker that always *terminates* with a yes/no
must give ground somewhere: miss some real errors (drop soundness), reject
some valid programs (drop completeness), or refuse to type certain
constructs at all (restrict the language). Most real type checkers sit at
sound-ish-but-incomplete, accepting false alarms as the lesser cost.

A genuinely **sound and complete** decision procedure is possible only when
the question is decidable — a total (non-Turing-complete) language, or a
restricted type system. (Note: "sound and complete" is routine for *logics*
— propositional logic has sound-and-complete proof systems — because that's
a different claim than deciding the runtime behavior of arbitrary code.)

## Where real checkers land

Positive = "rejects the program." Soundness is about runtime *type/memory
safety* of the language's checked subset.

| Checker | Sound? | Complete? | Notes |
| --- | --- | --- | --- |
| **Rust** (type + borrow checker) | **Yes**, for safe Rust | No | Rejects many programs that would actually be fine (borrow-checker false positives); `unsafe` is the opt-in soundness hole. |
| **Java** | **Mostly** | No | Sound except documented holes — array covariance (`ArrayStoreException` at runtime) and unchecked generic casts/raw types. |
| **TypeScript** | No | No | Deliberate unsoundness: array [[variance|covariance]], parameter bivariance, `any`, `as`. |
| **C++** | **No** | No | `reinterpret_cast`, C-style casts, unions, pointer arithmetic, out-of-bounds all compile and detonate at runtime. A type system, not a safety guarantee. |
| **Python — mypy / pyright / pyre / [Astral's `ty`]** | **No** (gradual) | No | Gradual typing is unsound *by design* at the dynamic boundary: `Any` propagates, casts and monkeypatching are unchecked. The trade buys incremental adoption. |

The pattern: no mainstream general-purpose checker is complete (all reject
*some* valid program), and only Rust and Java aim hard at soundness — Rust
by restricting what compiles, Java with a couple of known leaks. Everyone
else, including TypeScript and every Python checker, chose ergonomics and
gave up soundness on purpose.

## Why it matters

Knowing TS is intentionally unsound tells you *where to be careful*: trust the
compiler for ordinary code, but stay alert around `any`, type assertions
(`as`), and mutable covariant containers — the exact places the soundness was
traded away. It's also why types can be safely [[type erasure|erased]]: they
were never a runtime guarantee to begin with.
