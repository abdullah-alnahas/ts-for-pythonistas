---
title: null vs undefined
subtitle: Two empty values instead of one None, plus strict null safety
---

## Two flavors of "nothing"

:::quiz
**Predict before you read on.** In TS/JS, what do each of these produce — and is it `null`, `undefined`, or an error?

```typescript
let a;                                   // declared, never assigned
const d: Record<string, number> = {};
const b = d["missing"];                  // key not present
```
:::answer
Both `a` and `b` are **`undefined`** (no error). Coming from Python you might expect one `None`-like value, or an error/`KeyError` for the missing key — but JS has **two** empties and missing things default to `undefined` (never assigned, missing property, missing arg, no `return`). `null` is the *other* one, and you only get it when someone assigns it explicitly. Holding "two empties, and absence → `undefined`" in your head prevents a lot of confusion below.
:::

Python has one empty value: `None`. JS/TS has **two**: `null` and `undefined`. This is the most common early confusion.

| | meaning (convention) | how you usually get it |
|---|---|---|
| `undefined` | "this was never set" | missing property, unassigned var, missing arg, no `return` |
| `null` | "intentionally empty" | you (or an API) explicitly assigned it |

:::compare
```python
x = None          # the only option

d = {}
d.get("missing")  # -> None
```
```typescript
let x;                  // undefined (never assigned)
let y = null;           // explicitly empty

const d: Record<string, number> = {};
d["missing"];           // undefined (not present)
```
:::

Practical guidance: most TS codebases **default to `undefined`** and use `null` only when an external contract demands it (some APIs, JSON, the DOM). Optional things produce `undefined`. Don't agonize — pick `undefined` as your "absent" and you'll match the ecosystem.

## strictNullChecks: the safety upgrade

This is why Lesson 01 insisted on `strict: true`. With strict null checks on, `null` and `undefined` are **not** assignable to other types. You must opt in via a union.

```typescript
let name: string = null;        // ERROR under strict
let name2: string | null = null; // ok — you declared it nullable

function find(id: number): User | undefined { /* ... */ }
```

This is like turning every type into "non-optional by default." Python's hints are looser here — `def f() -> User` happily returns `None` and mypy only complains with strict settings. TS makes `User | undefined` mandatory and explicit. **The compiler now tracks nullability through your code** — and forces you to handle it before use.

```typescript
function greet(u: User | undefined) {
  console.log(u.name);  // ERROR: 'u' is possibly 'undefined'
  if (u) {
    console.log(u.name); // ok — narrowed to User inside the guard
  }
}
```

## Optional fields and params: `?`

`?` marks something as possibly-`undefined`. It's shorthand, and it differs subtly from `| undefined`.

:::compare
```python
from typing import Optional

class User:
    name: str
    nickname: Optional[str] = None

def greet(name: str, title: str | None = None): ...
```
```typescript
interface User {
  name: string;
  nickname?: string;   // optional: string | undefined, key may be absent
}

function greet(name: string, title?: string) {}
```
:::

Subtlety: `nickname?: string` means the **key can be missing entirely**, whereas `nickname: string | undefined` means the **key must exist** but may hold `undefined`. Python's `Optional[X]` is just `X | None` — it doesn't model "the key isn't there at all." This matters with `TypedDict` (`total=False`) but TS makes it a first-class `?`.

:::quiz
Recall Lesson 03's "has at least" rule. Given `interface User { name: string; nickname?: string }`, is `const u: User = { name: "Ada" }` valid? What about `{ name: "Ada", nickname: undefined }`?
:::answer
Both are valid. The optional `?` means the `nickname` key may be **absent**, so `{ name: "Ada" }` satisfies "has at least the required members" (only `name` is required). Supplying `nickname: undefined` is also fine because `nickname?: string` is `string | undefined`. The distinction matters for `"nickname" in u` (false in the first case, true in the second) — same key-presence subtlety as the excess-property corner in Lesson 03.
:::

## The operators you'll use constantly

TS/JS gives you ergonomic tools for null handling. Memorize these four:

```typescript
// ?. optional chaining — short-circuits to undefined if left is null/undefined
const city = user?.address?.city;        // undefined if user or address absent

// ?? nullish coalescing — fallback ONLY for null/undefined
const port = config.port ?? 3000;        // 0 stays 0; only null/undefined -> 3000

// ! non-null assertion — "trust me, not null" (erased; no runtime check!)
const el = document.getElementById("x")!; // HTMLElement, not | null

// ||  — fallback for any FALSY value (footgun, see below)
const p2 = config.port || 3000;          // 0 -> 3000  (probably a bug!)
```

:::compare diff
```python
# optional chaining: no operator
city = user and user.address and user.address.city

# fallback: or, but None AND falsy both trigger
port = config.get("port") or 3000   # 0 -> 3000 too
```
```typescript
const city = user?.address?.city;
const port = config.port ?? 3000;   // 0 preserved
```
:::

Python's `or` falls back on *any* falsy value; `??` falls back only on the absent ones.

**`??` vs `||` is a real trap.** Python's `or` treats `0`, `""`, `[]` as falsy — same as JS `||`. The `??` operator was added precisely to fall back *only* on `null`/`undefined`, preserving `0` and `""`. Default to `??` for "use this if absent."

## Try it live

Run it: `??` preserves `0`, `||` clobbers it. Change the input to see the trap.

:::play
```typescript
function volumeWith(op: "??" | "||", v: number | null): number {
  return op === "??" ? (v ?? 50) : (v || 50);
}

console.log("user muted (0):");
console.log("  ?? gives", volumeWith("??", 0)); // 0  (correct)
console.log("  || gives", volumeWith("||", 0)); // 50 (bug!)
```
:::

## `!` is a lie detector you disable

The `!` non-null assertion tells the compiler "this isn't null" — but it's **erased**, so there's **no runtime check**. If you're wrong, you get a runtime crash with no protection. It's `# type: ignore`-grade — use sparingly, prefer a real guard or `??`.

## void vs undefined

A `void` return type means "ignore the return value" — looser than `undefined`. Covered more in Lesson 09; for now: callbacks typed `() => void` may actually return something, and that's intentional.

## Recap

- Two empties: `undefined` ("never set") and `null` ("explicitly empty"). Default to `undefined`.
- `strict` makes null/undefined unassignable unless you write `| null` / `| undefined` / `?`.
- The compiler **tracks nullability** and forces you to guard before use.
- `?.` chains safely, `??` falls back on null/undefined only, `!` asserts non-null (no runtime check).
- **Use `??`, not `||`**, unless you really want `0`/`""` to trigger the fallback.

:::predict
A user sets `volume` to `0`. Which line silently breaks their setting?

```typescript
const volume = settings.volume || 50;   // (A)
const volume = settings.volume ?? 50;    // (B)
```

- (x) (A) — `0 || 50` is `50`, so the deliberate mute is lost.
- ( ) (B) — `0 ?? 50` is `50`, so the mute is lost.
- ( ) Both break it identically.
- ( ) Neither — `0` survives both operators.
:::answer
**Line (A) breaks it.** `0 || 50` evaluates to `50` because `0` is falsy — so a user who deliberately muted (`0`) gets reset to `50`. **Line (B) is correct:** `0 ?? 50` is `0`, because `??` only falls back on `null`/`undefined`, not on falsy values. This is the single most common `||`-vs-`??` bug; the same trap exists with Python's `or`.
:::

Notice what the compiler did inside `if (u)`: it *removed* `undefined` from `u`'s type for the rest of the block. That single move — shrinking a type as control flow proves things about it — is narrowing, and it runs far deeper than one `if`. Lesson 08 shows how far the tracking goes.
