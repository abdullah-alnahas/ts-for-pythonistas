---
title: Generics
subtitle: TypeVar you know — the <T> syntax, constraints, and inference you don't
---

## What's the return type?

Write the function that returns the first element of an array:

```typescript
function first<T>(xs: T[]): T {
  return xs[0];
}
```

Now call `first([1, 2, 3])`. You never said `T` was `number`. So predict: what type does the *call* return?

:::quiz
**Predict before you read on.** For each call, what type comes back — and how did the compiler decide?

```typescript
first([1, 2, 3]);   // returns ?
first(["a", "b"]);  // returns ?
```
:::answer
`number` and `string`, respectively. TS **infers** `T` from the argument you passed — it reads `number[]` and concludes `T = number`, reads `string[]` and concludes `T = string`. You almost never write the type argument; the call site supplies it implicitly. (`first<boolean>([true])` is *available* if you ever need to force it, but idiomatic code lets inference do the work.)
:::

That inference is the delta. The concept itself you already own from Python's `TypeVar` — parameterize a function over an unknown type. What's new is the angle-bracket syntax and how rarely you spell the type out.

:::compare
```python
from typing import TypeVar
T = TypeVar("T")

def first(xs: list[T]) -> T:
    return xs[0]

# Python 3.12+ shorthand:
def first[T](xs: list[T]) -> T:
    return xs[0]
```
```typescript
function first<T>(xs: T[]): T {
  return xs[0];
}
```
:::

`<T>` after the name declares the type parameter; then use `T` in params and return. Python 3.12's `def first[T]` syntax is now strikingly close — no separate `TypeVar` object to create. Run the inference yourself; the editor reports the inferred return type:

:::play
```typescript
function first<T>(xs: T[]): T {
  return xs[0];
}

const a = first([1, 2, 3]);   // a: number
const b = first(["x", "y"]);  // b: string
console.log(a, b.toUpperCase());
```
:::

## Generic types (not just functions)

Generics parameterize types too. `Array<T>`, `Map<K, V>`, `Promise<T>` are all generic — like `list[T]`, `dict[K, V]` in Python.

:::compare
```python
def wrap(x: T) -> list[T]:
    return [x]

box: dict[str, int] = {}

async def fetch() -> str: ...
# returns a coroutine -> str
```
```typescript
function wrap<T>(x: T): T[] {
  return [x];
}

const box: Map<string, number> = new Map();

async function fetch(): Promise<string> { /* ... */ }
// async always wraps the return in Promise<>
```
:::

> Note: an `async` function's annotated return type is **always** `Promise<T>` — TS won't let you write `async function f(): string`. This mirrors Python's `Coroutine`/awaitable, but is stricter and explicit.

You can define your own generic interfaces and types:

```typescript
interface ApiResponse<T> {
  data: T;
  status: number;
}

type Result<T, E> = { ok: true; value: T } | { ok: false; error: E };

const r: ApiResponse<User[]> = { data: [], status: 200 };
```

`Result<T, E>` above is a generic **discriminated union** — combining Lesson 05 with generics. This is how TS models Rust-style `Result` / Go-style `(value, err)` cleanly.

:::quiz
Recall Lesson 05. Given `type Result<T, E> = { ok: true; value: T } | { ok: false; error: E }` and a value `r: Result<User, string>`, inside `if (r.ok) { ... }` what is the type of `r.value`, and what would `r.error` do?
:::answer
Inside `if (r.ok)`, TS narrows `r` to the `{ ok: true; value: T }` variant, so `r.value` is **`User`** and `r.error` is a **compile error** (that property only exists on the `ok: false` variant). `ok` is the discriminant — a boolean-literal one here (`true` | `false`) rather than a string tag, but it narrows identically. Generics don't change narrowing; they just parameterize what `value`/`error` hold.
:::

## Constraints: `extends` is `bound=`

To require that `T` has certain capabilities, use `T extends Constraint`. This is Python's `TypeVar("T", bound=...)`.

:::compare
```python
from typing import TypeVar
T = TypeVar("T", bound="HasLen")

class HasLen(Protocol):
    def __len__(self) -> int: ...

def longest(a: T, b: T) -> T:
    return a if len(a) >= len(b) else b
```
```typescript
interface HasLength { length: number }

function longest<T extends HasLength>(a: T, b: T): T {
  return a.length >= b.length ? a : b;
}

longest([1, 2], [3]);      // ok, arrays have length
longest("aa", "b");        // ok, strings have length
longest(1, 2);             // ERROR: number has no 'length'
```
:::

:::quiz
**Predict before you read on.** A Python dev reads `extends` as subclassing. So in `longest<T extends HasLength>`, which of these calls type-check?

```typescript
longest("aa", "b");   // a plain string
longest([1, 2], [3]); // a plain array
```
:::answer
**Both** compile. Neither `string` nor `Array` *subclasses* an interface called `HasLength` — they were never declared to. But each *has* a `length: number` member, and that's all `extends` asks for here. In a generic bound, `extends` means "**assignable to**" (structural, Lesson 03), not "inherits from." Read it as Python's `TypeVar("T", bound=...)`, never as a class hierarchy.
:::

So `extends` means "**must be assignable to**" — a *bound*, not class inheritance. Without the constraint, `T` is fully opaque: you can pass it around but not access any members (you don't know it has any). The constraint unlocks `.length`.

## Default type parameters

TS allows defaults, like a default for a `TypeVar` (PEP 696, Python 3.13):

```typescript
interface Container<T = string> {
  value: T;
}

const a: Container = { value: "hi" };     // T defaults to string
const b: Container<number> = { value: 1 };
```

## `keyof` + generics: the idiomatic combo

A constraint you'll see constantly — a type-safe property getter, where the return type depends on which key you pass. Run it, then add a line `getProp(user, "xyz")` and watch the compiler reject a key that doesn't exist:

:::play
```typescript
function getProp<T, K extends keyof T>(obj: T, key: K): T[K] {
  return obj[key];
}

const user = { name: "Ada", age: 36 };
console.log(getProp(user, "name")); // typed as string -> "Ada"
console.log(getProp(user, "age"));  // typed as number -> 36
// getProp(user, "xyz");            // error: "xyz" is not a key of user
```
:::

`keyof T` is the union of `T`'s keys (`"name" | "age"`), `K extends keyof T` constrains the key, and `T[K]` is the **indexed access type** — the type at that key. There's no clean Python equivalent; this is type-level computation (more in Lesson 11). It's worth recognizing now because it appears everywhere.

## Recap

- Generics = `TypeVar`, with `<T>` syntax inline after the name.
- Type args are usually **inferred**; you rarely write `f<number>(...)`.
- `Array<T>`, `Map<K,V>`, `Promise<T>` are generic; `async` returns are always `Promise<T>`.
- `T extends C` is a **bound** (`bound=`), not inheritance — it unlocks members on `T`.
- Defaults: `<T = string>`. The `<T, K extends keyof T>` getter pattern is ubiquitous.

:::quiz
Why does the unconstrained version fail to compile, and what one change fixes it?

```typescript
function pluck<T>(items: T[], key): unknown {
  return items.map((item) => item[key]); // error on item[key]
}
```
:::answer
`T` is **opaque** — with no constraint, TS knows nothing about `item`'s shape, so it rejects `item[key]` (it can't prove `key` indexes `T`). The `key` param is also untyped. Fix by introducing a second, constrained type parameter for the key:

```typescript
function pluck<T, K extends keyof T>(items: T[], key: K): T[K][] {
  return items.map((item) => item[key]);
}
```

Now `K extends keyof T` guarantees `key` is a real key of `T`, `item[key]` is allowed, and the return type `T[K][]` is precise.
:::

`keyof T` and `T[K]` weren't really about generics — they're the compiler *computing* one type from another. Pull on that thread and you reach a whole type-level language: types that map, filter, and transform other types, none of which exist at runtime. Lesson 11 is that language.
