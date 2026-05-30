---
term: Conditional types
short: A type-level if/else — `T extends U ? X : Y` — that picks a branch based on an assignability check, and distributes over unions.
domain: ts
related: infer, mapped-types, structural-typing
---

A **conditional type** is a ternary at the type level:
`T extends U ? TrueBranch : FalseBranch`. The check is *assignability*, not
identity — `T extends U` asks "is every `T` a `U`?".

```ts
type IsString<T> = T extends string ? 'yes' : 'no';
type A = IsString<'hi'>; // 'yes'
type B = IsString<42>; // 'no'
```

### Distribution

When the checked type is a *naked* type parameter and you pass a union, the
conditional **distributes** over each member:

```ts
type ToArray<T> = T extends unknown ? T[] : never;
type R = ToArray<string | number>; // string[] | number[]
```

Wrap the parameter in a tuple — `[T] extends [U]` — to opt out of distribution.

Conditional types unlock [[infer]] (extracting a type from a match) and pair
with [[mapped types]] to build the utility types in lesson 11. There is no
Python analog: `typing` has no type-level conditionals; the closest is
`@overload`, which selects an implementation, not a *type*.
