---
title: Generics
subtitle: The <T> syntax, constraints, and the inference Python's TypeVar makes you spell out
---

## Where this picks up

Lesson 06 left you with a function whose return could be `T | undefined` the moment an array index might miss. That `| undefined` rode along automatically — you didn't write it; the compiler added it. Generics are where that habit gets its sharpest expression: you write a function over an unknown type once, and the compiler works out the concrete type at every call site, often without a single annotation from you. Lesson 02 promised the compiler infers more than you tell it. Generic inference is that promise at full strength.

The concept itself you already own. Python's `TypeVar` parameterizes a function over an unknown type; so does `<T>`. The interesting part isn't the idea — it's how rarely you write the type out, why the compiler can fill it in, and the one place that machinery quietly disagrees with what you'd expect.

## Inference is the delta

Here is the canonical example, the one every generics tutorial opens with, in both languages.

:::compare
```python
from typing import TypeVar
T = TypeVar("T")

def first(xs: list[T]) -> T:
    return xs[0]

# Python 3.12+ has inline syntax, no TypeVar object:
def first[T](xs: list[T]) -> T:
    return xs[0]
```
```typescript
function first<T>(xs: T[]): T {
  return xs[0];
}
```
:::

`<T>` after the name declares the type parameter; you then use `T` in the parameters and the return. Python 3.12's `def first[T]` is now nearly identical, down to dropping the separate `TypeVar` object. Structurally these are the same construct.

What differs is the call. You never told the compiler that `T` is `number`, yet:

:::predict
You call `first` twice. Nothing in the call spells out `T`. What type does each call return, and how did the compiler decide?

```typescript
first([1, 2, 3]); // returns ?
first(["a", "b"]); // returns ?
```

- ( ) `unknown` both times — `T` was never assigned, so the compiler has nothing to go on.
- ( ) `T[number]` both times — a placeholder that stays symbolic until you annotate the result.
- (x) `number` and `string` — `T` is solved from the argument's type at each call.
- ( ) An error — generic functions require an explicit type argument like `first<number>(...)`.
:::answer
`number` and `string`. The compiler treats `T` as an unknown, sees you passed a `number[]`, and solves `T = number`; for the second call it sees `string[]` and solves `T = string`. This is [[unification|hindley-milner]]: the parameter type `T[]` and the argument type `number[]` are matched up, and the only assignment of `T` that makes them agree is `number`. You *can* force it — `first<boolean>([true])` is legal — but supplying the argument is enough, so idiomatic code almost never writes the type argument.
:::

This is the practical gap between the two systems. Python's `TypeVar` exists mainly so a checker ([[mypy]], pyright) can verify your annotations after the fact; you still annotate, the checker still mostly confirms. TypeScript's inference is doing the same job a checker does, but it runs as you type and fills in the type arguments for you. The algorithm is [[Hindley–Milner|hindley-milner]]–inspired rather than pure [[HM|hindley-milner]] — TypeScript layers subtyping, unions, and [[structural typing|structural-typing]] on top, which is why it occasionally needs a hint where Haskell wouldn't — but for the everyday case of "solve `T` from the argument," it just works.

Run it and watch the editor report each inferred type:

:::play
```typescript
function first<T>(xs: T[]): T | undefined {
  return xs[0];
}

const a = first([1, 2, 3]);   // a: number | undefined
const b = first(["x", "y"]);  // b: string | undefined
console.log(a, b?.toUpperCase());
```
:::

Note the return type is `T | undefined`, not `T`. The Playground runs with `noUncheckedIndexedAccess`, so `xs[0]` is `T | undefined` — the array might be empty (Lesson 06). Inference still solves `T` to `number` and `string` from the argument; the `| undefined` is layered on by the index access, independent of the generic. That is the honest version of `first` under a strict array-index setting, and the `b?.toUpperCase()` is there because `b` could be `undefined`. The two concerns are orthogonal: generics decide what `T` is; null-safety decides whether indexing can miss.

## The inferred type follows the const/let rule

Inference into a generic isn't a separate mechanism from the inference you saw in Lesson 02 — it obeys the same widening rule, and the place that shows is where the result lands.

```typescript
function id<T>(x: T): T {
  return x;
}

const lit = id("hello"); // lit: "hello"   (literal type preserved)
let mut = id("hello");   // mut: string    (widened)
```

`const lit = id("hello")` infers `T` as the literal type `"hello"`, because a `const` can never be reassigned, so the narrowest type is the safe one. `let mut = id("hello")` widens to `string`, because a `let` can later hold any string. The generic call did not change the rule from Lesson 02; the binding on the left did. This matters in practice because `as const` and the const/let distinction propagate *through* generic calls, so where a literal type survives is predictable once you know it tracks the destination.

One edge worth knowing, because it surprises people: inference into a fresh array widens.

```typescript
function wrap<T>(x: T): T[] {
  return [x];
}

const w = wrap("hi");   // w: string[], not "hi"[]
const e = first([]);    // e's T is inferred as never — empty array, nothing to solve from
```

`wrap("hi")` gives `string[]`, not `"hi"[]`, because building an array is a context where TypeScript widens literals (the same reason `const xs = ["a", "b"]` is `string[]`, not `("a" | "b")[]`). And `first([])` on an empty array has no element to read a type from, so `T` collapses to `never` — there is genuinely no information to unify against. Neither is a bug; both fall out of the same widening machinery.

## Generics parameterize types, not just functions

The same `<...>` syntax applies to types. `Array<T>`, `Map<K, V>`, and `Promise<T>` are the built-in generic types, and they map directly to `list[T]`, `dict[K, V]`, and the awaitable you get from a coroutine.

:::compare
```python
box: dict[str, int] = {}
box["a"] = 1
v = box.get("a")   # int | None

async def fetch_name() -> str:
    ...
# calling it yields a coroutine -> str
```
```typescript
const box: Map<string, number> = new Map();
box.set("a", 1);
const v = box.get("a"); // number | undefined

async function fetchName(): Promise<string> {
  return "x";
}
// the call yields a Promise<string>
```
:::

`Map.get` returns `number | undefined`, not `number` — the key might be absent, and the type says so, exactly as Python's `dict.get` is typed `int | None`. The async case is stricter than Python's: an `async` function's annotated return type must be `Promise<T>`. Writing `async function fetchName(): string` is a compile error (TS1064), because the function literally returns a promise regardless of what you do inside it. Python lets you annotate an `async def` with `-> str` and infers the coroutine wrapper around it; TypeScript makes you name the `Promise<>` explicitly. Same underlying reality, less implicit.

An API response wraps a varying payload around a fixed envelope — the same `status` field, different `data` each time. That need is what `ApiResponse<T>` expresses, and you declare your own generic types the same way the built-ins are declared:

```typescript
interface ApiResponse<T> {
  data: T;
  status: number;
}

type Result<T, E> =
  | { ok: true; value: T }
  | { ok: false; error: E };

const r: ApiResponse<User[]> = { data: [], status: 200 };
```

`Result<T, E>` is a generic discriminated union — Lesson 05's pattern with type parameters threaded through it. It's how TypeScript models a Rust-style `Result` or a Go-style `(value, err)` pair without exceptions, and the generics change nothing about how it narrows:

:::quiz
Given `type Result<T, E> = { ok: true; value: T } | { ok: false; error: E }` and a value `r: Result<User, string>`, inside `if (r.ok) { ... }` what is the type of `r.value`, and what happens if you reach for `r.error` there?
:::answer
Inside `if (r.ok)`, TypeScript narrows `r` to the `{ ok: true; value: T }` member, so `r.value` is `User` and `r.error` is a compile error — that property exists only on the `ok: false` member. `ok` is the discriminant, here a boolean-literal one (`true` vs `false`) rather than a string tag, but it narrows identically. The type parameters are inert during narrowing: they decide *what* `value` and `error` hold, not *how* the union is discriminated. Narrowing itself is Lesson 08.
:::

## Constraints: `extends` is `bound=`, and it means "assignable to"

By default a type parameter is opaque. The compiler knows `T` is *some* type but nothing about its shape, so it rejects any member access:

```typescript
function lengthOf<T>(x: T): number {
  return x.length; // TS2339: Property 'length' does not exist on type 'T'
}
```

This is the point most Python developers underestimate. In Python, `def f(x: T)` lets you call `x.length` and find out at runtime whether it works — the annotation buys you nothing the interpreter enforces. In TypeScript, an unconstrained `T` is genuinely unusable beyond passing it around, because the compiler must make `lengthOf` type-check for *every* possible `T`, and most types have no `.length`. To unlock a member you must promise it exists, with a constraint:

:::compare
```python
from typing import Protocol, TypeVar

class HasLength(Protocol):
    def __len__(self) -> int: ...

T = TypeVar("T", bound=HasLength)

def longest(a: T, b: T) -> T:
    return a if len(a) >= len(b) else b
```
```typescript
interface HasLength {
  length: number;
}

function longest<T extends HasLength>(a: T, b: T): T {
  return a.length >= b.length ? a : b;
}
```
:::

`T extends HasLength` is precisely Python's `TypeVar("T", bound=HasLength)`: it bounds `T` to types that have a `length: number`, and inside the function `T`'s apparent type becomes `HasLength`, so `.length` is allowed. The mechanism is the same as the constraint not existing for unconstrained `T` — the compiler needs a guarantee that holds for every instantiation, and the bound supplies it.

The word `extends` is the trap. A Python reader hears "subclass," but in a generic bound it means assignable to — the [[structural|structural-typing]] relation, not inheritance.

:::predict
A Python dev reads `extends` as subclassing. So in `longest<T extends HasLength>`, which of these calls type-check?

```typescript
longest("aa", "b");   // two strings
longest([1, 2], [3]); // two arrays
longest(1, 2);        // two numbers
```

- ( ) None — nothing was declared to subclass `HasLength`.
- ( ) Only the array call — arrays are the canonical length-bearing type.
- (x) The string and array calls compile; the number call is an error.
- ( ) All three — `extends` is advisory and TypeScript widens to satisfy it.
:::answer
The first two compile, the third errors (TS2345: `Argument of type 'number' is not assignable to parameter of type 'HasLength'.`). Neither `string` nor `Array` was ever declared to "implement" an interface named `HasLength` — that interface might not have existed when they were defined. But each *has* a `length: number` member, and [[structural|structural-typing]] assignability is all `extends` checks. `number` has no `length`, so `longest(1, 2)` is rejected. Read `T extends C` as Python's `bound=C` under [[structural typing|nominal-vs-structural]]: "any type whose shape includes `C`," never "any subclass of `C`." A class you write that happens to have a `length: number` field satisfies the bound without naming it.
:::

So a constraint does two jobs at once: it filters which types may instantiate `T`, and it tells the compiler the minimum shape every `T` has, which is what unlocks member access. Without it, `T` is a sealed box you can move but not open.

## Default type parameters

On a type meant to be configured but usually left alone, writing `Container<string>` at every use site is noise when `string` is the default. A type parameter can carry a default to remove it, the way PEP 696 added defaults to Python's `TypeVar` (3.13):

```typescript
interface Container<T = string> {
  value: T;
}

const a: Container = { value: "hi" }; // T defaults to string
const b: Container<number> = { value: 1 };
```

The default applies only where you write `Container` bare and the compiler has no value to solve `T` from; if `T` can be inferred, inference wins. It earns its keep on a generic event emitter defaulting its payload to `unknown`, a container defaulting its element type.

## `keyof` with generics: the pattern you'll see everywhere

Constraints unlock members on `T`; combine them with `keyof` and you can do something Python can't express at all — make a function's *return* type depend on which key the caller passed. The canonical case is a type-safe property getter.

:::play
```typescript
function getProp<T, K extends keyof T>(obj: T, key: K): T[K] {
  return obj[key];
}

const user = { name: "Ada", age: 36 };
console.log(getProp(user, "name").toUpperCase()); // string -> "ADA"
console.log(getProp(user, "age") + 1);            // number -> 37
// getProp(user, "email");  // try it: "email" is not a key of user
```
:::

Three pieces do the work. `keyof T` is the union of `T`'s key names — for `user` that's `"name" | "age"`. `K extends keyof T` constrains the second argument to be one of those keys, so passing `"email"` is a compile error. And `T[K]` is the indexed access type: the type stored at key `K`, which is `string` when `K` is `"name"` and `number` when `K` is `"age"`. The return type is computed from the *specific* key you passed, not collapsed to `string | number`.

There is no clean Python analogue. `TypedDict` plus `Literal` keys can approximate the call-site check, but Python has nothing that computes a return type from a key argument the way `T[K]` does — that is the compiler deriving one type from another, evaluated entirely at compile time and [[erased|type-erasure]] before anything runs ([[type-erasure]]). It's your first contact with the type-level language that Lesson 11 is built on. Worth recognizing now because once you see `<T, K extends keyof T>` you'll see it in every library you read.

## Recap

- A generic is `TypeVar`: parameterize over an unknown type. The syntax is `<T>` inline after the name, matching Python 3.12's `def f[T]`.
- Type arguments are almost always inferred by [[unification|hindley-milner]] from the call's arguments; you rarely write `f<number>(...)`.
- Inference obeys Lesson 02's widening: it tracks the `const`/`let` destination, and widens inside arrays, which is why `wrap("hi")` is `string[]`.
- `Array<T>`, `Map<K, V>`, `Promise<T>` are the built-in generic types; an `async` function's return type must be `Promise<T>`.
- `T extends C` is a bound (`bound=`), structural, not inheritance — and it's also what unlocks members on an otherwise-opaque `T`.
- Defaults are `<T = string>`. The `<T, K extends keyof T>` getter with return `T[K]` is the ubiquitous pattern.

:::quiz
This version fails to compile in two distinct ways. Name both, and give the single rewrite that fixes both.

```typescript
function pluck<T>(items: T[], key): unknown {
  return items.map((item) => item[key]);
}
```
:::answer
Two errors. First, `key` has no annotation, so under `strict` it's an implicit `any` (TS7006: `Parameter 'key' implicitly has an 'any' type.`). Second, indexing fails: `item[key]` is reported as an implicit `any` element access (TS7053), because the compiler can't show that an unconstrained key indexes `T`. The second error is downstream of the first — once `key` is properly typed as a key of `T`, the access is legal even though `T` itself stays opaque — so one change fixes both: introduce a second, constrained type parameter for the key.

```typescript
function pluck<T, K extends keyof T>(items: T[], key: K): T[K][] {
  return items.map((item) => item[key]);
}
```

Now `K extends keyof T` types `key` *and* guarantees it indexes `T`, so `item[key]` is legal, and the return type `T[K][]` is precise rather than `unknown`.
:::

Inference left you with types you didn't write — `T | undefined` from an index, `number | undefined` from `Map.get`, the union members of a `Result`. Generics produce those unions; they don't resolve them. The next question is the one the `if (r.ok)` quiz pointed at: how does the compiler know, inside a branch, that a `string | undefined` is now just a `string`? That's Lesson 08 — how TypeScript follows your control flow and narrows a type as your code rules possibilities out.
