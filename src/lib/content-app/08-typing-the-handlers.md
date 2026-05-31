---
title: Functions — the command handlers
subtitle: Function types, optional and default and rest parameters, and a Command type that types a handler itself
---

## Where we pick up

The data layer is solid: a generic `Store<Task>` holds the tasks, and lookups are honestly typed as `T | undefined`. What's still loose is the *verbs*. A CLI todo app is a dispatch loop — read a command name and its arguments, run the matching handler. We have `add`, `complete`, `edit`, and `filter` as scattered functions with inconsistent shapes. This episode types them properly, and then types the *handler itself* — a function type that says "every command is a function taking string arguments and returning a status line":

```typescript
type Command = (args: string[]) => string;

const commands: Record<string, Command> = {
  add: (args) => addCmd(args),
  complete: (args) => completeCmd(args),
  // ...
};
```

That `(args: string[]) => string` is a **function type**: a type whose values are functions of a particular signature. It's the piece a Python developer most often leaves untyped, and TypeScript makes it first-class.

## Parameters and returns, with the variations

Function annotation you've seen since episode 02: `name: Type` on each parameter, `: Type` after the list for the return. The variations are where it gets useful, and they line up against Python's parameter features almost one-to-one.

**Optional parameters** use `?`, and must come after required ones. An optional parameter's type includes `undefined` — it's the parameter-level twin of episode 06's optional property:

```typescript
function addTask(title: string, status?: Status): void {
  // status is Status | undefined here
}
addTask("write"); // ok — status omitted
```

**Default parameters** give the missing value a value instead of leaving it `undefined`, and a default lets the compiler drop the `| undefined`:

```typescript
function addTask(title: string, status: Status = "todo"): void {
  // status is Status here — never undefined, because of the default
}
```

**Rest parameters** collect trailing arguments into an array, exactly Python's `*args`:

```typescript
function addMany(...titles: string[]): void {
  titles.forEach((t) => addTask(t));
}
addMany("a", "b", "c"); // titles is ["a", "b", "c"]
```

The Python mapping is direct, with the divergences you'd predict from the type system being static:

:::compare
```python
def add_task(title: str, status: str = "todo") -> None: ...
def add_many(*titles: str) -> None: ...

# **kwargs has no direct structural equivalent in TS:
def configure(**opts: str) -> None: ...
```
```typescript
function addTask(title: string, status: Status = "todo"): void {}
function addMany(...titles: string[]): void {}

// **kwargs → a typed options object, not loose keyword args:
function configure(opts: { [k: string]: string }): void {}
```
:::

`*args` maps cleanly to `...rest`. Defaults map cleanly. The one that *doesn't* map is `**kwargs`: TypeScript has no loose keyword-argument mechanism, because keyword arguments aren't a JavaScript feature at all — JavaScript passes arguments positionally. The idiomatic replacement is a single **options object** with a typed shape, which you destructure inside (`function configure({ retries, verbose }: Options)`). This is actually the dominant TypeScript calling convention for anything past two or three parameters, and it's stricter than `**kwargs`: every option is a named, typed field, checked at the call site, rather than an open bag of keys. A Python dev should expect to reach for an options object where they'd have reached for keyword arguments.

## Function types: naming a signature

The new idea is that a *function's signature is itself a type*. You can write it inline or name it with a `type` alias, and the syntax is `(params) => ReturnType` — an arrow, not a colon, for the return:

```typescript
type Command = (args: string[]) => string;
```

`Command` is the type of any function that takes a `string[]` and returns a `string`. A value of this type can be a named function, an arrow function, or a method — [[structural typing|structural-typing]] again: what matters is the call signature, not how the function was defined. This is exactly Python's `Callable[[list[str]], str]`:

:::compare
```python
from typing import Callable

Command = Callable[[list[str]], str]

def run(cmd: Command, args: list[str]) -> str:
    return cmd(args)
```
```typescript
type Command = (args: string[]) => string;

function run(cmd: Command, args: string[]): string {
  return cmd(args);
}
```
:::

`Callable[[list[str]], str]` and `(args: string[]) => string` describe the same thing — a callable of a given signature. TypeScript's version names its parameters (`args`), which is purely for readability; only the types are part of the type. The payoff is in the dispatch table: typing the command map as `Record<string, Command>` (a `Record` is a typed object-as-dictionary — episode 10 covers it properly) means every handler you register is checked against the `Command` signature. Register one that returns `void` instead of `string`, or takes the wrong argument type, and the build fails at the registration site.

:::predict
`type Command = (args: string[]) => string`. You build a dispatch table `const commands: Record<string, Command> = { ... }`. Which of these entries are accepted?

```typescript
add:      (args) => `added ${args[0]}`,        // a
complete: (args) => { completeCmd(args); },    // b — no return
list:     () => "all tasks",                    // c — ignores args
count:    (args, verbose) => "n",               // d — extra param
```

- ( ) Only `a` — it's the only one matching the signature exactly.
- (x) `a` and `c` are accepted; `b` and `d` are rejected.
- ( ) All four — `Command` only checks that the value is a function.
- ( ) `a`, `b`, and `c` — a missing return defaults to a string.
:::answer
`a` and `c` are accepted; `b` and `d` are rejected. **`a`** matches exactly. **`c`** is accepted even though it ignores `args` — a function is allowed to take *fewer* parameters than its type permits, because ignoring an argument someone passes you is always safe (this is parameter [[variance|variance]], and it's why `array.map(x => x)` works even though `map` passes the callback three arguments). **`b`** is rejected: its body returns nothing, so its return type is `void`, not `string` — `Type '(args: string[]) => void' is not assignable to type 'Command'`. **`d`** is rejected the other way: a function type can't *require* more parameters than the signature provides, because the dispatcher only ever calls it with one argument, so `verbose` could never be supplied — `Target signature provides too few arguments`. The rule is "a handler may ask for less, never more, and must return what it promised."
:::

That "may take fewer parameters" rule is the one Python developers find surprising, and it's not a loophole — it's the same logic that lets you pass a one-argument lambda to `map`. The type guarantees the *caller's* obligations are met; a callback that uses fewer of the arguments offered is strictly safer, not less safe.

## Typing the four handlers

With the function vocabulary in place, the command handlers get clean, boundary-annotated signatures. Each takes what it needs and returns a status string for the CLI to print. `filter` is the interesting one — it takes a predicate by status or tag and returns the matching tasks:

```typescript
function completeCmd(id: TaskId): string {
  const task = tasks.get(id);
  if (!task) return `no task ${id}`;   // episode 06's narrowing, still required
  task.status = "done";
  return `completed ${id}`;
}

function filterByStatus(status: Status): Task[] {
  return tasks.all().filter((t) => t.status === status);
}

function filterByTag(tag: string): Task[] {
  return tasks.all().filter((t) => t.tags?.includes(tag) ?? false);
}
```

Note `t.tags?.includes(tag) ?? false` carries episode 06 forward: `tags` is optional, so `?.` guards the call and `??` supplies a `boolean` when it's absent. The types from every prior episode are still doing their work inside these handlers — the union narrows, the optional is guarded, the store returns a maybe-missing value. The handlers don't reintroduce any looseness; they just give the verbs the same discipline the data already had.

## The app, with typed handlers and a dispatch table

:::play
```typescript
type TaskId = number;
type Status = "todo" | "doing" | "done";
interface Task { id: TaskId; title: string; status: Status; tags?: string[]; }

class Store<T extends { id: number }> {
  private items: T[] = [];
  add(item: T): void { this.items.push(item); }
  get(id: number): T | undefined { return this.items.find((it) => it.id === id); }
  all(): T[] { return this.items; }
}

const tasks = new Store<Task>();
let nextId = 1;

function addCmd(title: string, ...tags: string[]): string {
  tasks.add({ id: nextId++, title, status: "todo", tags: tags.length ? tags : undefined });
  return `added "${title}"`;
}
function completeCmd(id: TaskId): string {
  const task = tasks.get(id);
  if (!task) return `no task ${id}`;
  task.status = "done";
  return `completed ${id}`;
}
function listCmd(status?: Status): string {
  const items = status ? tasks.all().filter((t) => t.status === status) : tasks.all();
  return items.map((t) => `${t.id}. [${t.status}] ${t.title}`).join("\n");
}

// A Command is any (args: string[]) => string. The dispatch table is typed,
// so each handler is checked against that signature at registration.
type Command = (args: string[]) => string;
const commands: Record<string, Command> = {
  add: (args) => addCmd(args[0] ?? "", ...args.slice(1)),
  complete: (args) => completeCmd(Number(args[0])),
  list: (args) => listCmd(args[0] as Status | undefined),
};

console.log(commands["add"]!(["write the intro", "urgent"]));
console.log(commands["add"]!(["ship it"]));
console.log(commands["complete"]!(["1"]));
console.log(commands["list"]!([]));
// 1. [done] write the intro
// 2. [todo] ship it
```
:::

## Recap and what's next

- Parameters take optional (`?`, adds `| undefined`), default (`= value`, drops the `| undefined`), and rest (`...xs: T[]`, Python's `*args`) forms.
- Python's `**kwargs` has no direct TS equivalent — use a typed **options object**, which is the dominant convention past a couple of parameters and stricter than loose keyword args.
- A **function type** `(args: string[]) => string` names a call signature — Python's `Callable[[...], R]`. Typing a dispatch table as `Record<string, Command>` checks every handler against it at registration.
- Function compatibility is structural and allows a handler to take *fewer* parameters (parameter [[variance|variance]]) but never more, and the return type must match.

We now have two complete ways to organize the app's state: the functional `Store<T>` class we've been using, with free functions for the verbs. But we built `Store` as a `class` almost by reflex. The next episode asks whether it should be one — classes, access modifiers, `implements`, and the honest case for why TypeScript code often *doesn't* need them, told against Python's class-centric default and Java's class-mandatory one.
