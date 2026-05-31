---
title: Typing the functions, not just the data
subtitle: Function types, optional/default/rest parameters, and a Command type that ties the app's operations together
---

## Where we pick up

The app's *data* is well-typed — `Task`, `Status`, the generic `Store`. But its *operations* — add, list, complete, edit, filter — are still loosely connected functions. This episode types the verbs. A function in TypeScript has a type just as a value does, and once you can name that type, you can store functions in variables, pass them as arguments, and — the goal of this episode — describe a whole *family* of operations with a single `Command` type. Along the way we cover the parameter features that diverge from Python: optional parameters, defaults, and rest parameters, which map onto Python's defaults and `*args`/`**kwargs` but with sharper rules.

## A function has a type

In Python you annotate a function's parameters and return, and `Callable[[int], str]` names "a function from int to string." TypeScript has the same two layers, and the function-type syntax is one of its cleaner corners.

:::compare
```python
def complete(id: int) -> bool:
    ...

from typing import Callable
handler: Callable[[int], bool] = complete   # the type of such a function
```
```typescript
function complete(id: number): boolean {
  return true;
}

const handler: (id: number) => boolean = complete; // the type of such a function
```
:::

The declaration `function complete(id: number): boolean` annotates parameters with `name: Type` and the return after the parameter list with `: Type` — reading just like Python's `-> bool`. The interesting part is the second line: `(id: number) => boolean` is the *type* of that function — "takes a number, returns a boolean" — the direct equivalent of `Callable[[int], bool]`. Note the parameter name `id` in the type is just documentation; only the types matter for compatibility. This arrow syntax is what lets us treat functions as values with known shapes, which is the whole basis for the `Command` type later.

A note on return types: like Python, you can usually let the compiler infer the return from the body, and for local functions that's idiomatic. Annotate the return explicitly at boundaries — exported functions, anything another module calls — both as documentation and as a guard, because an explicit return type makes the compiler check that the body actually returns what you claimed, rather than inferring whatever it happens to return.

## Parameters: optional, default, rest

Three parameter features matter for a Python developer, because each has a near-analogue with a sharper rule.

**Optional parameters** use `?`, the same modifier as optional object fields from episode 7. An optional parameter may be omitted at the call site, and inside the function its type is `T | undefined` — so you must handle the absent case, exactly as with optional fields:

```typescript
function greet(name: string, title?: string): string {
  // title is string | undefined here
  return title ? `${title} ${name}` : name;
}
greet("Ada");            // ok — title omitted
greet("Ada", "Dr.");     // ok
```

**Default parameters** give a value when the argument is omitted, just like Python — and a default makes the parameter optional automatically, *without* `?`, because the default supplies the missing value. Crucially, inside the function the parameter is *not* `| undefined`, because the default guarantees a value:

```typescript
function greet(name: string, title = "Dr."): string {
  // title is string here — no | undefined, the default fills it in
  return `${title} ${name}`;
}
```

There's a real divergence from Python hiding here, and it's a good one. Python's infamous mutable-default trap — `def f(items=[])` shares one list across all calls — does not exist in TypeScript. A default expression in TypeScript is **re-evaluated on every call**, so `function f(items: number[] = [])` produces a fresh array each time. The bug that bites every Python beginner is structurally impossible here.

:::predict
This function uses a default array and pushes to it. What does calling it three times print?

```typescript
function collect(x: number, into: number[] = []): number[] {
  into.push(x);
  return into;
}
console.log(collect(1));
console.log(collect(2));
console.log(collect(3));
```

- ( ) `[1]`, `[1, 2]`, `[1, 2, 3]` — the default array is shared across calls, like Python.
- (x) `[1]`, `[2]`, `[3]` — the default `[]` is re-evaluated fresh on each call.
- ( ) `[1]`, `[1]`, `[1]` — the default is created once and reset each call.
- ( ) A compile error — you can't push to a default parameter.
:::answer
`[1]`, `[2]`, `[3]`. TypeScript (and JavaScript) re-evaluate the default expression `[]` on **every call** where the argument is omitted, so each call gets a brand-new empty array. This is the opposite of Python, where `def collect(x, into=[])` evaluates `[]` *once* at definition time and shares that single list across all calls — the classic mutable-default footgun that prints `[1]`, `[1, 2]`, `[1, 2, 3]` and surprises every Python newcomer. TypeScript's per-call evaluation means the entire bug class simply doesn't exist; you can use `= []` or `= {}` as a default freely. One of the rare cases where the JavaScript semantics are the *safer* default.
:::

**Rest parameters** collect any number of trailing arguments into a typed array, with `...` — the equivalent of Python's `*args`, but typed:

:::play
```typescript
function addTasks(store: { add: (t: string) => void }, ...titles: string[]): number {
  for (const title of titles) store.add(title);
  return titles.length;
}

const log: string[] = [];
const store = { add: (t: string) => log.push(t) };
console.log(addTasks(store, "a", "b", "c")); // 3
console.log(log);                            // ["a", "b", "c"]
```
:::

`...titles: string[]` says "zero or more trailing string arguments, gathered into a `string[]`." It's `*args` with a type: where Python's `*args` is an untyped tuple, TypeScript types every collected argument as `string`, so `addTasks(store, "a", 42)` is a compile error. The `**kwargs` side of Python — arbitrary keyword arguments — has no direct equivalent, because JavaScript has no keyword arguments; the idiom is to pass a single typed *options object* instead (`addTask({ title, status })`), which the compiler can check field by field, and which reads like a `TypedDict`.

## Naming a function type: the `Command` type

Now the episode's purpose. The app has a fixed set of operations — add, complete, filter — and they share a shape: each takes the store and some arguments and does something. We can name that shared shape as a `type`, and then every handler is checked against it. This is where typed functions pay off: one `Command` type, many conforming handlers.

Define the operations as named function types. A clean model: each command is a function that takes the `Store` and a string argument and returns a status message.

:::play
```typescript
interface Task { id: number; title: string; status: "todo" | "doing" | "done"; }

// The shared shape of every command handler:
type Command = (tasks: Task[], arg: string) => string;

const add: Command = (tasks, arg) => {
  tasks.push({ id: tasks.length + 1, title: arg, status: "todo" });
  return `added: ${arg}`;
};

const complete: Command = (tasks, arg) => {
  const id = Number(arg);
  const task = tasks.find((t) => t.id === id);
  if (!task) return `no task #${id}`;
  task.status = "done";
  return `completed #${id}`;
};

// A registry mapping command names to handlers — all typed as Command:
const commands: Record<string, Command> = { add, complete };

const tasks: Task[] = [];
console.log(commands["add"]!(tasks, "write the recap"));  // added: write the recap
console.log(commands["complete"]!(tasks, "1"));            // completed #1
```
:::

`type Command = (tasks: Task[], arg: string) => string` names the handler shape once. Every handler — `add`, `complete` — is annotated `: Command`, and the compiler checks each against that signature: the parameter types are supplied automatically (note we didn't annotate `tasks` or `arg` in the handlers — they're *inferred* from `Command`, a small but real ergonomic win), and the return must be a `string`. Get any of it wrong — return a number, take the wrong arguments — and the compiler flags the specific handler. The `commands` registry is typed `Record<string, Command>` (episode 11's utility type, previewed here), which says "an object whose values are all `Command`s," so you can't accidentally register a non-conforming function. This is how a real command dispatcher is typed: one signature, enforced across every operation, with the registry guaranteeing uniformity.

There's a structural-typing echo here worth naming. Two functions are compatible if their *shapes* are compatible — parameter and return types — not because either was declared to "be a `Command`." `add` is a `Command` because its shape matches, the same structural rule from episode 4 applied to functions instead of objects. (Function compatibility has one genuinely subtle rule — parameter [[variance]] — that we'll leave for the classic course; for same-typed parameters like these it just works.)

## The callback: handlers are checkers with side effects

A small but real connection back to Act 1. Each `Command` handler trusts its `tasks` argument completely — it calls `.find`, reads `t.id`, mutates `t.status` — with no `isTask` guard in sight. It can, because the parameter type `tasks: Task[]` is a *promise the compiler enforced at every call site*: nothing reaches a handler without having been checked to be a `Task[]`. The verification that `isTask` did at runtime, the parameter annotation now does at compile time, once, at the boundary of the function. The handler body is the "trust the inside" half of episode 2's discipline — *check at the edges, trust the inside* — except the edge is now the type signature, and the check happened in the compiler.

:::quiz
We annotated each handler `const add: Command = (tasks, arg) => { ... }` and didn't write types on `tasks` or `arg`. Where do their types come from, and how does this relate to the inference principle from the very first episodes?
:::answer
Their types come from the `Command` type on the left-hand side, by **contextual typing**: because `add` is declared to be a `Command`, and `Command` is `(tasks: Task[], arg: string) => string`, the compiler flows those parameter types *into* the arrow function — `tasks` is inferred as `Task[]` and `arg` as `string` without you annotating them. This is the same inference principle the course leaned on from episode 2's classic-course sibling onward: annotate at the boundary (here, the `Command` type) and let everything downstream infer. Writing `(tasks: Task[], arg: string)` again on the handler would be redundant — the contextual type already supplies it, and re-annotating just adds noise and a second place to make a mistake. It's the function-level version of "let locals infer": declare the contract once (the type), and the parameter types fall out of it. Contrast Python, where a `Callable`-annotated variable doesn't push parameter types into a lambda the same way — you'd typically still annotate, and `mypy` checks after the fact rather than supplying the types for you.
:::

## Recap

- A function has a **type**: `(id: number) => boolean`, the equivalent of Python's `Callable[[int], bool]`. Parameter names in the type are documentation; only types matter for compatibility.
- **Optional** parameters use `?` and become `T | undefined` inside (must be handled). **Default** parameters supply a value, make the parameter optional without `?`, and stay non-`undefined` inside — and the default is **re-evaluated every call**, so Python's mutable-default trap doesn't exist.
- **Rest** parameters (`...titles: string[]`) are typed `*args`. There's no `**kwargs` equivalent; pass a typed options object instead.
- A named function type (`type Command = (...) => string`) describes a family of operations; annotating each handler `: Command` enforces the shape and **infers** the parameter types into the handler via contextual typing. A `Record<string, Command>` registry guarantees uniformity.
- Function compatibility is **structural** (shape-based), like objects. Handlers trust their `Task[]` parameter because the compiler enforced it at every call site — the compile-time form of "check at the edges, trust the inside."

Next episode: we've used a `class` for `Store`, but TypeScript classes have their own apparatus — access modifiers (`private`/`protected`/`public`), `implements`, `readonly` — and a real question of *when not to reach for a class at all*. We build the optional `class TaskStore`, contrast Python's `self` and Java/C++ access control, and make the case that in TypeScript a plain object and a function often beat a class.
