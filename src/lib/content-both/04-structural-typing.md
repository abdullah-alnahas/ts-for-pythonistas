---
title: Why tsc accepts that shape
subtitle: Structural typing, excess-property checks, and why your hand-checker already worked this way
---

## Where we pick up

We ended episode 3 with the app's first real type and an unanswered question. We wrote `interface Task`, then pushed a plain object literal into a `Task[]` — and `tsc` accepted it, even though we never wrote the word `Task` anywhere near that literal. No `new Task(...)`, no `: Task` on the object, no class, no constructor. The object just *was* a task, as far as the compiler was concerned, because it had the right fields.

That is not an accident or a convenience. It is the single deepest design decision in TypeScript's type system, the one that diverges hardest from Java and C++, and the one that — pleasingly — your hand-built checker already obeyed without you deciding it should. It's called [[structural typing]], and this episode is about why it works the way it does.

## The thing that needs explaining

Here is the situation, stripped down:

```typescript
interface Task {
  id: number;
  title: string;
  status: "todo" | "doing" | "done";
}

const t: Task = { id: 1, title: "write", status: "todo" }; // accepted — but why?
```

`{ id: 1, title: "write", status: "todo" }` is just an object literal. It has no connection to the name `Task`. Yet `tsc` is happy to call it a `Task`. The rule behind this: **TypeScript decides whether a value is a `Task` by looking at its shape, not its name.** If a value has a `number` `id`, a `string` `title`, and a valid `status` — if its structure matches what `Task` requires — then it *is* a `Task`, regardless of where it came from or what it's called. The type is the structure. This is [[structural typing|nominal-vs-structural]].

## Your hand-checker already did this

Look back at `isTask` from episode 2. What did it check? It read `value.id`, `value.title`, `value.status`, and asked whether each was the right kind. What did it *not* check? It never asked "was this object created by a `Task` constructor?" It never asked "is this object *named* a task?" It couldn't — runtime values don't carry that information, and even if they did, `isTask` didn't look. It looked only at the fields. **Your hand-checker decided membership by structure, because at runtime structure is all there is.** An object is a bag of fields; the checker inspects the fields.

So when `tsc` accepts an unnamed literal as a `Task`, it is doing exactly what `isTask` did: judging by shape. The compiler version is more powerful — it proves the shape statically, across all code paths — but the *criterion* is identical. This is the first of the callbacks the course is built on: structural typing isn't a strange new rule you have to memorize. It's the rule your own checker followed the moment you wrote `value.id`, `value.title`, `value.status` and checked nothing else.

:::compare
```python
# Python's duck typing: this works if `t` has the fields, regardless of its class
def title_of(t):
    return t["status"], t["title"]   # never asks "are you a Task?"
```
```typescript
// Structural typing: anything with the right shape IS a Task
function titleOf(t: Task): string {
  return `[${t.status}] ${t.title}`; // never asks "were you constructed as a Task?"
}
```
:::

A Python developer already lives in a structural world. Duck typing — "if it walks like a duck" — is structural typing without the static check: a function that does `t["title"]` works on anything that has a `title`, irrespective of class. TypeScript is duck typing *that the compiler verifies ahead of time*. Same philosophy — judge by what an object can do and what fields it has, not by its lineage — but checked before the program runs instead of discovered when it crashes.

## The contrast that sharpens it: Java and C++ are nominal

This is where it helps to look at a language that does the opposite, because the contrast makes the choice visible. Java and C++ are [[nominal|nominal-vs-structural]]: a value's type is determined by the *name* it was declared or constructed with, and two types with identical fields are still different types if they have different names.

In Java, if you have `class Task { int id; String title; }` and `class Ticket { int id; String title; }` — byte-for-byte identical fields — a `Ticket` is *not* a `Task` and never will be. You cannot pass a `Ticket` where a `Task` is expected, no matter how perfectly its shape matches, unless `Ticket` explicitly `extends Task` or `implements` a shared interface. The name, and the declared inheritance, is the type. C++ is the same for class types: identical layout, different name, incompatible. The relationship has to be declared by hand.

TypeScript flatly rejects that. There is no declaration of kinship needed. Two interfaces with the same fields are the same type; an object with the right fields satisfies an interface it has never heard of. Define a `Ticket` interface with `id: number; title: string; status: ...` and a `Ticket` value is freely usable as a `Task`, because structurally it *is* one:

:::play
```typescript
interface Task {
  id: number;
  title: string;
  status: "todo" | "doing" | "done";
}

// A completely separate interface. Never mentions Task.
interface Ticket {
  id: number;
  title: string;
  status: "todo" | "doing" | "done";
}

function describe(t: Task): string {
  return `#${t.id} ${t.title} [${t.status}]`;
}

const ticket: Ticket = { id: 7, title: "from another module", status: "doing" };
console.log(describe(ticket)); // works — Ticket's shape matches Task's, so it IS a Task
```
:::

In Java that call wouldn't compile; here it's not even interesting to the compiler. This has a real practical payoff: you can write a function that accepts `{ id: number }` and pass it *anything* with a numeric `id` — a `Task`, a `User`, a config object — without those types being made to share an ancestor. We lean on exactly this in episode 8, where a generic `Store` accepts any type "with an `id`," structurally, no inheritance required.

:::predict
`logId` accepts anything with a numeric `id`. Which of these calls compile?

```typescript
function logId(x: { id: number }): void {
  console.log(x.id);
}

const task = { id: 1, title: "t", status: "todo" };
const user = { id: 99, name: "Ada", email: "a@b.c" };
const thing = { name: "no id here" };

logId(task);  // ?
logId(user);  // ?
logId(thing); // ?
```

- ( ) Only `logId(task)` — `logId`'s parameter shape was clearly written for tasks.
- ( ) None — the argument types must be declared to match `{ id: number }` by name.
- (x) `logId(task)` and `logId(user)` compile; `logId(thing)` is rejected.
- ( ) All three — TypeScript ignores extra and missing fields on variables.
:::answer
`logId(task)` and `logId(user)` compile; `logId(thing)` is rejected. The parameter requires *at least* a `number` `id`. `task` and `user` each have one (plus extra fields, which is fine — having more than required still satisfies the requirement), so both are accepted structurally, despite having nothing else in common. `thing` has no `id` at all, so it fails: *Property 'id' is missing in type ...*. The criterion is purely "does the shape include what's required," exactly the membership test `isTask` ran field by field. Note the asymmetry: extra fields on a *variable* you pass are allowed; the next section shows the one case where extra fields are rejected.
:::

## "More than required" is fine — except for fresh literals

The predict above hides a subtlety that trips up everyone once. Structural typing's rule is "a value satisfies a type if it has *at least* the required fields." Extra fields are normally fine: `user` had a `name` and `email` that `{ id: number }` never asked for, and it was still accepted, because having more than enough is still enough. A `Task` value with an extra `priority` field is still usable as a `Task`.

But there is one deliberate exception, and it exists to catch typos — the same class of bug we started this whole course with. When you assign a *fresh object literal* directly to a typed target, TypeScript runs an **excess property check**: a literal is allowed to have *exactly* the declared fields and no more. The reasoning is that a literal written right there, at the assignment, has no reason to carry extra fields — if it has one, you probably misspelled a real field name.

:::play
```typescript
interface Task {
  id: number;
  title: string;
  status: "todo" | "doing" | "done";
}

// Excess property check fires on a fresh literal:
const t: Task = {
  id: 1,
  title: "fix the typo",
  status: "todo",
  staus: "done", // error: 'staus' does not exist in type 'Task'. Did you mean 'status'?
};
```
:::

There is the typo bug from episode 1, caught a second way. We wrote `staus` instead of `status`. Structural typing's "extra fields are fine" rule would normally let it through — the object *does* have the required `status: "todo"`, plus a bonus `staus`. But because this is a fresh literal assigned straight to a `Task`, the excess property check kicks in and flags `staus` as a field `Task` never declared, and again suggests the fix. This is the compiler reading your intent: a literal with a stray field is almost always a mistake, so it's the one place TypeScript tightens structural typing into "exactly these fields."

The check only fires on *fresh literals* at the assignment point. Assign the literal to a variable first and the excess field rides along quietly — because now it's a value being passed, not a literal being written, and structural typing's normal "more is fine" rule resumes:

```typescript
const raw = { id: 1, title: "x", status: "todo" as const, extra: 99 };
const t2: Task = raw; // no error — raw isn't a fresh literal; extra is allowed
```

This isn't a hole; it's the boundary between "you literally just wrote this object, so I'll be strict about typos" and "this value came from elsewhere and legitimately has more fields than this slot needs."

:::quiz
Episode 1's bug was `task.state = "done"` — a stray field created by mutation. Episode 3 caught it via *property access* on a typed object. This episode's excess property check caught a stray field in a *literal*. Are these the same mechanism? When does each fire?
:::answer
They're different mechanisms aimed at the same family of bug. The episode-3 catch is a **property-access** check: `task` is typed `Task`, you write `task.state = ...`, and the compiler rejects assigning to a property the type doesn't declare (*Property 'state' does not exist on type 'Task'*). It fires whenever you read or write a property on a value of a known object type. The **excess property check** here fires only when a *fresh object literal* is assigned or passed to a typed slot, and rejects literal fields the target type doesn't declare. The first guards mutation and access on existing typed values; the second guards the construction of new literals. Both exist because structural typing, left alone, would let a misspelled extra field slip through (a value with a typo'd field still *has* the required fields), and both are TypeScript deliberately tightening structure-matching at the spots where a typo is the likely explanation. Your hand-built `isTask` did neither precisely — it only checked the fields it knew about and ignored extras entirely — which is exactly why the compiler's version is the stronger checker.
:::

## Recap

- TypeScript decides type membership by **shape, not name** — [[structural typing|nominal-vs-structural]]. An unnamed object literal is a `Task` if its fields match what `Task` requires.
- This is the rule your hand-built `isTask` already followed: it read `value.id/title/status` and judged by structure, because at runtime structure is all there is. The compiler proves the same criterion statically.
- Python's duck typing is structural typing without the static check; TypeScript is duck typing the compiler verifies ahead of time.
- **Java and C++ are nominal**: identical fields under different names are different, incompatible types unless kinship is declared. TypeScript needs no declared kinship.
- The rule is "at least the required fields" — extra fields are normally fine. The one exception is the **excess property check** on *fresh literals*, which rejects undeclared fields to catch typos (`staus` → `status`).

Next episode: we've been writing `interface Task`, but TypeScript has a second way to name a shape — `type`. They overlap heavily and differ in a few sharp ways, and one of those differences (unions) is something we need for the `status` field's own type. We'll introduce `type TaskId = number` along the way.
