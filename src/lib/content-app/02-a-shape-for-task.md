---
title: A shape for Task
subtitle: Primitive annotations, an interface for the task, and how much you can leave to inference
---

## Where we pick up

Episode 01 left `todo.ts` in a state the checker disliked: the parameters were untyped, and a typo in a field name was a runtime crash waiting to happen because nothing knew what a task was supposed to look like. We are going to fix both, in that order. First we silence the parameter errors with primitive annotations. Then we answer the real question — *what is a task?* — by giving it a shape with `interface`. By the end the typo from episode 01 is a build error, and the app looks like this:

```typescript
interface Task {
  id: number;
  title: string;
  done: boolean;
}

let tasks: Task[] = [];

function addTask(title: string): void {
  tasks.push({ id: tasks.length + 1, title, done: false });
}
```

That `interface Task` is the spine of the whole app from here on. Everything we add over the next eight episodes hangs off it.

## Primitives first

The checker's two errors from last time were both `Parameter implicitly has an 'any' type`. The fix is the annotation syntax you already know from Python type hints — `name: Type` — with TypeScript's primitive names.

:::compare
```python
def add_task(title: str) -> None:
    ...

def complete_task(id: int) -> None:
    ...
```
```typescript
function addTask(title: string): void {
  // ...
}

function completeTask(id: number): void {
  // ...
}
```
:::

The mapping is mechanical, with the divergences you saw in the primitives lesson of the other course: `str` is `string`, `int` and `float` are both the single `number` type, `bool` is `boolean`, and Python's `None` return is TypeScript's `void`. The names are lowercase — `string`, not `String`; the capitalized forms are wrapper-object types you almost never want. With these two annotations, `tsc --noEmit` stops complaining about the parameters. The function bodies now type-check.

But notice what we have *not* done: we have not said anything about the objects being pushed into `tasks`, or about `tasks` itself. The array is still inferred as `any[]`. The typo from episode 01 would still slip through, because `any[]` accepts any object at all. Annotating the parameters fixed the symptom the checker pointed at; it did nothing for the shape problem underneath.

## The wall: annotate the object inline, and feel it

The obvious next move is to type the array. Since each element is an object with three fields, we can write that shape directly:

```typescript
let tasks: { id: number; title: string; done: boolean }[] = [];

function addTask(title: string): void {
  tasks.push({ id: tasks.length + 1, title, done: false });
}
```

This works, and it is worth pausing on the syntax: `{ id: number; title: string; done: boolean }` is an **object type** written inline — fields separated by semicolons, each with its own annotation — and the trailing `[]` makes it an array of that shape. The typo from episode 01 is now caught: `tasks.push({ id: 1, text: "x", done: false })` fails to compile, because `text` is not a field of the declared object type. That is the whole win from episode 01, delivered.

The trouble is that the shape `{ id: number; title: string; done: boolean }` is going to appear *everywhere* — on the array, on the parameter of `completeTask` once it takes a whole task, on a `render` function, on every helper we write. Repeating the literal at each site is the same problem as inlining a struct definition in every function signature in C: it works, it is unmaintainable, and the day you add a field you edit twenty places. We need to name the shape once.

## The reveal: `interface Task`

`interface` gives the shape a name. It is a declaration, not a value — it produces no JavaScript, it is purely a description the checker uses — and once named, you refer to it by name everywhere.

:::compare
```python
from dataclasses import dataclass

@dataclass
class Task:
    id: int
    title: str
    done: bool
```
```typescript
interface Task {
  id: number;
  title: string;
  done: boolean;
}
```
:::

This is the closest TypeScript construct to a Python `@dataclass` or a `TypedDict`, and the resemblance is strong: a named record of typed fields. But the differences are real and worth stating, because they shape how you use it. A Python `dataclass` is a *class* — it generates an `__init__`, makes real instances, and exists at runtime; you can `isinstance(x, Task)`. A `TypedDict` is closer, describing the shape of a plain dict, but it too leaves a runtime marker the type checker keys on. A TypeScript `interface` leaves *nothing* at runtime. It is [[erased|type-erasure]] entirely; the emitted JavaScript has no trace of `Task`. There is no `new Task()`, no constructor, no `instanceof Task` that means what you'd hope (we get to classes in episode 09, and to why `instanceof` is subtle in episode 06). An `interface` is a description the compiler checks against and then discards.

The Java and C++ contrast sharpens the point. In Java, `Task` would be a `class` or `record` with fields, and in C++ a `struct` — both produce a real type at runtime that participates in `instanceof` / `dynamic_cast`. TypeScript's `interface` is more like a C++ *concept* or a Java interface used purely for structural description: it constrains shapes at compile time and vanishes. The object you push is still a plain JavaScript object literal; `interface Task` only governs which literals the checker will accept where a `Task` is expected.

Wire it into the app and the inline noise collapses to a name:

```typescript
interface Task {
  id: number;
  title: string;
  done: boolean;
}

let tasks: Task[] = [];

function addTask(title: string): void {
  tasks.push({ id: tasks.length + 1, title, done: false });
}
```

`Task[]` reads as "array of `Task`," exactly like Python's `list[Task]`. The typo is still caught, but now the shape is defined in one place, and every future function that takes or returns a task names `Task` instead of repeating its fields.

## Don't over-annotate: let inference do its job

Here is the reflex to unlearn coming from Python, where annotating locals is cheap and common. TypeScript's inference is aggressive, and an annotation it could have inferred is usually noise — sometimes worse than noise. Watch what the checker already knows without being told:

```typescript
function addTask(title: string): void {
  const task = { id: tasks.length + 1, title, done: false };
  //    ^ inferred: { id: number; title: string; done: boolean }
  tasks.push(task);
}
```

You did not annotate `task`. The checker read the object literal and inferred its type field by field: `id` is `number` (it's `tasks.length + 1`, and `.length` is `number`), `title` is `string` (it came from the typed parameter), `done` is `boolean` (it's `false`). Annotating `const task: Task = {...}` would be legal but redundant — the inferred type is already assignable to `Task`, which is all `push` needs to check. The rule from the primitives course holds here: **annotate at boundaries, let locals infer.** A function's parameters and return type are boundaries — other code depends on them, so you write them down. A local `const` inside the body is not — its type is fully determined by its initializer, so you let the compiler read it.

Two clarifications make this predictable. First, you *can* drop the return type too and let it infer — `function addTask(title: string) { ... }` infers `void` because the body returns nothing. Many codebases still write `: void` and other return types explicitly on exported functions, as documentation and as a guardrail against an accidental change to what the function returns. That is a boundary judgment, not a correctness one. Second, inference is not the same as `any`: an inferred type is a *specific* type the checker enforces, just one it worked out instead of you writing it. `any` is the opposite — the absence of a type. Letting `task` infer keeps full checking; declaring `task: any` would throw it away.

:::quiz
For each line, does it need an annotation, and what type does the value have either way?

```typescript
const limit = 50;                          // a
let title;                                  // b
function nextId(tasks: Task[]) {            // c — return type omitted
  return tasks.length + 1;
}
```
:::answer
**a** — no annotation needed. `const limit = 50` infers the literal type `50` (a `const` can't be reassigned, so the narrowest type is the single value). Annotating `: number` would actually *widen* it and discard information; leave it bare.

**b** — this one is a problem, not a free pass. `let title;` with no initializer and no annotation infers `any` (there's nothing to read a type from), and under `strict` this is the implicitly-`any` trap. Either give it a type (`let title: string`) or, better, initialize it where you declare it so inference has something to work with.

**c** — no return annotation needed; the checker infers `number` from `tasks.length + 1`. Writing `: number` is fine as a boundary guardrail on an exported helper, but it's documentation, not a fix — the inferred type is already correct and enforced. The distinction throughout: annotate **boundaries** (parameters, exports), let **locals and obvious returns** infer, and never leave a bare uninitialized `let` under `strict`.
:::

## Try it

Define the interface, use it, and watch the typo from episode 01 finally get caught at build time instead of crashing at runtime. The commented line is the payoff of the whole episode.

:::play
```typescript
interface Task {
  id: number;
  title: string;
  done: boolean;
}

const tasks: Task[] = [];

function addTask(title: string): void {
  // `task` is inferred as { id: number; title: string; done: boolean },
  // which is assignable to Task — no annotation needed here.
  const task = { id: tasks.length + 1, title, done: false };
  tasks.push(task);
}

addTask("write the intro");
console.log(tasks);

// Uncomment to see the episode-01 typo caught at build time:
// tasks.push({ id: 2, text: "file the taxes", done: false });
// error TS2353: Object literal may only specify known properties,
//   and 'text' does not exist in type 'Task'.
```
:::

Uncomment the last line in your head: `text` is not a field of `Task`, so the checker rejects it with `error TS2353` *before the program runs*. The exact wording — "Object literal may only specify known properties" — is the checker's excess-property rule, and it is the subject of the next episode, because it is also where TypeScript's structural typing first surprises a Python developer.

## Recap and what's next

- Primitive annotations use `name: Type` with lowercase names: `str` is `string`, `int`/`float` are `number`, `bool` is `boolean`, a `None` return is `void`.
- `interface Task { ... }` names a shape once and is used by name everywhere. It is the dataclass/TypedDict analogue, but [[erased|type-erasure]] at runtime — no constructor, no `instanceof`, no JavaScript emitted. Java/C++ named types stay at runtime; an `interface` does not.
- Annotate boundaries — parameters, return types, exports — and let locals infer. An inferred type is a real, enforced type, not `any`; redundant local annotations are noise and can even widen.
- The episode-01 typo is now a compile error against `Task`, delivered before runtime.

We named the shape, but we have not asked the question that shape raises: when TypeScript checks whether an object *is* a `Task`, does it check the name or the fields? The answer — it checks the fields, the structure, never the name — is episode 03, and it is the single largest departure from how Java and C++ decide type identity.
