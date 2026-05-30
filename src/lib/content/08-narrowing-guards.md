---
title: Narrowing & type guards
subtitle: How the compiler follows your control flow and refines a type as it goes
---

## From inference to narrowing

In the last lesson the compiler took `first([1, 2, 3])` and deduced `T = number` without being told — inference reading a concrete type out of the code you wrote. Narrowing is the same instinct pointed at a different problem. There the question was "what is this generic standing in for"; here it's "given a value whose type is a union, which member is it *at this exact line*." A parameter typed `string | number` is genuinely both possibilities when it enters the function. By the time you've run an `if`, it may be only one. The compiler tracks that, statement by statement, and the refined type is what autocomplete and the method checker use on each line.

This is the same idea as [[mypy]] narrowing inside an `isinstance` block, but TypeScript pushes it considerably further, and the extra distance is where the interesting behavior lives. Start with the move that surprises people coming from [[mypy]].

## After the check, with no check

Here is a function over `string | number`. The `if` handles the string and returns. The line after it runs no second `typeof` test, yet the compiler has a specific type for `x` there.

:::quiz
On the marked line, after the string branch has returned, what is the type of `x` — and what checked it?

```typescript
function f(x: string | number): string {
  if (typeof x === "string") {
    return x.toUpperCase();
  }
  return String(x + 1);     // x is what here?
}
```
:::answer
`x` is **`number`**, and no explicit check produced that. The `true` branch *returned*, so the only way execution reaches the last line is if `typeof x === "string"` was false. The compiler subtracts `string` from the union; `number` is all that remains. [[mypy]] narrows inside the guard. TypeScript also narrows *by elimination* in the code that follows a branch which exits — the part with the weakest Python analog.
:::

The compiler is doing **narrowing**: shrinking a value's static type as it flows through `if` / `switch` / `return` / `throw`. The mechanism is a control-flow graph. For each variable the compiler carries a set of still-possible types and updates it on every edge — every branch taken, every branch known not taken. That bookkeeping is why narrowing reaches past the guard itself.

:::compare
```python
def f(x: str | int) -> str:
    if isinstance(x, str):
        return x.upper()   # mypy: x is str
    return str(x + 1)      # mypy: x is int
```
```typescript
function f(x: string | number): string {
  if (typeof x === "string") {
    return x.toUpperCase(); // x: string
  }
  return String(x + 1);     // x: number, by elimination
}
```
:::

This particular example narrows in both tools, because the early `return` makes the `else` implicit and both can follow that. The divergence shows up in messier control flow — guards that `continue` out of a loop, `throw`s buried in a branch, assignments midway through a function. TypeScript's flow analysis threads the type through all of them; [[mypy]]'s is shallower and gives up sooner. The `false` edge below is the load-bearing one:

```
  x: string | number
        │
   if (typeof x === "string")
        ├── true  ──▶  x: string      // guarded branch; it returns
        │
        └── false ──▶  x: number      // by ELIMINATION — "string" removed,
                       (nothing left to test; one member remains)
```

The same elimination happens after `throw`, `continue`, and `break`, not only `return` — anything that makes a branch unable to fall through. Here is that collapse as the compiler's running set of possibilities:

:::narrow
start: string | number
- typeof x === "string" (branch returns) → string
- fall through (string eliminated) → number
caption: Each exiting branch removes a member; what survives is the type below it.
:::

## The built-in narrowing operators

The guards the compiler understands are, with one exception, ordinary JavaScript operators. That is not a coincidence — they survive [[erasure|type-erasure]] precisely because they were never TypeScript syntax. A guard has to be a real runtime test for it to mean anything once the types are gone (Lesson 01). The compiler's job is to map each runtime test back onto a type-level subtraction.

### `typeof` — primitives

```typescript
function pad(x: string | number): string {
  if (typeof x === "number") return " ".repeat(x);
  return x; // string
}
```

`typeof` evaluates to one of `"string" | "number" | "boolean" | "bigint" | "symbol" | "undefined" | "object" | "function"`. Two results catch Python developers reasoning by analogy to `type()`. `typeof null === "object"` — a bug preserved since 1995 for backward compatibility, and the source of a whole genus of guard mistakes you'll see at the end of this lesson. And arrays report `"object"` too, since `typeof` only distinguishes the six primitive families above plus the catch-all `"object"` and the special-cased `"function"`. So `typeof` is for telling primitives apart, not for distinguishing object *shapes*; for arrays specifically you reach for `Array.isArray`, which the compiler also treats as a guard:

```typescript
function flatten(x: number | number[]): number[] {
  if (Array.isArray(x)) return x; // x: number[]
  return [x];                     // x: number
}
```

### `instanceof` — classes and built-in constructors

```typescript
function f(x: Date | string): number {
  if (x instanceof Date) return x.getTime(); // x: Date
  return Date.parse(x);                       // x: string
}
```

`instanceof` works only against a real runtime constructor — a `class` you declared, or a built-in like `Date`, `Map`, `Error`. It walks the value's [[prototype chain|prototype-chain]] looking for the constructor's `prototype`, which is a runtime operation on runtime objects. An interface has no runtime existence to walk toward.

:::quiz
You have `interface Fish { swim(): void }` and want to narrow `a: Fish | Bird`. Why does `if (a instanceof Fish)` fail to compile, and what do you use instead?
:::answer
`Fish` is an **interface**, [[erased|type-erasure]] at compile time, so there is no runtime `Fish` constructor for `instanceof` to test against — and `tsc` rejects using a type as a value (the same error from Lesson 01). `instanceof` needs an actual class or built-in. For interface-shaped unions you narrow on **structure**: the `in` operator (`"swim" in a`), or a custom `a is Fish` guard you write yourself. Both inspect the value's shape rather than its constructor — which is the right tool given that TypeScript's types are [[structural|structural-typing]] in the first place (Lesson 03).
:::

### `in` — property presence

`in` is the [[structural|structural-typing]] way to tell object shapes apart, and the natural fit for a union of plain object types that share no common tag:

:::play
```typescript
type Fish = { swim: () => string };
type Bird = { fly: () => string };

function move(a: Fish | Bird): string {
  if ("swim" in a) return a.swim(); // a: Fish
  return a.fly();                   // a: Bird
}

console.log(move({ swim: () => "swimming" }));
console.log(move({ fly: () => "flying" }));
```
:::

`"swim" in a` is close to Python's `hasattr(a, "swim")` or `"swim" in vars(a)`, and the analogy holds at the runtime level: both ask whether a key is present. The difference is what the compiler does with the answer — `in` narrows the *static* type of `a` in each branch, where `hasattr` leaves mypy none the wiser. Note the [[structural|structural-typing]] caveat: `in` only confirms a property exists, not that it has the right type. It works cleanly here because the two members are distinguished purely by which key they carry.

### Truthiness and equality

```typescript
function g(x: string | null | undefined): number {
  if (x) return x.length;  // x: string
  return 0;
}
```

A truthiness guard removes `null` and `undefined` — but also `""` and `0`, since both are falsy. That is the same footgun as `||` versus `??` from Lesson 06, now wearing an `if`: `if (x)` on a `string | undefined` quietly treats the empty string like the absent value. When you mean "present, regardless of value," test for absence directly with `x != null` — loose `!=` matches both `null` and `undefined` and nothing else, which is the one place the otherwise-discouraged loose equality earns its keep.

Narrowing also flows *within* a single expression, through `&&`, `||`, and the `?.` of optional chaining — not only across statements:

```typescript
function len(x: string | null): boolean {
  // left operand proves x is non-null; right operand sees x: string
  return x != null && x.length > 0;
}

function city(u: { address?: { city: string } }): string {
  return u.address?.city ?? "unknown"; // ?. narrows the next access
}
```

It is the same control-flow analysis, scoped to the expression. The right side of `&&` is only evaluated when the left side held, so the compiler knows `x` is non-null there. This is why short-circuit guards read naturally — the type tracks the evaluation order the operators already impose.

## Discriminated unions: the clean case, plus exhaustiveness

When a union's members share a literal tag — the discriminated unions of Lesson 05 — narrowing is at its most precise. A `switch` on the tag refines each branch to exactly the matching variant, no structural guessing involved:

```typescript
type Shape =
  | { kind: "circle"; r: number }
  | { kind: "square"; side: number };

function area(s: Shape): number {
  switch (s.kind) {
    case "circle": return Math.PI * s.r * s.r; // s: the circle variant
    case "square": return s.side * s.side;     // s: the square variant
    default:
      return assertNever(s); // s: never — see below
  }
}

function assertNever(x: never): never {
  throw new Error("unreachable: " + JSON.stringify(x));
}
```

The `default` branch is the part worth dwelling on, because it turns narrowing into a maintenance tool. By the time control reaches it, both `case`s have eliminated their variants, so the compiler narrows `s` to `never` — the empty type, the type with no values. Passing `s` to a function whose parameter is `never` type-checks only while `s` really is `never`. Add a third variant to `Shape` later and forget to handle it, and `s` in the `default` is now that variant, not `never`; `assertNever(s)` stops compiling:

```
Argument of type '{ kind: "triangle"; ... }' is not assignable to parameter of type 'never'.
```

So the compiler turns "I added a case and forgot a branch" from a runtime surprise into a build error, at every `switch` written this way. Python's `match` has no equivalent static guarantee — it falls through to the `case _:` wildcard or simply does nothing, and [[mypy]]'s exhaustiveness checking for it is limited and opt-in. This pattern is one of the stronger reasons to model state as a discriminated union in the first place.

## Custom type guards: `x is Foo`

When a check is too involved to inline, or you want to reuse it, write a **user-defined type guard**: a function whose return type is `arg is SomeType` instead of `boolean`. It is the direct analog of Python's `TypeGuard` (PEP 647).

:::compare
```python
from typing import TypeGuard

def is_str_list(v: list[object]) -> TypeGuard[list[str]]:
    return all(isinstance(x, str) for x in v)

def use(v: list[object]) -> None:
    if is_str_list(v):
        print(" ".join(v))  # v: list[str]
```
```typescript
function isStringArray(v: unknown[]): v is string[] {
  return v.every((x) => typeof x === "string");
}

function use(v: unknown[]): void {
  if (isStringArray(v)) {
    console.log(v.join(" ")); // v: string[]
  }
}
```
:::

The `v is string[]` return type is a claim the compiler takes on faith: "if this function returns `true`, the caller may treat the argument as `string[]`." It is exactly as correct as the function body, and the compiler does not verify that the body actually establishes the claimed type — it only checks that the body returns a `boolean`. This is the same trust model as Python's `TypeGuard`: both are unchecked promises. The honest framing is that a custom guard moves a runtime check behind a type-level assertion; if your logic is wrong, the type system will faithfully propagate the lie.

A frequent shape is narrowing a single member out of a discriminated union, using `Extract` (Lesson 11's utility types, previewed here):

```typescript
function isCircle(s: Shape): s is Extract<Shape, { kind: "circle" }> {
  return s.kind === "circle";
}
```

## Assertion functions: `asserts x is Foo`

A guard returns a boolean you branch on. An **assertion function** instead *throws* when the condition fails, and narrows everything *after* the call for the rest of the scope. The signature uses `asserts`:

```typescript
function assertDefined<T>(x: T | undefined): asserts x is T {
  if (x === undefined) throw new Error("expected a value");
}

function use(u: User | undefined): void {
  assertDefined(u);
  console.log(u.name); // u: User from here on
}
```

This is the typed cousin of Python's `assert x is not None`, after which [[mypy]] narrows `x`. The difference is that TypeScript makes the narrowing a reusable, named contract: any `asserts x is T` function the compiler can see applies its narrowing at the call site, where Python's narrowing is tied to the literal `assert` statement. The same trust caveat holds — the `asserts` signature is believed, not checked against the body. And note the narrowing only attaches to a stable reference: a variable, or a fixed property-access path like `obj.field`. Pass an arbitrary expression — a function-call result, `assertDefined(getUser().name)` — and there is no stable reference for the narrowed type to live on, so the assertion narrows nothing the caller can use afterward.

## Narrowing can be discarded across closures

You guard `u` with `if (u)`, so inside the block `u` is non-null. Then you read it from inside a callback that may run later. Whether the narrowing survives the trip into the closure depends on something specific about `u`.

:::quiz
`u` is narrowed to `User` by the `if`. Does `u.name` compile inside the `forEach` callback?

```typescript
let u: User | undefined = getUser();
if (u) {
  arr.forEach(() => u.name);
}
u = undefined; // reassigned somewhere in this function
```
:::answer
**No** — the compiler rejects `u.name` in the callback. The deciding factor is that `u` is **reassigned somewhere in the function** (`u = undefined` below). The callback could run after that reassignment, so the compiler cannot assume the `if (u)` narrowing still holds when the closure executes, and it discards the refinement inside the closure body. The bindings whose narrowing *does* survive into a closure are `const` and a parameter the compiler can see is never reassigned. A plain `let` does not — even one that is in fact never reassigned, TypeScript still drops its narrowing across a deferred call. So the rule is not the syntactic `let`-versus-`const` one; it is closer to "`const` and never-reassigned parameters keep it, everything else loses it past a deferred call," and it has no Python parallel — [[mypy]] does not model deferred execution this way.
:::

The mechanism is worth stating precisely, because the common shorthand ("`let` loses narrowing, `const` keeps it") is close but not quite the rule. The compiler scans the binding's entire scope. If a binding is reassigned anywhere, it treats the narrowed type as potentially stale at any point where execution is deferred — inside a function expression that might be called later — and drops the refinement there. Two kinds of binding survive that deferral: a `const`, and a parameter the compiler can see is never reassigned. A plain `let` does not: TypeScript drops a `let`'s narrowing across a deferred call even when the `let` is in fact never reassigned, so the practical effect lines up with the shorthand for `let`, just not for the reason the shorthand gives. The fix in every losing case is the same — copy the proven value into a binding that cannot change:

```typescript
let u: User | undefined = getUser();
if (u) {
  const safe = u;               // const can't be reassigned -> narrowing is stable
  arr.forEach(() => safe.name); // ok; referencing u directly here would error
}
```

This is the same insight as `as const` and immutability elsewhere: the compiler narrows aggressively but only keeps a refinement it can prove still holds past a deferred call, and the only bindings it trusts that far are ones it knows can't change underneath the closure.

## Recap

- Narrowing is control-flow analysis: the compiler carries a set of still-possible types per variable and shrinks it on every branch, including **by elimination** after a branch that exits via `return` / `throw` / `break` / `continue`.
- The guards are runtime operations that survive [[erasure|type-erasure]]: `typeof` (primitives), `Array.isArray` (arrays), `instanceof` (classes and built-ins), `in` (property presence), truthiness, and equality. `typeof null === "object"`; use `x != null` for the absence check.
- Discriminated-union `switch`es narrow each branch precisely, and a `never` `default` turns a forgotten variant into a compile error — a guarantee Python's `match` doesn't give.
- Custom guards (`x is Foo`, like `TypeGuard`) and assertion functions (`asserts x is Foo`, like a typed `assert`) are **trusted, not verified** — their correctness is entirely on the body.
- Narrowing carries into a closure only for a `const` or a never-reassigned parameter; a `let` loses it across a deferred call (even when never reassigned), as does any reassigned binding. Copy to a `const` to keep it.

:::predict
This guard compiles, but is dangerously wrong. Which value does it wrongly accept as a `User`?

```typescript
interface User { name: string }
function isUser(x: unknown): x is User {
  return typeof x === "object";
}
```

- (x) `null` — `typeof null === "object"`, so it passes the guard and then crashes on `.name`.
- ( ) `"Ada"` — a string passes the check.
- ( ) `42` — a number passes the check.
- ( ) Nothing is wrong — it accepts only `User`-shaped objects.
:::answer
The signature **claims** "if this returns `true`, `x` is a `User`." The body checks only `typeof x === "object"`, which is true for `null`, arrays, `Date`, and every object — none of which need a `name`. The compiler trusts the `x is User` annotation without verifying it, so every caller now treats arbitrary objects, and `null` in particular, as a valid `User`. The crash lands later, at `x.name` on `null`, far from the lie. A correct guard checks the actual shape:

```typescript
function isUser(x: unknown): x is User {
  return typeof x === "object" && x !== null && "name" in x &&
         typeof (x as { name: unknown }).name === "string";
}
```

This is why custom guards belong at trusted boundaries and should be written carefully — or generated from a schema library rather than hand-written.
:::

Run the broken guard and watch `null` pass through as a `User`, then crash on `.name`. The type system never objected, because you told it the guard was [[sound|soundness-vs-completeness]]:

:::play
```typescript
interface User { name: string }

function isUser(x: unknown): x is User {
  return typeof x === "object"; // dangerously incomplete
}

const junk: unknown = null;
if (isUser(junk)) {
  // the compiler now believes junk is a User...
  console.log(junk.name.toUpperCase()); // ...and it crashes here at runtime
}
```
:::

That example is the central tension of this lesson in miniature: narrowing inside the language is [[sound|soundness-vs-completeness]], but a custom guard is a promise the compiler trusts and never re-checks, which is exactly where [[unsoundness|soundness-vs-completeness]] enters ([[soundness vs completeness|soundness-vs-completeness]], Lesson 01). The safety question moves to the program's edge, where untrusted data arrives — and Lesson 12 closes that loop with the `unknown` type and runtime validation. But look again at what the guard and the assertion were: ordinary functions whose return signature (`x is User`, `asserts x`) tells the compiler something a plain `boolean` return cannot. Functions hold several powers like that — overloads, an explicitly typed `this`, the unexpected rules around `void` — and they diverge from Python's enough to be worth their own lesson. That's Lesson 09, next.
