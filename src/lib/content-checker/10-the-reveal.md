---
title: The checker was tsc all along
subtitle: The reveal — and the honest correction it demands
---

## Where we pick up

Ten episodes ago we had a value and a question: *is this a valid `Task`?* We answered it by building a function from a value to a verdict, and then we kept building — primitives, shapes, unions, optionals, arrays, guards, combinators — until we had a small library that can describe and verify an unbounded space of data shapes. Stand back and look at what that library *is*, because now the pieces line up into the thing this whole course was pointing at.

You built a type checker. A program that takes a value, asks structured questions about its shape, and returns "this conforms" or "this doesn't, here's why." And there is another type checker you use every day that does the *same job* with the *same ideas*: `tsc`.

## The reveal

Put the two side by side, mechanism for mechanism. Everything in the left column is something you built by hand; everything in the right is what `tsc` does.

| Your checker | `tsc` |
|---|---|
| `checkString`, `checkNumber`, `checkBoolean` | the primitive types `string`, `number`, `boolean` |
| `checkObject({ ... })` — has these fields of these kinds? | checking a value against an `interface` / `type` |
| structural: shape, not name | structural typing — the assignability relation |
| `checkUnion(a, b)` — passes if any branch passes | union types `A | B` |
| `checkLiteral("todo")` | literal types `"todo"` |
| `checkOptional(c)` — value or absent | `field?: T`, `T | undefined` |
| `checkArray(c)` — parameterized by an element checker | the generic `Array<T>` |
| `toGuard` — verdict drives narrowing | type guards and control-flow narrowing |
| combinators closed over `Checker<T>` | the type system: a few constructors, composed |

This is the Karpathy move you may have been waiting for: the toy you built *is* the real system, in its essential mechanism. `tsc` is a checker built from exactly these parts — atoms for primitives, combinators for shapes and unions and arrays, structural comparison, a guard mechanism for narrowing. When you write `interface Task { title: string; done: boolean }` and the compiler rejects `{ title: 123 }`, it is running `checkObject({ title: checkString, done: checkBoolean })` against your code. You have understood `tsc` from the inside, because you rebuilt its mental model from an empty file. The red squiggle under a type error is your `{ ok: false, error: ... }`, rendered in the editor.

That is the payoff. Now comes the part that separates understanding from a slogan, and it matters more than the reveal.

## The honest correction

You did **not** rebuild `tsc`. Read that twice, because the temptation is to believe you did, and believing it will lead you to write wrong code. What you rebuilt is the *mental model* of what a type check is — a function from a value to a verdict. The model is faithful. The implementation is profoundly different in three ways, and the differences are the whole point of this final episode.

**1. Your checker runs at runtime; `tsc` runs at compile time.** Your `checkTask(value)` executes when the program runs, against a real value sitting in memory. `tsc` runs *before* your program executes — on your *source code*, not on any value — and then it stops. It is a separate phase, a tool you run, that reads your `.ts` files, verifies the types, and emits `.js`. By the time the program runs, `tsc` is long done and gone.

**2. `tsc` checks code; your checker checks values.** Your checker inspects a value: it reaches into `value.title` and asks `typeof`. `tsc` never sees a value — it can't, because values don't exist yet at compile time. It checks *expressions* against *declared types*: when you write `task.title.toUpperCase()`, `tsc` verifies that *the type of `task.title`* has a `toUpperCase` method, reasoning about types symbolically. It proves a property about every possible run of your code at once, without running it. Your checker decides one value, once. The compiler decides all values, statically.

**3. TypeScript's types are erased; your checker is still there.** This is the one that bites. After `tsc` runs, *every type is deleted from the output*. [[Type erasure|type-erasure]]: `interface Task`, `: string`, `<T>`, `as Task` — none of it survives into the emitted JavaScript. The running program has no idea what a `Task` is. Your checker, by contrast, is ordinary runtime code; it survives compilation and runs. This asymmetry is not a detail — it is *why your checker still has a job*.

:::compare
```python
# Python type hints: also "erased" in spirit — the runtime ignores them.
def handle(task: Task) -> str:
    return task.title.upper()   # mypy checks this; the interpreter does NOT enforce `task: Task`

handle({"title": 123})  # mypy complains; Python runs it and crashes on .upper()
```
```typescript
// TypeScript: tsc checks, then erases. The emitted JS has no `Task`.
function handle(task: Task): string {
  return task.title.toUpperCase(); // tsc verifies against Task; runtime has no Task
}
// handle(JSON.parse(untrusted)) — tsc can't check what it can't see at compile time
```
:::

Python developers have the right instinct here already: a type hint is checked by [[mypy]] and ignored by the interpreter. TypeScript is the same shape — `tsc` is the checker, the runtime ignores types — with one crucial difference: TS's `tsc` is far more thorough and is part of the normal build, so it *feels* like the types are real. They are real, at compile time. They are gone at runtime. That gap is exactly the size of the job your checker still owns.

## Where the runtime checker still has a real job: the IO boundary

Here is the practical conclusion the honesty beat earns. Because types are erased, `tsc` can only check values it can *see at compile time* — values whose types it can trace through your code. It cannot check a value that arrives *while the program is running*, from outside, because at compile time that value didn't exist and its type was a guess. Three places this happens, every program, every day:

- `JSON.parse(text)` — returns `any`. `tsc` knows nothing about the shape of parsed JSON; you *assert* a type and the compiler believes you, unchecked.
- `await fetch(url).then(r => r.json())` — a network response. The server could send anything; the type you write is a hope, not a guarantee.
- form input, `process.env`, a file you read, a database row — every byte that crosses into your program from the outside.

At this boundary, the compiler's guarantee has already evaporated, because there was nothing to check when it ran. The type you write on parsed JSON is a *promise to the compiler that you have not kept* — until something verifies the actual value. That something is a runtime checker. Yours:

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
function toGuard<T>(check: Checker<T>) {
  return (value: unknown): value is T => check(value).ok;
}

interface Task { title: string; done: boolean; }
const checkTask = checkObject<Task>({ title: checkString, done: checkBoolean });
const isTask = toGuard(checkTask);

// the IO boundary: a value tsc could never check, because it arrives at runtime.
const fromNetwork: unknown = JSON.parse('{"title": "buy milk", "done": false}');

if (isTask(fromNetwork)) {
  // INSIDE this branch, fromNetwork is Task — verified at runtime, narrowed for the compiler.
  console.log(fromNetwork.title.toUpperCase()); // BUY MILK — safe, because we checked
} else {
  console.log("rejected at the boundary");
}
```
:::

This is the synthesis of the whole course. `tsc` guarantees that *inside* your program, once a value is a `Task`, every use of it is correct — the compile-time half. Your checker guarantees that a value *becomes* a `Task` only if it genuinely has the shape — the runtime half, at the boundary. `toGuard` is the handshake: the runtime verdict flows into the compiler's narrowing, so past the `if`, the two halves agree. Inside, types lead; at the edge, the value leads. You need both, and now you know precisely why.

## This is what zod is

The runtime checker you built is not a teaching toy with no real-world counterpart. It is, in miniature, exactly what validation libraries like [[zod]] are. Zod gives you the same atoms and combinators — `z.string()`, `z.object({...})`, `z.array(...)`, `z.union([...])`, `z.optional(...)`, `.refine(...)` — the same closed-over-one-type composition, the same `.parse()` that returns a verdict. And it adds the one feature we pointed at in Episode 4 and never built: it *derives the static type from the runtime schema*, so they can't drift. You write the checker once; `z.infer<typeof schema>` hands you the `interface` for free, guaranteed in sync.

:::compare
```python
# Pydantic is Python's equivalent — runtime validation at the boundary.
from pydantic import BaseModel
class Task(BaseModel):
    title: str
    done: bool
Task.model_validate(json.loads(untrusted))  # validates the actual value, raises if wrong
```
```typescript
// zod — your checker, productionized: derives the type from the schema.
import { z } from "zod";
const Task = z.object({ title: z.string(), done: z.boolean() });
type Task = z.infer<typeof Task>;          // { title: string; done: boolean } — derived, in sync
const result = Task.safeParse(JSON.parse(untrusted)); // { success: true, data } | { success: false, error }
```
:::

If you reach for zod tomorrow, you will not be learning a new concept. You will be using a polished version of the library you just built by hand, and you will know — because you built it — exactly *why* it exists: types are erased, so the boundary needs a checker that runs. Pydantic is the same answer in Python, for the same reason.

:::quiz
A teammate says: "We use TypeScript with `strict` mode everywhere, so we don't need a runtime validation library — the types already guarantee our data is correct." Using everything from this course, what is wrong with that claim, and where *specifically* does it fail?
:::answer
The claim conflates the two halves the course just separated. `strict` mode and `tsc` guarantee correctness *for values the compiler can see at compile time* — values whose types it can trace through your own code. But TypeScript's types are *erased* before runtime, so `tsc` checks code, not values, and it has no power over data that arrives *while the program runs*: `JSON.parse` returns `any`, a `fetch` response is whatever the server sent, `process.env` is `string | undefined` at best, form input is untyped. At those IO boundaries the compiler's guarantee has already evaporated — the type you wrote on parsed JSON is an unverified assertion the compiler trusts blindly. So the strongest possible `tsc` setup still cannot stop a malformed network payload from flowing in typed as `Task` and crashing three functions later. The fix is exactly the runtime checker we built (or zod/Pydantic): verify the actual value at the boundary, narrow it with a guard, and *then* let the compiler's guarantee take over inside. Strict types and runtime validation are not redundant; they cover disjoint halves — compile-time code and run-time values — and a correct program needs both.
:::

## Capstone: the whole library, at a boundary

Here is everything, composed once, doing the job it was built for — validating an untrusted payload and narrowing it for safe use:

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
function checkArray<T>(checkElem: Checker<T>): Checker<T[]> {
  return (value) => {
    if (!Array.isArray(value)) return err("expected array");
    for (let i = 0; i < value.length; i++) {
      const r = checkElem(value[i]);
      if (!r.ok) return err(`index ${i}: ${r.error}`);
    }
    return ok();
  };
}
function checkOptional<T>(check: Checker<T>): Checker<T | undefined> {
  return (value) => (value === undefined ? ok() : check(value));
}
function checkUnion(...cs: Checker<unknown>[]): Checker<unknown> {
  return (value) => {
    for (const c of cs) if (c(value).ok) return ok();
    return err("matched no branch");
  };
}
function checkLiteral(expected: string): Checker<string> {
  return (value) => value === expected ? ok() : err(`expected "${expected}"`);
}
function toGuard<T>(check: Checker<T>) {
  return (value: unknown): value is T => check(value).ok;
}

// describe the shape once, with the combinator library:
interface Task {
  title: string;
  done: boolean;
  notes?: string;
  status: "todo" | "doing" | "done";
}
const checkTask = checkObject<Task>({
  title: checkString,
  done: checkBoolean,
  notes: checkOptional(checkString),
  status: checkUnion(checkLiteral("todo"), checkLiteral("doing"), checkLiteral("done")),
});
const checkTaskList = checkArray(checkTask);
const isTaskList = toGuard(checkTaskList);

// the boundary: untrusted text in, verified-and-narrowed Task[] out.
function parseTasks(json: string): Task[] {
  const data: unknown = JSON.parse(json);
  if (isTaskList(data)) {
    return data; // narrowed to Task[] — the runtime verdict became a compile-time type
  }
  const why = checkTaskList(data);
  throw new Error(why.ok ? "" : `invalid task list: ${why.error}`);
}

const good = '[{"title":"spec","done":false,"status":"todo"},{"title":"ship","done":true,"status":"done","notes":"v1"}]';
console.log(parseTasks(good).map((t) => t.title)); // ["spec", "ship"]

const bad = '[{"title":"spec","done":"no","status":"todo"}]';
try { parseTasks(bad); } catch (e) { console.log((e as Error).message); }
// invalid task list: index 0: field "done": expected boolean
```
:::

That `parseTasks` is the entire course in one function: a combinator-built checker, a guard that narrows, deployed at the exact seam where compile-time types end and runtime values begin. The shape is declared once as the runtime checker; the static `interface Task` mirrors it; inside the narrowed branch, the compiler takes over and every use of the returned `Task[]` is verified for free. The two halves, shaking hands.

## Recap

- The reveal: `tsc` is the checker you built — primitives as atoms, `checkObject` as `interface` checking, structural comparison, `checkUnion` as `|`, `checkArray` as `Array<T>`, `toGuard` as narrowing. You rebuilt its mental model from an empty file, so you understand it from the inside.
- The honest correction: you did **not** rebuild `tsc`. It runs at *compile time* on *code* (not runtime, not values), and its types are [[erased|type-erasure]] before the program runs. Your checker runs at runtime on real values and survives compilation. Faithful model, different machine.
- Erasure is *why the runtime checker still has a job*: `tsc` cannot check values that arrive while the program runs — `JSON.parse`, `fetch`, forms, `env`, DB rows all enter as untyped data the compiler only *assumes* a type for.
- The IO boundary is where the two halves meet: the runtime checker verifies the actual value and `toGuard` feeds the verdict into the compiler's narrowing. Inside, types lead; at the edge, the value leads. A correct program needs both — they cover disjoint halves.
- This is exactly what [[zod]] (and Python's Pydantic) are: the same combinator library, productionized, deriving the static type from the runtime schema so they never drift.

That's the course. You started with one value and the question "is this a Task?", and you finish with a working runtime validator and a precise, un-magical understanding of what TypeScript's checker is, what it does, when it runs, and exactly where its guarantee stops and yours begins.

Where to go next: if you want to *use* TypeScript in anger — growing a real, typed application feature by feature — the **Build a Real App** course takes a typed todo app from an empty file to a strict-mode build. If you want both halves together — this from-scratch checker coupled to a real app that puts it to work at its boundaries — **Understand It & Build It** runs them as one. You now have the mental model. Go put it under load.
