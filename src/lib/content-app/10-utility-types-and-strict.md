---
title: Utility types and the strict capstone
subtitle: Partial, Pick, Omit, Record, turning on full strict, and the bugs types still can't catch
---

## Where we pick up

The app is complete and typed, twice over. One verb is still missing: `edit`. A user should be able to change a task's title, or its status, or its tags — any subset of fields, in one call. Typing that naively means a parameter shape with every field marked optional, which is `Task` written out again with `?` on each line. That's duplication, and it drifts: add a field to `Task` and you have to remember to add it here too. This episode's first job is the utility type that derives that shape automatically:

```typescript
function editTask(id: TaskId, patch: Partial<Task>): void {
  const task = tasks.get(id);
  if (!task) return;
  Object.assign(task, patch);
}
```

`Partial<Task>` is `Task` with every property made optional — *computed from `Task`*, not hand-written. Then we turn on the full `strict` config, ship the app, and spend the back half on the honest counterpoint to the whole course: the bugs that types, by construction, cannot catch.

## Utility types: transformations over types

TypeScript ships a set of built-in generic types that *transform* one type into another at compile time. They're functions whose inputs and outputs are types. The four you'll use constantly:

```typescript
Partial<Task>  // every property optional
Pick<Task, "id" | "title">  // only the listed properties
Omit<Task, "id">  // all properties except the listed ones
Record<string, Task>  // an object type with string keys and Task values
```

`Partial<Task>` makes `editTask` honest and DRY: the patch can carry any subset of `Task`'s fields, and if you add a field to `Task` later, `Partial<Task>` picks it up for free — no second edit. `Pick` and `Omit` carve subsets — `Pick<Task, "id" | "title">` is the type `{ id: TaskId; title: string }`, useful for a function that only needs part of a task; `Omit<Task, "id">` is everything but the id, the natural shape for "data to create a task, before it has an id." `Record<K, V>` is the typed dictionary we used for the command table in episode 08.

The Python anchors exist but are weaker, and the gap is the point:

:::compare
```python
# Partial: closest is total=False or all-NotRequired — but you write it out,
# Python can't *derive* it from an existing TypedDict in stdlib.
from typing import TypedDict, NotRequired

class TaskPatch(TypedDict):
    title: NotRequired[str]
    status: NotRequired[str]
    tags: NotRequired[list[str]]

# Record: dict[str, Task]
Registry = dict[str, "Task"]
```
```typescript
type TaskPatch = Partial<Task>;        // derived, not rewritten
type Registry = Record<string, Task>;  // dict[str, Task]
```
:::

`Record<string, Task>` is just `dict[str, Task]` — a flat mapping. But `Partial<Task>` has no clean Python equivalent: to get "all fields of `Task`, optional" in Python you re-declare every field with `NotRequired`, and the two definitions can drift apart. TypeScript *computes* `Partial<Task>` from `Task`, so they cannot drift — change `Task` and `Partial<Task>` changes with it. This is your first real taste of the **type-level language**: these utilities are written *in* the type system using [[mapped types|mapped-types]] (`Partial` is, roughly, "for each key `K` in `Task`, make `K` optional"), and you can write your own. That machinery — mapped types, [[conditional types|conditional-types]], `keyof`, [[infer|infer]] — is a programming language that runs at compile time over types, and it's the subject of a whole separate course. For now, know the four built-ins and that they're derived, not magic.

:::predict
`editTask(id: TaskId, patch: Partial<Task>)`. Which of these calls type-check?

```typescript
editTask(1, { status: "done" });              // a
editTask(1, {});                                // b
editTask(1, { title: "new", tags: ["x"] });    // c
editTask(1, { status: "shipped" });             // d
editTask(1, { priority: "high" });              // e
```

- ( ) Only `a` and `c` — a patch must change exactly one field.
- (x) `a`, `b`, and `c` type-check; `d` and `e` are errors.
- ( ) All five — `Partial` makes every field optional, so anything goes.
- ( ) Only `c` — a patch must include `title`.
:::answer
`a`, `b`, and `c` type-check; `d` and `e` fail. `Partial<Task>` makes every field *optional*, so any subset is valid — including the empty object `{}` (b), a single field (a), or several (c). But `Partial` only relaxes *presence*, never *type*: a present field must still match `Task`'s type for that field. So **d** fails because `"shipped"` isn't a member of `Status` (`"todo" | "doing" | "done"`) — `error TS2322`. And **e** fails the excess-property check (episode 03) — `priority` isn't a key of `Task` at all, so it isn't a key of `Partial<Task>` either. `Partial` weakens "must be there" to "may be there"; it does not weaken "must be the right type" or "must be a known field."
:::

## The strict capstone

We've been running under `strict` the whole time (the Playground does, and episode 06 leaned on `strictNullChecks`). Shipping the app means making that explicit in `tsconfig.json` rather than relying on a default. The single flag that matters most is `strict`, which switches on the whole family at once:

```json
{
  "compilerOptions": {
    "strict": true,
    "noUncheckedIndexedAccess": true,
    "noImplicitOverride": true,
    "target": "ES2022",
    "module": "ESNext",
    "moduleResolution": "bundler",
    "noEmit": true
  }
}
```

`"strict": true` is not one check but a bundle: `strictNullChecks` (episode 06 — absence is in the type), `noImplicitAny` (episode 01 — no untyped parameters), `strictFunctionTypes`, `strictBindCallApply`, and more. Turning it on as a bundle is the recommendation; turning the pieces on individually is for migrating a large untyped codebase gradually. Two extras earn their place: `noUncheckedIndexedAccess` makes `array[i]` return `T | undefined` (so an out-of-bounds read is typed as maybe-missing — the Playground uses this, which is why episode 07's `get` and array indexing have stayed honest), and it's the setting that most closely matches the paranoia the whole course has been building toward. Start every new project with `strict: true`; it's the difference between TypeScript catching the bugs this course promised and TypeScript shrugging the way episode 01's untyped JavaScript did. `mypy --strict` is the exact parallel, and the same advice applies there.

## The honest part: what types cannot catch

Here is the counterweight to ten episodes of "the compiler caught it." TypeScript's types are [[erased|type-erasure]] before runtime — episode 01's foundational fact — and that erasure has a hard consequence: **any bug that depends on a runtime value, rather than a static shape, is invisible to `tsc`.** Four classes you must still guard by hand:

- **`JSON.parse` returns `any`.** Data crossing the boundary from outside — a file, an HTTP response, `localStorage` — arrives as `any`, the type that disables checking. `const task: Task = JSON.parse(input)` compiles and is a *lie*: nothing verified that `input` actually has the `Task` shape, so a malformed payload sails straight in, exactly the episode-01 bug re-entering through the front door. The fix is runtime validation at the boundary — a hand-written check, or a schema library like [[zod|zod]] that validates *and* derives the type, so the static type and the runtime check can't disagree.
- **`===` vs `==`.** TypeScript types both, but the *behavior* is a runtime trap: `==` does [[coercion|coercion]] (`0 == ""` is `true`, `null == undefined` is `true`), `===` does not. Types won't stop you writing `==`; use `===` everywhere except the single deliberate `x == null` idiom (episode 06).
- **In-place mutation.** `const task = tasks.get(1); task!.status = "done"` mutates the stored object, and any other reference to it sees the change. The type system tracks *shapes*, not *aliasing* or *when* a mutation happens — a `readonly` modifier helps at compile time but erases, and shared mutable state is a logic bug types won't flag.
- **Types vanish at runtime.** You cannot ask "is this value a `Task`?" at runtime, because `Task` doesn't exist then (episode 07's erasure). `value instanceof Task` won't even compile — `Task` is an interface. Runtime type decisions need a runtime tag (a discriminant field, episode 05) or a validator, never the type itself.

:::quiz
This compiles cleanly under full `strict` and is still wrong. Where is the bug, and why can't `tsc` catch it?

```typescript
function loadTasks(json: string): Task[] {
  const data = JSON.parse(json);   // data: any
  return data;
}

const tasks = loadTasks('[{ "id": 1, "titel": "oops", "status": "todo" }]');
console.log(tasks[0].title.toUpperCase()); // ?
```
:::answer
The bug is `"titel"` — a typo for `"title"` — in the JSON string, and `tsc` cannot catch it for a precise reason: `JSON.parse` returns `any`, so `data` is `any`, and `return data` as `Task[]` is accepted without any shape check because `any` is assignable to everything. The function's signature *claims* `Task[]`, but nothing verified the claim — the type annotation is a promise the code never kept. At runtime `tasks[0].title` is `undefined` (the object has `titel`, not `title`), and `.toUpperCase()` throws `TypeError: Cannot read properties of undefined` — the *exact* failure mode from episode 01, now re-entering through the data boundary that types don't guard. This is the whole lesson of the episode: types check the *shape of your code*, not the *content of runtime data*, and the boundary where untyped data enters (`JSON.parse`, `fetch`, form input, `localStorage`) is precisely where you must add a runtime check. The honest fix is to validate `data` against the `Task` shape before returning it — by hand, or with [[zod|zod]], which validates the runtime value *and* produces the type from one schema so the two can never drift. Types are a powerful tool that ends exactly at the edge of the program; past that edge, you're back to checking values yourself.
:::

## The finished app

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

function addTask(title: string, ...tags: string[]): void {
  tasks.add({ id: nextId++, title, status: "todo", tags: tags.length ? tags : undefined });
}
function editTask(id: TaskId, patch: Partial<Task>): void {
  const task = tasks.get(id);
  if (!task) return;                 // episode 06 — narrow the maybe-missing
  Object.assign(task, patch);        // patch is a checked subset of Task
}
function label(status: Status): string {
  switch (status) {
    case "todo": return "To do";
    case "doing": return "In progress";
    case "done": return "Done";
    default: { const _: never = status; return _; } // episode 05 — exhaustive
  }
}

addTask("write the intro", "urgent");
editTask(1, { status: "done" });     // Partial<Task>: any valid subset
console.log(tasks.all().map((t) => `${t.id}. [${label(t.status)}] ${t.title}`));
// [ '1. [Done] write the intro' ]
```
:::

Every type we built is in there: the `Status` union with its exhaustive `label`, the optional `tags`, the generic `Store<Task>`, the maybe-missing `get`, and now `Partial<Task>` for edits. That's the spine the course set out to grow, finished.

## Recap, and where to go next

- Utility types **transform** types at compile time: `Partial<T>` (all optional), `Pick<T, K>` / `Omit<T, K>` (subsets), `Record<K, V>` (typed dictionary). `Partial<Task>` makes `editTask` DRY and drift-proof — it's *derived* from `Task`, which Python's `TypedDict` can't do. They relax *presence*, never *type*.
- `"strict": true` bundles the high-value checks (`strictNullChecks`, `noImplicitAny`, …); add `noUncheckedIndexedAccess`. Start every project with it — it's `mypy --strict`, and it's the line between catching bugs and shrugging at them.
- Types are erased, so they **cannot** catch runtime-value bugs: `JSON.parse` returns `any` (validate boundaries, e.g. with [[zod|zod]]), `==` coerces (use `===`), in-place mutation and aliasing are logic bugs, and there's no runtime "is this a `Task`?" Types check the shape of your *code*, not the content of your *data*.

You now have the practical command of TypeScript this course set out to give: enough to type a real app, end to end, under `strict`, and to know exactly where the type system stops and runtime validation must begin. The one question we kept deferring — *how* does `tsc` actually decide all this, what algorithm unifies a generic, what makes structural assignability decidable, why can the compiler compute `Partial<Task>` — is its own subject. That's the "How Types Really Work" course: the same mental model from the inside, building toward the [[Hindley–Milner|hindley-milner]] core and the type-level language the utility types are written in. You've used the tools; next you can see the machine.
