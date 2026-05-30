---
term: Structural typing
short: Type compatibility decided by an object's *shape* (its members), not its declared name — if it has the required members, it fits.
domain: swe
related: nominal-vs-structural, typing-protocol, branded-types
---

Under **structural typing**, two types are compatible when their *shapes* match
— the set of members one provides is a superset of what the other requires.
Names and declared lineage are irrelevant.

```ts
interface Point { x: number; y: number }
function dist(p: Point) { return Math.hypot(p.x, p.y); }

const thing = { x: 3, y: 4, label: 'p' };
dist(thing); // ✅ has x & y — extra members are fine
```

This is TypeScript's default and pervasive model. The trade-off: it's flexible
and matches JavaScript's duck-typed runtime, but lets unrelated types with
coincidentally-matching shapes substitute for each other — which is why you
sometimes want [[branded types]] to recover distinctness.

## Python anchor

Runtime Python is duck-typed ("if it quacks…"); statically, `typing.Protocol`
([[typing.Protocol (structural matching)]]) gives the same structural matching
for type checkers. Contrast with [[nominal vs structural|nominal typing]], where
the declared class name is what counts. Structural rules interact with
[[variance]] when the members are themselves containers or functions.
