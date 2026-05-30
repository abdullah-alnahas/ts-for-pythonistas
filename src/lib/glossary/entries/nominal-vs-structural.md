---
term: Nominal vs structural typing
short: Two ways to decide type compatibility — by declared name/lineage (nominal) or by shape (structural). TS is structural; Java/Python classes are nominal.
domain: swe
related: structural-typing, branded-types, typing-protocol
---

The two dominant models for "is type A compatible with type B?":

- **Nominal** — compatibility follows *declared identity*: A fits B only if A
  *is* B or explicitly declares it extends/implements B. Java, C#, Rust, and
  Python's `isinstance`/class hierarchy work this way.
- **Structural** — compatibility follows *shape*: A fits B if A has all members
  B requires, regardless of names. TypeScript and OCaml work this way; see
  [[structural typing]].

```ts
class Dollars { constructor(public n: number) {} }
class Euros { constructor(public n: number) {} }
let d: Dollars = new Euros(5); // ✅ in TS! identical shape — a nominal-typing surprise
```

Neither is "better": nominal prevents accidental mixing (the example above is a
bug a nominal system catches for free); structural maximizes reuse and matches
dynamic runtimes.

## Bridging the two

When you need nominal guarantees inside a structural system, you simulate them
with [[branded types]] (TS) or `typing.NewType` (Python). When you want
structural flexibility inside a nominal system, you reach for
[[typing.Protocol (structural matching)]] or interfaces.
