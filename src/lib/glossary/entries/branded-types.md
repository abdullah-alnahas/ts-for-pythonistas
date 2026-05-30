---
term: Branded types
short: A structural type made artificially nominal by intersecting it with a unique tag, so `UserId` and `OrderId` can't be swapped even though both are strings.
domain: ts
related: structural-typing, nominal-vs-structural, type-erasure
---

TypeScript is [[structural typing|structural]]: any two `string`s are
interchangeable. **Branded** (a.k.a. *opaque* or *tagged*) types fake nominality
by intersecting a base type with a unique, unforgeable marker:

```ts
type Brand<T, B extends string> = T & { readonly __brand: B };
type UserId = Brand<string, 'UserId'>;
type OrderId = Brand<string, 'OrderId'>;

function getUser(id: UserId) {}
const raw = 'u_123';
getUser(raw); // ❌ plain string isn't a UserId
getUser(raw as UserId); // ✅ explicit minting at the boundary
```

The `__brand` field never exists at runtime — it's erased (see [[type
erasure]]). It exists only to make the compiler reject accidental mixing of two
otherwise-identical primitives.

## Python anchor

Python ships this as a first-class feature: `typing.NewType("UserId", str)`
creates a distinct static type that's a plain `str` at runtime — the same
"nominal wrapper, zero runtime cost" idea. Branded types are how you recover
[[nominal vs structural|nominal]] guarantees inside a structural system.
