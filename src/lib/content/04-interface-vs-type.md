---
title: interface vs type
subtitle: Two ways to name a shape, and when each wins
---

## The split that doesn't exist in Python

Python gives you a drawer full of shape tools that blur together: `TypedDict`, `dataclass`, `Protocol`, `NamedTuple`, plus `TypeAlias`. TS collapses all of that to **two** — `interface` and `type` — which overlap so heavily (~80%) that the real question isn't "what's the difference" but "where, exactly, do they stop being interchangeable." There are only a handful of seams. Here's the first one.

:::quiz
**Predict before you read on.** You want to name "a value that's either a `string` or a `number`." One of these two lines is a syntax error. Which?

```typescript
interface ID = string | number;   // (A)
type ID = string | number;        // (B)
```
:::answer
**(A) is an error.** An `interface` can only name an *object or function shape* — it cannot name a union, a tuple, or a bare primitive. `type` can name *any* type, unions included. That single capability gap explains most of the "which do I use" decisions below. (Note the bug in (A) is even more basic: `interface` never uses `=`.)
:::

:::compare
```python
from typing import TypedDict

class User(TypedDict):
    name: str
    age: int
```
```typescript
interface User {
  name: string;
  age: number;
}
// — or —
type User = {
  name: string;
  age: number;
};
```
:::

For a plain object shape, **both do the same job**. The differences show up at the edges.

## What only `type` can do

`type` is a general **type alias** — it can name *any* type, not just object shapes.

```typescript
type ID = string | number;          // union — interface CAN'T do this
type Pair = [number, number];       // tuple
type Handler = (e: Event) => void;  // function type
type Nullable<T> = T | null;        // alias over a generic
type Keys = keyof User;             // computed/mapped types (Lesson 11)
```

An `interface` can only describe **object/function shapes**. You cannot write `interface ID = string | number`. So: **unions, tuples, primitives, and computed types must be `type`.**

## What `interface` does that `type` doesn't (cleanly)

### 1. Declaration merging

Multiple `interface` declarations with the same name **merge**. `type` throws a duplicate-identifier error. Run this — the merged `Box` requires *both* fields; then watch the `type` version reject its second declaration.

:::play
```typescript
interface Box { width: number }
interface Box { height: number }
// Box is now { width: number; height: number }

const b: Box = { width: 10, height: 20 }; // both fields required
console.log(b);

// Uncomment to see the contrast — type can't redeclare:
// type T = { a: 1 };
// type T = { b: 2 }; // error: Duplicate identifier 'T'
```
:::

This is mostly used to **augment third-party types** (e.g. adding a field to `Window`). No Python equivalent — you can't reopen a `TypedDict`. A library-author feature; occasionally a footgun when two files accidentally share a name.

### 2. `extends` (cleaner inheritance)

:::compare
```python
class Animal(TypedDict):
    name: str

class Dog(Animal):       # inheritance
    breed: str
```
```typescript
interface Animal { name: string }
interface Dog extends Animal {
  breed: string;
}
```
:::

`type` does the same via intersection (`&`), but `interface extends` gives better error messages and slightly faster compiles:

```typescript
type Dog = Animal & { breed: string }; // equivalent result
```

Same result, two routes: `extends` names a relationship the compiler remembers; `&` computes a merged shape on the spot.

## Performance & error-message nuance

For large codebases the TS team's own guidance: **prefer `interface` for object shapes** because the compiler caches them and produces clearer errors; reach for `type` when you need a feature `interface` lacks (unions, tuples, mapped/conditional types, aliasing a primitive).

## A practical decision rule

| You're naming… | Use |
|---|---|
| A plain object shape (esp. public API, will be `extend`ed) | `interface` |
| A union (`A \| B`) | `type` |
| A tuple, function signature, or primitive alias | `type` |
| Anything computed (`keyof`, mapped, conditional) | `type` |
| You want declaration merging / augmentation | `interface` |

When in doubt for an object: `interface`. When it's not a plain object: `type`. Many teams just say "interface for objects, type for everything else" and move on — a fine heuristic.

## Both are erased

Reminder from Lesson 01: **neither exists at runtime.** Both `interface User` and `type User` compile to nothing. They're not classes; you can't instantiate them or `isinstance` them. If you need runtime presence (validation, instances), you need a `class` (Lesson 10) or a runtime schema library like Zod.

:::quiz
Recall Lesson 03. You define `type Point = { x: number; y: number }` and a function `f(p: Point)`. Must a caller's value be *declared* as `Point` to pass it?
:::answer
**No** — typing is structural, and that's independent of whether you used `type` or `interface`. Any value with `{ x: number; y: number }` (and possibly more) is assignable to `Point`. `interface` vs `type` changes the *features* available when naming a shape (unions, merging, `extends`), never the structural matching rule.
:::

## Recap

- `interface` and `type` overlap for object shapes; pick one and be consistent.
- Only `type` can name unions, tuples, primitives, functions, computed types.
- Only `interface` supports **declaration merging** and gives cleaner `extends`.
- Default: `interface` for objects, `type` for everything non-object.
- Both are erased at runtime — neither is a `class`.

:::quiz
For each, which must you use — `interface`, `type`, or either?

1. `Status` = `"open" | "closed" | "pending"`
2. `Point` = an object `{ x: number; y: number }` you'll extend later
3. `Middleware` = `(req: Req, res: Res) => void`
:::answer
1. **`type`** — it's a union; `interface` can't express `|`.
2. **`interface`** (either works, but `interface` is preferred for an extensible object shape).
3. **`type`** — it's a standalone function-type alias. (You *can* express a callable with `interface Middleware { (req: Req, res: Res): void }`, but a `type` alias is the idiomatic choice here.)
:::

Both tools name *one* shape. The far more common modeling job is naming a value that is *one of several* shapes — and the `|` you saw the interface choke on is exactly where Lesson 05 begins.
