---
title: When the value might not be there
subtitle: Task | undefined, strictNullChecks, optional fields — and the billion-dollar mistake, fixed at compile time
---

## Where we pick up

The app needs a lookup: given an id, find that task. But a lookup can fail — there may be no task with that id. This is the single most common shape of bug in every language with a null: you ask for a thing, you might get nothing, you forget the nothing case, and the program explodes on `task.title` when `task` is absent. Tony Hoare called the null reference his "billion-dollar mistake." This episode is TypeScript's answer to it, and it's a good one: the possibility of "nothing" becomes part of the type, and the compiler refuses to let you ignore it. Along the way the app gets `findTask`, and we finally add the optional `tags?` field we've been deferring.

## Two flavours of nothing

JavaScript, unlike Python, has *two* empty values, and the distinction matters.

- `undefined` — "this was never given a value." A missing object property, a missing function argument, an array index past the end, a function with no `return` — all produce `undefined`. It's the language's default absence.
- `null` — "intentionally empty." A value you set, deliberately, to mean "nothing here on purpose."

Python collapses both into a single `None`. JavaScript keeps them separate, and the practical convention in TypeScript is to lean on `undefined` for "absent" and reserve `null` for cases where something external (a database column, a JSON API) specifically uses null. For our lookup, "no task found" is best expressed as `undefined` — it was never there to begin with.

:::compare
```python
def find_task(tasks, id):
    for t in tasks:
        if t["id"] == id:
            return t
    return None          # one "nothing"
# type: Task | None
```
```typescript
function findTask(tasks: Task[], id: number): Task | undefined {
  for (const t of tasks) {
    if (t.id === id) return t;
  }
  return undefined;      // "nothing" — never was there
}
```
:::

`Task | undefined` is a union — episode 5's tool, here unioning a shape with the absence of a value. It reads exactly like Python's `Task | None` (or `Optional[Task]`). The type now states, in its signature, the thing every caller needs to know: *this might not return a task.* That single `| undefined` is what the rest of the episode hangs on.

## `strictNullChecks`: the flag that makes it real

Here is the setting that turns the union from documentation into enforcement. TypeScript has a compiler option, `strictNullChecks` (on by default under `strict`, which we'll formalize in episode 12). With it **off**, `null` and `undefined` are members of *every* type — you could assign `undefined` to a `number`, and `task.title` on a possibly-absent task would compile silently, reproducing the exact crash the type was meant to prevent. With it **on**, `null` and `undefined` are their own types, members of nothing unless you say so, and the compiler forces you to handle the absent case before you touch the value.

This flag is the difference between TypeScript-as-decoration and TypeScript-as-safety, and it's why the billion-dollar mistake is, in strict TypeScript, a compile error:

:::play
```typescript
interface Task {
  id: number;
  title: string;
  status: "todo" | "doing" | "done";
}

function findTask(tasks: Task[], id: number): Task | undefined {
  for (const t of tasks) {
    if (t.id === id) return t;
  }
  return undefined;
}

const tasks: Task[] = [{ id: 1, title: "exists", status: "todo" }];

const found = findTask(tasks, 1); // type: Task | undefined
console.log(found.title);         // error: 'found' is possibly 'undefined'.
```
:::

There it is. `found` is `Task | undefined`, and `found.title` is rejected — *'found' is possibly 'undefined'* — because the compiler will not let you read `.title` off a value that might be absent. This is the crash, caught before it can happen. In plain JavaScript, or in TypeScript with `strictNullChecks` off, that line runs and throws *Cannot read properties of undefined (reading 'title')* at runtime — the JavaScript cousin of Java's `NullPointerException`.

## Satisfying the compiler: narrow the nothing away

The fix is the narrowing from episode 6, now applied to absence. You rule out `undefined`, and inside the branch where it's ruled out, the type narrows from `Task | undefined` to just `Task`:

:::play
```typescript
interface Task { id: number; title: string; status: "todo" | "doing" | "done"; }

function findTask(tasks: Task[], id: number): Task | undefined {
  return tasks.find((t) => t.id === id); // Array.find is already typed Task | undefined
}

const tasks: Task[] = [{ id: 1, title: "exists", status: "todo" }];
const found = findTask(tasks, 1);

if (found) {
  // narrowed: undefined ruled out, `found` is now Task
  console.log(found.title); // ok
} else {
  console.log("no such task");
}

// or, the optional-chaining short form:
console.log(found?.title ?? "no such task");
```
:::

Two idioms, both worth knowing. The `if (found)` guard narrows by truthiness — `undefined` is falsy, so inside the `if`, `found` is provably a `Task` and `.title` is legal. (Built-in `Array.prototype.find` is already typed to return `Task | undefined`, which is why we can lean on it rather than hand-writing the loop.)

The second idiom is the shorthand. `found?.title` is **optional chaining**: if `found` is `null` or `undefined`, the whole expression short-circuits to `undefined` instead of throwing; otherwise it reads `.title`. And `?? "no such task"` is the **nullish coalescing** operator: it supplies a fallback *only* when the left side is `null` or `undefined`. Together they express "the title if there is one, otherwise a fallback" in one line. The Python analogue of `?.` is roughly `task.title if task is not None else None`; `??` is close to `x if x is not None else fallback` — and note `??` is deliberately *not* `||`, because `||` would also replace `0`, `""`, and `false`, while `??` triggers only on null/undefined. That distinction matters the moment a valid value can be falsy.

:::predict
`count` can be `0`, and `0` is a real, valid count. What does each line produce?

```typescript
const count: number | undefined = 0;
const a = count || 10;   // ?
const b = count ?? 10;   // ?
```

- ( ) Both `10` — `0` is absent, so both fall back.
- ( ) Both `0` — neither operator treats `0` as absent.
- (x) `a` is `10`, `b` is `0` — `||` falls back on falsy `0`, `??` only on null/undefined.
- ( ) `a` is `0`, `b` is `10` — `??` is the one that falls back on `0`.
:::answer
`a` is `10`, `b` is `0`. `||` falls back whenever the left side is *falsy*, and `0` is falsy, so `count || 10` wrongly discards the genuine count of `0` and yields `10`. `??` falls back *only* when the left side is `null` or `undefined`; `0` is neither, so `count ?? 10` correctly keeps `0`. This is precisely why `??` was added to the language: for "use this unless it's truly absent," `||` is a bug whenever `0`, `""`, or `false` are valid values. Reach for `??` for null/undefined fallbacks; reach for `||` only when you really do want all falsy values replaced. A Python dev should read `??` as `x if x is not None else fallback`, not as `x or fallback`.
:::

## Optional fields: `tags?`

Now the field we've deferred. The app's spec gives `Task` an optional `tags` and an optional `createdAt`. "Optional" means the field may be entirely absent from the object — not present-but-null, but missing. You mark it with `?` after the field name, and the field's type becomes `T | undefined` automatically:

:::play
```typescript
interface Task {
  id: number;
  title: string;
  status: "todo" | "doing" | "done";
  createdAt?: number;   // optional — may be absent
  tags?: string[];      // optional — may be absent
}

const a: Task = { id: 1, title: "no tags", status: "todo" };            // ok — optionals omitted
const b: Task = { id: 2, title: "tagged", status: "doing", tags: ["urgent"] };

// Reading an optional field gives you `T | undefined`, so you must handle absence:
function tagCount(t: Task): number {
  return t.tags?.length ?? 0; // tags might be undefined → optional chain + fallback
}

console.log(tagCount(a)); // 0  — no tags field at all
console.log(tagCount(b)); // 1
```
:::

`tags?: string[]` declares that `tags` may be omitted. `a` leaves it out entirely and is still a valid `Task`; `b` includes it. The cost is symmetric with the benefit: because the field might be absent, *reading* it gives `string[] | undefined`, so `t.tags.length` would be rejected — you must narrow first, which `t.tags?.length ?? 0` does in one line. This is the same discipline as the lookup: the type records the possibility of absence, and the compiler makes you account for it everywhere you touch the value. There's a subtlety worth flagging — optional `tags?: string[]` (may be *missing*) is subtly different from `tags: string[] | undefined` (must be *present*, but may be the value `undefined`); the `?` form lets you omit the key, the union form requires the key to exist. For data shapes you almost always want `?`.

## The callback: this is what `isTask` had to do by hand

Episode 2's `isTask` faced absence too, and handled it crudely. When it read `value.id`, if the field was missing, `value.id` was `undefined`, and `typeof undefined !== "number"` returned `false` — so the checker happened to reject missing fields, but only as a side effect of the `typeof` test, with no way to express "this field is *allowed* to be missing." To make a field optional in the hand-checker you'd add a special case: *skip the guard if the field is absent, but if present, check its type.* Tedious, and easy to get wrong. The `?` modifier is that special case, declared once, enforced everywhere — and it threads through to *reads*, forcing every consumer to handle the `| undefined`, which `isTask` could never compel. The union `Task | undefined` from `findTask` is the same idea at the function-result level: absence made explicit in the type, narrowed away before use.

## The contrast: Optional/None, nullptr, NullPointerException

:::compare
```python
from typing import Optional

def find_task(tasks, id) -> Optional["Task"]:
    return next((t for t in tasks if t["id"] == id), None)

t = find_task(tasks, 1)
print(t["title"])   # AttributeError/TypeError at RUNTIME if t is None
                    # mypy warns only if you run it
```
```typescript
function findTask(tasks: Task[], id: number): Task | undefined {
  return tasks.find((t) => t.id === id);
}
const t = findTask(tasks, 1);
t.title;            // COMPILE error — must narrow first
```
:::

The spectrum is instructive. **Python**: `Optional[Task]` is `Task | None`; the type checker (`mypy`/pyright) will warn about an unguarded access, but it's opt-in tooling, and the language itself happily runs `None.title` until it raises at runtime. **C++**: a raw pointer can be `nullptr`, and dereferencing it is undefined behaviour — not even a guaranteed crash, but potentially silent corruption; modern C++ reaches for `std::optional<T>` to make absence explicit, much like our union, but the compiler doesn't force you to check it. **Java**: a null reference dereference throws `NullPointerException` at runtime, the single most common Java exception; `Optional<T>` exists to make absence visible in signatures but, again, the compiler doesn't force the check. TypeScript with `strictNullChecks` is stricter than all three: absence is a distinct type, it's part of the value's type whenever it's possible, and the compiler *refuses to compile* an unguarded access. The billion-dollar mistake isn't merely documented here — it's structurally unreachable, as long as the value's origin is inside the type system.

That caveat is the now-familiar one. `strictNullChecks` protects values the compiler can see. A `JSON.parse` result, a database row, a `fetch` response — those arrive as `any` or get asserted into a type, and a `null` hiding in them sails right past, because the compiler was never shown the real runtime value. The boundary check from episode 2 still owns that case.

:::quiz
Under `strictNullChecks`, `findTask` returns `Task | undefined` and the compiler blocks `found.title`. A developer "fixes" the error by writing `found!.title` (with the non-null assertion `!`). What does `!` do, why does it make the error disappear, and when is using it here a genuine bug waiting to happen?
:::answer
The postfix `!` is the **non-null assertion operator**: it tells the compiler "trust me, this value is not `null` or `undefined`," stripping those from the type without any runtime check. So `found!.title` makes the compile error vanish because you've *asserted* `found` is a `Task` — but you've asserted it, not proven it. If `findTask` actually returns `undefined` (the id wasn't found), `found!.title` compiles cleanly and then throws *Cannot read properties of undefined* at runtime — the exact billion-dollar crash, now re-enabled by hand. `!` is an override of the safety check, not a satisfaction of it; it's the `strictNullChecks` equivalent of reaching for `any`. It's occasionally justified when *you* hold knowledge the compiler can't (e.g. you just pushed an element and know the array is non-empty), but using it to silence the `findTask` result — where absence is genuinely possible — trades a compile error you can see for a runtime crash you can't. The honest fix is to narrow with `if (found)` or handle the `undefined` with `?.` / `??`, which prove the value is present rather than asserting it.
:::

## Recap

- A lookup that can miss returns `Task | undefined` — a union of the shape with absence. JavaScript has two "nothings": `undefined` (never set) and `null` (intentionally empty); prefer `undefined` for "absent."
- **`strictNullChecks`** (part of `strict`) makes `null`/`undefined` distinct types that aren't members of every type, so the compiler **forces** you to handle absence before touching a value — turning the billion-dollar mistake into a compile error.
- Handle it by **narrowing**: `if (found) { ... }`, or the shorthands `?.` (optional chaining) and `??` (nullish coalescing). `??` falls back only on null/undefined, not on falsy `0`/`""`/`false` — unlike `||`.
- Optional fields use `?`: `tags?: string[]` may be omitted, and reading it yields `string[] | undefined`, forcing a narrow at every read. This is `isTask`'s ad-hoc "skip-if-missing" logic, declared once.
- Contrast: Python `Optional`/`mypy` and C++ `std::optional` make absence visible but don't force the check; Java throws `NullPointerException` at runtime. Strict TypeScript forbids the unguarded access at compile time — and `!` (non-null assertion) is the escape hatch that re-enables the crash.

Next episode: the app's data is well-typed, but the `Store` holding it is hardcoded to `Task`. We make it reusable over *any* type with an id — `class Store<T extends { id: number }>` — and that callback writes itself: a *generic* checker is one that takes the shape as a parameter, which is exactly what `<T>` is.
