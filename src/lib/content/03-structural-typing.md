---
title: Structural typing
subtitle: Shape compatibility, decided at compile time, regardless of names
---

## From inference to compatibility

Lesson 02 was about what the compiler knows about a single value: `const greeting = "hi"` infers the literal type `"hi"`, `let greeting = "hi"` widens to `string`, because the binding tells it whether the value can change. That was one value in isolation. The moment you pass that value somewhere — assign it to a typed variable, hand it to a function — a second question arises: given what the compiler knows about the value and what the destination requires, is the value *assignable* to the destination? TypeScript answers it in a way that will reliably trip a Python instinct on the first try. This lesson is how it decides, and why it decides that way.

## Predict the error

Here is the case that surprises everyone arriving from a statically typed background. A function asks for one named type; you hand it a differently named value with the same fields.

:::predict
Both declarations below describe the same fields. `show` wants a `Point`. The object passed to it was never declared a `Point` — it never mentions the name at all. Under strict, does this type-check?

```typescript
interface Point { x: number; y: number }
function show(p: Point): void {}

const c = { x: 1, y: 2 };
show(c);
```

- ( ) Error — `c` was never declared to be a `Point`, so its type is incompatible.
- ( ) Error — only an object literal written inline at the call site would be accepted.
- (x) Fine — `c` has the members `Point` requires, so it is a `Point` as far as the compiler cares.
- ( ) Fine, but only because both types use `number`; with classes involved it would error.
:::answer
Fine. No error. `c` was inferred as `{ x: number; y: number }` and never told it was a `Point`, and that is irrelevant. It *has the shape* `Point` describes, so it *is* acceptable as a `Point`. An error here is the [[nominal|nominal-vs-structural]] instinct firing — the rule [[mypy]] follows, where a name has to match. TypeScript does not look at the name at all.
:::

The property the compiler is checking has a name: TypeScript is [[structurally typed|structural-typing]]. A value is assignable to a type when its *shape* — its members and their types — satisfies what the type requires. Where the shape came from, what it was declared as, whether it inherits from anything: none of it enters the decision.

## Why structural, and not nominal

This is not an arbitrary preference; it falls out of what TypeScript is built on top of. Lesson 01 established that types are [[erased|type-erasure]] and the runtime is plain JavaScript. A JavaScript object is an unordered bag of properties with no durable notion of "which type produced me." `{ x: 1, y: 2 }` written as a literal and an instance of some `Point` class are, to the engine, the same thing: an object with an `x` and a `y`. There is no [[nominal|nominal-vs-structural]] tag to check, because the runtime never carried one and the type layer was [[erased|type-erasure]] before the code ran. A type system layered onto that substrate has two honest choices: invent a [[nominal|nominal-vs-structural]] identity the runtime does not have and police it purely at compile time, or describe values by the only thing actually real about them — their shape. TypeScript chose shape, by construction rather than taste.

You already know the runtime half of this from Python: [[duck typing|structural-typing]]. If it has `.read()`, it is file-enough. [[Structural typing|structural-typing]] is that idea promoted to a *compile-time* discipline — the duck test run by the checker before execution, instead of by the interpreter at the call. The twist is that Python applies the two halves inconsistently: its runtime is [[duck-typed|structural-typing]], but its *type hints* are mostly [[nominal|nominal-vs-structural]] — a `Dog` is only a `Dog` to [[mypy]], even if some other class has every method `Dog` has. Here is that split directly.

:::compare
```python
# mypy: hints are nominal. This is an error.
class Point:
    def __init__(self, x: int, y: int) -> None:
        self.x, self.y = x, y

def show(p: Point) -> None: ...

class Coord:  # identical shape, unrelated name
    def __init__(self, x: int, y: int) -> None:
        self.x, self.y = x, y

show(Coord(1, 2))  # error: Coord is not Point
```
```typescript
// TypeScript: types are structural. This is fine.
interface Point { x: number; y: number }

function show(p: Point): void {}

const c = { x: 1, y: 2 };
show(c); // ok — c has the shape Point requires
```
:::

The Python call runs fine at runtime — `Coord(1, 2)` has `.x` and `.y`, so `show` works. [[mypy]] rejects it anyway, because the *hint* layer is [[nominal|nominal-vs-structural]] even though the *runtime* is not. That mismatch between Python's [[nominal|nominal-vs-structural]] hints and its [[duck-typed|structural-typing]] execution is exactly the gap TypeScript closes by making its type layer [[structural|structural-typing]] too.

## "Has at least": the direction of compatibility

The rule the prediction exposed generalizes to a single principle: a value is assignable to type `T` when it has *at least* every member `T` requires, each at a compatible type. Extra members are fine — `T` cannot see them. Assignability therefore flows from the wider shape to the narrower requirement, never the reverse.

:::play
```typescript
interface Named { name: string }

const user = { name: "Ada", age: 36, admin: true };
const n: Named = user; // ok — user has name, plus extras Named ignores
```
:::

Try the opposite direction in that playground: delete `name` from `user`, and the assignment to `n` breaks, because the value no longer has at least what `Named` requires. The error reads `Property 'name' is missing in type '{ age: number; admin: boolean }' but required in type 'Named'`. The asymmetry is the whole point. A requirement of "has a `name`" is satisfied by anything carrying a `name` and more; it is not satisfied by something carrying less.

```
  requires: Named              candidate value
  ┌──────────────┐             ┌────────────────────────┐
  │ name: string │  ◀── ok ──  │ name, age, admin        │   extra members → still assignable
  └──────────────┘             └────────────────────────┘

  ┌──────────────┐             ┌────────────────────────┐
  │ name: string │  ── no ──▶  │ { }  (no name)          │   missing a required member → not assignable
  └──────────────┘             └────────────────────────┘
```

This is precisely the contract `typing.Protocol` expresses in Python: a `Protocol` lists the members a value must have, and anything providing those (and more) satisfies it, with no inheritance. The difference is where the default sits. In Python, [[structural|structural-typing]] matching is opt-in — you write `class HasName(Protocol)` deliberately, and ordinary classes stay [[nominal|nominal-vs-structural]]. In TypeScript it is the only mode there is; every type comparison, including comparisons between classes (Lesson 10), is [[structural|structural-typing]].

:::compare
```python
from typing import Protocol

class HasName(Protocol):
    name: str

def greet(x: HasName) -> None: ...

class Cat:           # does not inherit HasName
    name = "Tom"

greet(Cat())         # ok — structural, because HasName is a Protocol
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

The analogy is close but not exact, and the gaps are worth knowing. Python's `Protocol` is checked only by the static checker by default; to test it with `isinstance` at runtime you must decorate it `@runtime_checkable`, and even then the check only confirms the attributes *exist*, not their types. A TypeScript interface has no runtime presence at all — you cannot `instanceof` it under any circumstances (more below). And Python `Protocol` membership is still somewhat [[structural|structural-typing]]-by-declaration: the protocol is a named thing you reference. In TypeScript there is no act of opting in; a bare object literal participates in [[structural|structural-typing]] matching without any type ever being named.

## The one exception: excess property checks on fresh literals

The "has at least" rule has one deliberate hole, and it looks like a contradiction until you see what it is for.

:::predict
Given `interface Opts { width: number }` and the rule just stated — extra members are fine — which of these compile under strict?

```typescript
const a: Opts = { width: 10, height: 20 };  // (A) literal assigned directly
const tmp = { width: 10, height: 20 };
const b: Opts = tmp;                          // (B) same object, via a variable
```

- ( ) Both compile — "has at least" permits the extra `height` in both.
- ( ) Neither compiles — `height` is not a member of `Opts`.
- (x) Only (B) compiles; (A) is an error.
- ( ) Only (A) compiles; (B) is an error.
:::answer
Only (B). (A) errors with `'height' does not exist in type 'Opts'`. (B) follows the general "has at least" rule. (A) hits an *excess property check*: when an object literal is assigned directly to a typed target, the compiler additionally rejects members the target does not declare. The object in (B) is identical, but it has passed through a variable first, so the check does not apply and the permissive rule takes over.
:::

The reason for the carve-out is concrete. The "has at least" rule makes one common mistake invisible — a typo'd or stale property in an object you are constructing right at the point of use. Write `{ widht: 10 }` for an `Opts` and the pure rule reads it as "an object with no `width` and an extra `widht`," which fails for the wrong reason, or — if `width` were optional — silently passes. So the compiler tracks *freshness*: an object literal is "fresh" at the moment it is written, and assigning a fresh literal directly to a typed slot triggers the extra check that flags unknown members. Store the literal in a variable and its type is now just `{ width: number; height: number }`; the freshness is gone, the object is an ordinary value, and only "has at least" applies. Excess property checking is a typo guard bolted onto literals, not a change to what assignability means. When you genuinely want extra fields on a literal, that is what an index signature is for, but the everyday read is simpler: inline literals are held to exactly their target's fields; everything else is "has at least."

## What this buys you, and one place it bites

[[Structural typing|structural-typing]] is not a curiosity; it changes how you wire code together.

You can satisfy a library's interface without importing it or inheriting from anything — produce a value of the right shape and it fits. The global `console` is the canonical demonstration.

:::play
```typescript
interface Logger { log: (msg: string) => void }

function attach(l: Logger): void { l.log("attached"); }

attach(console); // console was never declared a Logger; it has log(...), so it fits
```
:::

`console` is defined nowhere near your `Logger` and carries dozens of other methods. None of that matters: it has a `log` that accepts a string, so it is assignable, and you wire the standard logger into your own abstraction with no adapter. The same property makes refactoring shape-driven — rename a class and [[structurally|structural-typing]]-compatible call sites keep working, because nothing was keyed on the name.

The cost is the mirror image: two unrelated types with the same shape are mutually interchangeable, including when you wanted them kept apart. A `Meters` and a `Seconds` both modeled as `{ value: number }` are freely assignable to each other, and the compiler will not stop you from passing a duration where a distance is wanted, because by shape they are the same type.

:::compare
```python
# NewType gives a nominal-ish distinction mypy enforces.
from typing import NewType

Meters = NewType("Meters", float)
Seconds = NewType("Seconds", float)

def walk(d: Meters) -> None: ...

walk(Seconds(10.0))  # mypy: error — Seconds is not Meters
```
```typescript
// Same shape ⇒ same type. The compiler sees no difference.
interface Meters { value: number }
interface Seconds { value: number }

function walk(d: Meters): void {}

const t: Seconds = { value: 10 };
walk(t); // ok — structurally identical, so freely assignable
```
:::

Recovering a distinction the structure does not provide is the job of [[branding|branded-types]] — attaching a synthetic, never-constructed property that gives two otherwise-identical shapes different members, so they stop matching. It is the [[structural|structural-typing]]-world equivalent of `NewType`, and gets its own treatment in Lesson 11. The trade to recognize for now: [[structural typing|structural-typing]] hands you frictionless compatibility, and the price is that meaning carried by a *name* rather than a *shape* is invisible to the compiler until you encode it into the shape.

## Why `{}` is not the empty object it reads as

Push "has at least" to its limit. If a type requires a set of members, and the required set is empty, then *everything that has at least nothing* satisfies it — which is nearly every value there is.

:::quiz
Given `type Anything = {}`, which of these compile under strict?

```typescript
const x: Anything = 42;
const y: Anything = "hi";
const z: Anything = null;
```
:::answer
`x` and `y` compile; `z` does not. `{}` requires "has at least no members," so every value that has properties at all — including `42` and `"hi"`, since primitives have methods and so satisfy a memberless requirement — qualifies. The only values rejected are `null` and `undefined`, which have no members to speak of. So `{}` means "anything except null/undefined," not "an empty object." The natural Python read — an empty-dict-shaped thing — is exactly inverted.
:::

This is the rule's logical endpoint, not a special case: a smaller requirement accepts more values, and a requirement of nothing accepts almost all of them. The practical consequence is that `{}` is almost never the type you want. For "any non-primitive object" use `object`; for "any value at all, checked before use" use `unknown` (Lesson 12). Reserve `{}` for the rare case where you truly mean "defined and non-null, shape otherwise unconstrained."

## Structural matching is a compile-time judgment

One more consequence ties this lesson back to the first. The assignability decision — does this value have the shape this type requires — happens entirely at compile time. It leaves nothing behind.

:::quiz
[[Structural typing|structural-typing]] matched `c` to `interface Point` by shape. So at runtime, can you write `if (x instanceof Point)` to test for that shape?
:::answer
No. `interface Point` is [[erased|type-erasure]]; there is no `Point` value at runtime for `instanceof` to test against, and `tsc` rejects the line outright (`'Point' only refers to a type, but is being used as a value here`). The shape match was a compile-time judgment and left no runtime artifact. To check a shape while the program runs you write the test by hand against real values — `typeof x === "object" && x !== null && "x" in x` — which is the subject of type guards in Lesson 08.
:::

[[Structural|structural-typing]] assignability and runtime type tests live on opposite sides of the [[erasure|type-erasure]] line from Lesson 01. The compiler decides assignability by comparing shapes it sees in the source; the running program has only JavaScript values and JavaScript's own operators (`typeof`, `instanceof` on real constructors) to inspect them. Conflating the two — expecting an interface to be checkable at runtime, or `typeof` to know about your types — is the single most common source of "why won't this work" once [[structural typing|structural-typing]] itself has clicked.

## Recap

- TypeScript compares **shapes, not names** — the duck test, enforced by the compiler at compile time.
- It is [[structural|structural-typing]] by construction: [[erased|type-erasure]] types over anonymous JavaScript objects leave shape as the only real thing to compare.
- Assignable means **"has at least the required members"**; extra members are invisible to the requirement, so assignability flows wide-to-narrow.
- The **one exception** is the excess-property check on *fresh* object literals — a typo guard that disappears the moment the literal passes through a variable.
- Python's `Protocol` is the direct analog, but it is opt-in there and the only mode here; `NewType`'s [[nominal|nominal-vs-structural]] distinction maps to [[branding|branded-types]] (Lesson 11).
- `{}` means "anything non-null," not "empty object." Reach for `object` or `unknown` instead.
- The match is decided at compile time and [[erased|type-erasure]] — there is no interface to `instanceof` at runtime.

[[Structural typing|structural-typing]] answers whether a value *fits* a shape. It says nothing about how you *name* a shape — and TypeScript gives you two tools for that, `interface` and `type`, which describe the same [[structural|structural-typing]] notion but diverge in capability and in subtle behaviors like [[declaration merging|declaration-merging]]. Lesson 04 takes both and finds exactly where they stop being interchangeable.
