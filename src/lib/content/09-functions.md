---
title: Functions, deeply
subtitle: Params, overloads, the void return rule — and the two places functions break from Python: no keyword arguments, and a call-bound `this`
---

## From narrowing the body to typing the boundary

Lesson 08 was about what the compiler learns *inside* a function — how a `typeof` or an `in` check narrows a value as control flow proceeds. This lesson is about the function's edges: the parameter list it advertises, the return it promises, and the `this` it depends on. Most of the mechanics look familiar from Python, and where they differ the difference is usually syntactic. Two places are not: the absence of keyword arguments, which reshapes how every configurable function in the ecosystem is written, and `this`, which in JavaScript is bound by *how* a function is called rather than where it was defined. We'll clear the familiar parts first.

## Parameters: optional, default, rest

The three parameter kinds map almost one-to-one onto Python, with different spelling.

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

An optional parameter is marked with `?`, and inside the body its type is `string | undefined` — the `?` is exactly shorthand for adding `| undefined` (Lesson 06).

A defaulted parameter (`title: string = "Dr"`) is also optional from the caller's side, but inside the body it reads as `string`, because the default guarantees a value was bound.

Rest is `...tags: string[]`, the analog of `*args`, and the binding is a real `Array`, not a tuple — once arguments fall into the rest slot, no per-position type survives.

The constraint that optional params must follow required ones is the same rule Python enforces, and for the same reason: arguments are matched positionally, so there's no way to supply a later argument while skipping an earlier optional one. But there's a subtlety that doesn't exist in Python, and it's worth being precise about: an optional parameter and an explicitly `| undefined` parameter are *not* interchangeable for callers.

:::quiz
Both of these accept `undefined` as a value. Which call sites differ, and why?

```typescript
function a(x?: number): void {}
function b(x: number | undefined): void {}
```
:::answer
The bodies are identical — in both, `x` has type `number | undefined`. The difference is the *arity* the compiler advertises. `a()` is legal (the argument may be omitted entirely); `b()` is an error, because `b` declares one required parameter that merely happens to accept `undefined` as one of its values — you must pass something, even if it's `undefined`. The `?` changes the function's minimum argument count; `| undefined` does not. They converge in the body and diverge at the call site.
:::

### No keyword arguments: the options object

This is the first real divergence. JavaScript has no keyword arguments — there is no `connect(timeout=30)`; a call is a positional list, and `name=value` inside one parses as an assignment expression, not a named binding. Python's keyword-only parameters (everything after the bare `*`) have no equivalent at all. The idiom that fills the gap is a single options object, destructured with defaults in the body.

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

This is not just an ergonomic substitute; it behaves differently in a way that matters. The defaults live in the destructuring (`const { timeout = 30 } = opts`), not in the parameter, which is why the object parameter itself gets `= {}` — so that calling `connect("db")` with no options object still destructures cleanly instead of throwing on a property access of `undefined`.

What you gain over Python's keyword arguments is that the options bundle is now a first-class type. You can name it, reuse it, build it programmatically, and let the compiler check a partially-built options object before it's ever passed. What you lose is checked against you by a feature worth knowing about: [[excess property checking|structural-typing]]. Pass a fresh object literal with a misspelled key and the compiler rejects it, even though [[structural typing|structural-typing]] would otherwise permit extra properties.

:::predict
The `connect` above takes `{ timeout?: number; retries?: number }`. One of these two calls is an error. Which, and why?

```typescript
connect("db", { timeout: 60, retires: 3 });   // call A — note the typo

const cfg = { timeout: 60, retires: 3 };
connect("db", cfg);                            // call B — same object, via a variable
```

- ( ) Both error — the object has an unknown property `retires` either way.
- ( ) Neither errors — structural typing allows extra properties everywhere.
- (x) Only A errors; B compiles.
- ( ) Only B errors; the variable form is checked more strictly.
:::answer
Only A. A fresh object literal passed directly to a typed slot gets **excess property checking**: the compiler flags `retires` as a property that doesn't exist in the target type, on the theory that a literal written right at the call site is almost certainly a mistake or a typo. Once the same object is bound to a variable (`cfg`), it loses its "freshness," and the ordinary [[structural|structural-typing]] rule takes over — `cfg` has *at least* the required shape (here, all-optional, so even an empty object qualifies), and extra properties are allowed. This is a deliberate exception to pure [[structural typing|structural-typing]], narrowly targeted at the typo case. It's why the options-object pattern catches misspelled option names that a plain dict in Python never would.
:::

## Arrow functions and `function`

TypeScript inherits JavaScript's two ways of writing a function, and the choice is not purely stylistic. Python's `def`/`lambda` split is about *form* — `lambda` is expression-only, so anything with statements needs `def`. The arrow-vs-`function` split is also about form, but it carries a second, more consequential difference in how `this` is bound — the subject of the last section.

:::compare
```python
def add(a, b): return a + b
add2 = lambda a, b: a + b   # expression only
```
```typescript
function add(a: number, b: number) { return a + b; }
const add2 = (a: number, b: number) => a + b;            // expression body
const add3 = (a: number, b: number) => { return a + b; }; // block body
```
:::

The arrow has no body restriction — an expression body returns implicitly, a block body needs an explicit `return` — so it isn't the limited tool that `lambda` is. The convention in TypeScript is to prefer arrows for callbacks and short local functions, and that convention exists mostly because of the `this` behavior, not because arrows are terser.

## Naming a signature as a type

A function's signature can be given a name, the same way a Callable type is named in Python. This is the place the `=>` token means two different things depending on context.

```typescript
type BinOp = (a: number, b: number) => number;

const mul: BinOp = (a, b) => a * b; // params inferred from BinOp — no annotations needed
```

In a *type* position, `(a: number, b: number) => number` describes a callable: it returns `number`. In a *value* position, `(a, b) => a * b` is an arrow function. They share a token but live on opposite sides of the `=`. The payoff is in the second line: because `mul` is declared `BinOp`, the parameter types flow *into* the arrow and you don't re-annotate `a` and `b` — this is contextual typing, the same inference direction that lets `arr.map(x => x.length)` know `x` without help. Python's analog is `Callable[[int, int], int]`, but Python has nothing like the contextual flow; a lambda assigned to a `Callable`-annotated name still infers its parameters as `Any` unless a checker is doing extra work.

## When the signature isn't enough: overloads

Sometimes a function's return type genuinely depends on which argument types it received, in a way a single union signature can't express. A union return (`number | string`) would force every caller to narrow the result even when they passed an argument that fixes it. Overload signatures solve this: you declare several call signatures, then one implementation that must be assignable to all of them. The mechanism mirrors Python's `@overload` exactly in shape, and differs in one structural detail.

:::compare
```python
from typing import overload

@overload
def parse(x: str) -> int: ...
@overload
def parse(x: bytes) -> str: ...

def parse(x):   # real impl, untyped overloads above
    ...
```
```typescript
function parse(x: string): number;
function parse(x: number): string;
function parse(x: string | number): number | string {
  return typeof x === "string" ? x.length : String(x);
}
```
:::

The structural difference is which signatures the caller can see. In Python the `@overload`-decorated stubs are visible and the implementation `def parse(x)` is hidden from type checkers. In TypeScript the overload signatures *above* the implementation are the public interface, and the implementation signature is invisible to callers — it exists only so the body has something to type-check against, which is why it has to be a superset of every overload. A caller who passes a `string` sees the return type `number`; the wider `number | string` of the implementation never leaks out.

Overloads are easy to overuse. When the relationship between input and output can be captured by a generic (Lesson 07) or a single union, that's almost always clearer, because overloads don't compose — the compiler picks the first matching signature rather than reasoning about the relationship. Reach for them only when the input-to-output mapping truly varies in a way generics can't capture.

## The `void` return rule

Here is a rule with no Python counterpart, and it surprises people because it looks [[unsound|soundness-vs-completeness]]. A function type whose return is annotated `void` will accept an implementation that returns a value.

:::predict
`Callback` returns `void`. The assigned function returns `42`. Error, or fine — and what is the type of `r`?

```typescript
type Callback = () => void;
const cb: Callback = () => 42;
const r = cb();
```

- ( ) Error — `() => number` is not assignable to `() => void`.
- ( ) Fine, and `r` has type `number` — the real return type shows through.
- (x) Fine, and `r` has type `void` — the value is there at runtime but invisible to the type.
- ( ) Fine, but only because `42` is also a valid `void` value.
:::answer
Fine, and `r` is `void`. A `void` *return position* means "the caller will not look at whatever you return" — so a function that does return something still satisfies the contract; the value is simply discarded by the type system, even though it's physically present at runtime. Reading `cb()` gives you `void`, not `number`, because the slot you assigned into promised nothing about the return. This is deliberate, not a hole: it's the rule that lets the most common callback pattern type-check at all.
:::

The motivating case is everywhere. `Array.prototype.forEach` wants a callback typed `(x: T) => void`, and the natural thing to write inside it is a call whose own return value you don't care about:

:::play
```typescript
const out: number[] = [];
[1, 2, 3].forEach((n) => out.push(n)); // push returns a number — and that's fine
console.log(out);
```
:::

`out.push(n)` returns the array's new length, a `number`. If `void` demanded that the callback return exactly `undefined`, this would be an error and you'd have to wrap the body in braces to throw the value away (`(n) => { out.push(n); }`). The `void`-return rule exists precisely so you don't have to. The distinction to keep: `void` as a return type means "your result is ignored," while annotating a return `undefined` means "your result must *be* the value `undefined`" — the latter is enforced, the former is permissive.

The permissiveness is scoped tightly, which is what keeps it from being dangerous. It applies only when the *target* type's return is `void`. A function whose return is actually read elsewhere has a concrete return type, and the looseness vanishes:

```typescript
function runAndUse(fn: () => number): number {
  return fn() + 1;
}
runAndUse(() => {});      // error: a function returning void is not assignable to () => number
```

So the rule is not "TypeScript ignores return types." It's "a `void` slot has explicitly opted out of caring," and nothing reads through a slot that opted out.

## `this`: bound by the call, not the definition

In Python `self` is an ordinary first parameter, bound at the moment of the bound-method lookup and then explicit forever after. You can detach a method — `f = obj.method` — and Python still carries the instance, because the bound method *is* a closure over `self`. JavaScript's `this` works the opposite way: it is not captured at definition or lookup; it is supplied by the call expression itself, determined by what sits to the left of the dot at the moment of the call. Detach the method from its object and the dot is gone, so `this` is gone with it.

:::play
```typescript
const counter = {
  count: 0,
  inc() { this.count++; }, // `this` is whatever called inc()
};

counter.inc();
console.log("via method:", counter.count); // 1 — called as counter.inc(), this = counter

const f = counter.inc;       // detached — no object on the left anymore
f();                         // this is now undefined (strict mode) — throws at runtime
console.log("never reached");
```
:::

Running it shows the failure: `f()` has no receiver, so `this` is `undefined` in strict-mode JavaScript, and `this.count++` throws. The call `f()` throws `TypeError: Cannot read properties of undefined (reading 'count')` — there is no receiver, so `this` is undefined. Why this is a *runtime* surprise and not a compile error is the interesting part. Method shorthand on an object literal gives `inc` an *implicit* `this` of the object's type, but that constraint is attached to the method, not to the standalone function value you get by reading `counter.inc`. The detached value has type `() => void` with no `this` requirement, so the bare call `f()` type-checks even though it's the bug. The type system models JavaScript's actual `this` rule faithfully — and that rule is that a bare call has no receiver.

Arrow functions opt out of the whole mechanism. An arrow has no `this` of its own; it closes over the `this` of the scope where it was written, lexically, the way any other free variable is captured. That's why an arrow used as a callback keeps pointing at the right object even when the callback is invoked later, with no dot, by some scheduler that knows nothing about your instance:

```typescript
class Timer {
  seconds = 0;
  start() {
    setInterval(() => { this.seconds++; }, 1000); // arrow's this = the Timer instance
  }
}
```

Had that callback been a `function () { this.seconds++; }`, `setInterval` would call it with no receiver and `this` would be wrong — the same detachment bug, one layer down. The arrow sidesteps it by never having a dynamic `this` to lose.

There's one more tool, and it closes the gap the detached-`f()` example left open: a `this` parameter, declared first in the list. It has no runtime existence and is [[erased|type-erasure]] like everything else, but it tells the compiler what receiver the function requires. With it, detaching becomes a compile error instead of a runtime one:

```typescript
function tick(this: { count: number }) { this.count++; }

const obj = { count: 0, tick };
obj.tick();              // fine — called with a matching receiver

const detached = obj.tick;
detached();              // error: The 'this' context of type 'void' is not assignable to method's 'this' of type '{ count: number; }'
```

The practical rules fall out of the mechanism rather than needing to be memorized: use arrows for callbacks so `this` is captured lexically and can't be lost; be wary of writing `const f = obj.method` for any method that uses `this`; and when you're authoring a standalone function that *does* depend on `this`, annotate it so the compiler can catch a wrong or missing receiver for you.

## Recap

- Optional `?`, defaults `= v`, rest `...xs: T[]`; optionals follow required params. A `?` param may be omitted at the call site; a `| undefined` param must still be passed.
- No keyword arguments — use an options object, destructured with defaults, and give the object parameter `= {}`. Fresh object literals get excess-property checking, which catches misspelled option names.
- Arrows and `function` differ in `this` binding, not just form; prefer arrows for callbacks for that reason.
- A signature can be named as a type (`(a: T) => R`), and declaring a value against it flows the parameter types in by contextual typing.
- Overload signatures express an input-dependent return; the signatures above the implementation are public, the implementation signature is internal. Prefer a generic or union when one suffices.
- `void` as a return type means "your result is ignored," so a value-returning function satisfies it — but only through a `void` slot; a concrete return type is enforced.
- `this` is supplied by the call expression, not captured at definition. Arrows have no own `this`; a `this` parameter lets the compiler enforce the receiver.

:::quiz
Why does `forEach` accept this callback even though `push` returns a `number`, not `undefined` — and would the same callback be accepted if `forEach`'s parameter were typed `() => number`?

```typescript
const out: number[] = [];
[1, 2, 3].forEach((n) => out.push(n));
```
:::answer
`forEach`'s callback parameter has return type `void`, and the `void`-return rule accepts a function returning any value because the result is discarded — `out.push(n)` returns the new length, which `forEach` ignores. If the parameter were instead typed `() => number`, the rule would not apply: that's a concrete return type, the looseness only covers `void` slots, and a callback that returned a non-`number` (or `void`) would be rejected. The permissiveness is exactly as wide as the `void` annotation and no wider.
:::

These functions and methods have lived on plain object literals and standalone declarations. Lesson 10 moves them onto classes, where the `this` rules you just saw still apply — and where TypeScript, even with `class`, `private`, and `extends` all present, still decides compatibility by shape rather than [[by name|nominal-vs-structural]].
