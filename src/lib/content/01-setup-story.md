---
title: The setup story
subtitle: Why TypeScript exists, and what its compile step does that Python's doesn't
---

## The step between writing and running

In Python the file you write is the file that runs: `python greet.py` executes `greet.py` directly. The TypeScript equivalent doesn't, and the difference is worth getting exactly right.

```bash
python greet.py     # runs greet.py
node greet.ts       # depends on your Node version
```

`node greet.ts` does one of two things depending on your Node version. Before 22.18 it throws a `SyntaxError` — the parser reaches `const greeting: string` and has no rule for `: string`. On 22.18 and later it runs, because Node strips the annotations and executes the JavaScript underneath. Neither case executes the type syntax: one rejects it, the other deletes it first. No engine — V8, the browser, Node — runs TypeScript's types. Something always turns your `.ts` into JavaScript before it runs, and most early confusion about TypeScript is really confusion about that step. This lesson is about that step.

## Python compiles too

You'll often hear the difference stated as: Python runs your source directly, TypeScript has to be compiled first. That's not accurate — Python compiles too.

When you run `python greet.py`, CPython doesn't hand your source to the CPU. It compiles the source to bytecode — an instruction set for the Python virtual machine — and the VM executes the bytecode. The artifacts are visible: import a module and a `__pycache__/` directory appears next to it with files like `greet.cpython-311.pyc`, the cached bytecode. (The script you run directly is compiled the same way; CPython just keeps its bytecode in memory instead of writing the `.pyc`.) So Python has a compile step. It's automatic, invisible, and it targets the runtime that's already running, so you never had to think about it.

The real difference isn't whether there's a compile step — both languages have one — it's what each step does. CPython's step is a translation: source to bytecode for the same runtime, and it never looks at your types. Annotate a variable `x: int = "definitely not an int"` and CPython compiles and runs it without complaint; to the runtime the annotation is a no-op. `tsc`, the TypeScript compiler, does two things CPython's compiler never does: it reads your types and checks them against each other across the program, and it translates your code into a *different* language — JavaScript — that a *different* runtime (V8, Node, the browser) executes. The types are checked on the way through and then removed. None survive into the JavaScript.

## The one-sentence model

> TypeScript is JavaScript plus a static type layer that is checked, then [[erased|type-erasure]].

Most of the language follows from that sentence. The closest thing you know is [[mypy]], but the relationship is inverted:

| | Python + [[mypy]] | TypeScript |
|---|---|---|
| What the types are | an optional bolt-on you `pip install` | the language itself — there is no TS without them |
| What runs your code | `python` runs your `.py` (via bytecode) | V8 / Node / the browser run **JavaScript**, never your `.ts` |
| The type checker is | a separate tool you choose to run, or don't | the compiler; checking is part of the build |
| Types at runtime | module-, class-, and signature-level annotations stay in `__annotations__`; locals vanish | gone — every type, every scope |
| A type violation | [[mypy]] warns; `python` runs it anyway | `tsc` errors, then emits the JS anyway, which usually runs fine |

The last row is the one most likely to surprise you, and we'll come back to it. First, the obvious question once you hear "the types are [[erased|type-erasure]]."

## If the types get deleted, what was the point?

It's the right question. You write annotations, the compiler checks them, and the result is discarded before the program runs. Python at least keeps some of your annotations — module-, class-, and function-signature annotations stay in `__annotations__`, where a library like pydantic can read them back and build a runtime validator (annotations on plain local variables are discarded, the same as in TypeScript). TypeScript keeps none. So why bother?

Because the value of types is collected before runtime, and once it's collected, keeping the types around buys nothing.

Consider where that value actually lands. The error under your variable the moment you assign the wrong thing to it, before you save or run — a faster feedback loop than any test. Autocomplete that knows every field of an object because it knows the object's type. Renaming a function and having all thousand call sites updated correctly instead of by grep-and-replace. A function written in January and a call site written in June, kept consistent by a contract the compiler rechecks on every edit — one that can't silently go out of date the way a docstring can, because the moment the code and the type disagree the build fails. And the ability to model data so an invalid state can't be represented at all — say, a request that can't be both `"loading"` and carrying an error at once — which removes a class of bug instead of guarding against it (more when we reach unions).

Every one of those is a compile-time or edit-time benefit. None needs the type to exist while the program runs. By the time the code executes the types have done their work, so erasing them costs nothing and saves the bytes and cycles of carrying them. That's why TypeScript [[erases|type-erasure]] — not as a limitation, but because there's no reason to keep them.

The comparison with Python is worth making precise, because it's an actual rule and not a slogan. Python keeps its class- and signature-level annotations, so a validator like pydantic can reuse them at runtime; TypeScript [[erases|type-erasure]] its types, so the same job needs a separately declared schema ([[zod]] and similar). But this isn't a free win for TypeScript. The moment data arrives from outside the program — a request body, a parsed JSON file, an environment variable — its type is unchecked, and `tsc` has nothing to say about it, because there was no source for it to read. There you need a runtime validator, and you pay for it in either language. So the accurate summary isn't "TypeScript is faster because it [[erases|type-erasure]]." It's this: the compiler checks everything whose shape is known when you write it, once and for free; everything else stays unchecked until something verifies it at runtime. Real systems use both — `tsc` for the code's internal contracts, a runtime schema at the edges. TypeScript has a type for that not-yet-checked data, `unknown`, which we'll meet at type guards.

## Watching a type get erased

This is easier to see than to describe. Here's `greet.ts` next to its Python counterpart; the right panel is live, so run it:

:::compare run
```python
# greet.py — CPython compiles this to bytecode, then runs it
greeting: str = "hi"
print(greeting.upper())
```
```typescript
// greet.ts — tsc checks this, strips the types, emits greet.js
const greeting: string = "hi";
console.log(greeting.toUpperCase());
```
:::

Before reading on: you compile `greet.ts` with `tsc`. In the emitted JavaScript, what becomes of `: string`?

:::predict
What does the emitted `greet.js` contain — specifically, what becomes of `: string`?

- ( ) It survives as a runtime tag the engine can inspect, the way Python keeps `__annotations__`.
- ( ) `tsc` rewrites it into a runtime `typeof` assertion that throws if the value isn't a string.
- (x) It's [[erased|type-erasure]] — the emitted JavaScript holds no trace it was ever there.
- ( ) It's preserved as a comment so other tools can still read it.
:::answer
[[Erased|type-erasure]]. Assuming a modern compile target (the one this site's Playground uses), `greet.js` is just:

```javascript
// greet.js — the annotation is gone
const greeting = "hi";
console.log(greeting.toUpperCase());
```

(With `tsc`'s default target it would also rewrite `const` to `var` — emit downlevels syntax as well as stripping types — but that's separate from [[erasure|type-erasure]].) Expecting `: string` to leave a trace is the `isinstance` reflex: a runtime-type intuition applied where it doesn't hold. The annotation existed only so `tsc` could confirm that `.toUpperCase()` is a legal call on `greeting`. Once confirmed, it's removed.
:::

What happens to `: string` happens to every type in the file:

```
  greet.ts ──tsc──▶ type-check ──▶ strip all types ──▶ greet.js ──node/browser──▶ runs
 (types exist)     (errors here)    (types deleted)    (plain JS)    (no types here)
```

Everything left of `greet.js` is compile time, the only place types exist. Everything right of it is runtime — plain JavaScript, no types. A large share of "why won't TypeScript let me do this?" questions come down to which side of that line you're on.

## No runtime type to inspect

The first practical consequence affects Python developers in particular, because you rely on runtime type identity often.

:::compare
```python
def handle(x):
    if isinstance(x, str):       # checks a real runtime type
        return x.upper()
```
```typescript
function handle(x: unknown): string | undefined {
  if (typeof x === "string") {   // typeof is a JavaScript operator
    return x.toUpperCase();
  }
}
```
:::

These look equivalent but aren't the same kind of check. `isinstance` asks Python about an object's class, which is itself a runtime object you can query. `typeof` works in TypeScript only because it's a JavaScript operator inspecting JavaScript values (`"string"`, `"number"`, `"object"`, and a few others); it survived [[erasure|type-erasure]] because it was never part of TypeScript.

Use a type that exists only in TypeScript and it doesn't work:

```typescript
interface User { name: string }
function f(x: unknown) {
  if (x instanceof User) { /* ... */ }   // TS2693: 'User' only refers to a type, but is being used as a value here
}
```

`User` is an interface, which has no runtime existence; by the time the code runs there's no `User` for `instanceof` to test against, and `tsc` rejects the line. You can check real runtime things — `typeof` for primitives, `instanceof` for actual classes and built-ins like `Date` — but not an interface or a type. To verify a shape at runtime you write the check by hand against real values (`typeof x === "object" && x !== null && "name" in x`); doing that well is the subject of type guards, in Lesson 08. The limitation follows directly from the one-sentence model.

## A type error doesn't stop the build

Back to the last row of the table. Because checking and emitting are separate steps in `tsc`, a type error does not, by default, prevent JavaScript from being produced.

Run this; the error is reported and the program runs anyway:

:::play
```typescript
const n: number = "not a number"; // tsc reports an error here
console.log(n);                    // it runs anyway
```
:::

`tsc` reports the error and still writes `const n = "not a number";` to the `.js`, which is valid JavaScript that prints a string. The error is real and worth fixing, but on its own it's advisory; it doesn't stop the build.

This matches [[mypy]]'s relationship to `python`: [[mypy]] can report a type error and `python` will still run the file. The difference is that in TypeScript the checker and the build are the same command, so it's easy to assume an error halts everything. It doesn't, unless you opt in (`noEmitOnError`, or a bundler/CI step set to fail on type errors; Lesson 12). It's also worth knowing the checker isn't a proof of correctness: TypeScript is deliberately [[unsound|soundness-vs-completeness]] in a few common places — array [[covariance|variance]], function-parameter [[bivariance|variance]], and any `as` assertion — trading some guarantees for usability ([[soundness vs completeness|soundness-vs-completeness]], later). The practical model is that a type error is the compiler's advice, not the runtime refusing to run. They're separate authorities, and telling them apart is most of what makes the early experience confusing.

## Running TypeScript yourself

To learn the language you mainly need a fast loop between writing a type and seeing the compiler respond.

The **Playground** in this site (sidebar → Playground) is the best option for the course: the real compiler in the browser, with live diagnostics and the emitted JavaScript shown beside your source. Watching the JavaScript change as you edit the TypeScript is the most direct way to internalize [[erasure|type-erasure]].

To run files locally:

```bash
# Run a .ts file with no separate build step:
bun greet.ts          # Bun strips the types and runs the JS; it does not type-check

# The compiler and runtime as two explicit steps:
npx tsc greet.ts && node greet.js
```

That `bun` note generalizes, and the details matter. Bun and `tsx` strip types and run with no type-checking. Others differ: `ts-node` type-checks by default (skip it with `--transpile-only`), and Deno's `deno run` skips the check while `deno test` and `deno check` perform it; Node's built-in stripping doesn't check either. The rule underneath: running and type-checking are separate, and a tool that runs your code tells you nothing about whether it type-checks. The check is its own step — `tsc --noEmit`, or your editor.

## The one setting that matters: `strict`

A project's TypeScript behavior lives in `tsconfig.json` (compare `pyproject.toml`'s `[tool.mypy]`). There are many flags, but one decides whether the type system is useful:

```json
{
  "compilerOptions": {
    "strict": true
  }
}
```

`strict` enables the checks that give the type system its value — chiefly null safety (the source of every `AttributeError: 'NoneType' object has no attribute ...`; Lesson 06) and a ban on implicit `any`. With `strict` off, TypeScript infers `any` for anything it can't determine and passes nulls through unchecked, which types your code in name only. It's the equivalent of [[mypy]]'s `--strict`, and every example in this course assumes it's on. The habit worth keeping: start projects strict, and don't disable it to clear an error.

## Recap

- Both languages have a compile step. Python's translates to bytecode for the same runtime and ignores types; TypeScript's checks types and translates to JavaScript.
- TypeScript is JavaScript plus a type layer that's checked, then [[erased|type-erasure]]. What runs is plain JS.
- [[Erasure|type-erasure]] isn't a compromise: types do their work at compile and edit time, so keeping them at runtime would only add cost.
- There's no runtime type information — use `typeof` / `instanceof` on real values, never `instanceof` on an interface or type.
- A type error is advice, not a stop: `tsc` emits JS anyway by default, as [[mypy]] never stops `python`.
- Use the Playground; keep `strict: true`.

:::quiz
`tsc` reports a type error in your file. Does it still produce a `.js`?
:::answer
By default, yes. Checking and emitting are separate steps, so `tsc` writes the `.js` even when the check fails (and that JS often runs fine, since JavaScript has no knowledge of your types). To make a failing check block the build, opt in with `noEmitOnError` or a CI/bundler gate (Lesson 12). It's the same as [[mypy]] never standing between you and `python`.
:::

[[Erasure|type-erasure]] is total: once the code runs, the compiler's knowledge of it is gone. That leaves a question about the other side of the line. While the types still exist, how much does the compiler actually know about your values? You wrote `const greeting: string = "hi"`, but the `: string` may have been unnecessary. The compiler infers more than you tell it, and it treats `const` and `let` differently when it does. That's Lesson 02: the same literal, two variables, two different types, and why.
