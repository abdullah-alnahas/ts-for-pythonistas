---
title: Primitives & variables
subtitle: let / const, annotations, inference, and the primitive types
---

Two Python reflexes break in the first ten minutes here. You write `5 / 2` expecting `2`, and get `2.5` — there is no floor division. You write an `ALL_CAPS` "constant," and unlike Python, the compiler actually stops you from rebinding it. The primitives are mostly familiar; the surprises cluster around numbers and around how much the compiler infers from a bare literal. Start with the constant.

## Declaring variables: `const` is real

`const` by default, `let` to reassign, **never `var`**. The one beat that isn't muscle-memory from Python: `const` is genuinely enforced by the compiler — it's not Python's all-caps `X = 1` convention that nothing stops you from rebinding.

:::compare diff
```python
X = 1            # "constant" by convention only
X = 2            # nothing stops this
```
```typescript
const X = 1;     // truly cannot be reassigned
X = 2;           // ERROR
```
:::

`const` blocks *reassignment*, not *mutation*: `const arr = [1]; arr.push(2)` is fine — exactly like `Final` in Python stopping rebinding but not `.append`.

## Annotations and inference

Syntax is `name: Type`, like Python, but inference is more aggressive — annotate at **boundaries** (params, return types, public APIs) and let locals infer. The compiler infers a *narrower* type than you might expect, which matters below for literals.

:::compare
```python
name: str = "Ada"   # annotations common on locals in practice
```
```typescript
const name = "Ada"; // inferred — annotation would be redundant
```
:::

## The primitive types

:::compare
```python
s: str = "hi"
n: int = 3
f: float = 3.0
b: bool = True
nothing: None = None
big: int = 10**30   # arbitrary precision
```
```typescript
const s: string = "hi";
const n: number = 3;     // ONE number type
const f: number = 3.0;   // 3 and 3.0 are identical
const b: boolean = true; // lowercase!
const nothing: null = null;
const big: bigint = 10n ** 30n; // separate type, note the n
```
:::

Surprises coming from Python:

- **One `number` type.** No `int` vs `float` distinction — everything is an IEEE-754 double. `5 / 2 === 2.5` (no floor division; use `Math.floor`).
- **`bigint` is separate**, with `n`-suffixed literals (`10n`), and can't mix with `number` in arithmetic.
- **Lowercase type names** (`string`/`number`/`boolean`) and lowercase values (`true`/`false`/`null`) — vs Python's `str`/`True`/`None`. The capitalized `String`/`Number` are wrapper-object types you almost never want.

## String building

f-strings → template literals with backticks.

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

Backticks do both interpolation **and** multi-line. Note `${...}` not `{...}`. Single/double quotes are plain strings with no interpolation (so `'hi {name}'` stays literal — a common Python-muscle-memory bug).

## Literal types (no Python equivalent)

TS can type a value as *one specific literal*, not just its base type — `mode` below isn't `string`, it's the two-value type `"dark" | "light"`.

:::quiz
**Predict before you run.** `mode` is declared `"dark" | "light"`. Which of the two reassignments below compiles, and which does the compiler reject?

```typescript
let mode: "dark" | "light" = "dark";
mode = "light"; // ?
mode = "blue";  // ?
```
:::answer
`mode = "light"` compiles; `mode = "blue"` is rejected — `"blue"` isn't a member of `"dark" | "light"`. The variable's type is the *set of allowed strings*, not `string`. Run the block and watch the second assignment fail.
:::

:::play
```typescript
let mode: "dark" | "light" = "dark";
mode = "light"; // ok
mode = "blue";  // error: Type '"blue"' is not assignable to type '"dark" | "light"'
console.log(mode);
```
:::

The nearest Python analog is `typing.Literal["dark", "light"]`. In TS it's pervasive and central (it powers discriminated unions in Lesson 05). Note: `const x = "dark"` infers the literal type `"dark"`, but `let x = "dark"` widens to `string` — because `let` can be reassigned.

:::quiz
Recall from Lesson 01: this `mode` variable is typed `"dark" | "light"`. After `tsc` compiles, does that literal-union type exist at runtime to guard against a bad assignment?
:::answer
**No.** Like every type, the literal union `"dark" | "light"` is **erased** — it's a compile-time check only. The emitted JS is just `let mode = "dark";`, and at runtime nothing stops `mode = "blue"`. If you need the set of valid values at runtime (e.g. to validate user input), you keep a real runtime array and derive the type from it (`as const` + `typeof arr[number]`, Lesson 11).
:::

## Arrays & tuples

:::compare
```python
nums: list[int] = [1, 2, 3]
pair: tuple[str, int] = ("a", 1)
```
```typescript
const nums: number[] = [1, 2, 3];
// or: Array<number>
const pair: [string, number] = ["a", 1];
```
:::

`number[]` is the idiomatic form (`Array<number>` is equivalent). Tuples use `[A, B]` and, unlike Python tuples, are **mutable by default** — they're really JS arrays with a fixed-length type. Use `readonly [string, number]` or `as const` to lock them.

## Recap

- `const` by default, `let` to reassign, never `var`. `const` is real, not a convention.
- Annotate boundaries; let locals infer.
- One `number` type (IEEE double); `bigint` is separate with `n` literals.
- Lowercase `string`/`number`/`boolean`/`null`/`true`/`false`.
- Template literals use backticks and `${...}`.
- Literal types (`"a" | "b"`) are a first-class, heavily-used feature.

:::quiz
What type does TS infer for each, and why are they different?

```typescript
const a = "dark";
let   b = "dark";
```
:::answer
`a` is the **literal type `"dark"`**; `b` is the **wide type `string`**. Because `const a` can never be reassigned, TS keeps the most specific type. `let b` can be reassigned to any string, so TS widens it to `string` — keeping `"dark"` would be useless. This `const`-narrows / `let`-widens behavior is the foundation for `as const` and literal-union patterns later.
:::

Literal types are the seed. Lesson 05 plants them in object fields and grows the single most useful pattern TS gives a Python developer — discriminated unions, where one literal tag tells the compiler exactly which shape it's holding.
