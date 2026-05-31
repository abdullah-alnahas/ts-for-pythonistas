---
title: A union for status
subtitle: Literal types, the exhaustive switch, and how never turns a missing case into a build error
---

## Where we pick up

A task currently has `done: boolean`. That was fine when a task was either finished or not, but it can't say "I've started this but haven't finished." A boolean has exactly two states, and we want three: not started, in progress, done. The reflex from a dynamically-typed background is to reach for a string — `status: string` — and agree on some convention for the allowed values. This episode is about why that reflex throws away the type system's best trick, and what to do instead. The app moves from this:

```typescript
interface Task {
  id: TaskId;
  title: string;
  done: boolean;
}
```

to this:

```typescript
type Status = "todo" | "doing" | "done";

interface Task {
  id: TaskId;
  title: string;
  status: Status;
}
```

and gains a `label` function that the compiler will refuse to let us leave incomplete.

## `string` is too wide

If we type the field as `status: string`, the compiler knows almost nothing useful:

```typescript
interface Task {
  id: TaskId;
  title: string;
  status: string; // any string at all
}

const t: Task = { id: 1, title: "x", status: "dnoe" }; // typo, accepted
```

`"dnoe"` is a string, so it satisfies `status: string`, and the typo sails through — we're back to the episode-01 failure mode, just with strings instead of object shapes. `string` is the set of *all* strings; we want the set of *exactly three* strings. TypeScript can express that directly, because a string literal is itself a type.

## Literal types and their union

You met literal types in passing: `const x = "todo"` infers the type `"todo"`, a type inhabited by exactly one value. The point of this episode is that you can *union* them into a closed set:

```typescript
type Status = "todo" | "doing" | "done";
```

`Status` is a type whose only inhabitants are those three strings. Assigning anything else is a compile error:

```typescript
const a: Status = "doing";  // ok
const b: Status = "dnoe";   // error TS2322: Type '"dnoe"' is not assignable to type 'Status'.
```

The typo is caught now, because `"dnoe"` is not a member of the set. This is a discriminated set of allowed values — a closed enumeration expressed as a union of literals. It is also the first place in the app where a `type` alias is *required*: a union can't be written as an `interface` (episode 04, rule 1).

The Python and C++/Java anchors are all close, but each differs in a way worth naming:

:::compare
```python
from typing import Literal
from enum import Enum

# Closest analogue: Literal — a closed set of values, checker-enforced.
Status = Literal["todo", "doing", "done"]

# Or an Enum — a real runtime object with named members.
class Status(Enum):
    TODO = "todo"
    DOING = "doing"
    DONE = "done"
```
```typescript
// A union of string literals — the idiomatic TS choice.
type Status = "todo" | "doing" | "done";

// TS also has `enum`, a real runtime construct (closer to Python's Enum):
enum StatusEnum { Todo = "todo", Doing = "doing", Done = "done" }
```
:::

Python's `Literal["todo", "doing", "done"]` is the near-exact match — a closed set of string values that the checker enforces and that leaves no runtime object behind. TypeScript's literal union is the same idea and the same erasure: `type Status` produces no JavaScript; a `status` field at runtime is just a string. Python's `Enum`, by contrast, creates a real runtime class with members you compare by identity (`Status.TODO`), and TypeScript's `enum` is the analogue of *that* — one of the few TS constructs that *does* emit runtime code. Java's `enum` and C++'s `enum class` are nominal, runtime, named types in the same spirit. The reason idiomatic TypeScript prefers the literal union over `enum` is exactly the through-line of this course: the union is plain data (just strings) that erases cleanly and interoperates with JSON and external input without conversion, whereas `enum` introduces a runtime object whose values you have to map to and from the strings anyway. Use the union; reach for `enum` only when you specifically want the runtime object.

## Narrowing: the compiler tracks which member you're in

A union's payoff is that the compiler follows your control flow and *narrows* the type as you rule members out. Inside a branch that checks `status === "done"`, the compiler knows `status` is the literal `"done"` there, not the whole union:

```typescript
function describe(status: Status): string {
  if (status === "done") {
    // here, status is narrowed to the literal "done"
    return "finished";
  }
  // here, status is narrowed to "todo" | "doing"
  return "not finished yet";
}
```

This is [[narrowing|narrowing]], and it's the engine behind the next move. The literal value in the field tells the compiler which case it's in — the field is acting as a *discriminant*. (When the discriminant lives in an object alongside other fields that vary per case, the pattern has a name — a discriminated union — and it's how you model variants like a `Result` that's either `{ ok: true; value }` or `{ ok: false; error }`. Our `Status` is the scalar version of the same idea.)

## The reveal: exhaustive `switch` and `never`

Here's the capability that makes the union worth more than a comment listing valid strings. We write a `label` function with a `switch` over the three cases, and ask the compiler to *prove* we've handled all of them:

```typescript
type Status = "todo" | "doing" | "done";

function label(status: Status): string {
  switch (status) {
    case "todo":
      return "To do";
    case "doing":
      return "In progress";
    case "done":
      return "Done";
    default: {
      // If every case above is handled, `status` here is `never`.
      const exhaustive: never = status;
      return exhaustive;
    }
  }
}
```

The trick is the `default` branch and the type `never`. `never` is the empty type — the type with *no* values, the type of an expression that can never produce one. In the `default` branch, the compiler has narrowed `status` by elimination: it's not `"todo"`, not `"doing"`, not `"done"`. If those are the only three members, nothing is left, so `status` is narrowed to `never` — and assigning `never` to a `never` variable is fine. The function compiles. So far this looks like ceremony. Its value shows up the day someone changes `Status`.

:::predict
A teammate adds a fourth status. `type Status = "todo" | "doing" | "done" | "blocked"`. They do *not* touch the `label` function above. What happens?

- ( ) Nothing at compile time; `label("blocked")` returns `undefined` at runtime, a silent bug.
- ( ) The whole file fails to parse because `Status` now has four members.
- (x) `label` fails to compile, on the line `const exhaustive: never = status;`.
- ( ) `label` compiles but emits a runtime warning the first time `"blocked"` is passed.
:::answer
`label` **fails to compile**, with an error on `const exhaustive: never = status;` — something like `Type '"blocked"' is not assignable to type 'never'.` Here's the mechanism: with `"blocked"` added and no `case "blocked"` handling it, the `default` branch is now reachable with `status` narrowed to `"blocked"` (not `never`, because one member survived the elimination). Assigning a `"blocked"` to a variable typed `never` is illegal — `never` accepts no values — so the assignment errors, and the error points exactly at the function that's now incomplete. This is the payoff: the union plus the `never` assignment turns "I added a status and forgot to handle it somewhere" from a runtime surprise into a compile error at the precise site. Without it, `label("blocked")` would fall through the `switch` and return `undefined`, the episode-01 failure mode again. The `never` line is a *compile-time assertion that the switch is exhaustive*, and it's the single most useful pattern unions give you.
:::

The contrast with the Python `Enum` / Java `enum` switch is instructive. In Java, a `switch` over an enum can be made exhaustive (and modern Java warns or errors on a missing case in a `switch` expression), so the idea isn't unique to TypeScript. What's notable is that TypeScript gets the same guarantee over *plain strings* — no enum object required — purely through literal types and `never`. Python's `match` on `Literal` plus a checker like `mypy` can approximate it too, but it's not enforced by the interpreter; here it stops the build.

## Migrating the app

Changing `done: boolean` to `status: Status` ripples through the code that read `done`, and that ripple is the point — the compiler walks you to every site that needs updating. `completeTask` no longer sets `task.done = true`; it sets `task.status = "done"`. Any code branching on `done` now branches on `status`. You don't have to find these by hand; `tsc --noEmit` lists them.

:::play
```typescript
type TaskId = number;
type Status = "todo" | "doing" | "done";

interface Task {
  id: TaskId;
  title: string;
  status: Status;
}

const tasks: Task[] = [];

function addTask(title: string): void {
  tasks.push({ id: tasks.length + 1, title, status: "todo" });
}

function completeTask(id: TaskId): void {
  const task = tasks.find((t) => t.id === id);
  if (task) task.status = "done"; // was task.done = true
}

function label(status: Status): string {
  switch (status) {
    case "todo": return "To do";
    case "doing": return "In progress";
    case "done": return "Done";
    default: {
      const exhaustive: never = status; // compile error if a case is unhandled
      return exhaustive;
    }
  }
}

addTask("write the intro");
completeTask(1);
console.log(tasks.map((t) => `${t.title}: ${label(t.status)}`));
// [ 'write the intro: Done' ]

// Try it: add "blocked" to Status above and watch `label` stop compiling
// until you add a case for it.
```
:::

## Recap and what's next

- A string literal is a type with one value; a **union of literals** (`"todo" | "doing" | "done"`) is a closed set the compiler checks every assignment against — catching the typo `string` would have let through.
- This is Python's `Literal`, with the same erasure. It's *not* `enum`: TS `enum` (like Python/Java/C++ enums) emits a runtime object. Idiomatic TS prefers the union — plain strings, clean erasure, easy JSON interop.
- The compiler [[narrows|narrowing]] a union down each branch of your control flow; the literal field acts as a discriminant.
- The **exhaustive `switch`** with `const _: never = status` in `default` is a compile-time assertion that every case is handled. Add a member and forget a case, and the build fails at the exact spot — instead of returning `undefined` at runtime.

We've now got several functions that look up a task by id and then use it. Each one quietly assumes the task was found. But `find` can come up empty, and we've been papering over that with `if (task)`. The next episode confronts it head-on: `findTask` returns `Task | undefined`, what `strictNullChecks` forces you to do about it, and how `null` and `undefined` differ — the area where TypeScript most directly protects you from the null-reference bug.
