---
title: interface vs type
subtitle: Two ways to name a shape, and the few seams where they diverge
---

## One shape, two names

Lesson 03 left a question open: [[structural typing|structural-typing]] decides whether a value *fits* a shape, but when you give a shape a name, does the name itself matter — and are there two ways to write that name that behave differently? TypeScript has exactly two naming tools, `interface` and `type`, and the answer is "rarely, but precisely." For the overwhelmingly common case — naming a plain object shape — they are interchangeable, and which you pick changes nothing about how your code type-checks. The interest is in the handful of places they stop being interchangeable, because each of those seams exists for a concrete reason in the compiler.

Coming from Python this looks like a simplification, and it is. Python hands you a drawer of shape tools that overlap in confusing ways: `TypedDict` for dict-shaped data, `dataclass` and `NamedTuple` for instances, [[Protocol|typing-protocol]] for [[structural|structural-typing]] matching, and `TypeAlias` for naming an arbitrary type. They differ partly in intent and partly in what they produce at runtime. TypeScript splits the naming job along a single axis instead, and it is worth stating that axis up front because every later difference follows from it: `type` names *any* type; `interface` names only an *object or function shape*.

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
// — or, identically for this shape —
type User = {
  name: string;
  age: number;
};
```
:::

Both forms produce a type that any value with a `name: string` and `age: number` satisfies — the [[structural|structural-typing]] rule from Lesson 03, unchanged by the choice. The Python `TypedDict` is the closest single analog to either: a compile-time description of a dict's keys with no runtime class behind it. The seams are where the two TS forms diverge, so the rest of the lesson walks them one at a time.

## The capability gap: `type` names anything

`type` is a general alias. The name on the left binds to whatever type expression is on the right, and the right side can be any type at all:

```typescript
type ID = string | number;          // a union
type Pair = [number, number];       // a tuple
type Handler = (e: Event) => void;   // a function type
type Nullable<T> = T | null;         // an alias over a generic
type UserKeys = keyof User;          // a computed type (Lesson 11)
```

`interface` cannot express any of those. It describes members of an object (or the call signature of a function), and that is the whole of what it can do. A union is not a set of members, so there is nowhere in an `interface` body to put one.

:::predict
You want to name "a value that is either a `string` or a `number`." One of these is a syntax error.

```typescript
interface ID = string | number;   // (A)
type ID = string | number;        // (B)
```

Which line does the compiler reject, and what is the underlying reason?

- ( ) (B) — `type` cannot alias a built-in primitive like `string`.
- ( ) Neither — both are legal ways to name a union.
- (x) (A) — `interface` names object/function shapes only; a union is not a shape, and `interface` has no `=` form.
- ( ) (A) — but only because of the `=`; `interface ID { string | number }` would work.
:::answer
(A). Two things are wrong with it, and the deeper one is the point. The surface bug is the `=`: an `interface` never uses assignment syntax — its body is a brace block of members. The structural reason is that even with correct syntax there is no way to put a union *inside* an interface, because an interface is a list of members and a union is not a member. Unions, tuples, bare primitive aliases, and anything computed (`keyof`, [[mapped|mapped-types]], [[conditional types|conditional-types]]) must be `type`. This single gap drives most "which do I use" decisions: if the thing you are naming is not an object or function shape, the choice is made for you.
:::

The gap shows up in a sharper form with self-reference. A `type` alias can be recursive *through* a member — `type Tree = { value: number; children: Tree[] }` type-checks, because by the time the compiler resolves `children` it already has a name to point at. But a `type` alias cannot alias *itself directly*: `type Bad = Bad` is a circular-reference error (TS2456). An `interface` never hits this because it has no right-hand side to be circular — it is always a member list, and recursion through a member is the only form available. The two tools converge on recursive *shapes* and diverge only on the degenerate direct-alias case, which you would never write on purpose.

## What only `interface` does: declaration merging

Now the other direction. Declare the same `interface` name twice and the declarations [[merge|declaration-merging]] into one; declare the same `type` name twice and you get a duplicate-identifier error (TS2300). This is the one capability with no `type` equivalent at all.

:::play
```typescript
interface Box { width: number }
interface Box { height: number }
// Box is now { width: number; height: number } — both declarations folded into one

const b: Box = { width: 10, height: 20 }; // both fields now required
console.log(b);

// Contrast — uncomment to see type reject a second declaration:
// type T = { a: number };
// type T = { b: number }; // error TS2300: Duplicate identifier 'T'
```
:::

The closest Python reflex is monkey-patching — reopening a class to staple on `SomeClass.extra = ...`. The analogy is useful but breaks in an important way, and the break is the reason the feature exists. Monkey-patching mutates a real object at runtime; [[declaration merging|declaration-merging]] is purely compile-time, like everything in this layer (Lesson 01: it is all [[erased|type-erasure]]). It changes what the type system believes about a name; it produces no code and touches no runtime object.

That distinction explains what [[merging|declaration-merging]] is actually *for*. You almost never want to split your own interface across two declarations — that is the occasional footgun, where two declarations in the same scope accidentally pick the same name and the compiler silently folds their members together. ([[Merging|declaration-merging]] is scoped: two interfaces only [[merge|declaration-merging]] when they share a declaration space — both global, or both in the same module or namespace — so same-named interfaces in two separate ES modules stay independent.) The intended use is augmenting a type you do not own. The canonical case is widening a global like `Window` via `declare global`, or adding a field to a third-party library's exports via `declare module`:

```typescript
// Tell the compiler the global Window has a field your app attaches at startup.
declare global {
  interface Window {
    __APP_VERSION__: string;
  }
}
window.__APP_VERSION__; // now typed as string, no cast needed
export {}; // makes this file a module so `declare global` is legal
```

Python has no static equivalent because it does not need one: you would just read or set the attribute and let the runtime sort it out. Here there is no runtime to fall back on, so the only way to teach the checker about an externally-added member is to [[merge|declaration-merging]] a declaration into the existing interface. A [[merge|declaration-merging]] with a *conflicting* member type is rejected at the [[merge|declaration-merging]] site (TS2717: "Subsequent property declarations must have the same type"), so you can widen a type this way but not lie about an existing field.

## What `interface` does more cleanly: `extends`

Both tools express "this shape, plus more." `interface` uses `extends`; `type` uses intersection, `&`.

:::compare
```python
class Animal(TypedDict):
    name: str

class Dog(Animal):       # subclassing extends the shape
    breed: str
```
```typescript
interface Animal { name: string }
interface Dog extends Animal {
  breed: string;
}
// — the type-alias route to the same result —
// type Dog = Animal & { breed: string };
```
:::

The results are equivalent here, but the two routes are not the same operation, and knowing the difference is what lets you reach for the right one. `extends` records a *relationship*: the compiler remembers that `Dog` is `Animal` plus some members, keeps `Dog` as a named, cached entity, and checks assignments against that named shape. `&` *computes* a new merged shape eagerly and gives it your alias as a label. Three consequences follow, all of them practical:

- **Error messages.** When a value fails to match, an `interface` is reported by its name — "Property 'last' is missing in type ... but required in type `PName`" (TS2741). An intersection of several object literals often expands into the full merged shape in the message, which is noisier to read on a large type.
- **Compiler caching.** Because an interface is a stable named declaration, the checker caches its resolved members and reuses them across the program. An intersection may be re-evaluated, which on large types and deep hierarchies is measurably slower — this is the basis for the TypeScript team's own guidance to prefer `interface` for object shapes in big codebases.
- **Conflict handling.** `interface Dog extends Animal` errors if `Dog` redeclares a member of `Animal` with an incompatible type. `Animal & { name: number }` does not error at the declaration; instead the conflicting member silently resolves to `never` (the intersection of `string` and `number` is empty), and you only discover it later when nothing is assignable to that field. The `extends` route fails where the mistake is; the `&` route defers the failure.

One thing `extends` does *not* require is that the thing it extends be an `interface`. An interface can extend a `type` alias, as long as that alias resolves to an object shape:

```typescript
type Base = { name: string };
interface Sub extends Base { age: number } // fine — Base resolves to an object
const s: Sub = { name: "a", age: 1 };
```

What it rejects is extending something that is *not* a statically known object — a union, for instance: `interface BadSub extends SomeUnion` fails with TS2312 ("An interface can only extend an object type or intersection of object types with statically known members"). The boundary is not interface-vs-type; it is object-shape-vs-not, which is the same axis from the start of the lesson.

## A seam that surprises people: index signatures

There is one assignability difference that is easy to hit and hard to explain without the [[merging|declaration-merging]] story above. An object typed with a `type` alias is assignable to a `Record<string, number>`; the *same* object typed with an equivalent `interface` is not.

:::play
```typescript
type ViaType = { x: number };
interface ViaInterface { x: number }

function takesRecord(r: Record<string, number>) {
  return Object.values(r);
}

const a: ViaType = { x: 1 };
const b: ViaInterface = { x: 1 };

takesRecord(a); // ok
takesRecord(b); // error TS2345: Index signature for type 'string' is missing in type 'ViaInterface'
```
:::

`Record<string, number>` means "an object whose keys are all strings mapping to numbers" — an implicit index signature. A `type` alias is closed: once written, its set of members is fixed, so the compiler can prove every property is a `number` and treat it as having that index signature. An `interface` is *open* — [[declaration merging|declaration-merging]] means another declaration could add a member later, and the compiler cannot assume the member it has not seen is a `number`. So it refuses to infer the implicit index signature. The seam is a direct, if distant, consequence of the [[merging|declaration-merging]] capability: the openness that makes [[merging|declaration-merging]] possible is exactly what blocks this assignment. The fix when you need it is to give the interface an explicit index signature (`interface ViaInterface { x: number; [k: string]: number }`) or use a `type`.

## A decision rule

The diverging seams reduce to a short rule, and a shorter heuristic on top of it.

| You are naming… | Use | Because |
|---|---|---|
| A plain object shape, especially a public API meant to be extended | `interface` | cached, named, clearer errors; open to augmentation |
| A union (`A \| B`) | `type` | `interface` cannot express a union at all |
| A tuple, function-type alias, or bare primitive alias | `type` | not an object shape |
| Anything computed (`keyof`, [[mapped|mapped-types]], [[conditional|conditional-types]]) | `type` | `interface` has no computed form |
| A shape you must augment from outside (a global, a library type) | `interface` | only `interface` [[merges|declaration-merging]] |

The heuristic most teams settle on collapses that to one line: `interface` for object shapes, `type` for everything else. It lands on the right tool the large majority of the time and saves the decision for the cases that actually differ. The one rule worth holding firmly is consistency within a file — mixing the two for identical object shapes in the same module reads as indecision, not nuance.

## Both are erased

A reminder that closes the loop with Lesson 01: neither `interface User` nor `type User` exists at runtime. Both compile to nothing — no constructor, no prototype, no value to inspect. You cannot `new` them, and `x instanceof User` is a compile error because there is no `User` to test against, the same point from Lesson 03's [[structural|structural-typing]]-matching quiz. If you need a shape to survive into running code — to validate an incoming request body, or to produce real instances — you need a `class` (Lesson 10) for instances or a runtime schema library like [[Zod|zod]] for validation at the program's edges (the unchecked-data boundary from Lesson 01). The choice between `interface` and `type` lives entirely at compile time and changes nothing about what runs.

:::quiz
You define `type Point = { x: number; y: number }` and a function `f(p: Point)`. Must a caller's value be *declared* as `Point` to pass it?
:::answer
No — matching is [[structural|structural-typing]] (Lesson 03), and that is independent of whether you wrote `type` or `interface`. Any value with at least `{ x: number; y: number }` is assignable to `Point` regardless of its declared name or origin. The `interface`-vs-`type` choice changes which *features* are available when you name a shape — unions, [[merging|declaration-merging]], the `extends`/`&` distinction — never the [[structural|structural-typing]] rule that decides assignability.
:::

## Recap

- The axis: `type` names any type; `interface` names only an object or function shape. Unions, tuples, primitive aliases, and computed types must be `type`.
- Only `interface` supports [[declaration merging|declaration-merging]] — the sanctioned, compile-time way to augment a type you do not own (a global, a library interface). `type` duplicates are an error.
- `extends` records a named relationship (cached, clearer errors, conflicts caught at the declaration); `&` eagerly computes a merged shape and defers conflicts to `never`.
- An interface can `extends` a `type` alias as long as it resolves to an object shape; the boundary is object-vs-not, not interface-vs-type.
- A `type`-aliased object is assignable to `Record<string, ...>`; the equivalent `interface` is not, because [[merging|declaration-merging]] keeps interfaces open.
- Both are [[erased|type-erasure]]. Neither is a `class`; the choice is purely compile-time.

:::quiz
For each, which must you use — `interface`, `type`, or either?

1. `Status` = `"open" | "closed" | "pending"`
2. `Point` = an object `{ x: number; y: number }` you will `extends` later
3. `Middleware` = `(req: Req, res: Res) => void`
:::answer
1. **`type`** — it is a union of string literals; `interface` cannot express `|`.
2. **Either** works, but **`interface`** is the better pick for an extensible object API (named relationship, cleaner errors).
3. **`type`** — a standalone function-type alias. You *can* express a callable with `interface Middleware { (req: Req, res: Res): void }`, and you would only do so if it also needs named properties (a callable object); for a bare function type the `type` alias is idiomatic.
:::

Every shape so far names *one* thing. The more common modeling job is naming a value that is *one of several* shapes — and the `|` the interface choked on is the whole subject of Lesson 05. That lesson also takes the `&` you just saw `extends` stand in for and shows where it behaves the opposite of how the symbol reads, then builds the pattern Python has no clean equivalent for: a discriminated union the compiler can check exhaustively.
