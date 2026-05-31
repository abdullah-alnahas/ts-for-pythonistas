---
title: Primitives & variables
subtitle: How let / const drive inference, and where the primitives diverge from Python's
---

Lesson 01 ended on a claim: the compiler infers more than you tell it, and it treats `const` and `let` differently when it does. The same string literal, assigned to two variables, becomes two different types. That isn't a quirk to memorize — it falls out of one rule about reassignment that runs through everything in this lesson. So this is partly a tour of the primitive types, which are mostly familiar, and partly an account of how much the compiler knows about a value you never annotated. The surprises cluster in two places: how numbers work, and how narrow an inferred type really is. Start with the declaration keywords, because the inference rule is downstream of them.

## Declaring variables: `const` is real

The defaults are simple: `const` unless you need to reassign, `let` when you do, never `var`. The reasons are worth stating because two of the three differ from Python in ways that matter.

`const` is enforced. This is not Python's `ALL_CAPS = 1` convention, where the name signals intent and nothing stops a later `X = 2`. In TypeScript the compiler rejects the reassignment outright, the same way Python's `typing.Final` does — except `Final` only binds when a type checker is looking, while `const` is a JavaScript keyword that the runtime enforces too.

:::compare diff
```python
X = 1            # "constant" by convention only
X = 2            # nothing stops this
```
```typescript
const X = 1;     // genuinely cannot be reassigned
X = 2;           // error: Cannot assign to 'X' because it is a constant.
```
:::

The boundary `const` draws is the same one `Final` draws: it blocks *rebinding the name*, not *mutating the object the name points at*. `const arr = [1]; arr.push(2)` is fine, because `push` never reassigns `arr` — it mutates the array `arr` already refers to. This is the reference/binding distinction you already hold from Python; `const` governs the binding, not the referent. If you've used Java or C++, `const` is `final` on a Java local or `T* const` in C++ — the binding is fixed, the object behind it is not — and like `final` it's checked, except `const` is enforced by the JavaScript runtime as well, not only the compiler.

Never reach for `var`, and the reason is scoping. `let` and `const` are block-scoped — bound to the nearest enclosing `{}` — and live in the [[temporal dead zone|tdz]] from the top of that block until their declaration line, so reading them early throws a `ReferenceError`. `var` is function-scoped and hoisted to `undefined`, so a read before the declaration returns `undefined` silently instead of failing. That silent `undefined` is the bug class `let`/`const` were designed to kill; it has no Python analogue, because Python's scoping is already function-level and raises a loud `UnboundLocalError` instead. You will see `var` in old code; you should not write it.

## Annotations and inference

The annotation syntax is `name: Type`, which reads like Python's, but the idiom around it is different. In Python, annotating a local is cheap and common, partly because the runtime ignores it anyway and [[mypy]] infers conservatively. TypeScript's inference is aggressive and precise, so an annotation on a local is usually redundant, and worse, it can be a downgrade. The resolution is to annotate at *boundaries* — function parameters, return types, exported values, anything another part of the program consumes — and let everything local infer.

:::compare
```python
name: str = "Ada"    # fine; mypy would infer str anyway
```
```typescript
const name = "Ada";  // inferred as "Ada", and an annotation would widen it
```
:::

That last comment is the whole point of the lesson. `const name: string = "Ada"` and `const name = "Ada"` are not the same declaration. The first pins the type to `string`; the second lets the compiler infer, and what it infers is narrower — the literal type `"Ada"`, inhabited by exactly one value. The annotation here adds no safety; it discards information the compiler already had. We'll come back to why the inferred type is that narrow, and when the narrowness pays off, after the primitives.

## The primitive types

The set lines up with Python's most of the way, with the divergences concentrated in numbers.

:::compare
```python
s: str = "hi"
n: int = 3
f: float = 3.0
b: bool = True
nothing: None = None
big: int = 10**30      # arbitrary precision
```
```typescript
const s: string = "hi";
const n: number = 3;            // one number type
const f: number = 3.0;          // 3 and 3.0 are the same value
const b: boolean = true;        // lowercase keyword and value
const nothing: null = null;
const big: bigint = 10n ** 30n; // distinct type; note the n suffix
```
:::

Three things diverge from Python here, and each has a mechanical reason rather than a stylistic one.

First, there is one `number` type, and it is the IEEE-754 double — the same representation Python's `float` uses. There is no separate integer type at all. `3` and `3.0` are not just equal, they are the identical value; `typeof 3` and `typeof 3.0` both report `"number"`, and `Number.isInteger(3.0)` is `true` because `3.0` *is* `3`. This is JavaScript's design, inherited unchanged: the language shipped in 1995 with a single numeric type and TypeScript only describes it. The practical consequences are exactly the ones a double carries. Division never floors — `5 / 2` is `2.5`, and you reach for `Math.floor` or `Math.trunc` when you want Python's `//`. And integers are exact only up to `Number.MAX_SAFE_INTEGER`, which is 2^53 − 1, or `9_007_199_254_740_991`. Past that, the gaps between representable doubles exceed 1 and arithmetic silently rounds:

:::predict
What does `console.log(9_007_199_254_740_993)` print?
:::answer
`9007199254740992` — the value is past `Number.MAX_SAFE_INTEGER`, so it rounds down to the nearest representable double.
:::

:::play
```typescript
console.log(5 / 2);                    // 2.5 — no floor division
console.log(Math.floor(5 / 2));        // 2  — Python's //
console.log(9_007_199_254_740_993);    // 9007199254740992 — rounded; the value can't be stored
console.log(0.1 + 0.2);                // 0.30000000000000004 — same double you know from Python
```
:::

In Python this never bit you for integer counters, because `int` is arbitrary-precision and silently promotes. In TypeScript a counter past 2^53 is a correctness bug, not a slowdown.

That gap is exactly what `bigint` fills — the second divergence. It is a genuinely separate primitive type for arbitrary-precision integers, written with an `n` suffix (`10n`, `9007199254740993n`). It is the closest thing to Python's `int`, but it is not interchangeable with `number`: the compiler rejects `10n + 1` with *Operator '+' cannot be applied to types '10n' and '1'.* because mixing the two in arithmetic is a `TypeError` at runtime, and TypeScript would rather stop you at compile time. You convert explicitly (`10n + BigInt(1)`, or `Number(10n) + 1`) and accept the cost. Most code never needs it; you want it for things like database bigint IDs or values that genuinely exceed the safe-integer range.

Third, the type names and the literal values are lowercase: `string`, `number`, `boolean`, `null`, `true`, `false` — not `str`, `True`, `None`. The capitalized `String`, `Number`, and `Boolean` exist, but they are the wrapper *object* types (the result of `new String("x")`, an object, not a primitive), and annotating with them is almost always a mistake. Lowercase for the primitives, every time.

## String building

Python's f-strings map onto template literals, which use backticks. The two features Python splits across f-strings and triple-quoted strings, TypeScript folds into one construct.

:::compare
```python
name = "Ada"
msg = f"hi {name}, {1 + 1}"
multi = """line one
line two"""
```
```typescript
const name = "Ada";
const msg = `hi ${name}, ${1 + 1}`;
const multi = `line one
line two`;
```
:::

A backtick string does both interpolation and multi-line spanning, with the expression syntax `${...}` rather than f-string `{...}`. The trap for a Python reflex is the quote character: only backticks interpolate. `"hi ${name}"` and `'hi ${name}'` are plain strings that contain the literal four characters `${na…` — single and double quotes never interpolate in JavaScript. There is no equivalent of accidentally writing a plain string where you meant an f-string in Python, because Python's `f` prefix is a separate marker; here the marker is the quote you chose.

## Literal types: when the narrow inference pays off

Now back to inference. The reason `const name = "Ada"` infers `"Ada"` rather than `string` is that TypeScript types can be narrower than a base type — a type can be a *single literal value*. `"Ada"` is a type inhabited by exactly one string. `42` is a type inhabited by exactly one number. The nearest Python construct is `typing.Literal["Ada"]`, but where `Literal` is a tool you reach for deliberately in Python, literal types are the substrate the whole TypeScript type system is built on, and most of the time they are inferred for you.

They become useful the moment you union them. A variable typed `"dark" | "light"` accepts those two strings and nothing else — it is a closed set, checked at every assignment:

:::predict
`mode` is declared with the union type `"dark" | "light"`. Of the two reassignments, which compiles and which does the compiler reject?

```typescript
let mode: "dark" | "light" = "dark";
mode = "light"; // ?
mode = "blue";  // ?
```

- ( ) Both compile — the annotation is just documentation, like a Python type hint.
- ( ) Both are rejected — `mode` is fixed to `"dark"` after the first line.
- (x) `mode = "light"` compiles; `mode = "blue"` is rejected.
- ( ) Neither compiles — string literals can't be reassigned.
:::answer
`mode = "light"` compiles because `"light"` is a member of the set; `mode = "blue"` is rejected with *Type `"blue"` is not assignable to type `"dark" | "light"`*. The variable's type is the set of permitted strings, not `string`, so the compiler can check membership the way an `enum` would — but with no runtime construct behind it. This is the engine behind discriminated unions in Lesson 05, where the literal lives in an object field and its value tells the compiler which shape the object has.
:::

:::play
```typescript
let mode: "dark" | "light" = "dark";
mode = "light"; // ok
mode = "blue";  // error: Type '"blue"' is not assignable to type '"dark" | "light"'.
console.log(mode);
```
:::

Two details about this make the rest of the inference behavior predictable. The first is that the narrow inference is specifically a `const` behavior. The second is that it stops at the object boundary.

The `const`/`let` split is the rule Lesson 01 pointed at. `const x = "dark"` infers `"dark"`, because a `const` can never be reassigned, so the most specific type that describes every value it can ever hold is the single value it was given. `let x = "dark"` infers `string`, because `let` exists to be reassigned, and a type of `"dark"` on a variable you intend to overwrite would reject the next line you write. The compiler *widens* the literal to its base type precisely when reassignment is possible. It is the same logic that makes a `const` annotation a downgrade — the compiler already chose the tightest type the binding's mutability allows.

:::quiz
What type does TypeScript infer for each, and what is the mechanism behind the difference?

```typescript
const a = "dark";
let   b = "dark";
```
:::answer
`a` is the literal type `"dark"`; `b` is the widened type `string`. The mechanism is reassignability. `const a` is permanently bound, so `"dark"` describes every value it can hold and the compiler keeps it. `let b` may be reassigned to any string, so a type of `"dark"` would be wrong on the second line and useless on the first — the compiler widens to `string`. (The exception: a `let` you annotate explicitly, `let b: "dark" | "light" = "dark"`, keeps the union, because you asked for it. Widening only happens when the compiler is inferring.) This `const`-narrows / `let`-widens rule is the foundation for `as const` and the literal-union patterns in Lesson 11.
:::

The second detail is the limit, and it surprises people who expect `const` to make everything below it literal. `const` narrows the *binding*, not the contents of an object it points to. The fields of an object literal widen even under `const`, because the object is mutable — `cfg.mode = "light"` is a legal mutation, so the field can't be typed as the single value `"dark"`:

```typescript
const cfg = { mode: "dark" };   // inferred { mode: string }, not { mode: "dark" }
cfg.mode = "light";             // legal — the object is mutable, so the field is string

const frozen = { mode: "dark" } as const; // { readonly mode: "dark" }
frozen.mode = "light";          // error: Cannot assign to 'mode' because it is a read-only property.
```

`as const` is the override: it tells the compiler to infer the narrowest possible type and make every field `readonly`, which removes the mutability that forced the widening. It is the bridge from "I have a value" to "I have a type," and Lesson 11 builds real machinery on it. For now the model is enough: `const` freezes the binding; `as const` freezes the value.

A closing point that ties this back to Lesson 01. The union `"dark" | "light"` is a type, so it is [[erased|type-erasure]] — it exists only while `tsc` is checking, and the emitted JavaScript is just `let mode = "dark";`. At runtime nothing stops `mode = "blue"`; the membership check happened at compile time and is gone. So when the value comes from outside the program — a query string, a config file, a form field — the literal union guarantees nothing, because there was no source for the compiler to check. You validate that input against a real runtime array and derive the type from it (`as const` plus an indexed access, Lesson 11), which is the same edge-of-the-program validation problem from the last lesson, now with a concrete shape.

## Arrays and tuples

Collections map cleanly, with one mutability surprise in tuples.

:::compare
```python
nums: list[int] = [1, 2, 3]
pair: tuple[str, int] = ("a", 1)
```
```typescript
const nums: number[] = [1, 2, 3];
// equivalently: Array<number>
const pair: [string, number] = ["a", 1];
```
:::

`number[]` is the idiomatic spelling; `Array<number>` is the identical type written in generic form, and you'll see both. The divergence is in the tuple. A Python tuple is immutable — `pair[0] = "b"` raises `TypeError`. A TypeScript tuple is a JavaScript array with a fixed-length, position-typed shape, and arrays are mutable, so `pair[0] = "b"` is allowed as long as the new value matches the type at that position. The fixed length is a compile-time fact about the type, not a runtime guarantee about the array. To get Python's immutability you annotate `readonly [string, number]`, or write the literal with `as const` — the same tool from the previous section, doing the same job of stripping mutability so the type can tighten.

## Recap

- `const` by default, `let` to reassign, never `var`. `const` is compiler- and runtime-enforced, not a naming convention; it blocks rebinding, not mutation. `var` is hoisted and unscoped — a footgun `let`/`const` exist to replace.
- Annotate boundaries; let locals infer. An annotation on a local is usually redundant and can widen a type the compiler had inferred more precisely.
- One `number` type, the IEEE-754 double: no integer/float split, no floor division, exact only to 2^53 − 1. `bigint` is a separate type with `n` literals and does not mix with `number`.
- Type names and literal values are lowercase. Template literals use backticks and `${...}`; only backticks interpolate.
- A type can be a single literal value, and unions of them (`"a" | "b"`) are a pervasive, first-class feature.
- `const` infers the narrow literal type, `let` widens to the base type — because the compiler tracks whether reassignment is possible. The narrowing stops at object boundaries; `as const` carries it through and adds `readonly`.

Literal types are the seed. Lesson 03 takes a step back from individual values to the question the whole type system turns on: when are two *shapes* the same type? The answer — that TypeScript compares structure, not names — is the largest single departure from the way Python's classes and `isinstance` decide identity, and it reframes everything that follows.
