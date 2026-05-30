---
term: Mapped types
short: Build a new object type by iterating the keys of an existing one — `{ [K in keyof T]: ... }` — the engine behind `Partial`, `Readonly`, `Pick`.
domain: ts
related: conditional-types, infer, structural-typing
---

A **mapped type** transforms every property of an existing type by iterating its
keys with `in keyof`:

```ts
type Readonly<T> = { readonly [K in keyof T]: T[K] };
type Partial<T> = { [K in keyof T]?: T[K] };
type Nullable<T> = { [K in keyof T]: T[K] | null };
```

### Key remapping & modifiers

You can rename keys with an `as` clause and add/strip `readonly`/`?` modifiers
(`-readonly`, `-?`):

```ts
type Getters<T> = {
  [K in keyof T as `get${Capitalize<string & K>}`]: () => T[K];
};
type Required<T> = { [K in keyof T]-?: T[K] }; // strip optionality
```

Mapped types are how nearly every built-in utility type in lesson 11 is defined,
and they compose with [[conditional types]] and [[infer]] for heavier
transforms.

## Python anchor

The runtime equivalent is a dict/`__init__` comprehension that rebuilds an
object key-by-key — but Python has nothing at the *type* level. A `TypedDict`
is fixed; you can't programmatically derive `Partial[SomeTypedDict]`. This is a
genuinely no-analog feature, so it rewards extra worked examples.
