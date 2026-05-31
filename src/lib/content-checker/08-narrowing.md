---
title: The verdict the compiler believes
subtitle: Turn a checker into a `value is Task` predicate, and the compiler narrows the type in the branch
---

## Where we pick up

We have a full combinator library — `checkString`, `checkObject`, `checkUnion`, `checkOptional`, `checkArray` — and each returns a `Result` telling us *and why*. But there's a gap between our world and the compiler's that we've left open since Episode 1, and now we close it.

Watch the gap. We run a checker, it passes, and then we use the value:

```typescript
const checkTask = checkObject({ title: checkString, done: checkBoolean });

function handle(input: unknown) {
  const r = checkTask(input);
  if (r.ok) {
    // we KNOW input is a Task here. But the compiler still thinks input is `unknown`:
    console.log(input.title); // ERROR: 'input' is of type 'unknown'.
  }
}
```

We checked the value. *We* know it's a `Task`. But the compiler doesn't — to `tsc`, `input` is still `unknown`, because all our checker did was return a `Result` object; it never told the *type system* anything. Our verdict and the compiler's belief about the type are two separate things. This episode welds them: we turn a checker into a **type guard** — a function whose return type isn't `boolean` but `value is Task` — and the moment we do, the compiler starts trusting our runtime verdict and [[narrowing]] the static type to match. The verdict our checker computes *becomes* the type the compiler infers.

## What the compiler already does with `typeof`

You've seen the compiler narrow before — Episode 5 showed it following `typeof id === "string"` to conclude `id` is a `string` in that branch. The compiler has a built-in set of tests it understands: `typeof`, `Array.isArray`, `in`, `instanceof`, `=== null`. When it sees one of these in an `if`, it narrows the type in the branch automatically:

```typescript
function f(x: unknown) {
  if (typeof x === "string") {
    x.toUpperCase(); // OK — compiler narrowed x to string from the typeof test
  }
}
```

The problem is that our checks aren't a single built-in test. `checkTask` is a loop over fields, our own function — the compiler has no idea that `checkTask(input).ok === true` implies anything about `input`'s type. We need a way to *tell* it. That mechanism is the type predicate.

## The type predicate: `value is Task`

A normal function returning `boolean` says "I return true or false." A type *guard* says something stronger: "I return a boolean, *and when it's true, you may treat my argument as this type*." The syntax is a special return type — `value is Task` instead of `boolean`:

:::play
```typescript
interface Task {
  title: string;
  done: boolean;
}

// a type guard: the return type `input is Task` is a PROMISE to the compiler.
function isTask(input: unknown): input is Task {
  return (
    typeof input === "object" &&
    input !== null &&
    "title" in input && typeof (input as Record<string, unknown>).title === "string" &&
    "done" in input && typeof (input as Record<string, unknown>).done === "boolean"
  );
}

function handle(input: unknown): string {
  if (isTask(input)) {
    // narrowed! input is Task here. No error, full autocomplete on .title and .done.
    return `${input.title} is ${input.done ? "done" : "pending"}`;
  }
  return "not a task";
}

console.log(handle({ title: "buy milk", done: false })); // buy milk is pending
console.log(handle({ title: 123 }));                      // not a task
console.log(handle("nope"));                              // not a task
```
:::

The return type `input is Task` is the whole trick. Mechanically the function still returns a boolean — at runtime `isTask` is just our checker's logic returning `true`/`false`. But the *type* `input is Task` is a signal to the compiler: "if I return `true`, narrow `input` to `Task` in the calling branch." Inside `if (isTask(input))`, `input` is now `Task` — `.title` and `.done` are available, typed, autocompleted. The verdict drove the narrowing.

There's a sharp edge here worth naming: the compiler *trusts you*. The `input is Task` predicate is a promise the compiler does not verify against the function body. If you wrote `function isTask(x: unknown): x is Task { return true; }`, the compiler would believe every value is a `Task` and narrow accordingly — and you'd get runtime crashes the type system swore couldn't happen. A type predicate is one of the few places TypeScript lets you assert something it can't check, which is exactly why the *body* must be a real, correct check. This is the responsibility we've been shouldering all course: the checker has to actually be right, because the compiler is taking its word for it.

:::compare
```python
# Python: TypeGuard does the same job for static checkers (mypy/pyright)
from typing import TypeGuard

def is_task(v: object) -> TypeGuard[Task]:
    return (isinstance(v, dict)
            and isinstance(v.get("title"), str)
            and isinstance(v.get("done"), bool))

def handle(v: object) -> str:
    if is_task(v):
        reveal_type(v)  # mypy: narrowed to Task
        ...
```
```typescript
function isTask(input: unknown): input is Task {
  return typeof input === "object" && input !== null
    && typeof (input as Record<string, unknown>).title === "string"
    && typeof (input as Record<string, unknown>).done === "boolean";
}
```
:::

Python added exactly this feature — `TypeGuard[T]` (PEP 647) — for exactly this reason: a checker function whose `True` result narrows the type for [[mypy]]/pyright. The parallel is precise, down to the design: both languages needed a way for a *user-defined* runtime check to participate in the *static* narrowing the type checker does for built-in tests, and both spell it as a special return type. If you know `TypeGuard`, you already know type predicates; if you don't, you now know both.

## Connecting it back to the combinator library

That hand-written `isTask` works, but it threw away everything we built — it re-implements the field checks inline. We don't want two checkers (`checkTask` returning `Result`, `isTask` returning a predicate) drifting apart, the same drift problem from Episode 4. So adapt: write one small bridge that turns any of our `Checker`s into a type guard. Because a `Checker` already does the real work, the guard just calls it and reports `.ok` — with the `is T` annotation layered on top:

:::play
```typescript
type Result = { ok: true } | { ok: false; error: string };
type Checker<T> = (value: unknown) => Result;
const ok = (): Result => ({ ok: true });
const err = (e: string): Result => ({ ok: false, error: e });
const checkString: Checker<string> = (v) => typeof v === "string" ? ok() : err("expected string");
const checkBoolean: Checker<boolean> = (v) => typeof v === "boolean" ? ok() : err("expected boolean");
function checkObject<T>(shape: Record<string, Checker<unknown>>): Checker<T> {
  return (value) => {
    if (typeof value !== "object" || value === null) return err("expected object");
    const obj = value as Record<string, unknown>;
    for (const [k, check] of Object.entries(shape)) {
      const r = check(obj[k]);
      if (!r.ok) return err(`field "${k}": ${r.error}`);
    }
    return ok();
  };
}

// the bridge: any Checker<T> becomes a TypeScript type guard for T.
function toGuard<T>(check: Checker<T>) {
  return (value: unknown): value is T => check(value).ok;
}

interface Task { title: string; done: boolean; }
const checkTask = checkObject<Task>({ title: checkString, done: checkBoolean });
const isTask = toGuard(checkTask);   // (value: unknown) => value is Task

function handle(input: unknown): string {
  if (isTask(input)) {
    return `${input.title}: ${input.done}`;  // input narrowed to Task — typed access
  }
  return "rejected";
}
console.log(handle({ title: "ship it", done: true })); // ship it: true
console.log(handle(42));                                // rejected
```
:::

`toGuard` is the keystone. Its return type, `(value: unknown) => value is T`, is what connects our entire runtime library to the compiler's narrowing. Every checker we built — `checkObject`, `checkUnion`, `checkOptional`, `checkArray`, composed to any depth — can now produce a type guard, and any value that passes gets narrowed to its proper static type. The runtime verdict (`Result.ok`) and the compile-time type (`value is T`) are finally one pipeline: the check decides, and the compiler believes.

:::predict
`toGuard` returns `(value: unknown): value is T => check(value).ok`. The body just reads `.ok` and the compiler asks nothing more. Given that the compiler doesn't verify the predicate against the check, what is the one obligation that makes `toGuard` *sound* — i.e. safe to trust?

- ( ) That `T` is a primitive type; objects can't be guarded.
- ( ) That `check` returns `true` for at least one value.
- (x) That `check`'s runtime logic actually verifies the type `T` it's labelled with — the `Checker<T>` must be honest.
- ( ) Nothing — the compiler verifies the predicate, so `toGuard` is always safe.
:::answer
The obligation is that `check` genuinely verifies `T`: a `Checker<T>` whose runtime logic checks the structure of `T` is what makes the `value is T` predicate true-to-reality. The compiler trusts the `is T` annotation blindly — it does *not* prove `check` actually checks `T` — so soundness rests entirely on the checker being honest. This is why we spent seven episodes making `checkObject`, `checkUnion`, et al. *correct*: `toGuard` converts their correctness into a promise the compiler relies on. A dishonest checker (say, one that returns `ok()` unconditionally) would produce a guard that narrows wrongly and crashes at runtime — the type system can't save you from a lying checker, because the checker *is* the source of truth at the boundary. Soundness flows from the value to the type, never the other way.
:::

## The direction of trust

Step back and notice which way the trust flows, because it's the inversion this episode is really about. Everywhere else in TypeScript, the *type* is the source of truth and the *value* must conform to it — you declare `const x: Task`, and the compiler checks every assignment against `Task`. A type guard reverses that arrow: the *runtime value*, inspected by our checker, becomes the source of truth, and the compiler updates its belief about the *type* to match. The check decides; the type follows.

That reversal is exactly the job of the program's edge. Inside your program, types lead and values follow — that's the safety `tsc` gives you for free. But at the boundary, where untrusted data arrives, you have no type yet, only bytes; the *value* has to lead, and a guard is how its verdict propagates back into the type system. Our checker has been a boundary tool all along, and `toGuard` is the adapter that plugs it into the compiler's narrowing. Episode 10 names this division of labor outright and reveals what `tsc` was doing on the other side of it the whole time.

:::quiz
The compiler already narrows on built-in tests like `typeof x === "string"` without any `is` annotation. So why does a *user-defined* function like our `checkTask` need the explicit `value is T` return type to get the same narrowing — what can't the compiler figure out on its own?
:::answer
The compiler narrows on built-in tests because it *understands their semantics* — it has hard-coded knowledge that `typeof x === "string"` being true means `x` is a `string`. But `checkTask` is an arbitrary function: a loop over fields returning a `Result`. The compiler can't analyze an opaque function body and deduce "if this returns an object whose `.ok` is `true`, then the *argument* has such-and-such shape" — that inference is undecidable in general and not something `tsc` attempts. The `value is T` return type is how you *supply* the conclusion the compiler can't derive: you take responsibility for the implication, and the compiler applies it at every call site. Built-in tests narrow because the compiler knows them; user checks narrow because you *promise*, via the predicate, what they mean. The annotation is the bridge between "logic the compiler can't see into" and "narrowing the compiler will perform."
:::

## Recap

- A plain `Checker` returns a `Result` the *compiler ignores*: after `if (checkTask(x).ok)`, `x` is still `unknown` to `tsc`. The runtime verdict and the static type are disconnected.
- A **type guard** has the return type `value is T` instead of `boolean`. Inside `if (guard(x))`, the compiler [[narrows|narrowing]] `x` to `T` — typed access, autocomplete, no error. The verdict drives the narrowing.
- The compiler *trusts* the predicate without verifying it against the body. Soundness depends entirely on the check being honest — which is why correctness mattered for seven episodes.
- Python's `TypeGuard[T]` (PEP 647) is the exact same feature for the same reason: let a user-defined runtime check participate in static narrowing.
- `toGuard(check)` bridges our whole library to the compiler: `(value: unknown): value is T => check(value).ok`. Any composed checker can now narrow a static type.
- The trust arrow reverses at the boundary: normally types lead and values conform; a guard lets the *value's* verdict lead and the *type* follow — exactly what the edge of a program needs.

We have checkers, and we have guards that connect them to the compiler. The next episode steps back to look at the library as a whole: function types, higher-order checkers, and composition as a first-class design. We'll see that `checkObject`, `checkArray`, `checkOptional` were combinators all along — functions that build functions — and tidy them into the small, coherent library that Episode 10's reveal rests on.
