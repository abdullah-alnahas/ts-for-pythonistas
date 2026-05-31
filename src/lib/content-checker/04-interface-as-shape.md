---
title: The shape you wrote twice
subtitle: Your runtime shape map and a TS interface are two encodings of one idea — plus interface vs type
---

## Where we pick up

Last episode we described a `Task` as a runtime object — a *shape* — and fed it to `checkObject`:

```typescript
const checkTask = checkObject({
  title: checkString,
  done: checkBoolean,
});
```

That shape is a value: it exists at runtime, you can iterate it, you built `checkObject` to walk it. But there's a second way to write down "an object with a string `title` and a boolean `done`" in TypeScript, and you've probably already met it:

```typescript
interface Task {
  title: string;
  done: boolean;
}
```

These two — the runtime shape and the static `interface` — describe the *same set of fields with the same kinds*. They look different and live in different worlds (one runs, one is checked and then vanishes), but they encode one idea. This episode lines them up exactly, shows where each is the right tool, and settles the question every TypeScript newcomer asks: `interface` or `type`? The payoff is conceptual: once you see that your hand-built shape and the compiler's `interface` are the same description, the reveal in Episode 10 — that `tsc` is running your checker — stops being a surprise and starts being obvious.

## The same shape, two encodings

Put them side by side. The correspondence is field-for-field:

:::compare
```python
# Python: a TypedDict is the description; it vanishes at runtime
from typing import TypedDict

class Task(TypedDict):
    title: str
    done: bool
```
```typescript
// Two encodings of the same shape:

// (1) runtime — a value you can iterate and run
const taskShape = {
  title: checkString,
  done: checkBoolean,
};

// (2) static — a type the compiler checks, then erases
interface Task {
  title: string;
  done: boolean;
}
```
:::

Read the mapping literally. Where the runtime shape says `title: checkString` — "the `title` field is checked by `checkString`" — the interface says `title: string` — "the `title` field has type `string`." Same field, same kind, two notations. The runtime version names a *checker* (a function that verifies stringness); the static version names a *type* (`string`). They're describing the identical requirement from two sides: one is the verification you run, the other is the claim the compiler verifies.

Python's `TypedDict` sits closest to the `interface`: it's a static description that [[mypy]] checks and the runtime discards. The crucial difference — the one this whole course turns on — is *when* and *whether* the check actually runs. Your `taskShape` runs whenever you call `checkTask(value)`, on real data, at runtime. The `interface Task` is checked by `tsc` at compile time and then [[erased|type-erasure]] — by the time your program runs, `interface Task` does not exist in the emitted JavaScript. It checked your *code* while you were writing it; it checks no *values* while the program runs. Hold onto that asymmetry; it's the seam where your runtime checker and the compiler divide the labor, and Episode 10 makes it the whole point.

## interface vs type

Now the perennial question. TypeScript gives you two keywords to write that static shape — `interface` and `type` — and they're interchangeable here:

```typescript
interface Task {
  title: string;
  done: boolean;
}

type Task = {
  title: string;
  done: boolean;
};
```

For describing an object shape, these are equivalent: same structural check, same assignability, same errors. So which to use? The honest answer is that for plain object shapes it rarely matters, but the two keywords are *not* the same construct, and the differences decide the edge cases.

**`type` is an alias for any type; `interface` only describes object shapes.** `type` can name things that aren't objects at all:

```typescript
type ID = string | number;            // a union — interface can't express this
type Pair = [string, number];         // a tuple
type Checker = (v: unknown) => Result; // a function type — this is OUR Checker!
```

That last line is the one to notice: the `Checker` and `Result` types we've been writing all course are `type`, not `interface`, and they *have* to be — a union and a function type aren't object shapes, so `interface` can't express them. This is the practical rule: reach for `type` when the thing you're naming is a union, a tuple, a function, or any non-object; either works for a plain object shape.

**`interface` can be reopened; `type` cannot.** Declare an `interface` twice and the declarations merge:

```typescript
interface Task { title: string; }
interface Task { done: boolean; }
// Task is now { title: string; done: boolean } — the two MERGED
```

This is [[declaration merging|declaration-merging]], and it has no Python or C++ analogue. It exists mostly so libraries can let you *augment* their types — add a field to a framework's `Request` object, say. For your own application types it's usually something you want *off*: declaring `type Task` twice is a duplicate-identifier error, which is the louder, safer default. So `type` fails fast on an accidental redeclaration; `interface` silently merges. If you're coming from C++ or Java, `interface` here is *not* the Java `interface` (a contract a class must `implements`) — it's just a name for an object shape, structurally checked, no `implements` required.

:::predict
You have these two declarations in one file. What is the resulting type of `Config`, and would swapping `interface` for `type` change the outcome?

```typescript
interface Config { host: string; }
interface Config { port: number; }
```

- ( ) An error — `Config` is declared twice.
- ( ) `Config` is `{ host: string }`; the second declaration is ignored.
- (x) `Config` is `{ host: string; port: number }` via declaration merging; with `type` it would be a duplicate-identifier error instead.
- ( ) `Config` is `{ host: string } | { port: number }` — a union of the two.
:::answer
`Config` becomes `{ host: string; port: number }` — the two `interface` declarations merge into one. Swapping both to `type Config = ...` would *not* merge; it would be a compile error, *Duplicate identifier 'Config'* (TS2300). This is the sharpest behavioral difference between the keywords. Merging is a feature for augmenting library types and a footgun for your own — which is why a common house style is "`interface` for public/extensible object types, `type` for everything else," and why our `Checker`/`Result` are `type`: they're unions and functions, and we never want them silently reopened.
:::

## The shape and the checker, kept in sync

Here's a tension the two-encodings view exposes, and it's worth naming because it's the seam Episode 10 closes. We now have a runtime shape *and* a static interface describing the same `Task`. Nothing forces them to agree. We could write a shape that checks `title` and `done`, and an interface that declares `title` and `priority`, and the compiler wouldn't notice — they're independent descriptions in independent worlds.

In a real validation library, you'd want one to be the source of truth and the other *derived* from it, so they can't drift. That's exactly what libraries like [[zod]] do: you write the runtime checker (the schema), and they hand you the static type for free, derived from it, guaranteed in sync. We'll connect our checker to that idea in Episode 8 (when a checker can *narrow* a static type) and pay it off in Episode 10. For now, the thing to see is that the two encodings *can* be linked — that "the type" and "the check" are two faces of one description, and a good design keeps them welded together rather than written twice.

:::quiz
We keep saying the runtime shape and the static `interface` are "the same idea." But one of them can catch a bug the other can't, depending on where the bug is. Which world catches a typo in your *code* (`task.titel`), and which catches a malformed *value* arriving from the network — and why can't either do the other's job?
:::answer
The static `interface` catches the code typo: `task.titel` is a compile error (*Property 'titel' does not exist on type 'Task'*) because `tsc` checks your source against the declared shape — but it does this at compile time and then erases, so it never inspects a runtime value. The runtime shape (`checkTask`) catches the malformed network value: it runs on actual data and returns `{ ok: false }` when `title` is missing or wrong-typed — but it knows nothing about your source code, so it can't flag `task.titel`. Neither can do the other's job because they operate in different worlds at different times: the compiler sees *code before it runs*; the checker sees *values as they run*. The two together cover both, which is the division of labor Episode 10 makes explicit — and the reason a real app needs both `tsc` and a runtime validator at its IO boundary.
:::

## Recap

- Your runtime *shape* (`{ title: checkString, done: checkBoolean }`) and a static `interface Task { title: string; done: boolean }` are two encodings of one idea: the same fields, the same kinds. One is a value you run on data; one is a type the compiler checks then [[erases|type-erasure]].
- Python's `TypedDict` is the nearest analogue to `interface` — a static description the runtime discards. The asymmetry that matters: the shape checks *values* at runtime; the interface checks *code* at compile time and then vanishes.
- `type` aliases *any* type — unions, tuples, functions — so our `Checker` and `Result` must be `type`. `interface` describes only object shapes.
- `interface` merges on redeclaration ([[declaration merging|declaration-merging]]); `type` errors. Use `interface` for extensible/public object types, `type` for everything else. TS `interface` is not Java's — no `implements`, structural not nominal.
- The two encodings *can* drift unless one is derived from the other. Keeping them welded is exactly what [[zod]]-style libraries do, and the seam Episode 10 closes.

We can now check a fixed shape, primitive fields and all. But real types aren't always one fixed shape — a value is often "a string *or* a number," a status is "one of these exact words." The next episode builds `checkUnion`: a checker that passes if *any* of several checkers passes. And the question "which branch passed?" turns out to be the exact mechanism behind how TypeScript narrows a union down to one of its members.
