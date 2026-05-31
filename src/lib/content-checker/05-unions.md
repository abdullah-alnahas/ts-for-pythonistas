---
title: One of several
subtitle: checkUnion passes if any branch passes — and "which branch passed" is exactly how narrowing works
---

## Where we pick up

Our checker handles primitives and fixed object shapes. Every checker so far asks a single yes/no question about one fixed type: *is this a string? a boolean? this exact object shape?* But real data isn't always one fixed type. An ID is "a `string` *or* a `number`." A task's status is "exactly one of `'todo'`, `'doing'`, `'done'`." A field is "a number *or* the string `'unknown'`." These are *unions* — "this value is one of several types" — and our checker can't express them yet.

The need shows up the moment you try. Suppose a `Task`'s `id` can be either a string or a number, both legal:

```typescript
const checkId = ???; // pass if it's a string OR a number
```

We have `checkString` and `checkNumber`. What we lack is a way to say "pass if *either* of these passes." So we build it: `checkUnion`, a checker that takes several checkers and succeeds if *any one* of them succeeds. And once it's built, the question it has to answer — *which* branch passed? — turns out to be the exact mechanism behind one of TypeScript's defining features, [[narrowing]].

## Building `checkUnion`

A union check is an OR over checkers: run each branch's checker, and the value passes if at least one says `ok`. Only if *all* of them fail does the union fail. `checkUnion` takes a variable number of checkers (rest parameters — JavaScript's `*args`) and returns a new checker:

:::play
```typescript
type Result = { ok: true } | { ok: false; error: string };
type Checker = (value: unknown) => Result;
const ok = (): Result => ({ ok: true });
const err = (e: string): Result => ({ ok: false, error: e });
const checkString: Checker = (v) => typeof v === "string" ? ok() : err("expected string");
const checkNumber: Checker = (v) => typeof v === "number" ? ok() : err("expected number");

function checkUnion(...checkers: Checker[]): Checker {
  return (value) => {
    for (const check of checkers) {
      if (check(value).ok) return ok();   // any branch passing = the union passes
    }
    return err(`value matched none of the ${checkers.length} union branches`);
  };
}

const checkId = checkUnion(checkString, checkNumber);

console.log(checkId("abc")); // { ok: true }  — matched checkString
console.log(checkId(42));    // { ok: true }  — matched checkNumber
console.log(checkId(true));  // { ok: false } — matched neither
```
:::

That's the whole mechanism. The loop tries each branch in order and short-circuits on the first success. It's the mirror image of `checkObject`, which ANDed its fields (any failure fails the whole) — `checkUnion` ORs its branches (any success passes the whole). Together those two combinators — AND over fields, OR over alternatives — are enough to describe a startling fraction of all real-world data shapes. `checkObject` builds *product* types ("this AND that AND that"); `checkUnion` builds *sum* types ("this OR that"). Every data description you'll ever write is some tree of those two.

:::compare
```python
# Python: Union (or the | syntax) — checked by isinstance with a tuple
from typing import Union

def check_id(v) -> bool:
    return isinstance(v, (str, int))  # the tuple IS an OR over branches

ID = Union[str, int]   # the static type; or: str | int
```
```typescript
const checkId = checkUnion(checkString, checkNumber);
// the static type this verifies:
type ID = string | number;
```
:::

Python's `isinstance(v, (str, int))` — passing a *tuple* of types — is literally an OR over branches, the runtime twin of our loop. And the static type `str | int` is spelled `string | number` in TypeScript, with the same `|`. Our `checkUnion(checkString, checkNumber)` is the runtime verification of exactly that static `string | number`. The two encodings, again — the check you run and the type the compiler checks — lined up.

## Literal checks: unions of exact values

Unions get sharper when the branches aren't whole types but *exact values*. A status field isn't "any string" — it's exactly one of `'todo'`, `'doing'`, `'done'`. To check that, we need a checker for a single literal value. It's the simplest builder yet:

```typescript
function checkLiteral(expected: string | number | boolean): Checker {
  return (value) =>
    value === expected ? ok() : err(`expected ${JSON.stringify(expected)}, got ${JSON.stringify(value)}`);
}
```

`checkLiteral("todo")` passes only for the exact string `"todo"`. Now union them:

:::play
```typescript
type Result = { ok: true } | { ok: false; error: string };
type Checker = (value: unknown) => Result;
const ok = (): Result => ({ ok: true });
const err = (e: string): Result => ({ ok: false, error: e });
function checkUnion(...cs: Checker[]): Checker {
  return (v) => { for (const c of cs) if (c(v).ok) return ok(); return err("matched no branch"); };
}
function checkLiteral(expected: string | number | boolean): Checker {
  return (v) => v === expected ? ok() : err(`expected ${JSON.stringify(expected)}`);
}

const checkStatus = checkUnion(
  checkLiteral("todo"),
  checkLiteral("doing"),
  checkLiteral("done"),
);

console.log(checkStatus("todo"));     // { ok: true }
console.log(checkStatus("done"));     // { ok: true }
console.log(checkStatus("finished")); // { ok: false } — not one of the three
```
:::

This verifies the static type `"todo" | "doing" | "done"` — a union of [[literal types|nominal-vs-structural]], the exact thing the primitives lesson called "a closed set, checked at every assignment." It's TypeScript's equivalent of Python's `Literal["todo", "doing", "done"]` and the idiomatic replacement for a string `enum`. Our runtime `checkStatus` is what enforces that closed set on a value that came from outside the program, where the compiler's guarantee has already evaporated.

:::compare
```python
from typing import Literal
Status = Literal["todo", "doing", "done"]
def check_status(v) -> bool:
    return v in ("todo", "doing", "done")
```
```typescript
type Status = "todo" | "doing" | "done";
const checkStatus = checkUnion(
  checkLiteral("todo"), checkLiteral("doing"), checkLiteral("done"),
);
```
:::

## "Which branch passed" is narrowing

Now the part that connects to the rest of the type system. Our `checkUnion` returns `ok()` the moment a branch passes — but it *throws away which branch it was*. For a yes/no verdict that's fine. But think about what you actually want to do after the check succeeds: if the value matched `checkString`, you want to treat it as a string; if it matched `checkNumber`, as a number. Knowing it's *one of* the two isn't enough to use it — you need to know *which*.

That act — going from "this is `string | number`" to "in this branch, it's specifically a `string`" — is [[narrowing]], and it is the central thing TypeScript does with unions. Watch the compiler do it:

:::play
```typescript
function describe(id: string | number): string {
  if (typeof id === "string") {
    // narrowed: here, id is string. .toUpperCase() is allowed.
    return `string of length ${id.length}: ${id.toUpperCase()}`;
  }
  // narrowed: the string branch returned, so here id is number.
  return `number doubled: ${id * 2}`;
}

console.log(describe("hello")); // string of length 5: HELLO
console.log(describe(21));      // number doubled: 42
```
:::

Inside the `if (typeof id === "string")` branch, the compiler *knows* `id` is a `string` — `id.toUpperCase()` is allowed, and it would be a compile error outside that branch. After the branch returns, the only remaining possibility is `number`, so `id * 2` is allowed below. The compiler is running the same logic as our `checkUnion` loop — try a branch's test, and if it passes, *act as if the value is that branch's type* — but it does it to the **static type**, at compile time, tracking which possibilities remain as control flows through your code. Our checker asks "does any branch pass?"; narrowing asks "given that this test passed, which branch are we in?" Same union, same per-branch tests, different output: a verdict versus a refined type.

This is why a union is so much more than "either type works." The union plus the test *is* the information that lets the compiler — and our checker — treat the value precisely in each branch. Episode 8 is entirely about the compiler's side of this: turning our boolean-ish checker into a `value is Task` predicate that *drives* the compiler's narrowing, so the verdict our checker computes and the type the compiler infers become one and the same.

:::predict
A `Result` from our own checker is a union: `{ ok: true } | { ok: false; error: string }`. Inside `if (r.ok) { ... }`, what does the compiler let you do, and what breaks?

```typescript
function show(r: { ok: true } | { ok: false; error: string }): string {
  if (r.ok) {
    return r.error;   // ?
  }
  return r.error;     // ?
}
```

- ( ) Both work — `error` is on the union, so it's always available.
- ( ) Both are errors — you can't access `error` without checking first.
- (x) The first `r.error` is an error; the second is fine.
- ( ) It depends on whether `r.ok` is `true` at runtime.
:::answer
The first `r.error` is a compile error; the second is fine. Inside `if (r.ok)`, the compiler narrows `r` to the `{ ok: true }` member — which has *no* `error` field — so `r.error` is *Property 'error' does not exist* (TS2339). After that branch returns, only `{ ok: false; error: string }` remains, so the second `r.error` is a legal `string`. The `ok` field is the *discriminant*: a shared field whose literal value (`true`/`false`) tells the compiler which member you hold. This is why we tagged `Result` with `ok` back in Episode 2 — not just so a human can read it, but so the compiler can narrow on it. Our own verdict type was designed to be narrowable from the start.
:::

## Recap

- `checkUnion(...checkers)` passes if *any* branch passes — an OR over checkers, the mirror of `checkObject`'s AND over fields. Sums and products; almost all data is a tree of the two.
- It verifies the static type `A | B`, spelled with `|`, the runtime twin of Python's `isinstance(v, (A, B))`.
- `checkLiteral(value)` checks an exact value; union them for a closed set like `"todo" | "doing" | "done"` — TypeScript's [[literal-type|nominal-vs-structural]] union, the idiomatic `enum` replacement, the runtime enforcement of Python's `Literal`.
- "Which branch passed" is [[narrowing]]: the compiler, like our loop, runs each branch's test and — for the static type, at compile time — treats the value as that branch's type where the test held. A union plus a test is what makes per-branch precision possible.
- We tagged `Result` with `ok` (Episode 2) precisely so the compiler can narrow on it: a discriminant field whose value selects the member.

`checkUnion` quietly solved a problem we've been ignoring. Every shape so far required *every* field to be present. But real objects have optional fields, and values are often `null` or simply missing. The next episode builds `checkOptional` — and you'll see it's just a particular union: "this checker, *or* it's absent." Modeling absence cleanly is where TypeScript diverges hard from C's `nullptr` and Java's `null`, and where Python's `Optional`/`None` is the closest cousin.
