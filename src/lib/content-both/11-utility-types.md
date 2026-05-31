---
title: Types computed from other types
subtitle: Partial, Pick, Omit, Record — and editTask(id, patch: Partial<Task>)
---

## Where we pick up

The app needs an edit operation. You pass an id and *some* fields to change — a new title, or a new status, not necessarily both — and the task updates. The question is: what's the type of that "some fields" argument? It's not `Task` (that would demand every field). It's not a hand-written `{ title?: string; status?: ...; ... }` (that's `Task` retyped with `?` on every field, which drifts out of sync the moment `Task` changes). It's `Partial<Task>` — a type *computed from* `Task`, with every field made optional, derived automatically. This episode is about that move: types built from other types. `Partial`, `Pick`, `Omit`, and `Record` are the four you'll reach for constantly, and they're the type-level descendants of the field-by-field checking we did by hand in episode 2.

## `Partial<T>`: every field optional

`Partial<T>` takes a type and produces a copy with every field marked optional (`?`). It's exactly what an edit patch needs: a subset of a task's fields.

:::play
```typescript
interface Task {
  id: number;
  title: string;
  status: "todo" | "doing" | "done";
  tags?: string[];
}

// Partial<Task> is { id?: number; title?: string; status?: ...; tags?: string[] }
function editTask(tasks: Task[], id: number, patch: Partial<Task>): boolean {
  const task = tasks.find((t) => t.id === id);
  if (!task) return false;
  Object.assign(task, patch); // merge the provided fields over the existing ones
  return true;
}

const tasks: Task[] = [{ id: 1, title: "old title", status: "todo" }];

editTask(tasks, 1, { title: "new title" });        // ok — just the title
editTask(tasks, 1, { status: "doing" });           // ok — just the status
editTask(tasks, 1, { title: "both", status: "done" }); // ok — several fields
// editTask(tasks, 1, { status: "later" });        // error: "later" not assignable
// editTask(tasks, 1, { titel: "typo" });          // error: 'titel' not in Partial<Task>

console.log(tasks[0]);  // { id: 1, title: "both", status: "done" }
```
:::

`patch: Partial<Task>` accepts any subset of a task's fields — title alone, status alone, several at once — but each field it *does* carry is still checked against `Task`'s real types. Pass `status: "later"` and it's rejected, because `Partial` made `status` optional but kept its type as the `Status` union. Misspell `titel` and the excess-property check (episode 4) flags it. So `Partial<Task>` is precisely "some of a task, correctly typed" — exactly the patch semantics you want, and it's *derived*: change `Task` and `Partial<Task>` updates with it, automatically, with no second definition to maintain. This is Python's `class Task(TypedDict, total=False)` — a TypedDict with all keys optional — except computed on demand from the full type rather than declared as a separate class.

The mechanism, worth glimpsing: `Partial` isn't a special built-in keyword, it's an ordinary type defined in the standard library as `type Partial<T> = { [K in keyof T]?: T[K] }` — a [[mapped type]] that walks every key `K` of `T` and re-emits it with `?` added. You can read that as a type-level `for` loop over the fields. The classic course builds these from scratch; here, just register that `Partial` is *computed*, not magic.

## `Pick<T, K>` and `Omit<T, K>`: choosing fields

Sometimes you want *named* fields, not all-optional ones. `Pick<T, K>` keeps only the keys you list; `Omit<T, K>` keeps everything *except* the keys you list. They're complements.

:::play
```typescript
interface Task {
  id: number;
  title: string;
  status: "todo" | "doing" | "done";
  tags?: string[];
}

// Pick: only id and title.
type TaskSummary = Pick<Task, "id" | "title">;
// = { id: number; title: string }

// Omit: everything except id (the shape you submit when CREATING a task —
// the id is assigned by the store, not the caller).
type NewTask = Omit<Task, "id">;
// = { title: string; status: ...; tags?: string[] }

const summary: TaskSummary = { id: 1, title: "just these two" };
const draft: NewTask = { title: "no id yet", status: "todo" };

console.log(summary, draft);
```
:::

`Pick<Task, "id" | "title">` produces `{ id: number; title: string }` — only the two named fields, with their original types intact. `Omit<Task, "id">` produces a task *without* its id — exactly the shape a caller provides when creating a task, since the store assigns the id. These are the two everyday tools for reshaping: `Pick` when you want a small named subset (a summary, a list-row projection), `Omit` when you want "the whole thing minus a few fields" (a create-payload, a public view with secrets removed). Both are derived from `Task`, so both track changes to it. And the key argument is *checked*: `Pick<Task, "titel">` is an error, because `"titel"` isn't a key of `Task` — the same `keyof` mechanism from generics, here gating which fields you may select.

:::predict
Given `interface Task { id: number; title: string; status: Status; tags?: string[] }`, what is the resulting shape of each?

```typescript
type A = Pick<Task, "id" | "status">;
type B = Omit<Task, "tags" | "status">;
```

- ( ) `A` = `{ id?: number; status?: Status }`; `B` = `{ title?: string; id?: number }`
- (x) `A` = `{ id: number; status: Status }`; `B` = `{ id: number; title: string }`
- ( ) `A` = the full `Task`; `B` = `{ tags?: string[]; status: Status }`
- ( ) Both are errors — you can't `Pick`/`Omit` a union-typed field.
:::answer
`A` = `{ id: number; status: Status }`; `B` = `{ id: number; title: string }`. `Pick<Task, "id" | "status">` keeps exactly those two keys with their original types and *original optionality* — neither was optional in `Task`, so neither is here (`Pick` doesn't add `?`; that's `Partial`'s job). `Omit<Task, "tags" | "status">` removes `tags` and `status`, leaving `id` and `title`. Note `Omit` happily removes the optional `tags` and the union-typed `status` — it operates on keys, indifferent to a field's type or optionality. The two are exact complements: `Pick` names what to *keep*, `Omit` names what to *drop*, and for the same `T` they partition the fields. Both are computed from `Task`, so adding a field to `Task` flows into `B` (it'd appear, since `B` only excludes two named keys) but not into `A` (which only includes two named keys) — a subtle but useful asymmetry when you choose between them.
:::

## `Record<K, V>`: an object type from keys and a value type

`Record<K, V>` builds an object type whose keys are `K` and whose values are all `V`. We already used it in episode 9 — `Record<string, Command>`, "an object mapping any string to a `Command`." It's the type-level equivalent of Python's `dict[K, V]`, but with a twist: `K` can be a *union of literals*, giving you a type that requires *exactly* those keys.

:::play
```typescript
type Status = "todo" | "doing" | "done";

// A count for every status — Record with literal-union keys requires ALL of them.
type StatusCounts = Record<Status, number>;
// = { todo: number; doing: number; done: number }

function countByStatus(tasks: { status: Status }[]): StatusCounts {
  const counts: StatusCounts = { todo: 0, doing: 0, done: 0 }; // must init all three
  for (const t of tasks) counts[t.status]++;
  return counts;
}

console.log(countByStatus([{ status: "todo" }, { status: "todo" }, { status: "done" }]));
// { todo: 2, doing: 0, done: 1 }
```
:::

`Record<Status, number>` produces `{ todo: number; doing: number; done: number }` — one numeric field per status, *all required*. That's the exhaustiveness theme from episode 6 reappearing in object form: omit `doing` from the initializer and the compiler complains the key is missing, so you can't forget a status. With a `string` key (`Record<string, Command>`) it's an open dictionary like Python's `dict[str, V]`; with a literal-union key it's a closed, complete mapping. Both from one tool.

## The callback: this is `isTask`, recomputed instead of rewritten

Return to episode 2. To check a "task without an id" (a create payload) or "just id and title" (a summary), you'd have hand-written a *new* checker for each — `isNewTask`, `isTaskSummary` — duplicating the field guards with different subsets. Every variant of the shape meant another hand-coded function, and every change to `Task` meant updating all of them in lockstep or letting them drift.

Utility types are that situation solved at the type level. `Omit<Task, "id">`, `Pick<Task, "id" | "title">`, `Partial<Task>` are the *same shape variants* you'd have hand-built, but **computed from `Task`** instead of rewritten. Change `Task` — add a field, retype `status` — and every derived type updates automatically, because each is a function *of* `Task`, not a copy *of* it. The single source of truth is `Task`; everything else is derived. This is the final form of the lesson that started with one hand-written `isTask`: don't write the shape *n* times, write it once and compute the variations. The hand-built checker could only be copied; the type can be transformed.

There's the now-ritual honesty note. All of this is compile-time and [[erased|type-erasure]]. `Partial<Task>` does not exist at runtime; `Object.assign(task, patch)` in `editTask` runs on plain objects with no type checking. If `patch` arrived from outside the program — an HTTP request body for an edit endpoint — `tsc` guarantees nothing about it, and you'd validate it at the boundary with a runtime checker, the one job that has belonged to `isTask` since episode 2 and still does.

:::quiz
`editTask` takes `patch: Partial<Task>`. Why is `Partial<Task>` the right type rather than (a) `Task`, (b) a hand-written `{ title?: string; status?: Status }`, or (c) `Record<string, unknown>`? What does each alternative get wrong?
:::answer
`Partial<Task>` is "any subset of a task's fields, each correctly typed," which is exactly patch semantics. The alternatives each fail differently. **(a) `Task`** would *require every field* on every edit — you couldn't change just the title without also supplying `id`, `status`, and so on, which defeats the point of a patch. **(b) the hand-written `{ title?: string; status?: Status }`** works today but is a *second, manually-maintained copy* of part of `Task`: it omits `id` and `tags` (maybe deliberately, maybe by oversight), and the day someone adds a field to `Task` or retypes `status`, this literal silently drifts out of sync — the exact "rewrite the shape *n* times" problem utility types exist to kill. **(c) `Record<string, unknown>`** is too loose: it accepts *any* string key with *any* value, so `{ titel: "typo" }` and `{ status: 42 }` both pass, throwing away all the field-name and field-type checking — it's barely better than `any`. `Partial<Task>` threads the needle: optional like a patch, exact field names (typos rejected), exact field types (`status: "later"` rejected), and *derived* from `Task` so it never drifts. It's the computed, single-source-of-truth version of the patch shape you'd otherwise hand-maintain.
:::

## Recap

- Utility types are types **computed from other types**, keeping a single source of truth instead of rewriting shapes by hand.
- **`Partial<T>`** — every field optional. The right type for an edit patch: `editTask(id, patch: Partial<Task>)` accepts any subset, each field still type-checked. (Python: `TypedDict(total=False)`.)
- **`Pick<T, K>`** keeps only the named keys; **`Omit<T, K>`** keeps all but the named keys. Complements — `Pick` for summaries/projections, `Omit` for create-payloads (`Omit<Task, "id">`). Keys are `keyof`-checked, so typos are errors.
- **`Record<K, V>`** builds an object type from keys and a value type. `Record<string, V>` is an open dictionary (`dict[str, V]`); `Record<Status, V>` with literal-union keys is a *closed, complete* mapping requiring every key — exhaustiveness in object form.
- **The callback:** these are `isTask`'s shape-variants (`isNewTask`, `isTaskSummary`) *computed* from `Task` instead of hand-rewritten, all tracking `Task` automatically. Still erased — boundary input still needs a runtime check.

Next episode, the capstone: we turn on the full `strict` tsconfig that's been implied throughout, walk the JavaScript-reality gotchas that types *don't* save you from (`===`, mutation, `JSON.parse` returning `any`, types vanishing at runtime), and land the final callback — the runtime guard we deleted in episode 3 is exactly the bug class types can't catch, at the I/O boundary. Then we ship it.
