---
title: The setup story
subtitle: Why TS exists, and the compile step that has no Python equivalent
---

## Something happens in between

Your `.py` file runs as-is: `python greet.py` and you're done. Your `.ts` file cannot — no runtime executes TypeScript directly. Something has to happen between the file you write and the program that runs. That something is the whole reason TS exists, and it's the one piece with no Python equivalent.

## The one-sentence model

**TypeScript = JavaScript + a static type layer that is checked, then deleted.**

The closest Python analog is **mypy** — but the relationship is inverted from what you're used to.

| | Python + mypy | TypeScript |
|---|---|---|
| Types are… | an optional bolt-on (`pip install mypy`) | the language itself |
| Who runs your code | `python` runs `.py` directly | the browser/Node run **JS**, not TS — you compile first |
| Types at runtime | partly present (`isinstance`, `__annotations__`) | **gone entirely** |
| A bad type | a warning; code still runs | a compile error — but the JS can still run |

## The transpile step

In Python you write `.py` and run it. In TS you write `.ts`, **`tsc` compiles it to `.js`**, and you run the `.js`.

:::compare run
```python
# greet.py — you run this directly
greeting: str = "hi"
print(greeting.upper())
```
```typescript
// greet.ts — tsc compiles this to greet.js first
const greeting: string = "hi";
console.log(greeting.toUpperCase());
```
:::

:::predict
You compile the `greet.ts` above with `tsc`. Before looking — what does the emitted `greet.js` contain? Specifically, what happens to `: string`?

- ( ) It survives as a runtime tag the engine can check (like `__annotations__`).
- ( ) It becomes a runtime `typeof` assertion inserted by `tsc`.
- (x) It is erased — the emitted JS has no trace of it.
- ( ) It stays as a comment for tooling.
:::answer
The annotation is **gone**. `greet.js` is just:

```javascript
// greet.js — the type annotation simply vanished
const greeting = "hi";
console.log(greeting.toUpperCase());
```

`: string` was **erased**. If you expected it to survive (a runtime type tag, a check), that's the Python intuition (`__annotations__`, `isinstance`) misfiring. This is the single most important fact in the lesson: TS types guide the compiler, then disappear.
:::

So one annotation vanished. The same fate awaits every type in the file. Before you read the diagram below, predict where in the pipeline the types still exist — and where they're already gone.

The full erase pipeline, end to end:

```
  greet.ts ──tsc──▶ type-check ──▶ strip all types ──▶ greet.js ──node/browser──▶ runs
  (types here)       (errors here)   (types deleted)     (plain JS)    (no types here)
```

Everything left of `greet.js` is compile time; everything right of it is runtime. Types live only on the left.

## Consequence: no runtime type info

In Python you lean on runtime type identity all the time. In TS you cannot check against a type that doesn't exist at runtime.

:::compare
```python
def handle(x):
    if isinstance(x, str):   # real runtime check
        return x.upper()
```
```typescript
function handle(x: unknown): string | undefined {
  if (typeof x === "string") {  // typeof: a real JS operator
    return x.toUpperCase();
  }
}
```
:::

You can check JS-level things (`typeof`, `instanceof` against real classes), but **never** an `interface` or `type` — those have no runtime existence. Burn this in: *types are a compile-time fiction; runtime is plain JS.*

## "Checked, then deleted" — the gotcha

Because checking and running are separate steps, `tsc` will (by default) **still emit JS even when type-checking fails**. The error is advisory unless your build is wired to block on it.

Run the block below. You'll see the type error reported *and* the program execute anyway — the error is real, but it doesn't stop the run. Then change `"not a number"` to a real number and run again to clear it.

:::play
```typescript
const n: number = "not a number"; // tsc reports an error here…
console.log(n);                    // …yet this still runs. JS doesn't care.
```
:::

`tsc` writes `const n = "not a number";` to the `.js`, which runs fine. This will feel familiar: mypy complaining never stops `python` from running either.

## Minimum setup to follow along

You don't need a build pipeline to learn. Easiest first:

```bash
# 1. Browser, zero install — best for this course.
#    Use this site's Playground (sidebar -> Playground): real compiler, live diagnostics.

# 2. Run a .ts file directly:
bun run greet.ts          # bun executes TS natively, no compile step you see

# 3. The real compiler:
npx tsc greet.ts && node greet.js
```

> Use the **Playground** for these lessons. Seeing types erased into JS reinforces everything above.

## The one config knob that matters now

A project's TS behavior lives in `tsconfig.json` (think `pyproject.toml [tool.mypy]`). One setting dominates:

```json
{
  "compilerOptions": {
    "strict": true
  }
}
```

`strict: true` turns on the checks that make TS actually useful — especially null safety (Lesson 06). Mentally it's mypy's `--strict`. **Every example in this course assumes it's on.**

:::quiz
Quick check: `tsc` reports a type error in your file. Does it still produce a `.js`?
:::answer
**Yes — by default.** Checking and emitting are separate steps, so `tsc` writes the `.js` even when type-checking fails (the JS may run fine; JS doesn't care about your types). To make a failing check *block* the build you opt in with `noEmitOnError` (Lesson 12). This mirrors mypy never stopping `python` from running.
:::

## Recap

- TS = JS + erasable types. Runtime is pure JS.
- The compile step (`tsc`) is mandatory and new vs Python.
- No `isinstance`-on-interfaces; use `typeof` / `instanceof` on real values.
- Type errors don't block emit by default (like mypy not blocking `python`).
- Learn in the Playground; always `strict: true`.

:::quiz
Why can't this work in TypeScript?

```typescript
interface User { name: string }
function f(x: unknown) {
  if (x instanceof User) console.log("a user!");
}
```
:::answer
Because `interface User` is **erased at compile time** — it has no runtime existence, so there is no `User` value for `instanceof` to test against. `instanceof` only works on real runtime constructors (classes, built-ins like `Date`). To check the shape at runtime you'd write a manual guard, e.g. `typeof x === "object" && x !== null && "name" in x` (more on type guards in Lesson 08).
:::

If erasure is so total, one question should nag: what does the compiler still *know* about a value once the annotations are gone? More than you'd guess — and Lesson 02 starts with where that knowledge comes from, in how `const` and `let` infer different types from the very same literal.
