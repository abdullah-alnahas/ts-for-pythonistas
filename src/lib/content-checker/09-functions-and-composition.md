---
title: A library of combinators
subtitle: Function types, higher-order checkers, and the realization that we've been building a combinator library all along
---

## Where we pick up

Look back at what we've built. `checkString`, `checkNumber`, `checkBoolean` — primitives. `checkObject`, `checkUnion`, `checkOptional`, `checkArray`, `checkLiteral` — and notice the shape they share. Each of the latter group is a function that *takes* checkers (or a shape, or values) and *returns* a checker. We've called them "builders" loosely. They have a real name: **combinators**. A combinator is a function that combines smaller things of a kind into a bigger thing of the same kind — here, smaller checkers into a bigger checker. This episode doesn't add a new *kind* of type. Instead it steps back and makes the design explicit: we've been writing a combinator library, the same architecture as parser combinators, query builders, and — the punchline of next episode — the way a type system itself is assembled. To see it clearly we need to be precise about *function types*, because in a combinator library functions are the values you pass around, and their types are the contract that makes composition safe.

## Function types: the contract of a combinator

We've leaned on function types since Episode 2 without dwelling on the notation. `Checker<T>` is a function type:

```typescript
type Checker<T> = (value: unknown) => Result;
```

Read it as a signature with no name: a function taking one `unknown`, returning a `Result`. TypeScript's function-type syntax is `(params) => returnType` — the same arrow as an arrow function, but in *type* position it describes the function rather than being one. This is where TypeScript is more expressive than Python's `Callable`:

:::compare
```python
from typing import Callable
# Callable[[ArgTypes], Return] — positional only, names lost
Checker = Callable[[object], tuple[bool, str | None]]

# a combinator: takes a Checker, returns a Checker
def check_optional(c: Checker) -> Checker: ...
```
```typescript
type Checker<T> = (value: unknown) => Result;

// a combinator: takes a Checker, returns a Checker
function checkOptional<T>(check: Checker<T>): Checker<T | undefined> { /* ... */ }
//                       ^ input is a function type   ^ output is a function type
```
:::

Python's `Callable[[object], R]` works but loses parameter *names* and reads awkwardly once nested. TypeScript's `(value: unknown) => Result` keeps the parameter name (documentation that survives into tooling) and nests cleanly: a combinator's type is literally `(check: Checker<T>) => Checker<T[]>` — a function from a function to a function, and the notation stays readable at that depth. That readability isn't cosmetic; it's what lets you *think* in combinators, because the type of a combinator tells you exactly how it composes.

## Higher-order checkers, named

A function that takes or returns functions is **higher-order** — the same word Python uses for `map`, `filter`, and decorators. Every builder we wrote is higher-order:

- `checkOptional(check)` — takes a checker, returns a checker. Higher-order.
- `checkArray(checkElem)` — takes a checker, returns a checker. Higher-order.
- `checkObject(shape)` — takes a map *of* checkers, returns a checker. Higher-order.
- `checkUnion(...checkers)` — takes many checkers, returns a checker. Higher-order.

This is why they compose with no special glue: a combinator's output (a `Checker`) is exactly what another combinator accepts as input. The pieces fit because they share one type. We saw this already — `checkArray(checkArray(checkString))` nests to `Checker<string[][]>` — but now we can say *why* it always works: composition is closed under the `Checker` type. Output of one is valid input to the next, indefinitely.

Let's prove the library composes by building something real: a checker for a `Board` — a named string, and a list of columns, each column a name plus a list of tasks, each task a title and a done flag. Every combinator we own, stacked:

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

// the whole library, composed into one checker for a nested shape:
const checkTask = checkObject({
  title: checkString,
  done: checkBoolean,
  notes: checkOptional(checkString),
});
const checkColumn = checkObject({
  name: checkString,
  tasks: checkArray(checkTask),
});
const checkBoard = checkObject({
  name: checkString,
  columns: checkArray(checkColumn),
});

const board = {
  name: "Sprint 7",
  columns: [
    { name: "Todo", tasks: [{ title: "spec", done: false }] },
    { name: "Done", tasks: [{ title: "setup", done: true, notes: "merged" }] },
  ],
};
console.log(checkBoard(board)); // { ok: true }

const broken = { name: "X", columns: [{ name: "Todo", tasks: [{ title: 1, done: false }] }] };
console.log(checkBoard(broken)); // field "columns": index 0: field "tasks": index 0: field "title": expected string
```
:::

That error message is the combinator library showing off: it traces the exact path to the failure — `columns → index 0 → tasks → index 0 → title` — because each combinator prefixes its context onto the inner error. We never wrote path-tracking logic; it *emerged* from each piece doing its small job and passing the inner `Result` up. That's the dividend of composition: behavior you didn't explicitly design falls out of pieces that compose cleanly.

## A combinator that builds combinators

We can go one level higher, and it's worth doing once to feel the ceiling. So far combinators take checkers and return checkers. But a checker is a value, so a combinator is a value too — which means we can write a function that *builds* combinators. Consider `withMessage`: it takes a checker and a custom error string, and returns a *new* checker that runs the original but replaces the error with yours. It's a combinator that decorates a checker — the runtime twin of a Python decorator:

:::play
```typescript
type Result = { ok: true } | { ok: false; error: string };
type Checker<T> = (value: unknown) => Result;
const ok = (): Result => ({ ok: true });
const err = (e: string): Result => ({ ok: false, error: e });
const checkString: Checker<string> = (v) => typeof v === "string" ? ok() : err("expected string");

// a combinator that transforms a checker into a checker with a better message:
function withMessage<T>(check: Checker<T>, message: string): Checker<T> {
  return (value) => {
    const r = check(value);
    return r.ok ? r : err(message);
  };
}

// refine: run a base checker, then an extra predicate on the value:
function refine<T>(check: Checker<T>, predicate: (v: T) => boolean, message: string): Checker<T> {
  return (value) => {
    const r = check(value);
    if (!r.ok) return r;
    return predicate(value as T) ? ok() : err(message);
  };
}

const checkEmail = refine(
  checkString,
  (s) => s.includes("@"),
  "expected an email address",
);
const checkName = withMessage(checkString, "name must be a string");

console.log(checkEmail("a@b.com")); // { ok: true }
console.log(checkEmail("nope"));    // { ok: false, error: "expected an email address" }
console.log(checkName(42));         // { ok: false, error: "name must be a string" }
```
:::

`refine` is the combinator that finally lets our checker do what types alone never could: check a *value-level* constraint ("contains an `@`", "is positive", "is non-empty") on top of a type-level one ("is a string"). This is the edge of what a static type system reaches — TypeScript can say `string`, but not "string containing `@`" without elaborate [[template literal|template-literal-types]] gymnastics, and never "a number greater than zero." Our runtime checker checks the actual value, so it sails past that limit effortlessly. Note exactly where the boundary falls: `tsc` checks *shape*; `refine` checks *content*. That gap is the reason runtime validation will always have a job no compiler can take.

:::predict
`refine` is typed `refine<T>(check: Checker<T>, predicate: (v: T) => boolean, ...)`. When we call `refine(checkString, (s) => s.includes("@"), ...)`, what is the type of `s` inside the predicate, and how did the compiler determine it?

- ( ) `unknown` — every checker input is `unknown`, so the predicate's input is too.
- (x) `string` — `T` is solved to `string` from `checkString: Checker<string>`, so `predicate` is `(v: string) => boolean`.
- ( ) `any` — predicates lose type information.
- ( ) A compile error — `T` can't be inferred from a generic argument.
:::answer
`s` is `string`. The compiler infers `T = string` from the first argument (`checkString` is a `Checker<string>`), and that solved `T` flows into the *third* type position: `predicate: (v: T) => boolean` becomes `(v: string) => boolean`. So `s.includes("@")` type-checks — `includes` is a string method — with no annotation on `s`. This is [[inference|hindley-milner]] threading one type parameter through three positions of a single call: the checker's element type *becomes* the predicate's argument type. It's the same machinery as `checkArray`'s `Checker<T> → Checker<T[]>`, now connecting a checker to a predicate over the values it accepts. The phantom `T` on `Checker<T>` (Episode 7) is what carries `string` from the checker to the predicate.
:::

## What we actually built

Step back and name the whole thing. We have:

- **Atoms** — `checkString`, `checkNumber`, `checkBoolean`, `checkLiteral(v)` — the irreducible checks.
- **Combinators** — `checkObject`, `checkUnion`, `checkOptional`, `checkArray`, `refine`, `withMessage` — that combine checks into checks.
- **An adapter** — `toGuard` (Episode 8) — that connects the library to the compiler's narrowing.

That is a *combinator library*: a small set of atoms, a small set of combinators closed over a single type (`Checker<T>`), and the property that any composition of them is itself a valid member. From a handful of pieces you can describe an unbounded space of data shapes — primitives, records, lists, unions, optionals, refinements, nested arbitrarily. This is one of the most powerful architectures in programming, and you built it incrementally without it ever feeling like architecture, because each episode added exactly one piece that fit the ones before.

:::quiz
We keep saying the library is "closed over `Checker<T>`." What does that closure property actually buy us — and what would break if even one combinator returned something *other* than a `Checker` (say, `checkArray` returned a raw `boolean`)?
:::answer
"Closed over `Checker<T>`" means every combinator's output is a `Checker<T>`, which is exactly the type every combinator accepts as input. That closure is what makes *arbitrary composition* possible: because `checkArray(x)` is a `Checker`, it can be the element of another `checkArray`, a field in a `checkObject` shape, a branch of a `checkUnion`, or the inner check of a `checkOptional` — without any adapter. If `checkArray` returned a `boolean` instead, that boolean couldn't be fed to `checkObject` (which expects `Checker`s as field values), so `checkObject({ tags: checkArray(checkString) })` would no longer type-check, and the whole compositional structure would collapse into special-case glue. The single shared type is the entire load-bearing idea — it's why the library scales from `checkString` to `checkBoard` with no new connective machinery. Uniformity of the return type *is* composability.
:::

## Recap

- The "builders" we've written all along are **combinators**: functions that combine checkers into checkers. The library is atoms (`checkString`…) + combinators (`checkObject`, `checkArray`, `checkUnion`, `checkOptional`, `refine`) + an adapter (`toGuard`).
- A *function type* is `(params) => Return` in type position — more expressive than Python's `Callable` (keeps parameter names, nests readably), which is what lets you think in combinators.
- Every combinator is **higher-order** (takes/returns functions). They compose with no glue because each one's output is a `Checker`, exactly what the next accepts — the library is *closed over `Checker<T>`*.
- Composition yields behavior you didn't design: nested error paths emerge from each combinator prefixing its context.
- `refine` checks *value-level* constraints (`includes("@")`, `> 0`) that a static type system can't express — `tsc` checks shape, `refine` checks content. That gap is the permanent job of runtime validation.
- Generic inference threads one `T` through multiple positions (`refine`'s checker → predicate), so the predicate's argument type is the checker's element type, for free.

The library is complete and coherent. The last episode is the reveal we've been building toward since the first line: that `tsc` is *this checker* — the same atoms-and-combinators idea, run at compile time, on your code, structurally, before anything executes. We'll make that precise, then deliver the honest correction it requires: you did not rebuild the compiler, and the runtime checker you built still has a job the compiler can never do.
