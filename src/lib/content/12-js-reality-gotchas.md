---
title: The JS reality layer & gotchas
subtitle: any vs unknown, assertions, ===, tsconfig, .d.ts, @types
---

You've written `if (not items):` to check for an empty list a thousand times. Port the reflex to JS as `if (!arr)` and it is *always false* — an empty array is truthy here. That one fact, more than any type-system feature, is where a Python developer's muscle memory silently produces bugs. TS is a thin layer over JS, so JS's warts are still your warts; this closing lesson collects the traps and the escape hatches, starting with the type-safety ones and ending at that truthiness corner.

## any vs unknown — the most important distinction

`any` **turns off the type checker** for that value — it's contagious and dangerous. `unknown` is the **safe** "I don't know yet" type: you must narrow before using it.

:::compare
```python
from typing import Any
def f(x: Any):
    x.whatever()  # mypy: silently allowed
    return x + 1  # no check
# Python has no safe "unknown" — Any is it.
# (object is the closest: requires casts.)
```
```typescript
function f(x: any) {
  x.whatever();   // allowed — no safety
  return x + 1;   // allowed
}

function g(x: unknown) {
  x.whatever();   // ERROR: must narrow first
  if (typeof x === "number") return x + 1; // ok after guard
}
```
:::

Rules:

- **Never use `any`.** It silently disables checking and *spreads* (anything touching an `any` becomes `any`). Your CLAUDE.md already bans it — TS makes the alternative easy.
- Use **`unknown`** for genuinely-unknown input (parsed JSON, `catch` errors, external data), then narrow with guards (Lesson 08).
- `object` ≈ Python's `object` (any non-primitive); `unknown` is broader (any value, safely).

```typescript
try { /* ... */ }
catch (e) {           // e is `unknown` under strict (not any!)
  if (e instanceof Error) console.log(e.message);
}
```

:::quiz
Recall Lesson 08. You receive `x: unknown` and want `x.toUpperCase()`. Why won't TS let you call it directly, and what's the minimal fix?
:::answer
`unknown` is the **safe** top type: TS refuses *every* operation on it until you prove what it is. The fix is to **narrow** first (Lesson 08), e.g. `if (typeof x === "string") return x.toUpperCase();`. That's the whole point of `unknown` over `any` — `any` would silently allow `x.toUpperCase()` and crash at runtime if `x` weren't a string; `unknown` forces the guard that makes the call safe.
:::

## Type assertions — `as`

`x as T` tells the compiler "trust me, this is a `T`." It's **not** a runtime cast (nothing is converted or checked) — purely a compile-time override. Closest Python analog: `typing.cast`.

```typescript
const el = document.getElementById("app") as HTMLCanvasElement;
const data = JSON.parse(str) as User;   // no validation happens!
```

`as` is unchecked and unsafe — if you're wrong, you crash later. Prefer narrowing or a real validator (Zod) over `as`. Two legitimate uses: narrowing `unknown` after you've actually checked, and the `as const` literal-freeze (Lesson 11). Avoid the double-assertion `x as unknown as T` — that's "I'm forcing this past the compiler," a code smell.

> `as` is *not* Python's `int(x)` conversion. There is no conversion. For real conversion you call functions: `Number(x)`, `String(x)`, `JSON.parse`.

## == vs === (and JS truthiness)

:::predict
Your Python intuition is loaded. `if not items:` is your reflex empty-list check. So what is `Boolean([])` in JS — is an empty array truthy or falsy?

```typescript
Boolean([]);   // an empty array — truthy or falsy?
```

- (x) `true` — an empty array is **truthy** in JS.
- ( ) `false` — like Python, an empty collection is falsy.
:::answer
**`true`** — an empty array is **truthy** in JS. This is the big one (next section). If you predicted `[]` falsy, that's Python firing and it *will* bite you. Only `false`, `0`, `""`, `null`, `undefined`, `NaN` are falsy; `[]` and `{}` are not among them.

The coercion siblings, for completeness (all true under `==`'s coercion, all caught by `===`):

```typescript
0 == "";           // true  — == coerces both to 0
[] == false;       // true  — [] -> "" -> 0; false -> 0
1 === "1";         // false — === does no coercion, number ≠ string
```

These are why the rules below exist: `===` always, and never trust `[]`/`{}` to be falsy.
:::

JS has two equality operators. **Always use `===`** (strict). `==` runs type coercion with infamous results. Run each line and check it against your prediction above:

:::play
```typescript
console.log("0 == ''       ", 0 == "");          // true  — both coerce to 0
console.log("0 == '0'      ", 0 == "0");          // true
console.log("null == undef ", null == undefined); // true
console.log("[] == false   ", [] == false);       // true  — [] -> "" -> 0
console.log("1 === '1'     ", 1 === "1");          // false — no coercion
console.log("Boolean([])   ", Boolean([]));        // true  — empty array is truthy
```
:::

`===` compares without coercion (≈ Python `==` for most cases; JS `===` is value-equal for primitives, reference-equal for objects). Rule: `===`/`!==` everywhere; the one accepted `==` use is `x == null` to catch both null and undefined (Lesson 06/08). The full coercion algorithm behind `==` is glossary-depth — you never need it if you just use `===`.

### `[]` and `{}` are truthy

The single highest-value correction for a Python dev. In Python, `[]`, `{}`, `""`, `0` are all **falsy** — `if not items:` is the idiomatic empty check. In JS, **only** `false`, `0`, `""`, `null`, `undefined`, `NaN` are falsy. An **empty array and empty object are truthy.** So `if (arr)` is `true` even when `arr` is `[]`, and `if (obj)` is `true` for `{}`. Every "is this collection empty?" check you write from Python muscle memory is wrong here. Check `arr.length === 0` (or `Object.keys(obj).length === 0`), never the bare truthiness.

:::compare run
```python
items = []
if not items:        # empty list is falsy
    print("empty")
```
```typescript
const items: number[] = [];
if (items) console.log("(arr) truthy — Python reflex misfires");
if (items.length === 0) console.log("empty — the correct check");
```
:::

## Equality of objects

No `__eq__`. `===` on objects is identity (like Python `is`), and there's no operator overloading to change it. Deep equality means a helper (`structuredClone` for copies; a library or manual compare for equality). Don't expect `{a:1} === {a:1}` to be true — it's `false`.

## tsconfig knobs worth knowing

Beyond `strict: true` (which bundles many checks), a few you'll meet:

| Option | Effect |
|---|---|
| `strict` | turns on the whole strict family — **always on** |
| `noUncheckedIndexedAccess` | `arr[i]` / `obj[key]` become `T \| undefined` (huge safety win; not in `strict`) |
| `target` | which JS version to emit (`ES2022`, etc.) |
| `module` / `moduleResolution` | how imports resolve (`bundler` for modern setups) |
| `lib` | which built-in APIs exist (`DOM`, `ES2023`…) |
| `noEmitOnError` | refuse to emit JS when type-checking fails (recall Lesson 01) |

Turn on `noUncheckedIndexedAccess` for new code — it makes `arr[i]` yield `T | undefined`, catching the classic "indexed past the end" bug that `strict` alone misses. (Why it's not in `strict`, and the tradeoffs, are glossary-depth.)

## Modules: import/export

TS uses ES modules, not Python's `import`. Quick map:

:::compare
```python
# mod.py
def helper(): ...
PI = 3.14

# other.py
from mod import helper, PI
import mod
from mod import helper as h
```
```typescript
// mod.ts
export function helper() {}
export const PI = 3.14;
export default class Main {}      // one default per module

// other.ts
import { helper, PI } from "./mod";
import { helper as h } from "./mod";
import Main from "./mod";          // default import (no braces)
import * as mod from "./mod";      // namespace import
```
:::

Key differences: **named imports use braces** `{ }`; there's a **`default` export** concept (no Python equivalent — it's the "main thing"); paths are relative with `./` and (in many configs) **no file extension** or `.js` even for `.ts` files. `import type { User } from "./types"` imports only the type (erased), useful to avoid runtime imports.

## .d.ts files and @types

A `.d.ts` is a **declaration file** — types with no implementation, describing the shape of JS code. It's exactly Python's **`.pyi` stub**. When you use a plain-JS library, its types often live in a separate package under the `@types/` scope (the DefinitelyTyped repo), like `types-requests` on PyPI.

```bash
bun add lodash          # the JS library (runtime code)
bun add -d @types/lodash # its type stubs (.d.ts), dev-only
```

Modern libraries ship their own `.d.ts` and need no `@types`. If you ever see "Could not find a declaration file for module 'x'," that's the missing-stub situation — install `@types/x` or write a small `declare module "x";`.

## Recap

- **`any` off, `unknown` on.** `any` disables and spreads; `unknown` forces narrowing.
- `as` is an unchecked compile-time override (≈ `cast`), **not** a runtime conversion.
- Use `===`/`!==` always; `[]` and `{}` are **truthy** in JS (unlike Python).
- Objects compare by identity; no `__eq__`/operator overloading.
- `tsconfig`: keep `strict`; add `noUncheckedIndexedAccess`. `noEmitOnError` to block bad builds.
- ES modules: braces for named imports, a `default` export, `import type` for erased imports.
- `.d.ts` ≈ `.pyi`; `@types/x` ≈ a stubs package on PyPI.

:::quiz
You parse untrusted JSON and want the safest handling. What's wrong with each, and what's the right shape?

```typescript
const a = JSON.parse(s) as User;          // (A)
const b: any = JSON.parse(s);             // (B)
```
:::answer
- **(A)** uses `as User` — an **unchecked assertion**. `JSON.parse` returns whatever was in the string; `as` performs no validation, so malformed data is silently treated as a `User` and blows up later (`b.name.toUpperCase()` on missing `name`).
- **(B)** uses `any`, which **disables all checking** and spreads — every downstream use of `b` is unprotected.

The right shape: type the parse as **`unknown`**, then **validate/narrow** before use — ideally with a runtime schema validator:

```typescript
const raw: unknown = JSON.parse(s);
if (isUser(raw)) {          // custom guard from Lesson 08, or:
  // use raw as User safely
}
// or, in real apps:  const user = UserSchema.parse(raw); // e.g. Zod
```

`unknown` forces you to prove the shape; `as`/`any` let you skip the proof and pay at runtime. This ties the whole course together: types are erased (Lesson 01), so trust at the boundary must be *earned* with a runtime check, not asserted.
:::
