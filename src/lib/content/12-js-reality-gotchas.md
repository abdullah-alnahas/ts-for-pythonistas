---
title: The JS reality layer & gotchas
subtitle: What erasure leaves behind — any vs unknown, assertions, and the JavaScript runtime the types sit on top of
---

Lesson 11's type-level machinery — every [[conditional|conditional-types]], [[mapped|mapped-types]], and computed type — vanishes the instant `tsc` finishes, the same [[erasure|type-erasure]] Lesson 01 established for ordinary annotations. This lesson is what that [[erasure|type-erasure]] leaves behind. Once the types are gone, what runs is plain JavaScript, and JavaScript has its own rules — for equality, for truthiness, for what an object *is* at runtime — that the type layer sits on top of but does not change. Most of the surprises a Python developer hits in their first month of TypeScript are not type-system surprises at all; they are JavaScript leaking through. So this is two lessons braided together: the type system's own escape hatches (`any`, `unknown`, `as`), which decide how much you can trust the compiler, and the runtime semantics underneath (`===`, falsy values, object identity), which decide what happens when the compiler is no longer watching. The two meet at the boundary where outside data enters your program, which is where the lesson — and the course — ends.

## The two top types: `any` and `unknown`

You parse a request body; what type is the result, and how much does the compiler then trust you? TypeScript has two answers — two types that every other type is assignable to, two "tops." They look similar and behave as opposites, and choosing between them is the single most consequential type decision you make routinely.

`any` is an escape hatch from the type system. A value typed `any` accepts every operation — call it, index it, add to it, assign it anywhere — because the checker stops having an opinion. `unknown` is the disciplined version of the same idea: it also holds any value, but it permits *no* operation until you [[narrow|narrowing]] it to something specific.

:::compare
```python
from typing import Any

def f(x: Any):
    x.whatever()      # mypy: allowed, no check
    return x + 1      # allowed
# `object` is the closest "safe" type, but it's
# narrower than TS's unknown: it excludes nothing
# at runtime yet forbids most operations.
```
```typescript
function f(x: any) {
  x.whatever();       // allowed — checker is off
  return x + 1;       // allowed
}

function g(x: unknown) {
  x.whatever();       // error: 'x' is of type 'unknown'
  if (typeof x === "number") return x + 1; // ok after guard
  return 0;
}
```
:::

The Python analogy is close but not exact. `Any` is genuinely TypeScript's `any`: an opt-out that propagates. `unknown` has no clean equivalent. `object` is the usual reach — it does forbid attribute access the way `unknown` forbids operations — but `object` is a real type in the runtime hierarchy with members of its own (`__class__`, `__hash__`), whereas `unknown` is a pure type-system construct that [[erases|type-erasure]] to nothing. The practical difference: you [[narrow|narrowing]] an `object` with `isinstance` against runtime classes, while you narrow an `unknown` with the JavaScript-level checks that survive [[erasure|type-erasure]] (`typeof`, `in`, `instanceof` on real constructors), exactly as in Lesson 08.

The reason to care is what `any` does to the code *around* it, not just the value itself. `any` is contagious: any expression that touches an `any` becomes `any`, and it spreads outward with no diagnostic to mark where.

```typescript
function h(x: any) {
  const y = x.foo;       // y: any
  const z: string = y;   // accepted — y is any, so no check here
  return z.toUpperCase(); // "safe" by the types, may throw at runtime
}
```

Nothing on those three lines is flagged, yet `z` could be a number at runtime and `.toUpperCase()` will throw. That is the cost: a single `any` doesn't disable checking for one value, it disables checking for everything that value flows into. `unknown` inverts the default — it refuses every operation, so the only way forward is to [[narrow|narrowing]], which is precisely the act of telling the compiler what you actually have. Use `unknown` for genuinely unidentified input — parsed JSON, data off the network, the binding in a `catch` — and let it force the check.

That last case is worth pinning down, because it changed and the behavior depends on `strict`:

```typescript
try {
  risky();
} catch (e) {           // e: unknown  (because strict enables useUnknownInCatchVariables)
  if (e instanceof Error) console.log(e.message);
  else console.log(String(e));
}
```

Without `useUnknownInCatchVariables`, `e` is typed `any`, and code reaches straight for `e.message` — wrong, because anything can be thrown in JavaScript, not just `Error` instances (`throw "boom"` and `throw { code: 42 }` are both legal). Typing the binding `unknown` forces you to handle the case where what was thrown isn't an `Error` at all. Python imposes the same discipline by making you name the exception class in `except`; here the binding starts maximally untrusted and you earn the narrowing.

:::quiz
You receive `x: unknown` and want `x.toUpperCase()`. Why does the compiler reject the call outright, and what is the minimal fix?
:::answer
Because `unknown` is the *safe* top type: it stands for "any value, identity not yet established," and `.toUpperCase()` is valid only on strings. The compiler has no evidence `x` is a string, so it refuses — that refusal is the entire reason to prefer `unknown` over `any`. The minimal fix is to narrow (Lesson 08):

```typescript
if (typeof x === "string") return x.toUpperCase();
```

`any` would have accepted `x.toUpperCase()` with no complaint and thrown at runtime if `x` were a number. `unknown` converts that latent runtime crash into a compile-time requirement to prove the type first.
:::

## Type assertions: `as`

Narrowing is how you *earn* a more specific type. A type assertion is how you *claim* one without earning it. `x as T` tells the compiler "treat this expression as a `T`," and it complies — it adjusts the static type and emits no check. Nothing is converted or validated; `as` is [[erased|type-erasure]] with every other type.

```typescript
const el = document.getElementById("app") as HTMLCanvasElement;
const user = JSON.parse(str) as User;   // no validation occurs
```

The first line is the common honest case: `getElementById` returns `HTMLElement | null`, and you happen to know that element is a canvas — knowledge the compiler can't derive from the string `"app"`. The second line is the common dangerous case: `JSON.parse` returns `any`, you assert it's a `User`, and if the JSON is missing `name`, nothing complains until `user.name.toUpperCase()` throws three function calls away. The assertion didn't make the data a `User`; it made the compiler stop asking.

The closest Python analog is `typing.cast` — and the resemblance is exact, including the danger. `typing.cast(User, x)` also performs no runtime check; it only tells the type checker to believe you. What `as` is decidedly *not* is `int(x)` or `str(x)`. Those are runtime conversions that produce new values; `as` produces nothing at runtime. When you actually need to convert, you call a function — `Number(x)`, `String(x)`, `JSON.parse(s)` — the same as Python, just without a [[coercion]] operator dressed up to look like one.

TypeScript does put one guard rail on `as`: it refuses an assertion between types with no overlap.

```typescript
const s = "5";
const n = s as number;            // error: conversion of 'string' to 'number' may be a mistake
const n2 = s as unknown as number; // compiles — the double assertion
```

The single assertion is blocked because `string` and `number` share no values, so the claim is almost certainly a bug. The double assertion routes through `unknown` (which overlaps everything) to launder the conversion past that check. Seeing `as unknown as T` in code is a signal: someone forced a value past the compiler's last objection, and they had better be right, because every safety net is now removed.

So the rule is: prefer narrowing or a real validator over `as`, and reserve `as` for the two cases where it's legitimate — asserting a more specific type after you've actually checked (or hold knowledge the compiler can't), and the `as const` literal-freeze from Lesson 11, which is a different operation entirely (it tells the compiler to infer the narrowest literal types, not to override them).

## Two equalities: `==` and `===`

That covers how much you can trust the type layer. The rest of the lesson is about the runtime underneath it, and the first trap is equality. JavaScript has two equality operators, and they are not "loose" and "strict" versions of the same comparison — they run different algorithms.

`===` (strict equality) compares without conversion: if the operands differ in type, the result is `false`, full stop. `==` (loose equality) runs the [[Abstract Equality algorithm|coercion]] — when the types differ it [[coerces|coercion]] one operand toward the other and compares the results, which produces a catalog of surprises. This is pure negative transfer for a Python developer, because Python's `==` does *not* [[coerce|coercion]] across unrelated types: `"" == 0` is `False` in Python and `true` in JavaScript.

:::play
```typescript
console.log("0 == ''        ", 0 == "");           // true  — "" coerces to 0
console.log("0 == '0'       ", 0 == "0");           // true  — "0" coerces to 0
console.log("null == undef  ", null == undefined);  // true  — the one defensible ==
console.log("[] == false    ", [] == false);        // true  — [] -> "" -> 0; false -> 0
console.log("[] == ![]      ", [] == ![]);           // true  — array equals its own negation
console.log("1 === '1'      ", 1 === "1");           // false — === never coerces
```
:::

The `[] == ![]` line is the one usually trotted out to prove the algorithm is unhinged: `![]` is `false` (because `[]` is truthy, more on that next), `false` coerces to `0`, `[]` coerces through `""` to `0`, and `0 == 0` is `true`. You never need to memorize the steps. You need exactly one rule: **use `===` and `!==` everywhere.** It removes the entire category.

For primitives, `===` is what Python's `==` does for the common cases — value comparison with no surprises. The one place the analogy needs care is objects, which we'll get to. The single sanctioned exception to "always `===`" is `x == null`, which is `true` for both `null` and `undefined` and nothing else — a deliberately useful [[coercion]] for collapsing the two empty values into one check (Lesson 06). Everywhere else, the loose operator buys you nothing.

## Falsy values, and why `if (arr)` lies

The equality trap you can avoid with a lint rule. This next one is subtler, because the code looks correct and runs without error — it just does the wrong thing. It is the highest-value correction a Python developer can make.

In Python, the empty containers are falsy: `[]`, `{}`, `""`, `0`, `None` are all false in a boolean context, which is why `if not items:` is the idiomatic empty-collection check. JavaScript's falsy set is fixed and shorter — only `false`, `0`, `""` (and `0n`, `NaN`), `null`, and `undefined` are falsy. Everything else is truthy, and "everything else" includes every object and every array, *including the empty ones*.

:::predict
`if not items:` is your reflex empty-list check in Python. Port it to JavaScript as `if (!items)`. What does `Boolean([])` return — is an empty array truthy or falsy?

```typescript
Boolean([]);   // an empty array — truthy or falsy?
```

- (x) `true` — an empty array is truthy in JavaScript.
- ( ) `false` — like Python, an empty collection is falsy.
:::answer
`true`. An empty array is truthy, and so is an empty object — `Boolean({})` is also `true`. The reason is mechanical: JavaScript's truthiness test asks only whether a value is in the fixed falsy set, and that set contains no objects at all. An array is an object; an object is never falsy regardless of contents. So `if (items)` is `true` even when `items` is `[]`, and the empty-collection check you wrote from Python muscle memory silently passes when it should fail.
:::

The fix is to check the thing you actually mean. Length for arrays and strings, key count for plain objects — not bare truthiness:

:::compare run
```python
items = []
if not items:          # empty list is falsy — correct in Python
    print("empty")
```
```typescript
const items: number[] = [];
if (items) console.log("(items) is truthy — the Python reflex misfires");
if (items.length === 0) console.log("empty — the check you meant");
```
:::

Why does JavaScript draw the line here and Python there? Because Python lets a type define its own truthiness through `__bool__` (falling back to `__len__`), so a list *chooses* to be falsy when empty — truthiness is part of the object protocol. JavaScript has no such hook: truthiness is a fixed function of the value's type, decided by the language, not the object. There is nowhere to put "empty means false," so it isn't there — and for the same reason, no custom object can ever be falsy.

## Object equality and the missing `__eq__`

Objects raise the second half of the equality story. In Python, `==` on objects dispatches to `__eq__`, so two distinct dataclass instances with the same fields compare equal, while `is` checks identity. JavaScript has only identity. `===` on two objects is `true` only when they are the *same* object — the same reference — and there is no `__eq__` to override, because there is no operator overloading in the language at all.

:::predict
Two objects `a` and `b` hold identical fields. Given Python's `__eq__` reflex, predict what `a === b` yields.
:::answer
`false`. `===` compares references, not fields; `a` and `b` are distinct objects, so the result is `false` regardless of contents.
:::

```typescript
const a = { v: 1 };
const b = { v: 1 };
a === b;   // false — different objects, same contents
a === a;   // true  — same reference
```

So `===` on objects is Python's `is`, not Python's `==`, and TypeScript gives you no way to change that — the [[structural|structural-typing]] type system makes `a` and `b` the *same type*, but says nothing about runtime equality, which is a separate question the language answers by reference. When you need value equality you write it: compare fields by hand, or reach for a library. (For copying rather than comparing, `structuredClone(a)` deep-clones; there is no built-in deep *equality*.) This is one of the sharper edges for a Python developer, because the type checker confirms the shapes match and then the runtime compares them by identity anyway.

## tsconfig settings worth knowing

`strict: true` (Lesson 01) is the one setting that decides whether the type system is worth having; it bundles a family of checks including null safety and the ban on implicit `any`. A few others are worth knowing by name, because they change the types you see day to day:

| Option | Effect |
|---|---|
| `strict` | turns on the whole strict family — keep it on |
| `noUncheckedIndexedAccess` | makes `arr[i]` and `obj[key]` yield `T \| undefined` — not included in `strict` |
| `target` | which JavaScript version `tsc` emits (`ES2022`, …) |
| `module` / `moduleResolution` | how imports resolve (`bundler` for most modern setups) |
| `lib` | which built-in APIs the types know about (`DOM`, `ES2023`, …) |
| `noEmitOnError` | refuse to emit JavaScript when the type-check fails (Lesson 01) |

The one to add deliberately is `noUncheckedIndexedAccess`. With `strict` alone, `arr[i]` is typed `T` no matter what `i` is — so reading past the end of an array gives you `undefined` at runtime while the compiler still believes you hold a `T`:

```typescript
const arr = [1, 2, 3];
const x: number = arr[10]; // compiles under plain strict; x is undefined at runtime
// arr[10] is undefined; arr[10].toFixed() -> TypeError: Cannot read properties of undefined
```

Turn the flag on and `arr[i]` becomes `number | undefined`, forcing you to handle the out-of-bounds case the same way null safety forces you to handle the missing value:

```typescript
// with noUncheckedIndexedAccess on, arr[10] is number | undefined
const v = arr[10];
if (v !== undefined) v.toFixed(); // the guard the flag now requires
```

It is left out of `strict` because it is genuinely noisy — every indexed access in existing code suddenly needs a guard — and the TypeScript team keeps `strict` to checks that pay for themselves everywhere. For new code, the safety is worth the noise.

## Modules: import and export

`strict` and friends configure the checker; the next thing you'll meet daily is how files reference each other, and it is not Python's `import`. TypeScript uses ES modules, where what crosses a file boundary is decided explicitly by `export`, not by what happens to be a top-level name.

:::compare
```python
# mod.py
def helper(): ...
PI = 3.14

# other.py
from mod import helper, PI
from mod import helper as h
import mod
```
```typescript
// mod.ts
export function helper() {}
export const PI = 3.14;
export default class Main {}   // at most one default per module

// other.ts
import { helper, PI } from "./mod";
import { helper as h } from "./mod";
import Main from "./mod";        // default import — no braces
import * as mod from "./mod";    // namespace import
```
:::

Three differences carry most of the friction. Named imports take braces — `import { helper }`, not `import helper` — and getting that wrong silently imports the *default* instead, a confusion worth recognizing on sight. The `default` export has no Python equivalent: it's the module's designated "main thing," imported without braces under any name you choose, where Python has only named bindings. And paths are relative, written with a leading `./`, usually with no file extension — `from "./mod"` resolves `mod.ts`. Where the analogy holds cleanly: a namespace import (`import * as mod`) is Python's `import mod`, and an aliased import (`{ helper as h }`) is `from mod import helper as h` exactly.

One module form is type-system-specific: `import type`.

```typescript
import type { User } from "./types";  // erased entirely — no runtime import emitted
```

Because types are [[erased|type-erasure]], importing one purely for annotations leaves a dangling runtime `import` of a module you never actually use at runtime. `import type` tells the compiler the import is types-only, so it's dropped from the emitted JavaScript. Python has no need for this — its `import` always runs — though the closest cousin is putting an import under `if TYPE_CHECKING:` to avoid a runtime (often circular) import, which is exactly the problem `import type` solves.

## `.d.ts` files and `@types`

The last piece of plumbing is what happens when you import a library that was written in plain JavaScript and ships no types. The answer is a *declaration file* — a `.d.ts`, which contains type signatures and no implementation, describing the shape of code that lives elsewhere. It is precisely Python's `.pyi` stub: types divorced from the runtime they annotate.

When a JavaScript library has no built-in types, its declarations usually live in a separate package under the `@types/` scope, published from the community-maintained DefinitelyTyped repository. This is the same arrangement as `types-requests` on PyPI shipping stubs for `requests`:

```bash
bun add lodash             # the library — runtime code
bun add -d @types/lodash   # its declarations (.d.ts) — dev dependency only
```

The `@types` package is a dev dependency because it disappears at build time along with everything else type-shaped. Most modern libraries bundle their own `.d.ts` and need no separate `@types` install. When you do hit *"Could not find a declaration file for module 'x'"*, that's the missing-stub case: install `@types/x` if it exists, or write a one-line `declare module "x";` to tell the compiler the module exists with an `any`-typed shape — the deliberate, scoped use of the very escape hatch this lesson opened with.

## Where it all converges: the boundary

Every thread here meets at one place. Types are [[erased|type-erasure]] (Lesson 01), so the compiler knows nothing about a value the moment it arrives from outside the program — a request body, a parsed file, an environment variable. There was no source for `tsc` to read, so there's no type to trust. That is exactly the boundary where `any`, `unknown`, and `as` stop being abstract.

:::quiz
You parse untrusted JSON and want the safest possible handling. What is wrong with each of these, and what is the right shape?

```typescript
const a = JSON.parse(s) as User;   // (A)
const b: any = JSON.parse(s);      // (B)
```
:::answer
- **(A)** asserts the result is a `User`. `JSON.parse` returns `any` and the data is whatever the string held; `as` performs no validation, so a body missing `name` is treated as a `User` and crashes later at `a.name.toUpperCase()`. The assertion silenced the compiler without checking anything.
- **(B)** types it `any`, which disables checking *and spreads* — every downstream use of `b` is unprotected, with no diagnostic at any step.

The right shape types the parse as `unknown`, then proves the type before use — ideally with a runtime schema validator:

```typescript
const raw: unknown = JSON.parse(s);
if (isUser(raw)) {            // a hand-written guard from Lesson 08…
  console.log(raw.name.toUpperCase());
}
// …or, in real code:  const user = UserSchema.parse(raw); // e.g. Zod
```

`unknown` makes you earn the type; `as` and `any` let you skip the proof and pay at runtime. This is the whole course in one example: the compiler checks everything whose shape is known when you write it, and at the boundary — where [[erasure|type-erasure]] means it knows nothing — trust has to be re-established with a runtime check, not asserted.
:::

## Recap

- The two top types: `any` switches the checker off and is contagious — anything it touches becomes `any`. `unknown` holds any value but forbids every operation until you [[narrow|narrowing]]. Default to `unknown` for outside data; under `strict`, even a `catch` binding is `unknown`.
- A type assertion (`as`) is an unchecked compile-time claim (≈ `typing.cast`), [[erased|type-erasure]] like every type. It converts nothing. `as unknown as T` is a forced conversion and a smell.
- Use `===`/`!==` everywhere; `==` runs the [[coercion]] algorithm. The only defensible loose check is `x == null`.
- JavaScript's falsy set is fixed and contains no objects — `[]` and `{}` are truthy. Check `.length` / key count for emptiness, never bare truthiness.
- Objects compare by identity (`===` is Python's `is`); there is no `__eq__` and no operator overloading.
- Keep `strict`; add `noUncheckedIndexedAccess` for new code. ES modules use braces for named imports, one `default` export, and `import type` for [[erased|type-erasure]] type-only imports.
- `.d.ts` ≈ `.pyi`; `@types/x` ≈ a stubs package on PyPI; `declare module "x";` is the one-line shim for an untyped import.

That closes the language. You now have the type system — [[structural|structural-typing]] at its core, [[erased|type-erasure]] at runtime, strict by default — and the JavaScript it compiles down to, including the places that JavaScript reaches back up through the types. What's left isn't another feature but the discipline that ties them together: choosing where the compiler's guarantees end and a runtime check has to begin. Every real TypeScript codebase is `tsc` for the internal contracts and a schema validator at the edges, and you now know exactly why the line falls where it does.

This lesson is where the runtime gotchas live precisely because everything above it was about types and this is about what survives them — so it's also the natural jumping-off point. If you want to put the language to work on something concrete, three companion courses pick up from here: **Build a Real App** applies these contracts end to end on a running artifact; **How Types Really Work** goes under the hood of the checker whose erasure this lesson kept invoking; and **Understand It & Build It** does both at once, building the thing from scratch. Each takes the same boundary you just learned to find — where the compiler stops knowing and a runtime check begins — and builds outward from it.
