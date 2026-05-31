---
title: Absent on purpose
subtitle: checkOptional is just a union with "missing" — and modeling absence is where TS splits from null and nullptr
---

## Where we pick up

Every shape we've checked has demanded that *all* its fields be present. Back in Episode 3 we saw the consequence: `checkTask({ title: "buy milk" })` failed, because the missing `done` field read as `undefined` and `checkBoolean(undefined)` said no. At the time we waved it off — "absent and present-but-wrong fail the same way, and that's fine for now." Now it's not fine. Real objects have optional fields: a `Task` might carry a `description`, or might not, and a missing `description` should be *allowed*, not an error. A value might legitimately be `null`. We need to model absence on purpose.

The good news is we don't need a new mechanism. We built it last episode. "Optional" is just a *union*: a field is either the type we expect, *or* it's absent. So `checkOptional` is `checkUnion` with one specific extra branch — the branch that passes when the value is missing. Building it takes about four lines. The interesting part isn't the code; it's that TypeScript treats absence as a real, checkable type — `undefined` and `null` are values with their own types — which is a sharp break from how C, Java, and even Python handle "nothing here."

## What "absent" even is

First, untangle three things that all feel like "missing," because TypeScript distinguishes them and so must our checker:

- **`undefined`** — JavaScript's "no value assigned." Reading a property that isn't there gives `undefined`. A function parameter you didn't pass is `undefined`. It's the default absence.
- **`null`** — an *explicit* "intentionally empty," something a programmer or a JSON payload sets on purpose (`{"description": null}`).
- **a missing key** — the property simply isn't on the object at all.

In JavaScript, reading a missing key and reading a key set to `undefined` both yield `undefined`, so for an *object field* the last two collapse: `obj.x` is `undefined` whether `x` was set to `undefined` or never set. `null` stays distinct — it's a different value with a different `typeof` (recall: `typeof null` is `"object"`, the Episode 1 wart). TypeScript gives each its own type: `undefined` is a type inhabited by the one value `undefined`; `null` is a type inhabited by the one value `null`. They are types you can put in a union, exactly like `"todo"` was.

:::compare
```python
# Python: one None, one type. Optional[X] is sugar for X | None.
from typing import Optional

description: Optional[str] = None   # str or None
# Optional[str] == Union[str, None] == (str | None)
```
```typescript
// TypeScript: TWO empties, each its own type.
let description: string | undefined = undefined; // string or undefined
let other: string | null = null;                 // string or null
// "optional field" specifically means the | undefined case, written with ?:
interface Task { title: string; description?: string; } // description?: == string | undefined
```
:::

Python has *one* empty, `None`, and `Optional[X]` is literally `X | None`. TypeScript has *two* empties and keeps them apart — which feels like extra ceremony until you've debugged a system that conflates "the server explicitly sent null" with "the field was never set." If you're coming from C or C++, there's no `nullptr` here — `null` isn't a zero pointer, it's a distinct value of a distinct type. From Java, `null` isn't a universal inhabitant of every reference type; under `strict`, a `string` *cannot* be `null` unless you wrote `string | null`. That last point is the big one, and it's worth its own beat.

## The strictNullChecks idea, by hand

Under TypeScript's `strict` mode (specifically `strictNullChecks`), `null` and `undefined` are *not* members of every type. A `string` is a string — never null, never undefined — unless you explicitly widen it to `string | null` or `string | undefined`. This is the opposite of Java, where any reference can be `null` and you find out with an NPE at runtime, and of pre-strict TypeScript, where `null` lurked in everything. Making absence an *explicit union member* means the compiler forces you to handle it.

Our checker has been enforcing exactly this discipline without naming it. `checkString` rejects `undefined` and `null` — `typeof undefined` is `"undefined"`, `typeof null` is `"object"`, neither is `"string"`. So our `checkString` already means "a string, and definitely not absent," which is precisely what `string` means under `strictNullChecks`. To allow absence, you must *opt in* — by building a union that includes it. That opt-in is `checkOptional`.

## Building `checkOptional`

`checkOptional` takes a checker and returns a new checker that *also* accepts `undefined`. It's `checkUnion(check, checkUndefined)` in spirit — pass if the inner checker passes, or if the value is absent:

:::play
```typescript
type Result = { ok: true } | { ok: false; error: string };
type Checker = (value: unknown) => Result;
const ok = (): Result => ({ ok: true });
const err = (e: string): Result => ({ ok: false, error: e });
const checkString: Checker = (v) => typeof v === "string" ? ok() : err("expected string");

// "absent" = undefined (a missing object key reads as undefined too).
function checkOptional(check: Checker): Checker {
  return (value) => (value === undefined ? ok() : check(value));
}

// allow null explicitly, when a payload uses null for "empty":
function checkNullable(check: Checker): Checker {
  return (value) => (value === null ? ok() : check(value));
}

const checkDescription = checkOptional(checkString);

console.log(checkDescription("buy milk online")); // { ok: true } — present and valid
console.log(checkDescription(undefined));         // { ok: true } — absent, allowed
console.log(checkDescription(42));                // { ok: false } — present but wrong kind
console.log(checkDescription(null));              // { ok: false } — null is NOT undefined
```
:::

Read the last two lines carefully, because they're the whole point. `checkDescription(42)` *fails*: the field is present, so absence doesn't apply, and `42` isn't a string. `checkDescription(null)` also *fails*: `null` is not `undefined`, so it doesn't count as "absent" — if you want to allow `null`, that's `checkNullable`, a different opt-in. Optional means "the value or *nothing*," and "nothing" here is specifically `undefined`, not "anything empty-ish." This precision is what we lost back in Episode 3, where missing and wrong looked identical; now a missing optional field passes, a present-but-wrong field fails, and the two are properly distinct.

Wire it into a shape and the object checker just works, because `checkOptional(checkString)` is an ordinary `Checker` — the combinator composes like any other:

:::play
```typescript
type Result = { ok: true } | { ok: false; error: string };
type Checker = (value: unknown) => Result;
const ok = (): Result => ({ ok: true });
const err = (e: string): Result => ({ ok: false, error: e });
const checkString: Checker = (v) => typeof v === "string" ? ok() : err("expected string");
const checkBoolean: Checker = (v) => typeof v === "boolean" ? ok() : err("expected boolean");
function checkObject(shape: Record<string, Checker>): Checker {
  return (value) => {
    if (typeof value !== "object" || value === null) return err("expected object");
    const obj = value as Record<string, unknown>;
    for (const [k, check] of Object.entries(shape)) {
      const r = check(obj[k]);
      if (!r.ok) return err(`field "${k}": ${r.error}`);
    }
    return ok();
  };
}
function checkOptional(check: Checker): Checker {
  return (v) => (v === undefined ? ok() : check(v));
}

const checkTask = checkObject({
  title: checkString,
  done: checkBoolean,
  description: checkOptional(checkString),  // may be present (string) or absent
});

console.log(checkTask({ title: "buy milk", done: false }));                       // ok — no description
console.log(checkTask({ title: "buy milk", done: false, description: "2L" }));     // ok — valid description
console.log(checkTask({ title: "buy milk", done: false, description: 99 }));       // fails — wrong kind
```
:::

This verifies the static type with the optional-field syntax `?:`:

```typescript
interface Task {
  title: string;
  done: boolean;
  description?: string;   // ?: means the field is string | undefined and may be omitted
}
```

The `?:` on `description` is TypeScript's notation for exactly what `checkOptional` does at runtime: the field's type becomes `string | undefined`, *and* the field may be omitted entirely. It's the static twin of our combinator — the same "this, or absent," one checked at compile time, one at runtime.

:::predict
The return type when you *read* an optional field reflects the absence. Given `task: Task` with `description?: string`, what is the type of `task.description`, and why does the compiler stop you from calling `.toUpperCase()` on it directly?

```typescript
const len = task.description.toUpperCase(); // ?
```

- ( ) `string` — the `?` only affects assignment, not reads.
- (x) `string | undefined` — so `.toUpperCase()` is a compile error until you handle the `undefined` case.
- ( ) `undefined` always — optional fields can't be read.
- ( ) `string`, but only at runtime; the compiler allows the call.
:::answer
`task.description` is `string | undefined`, so `task.description.toUpperCase()` is a compile error: *Object is possibly 'undefined'* (TS18048). The `?:` put `undefined` into the field's type, and `strictNullChecks` then refuses to let you call a string method on something that might be absent — you must narrow first (`if (task.description) ...`) or use optional chaining (`task.description?.toUpperCase()`). This is the compiler enforcing, on your *code*, exactly the distinction our `checkOptional` enforces on a *value*: absence is a real possibility that must be handled before use. The runtime `null`/`undefined` errors that plague Java and untyped JavaScript are converted into compile errors you can't ignore.
:::

## Why this is the same union, not a new feature

It's worth stating plainly: `checkOptional` introduced no new machinery. It's `checkUnion` from last episode with one branch fixed to "is the value `undefined`?" Optionality, nullability, and "one of several types" are *the same idea* — a union — wearing different clothes. TypeScript reinforces this: `string | undefined` is a union, `string | null` is a union, `"a" | "b"` is a union, and the `?:` field syntax is sugar that *expands into* `| undefined`. Once you see absence as just another union member, the whole family collapses into one concept you already built. That economy — many surface features, one underlying mechanism — is a recurring theme, and it's the kind of thing you only notice from having built the mechanism by hand.

:::quiz
Java lets any reference be `null`; pre-strict TypeScript let `null`/`undefined` inhabit every type. Under `strictNullChecks`, they don't. In terms of our checker, what is the difference between `checkString` and `checkOptional(checkString)`, and which one corresponds to the type `string` under strict mode versus `string | undefined`?
:::answer
`checkString` rejects `undefined` (and `null`) outright — it passes only for an actual string. That is exactly the type `string` under `strictNullChecks`: a value that is definitely a string, never absent. `checkOptional(checkString)` adds the "or `undefined`" branch, so it passes for a string *or* for absence — which is exactly the type `string | undefined`. The difference between the two checkers is the difference between the two types: one forbids absence, one permits it, and the permission must be opted into explicitly in both worlds. Java's "any reference can be null" corresponds to a world where *every* checker secretly behaved like `checkOptional` whether you asked or not — which is precisely the source of the null-pointer exception, and precisely what strict mode (and our explicit `checkOptional`) abolishes.
:::

## Recap

- "Optional" is a union: the expected type *or* absence. `checkOptional(check)` is `checkUnion(check, isUndefined)` in spirit — pass if the value is `undefined`, else defer to the inner checker. No new mechanism.
- TypeScript has *two* empties: `undefined` (no value / missing key) and `null` (explicit empty), each its own type. Python has one `None`; `Optional[X]` is `X | None`. C's `nullptr` and Java's universal `null` have no equivalent — `null` here is a distinct value of a distinct type.
- Under `strictNullChecks`, `null`/`undefined` are not members of every type; you opt into absence with an explicit union. Our `checkString` already enforced this ("a string, never absent"); `checkOptional` is the opt-in that adds absence back.
- `checkOptional(checkString)` is the runtime twin of the field syntax `description?: string` (which expands to `string | undefined` and "may be omitted"). Reading such a field yields `string | undefined`, and the compiler forces you to handle the `undefined` before use — runtime NPEs become compile errors.
- Optional, nullable, and "one of several" are all the same union mechanism. Many surface features, one idea you already built.

We can now describe objects with required and optional fields, unions, and literals. But every checker so far works on a *fixed* set of types — we hard-coded `string`, `number`, `boolean` into the primitives. What about a list of *whatever*? An array of strings, an array of tasks, an array of arrays? We can't write `checkArrayOfString`, `checkArrayOfTask`, `checkArrayOfWhatever` forever. The next episode builds `checkArray(elementChecker)` — a checker *parameterized by another checker* — and that act, a function over an unknown type, *is* generics.
