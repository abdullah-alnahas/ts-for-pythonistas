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

The standard definitions above are statements about the **accept** verdict
(*type-checks ⟹ safe*; *safe ⟹ type-checks*), so the natural confusion
matrix uses **prediction-positive = "the checker accepts (calls it
well-typed)"** and **ground-truth positive = "the program is actually
type-safe."** This is the assignment that makes "TypeScript is unsound" mean
what everyone takes it to mean — it accepts programs that crash.

| | actually safe (**P**) | actually type-errors (**N**) |
| --- | --- | --- |
| **checker accepts** (predicts +) | **TP** | **FP** — soundness hole |
| **checker rejects** (predicts −) | **FN** — completeness hole | **TN** |

- **P** — programs that are genuinely type-safe. **N** — programs that
  genuinely type-error at runtime.
- **TP** — safe and accepted. **TN** — unsafe and rejected.
- **FP** — unsafe but accepted: the checker passed code that breaks. A
  **soundness** failure.
- **FN** — safe but rejected: the checker refused code that was fine. A
  **completeness** failure.

Reading the metrics off that matrix:

- **Soundness = precision** = `TP / (TP + FP)`. Precision *of what?* **Of
  the checker's acceptances** — its green checkmarks. Of every program it
  passes, how many are truly safe. Sound ⇒ FP = 0 ⇒ precision = 1: you can
  trust every "OK."
- **Completeness = recall** = `TP / (TP + FN)`. Recall *of what?* **Of the
  genuinely-safe programs** — the whole set of code that would actually run
  fine. How much of it the checker accepts. Complete ⇒ FN = 0 ⇒ recall = 1:
  it lets through everything good.

One caveat so the mapping doesn't surprise you elsewhere: the
**static-analysis / bug-finding** world flips "positive" to mean *"the tool
flags an error."* Under that polarity the words swap — soundness becomes
recall ("catch every bug, no misses") and completeness becomes precision
("no false alarms"). Same facts, mirrored matrix. The type-theory framing
here (and proof theory, where a sound prover proves only truths = precision)
is the one that matches how "type soundness" is actually used.

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

## Is any language complete?

Yes — and that's the uncomfortable part: **completeness is the cheap
property.** A checker that accepts *everything* is automatically complete
(it rejects no program that would run fine) and also useless, because it
catches nothing. So:

- **Dynamically-typed languages are complete by abdication.** Plain Python
  (no checker) or JavaScript reject nothing statically, so they reject no
  safe program — vacuously complete, totally unsound.
- **Gradual type systems are *mostly* complete on purpose.** TypeScript and
  [[mypy]] are tuned to accept almost all valid code; `any` / `Any` is the
  escape hatch that *protects* completeness — when the checker can't prove a
  fragment safe, it accepts rather than rejects. They pay for that
  acceptance rate by giving up soundness (the FP column above).

The hard, valuable property is soundness; the real engineering goal is "be
as sound as possible while staying complete enough that developers aren't
fighting false rejections."

A checker that is **both sound and complete *and* decidable** exists only
when you drop Turing-completeness. Total languages — **Dhall** (a real
config language) or the total fragments of **Agda** / **Idris** — have type
checkers that always terminate and admit exactly their well-typed programs
with no runtime type errors. The price is no unbounded recursion or general
loops. Even then, "complete" means *relative to that language's own type
discipline*: every nontrivial static system still rejects some program that
would happen to run fine (simply-typed lambda calculus, for instance,
rejects valid self-application). Perfect completeness against "all code that
runs without error" is unreachable for any useful language; completeness
against a fixed, decidable discipline is reachable, and total languages
reach it.

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
