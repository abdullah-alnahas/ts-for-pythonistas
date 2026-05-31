---
title: The find that might miss
subtitle: null vs undefined, strictNullChecks, optional properties, and narrowing the maybe-missing value
---

## Where we pick up

Twice now we've written the same shrug. `completeTask` does `const task = tasks.find(...)` and then `if (task) task.status = "done"`. That `if (task)` has been sitting there unexplained, and it's load-bearing: `find` returns nothing when no task matches the id. This episode is about taking that seriously. We promote the lookup to its own function with an honest type, and we add an optional field — `tags?` — that introduces the same maybe-missing problem at the field level:

```typescript
function findTask(id: TaskId): Task | undefined {
  return tasks.find((t) => t.id === id);
}

interface Task {
  id: TaskId;
  title: string;
  status: Status;
  tags?: string[];
}
```

The `| undefined` and the `?` are the two faces of the single most valuable guarantee TypeScript offers a Python developer: the compiler will not let you use a value that might be absent without first proving it's present.

## Two kinds of nothing

JavaScript has *two* empty values, where Python has one (`None`). This trips up Python developers immediately, so it's worth getting straight before the type rules.

- `undefined` is the absence that the language produces on its own: a variable declared but not assigned, a missing object property, a function parameter you didn't pass, a function that returns nothing. `Array.find` returns `undefined` when nothing matches.
- `null` is the absence a *programmer* writes deliberately: "this is intentionally empty." JSON has it; many APIs return it.

:::compare
```python
# Python has one: None.
x = None
def f() -> None: ...      # returns None
d.get("missing")          # None when absent
```
```typescript
// TypeScript has two.
let x = undefined;        // language-produced absence
let y = null;             // deliberately-written absence
function f(): void {}     // returns undefined
arr.find(pred);           // undefined when nothing matches
```
:::

In practice: `undefined` is what you'll meet constantly, because it's what the language hands you for missing things. `null` shows up mostly at boundaries with systems that use it — JSON payloads, the DOM, databases. A common house style is "use `undefined` everywhere in your own code, tolerate `null` at the edges." The app will use `undefined` (it's what `find` returns), and you should treat `T | undefined` as the everyday case and `T | null` as the one you hit when external data forces it. They are *distinct types* — `undefined` is not assignable to `null` or vice versa — though `== null` loosely matches both (a rare, deliberate use of `==` over `===`, covered in episode 10).

The C++/Java contrast frames the stakes. C++'s `nullptr` and Java's `null` are the infamous null-reference holes: a reference typed `Task` can secretly be null, and dereferencing it is a `NullPointerException` or undefined behavior — Tony Hoare's "billion-dollar mistake." Python's `None` is the same hole with a friendlier landing (`AttributeError: 'NoneType' object has no attribute ...`). The defining feature of TypeScript's approach is that *the possibility of absence is in the type*. A `Task` is never secretly `undefined`; if a value might be missing, its type says `Task | undefined`, and the compiler forces you to handle the `undefined` arm before you touch the `Task`.

## `strictNullChecks`: the flag that makes it matter

This guarantee only exists under `strictNullChecks` (part of `strict`, which the Playground here runs with, and which the app turns on fully in episode 10). With it off — TypeScript's original 2012 behavior, kept for backward compatibility — `null` and `undefined` are assignable to *every* type, so a value typed `Task` really could be `undefined` and the compiler wouldn't care. That's the C++/Java hole, reproduced. With `strictNullChecks` on, `null` and `undefined` are removed from every type unless you explicitly include them, which is what turns "might be absent" into a fact the type tracks.

```typescript
// With strictNullChecks on:
let task: Task = undefined;          // error: undefined not assignable to Task
let maybe: Task | undefined = undefined; // ok — you said it might be absent
```

This is the single setting most responsible for TypeScript catching bugs Python ships. `mypy` has the same capability and it is *not* on by default there either historically; the parallel is exact, and the lesson is the same — turn it on.

## The honest return type, and being forced to handle it

Promote the lookup to `findTask`, and let the compiler infer — it already knows `Array.find` returns `T | undefined`:

```typescript
function findTask(id: TaskId): Task | undefined {
  return tasks.find((t) => t.id === id);
}
```

Now try to use the result naively, and the compiler stops you — *this* is the protection in action:

```typescript
const task = findTask(1);
task.status = "done";
// error TS18048: 'task' is possibly 'undefined'.
```

The error is the whole point. `task` is `Task | undefined`; `.status` exists on `Task` but not on `undefined`, so the access is unsafe until you've ruled `undefined` out. You relieve it by [[narrowing|narrowing]] — proving to the compiler that in *this* branch the value is present:

```typescript
const task = findTask(1);
if (task !== undefined) {
  task.status = "done"; // here task is narrowed to Task — the .status access is safe
}
```

Inside the `if`, the compiler subtracts `undefined` from the type, leaving `Task`, and the access is allowed. The earlier `if (task)` did the same thing by truthiness — and now you know what it was for. A few equivalent, idiomatic forms:

```typescript
if (task) { ... }                       // truthiness narrowing (also excludes null, 0, "", etc.)
if (task === undefined) return;         // early return; below this line task is Task
const t = findTask(1) ?? makeDefault(); // ?? supplies a fallback when null/undefined
findTask(1)?.tags;                       // ?. short-circuits to undefined if the LHS is absent
```

`??` (nullish coalescing) and `?.` (optional chaining) are the two operators you'll reach for most. `a ?? b` evaluates to `b` only when `a` is `null` or `undefined` — crucially *not* when `a` is `0` or `""`, which is why it's safer than `||` for defaults (episode 10 returns to this). `a?.b` reads `b` only if `a` is present, otherwise short-circuits to `undefined`. Both map onto Python idioms — `x if x is not None else y` and the `x.y if x else None` dance — but they're operators here, and they *narrow types*, not just values.

## Optional properties: the `?` is `| undefined` on a field

Adding `tags?: string[]` to `Task` introduces the same problem at the field level. The `?` makes the property optional: a `Task` may or may not have a `tags` field, and reading it gives `string[] | undefined`.

```typescript
interface Task {
  id: TaskId;
  title: string;
  status: Status;
  tags?: string[]; // optional — may be absent
}

const t: Task = { id: 1, title: "x", status: "todo" }; // ok, no tags
t.tags.push("urgent"); // error TS18048: 't.tags' is possibly 'undefined'.
```

`tags?: string[]` is almost — but not exactly — the same as `tags: string[] | undefined`. The difference is presence: with `?`, you may *omit* the field entirely when constructing the object (as above); with the explicit `| undefined` but no `?`, the field is required and you must write `tags: undefined`. The reading side is the same either way — `t.tags` is `string[] | undefined` and must be narrowed before use. This maps directly onto Python's `Optional[list[str]]` (`list[str] | None`), with the one wrinkle that a `TypedDict` distinguishes the same two cases via `total=False` / `NotRequired`, mirroring TS's `?` versus `| undefined`.

:::predict
`tags?: string[]`. You want the number of tags, defaulting to 0 when there are none. Which expression is correct *and* type-safe under `strictNullChecks`?

```typescript
const t: Task = findTask(1)!; // assume found, for this question
```

- ( ) `t.tags.length` — `tags` is declared, so it's always there.
- ( ) `t.tags?.length` — gives `number`, defaulting to 0 when absent.
- (x) `t.tags?.length ?? 0` — `?.` yields `number | undefined`, then `??` supplies 0.
- ( ) `t.tags.length ?? 0` — the `??` handles the missing case.
:::answer
`t.tags?.length ?? 0`. Walk it: `t.tags` is `string[] | undefined`. `t.tags?.length` short-circuits — if `tags` is `undefined` the whole thing is `undefined`, otherwise it's the `number` length — so its type is `number | undefined`. Then `?? 0` replaces the `undefined` arm with `0`, giving a clean `number`. Option 1 (`t.tags.length`) fails to compile — `'t.tags' is possibly 'undefined'`. Option 2 (`t.tags?.length`) compiles but its *type* is `number | undefined`, not `number`, so it doesn't fully solve "default to 0." Option 4 puts the `?.` in the wrong place — `t.tags.length` already errored before `??` can help. The `?.` guards the access; the `??` supplies the fallback; you usually need both. (The `!` in the setup is the non-null assertion — "trust me, not undefined" — which suppresses the check without proving anything. Use it sparingly; it's a hole you're punching on purpose.)
:::

## The app, handling absence honestly

:::play
```typescript
type TaskId = number;
type Status = "todo" | "doing" | "done";

interface Task {
  id: TaskId;
  title: string;
  status: Status;
  tags?: string[];
}

const tasks: Task[] = [];

function addTask(title: string, tags?: string[]): void {
  tasks.push({ id: tasks.length + 1, title, status: "todo", tags });
}

function findTask(id: TaskId): Task | undefined {
  return tasks.find((t) => t.id === id);
}

function completeTask(id: TaskId): void {
  const task = findTask(id);
  if (!task) return;          // narrow: below here, task is Task
  task.status = "done";
}

addTask("write the intro", ["urgent"]);
addTask("file the taxes");   // no tags

completeTask(1);
completeTask(99);            // no match — findTask returns undefined, handled safely

const t = findTask(1);
console.log(t?.title, "tags:", t?.tags?.length ?? 0);
// write the intro tags: 1
```
:::

Notice `completeTask` now reads cleanly: `if (!task) return;` handles the miss once, up front, and everything below it sees a plain `Task`. The compiler verified that — there is no path where `task.status` runs on an absent value.

## Recap and what's next

- JavaScript has two empties: `undefined` (language-produced — missing properties, unpassed params, `find` misses) and `null` (deliberately-written, mostly at JSON/DOM boundaries). They're distinct types. Prefer `undefined` in your own code.
- `strictNullChecks` removes `null`/`undefined` from every type unless you opt in, turning "might be absent" into a tracked fact. Without it, every reference is a potential null-deref, the C++/Java/`None` hole. It's the highest-value strict setting.
- A maybe-missing value (`Task | undefined`) can't be used until you [[narrow|narrowing]] away the absence — `if (x)`, `if (x === undefined) return`, `?.`, `??`. `?.` guards access, `??` supplies a fallback (only for null/undefined, unlike `||`).
- `tags?: string[]` is an optional property: it may be omitted, and reads as `string[] | undefined`. Maps to Python's `Optional` / `NotRequired`.

Each function we've written takes a fixed type — `findTask` works on `Task`, the array holds `Task`. But "store some things, look one up by id, list them all" isn't specific to tasks; it's a pattern. The next episode pulls it out into a reusable `Store<T>` — our first generic — and the constraint `<T extends { id: number }>` is what makes "look up by id" safe for *any* type we store, not just `Task`.
