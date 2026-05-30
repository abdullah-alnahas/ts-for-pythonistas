---
title: Narrowing & type guards
subtitle: How TS follows your control flow — smarter than mypy
---

## After the check, with no check

Here's a function over `string | number`. The `if` handles the string and returns. Look at the line *after* it — there's no second `typeof` test. Predict what the compiler thinks `x` is there.

:::quiz
**Predict before you read on.** On the marked line, after the string branch has returned, what is the type of `x` — and did anything check it?

```typescript
function f(x: string | number): string {
  if (typeof x === "string") {
    return x.toUpperCase();
  }
  return String(x + 1);     // <- x is what here?
}
```
:::answer
`x` is **`number`** — and nothing explicitly checked it. Because the `true` branch *returned*, the only way to reach the last line is if `typeof x === "string"` was false, so TS subtracts `string` from the union and `number` is all that's left. mypy narrows inside the guard; TS also narrows *by elimination* in the code after it. That second move is the part with no real Python-depth analog.
:::

The compiler is doing **narrowing**: shrinking a value's type as it flows through `if`/`switch`/`return` checks. You write `isinstance`-style guards in Python and mypy *sometimes* narrows; TS does it aggressively, tracks it through every branch, and — the part you just predicted — keeps tracking *after* a branch exits.

:::compare
```python
def f(x: str | int) -> str:
    if isinstance(x, str):
        return x.upper()   # mypy knows x is str here
    return str(x + 1)      # x is int here
```
```typescript
function f(x: string | number): string {
  if (typeof x === "string") {
    return x.toUpperCase(); // x: string
  }
  return String(x + 1);     // x: number (narrowed by elimination)
}
```
:::

mypy narrows inside the guard; TS narrows inside *and* by elimination after it. Control-flow analysis is a core TS strength.

There's no Python analog for *how far* this tracking goes, so it's worth seeing the flow explicitly. TS maintains the set of still-possible types at every point and shrinks it on each branch:

```
  x: string | number
        │
   if (typeof x === "string")
        ├── true  ──▶  x: string         // the guarded branch
        │              return ...         // branch exits
        └── false ──▶  x: number          // by ELIMINATION — "string" removed
                       (no check needed; it's the only type left)
```

The key move is the `false` edge: because the `true` branch *exited* (returned), the code after the `if` is only reachable when the guard was false, so TS subtracts `string` from the union — leaving `number`. The same elimination happens with `throw`, `continue`, and `break`, not just `return`.

The same collapse, as the compiler's running set of still-possible types:

:::narrow
start: string | number
- typeof x === "string" (then return) → string
- else (string subtracted) → number
caption: Each guard removes a member; what's left is the type at that point.
:::

## The built-in narrowing operators

### `typeof` — for primitives

```typescript
function pad(x: string | number) {
  if (typeof x === "number") return " ".repeat(x);
  return x; // string
}
```

`typeof` returns one of: `"string" | "number" | "boolean" | "bigint" | "symbol" | "undefined" | "object" | "function"`. Note **`typeof null === "object"`** (a historic JS bug) and arrays are `"object"` too — so `typeof` is for primitives, not for distinguishing object shapes.

### `instanceof` — for classes

```typescript
function f(x: Date | string) {
  if (x instanceof Date) return x.getTime(); // x: Date
  return Date.parse(x);                       // x: string
}
```

Works only on real runtime constructors (Lesson 01) — never on interfaces.

:::quiz
Recall Lesson 01/03. You have `interface Fish { swim(): void }` and want to narrow `a: Fish | Bird`. Why does `if (a instanceof Fish)` fail to compile, and which operator do you reach for instead?
:::answer
`Fish` is an **interface** — erased at compile time, so there's no runtime `Fish` constructor for `instanceof` to test (`instanceof` needs a real class/built-in). For interface-shaped unions you use **`in`** (`if ("swim" in a)`) or a custom `a is Fish` guard, both of which work on structure rather than a runtime constructor. `instanceof` is only for actual classes (`Date`, your own `class`).
:::

### `in` — does the property exist

The structural-typing way to tell object shapes apart, especially non-discriminated unions. Run it, then swap the input to the bird and watch the other branch take over:

:::play
```typescript
type Fish = { swim: () => string };
type Bird = { fly: () => string };

function move(a: Fish | Bird): string {
  if ("swim" in a) return a.swim(); // a: Fish here
  return a.fly();                   // a: Bird here
}

console.log(move({ swim: () => "swimming" }));
console.log(move({ fly: () => "flying" }));
```
:::

`"swim" in a` is like Python's `"swim" in obj.__dict__` / `hasattr` — but it narrows the static type.

### Truthiness & equality

```typescript
function g(x: string | null | undefined) {
  if (x) return x.length;  // x: string (null, undefined, "" all excluded)
  return 0;
}
```

Beware: truthiness excludes `""` and `0` too (Lesson 06's `||` trap). For "not null/undefined specifically," use `x != null` (loose `!=` catches both null and undefined) rather than truthiness.

Narrowing also flows through `&&` and the `?` of optional chaining within a single expression — not just across statements:

```typescript
function len(x: string | null) {
  // left side proves x is non-null; right side sees x: string
  return x != null && x.length > 0;
}

function city(u: { address?: { city: string } }) {
  return u.address?.city ?? "unknown"; // each ?. narrows the next access
}
```

This is the same flow analysis, just operating *inside* an expression: once `x != null` is established on the left of `&&`, the right side is only evaluated when it held, so `x` is `string` there.

## Discriminated-union narrowing (recap)

The cleanest narrowing — switch on the literal tag (Lesson 05). TS narrows each branch to the matching variant automatically.

## Custom type guards: `x is Foo`

When a check is too complex to inline, write a **user-defined type guard**: a function whose return type is `arg is SomeType`. This is the TS analog of Python's `TypeGuard` (PEP 647).

:::compare
```python
from typing import TypeGuard

def is_str_list(v: list[object]) -> TypeGuard[list[str]]:
    return all(isinstance(x, str) for x in v)

def use(v: list[object]):
    if is_str_list(v):
        # v: list[str]
        print(" ".join(v))
```
```typescript
function isStringArray(v: unknown[]): v is string[] {
  return v.every((x) => typeof x === "string");
}

function use(v: unknown[]) {
  if (isStringArray(v)) {
    // v: string[]
    console.log(v.join(" "));
  }
}
```
:::

The `v is string[]` return annotation is a **promise to the compiler**: "if this returns true, treat the argument as `string[]`." It's only as correct as your logic — TS trusts you here (like `TypeGuard`, it's unchecked). Great for parsing/validation boundaries.

A common shape — narrowing a discriminated union member out:

```typescript
function isCircle(s: Shape): s is Extract<Shape, { kind: "circle" }> {
  return s.kind === "circle";
}
```

## Assertion functions: `asserts x is Foo`

A variant that *throws* instead of returning a boolean — and narrows everything after the call. Like a typed `assert`.

```typescript
function assertDefined<T>(x: T | undefined): asserts x is T {
  if (x === undefined) throw new Error("expected a value");
}

function use(u: User | undefined) {
  assertDefined(u);
  console.log(u.name); // u: User for the rest of the scope
}
```

Compare Python `assert x is not None` — mypy narrows after it. TS makes the narrowing explicit and reusable via the `asserts` signature.

## Narrowing gets "forgotten" across closures

You've just guarded `u` with `if (u)`, so inside the block `u` is non-null. Then you reference it from inside a callback. Predict whether the narrowing survives the trip into the closure.

:::quiz
**Predict before you read on.** `u` is narrowed to `User` by the `if`. Does `u` stay `User` inside the `forEach` callback?

```typescript
let u: User | undefined = getUser();
if (u) {
  arr.forEach(() => u.name); // does this compile?
}
```
:::answer
**No** — TS rejects `u.name` here. `u` is a `let`, and a callback could run *later*, by which point some other code might have reassigned `u` back to `undefined`. Since TS can't prove the callback runs immediately, it discards the narrowing inside the closure. This gotcha has no Python parallel (mypy doesn't model this). The fix is to pin the value in a `const` the compiler knows can't change:
:::

One gotcha with no Python parallel, then: narrowing a `let` can be invalidated if a callback might reassign it. After a guard, calling a function TS can't analyze may widen the type back. Copy to a `const` first:

```typescript
let u: User | undefined = getUser();
if (u) {
  const safe = u;            // const can't be reassigned -> narrowing sticks
  arr.forEach(() => safe.name); // ok; using u directly may error
}
```

## Recap

- TS narrows types through control flow — including by **elimination** in later branches.
- `typeof` (primitives), `instanceof` (classes), `in` (property presence), truthiness, `===`.
- `typeof null === "object"`; use `x != null` for the null/undefined check.
- Custom guards `x is Foo` (≈ `TypeGuard`) and assertion functions `asserts x is Foo` (≈ typed `assert`).
- Guards are **trusted, not verified** — correctness is on you.
- Narrowing on `let` can be lost across closures; copy to `const` to keep it.

:::predict
This guard compiles, but is dangerously wrong. Which value does it wrongly accept as a `User`?

```typescript
interface User { name: string }
function isUser(x: unknown): x is User {
  return typeof x === "object";
}
```

- (x) `null` — `typeof null === "object"`, so it passes and then crashes on `.name`.
- ( ) `"Ada"` — a string passes the check.
- ( ) `42` — a number passes the check.
- ( ) Nothing wrong — it correctly accepts only `User`-shaped objects.
:::answer
It **claims**: "if this returns true, `x` is a `User`." The **bug**: `typeof x === "object"` is true for `null`, arrays, `Date`, and literally any object — none of which need a `name`/`User` shape. TS *trusts* the `x is User` signature without verifying it, so every caller now treats junk as a valid `User`, leading to runtime crashes (e.g. `x.name` on `null`). A correct guard must actually check the shape:

```typescript
function isUser(x: unknown): x is User {
  return typeof x === "object" && x !== null && "name" in x &&
         typeof (x as { name: unknown }).name === "string";
}
```

This is exactly why guards belong at trusted parsing boundaries and should be written carefully (or generated by a schema library like Zod).
:::

Run the broken guard and watch `null` sail through as a "`User`," then crash on `.name` — the type system never complained, because you *told* it the guard was sound:

:::play
```typescript
interface User { name: string }

function isUser(x: unknown): x is User {
  return typeof x === "object"; // dangerously incomplete
}

const junk: unknown = null;
if (isUser(junk)) {
  // TS now believes junk is a User…
  console.log(junk.name.toUpperCase()); // …and it crashes here at runtime
}
```
:::

That last example is the whole problem in miniature: a guard is a *promise* the compiler trusts but never verifies. So the real safety question moves to the boundary — where untrusted data enters your program. Lesson 12 closes the loop: how to earn that trust with `unknown` plus a real runtime check, instead of asserting it.
