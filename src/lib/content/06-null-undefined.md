---
title: null vs undefined
subtitle: Two empty values where Python has one None, and the strict null safety that tracks them
---

## The two unions you write most

Lesson 05 introduced `A | B` as the way to say a value is one of several shapes, and discriminated unions as the way to model a value that changes shape over its lifetime. The two unions you'll write more than any other are smaller than those examples and easy to overlook: `T | null` and `T | undefined`. They're how TypeScript models absence, and under `strict` they aren't optional decorations — the compiler forces them on you wherever a value might not be there.

There's a wrinkle Python doesn't prepare you for. Python has exactly one empty value, `None`, and you reach for it whether something was never set, was deliberately cleared, or is missing from a dict. JavaScript has two, `null` and `undefined`, and TypeScript models both because the runtime distinguishes them. Most early confusion about TypeScript's null handling is really confusion about which of the two you have and where each comes from, so that's where to start.

## Where each empty comes from

The split isn't arbitrary. `undefined` is what JavaScript produces on its own when a value is absent; `null` is what a human or an API produces on purpose. That single distinction explains every case you'll meet.

:::quiz
Three bindings. For each, what's the value at runtime, and is it `null`, `undefined`, or an error?

```typescript
let a;                                    // declared, never assigned
const d: Record<string, number> = {};
const b = d["missing"];                   // key not present
function f(x: number) { return x; }       // f() called with no args, elsewhere
```
:::answer
`a` is `undefined` — a declared-but-unassigned binding holds `undefined`, never `null`. `b` is `undefined` — reading a missing property returns `undefined` rather than raising the way a Python `dict` raises `KeyError` (the `[]` access here behaves like `dict.get`, not `dict[]`). Calling `f()` with no argument binds the parameter to `undefined`. None of these is a runtime error, and none is `null`. The pattern: JavaScript reaches for `undefined` whenever something is absent — unassigned variable, missing property, omitted argument, a function with no `return`. You get `null` only when code explicitly writes it.
:::

So the convention, which the whole ecosystem follows, is mechanical rather than stylistic:

| | what it conventionally means | how you actually get it |
|---|---|---|
| `undefined` | "never set" — absence the engine produced | unassigned variable, missing property, omitted argument, a `return;` with no value |
| `null` | "set to empty" — absence a human produced | someone wrote `= null`; a JSON payload or DOM API handed it to you |

The practical guidance falls out of the table. Default to `undefined` for "this might be absent," because that's what the language already produces for you and what `?` (below) generates. Use `null` only when an external contract forces it — a JSON body that contains `null`, a DOM method like `getElementById` that returns `null` on a miss, a database driver that maps SQL `NULL` to `null`. You don't have to choose a philosophy; you match what's already there.

:::compare
```python
x = None              # the one and only empty

d = {}
d.get("missing")      # -> None
```
```typescript
let x;                // undefined (engine-produced absence)
let y = null;         // null (you wrote it)

const d: Record<string, number> = {};
d["missing"];         // undefined (missing property)
```
:::

The analogy to `None` is close enough to be useful and wrong in one place worth naming: `None` is a genuine singleton object with a type (`type(None) is NoneType`), and `x is None` is an identity check against that object. `undefined` is not an object — `typeof undefined` is the primitive string `"undefined"`, and there is nothing to take the identity of. `null` is closer to a sentinel value but is still a primitive, not an instance of anything. The runtime check you'll write for either is value equality, not identity, and the idiom is `x == null`, which — by the one defensible use of loose [[equality|coercion]] — matches both `null` and `undefined` at once.

## strictNullChecks: every type is non-null by default

This is the payoff Lesson 01 was pointing at when it insisted on `strict: true`. The flag in play is `strictNullChecks`, which `strict` turns on. With it, `null` and `undefined` leave the domain of every type unless you put them back. `string` means a string and nothing else; to allow absence you widen the type into a union yourself.

```typescript
let title: string = null;          // error TS2322: Type 'null' is not assignable to type 'string'
let title2: string | null = null;  // ok — you declared it nullable
```

This inverts the Python default you carry in. In Python, `def find(id: int) -> User` will happily `return None` at runtime — the annotation is a no-op. Whether anything complains is up to [[mypy]], and even there the check is recent: `strict_optional` is on by default in current [[mypy]], but for years it was opt-in, and the language itself still treats `None` as assignable to anything. TypeScript leaves no such gap: non-null is the default and optionality is what you opt into. A function annotated `: User` cannot return `undefined`; if it might, its return type is `User | undefined`, and the compiler — not a separate linter you may or may not run — flags every path that violates it until you say so.

```typescript
function find(id: number): User | undefined {
  return id > 0 ? { name: "Ada" } : undefined;
}
```

The compiler then tracks that nullability through every path the value takes, and refuses to let you use it as a `User` until you've ruled out the empty case.

```typescript
function greet(u: User | undefined): void {
  console.log(u.name);   // error TS18048: 'u' is possibly 'undefined'
  if (u) {
    console.log(u.name); // ok — inside the guard, u's type is just User
  }
}
```

Inside `if (u)`, `u` is no longer `User | undefined`; the compiler has removed `undefined` from its type for the rest of the block, because reaching that line proves `u` was truthy. Shrinking a type as control flow proves things about it is [[narrowing]], and it's the engine behind every safe null access you'll write. It runs far deeper than one `if` — that's the whole of Lesson 08 — but here it's enough to see that the guard converts a `possibly undefined` value into a usable one.

This is the type-level cure for the error you've spent years pattern-matching against: `AttributeError: 'NoneType' object has no attribute ...`. The TypeScript equivalent can't reach runtime — the access doesn't compile until you've handled the empty case.

## `?` — optional, and how it differs from `| undefined`

You'll mark most absence with `?`, on properties and on parameters. It reads as "this might not be here," and it's nearly shorthand for `| undefined` — but the gap between the two is real, and conflating them produces errors that read as nonsense until you see the distinction.

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
  nickname?: string;   // optional: the key itself may be absent
}

function greet(name: string, title?: string): void {}
```
:::

The distinction is about presence, not just value. On a property, `nickname?: string` means the key may be missing entirely; `nickname: string | undefined` means the key must be present but its value may be `undefined`:

```typescript
interface A { x: string | undefined }   // key REQUIRED
interface B { x?: string }               // key OPTIONAL

const a: A = {};   // error TS2741: Property 'x' is missing in type '{}' but required in type 'A'
const b: B = {};   // ok
```

The same split appears on parameters, where it controls whether the argument can be omitted at the call site rather than whether a key exists:

```typescript
function p1(x?: number): void {}              // optional parameter
function p2(x: number | undefined): void {}   // required parameter, may be undefined

p1();            // ok — argument omitted
p2();            // error TS2554: Expected 1 arguments, but got 0
p2(undefined);   // ok — you must pass something, even if it's undefined
```

Python's `Optional[X]` is plainly `X | None` — a statement about the *value*, never about whether the key or argument is present. For parameters, `title: str | None = None` couples the optional value to a default, so omitting the argument and passing `None` are the same call. TypeScript separates those: `?` governs presence, the union governs value, and a default is a third, independent thing. The closest Python analogue to "the key may be absent" is `TypedDict` with `total=False`, and even that doesn't generalize to parameters the way `?` does.

One nuance you'll eventually hit: whether `nickname: undefined` (key present, value `undefined`) is interchangeable with omitting the key depends on the `exactOptionalPropertyTypes` flag. It's off in this course's default config and in most projects, so `?` is treated as exactly `| undefined` and supplying `undefined` is allowed. Turn it on and `?` means strictly "absent," distinct from "present and `undefined`" — useful when you care about the difference between a field being unset and being cleared.

:::quiz
Recall Lesson 03's "has at least" rule. Given `interface User { name: string; nickname?: string }`, is `const u: User = { name: "Ada" }` valid? What about `{ name: "Ada", nickname: undefined }`?
:::answer
Both are valid. "Assignable to `User`" means "has at least every *required* member," and `?` makes `nickname` not required, so `{ name: "Ada" }` qualifies. `{ name: "Ada", nickname: undefined }` is also fine, because with `exactOptionalPropertyTypes` off (the default) `nickname?: string` is exactly `string | undefined`, and `undefined` is a legal value for it. The two objects differ only at runtime, and only to one operator: `"nickname" in u` is `false` for the first and `true` for the second. That's the same key-presence subtlety as the excess-property corner in Lesson 03 — the type says they're interchangeable; `in` can still tell them apart.
:::

## A sharper edge: `noUncheckedIndexedAccess`

The earlier quiz noted that reading a missing key returns `undefined` at runtime. By default, the *type* lies about this: `d["missing"]` on a `Record<string, number>` is typed `number`, even though the runtime value is `undefined`. That's a deliberate hole — checking every index access for absence would be noisy — but it's exactly the hole that produces `undefined` flowing where a `number` was promised.

This course's Playground enables `noUncheckedIndexedAccess`, which closes it: every index access into a record or array yields `T | undefined` instead of `T`, forcing you to acknowledge that the key or element might not be there.

```typescript
const scores: Record<string, number> = { ada: 9 };
const s = scores["ada"];   // type: number | undefined  (with noUncheckedIndexedAccess)
const doubled = s * 2;     // error TS18048: 's' is possibly 'undefined'
const safe = (s ?? 0) * 2; // ok
```

It's not part of `strict`, so you opt in separately, and it's worth it: it's the difference between the type system knowing what JavaScript actually does at the boundary of a collection and pretending the boundary doesn't exist. The Python instinct that `d[k]` either returns a value or raises does not transfer — JS returns `undefined`, silently, and this flag is what makes the type reflect that.

## The operators for handling absence

Once a value's type includes `null` or `undefined`, you need to read through it safely. Three operators do almost all of the work, and a fourth is the trap you carry over from Python.

```typescript
// ?.  optional chaining — short-circuits the rest of the chain to undefined
//     the instant the left side is null or undefined
const city = user?.address?.city;   // string | undefined; no access happens if user/address absent

// ??  nullish coalescing — supplies a fallback for null/undefined ONLY
const port = config.port ?? 3000;   // a configured 0 stays 0; only absence becomes 3000

// !   non-null assertion — asserts "not null/undefined" to the compiler, erased at runtime
const el = document.getElementById("x")!;  // HTMLElement, not HTMLElement | null

// ||  logical OR — falls back on ANY falsy value (the carried-over footgun)
const p2 = config.port || 3000;     // a configured 0 becomes 3000 — usually a bug
```

Optional chaining is more than `a && a.b`. It short-circuits the *entire* remaining chain — including calls and index access — the moment the left operand is `null` or `undefined`, and the result type is widened with `undefined`:

```typescript
const n = user?.getName?.();   // string | undefined — the call doesn't happen if user or getName is absent
const first = list?.[0];        // T | undefined — the index access is skipped if list is absent
```

The Python equivalent, `user and user.address and user.address.city`, works but leaks: if `user` is `0` or `""` it returns that falsy value rather than continuing, because `and` keys off truthiness, not absence. Optional chaining keys off `null`/`undefined` specifically, so a falsy-but-present value like `0` flows through normally.

That same distinction is the whole story of `??` versus `||`:

:::compare diff
```python
# fallback with `or`: triggers on ANY falsy value
port = config.get("port") or 3000   # a stored 0 becomes 3000

# to fall back only on absence you must be explicit:
port = config.get("port")
port = 3000 if port is None else port
```
```typescript
const port = config.port ?? 3000;   // 0 and "" are preserved
const portFalsy = config.port || 3000; // 0 and "" become 3000
```
:::

Python's `or` falls back on `0`, `""`, `[]`, `{}` — every falsy value — and so does JavaScript's `||`. `??` was added to the language precisely to fall back on `null` and `undefined` *only*, leaving `0` and `""` intact. The reflex "use `or` for defaults" is direct negative transfer from Python: it carries the bug with it. Default to `??` for "use this if absent," and reach for `||` only when you genuinely want every falsy value to trigger the fallback.

One syntactic guardrail follows from how easily the two are confused: TypeScript won't let you mix `??` with `||` or `&&` in the same expression without parentheses (`a ?? b || c` is a parse error, TS5076), because the intended precedence is ambiguous and the wrong reading is a silent bug. You're forced to group it explicitly.

:::play
```typescript
function volumeWith(op: "??" | "||", v: number | null): number {
  return op === "??" ? (v ?? 50) : (v || 50);
}

// A user deliberately muted their volume to 0:
console.log("?? gives", volumeWith("??", 0)); // 0  — the mute is preserved
console.log("|| gives", volumeWith("||", 0)); // 50 — the mute is silently lost
console.log("absent  :", volumeWith("??", null), volumeWith("||", null)); // 50 50 — agree only here
```
:::

## `!` asserts; it does not check

The non-null assertion `!` tells the compiler a value isn't `null` or `undefined`, and the compiler believes you and removes those from the type. It is [[erased|type-erasure]] like every other type construct, so it inserts no runtime check. If you're wrong, nothing intervenes — the `undefined` flows downstream and crashes at the first property access, exactly the failure `strictNullChecks` existed to prevent, now reintroduced by hand.

```typescript
const el = document.getElementById("missing")!;  // typed HTMLElement
el.classList.add("x");  // compiles cleanly; throws at runtime if the element wasn't found
                        // TypeError: Cannot read properties of null (reading 'classList')
```

The honest Python analogue is `# type: ignore` on the line, or a bare `cast(User, x)`: you're overriding the checker's judgment with your own, and you own the consequences. It's occasionally the right call — a value you initialize lazily, an invariant the type system can't express — but it's a debt, not a fix. A real guard (`if (el)`) or a fallback (`?? defaultEl`) keeps the check; `!` deletes it. When you find yourself reaching for `!`, the question to ask is whether you actually know the value is present or are merely tired of the error.

## `void` is not `undefined`

One last distinction, because `void` looks like a synonym for `undefined` and isn't. A return type of `void` doesn't mean "returns `undefined`" — it means "the caller will ignore the return value." The two differ in one direction: a function typed `() => void` is allowed to return an actual value, and that value is simply discarded by anyone using the type.

:::predict
`Array.prototype.forEach` types its callback as `(value: T) => void`. The arrow below returns a `number`. Does it type-check?
:::answer
Yes. `void` as a return type is a promise about how the caller treats the result, not a constraint on what the callback produces, so TypeScript accepts a callback that returns a value and discards it.
:::

```typescript
const nums = [1, 2, 3];
const out: number[] = [];
nums.forEach((n) => out.push(n));  // ok, even though Array.push returns a number
```

`Array.prototype.forEach` types its callback as `(value: T, ...) => void`. The arrow returns `out.push(n)`, which is a `number`, and TypeScript accepts it anyway, because `void` is a promise about how the *caller* treats the result, not a constraint on what the callback produces. If `void` meant `undefined`, that callback wouldn't type-check, and every `forEach` over `push` would be an error. The reasoning behind this asymmetry — and what it implies for assigning function types to each other — is Lesson 09; the takeaway now is that `void` and `undefined` are not interchangeable.

## Recap

- Two empties, and the split is mechanical: `undefined` is the absence JavaScript produces (unassigned, missing property, omitted argument, no `return`); `null` is the absence a human or API writes. Default to `undefined`; use `null` only where a contract demands it.
- `strictNullChecks` makes every type non-null by default; absence must be declared with `| null`, `| undefined`, or `?`. This inverts Python, where optionality is opt-in.
- The compiler tracks nullability through control flow and won't let you use a possibly-empty value until a guard has ruled the empty case out — the type-level cure for `NoneType` attribute errors.
- `?` governs *presence* (of a key, of an argument); a union governs *value*. They coincide only with `exactOptionalPropertyTypes` off.
- `?.` short-circuits a whole chain on absence; `??` falls back on absence only; `!` asserts non-null with no runtime check. Prefer `??` over `||`, which fires on every falsy value the way Python's `or` does.
- `void` is "ignore my return," not "returns `undefined`" — a `() => void` may return a value.

:::predict
A user sets `volume` to `0` to mute. One of these silently resets them to `50`. Which, and why?

```typescript
const volume = settings.volume || 50;   // (A)
const volume = settings.volume ?? 50;    // (B)
```

- (x) (A) — `0` is falsy, so `0 || 50` is `50`; the deliberate mute is lost.
- ( ) (B) — `0 ?? 50` is `50`, so the mute is lost.
- ( ) Both reset it, identically.
- ( ) Neither — `0` survives both operators.
:::answer
(A) breaks it. `||` falls back on any falsy value, and `0` is falsy, so `0 || 50` evaluates to `50` and the user's deliberate mute is overwritten. (B) is correct: `??` falls back only on `null`/`undefined`, so `0 ?? 50` is `0` and the mute survives. This is the most common `||`-versus-`??` bug, and it's the exact same trap as defaulting with Python's `or` — the negative transfer is real, which is why `??` is the default to reach for.
:::

Nullability is one axis the compiler tracks across a type, and the operators above are the tools for one specific shape of value. But notice what `find` had to do: it returned `User | undefined`, with the type baked in. What about a function that should preserve *whatever* type it's handed — a `first` that returns the element type of any array, or an `identity` that returns its argument unchanged — and stay null-correct for all of them at once? That requires writing code over a type you don't know yet. That's Lesson 07: generics, the `<T>` you've reached for in Python as `TypeVar`, and where TypeScript's inference takes it further than you'd expect.
