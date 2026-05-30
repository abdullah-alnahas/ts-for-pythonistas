---
term: Hindley–Milner
short: A type-inference algorithm that deduces the most general types with no annotations, via unification — the basis of ML, Haskell, and partly TS inference.
domain: swe
related: type-erasure, soundness-vs-completeness, structural-typing
---

**Hindley–Milner** (HM) is the classic type system + inference algorithm
(Algorithm W) behind ML, OCaml, and Haskell. Its headline property: it infers
the **most general (principal) type** of an expression *without any
annotations*, by:

1. assigning fresh type variables to unknowns,
2. generating equations from how values are used, and
3. solving them by **unification**.

```ocaml
let id x = x   (* inferred: 'a -> 'a, fully general, no annotation *)
```

HM gives complete, decidable inference — but only for a restricted system (no
subtyping, limited polymorphism).

## TS / Python anchor

TypeScript's inference is *HM-inspired* but not pure HM: it adds **subtyping**,
[[structural typing|structural]] types, and unions, which break HM's clean
principal-type guarantee — so TS sometimes needs annotations where Haskell
wouldn't. Python's checkers (mypy, pyright) are similarly local/bidirectional
rather than global HM. The reason all of them can erase types afterward is the
same — see [[type erasure]]. The pragmatic compromises TS makes are a case study
in [[soundness vs completeness]].
