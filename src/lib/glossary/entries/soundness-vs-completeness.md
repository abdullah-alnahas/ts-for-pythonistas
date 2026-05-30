---
term: Soundness vs completeness
short: A sound type system never accepts a program that will type-error at runtime; a complete one never rejects a valid program. Real systems trade one for the other.
domain: swe
related: variance, hindley-milner, type-erasure
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

## Why it matters

Knowing TS is intentionally unsound tells you *where to be careful*: trust the
compiler for ordinary code, but stay alert around `any`, type assertions
(`as`), and mutable covariant containers — the exact places the soundness was
traded away. It's also why types can be safely [[type erasure|erased]]: they
were never a runtime guarantee to begin with.
