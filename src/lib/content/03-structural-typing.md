---
title: Structural typing
subtitle: The biggest mind-shift — shape compatibility, checked at compile time
---

## Predict the error

You have a function `show(p: Point)`. You hand it a `Coord` — same fields, same types, different class name. In Python with mypy, you already know what happens: `Coord is not Point`, error. Now predict the TS version.

:::quiz
**Predict before you read on.** Both classes below have identical fields. `show` wants a `Point`. Does the TS call type-check?

```typescript
interface Point { x: number; y: number }
function show(p: Point): void {}

const c = { x: 1, y: 2 };  // never mentions Point
show(c);                   // error, or fine?
```
:::answer
**Fine.** No error. The object `{ x: 1, y: 2 }` was never declared a `Point` — and it doesn't matter. It *has the shape*, so it *is* a `Point` as far as the compiler cares. If you predicted an error, that's your nominal mypy instinct firing; TS doesn't check the name at all.
:::

The mechanism that just surprised you has a name: TS is **structurally typed**. A value fits a type when its *shape* matches — regardless of names, classes, or declared intent. Here is the same call beside the Python it contradicts.

:::compare
```python
# Nominal: this is an ERROR for mypy.
class Point:
    def __init__(self, x: int, y: int):
        self.x, self.y = x, y

def show(p: Point) -> None: ...

class Coord:  # same shape, different name
    def __init__(self, x: int, y: int):
        self.x, self.y = x, y

show(Coord(1, 2))  # mypy: error, Coord is not Point
```
```typescript
// Structural: this is FINE.
interface Point { x: number; y: number }

function show(p: Point): void {}

const c = { x: 1, y: 2 };
show(c); // ok!  c is assignable to Point
```
:::

Python checks the name; TS checks the shape. You already know the runtime half of this — Python is duck-typed at runtime ("if it quacks…"). TS takes that instinct and makes it the **compile-time** rule, while Python's *hints* stay mostly nominal (a `Dog` is only a `Dog`). The one corner of Python that works the TS way is `Protocol` — covered below.

## "Has at least" — extra properties are fine

Assignability is **"has at least these members."** A wider object satisfies a narrower type. Run this and then try the opposite direction: delete `name` from `user` and watch the assignment break.

:::play
```typescript
interface Named { name: string }

const user = { name: "Ada", age: 36, admin: true };
const n: Named = user; // ok — user has name (and more)

function greet(x: Named) { return x.name; }
console.log(greet(user)); // "Ada"
```
:::

This feels backwards at first. It's the same logic as Python `Protocol`: you require a subset of capabilities; anything providing *more* still qualifies.

Assignability flows from wider shapes to narrower requirements:

```
  required: Named               provided value
  ┌──────────────┐              ┌────────────────────────┐
  │ name: string │  ◀── ok ──   │ name, age, admin       │   more props = still assignable
  └──────────────┘              └────────────────────────┘

  ┌──────────────┐              ┌────────────────────────┐
  │ name: string │  ── no ──▶   │ {}  (no name)          │   missing a required prop = NOT assignable
  └──────────────┘              └────────────────────────┘
```

"Assignable to `T`" means **"has at least every member `T` requires"** — extras are invisible to `T`.

## The fresh-object-literal exception (excess property checks)

:::predict
Given `interface Opts { width: number }`, the "has at least" rule just said extra properties are fine. So which of these two compile?

```typescript
const a: Opts = { width: 10, height: 20 };  // (A) inline literal
const tmp = { width: 10, height: 20 };
const b: Opts = tmp;                         // (B) via a variable
```

- ( ) Both compile — "has at least" allows the extra `height`.
- ( ) Neither compiles — `height` isn't in `Opts`.
- (x) Only (B) compiles; (A) is an error.
- ( ) Only (A) compiles; (B) is an error.
:::answer
Only **(B)** compiles. (A) is an **error** — `'height' does not exist in type 'Opts'`. If you predicted both pass (the natural read of "has at least"), you just hit the one sharp corner: a **fresh object literal assigned directly** gets an extra *excess-property check* to catch typos. Route the identical object through a variable (B) and it's no longer "fresh," so the check is skipped and the permissive rule applies.
:::

So: a literal written *inline* is checked for excess properties; the *same object* through a variable is not. The "real" rule is the permissive "has at least"; the excess-property check is a typo-catching extra layer that only fires on fresh literals.

## The Python equivalent: Protocol

If you want this behavior in Python, `typing.Protocol` is the match. Useful as a mental bridge.

:::compare
```python
from typing import Protocol

class HasName(Protocol):
    name: str

def greet(x: HasName) -> None: ...

class Cat:           # no inheritance from HasName
    name = "Tom"

greet(Cat())         # ok — structural via Protocol
```
```typescript
interface HasName { name: string }

function greet(x: HasName): void {}

class Cat {          // does not "implements HasName"
  name = "Tom";
}

greet(new Cat());    // ok — structural by default
```
:::

The difference: in Python, structural matching is **opt-in** (you must use `Protocol`). In TS it's the **default and only** mode — even classes are compared structurally, not by name (more in Lesson 10).

## Why this matters in practice

- You can satisfy a library's interface **without importing or inheriting anything** — just produce the right shape.
- Two unrelated types with identical shapes are **interchangeable**. Sometimes surprising: a `Meters` and a `Seconds` that are both `{ value: number }` are mutually assignable. (Fixing that needs "branding" — see the glossary.)
- Refactoring is shape-driven: rename a class, and structurally-typed call sites don't break.

## Empty type & `object` gotcha

"Has at least" has a sharp edge once the required set is *empty*. What does the empty type `{}` accept?

:::quiz
**Predict before you read on.** Given `type Anything = {}`, which of these assignments compile under strict?

```typescript
const x: Anything = 42;
const y: Anything = "hi";
const z: Anything = null;
```
:::answer
`x` and `y` compile; `z` does not. `{}` requires "has at least nothing," so *every* non-null value qualifies — `42` and `"hi"` included. The only thing it rejects is `null`/`undefined`. So `{}` means "anything non-null," not "an empty object" — the natural Python read ("an empty dict-ish thing") is exactly wrong.
:::

```typescript
type Anything = {};
const x: Anything = 42;        // ok (number has "at least" nothing)
const y: Anything = "hi";      // ok
const z: Anything = null;      // ERROR (under strict)
```

Don't use `{}` to mean "empty object." For "any object" use `object`; for "any value" use `unknown` (Lesson 12).

:::quiz
Recall Lesson 01. Structural typing matches a value to `interface Point` by *shape*. So at runtime, can you write `if (x instanceof Point)` to check that shape?
:::answer
**No.** `interface Point` is erased — there's no `Point` constructor at runtime, so `instanceof` has nothing to test against. Structural matching is entirely a *compile-time* judgment about shape. To check a shape at runtime you write a manual guard (`typeof x === "object" && x !== null && "x" in x`) — covered in Lesson 08.
:::

## Recap

- TS compares **shapes, not names** — duck typing, enforced at compile time.
- Assignable = "has at least the required members"; extra members are fine.
- **Exception:** fresh inline object literals get excess-property checks (typo guard).
- Python's `Protocol` is the direct analog — but it's opt-in there, default here.
- `{}` means "almost anything," not "empty object."

:::quiz
Does this compile? Why or why not?

```typescript
interface Logger { log: (msg: string) => void }

function attach(l: Logger) {}

attach(console); // ?
```
:::answer
**Yes, it compiles.** `console` is never declared to be a `Logger`, but it *has* a `log(msg: string): void` method (plus many others). Structural typing only requires "has at least the members of `Logger`," and the extra methods on `console` don't matter. This is exactly why you can pass `console` to anything expecting a logger-shaped object without adapters.
:::

Run it to confirm the global `console` slots straight in:

:::play
```typescript
interface Logger { log: (msg: string) => void }

function attach(l: Logger) { l.log("attached"); }

attach(console); // console satisfies Logger by shape alone
```
:::

Structural typing answers "does this value *fit* a shape." It leaves a different question open: when you give a shape a *name*, does the name itself ever matter — and are there two ways to write that name that behave differently? Lesson 04 takes the two TS tools for naming a shape, `interface` and `type`, and finds where they diverge.
