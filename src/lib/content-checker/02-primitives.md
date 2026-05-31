---
title: A vocabulary for checks
subtitle: checkNumber, checkBoolean, and the Result and Checker types we'll reuse for the rest of the course
---

## Where we pick up

Episode 1 left us with one function:

```typescript
function checkString(value: unknown): boolean {
  return typeof value === "string";
}
```

It works, and it taught us the shape of a check: `unknown` in, verdict out. But it has two limits we named at the end, and now we feel them. First, it checks exactly one type — the moment we want numbers and booleans too, we'll be writing `checkNumber`, `checkBoolean`, and the boilerplate starts to repeat. Second, the verdict is a bare `boolean`: when a check fails, we learn *that* it failed and nothing about *why*. This episode fixes both, and the fix is mostly about naming things. By the end we'll have a `Result` type that carries a reason, a `Checker` type that describes what every check looks like, and three primitive checkers written against them. That vocabulary is the foundation the next eight episodes build on, so it's worth getting exactly right.

## More primitives, the obvious way first

The cheapest thing to do is copy `checkString` twice and swap the tag. So let's do that, feel the repetition, and let it motivate the cleanup:

:::play
```typescript
function checkString(value: unknown): boolean {
  return typeof value === "string";
}
function checkNumber(value: unknown): boolean {
  return typeof value === "number";
}
function checkBoolean(value: unknown): boolean {
  return typeof value === "boolean";
}

console.log(checkNumber(42));     // true
console.log(checkNumber("42"));   // false — a string, not a number
console.log(checkBoolean(true));  // true
console.log(checkBoolean(0));     // false — 0 is falsy but not a boolean
```
:::

Two things to notice before we clean up. `checkNumber("42")` is `false`: the string `"42"` is not a number, even though it *looks* numeric. This is the divergence Python developers feel first — there's no [[coercion]] here, no "truthy enough." `typeof` reports the actual runtime kind, and `"42"` is a `string`, full stop. And `checkBoolean(0)` is `false`: `0` is falsy in a condition, but it is a `number`, not a `boolean`. A check asks about the *kind* of the value, never about whether it would pass an `if`. Confusing those two is the single most common validation bug a JavaScript newcomer writes, so the checker's literalness is a feature.

Now the repetition. Three functions, identical but for one string. That's a smell, and the way to remove it is to first write down what these three things *have in common* — to give the pattern a type.

## The verdict, upgraded: a `Result`

Start with the return value, because that's the part Episode 1 flagged as too thin. A boolean can't carry a reason. So we define a small type that's either success or failure-with-a-message:

```typescript
type Result =
  | { ok: true }
  | { ok: false; error: string };
```

This is a [[union|nominal-vs-structural]] of two object shapes — Episode 5 is entirely about unions, so for now just read it as "a `Result` is one of these two things." When the check passes, the verdict is `{ ok: true }`. When it fails, it's `{ ok: false, error: "some reason" }`. The `ok` field is a boolean *tag* that tells you which of the two you're holding, and — critically — which other fields exist: only the failure case has `error`. That tag-plus-payload pattern is exactly how Rust's `Result<T, E>` and Haskell's `Either` work, and it's how TypeScript itself models a value that's "one thing or another." If you've reached for Python's `(ok, error)` tuples or raised-exception-with-message, this is the typed, return-it-don't-throw version of the same instinct.

Two tiny constructors make `Result`s pleasant to produce:

```typescript
const ok = (): Result => ({ ok: true });
const err = (error: string): Result => ({ ok: false, error });
```

:::compare
```python
# Python: a dataclass union, or just a tuple
def check_number(value) -> tuple[bool, str | None]:
    if isinstance(value, (int, float)) and not isinstance(value, bool):
        return (True, None)
    return (False, f"expected number, got {type(value).__name__}")
```
```typescript
type Result =
  | { ok: true }
  | { ok: false; error: string };

const ok = (): Result => ({ ok: true });
const err = (error: string): Result => ({ ok: false, error });
```
:::

Note the Python side has to write `and not isinstance(value, bool)` — because in Python, `bool` is a *subclass* of `int`, so `isinstance(True, int)` is `True` and `True == 1`. JavaScript has no such trap: `typeof true` is `"boolean"` and `typeof 1` is `"number"`, two disjoint tags. One of the rare cases where the JavaScript runtime is *less* surprising than Python's.

## The check, upgraded: a `Checker` type

Now name the other half of the pattern — the function shape itself. Every check we've written takes one `unknown` and returns a verdict. With the verdict now being `Result`, the shape is:

```typescript
type Checker = (value: unknown) => Result;
```

Read that as a sentence: **a `Checker` is a function from an unknown value to a `Result`.** It is Episode 1's spine, written as a type. This single line is the most important declaration in the course — almost everything we build from here is either a `Checker`, or a function that *returns* a `Checker`. Giving the pattern a name is what lets us talk about checks as values: pass them around, store them in objects, combine them. We couldn't do that while "a check" was just an ad-hoc function signature we retyped each time.

Rewrite the three primitives against the new vocabulary:

:::play
```typescript
type Result =
  | { ok: true }
  | { ok: false; error: string };
const ok = (): Result => ({ ok: true });
const err = (error: string): Result => ({ ok: false, error });

type Checker = (value: unknown) => Result;

const checkString: Checker = (value) =>
  typeof value === "string" ? ok() : err(`expected string, got ${typeof value}`);
const checkNumber: Checker = (value) =>
  typeof value === "number" ? ok() : err(`expected number, got ${typeof value}`);
const checkBoolean: Checker = (value) =>
  typeof value === "boolean" ? ok() : err(`expected boolean, got ${typeof value}`);

console.log(checkString("hi"));  // { ok: true }
console.log(checkNumber("hi"));  // { ok: false, error: "expected number, got string" }
```
:::

Look at what the annotation bought us. We wrote `const checkString: Checker = (value) => ...` and never annotated `value` — yet inside the arrow, `value` is `unknown`. The compiler read the `Checker` type and pushed the parameter type *into* the function for us. This is [[inference|hindley-milner]] flowing in the opposite direction from usual: normally the compiler infers a function's type from its body; here it infers the body's parameter from the declared type. It's the same machinery that made annotations on locals redundant in the primitives lesson, now working for us on a function. Annotate the boundary — the `Checker` type — and the inside fills in.

:::predict
We declared `checkNumber: Checker`, and `Checker` says the return type is `Result`. What happens if the body forgets a branch?

```typescript
const checkNumber: Checker = (value) => {
  if (typeof value === "number") return ok();
  // forgot to return on the failure path
};
```

- ( ) Nothing — the missing return is filled with `undefined` silently, like Python.
- (x) A compile error — not every path returns a `Result`, which the `Checker` type requires.
- ( ) A runtime error only when a non-number is passed.
- ( ) It compiles; the function just returns `void` on that path.
:::answer
A compile error: *Function lacks ending return statement and return type does not include 'undefined'* (TS2366), under `strict`. Because we declared the return type as `Result` (via `Checker`), the compiler demands *every* path produce a `Result`; the implicit `undefined` from a missing return is not a `Result`, so it's rejected before the code can run. This is the boundary annotation earning its keep — Python would let this function return `None` on the missing path and you'd find out at runtime. The fix is to add the failure `return err(...)`, which is why the ternary form above is tidy: an expression has no "missing path."
:::

## Why this vocabulary, and not just functions

It's worth pausing on what we gained, because the rest of the course leans on it. We could have kept writing standalone functions. Instead we now have two types — `Checker` and `Result` — and the difference is that **a check is now a value with a name for its type.** That unlocks three things we'll use constantly:

- We can store checkers in a data structure. Episode 3 builds an object checker by putting a checker *per field* into a map: `{ title: checkString, done: checkBoolean }`. That's only expressible because a `Checker` is a value.
- We can write functions that *take* a checker and *return* a new one. Episode 6's `checkOptional(checkString)` and Episode 7's `checkArray(checkNumber)` are functions over checkers — higher-order, in the way Python's decorators are functions over functions.
- We can combine verdicts uniformly. Because every check returns the same `Result` shape, an object checker can run a field's checker, look at its `ok`, and aggregate — without knowing or caring *which* check it ran.

That last point is the quiet payoff. A consistent verdict type means checks *compose*. If `checkString` returned a boolean and `checkNumber` returned a string-or-null and `checkBoolean` raised, you could never write code that runs an arbitrary checker and reacts to the result. Uniformity is what makes a combinator library possible, and a combinator library is exactly what this checker becomes by Episode 9.

:::quiz
We typed `Checker` as `(value: unknown) => Result`. Why `unknown` for the parameter rather than, say, `string | number | boolean`, and why does that choice get more important — not less — as we add object and array checks?
:::answer
Because a checker's entire purpose is to inspect a value whose type we *don't* know — that's the precondition for checking it at all. Typing the parameter as `string | number | boolean` would be a lie: it would tell the compiler "this is definitely one of three primitives," when in fact it might be `null`, an object, an array, or anything that came off the wire. `unknown` is the only honest type for untrusted input, and it forces the body to actually test before using the value. The choice matters *more* as checks get richer: an object checker (Episode 3) receives values that might not be objects at all, and the `unknown` parameter is what makes the compiler require the `typeof value === "object"` guard before any field access. `unknown` keeps every checker honest at its front door.
:::

## Recap

- No coercion: `checkNumber("42")` is `false` and `checkBoolean(0)` is `false`. A check asks the value's *kind* (`typeof`), never whether it's truthy. JavaScript's `typeof` tags are disjoint, so there's no `bool`-is-an-`int` trap like Python's.
- `Result` is a tagged union — `{ ok: true }` or `{ ok: false; error: string }` — the return-it-don't-throw way to carry a *reason* with a failure. The `ok` field is the tag that says which case you hold.
- `Checker` is `(value: unknown) => Result`: Episode 1's spine written as a type. Declaring a value `: Checker` infers the `unknown` parameter for free — boundary annotation, inside fills in.
- Naming the pattern is what lets checks become values: stored in maps, taken and returned by other functions, and combined through a uniform verdict. That is the seed of a combinator library.

We can now check any single primitive and say why it failed. But real data isn't a lone primitive — it's the `{ title, done }` object we opened the course with. The next episode asks: given a value, how do we check it has the right *fields* of the right *kinds*? Answering that by hand turns out to *be* the mechanism behind TypeScript's most distinctive feature — structural typing — and it's where this stops looking like Python's `isinstance` and starts looking like something Java and C++ can't do at all.
