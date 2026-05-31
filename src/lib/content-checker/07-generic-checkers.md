---
title: A checker over an unknown checker
subtitle: checkArray takes another checker as a parameter — and a function over an unknown type is exactly what a generic is
---

## Where we pick up

Our combinators so far — `checkObject`, `checkUnion`, `checkOptional` — all *take checkers and return checkers*. That higher-order habit is about to pay off in the most important way of the course. Consider lists. A `Task` has tags: an array of strings. A board has columns: an array of tasks. A matrix is an array of arrays of numbers. We need to check arrays.

The naive path is a dead end, and it's worth walking one step down it to feel the wall:

```typescript
function checkArrayOfString(value: unknown): Result { /* is it an array? is every element a string? */ }
function checkArrayOfNumber(value: unknown): Result { /* is it an array? is every element a number? */ }
function checkArrayOfTask(value: unknown): Result   { /* is it an array? is every element a task? */ }
// ...checkArrayOfWhatever, forever
```

These functions are *identical* except for one thing: which checker they run on each element. The "is it an array, and is every element OK?" logic is the same every time; only the per-element check varies. We've seen this smell before, and we know the cure — don't hard-code the varying part, *take it as a parameter*. But the parameter here isn't a value like `"todo"`; it's the *element type itself*, supplied as a checker. A function whose behavior is parameterized by a type it doesn't know in advance is a **generic**. Building `checkArray` is building a generic by hand, and seeing why it has to be one.

## Building `checkArray`

`checkArray` takes a checker for the *element* type and returns a checker for *arrays of that element*. The body is: confirm the value is an array, then run the element checker on every element, failing on the first bad one (with its index, for a useful message):

:::play
```typescript
type Result = { ok: true } | { ok: false; error: string };
type Checker<T> = (value: unknown) => Result;
const ok = (): Result => ({ ok: true });
const err = (e: string): Result => ({ ok: false, error: e });
const checkString: Checker<string> = (v) => typeof v === "string" ? ok() : err("expected string");
const checkNumber: Checker<number> = (v) => typeof v === "number" ? ok() : err("expected number");

function checkArray<T>(checkElem: Checker<T>): Checker<T[]> {
  return (value) => {
    if (!Array.isArray(value)) return err(`expected array, got ${typeof value}`);
    for (let i = 0; i < value.length; i++) {
      const r = checkElem(value[i]);
      if (!r.ok) return err(`index ${i}: ${r.error}`);
    }
    return ok();
  };
}

const checkStringArray = checkArray(checkString);
const checkNumberArray = checkArray(checkNumber);

console.log(checkStringArray(["a", "b", "c"]));   // { ok: true }
console.log(checkStringArray(["a", 2, "c"]));     // index 1: expected string
console.log(checkStringArray("abc"));             // expected array, got string
console.log(checkNumberArray([1, 2, 3]));         // { ok: true }
```
:::

Two things changed, and they're both deliberate. First, the body uses `Array.isArray(value)` rather than `typeof` — because `typeof [1,2,3]` is `"object"` (arrays are objects in JavaScript), so `typeof` can't distinguish an array from a plain object. `Array.isArray` is the runtime question "is this specifically an array?" Second — and this is the headline — I added a type parameter. `Checker` became `Checker<T>`, and `checkArray<T>(checkElem: Checker<T>): Checker<T[]>`. That `<T>` is the generic.

## Why this needs `<T>`: the type follows the value

Look at what the type parameter buys, by reading the signature as a sentence:

```typescript
function checkArray<T>(checkElem: Checker<T>): Checker<T[]>
```

"For some element type `T`, given a checker *for `T`*, I return a checker *for arrays of `T`*." The `T` in the input and the `T` in the output are *the same `T`* — that's the link a generic expresses and a non-generic function cannot. When you call `checkArray(checkString)`, the compiler sees `checkString` is a `Checker<string>`, solves `T = string`, and the result type is `Checker<string[]>`. Call it with `checkNumber` and `T = number`, result `Checker<number[]>`. The output type is *computed from* the input type, automatically:

:::play
```typescript
type Result = { ok: true } | { ok: false; error: string };
type Checker<T> = (value: unknown) => Result;
const ok = (): Result => ({ ok: true });
const err = (e: string): Result => ({ ok: false, error: e });
const checkString: Checker<string> = (v) => typeof v === "string" ? ok() : err("expected string");
function checkArray<T>(checkElem: Checker<T>): Checker<T[]> {
  return (value) => {
    if (!Array.isArray(value)) return err("expected array");
    for (let i = 0; i < value.length; i++) { const r = checkElem(value[i]); if (!r.ok) return err(`index ${i}: ${r.error}`); }
    return ok();
  };
}

const c = checkArray(checkString);
//    ^? hover in an editor: c is Checker<string[]>  — T was inferred as string
const nested = checkArray(checkArray(checkString));
//    ^? Checker<string[][]>  — T inferred as string[], the whole thing composes
console.log(nested([["a"], ["b", "c"]])); // { ok: true }
```
:::

Notice we never wrote `checkArray<string>(checkString)`. We *could*, but we didn't need to — the compiler inferred `T` from the argument, the same [[unification|hindley-milner]] that solves `T` from a value everywhere in TypeScript. And `checkArray(checkArray(checkString))` composes to `Checker<string[][]>` with `T` solved at each layer: this is the combinator library again, now with the *types* threading through the composition, not just the runtime behavior.

This is the concept's core, and it has a precise Python analogue:

:::compare
```python
from typing import TypeVar, Callable
T = TypeVar("T")

# a checker for T is a Callable[[object], bool]; checkArray takes one and
# returns a checker for list[T]:
def check_array(check_elem: Callable[[object], bool]) -> Callable[[object], bool]:
    def check(value: object) -> bool:
        return isinstance(value, list) and all(check_elem(x) for x in value)
    return check

# Python 3.12 inline form makes the type parameter explicit, like <T>:
def check_array[T](check_elem: Callable[[object], bool]): ...
```
```typescript
function checkArray<T>(checkElem: Checker<T>): Checker<T[]> {
  return (value) => {
    if (!Array.isArray(value)) return err("expected array");
    return value.every((x) => checkElem(x).ok) ? ok() : err("bad element");
  };
}
```
:::

`<T>` *is* Python's `TypeVar` / the `def f[T]` inline form — a function parameterized over an unknown type. The difference, the one from the generics lesson, is that TypeScript *infers and tracks* `T` through the result type (`Checker<T[]>`), so `checkArray(checkString)` is statically known to be a `Checker<string[]>`, whereas Python's `Callable[[object], bool]` has lost track of the element type by the time the function returns. Same construct, more inference.

## What `T` is at runtime: nothing

Here is the beat this episode exists to deliver, and it's the one that separates TypeScript's generics from C++'s and even from how a Python dev might picture them. Run the playground above and ask: at *runtime*, what is `T`?

It doesn't exist. Look at the body of `checkArray` — `T` appears nowhere in it. The runtime code is just "is it an array, and does `checkElem` pass on each element?" The `checkElem` function carries all the actual checking; `T` is purely a compile-time bookkeeping device that lets the *compiler* connect "checker for `string`" to "checker for `string[]`." When `tsc` emits JavaScript, every `<T>`, every `Checker<string[]>`, every type annotation is **stripped out** — [[type erasure|type-erasure]]. The emitted `checkArray` is one function that works for any element checker, because the runtime never knew or cared what `T` was.

:::predict
A C++ programmer expects `std::vector<int>` and `std::vector<string>` to compile to *two distinct types* — the compiler stamps out a separate version of the code for each (monomorphization). When `tsc` compiles `checkArray<string>` and `checkArray<number>`, how many versions of the `checkArray` function exist in the emitted JavaScript?

- ( ) Two — one specialized for `string`, one for `number`, like C++ templates.
- (x) One — the type parameter is erased; a single generic function handles every `T`.
- ( ) Zero — generic functions are compile-time only and don't emit code.
- ( ) One per call site, generated lazily at runtime.
:::answer
One. TypeScript generics are *erased*, not *monomorphized*: `tsc` checks the types, then emits a single `checkArray` function with all type information removed — there is no `string` version and `number` version, just one function that closes over whatever `checkElem` you passed. This is the opposite of C++ templates, which monomorphize: `vector<int>` and `vector<string>` generate genuinely separate machine code, which is why C++ template errors are enormous and why template code can bloat the binary. It's closer to Java generics, which also erase (Java's `List<String>` is just `List` at runtime — `new T()` is famously impossible there for the same reason). The consequence for us: `T` can *never* be inspected inside `checkArray`'s body — you cannot write `if (T === string)`, because by runtime `T` is gone. All the actual type knowledge has to live in the `checkElem` *value* you were handed. Erasure is *why* a runtime checker has to exist at all: the types that would tell you what to verify are not present when the program runs.
:::

That last sentence is the spine of the whole course tightening. The reason we're building a *runtime* checker — passing checkers around as values — is precisely that types are erased. If `T` survived to runtime, you could ask the value "what type are you?" and be done. Because it doesn't, you must carry the checking logic yourself, as a value (`checkElem`), into the place where the value actually exists. Generics make this vivid: the type parameter is the thing that *isn't there* at runtime, and the checker is what you build to stand in for it.

:::quiz
We wrote `Checker<T>` but the `T` never appears in the function body — `(value: unknown) => Result` doesn't mention `T` at all. So what work is the `<T>` actually doing on `Checker<T>`, and why isn't it useless?
:::answer
`T` is a *phantom* type parameter on `Checker<T>` — it doesn't change the runtime function (which still takes `unknown` and returns `Result`), but it *labels* the checker with the type it verifies, so the compiler can track that label through composition. Without it, `checkArray`'s signature couldn't say "a checker for `T` in, a checker for `T[]` out" — it could only say "a checker in, a checker out," losing the connection between element and array. The `<T>` carries no runtime weight (erasure guarantees that) but carries the *relationship* between input and output types at compile time, which is exactly what lets `checkArray(checkString)` be known as `Checker<string[]>` rather than just `Checker<unknown>`. It's bookkeeping that's invisible at runtime and load-bearing at compile time — the defining character of a generic. (Phantom type parameters like this also underpin [[branded types|branded-types]], a trick we won't need but which trades on the same "type-level label, no runtime presence" idea.)
:::

## Recap

- `checkArray(checkElem)` checks "is it an array, and does every element pass `checkElem`?" It uses `Array.isArray` because `typeof []` is `"object"` — `typeof` can't see arrays.
- It's a *generic*: `checkArray<T>(checkElem: Checker<T>): Checker<T[]>`. The same `T` links input to output, so `checkArray(checkString)` is inferred as `Checker<string[]>` — the output type computed from the input type.
- `<T>` is Python's `TypeVar` / `def f[T]`; TypeScript additionally infers and *tracks* `T` through the result, which Python's `Callable` loses.
- `T` does not exist at runtime — [[type erasure|type-erasure]] strips it. One emitted `checkArray` handles every element type. This is unlike C++ monomorphization (separate code per type) and like Java's erased generics.
- Erasure is *why the runtime checker must exist*: the type that would tell you what to verify is gone by runtime, so you carry the checking logic as a value (`checkElem`). The phantom `T` is invisible at runtime, load-bearing at compile time.

We now have a real combinator library: primitives, objects, unions, optionals, arrays — all composing. But the verdict is still a `Result` we read by hand. The next episode connects our checker to the compiler's own reasoning: we turn a checker into a TypeScript *type guard* — a function typed `(v: unknown) => v is Task` — and watch the compiler *narrow* the static type inside the `if`. The verdict our checker computes and the type the compiler infers finally become the same thing.
