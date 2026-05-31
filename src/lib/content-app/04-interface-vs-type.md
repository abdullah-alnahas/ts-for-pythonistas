---
title: interface vs type
subtitle: Two ways to name a shape, the alias unions need, and how to choose without overthinking it
---

## Where we pick up

The app has `interface Task { id; title; done }` and an `addTask` that takes a task-shaped object. We've been writing `id: number`, but an id isn't really an arbitrary number — it's an identifier, and the day someone passes an array index where a task id belongs, `number` won't save us because they're the same type. So this episode introduces a second way to name things, the `type` alias, and uses it to give the id a name of its own:

```typescript
type TaskId = number;

interface Task {
  id: TaskId;
  title: string;
  done: boolean;
}
```

That raises the obvious question for anyone who's seen both keywords: TypeScript has `interface` *and* `type`, and they overlap heavily. When do you use which? The honest answer is "it rarely matters, and here's the small set of cases where it does" — but to use them well you need to know what each one actually is.

## Two keywords, mostly the same job

For naming an object shape, `interface` and `type` are nearly interchangeable. Both of these declare the same `Task`:

:::compare
```typescript
interface Task {
  id: number;
  title: string;
  done: boolean;
}
```
```typescript
type Task = {
  id: number;
  title: string;
  done: boolean;
};
```
:::

Same shape, same [[structural|structural-typing]] checking, same erasure at runtime, same excess-property behavior on literals. A function taking `Task` doesn't care which keyword declared it. The syntactic tells: `interface Task {` has no `=` and no trailing semicolon after the block; `type Task = {` is an assignment — a name bound to a type expression — and takes a semicolon like any statement. That `=` is the clue to what `type` *is*, and why it can do things `interface` can't.

## What each one actually is

An `interface` declares a named object type and nothing else — it can only describe the shape of an object (or a function, or a constructor). A `type` is a general **alias**: a name for *any* type expression at all. That includes object shapes, but also primitives, unions, intersections, tuples, mapped and conditional types — anything you can write on the right of the `=`.

```typescript
type TaskId = number;                    // alias for a primitive
type Status = "todo" | "doing" | "done"; // a union — interface cannot express this
type Pair = [TaskId, string];            // a tuple
type Maybe = Task | undefined;           // a union with the shape we named
```

`interface` simply has no syntax for most of these. There is no way to write `interface Status` that means `"todo" | "doing" | "done"`, because an interface body is a list of members, not a type expression. The moment you need a union, an alias for a primitive, a tuple, or a conditional — you need `type`. This is the first concrete rule, and it's the one that actually decides most cases: **unions need `type`.** Episode 05 leans on this immediately when `done: boolean` becomes a status union.

The Python anchor is clean. Python's `TypeAlias` (or the `type X = ...` statement added in 3.12) is exactly TypeScript's `type` alias — a name for an existing type, with no runtime construct created:

:::compare
```python
from typing import TypeAlias

TaskId: TypeAlias = int
Status: TypeAlias = Literal["todo", "doing", "done"]

# Python 3.12+: the `type` soft keyword
type TaskId = int
```
```typescript
type TaskId = number;
type Status = "todo" | "doing" | "done";
```
:::

Note that `type TaskId = number` is an *alias*, not a new distinct type. `TaskId` and `number` are completely interchangeable — you can pass a plain `number` where a `TaskId` is wanted and vice versa, because structurally they're identical. This is the same as Python's `TypeAlias`: documentation and intent, not enforcement. It does *not* stop you from passing an array index where a task id belongs; for that you'd need a [[branded type|branded-types]], which is a deliberate trick to fake nominal typing on top of a structural system (a footnote for now, not something the app needs). And Java has no structural alias at all — `int` is `int`; you can't give it a second name that means the same type. The closest Java move is wrapping `int` in a class, which creates a genuinely distinct (nominal) type at the cost of allocation and unwrapping. TypeScript's alias is purely a compile-time name.

## The one capability `interface` has that `type` doesn't

It cuts both ways. The thing `interface` can do that `type` can't is **declaration merging**: declare the same interface name twice and the members combine into one.

```typescript
interface Task { id: number; title: string; }
interface Task { done: boolean; }
// Task is now { id: number; title: string; done: boolean } — the two merged.
```

Two `type Task = ...` declarations with the same name are instead a hard error (`Duplicate identifier`). [[Declaration merging|declaration-merging]] sounds like a footgun — and inside your own code it mostly is, since it makes a type's definition non-local — but it has one important use: *augmenting types you don't own*. When you need to add a property to a library's interface (a common pattern with framework request objects, or extending the global `Window`), merging is how you do it, because you can reopen their `interface` from your file. You can't do that with a `type`. This is a real reason libraries tend to export `interface`s for their public shapes: it leaves the door open for consumers to extend them.

## How to choose

The decision is smaller than the two keywords' existence suggests. The practical rule, in order:

1. **Need a union, a primitive alias, a tuple, or any non-object type expression?** Use `type`. `interface` can't express it. This decides most cases on its own.
2. **Declaring an object shape that's part of a public API others might extend?** Lean `interface`, for the merging escape hatch and because the error messages tend to read slightly better (`interface` types often show by name; complex `type` aliases sometimes expand inline).
3. **Anything else — a plain object shape in app code?** Pick one and be consistent. Many teams default to `interface` for object shapes and `type` for everything else (unions, aliases, function types), which is a clean convention precisely because it tracks rule 1.

There's no performance or runtime difference — both erase completely. The choice is about expressiveness (rule 1) and convention (rules 2–3), nothing more.

:::predict
You need to declare the following four names. Which require `type` (rather than `interface`), and why?

```typescript
// 1. The task shape: { id; title; done }
// 2. A status: exactly "todo", "doing", or "done"
// 3. An id: an alias for number
// 4. A command result: either a Task or undefined
```

- ( ) All four can be either — `type` and `interface` are fully interchangeable.
- ( ) Only #2 needs `type`; the rest must be `interface`.
- (x) #2, #3, and #4 need `type`; only #1 (a plain object shape) could be either.
- ( ) All four need `type` — `interface` is legacy syntax.
:::answer
**#2, #3, and #4 require `type`.** #2 is a union of string literals, #4 is a union of a shape with `undefined`, and #3 is an alias for a primitive — none of those is an object-member list, so `interface` has no syntax for them. **#1**, the task shape, is a plain object type and could be written either way; by the convention in rule 3 you'd likely keep it as `interface Task`. The principle: `interface` describes object shapes only; `type` names *any* type expression. When in doubt, ask "is this an object shape, or a type expression?" — the latter forces `type`.
:::

## Wiring it into the app

We keep `interface Task` (a plain object shape, rule 3) and introduce `type TaskId = number` to name the identifier. The alias buys us two things even without nominal enforcement: every signature that takes an id now reads `TaskId` instead of a bare `number`, documenting intent at the boundary, and if we ever do need to change how ids are represented (say to a [[branded|branded-types]] type, or to `string` UUIDs), there's a single name to change.

:::play
```typescript
type TaskId = number;

interface Task {
  id: TaskId;
  title: string;
  done: boolean;
}

const tasks: Task[] = [];

function addTask(input: Task): void {
  tasks.push(input);
}

function completeTask(id: TaskId): void {
  const task = tasks.find((t) => t.id === id);
  // (handling the maybe-missing task is episode 06)
  if (task) task.done = true;
}

addTask({ id: 1, title: "write the intro", done: false });
completeTask(1); // TaskId is an alias for number, so a plain 1 is fine
console.log(tasks);
```
:::

`completeTask(1)` works because `TaskId` *is* `number` — the alias is a name, not a wall. If you wanted the wall (rejecting `completeTask(someArrayIndex)`), that's branded types, and it's deliberately out of scope here; the app doesn't need it, and reaching for it now would be the kind of over-engineering the rest of the course avoids.

## Recap and what's next

- `interface` and `type` both name shapes, with the same structural checking and the same runtime erasure. For a plain object shape they're interchangeable.
- `type` is a general **alias** for any type expression — unions, primitives, tuples, conditionals. `interface` describes object shapes only. **Unions force `type`.** This decides most real cases.
- `type X = number` is Python's `TypeAlias`: a name, not a distinct type, so no enforcement against mixing. Java has no structural alias at all. For true nominal distinction you'd reach for [[branded types|branded-types]] — out of scope here.
- `interface` alone supports [[declaration merging|declaration-merging]], whose real use is augmenting types you don't own (library/global shapes).
- Convention: `interface` for object shapes, `type` for everything else, and be consistent.

We now have a name for the id. Next we tackle a field whose *values* are the point: `done: boolean` is a yes/no that can't express "in progress." Episode 05 turns it into a union — `status: "todo" | "doing" | "done"` — which is the first place a `type` alias is mandatory, and the first place the compiler can prove you've handled every case.
