---
title: interface vs type
subtitle: Two ways to name a shape, where they're interchangeable, and the one job only type can do
---

## Where we pick up

We've named the app's data with `interface Task`. But there's a second keyword that also names types — `type` — and you'll see both constantly in real code, often in the same file, sometimes for the same job. A Python developer reaching for the closest analogue finds two: a `class` / `TypedDict` (which feels like `interface`) and a type alias like `Vector = list[float]` (which feels like `type`). TypeScript splits these jobs the same way, and the split mostly doesn't matter — until it does. This episode draws the line precisely, and along the way gives the app a small but real upgrade: a named `TaskId` type, and the union that `status` actually needs.

## The 90% case: they're interchangeable

For naming an object shape, `interface` and `type` are very nearly the same thing. Here is `Task` written both ways:

:::compare
```python
# Python's two flavours of "named shape"
from typing import TypedDict

class TaskDict(TypedDict):   # structural, dict-shaped
    id: int
    title: str

Vector = list[float]          # a type alias — just a new name for an existing type
```
```typescript
interface Task {
  id: number;
  title: string;
}

type TaskAlias = {
  id: number;
  title: string;
};
```
:::

`interface Task { ... }` and `type TaskAlias = { ... }` describe the identical structure, and for the everyday purpose of "give this object shape a name," they behave the same: both are [[structural|structural-typing]], both check the same way, both can be implemented by a class, both can be extended. If you only ever name object shapes, you could use one keyword for your whole career and never notice a difference. The default lots of teams pick — and a reasonable one — is "`interface` for object shapes, `type` for everything else." But "everything else" is where the real distinction lives, so let's see what only `type` can do.

## What only `type` can do: alias anything, and unions

An `interface` can only describe an *object shape* — a thing with fields. A `type` alias can give a name to *any* type at all: a primitive, a union, a tuple, a function type, an intersection. This is the first hard difference, and it's why `type` exists alongside `interface`.

Give the app a `TaskId`. Right now an id is just a `number`, and `number` works — but `number` is also the type of a quantity, a page count, a timestamp. Naming the concept makes signatures read better and gives us one place to change it later if ids ever become strings:

```typescript
type TaskId = number;

interface Task {
  id: TaskId;
  title: string;
  status: "todo" | "doing" | "done";
}
```

You cannot write `interface TaskId extends number` or anything like it — an interface can't be a name for `number`, because `number` isn't an object shape. Only a `type` alias can name a primitive. (This `TaskId` is just an alias today, so it's freely interchangeable with `number`; episode 12 mentions [[branded types]], the trick that makes a `TaskId` the compiler *won't* let you mix up with a plain `number`. For now it's a readability alias.)

The bigger one is the union. The app's `status` field is the type `"todo" | "doing" | "done"` — a [[union|narrowing]] of three string literal types, the direct compile-time descendant of the `validateStatus` checker we hand-wrote in episode 2. We've been inlining it. Let's name it, and here the choice of keyword is *forced*:

:::play
```typescript
type Status = "todo" | "doing" | "done"; // a union — only `type` can name this

type TaskId = number;

interface Task {
  id: TaskId;
  title: string;
  status: Status;
}

const t: Task = { id: 1, title: "name the status", status: "doing" };
console.log(`#${t.id} [${t.status}] ${t.title}`);
// const bad: Task = { id: 2, title: "x", status: "later" }; // try it: "later" not in Status
```
:::

`type Status = "todo" | "doing" | "done"` works; `interface Status = ...` is a syntax error, because a union is not an object shape and `interface` only names object shapes. **Unions need `type`.** This is the rule worth memorizing from this episode, because the moment your data has a field that's "one of a fixed set of values" — and status fields, role fields, kind fields, mode fields are everywhere — you reach for a union, and a named union has to be a `type`. We'll build the entire next episode on this `Status` union: narrowing it, switching on it exhaustively, and connecting it back to `validateStatus`.

:::predict
Which of these four declarations compile?

```typescript
type A = "todo" | "doing" | "done";
interface B = "todo" | "doing" | "done";
type C = number;
interface D { id: number }
```

- ( ) All four — `type` and `interface` are pure synonyms.
- (x) `A`, `C`, and `D` compile; `B` is a syntax error.
- ( ) Only `D` — `interface` is the only real type declaration; `type` is documentation.
- ( ) `A` and `B` compile; `C` and `D` are the errors.
:::answer
`A`, `C`, and `D` compile; `B` is a syntax error. `type A = <union>` and `type C = number` are fine — a `type` alias can name a union or a primitive. `interface D { id: number }` is a normal object-shape interface. But `interface B = "todo" | ...` is malformed on two counts: `interface` doesn't use `=`, and more fundamentally an interface can only declare an *object shape*, never a union or a bare literal. This is the operative distinction: `interface` is object-shapes-only; `type` aliases anything. When a field is "one of a fixed set," you need a union, so you need `type`.
:::

## What only `interface` can do: declaration merging

The difference runs both directions. There is one capability `interface` has that `type` does not: **[[declaration merging]]**. If you declare the same interface name twice, TypeScript merges the two declarations into one combined interface. Declare a `type` alias twice and you get an error — *Duplicate identifier* — because an alias is a single, fixed definition.

```typescript
interface Window {
  myAppVersion: string; // merges INTO the built-in Window interface
}
// now window.myAppVersion is typed everywhere

type T = { a: number };
// type T = { b: number }; // error: Duplicate identifier 'T'
```

You will almost never reach for this in your own application types — it's mildly surprising that two same-named interfaces silently combine rather than conflict. Its real use is augmenting types you don't own: adding a field to the global `Window`, or extending a library's types from your own code. It's the reason library type definitions favour `interface` for anything they expect consumers to extend. For your app's own `Task` and `Status`, you don't want or need merging, which is one more reason the "interface for shapes, type for unions and aliases" convention works cleanly.

## So which do you use?

The honest answer is that for object shapes it rarely matters, and consistency matters more than the choice. A workable rule, and the one this course follows:

- **`interface`** for object shapes that describe your data — `Task` is an interface.
- **`type`** for everything that isn't a plain object shape — unions (`Status`), primitive aliases (`TaskId`), tuples, function types, and the computed types in episode 11.

Two practical footnotes. First, error messages: with an `interface`, the compiler usually reports the *name* (`Task`) in errors; with a complex `type` it sometimes expands the whole structure inline, which is noisier — a small reason to prefer `interface` for your central data types. Second, both extend: an interface uses `extends`, and a `type` composes with `&` (intersection), which we'll use when we want "a `Task` plus extra fields" without redefining the whole shape.

:::compare
```python
# Python: a dataclass/TypedDict for the shape, an alias for the union-ish concept
from typing import Literal, TypedDict

Status = Literal["todo", "doing", "done"]   # alias for a constrained set

class Task(TypedDict):
    id: int
    title: str
    status: Status
```
```typescript
type Status = "todo" | "doing" | "done";    // type: the union

interface Task {                              // interface: the object shape
  id: TaskId;
  title: string;
  status: Status;
}
```
:::

The mapping is almost one-to-one. Python's `Literal["todo", ...]` is our `type Status` union — both name a closed set of allowed values, both the compile-time form of `validateStatus`. Python's `TypedDict` / `dataclass` is our `interface Task` — both name an object shape structurally. TypeScript just makes the keyword choice explicit where Python's is a matter of which import you reach for.

:::quiz
We named `type Status = "todo" | "doing" | "done"`. In episode 2 we hand-wrote `validateStatus(s)` returning `s === "todo" || s === "doing" || s === "done"`. State the precise correspondence — and the one thing the type does that the function cannot, and vice versa.
:::answer
They encode the same set — the three allowed status words — but at different times and over different things. `validateStatus` is a runtime function: it takes an actual value that exists while the program runs and returns a boolean verdict. `type Status` is a compile-time declaration: it constrains which values may ever flow into a `Status`-typed position, checked by `tsc` before the program runs, then [[erased|type-erasure]]. What the *type* does that the function can't: it's enforced everywhere a `Status` is used — assignment, parameters, return types — across all code paths, for free, with no runtime cost, and it catches `status: "later"` as you type it. What the *function* does that the type can't: it can check a value whose origin the compiler never saw — a string parsed from JSON, read from a form — at the program's boundary, where types are erased and `tsc` was never present. This is the recurring split: `Status` polices your code, `validateStatus` polices the outside world. Episode 6 takes the `Status` union and shows the compiler tracking it through branches — the part that makes a named union genuinely powerful.
:::

## Recap

- `interface` and `type` overlap heavily for naming **object shapes** — same structural checking, both extendable, both implementable. For that job the choice is mostly stylistic; consistency beats the coin-flip.
- Only **`type`** can name a non-object: a primitive alias (`type TaskId = number`), and crucially a **union** (`type Status = "todo" | "doing" | "done"`). `interface` describes object shapes only. **Unions need `type`.**
- Only **`interface`** supports [[declaration merging]] — same-name interfaces combine — which is for augmenting types you don't own (e.g. the global `Window`), not your own app types.
- Course convention: `interface` for data shapes (`Task`), `type` for unions, aliases, and computed types.
- `type Status` is the compile-time twin of `validateStatus`: same allowed set, enforced across the code at compile time and erased at runtime.

Next episode: we put the `Status` union to work. The compiler can follow a union through your control flow — inside `if (task.status === "done")` it *knows* the status is `"done"` — and an exhaustive `switch` plus the `never` type lets it tell you, at compile time, when you've forgotten to handle a case. That's the payoff `validateStatus` could only dream of.
