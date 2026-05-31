---
title: Variables and primitives
subtitle: let and const, the primitive types, and how much you can leave to inference
---

A variable in TypeScript is a name, a type, and a value — except you almost never write the type, because the compiler infers it. This lesson covers declaration keywords, the primitive types and how they map to Python's, and where annotations earn their keep.

## Declaring: `const` and `let`, never `var`

Python has one form: `name = value`, rebindable anywhere. TypeScript has two you use and one you don't.

:::compare run
```python
currency = "$"        # rebindable
currency = "€"        # fine

WARN_OVER = 1000.0    # convention only; still rebindable
```
```typescript
const currency = "$"; // cannot be reassigned
let total = 0;        // reassignable
total = 1000;         // fine

// currency = "€";    // compile error: Cannot assign to 'currency'
console.log(currency, total);
```
:::

`const` is the default you reach for; use `let` only when you actually reassign. `var` is the old, pre-2015 keyword with confusing function-level scope — never write it. The difference from Python's `WARN_OVER` convention is that `const` is enforced: reassigning it is a compile error, not a style-guide suggestion.

Two caveats so the enforcement doesn't mislead you:

- `const` blocks *reassignment of the binding*, not *mutation of the value*. `const items = []` still lets you `items.push(x)`. It's Python's "you can't rebind, but the list is still mutable" — there is no deep `freeze` unless you ask (`Object.freeze`, or `as const`).
- `const` and `let` are block-scoped (`{ ... }`), and a variable doesn't exist before its declaration line — touching it earlier is an error (the [[temporal dead zone|tdz]]), unlike Python where the name simply isn't bound yet.

## The primitive types

Here is the whole table you need. The headline surprise is `number`.

| Python | TypeScript | Notes |
|---|---|---|
| `str` | `string` | always double or single quotes or backticks; no separate char type |
| `int`, `float` | `number` | **one type for both** — `1` and `1.5` are both `number` |
| — | `bigint` | arbitrary-precision integers, written `10n`; use when `number` overflows (2⁵³) |
| `bool` | `boolean` | `true` / `false`, lowercase |
| `None` | `null` *and* `undefined` | TS has two "nothing" values — the next lesson is about them |
| — | `symbol` | unique keys, rarely needed early |

The one that bites: Python's `int`/`float` distinction is gone. `number` is an IEEE-754 double, so `7 / 2` is `3.5`, not `3`. Integer division is `Math.trunc(7 / 2)` or `Math.floor`. There is no automatic `int`.

:::compare run
```python
n = 7 / 2          # 3.5
i = 7 // 2         # 3 (floor division)
big = 2 ** 70      # ints never overflow
```
```typescript
const n = 7 / 2;            // 3.5
const i = Math.trunc(7 / 2); // 3
const big = 2n ** 70n;       // bigint, when number would lose precision
console.log(n, i, big);
```
:::

Note the lowercase type names. `string`, `number`, `boolean` are the types; the capitalized `String`, `Number`, `Boolean` are wrapper-object types you almost never want — the lint rules will steer you to the lowercase ones.

## Annotations, and why you rarely write them

The annotation syntax is Python's, with TypeScript's type names after the colon:

:::compare
```python
currency: str = "$"
warn_over: float = 1000.0
```
```typescript
const currency: string = "$";
const warnOver: number = 1000.0;
```
:::

But writing the annotation on an initialized variable is redundant, and idiomatic TypeScript leaves it off. The compiler **infers** the type from the value, and the inference is good — far more thorough than mypy's. So the real translation of our two constants is:

:::compare
```python
CURRENCY = "$"
WARN_OVER = 1000.0
```
```typescript
const CURRENCY = "$";    // inferred: string (actually the literal "$")
const WARN_OVER = 1000;  // inferred: number
```
:::

`WARN_OVER` drops the `.0` — there's no `float` literal to preserve, just `number`. Annotate when there's no value to infer from yet (a `let` you assign later, a function parameter, an empty array you'll fill). Inferred-everywhere is the house style; an annotation on `const x: number = 5` reads as noise.

One sharp edge worth knowing now: `const` infers the *literal type*, not the wide one. `const CURRENCY = "$"` has type `"$"` (the exact string), while `let c = "$"` has type `string`. That narrowing is what makes `const` values usable in unions and `switch` later — keep it in your pocket for the types lesson.

**File status:** ✅ `CURRENCY`, `WARN_OVER` translated. ⏳ everything else still Python. Next: control flow — `if`, `switch`, and the loops.
