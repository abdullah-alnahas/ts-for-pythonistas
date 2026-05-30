---
title: Functions, deeply
subtitle: Params, overloads, this, void — where TS and Python diverge
---

You reach for `connect(timeout=30)` and it's gone — JS has no keyword arguments. That single absence reshapes how every configurable function in the ecosystem is written, and it's the first of two places where functions stop matching Python intuition (the second is `this`, which depends on *how* a function is called, not where it's defined). The parameter mechanics are mostly familiar; skim them, then slow down at the options object.

## Parameters: optional, default, rest

Mostly familiar, with syntax differences.

:::compare
```python
def greet(name: str,
          title: str | None = None,
          *tags: str) -> str:
    ...

greet("Ada")
greet("Ada", "Dr")
greet("Ada", "Dr", "vip", "new")
```
```typescript
function greet(
  name: string,
  title?: string,          // optional
  ...tags: string[]        // rest -> array
): string {
  return "";
}

greet("Ada");
greet("Ada", "Dr");
greet("Ada", "Dr", "vip", "new");
```
:::

- **Optional** is `?`, and an optional param is `string | undefined` (Lesson 06). Optional params must come **after** required ones.
- **Default values** look like Python: `function f(x: number = 10)`. A defaulted param is automatically optional; you usually drop the `?`.
- **Rest** is `...tags: string[]` (≈ `*args`), and it's a real array, not a tuple.

:::quiz
Recall Lesson 06. A param declared `title?: string` — what is its type inside the function body, and what must be true about its position in the parameter list?
:::answer
Its type is **`string | undefined`** (the `?` is shorthand for exactly that — Lesson 06). And it must come **after** all required params: optional params can't precede required ones, because callers supply arguments positionally and there's no way to "skip" a middle one. A defaulted param (`title: string = "Dr"`) is also optional but reads as `string` inside the body, since the default guarantees a value.
:::

### No keyword arguments — use an options object

The biggest ergonomic difference: **JS/TS has no keyword arguments.** Python's `f(timeout=30, retries=3)` has no direct equivalent. The idiom is a single **options object** with destructuring.

:::compare
```python
def connect(host: str, *,
            timeout: int = 30,
            retries: int = 3) -> None:
    ...

connect("db", timeout=60)
```
```typescript
function connect(
  host: string,
  opts: { timeout?: number; retries?: number } = {}
): void {
  const { timeout = 30, retries = 3 } = opts;
}

connect("db", { timeout: 60 });
```
:::

This pattern is everywhere in TS APIs. The destructuring-with-defaults `const { timeout = 30 } = opts` is the standard way to get keyword-arg-like ergonomics.

## Arrow functions vs `function`

Two ways to write a function. Python has `def` and `lambda` (expression-only); TS arrow functions are full lambdas with no body restriction.

:::compare
```python
def add(a, b): return a + b
add2 = lambda a, b: a + b   # expression only
```
```typescript
function add(a: number, b: number) { return a + b; }
const add2 = (a: number, b: number) => a + b;      // expression body
const add3 = (a: number, b: number) => { return a + b; }; // block body
```
:::

Arrows are preferred for callbacks and short functions. The crucial non-obvious difference is **`this` binding** (below) — arrows don't have their own `this`.

## Function types

You can name a function's signature as a type (Lesson 04 — must be `type`/`interface`, not a value):

```typescript
type BinOp = (a: number, b: number) => number;

const mul: BinOp = (a, b) => a * b; // params inferred from BinOp
```

Note the `=>` in a *type* position means "returns," distinct from `=>` in a *value* (the arrow function). Python's analog is `Callable[[int, int], int]`.

## Overloads

When a function's return type depends on its argument types in a way unions can't express, TS uses **overload signatures** — multiple declarations followed by one implementation. Python does this with `@overload` from `typing`.

:::compare
```python
from typing import overload

@overload
def parse(x: str) -> int: ...
@overload
def parse(x: bytes) -> str: ...

def parse(x):   # real impl
    ...
```
```typescript
function parse(x: string): number;
function parse(x: boolean): string;
function parse(x: string | boolean): number | string {
  return typeof x === "string" ? x.length : String(x);
}
```
:::

The signatures above the implementation are what callers see; the implementation signature is internal and must be compatible with all of them. Often a single generic or union is cleaner — reach for overloads only when the input→output relationship truly varies.

## `void` vs `undefined` returns

A subtle TS-specific rule. `void` means "the caller should ignore the return value" — it is **not** the same as `undefined`.

:::quiz
**Predict before you read on.** `Callback` returns `void`. The function below returns `42`, a number. Error, or fine?

```typescript
type Callback = () => void;
const cb: Callback = () => 42;
```
:::answer
**Fine.** A `void` return type means "I will ignore whatever you return," so a function that *does* return a value still satisfies it — the value is simply discarded. This reads as a hole in the type system but is deliberate: it's what lets `arr.forEach(x => list.push(x))` type-check even though `push` returns a number. A `() => undefined` annotation, by contrast, would *require* the return to be `undefined`.
:::

```typescript
type Callback = () => void;

const cb: Callback = () => 42; // OK! returning a value is allowed for void
```

Why allowed? So you can pass functions that *do* return something into slots that ignore it — e.g. `arr.forEach(x => list.push(x))` where `push` returns a number but `forEach` expects `void`. A function annotated `(): undefined` would *require* returning `undefined`. Rule: use `void` for callbacks whose result you discard; use `undefined` only when you specifically need "returns the value undefined."

## `this` typing (no Python `self` equivalent)

In Python, `self` is an explicit first parameter — simple and predictable. In JS, `this` is dynamic: it depends on **how a function is called**, not where it's defined. This is a frequent source of bugs. Run the block: calling `counter.inc()` works, but *detaching* the same method into a bare variable breaks it.

:::play
```typescript
const counter = {
  count: 0,
  inc() { this.count++; },   // `this` = counter when called as counter.inc()
};

counter.inc();
console.log("via method:", counter.count); // 1 — works

const f = counter.inc;       // detached from counter
f();                         // `this` is no longer counter
console.log("via detached f:", counter.count); // still 1 — the bug
```
:::

Arrow functions sidestep this by capturing `this` from the enclosing scope (lexical), so a callback keeps the right `this`:

```typescript
class Timer {
  seconds = 0;
  start() {
    setInterval(() => { this.seconds++; }, 1000); // arrow keeps `this` = the Timer
  }
}
```

The practical rules: **use arrow functions for callbacks** so `this` stays bound, and be wary of detaching a method from its object (`const f = obj.method`). (TS can also type `this` as a fake first parameter for checking — an advanced aside left to the glossary.)

## Recap

- Optional `?`, defaults `= v`, rest `...xs: T[]`. Optionals come last.
- **No keyword args** — use an options object with destructured defaults.
- Arrow functions for callbacks; they don't bind their own `this`.
- Function types use `(args) => Return`; must be `type`/`interface`.
- `@overload` → overload signatures over one implementation.
- `void` return = "ignore the result" (may still return a value); `undefined` = "must be undefined."
- `this` is call-site dynamic, unlike Python's explicit `self` — arrows capture it lexically.

:::quiz
Why does `forEach` accept this callback even though `push` returns a `number`, not `undefined`?

```typescript
const out: number[] = [];
[1, 2, 3].forEach((n) => out.push(n));
```
:::answer
Because `forEach`'s callback parameter is typed to return **`void`**, and TS's `void`-return rule says a `void` slot **accepts a function that returns any value** — the return is simply discarded. `out.push(n)` returns the array's new length (a `number`), but `forEach` ignores it, so it's allowed. If the callback type were `() => undefined` instead, this would be an error and you'd have to write `(n) => { out.push(n); }`. This permissiveness is intentional and makes everyday callbacks ergonomic.
:::

`this` and methods so far have lived on plain object literals. Lesson 10 moves them onto classes — and finds that even there, where Python leans hardest on names and inheritance, TS still matches by shape.
