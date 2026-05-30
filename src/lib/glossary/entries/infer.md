---
term: infer
short: A keyword used inside a conditional type to capture part of a matched type into a fresh type variable — e.g. pull the element type out of an array.
domain: ts
related: conditional-types, mapped-types
---

`infer` declares a *placeholder* type variable inside the `extends` clause of a
[[conditional types|conditional type]]. If the match succeeds, TypeScript binds
the placeholder to whatever filled that slot.

```ts
type ElementOf<T> = T extends (infer U)[] ? U : never;
type A = ElementOf<string[]>; // string

type ReturnType<F> = F extends (...args: never[]) => infer R ? R : never;
type B = ReturnType<() => number>; // number

type Awaited<T> = T extends Promise<infer V> ? V : T;
```

Multiple `infer`s in one pattern bind independently. When the same name appears
in covariant positions you get a *union*; in contravariant positions, an
*intersection*.

There is no Python equivalent — this is pure type-level pattern matching /
destructuring, evaluated by the compiler. It only makes sense alongside
[[conditional types]], where it lives.
