---
title: Why TypeScript accepts that object
subtitle: Structural typing, the excess-property check, and the rule that decides what a Task is
---

## Where we pick up

`todo.ts` now has a named shape — `interface Task { id; title; done }` — and `addTask(title: string)` builds a task from a bare string. That worked, but it's limiting: a real `add` command will receive a whole object from somewhere (a parsed CLI argument, a JSON body, a test fixture), not just a title. So this episode we add a function that takes a task-shaped object:

```typescript
function addTask(input: Task): void {
  tasks.push(input);
}
```

The interesting question is not the syntax — it's *which objects TypeScript will let you pass to this function*, and the answer is the single most important rule in the type system. It is also the rule that splits the language families cleanly down the middle, with TypeScript and Python on one side and Java and C++ on the other.

## The rule: structure, not name

Here is the experiment. We never write the word `Task` on the object we pass — it's just a plain literal — and yet it's accepted:

```typescript
interface Task {
  id: number;
  title: string;
  done: boolean;
}

function addTask(input: Task): void {
  tasks.push(input);
}

const t = { id: 1, title: "write the intro", done: false };
addTask(t); // accepted — t was never declared to be a Task
```

`t` has type `{ id: number; title: string; done: boolean }` (inferred from the literal). It is accepted as a `Task` because it *has the structure* a `Task` requires: an `id: number`, a `title: string`, a `done: boolean`. TypeScript never asks "was this value declared with the type `Task`?" It asks "does this value's shape satisfy `Task`'s shape?" This is [[structural typing|structural-typing]], and it is the default and pervasive behavior of the entire system. A type is a *set of requirements about shape*; any value meeting the requirements belongs to the type, regardless of how it was created or what it was called.

You already rely on exactly this in Python, where it goes by a different name.

:::compare
```python
# Duck typing: if it has .title and .done, it works.
def add_task(input) -> None:
    tasks.append(input)

# Any object with the right attributes is fine — no class named Task required.
class Anything:
    def __init__(self):
        self.id = 1
        self.title = "x"
        self.done = False

add_task(Anything())   # works at runtime — Python never checks the name
```
```typescript
function addTask(input: Task): void {
  tasks.push(input);
}

// Any object with the right fields is fine — no class named Task required.
const t = { id: 1, title: "x", done: false };
addTask(t);            // works at compile time — TS checks shape, not name
```
:::

This is the [[deliberate-novelty|nominal-vs-structural]] callout, and it's a pleasant surprise rather than a jarring one: TypeScript's type *checking* is the static, compile-time version of Python's duck typing. Python's phrase is "if it walks like a duck and quacks like a duck, it's a duck" — decided at runtime, when you actually call `.quack()`. TypeScript decides the same way, by shape, but *before* runtime: if it has the fields a `Task` has, the checker treats it as a `Task`. Same philosophy — judge by capability, not by lineage — moved to compile time and made safe.

## Where Java and C++ diverge hard

Now the other family. Java and C++ are **nominal**: a value belongs to a type only if it was *declared* with that type (or a subtype). The name is the identity.

```java
// Java — nominal. This does NOT compile.
class Task { int id; String title; boolean done; }
class Other { int id; String title; boolean done; } // identical fields

void addTask(Task input) { /* ... */ }

addTask(new Other());  // error: Other is not a Task, despite identical shape
```

In Java, `Other` and `Task` have byte-for-byte identical fields and are still incompatible, because `Other` was never declared to *be* a `Task` (it doesn't `extends Task` or `implements` a shared interface). The name is load-bearing. C++ is the same with `struct`s: two structs with identical members are distinct types, and you cannot pass one where the other is expected without an explicit conversion. To get the TypeScript behavior in those languages you must *plan* for it — share a base class, implement a common interface, name the relationship up front.

TypeScript inverts that default. The relationship doesn't have to be planned or named; it's discovered from structure at the use site. That is why you can pass a config object, an API response, a test mock — anything shaped right — to a function expecting `Task`, without ever importing `Task` to construct it. It's also why interfaces compose so freely, which we lean on hard once we get to generics.

:::predict
`addTask` expects a `Task` (`id`, `title`, `done`). You pass an object that has all three of those fields *and one extra* — it also carries a `priority`. The object is stored in a variable first, then passed:

```typescript
const t = { id: 1, title: "x", done: false, priority: "high" };
addTask(t); // ?
```

- ( ) Rejected — `t` has a `priority` field that `Task` doesn't declare, so it's the wrong shape.
- (x) Accepted — `t` has everything `Task` requires; the extra `priority` is ignored.
- ( ) Accepted, and `priority` is added to the `Task` type for the rest of the file.
- ( ) Rejected at runtime when `tasks.push` sees the unexpected field.
:::answer
Accepted. Structural typing asks whether `t` has *at least* what `Task` requires, not whether it has *exactly* that. `t` has `id`, `title`, `done` — all three, correctly typed — so it satisfies `Task`; the extra `priority` is irrelevant to whether `t` *is a* `Task`. This is the same logic as Python duck typing: an object with extra attributes still quacks. (Inside `addTask`, the parameter's type is `Task`, so you can't *read* `input.priority` there — the type only promises the three fields — but the assignment itself is fine.) There is one notable exception to "extra fields are fine," and it's the next section.
:::

## The exception: excess-property checks on literals

The prediction above passed `t`, a *variable*. If you pass the **object literal directly**, TypeScript gets stricter, and this trips up nearly everyone:

```typescript
addTask({ id: 1, title: "x", done: false, priority: "high" });
// error TS2353: Object literal may only specify known properties,
//   and 'priority' does not exist in type 'Task'.
```

Same fields, same extra `priority`, but now it's rejected. This is the **excess-property check**, and it fires *only on fresh object literals passed directly* to a typed position. The reasoning is pragmatic, not a hole in the structural model: when you write an object literal right at the call site, an extra property is almost always a typo or a misremembered field name — exactly the episode-01 bug. There's no reason a freshly-written literal should carry a field the target type doesn't know about; you wrote it on the spot, so you meant the fields the type declares. So TypeScript treats excess properties on literals as an error, as a targeted defense against the typo class, even though pure structural typing would permit them.

The escape hatch reveals the rule precisely: assign the literal to a variable first, and the check no longer fires.

:::compare
```typescript
// Direct literal — excess-property check fires.
addTask({ id: 1, title: "x", done: false, priority: "high" });
// error TS2353: 'priority' does not exist in type 'Task'
```
```typescript
// Via a variable — only structural assignability is checked, which passes.
const t = { id: 1, title: "x", done: false, priority: "high" };
addTask(t); // ok
```
:::

The difference is whether the value is a "fresh" literal at the point of assignment. The variable `t` has a known type (`{ id; title; done; priority }`) that *includes everything Task needs*, so it's assignable; the excess-property check is a separate, literal-only pass layered on top of assignability. Knowing both rules explains nearly every "but it has all the fields, why won't it take it?" moment you'll hit. If you genuinely want the extra field, the right fix is usually to widen `Task` (it belongs in the type) — not to launder the literal through a variable, which just hides a probable typo.

## Bringing it back to the app

`addTask(input: Task)` now accepts any task-shaped object — a constructed literal, a parsed input, a value from elsewhere — and rejects anything missing a required field or, when written as a literal, carrying an unexpected one. The episode-01 typo is caught two ways now: a literal with `text` instead of `title` fails the excess-property check (`text` is unknown) *and* fails assignability (`title` is missing). The shape is enforced at the boundary, exactly where untyped data enters the app.

:::play
```typescript
interface Task {
  id: number;
  title: string;
  done: boolean;
}

const tasks: Task[] = [];

function addTask(input: Task): void {
  tasks.push(input);
}

// Structurally a Task (extra field allowed via a variable):
const incoming = { id: 1, title: "write the intro", done: false, source: "cli" };
addTask(incoming); // ok — has id, title, done

addTask({ id: 2, title: "ship it", done: false }); // ok — exact literal

console.log(tasks.length); // 2

// Try these — each fails at build time, for the reason in the comment:
// addTask({ id: 3, title: "x", done: false, source: "cli" });
//   TS2353 — excess property on a literal ('source' unknown to Task)
// addTask({ id: 4, done: false });
//   TS2741 — missing required property 'title'
```
:::

## Recap and what's next

- TypeScript is [[structurally typed|structural-typing]]: a value belongs to a type if its *shape* satisfies the type's requirements, regardless of how it was named or built. This is Python's duck typing, moved to compile time.
- Java and C++ are [[nominal|nominal-vs-structural]]: identity is the declared name, so two identically-shaped types are still incompatible. Getting TS-style compatibility there requires planning a shared base or interface.
- Extra fields are fine when a value reaches a typed slot through a variable — "has at least what's required" is the test.
- The **excess-property check** is a literal-only exception: a fresh object literal may not carry properties the target type doesn't declare, as a defense against typos. Routing through a variable bypasses it.

We've been treating `id` as just `number`. But an id is not really *any* number — it's an identifier, and mixing it up with an array index or a count is its own bug class. The next episode is about naming types: `type` aliases versus `interface`, when each is the right tool, and the unions that only `type` can express.
