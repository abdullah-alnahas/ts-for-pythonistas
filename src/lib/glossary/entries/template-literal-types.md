---
term: Template literal types
short: Types built from string-literal patterns — e.g. `` `get${Capitalize<K>}` `` — that let the type system compute and constrain string-shaped values the way template literals compute strings at runtime.
domain: ts
related: mapped-types, conditional-types, infer
---

A **template literal type** is a type-level counterpart to JavaScript's template
literal syntax. Where a runtime template literal `` `get${key}` `` produces a
string value, a template literal *type* `` `get${K}` `` produces a string-shaped
type. The compiler evaluates it during type-checking and distributes over unions:

```ts
type Key = 'name' | 'age';
type Getter = `get${Capitalize<string & Key>}`;
// 'getName' | 'getAge'
```

Every member of the union is expanded; the result is the full cross-product of
all variants. This makes it possible to derive a precise set of string constants
from a source type rather than writing them out by hand.

### Common use: deriving event names and key variants

```ts
type EventMap = { click: MouseEvent; change: Event };
type EventName = `on${Capitalize<keyof EventMap & string>}`;
// 'onClick' | 'onChange'
```

The pattern shows up wherever a library maps type keys to camelCase method names,
event strings, or CSS property names — the derived type stays in sync with the
source type automatically.

### Composing with mapped types and infer

Template literal types do most of their real work inside [[mapped types]]:

```ts
type Getters<T> = {
  [K in keyof T as `get${Capitalize<string & K>}`]: () => T[K];
};
```

The `as` clause renames each key; the template literal computes the new name.

Combined with [[infer]] and [[conditional types]], you can also *extract* the
variable parts of a string type:

```ts
type EventKey<S extends string> =
  S extends `on${infer K}` ? Uncapitalize<K> : never;

type A = EventKey<'onClick'>; // 'click'
```

Here the template literal pattern is on the *left* of `extends`, and `infer`
captures whatever filled the `${K}` slot — type-level pattern matching on
strings.

## Python anchor

Python has no direct equivalent. The runtime analog is an f-string:
`` f"get{key.capitalize()}" `` produces a string value. Template literal types
do the same computation but *at the type level*, on types rather than values —
and the result is a constraint the compiler enforces rather than a string the
program produces. Python's type system has no mechanism to express "a string that
matches this pattern" or to derive union members from a string transformation;
`typing.Literal` accepts a fixed set of strings but cannot compute one.

The way to think about it: f-strings give Python computed strings at runtime;
TypeScript's template literal types give the type checker computed string-shaped
types at compile time — in a language where both the value and the type
computation exist side by side, in the same syntax.
