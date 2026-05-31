---
title: Strict mode, the gotchas, and shipping it
subtitle: The strict tsconfig capstone, the bugs types don't catch, and the runtime guard that still has a job
---

## Where we pick up

The app is fully typed: `Task`, `Status`, `TaskId`, the generic `Store`, typed `Command` handlers, `editTask` with `Partial<Task>`, the optional `class TaskStore`. This final episode does three things. It turns on the `strict` tsconfig that everything so far quietly assumed, so the safety is real and not opt-out. It walks the JavaScript-reality gotchas that types *don't* save you from — because pretending types catch everything is the same dishonesty episode 3 warned against. And it lands the final callback: the runtime guard we deleted in episode 3 is exactly the bug class types can't catch, and at the I/O boundary it still has a real job. Then we ship.

## Turn on `strict`

Every `:::play` in this course ran under strict settings, and every claim about the compiler catching things depended on them. In a real project, those settings live in `tsconfig.json`, and the one that matters is a single flag:

```json
{
  "compilerOptions": {
    "strict": true,
    "noUncheckedIndexedAccess": true,
    "target": "ES2022",
    "module": "ESNext"
  }
}
```

`"strict": true` is a master switch turning on a family of checks at once. The two that have done the most work in this course:

- **`strictNullChecks`** (episode 7): `null`/`undefined` are distinct types, not members of everything, so the compiler forces you to handle absence. Without it, the entire billion-dollar-mistake protection evaporates and `findTask(...).title` compiles silently.
- **`noImplicitAny`**: a parameter or variable the compiler can't infer a type for is an *error*, not a silent `any`. This is what forces you to annotate boundaries; without it, untyped code slides through as `any` and the type system quietly stops checking.

`noUncheckedIndexedAccess` is separate from `strict` (you opt in) and worth it: it makes `arr[i]` return `T | undefined`, because an index might miss — the same honesty about absence, applied to array access. It's why the playground typed `xs[0]` as possibly-undefined throughout.

The non-negotiable rule that strict mode enforces: **`strict: true` from day one, on every project.** Adding it to an existing untyped codebase is painful because every latent `any` and unhandled null surfaces at once; starting with it means you never accumulate the debt. A TypeScript project without `strict` is TypeScript-as-decoration — the types are there, but the compiler isn't really checking, and you get the syntax cost of types with little of the safety. The whole course assumed strict because strict is the only setting where the guarantees we built are true.

## Gotcha 1: `==` vs `===`

Types do not save you from JavaScript's coercion rules. `==` performs type [[coercion]] before comparing — `0 == ""`, `0 == false`, `null == undefined`, `[] == false` are all `true` — following a table of conversions almost no one has memorized. `===` compares without coercion: same type and same value, or `false`. The rule is absolute: **always `===`**, never `==`. The one idiomatic exception is `x == null`, which (by coercion) is `true` for both `null` and `undefined` and is a common shorthand for "nullish" — but even that is clearer written `x === null || x === undefined`.

:::predict
JavaScript's `==` coerces; `===` doesn't. What does each line print?

```typescript
console.log(0 == "");
console.log(0 === "");
console.log(null == undefined);
console.log(null === undefined);
```

- ( ) `false`, `false`, `false`, `false`
- ( ) `true`, `true`, `true`, `true`
- (x) `true`, `false`, `true`, `false`
- ( ) `false`, `true`, `false`, `true`
:::answer
`true`, `false`, `true`, `false`. With `==`, `0 == ""` coerces the empty string to the number `0`, so `0 == 0` is `true`; `null == undefined` is specially defined as `true` by the spec. With `===`, both are `false`: `0` and `""` are different types (number vs string), and `null` and `undefined` are different types too, so no coercion happens and the values don't match. This is exactly the kind of silent surprise that types can't help with — `==` is a runtime operator, its behaviour is fixed by JavaScript, and `tsc` will happily compile `0 == ""`. The defense is a lint rule and a habit: `===` always. A Python dev should note this is unlike Python's `==`, which doesn't coerce across unrelated types the way JS's `==` does — `0 == ""` is `False` in Python.
:::

## Gotcha 2: mutation through shared references

Types describe shape, not *mutability of the referent*. Two variables can point at the same object, and mutating through one is visible through the other — `const` stops *rebinding* the variable, not *mutating* the object (episode on primitives, in the classic course). A function that takes a `Task` and reassigns `task.status` changes the caller's task, because objects are passed by reference. This is identical to Python (`list`/`dict` are mutable references) — no surprise there — but the trap is assuming `const` or a type annotation implies immutability. They don't. For genuine immutability, use `readonly` fields (episode 10), `ReadonlyArray<T>`, or `as const`, which the compiler *does* enforce at compile time — but plain `Task` values are mutable, and a careless `Object.assign` or `.sort()` (which sorts in place) mutates shared state. The bug is real and the type system is silent about it unless you opt into `readonly`.

## Gotcha 3 (the big one): `JSON.parse` returns `any`, and types vanish at runtime

This is the gotcha the whole course has been pointing at, and it ties the final callback together. Two facts, both load-bearing:

**Types are erased.** After `tsc` checks your code, it deletes every type and emits plain JavaScript. There is no `Task` at runtime, no `Status`, no `Partial<Task>` — nothing to check a value against. You cannot write `if (value instanceof Task)` for an interface, because the interface doesn't exist at runtime. This has been the honesty refrain since episode 3, and here's where it bites hardest.

**`JSON.parse` returns `any`.** When data enters the program from outside — a file, a `fetch`, `localStorage`, a form — it arrives as `any` (or `unknown`), because the compiler has no idea what the bytes contain. `JSON.parse('...')` is typed to return `any`, and `any` is the type that *turns off* checking: assign it to a `Task`, and the compiler shrugs and believes you, performing no verification, because that's what `any` means.

:::play
```typescript
interface Task { id: number; title: string; status: "todo" | "doing" | "done"; }

// Pretend this came from a file or an API — it's malformed.
const raw = '{"id": "not-a-number", "title": 42, "status": "archived"}';

const task: Task = JSON.parse(raw); // compiles! JSON.parse returns `any`, which disables checking

// Every one of these is wrong, and the compiler said nothing:
console.log(task.id);            // "not-a-number" — a string, typed as number
console.log(task.title.length);  // 42 has no .length → undefined at runtime, no compile error
console.log(task.status);        // "archived" — not a valid Status, but no check ran
```
:::

Read that and feel the floor drop out. The `task` is declared `Task`, every field is wrong, and *the compiler accepted all of it* — because `JSON.parse` returned `any`, and assigning `any` to `Task` is unchecked by definition. At runtime, `task.id` is a string, `task.title.length` is `undefined` (number `42` has no `length`), `task.status` is a value that should be impossible. The type annotation `: Task` is a lie the compiler believed because `any` told it to. This is not a bug in TypeScript; it's the exact, unavoidable consequence of types being a compile-time construct over runtime values the compiler never sees.

## The final callback: the guard we deleted still has a job

So go back to episode 3, the moment we deleted `isTask` and `validateStatus` on camera and replaced them with `interface Task`. We were careful then to say: you did not rebuild `tsc`, and the runtime checker still owns the one job the compiler structurally cannot do — checking values that arrive from outside the program. Here is that job, made concrete.

At the I/O boundary — `JSON.parse`, `fetch`, form input, `localStorage` — the compiler's guarantee is gone, because types are erased and the incoming value is `any`. The *only* thing that can verify the shape of that runtime value is a runtime check: a function from a value to a verdict. Which is exactly `isTask`. The guard we deleted from the *interior* of the program (where the compiler is the better checker) is precisely the guard you must keep at the *boundary* (where the compiler was never present):

:::play
```typescript
type Status = "todo" | "doing" | "done";
interface Task { id: number; title: string; status: Status; }

// The episode-2 checker, returning to do the one job it was always best at.
// `value is Task` is a type predicate: if it returns true, tsc narrows `value` to Task.
function isTask(value: unknown): value is Task {
  if (typeof value !== "object" || value === null) return false;
  const v = value as Record<string, unknown>;
  return (
    typeof v.id === "number" &&
    typeof v.title === "string" &&
    (v.status === "todo" || v.status === "doing" || v.status === "done")
  );
}

function loadTasks(raw: string): Task[] {
  const parsed: unknown = JSON.parse(raw); // type it `unknown`, not `any` — forces a check
  if (!Array.isArray(parsed)) return [];
  return parsed.filter(isTask); // only values that pass the runtime check survive, typed Task[]
}

console.log(loadTasks('[{"id":1,"title":"real","status":"todo"},{"id":2,"title":42,"status":"x"}]'));
// [{ id: 1, title: "real", status: "todo" }] — the malformed second item is dropped
```
:::

There it is — the full arc closed. `isTask` is back, almost unchanged from episode 2, but now wearing one new piece of compile-time clothing: the return type `value is Task` is a **type predicate**, which tells the compiler that a `true` result means `value` is a `Task`. So `parsed.filter(isTask)` returns a `Task[]` — the runtime check and the static type system finally cooperating at the exact seam where they meet. We also typed `JSON.parse`'s result as `unknown` rather than letting it be `any`: `unknown` is `any`'s safe sibling — it accepts any value but lets you do *nothing* with it until you narrow, so it *forces* the `isTask` check instead of silently skipping it. That single change — `unknown` over `any` — is the discipline that makes the boundary safe.

This is the whole course in one function. We built `isTask` by hand (episode 2), felt its cost, met the compiler and deleted it from the interior (episode 3), grew the app in real types (episodes 4–11) — and now the checker returns to the one place it always belonged: the boundary, where data from the outside world meets a program whose types have been erased. The compiler checks your code; the runtime guard checks the world. A robust TypeScript program uses both, each where it's strong, and is honest about the line between them.

:::quiz
Summarize the division of labor the whole course built toward: what does `tsc` (the static type system) check, what does a runtime guard like `isTask` check, and why does a correct program need both rather than choosing one?
:::answer
`tsc` checks your **code**: it reasons, before the program runs, about the types of values flowing through every line you wrote, and proves properties across all paths — that `task.status = "done"` matches `Task`, that you handled every union case, that you narrowed away `undefined` before access. It is strictly more powerful than a runtime guard *for code the compiler can see*, costs nothing at runtime, and catches typos and missed cases a runtime check never could. But it checks types, not values, and it's **erased** before the program runs — so it knows nothing about a value that *arrives* at runtime from outside (JSON, network, forms, storage), which appears as `any`/`unknown`. A runtime guard like `isTask` checks an actual **value** while the program runs — a function from a value to a verdict — which is the only thing that can verify data the compiler never saw. A correct program needs both because they cover disjoint failure domains: `tsc` guards the interior against bugs in *your code*; the runtime guard guards the boundary against bad *data from the world*. Choosing only `tsc` leaves the I/O boundary unchecked (the `JSON.parse`-returns-`any` hole); choosing only runtime checks throws away compile-time coverage of your own code and pays a runtime cost everywhere. The honest architecture — the soul of this course — is `tsc` inside, runtime guards at the edges, `unknown` (never `any`) forcing the check at every seam between them.
:::

## Recap — and the ship

- Turn on **`strict: true`** from day one (plus `noUncheckedIndexedAccess`). `strictNullChecks` and `noImplicitAny` are what make every guarantee in this course real; without strict, TypeScript is decoration.
- **`===` always**, never `==` (coercion: `0 == ""` is `true`). Types describe shape, not **mutability** — `const` blocks rebinding, not mutation; use `readonly`/`as const` for real immutability.
- **Types are erased** and **`JSON.parse` returns `any`** — so at the I/O boundary the compiler's guarantee is gone and a wrong value sails through a `: Task` annotation unchecked.
- **The final callback:** the `isTask` guard deleted from the program's interior in episode 3 is exactly what the boundary still needs. Type `JSON.parse` as **`unknown`** (not `any`) to force the check, write `isTask` with a **`value is Task`** type predicate so the runtime check feeds the static system, and `.filter(isTask)` your input into a clean `Task[]`.
- **The division of labor:** `tsc` checks your code (interior); runtime guards check the world (boundary). A correct program uses both — that honesty is the whole point.

That's the build. We started with a plain-JS todo app and a silent typo bug, built a runtime checker by hand to feel what a type check *is*, met the compiler that does it better and deleted the checker on camera, then grew the same app through structural typing, unions, null-safety, generics, functions, classes, and computed types — and closed the loop by bringing the runtime guard back to the one boundary it never stopped owning. You didn't rebuild `tsc`. You built the mental model of what a type check is — a function from a value to a verdict — and you now know exactly where the compiler does that for you and where you still have to do it yourself. Ship it.
