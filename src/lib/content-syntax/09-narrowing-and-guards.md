---
title: Narrowing and type guards
subtitle: typeof, instanceof, in, discriminated unions, and writing your own `x is T` checks
---

When a value's type is a union, you usually can't use it until you've proven *which* member you have. Doing that proof is called [[narrowing]], and it's the runtime side of TypeScript's type system — the place where ordinary `if` checks teach the compiler something. This is the direct counterpart of Python's `isinstance` branching, and it's how we translate `parse_amount`, which accepts `str | float`.

## The compiler follows your checks

The core idea: inside a branch guarded by a runtime check, the compiler *narrows* the variable's type to match. You write the check you'd write anyway; the type tracks along.

:::compare run
```python
def describe(x: int | str) -> str:
    if isinstance(x, str):
        return x.upper()      # x is str here
    return f"number: {x}"     # x is int here

print(describe("hi"), describe(7))
```
```typescript
function describe(x: number | string): string {
  if (typeof x === "string") {
    return x.toUpperCase();   // x is string here
  }
  return `number: ${x}`;      // x is number here
}

console.log(describe("hi"), describe(7));
```
:::

`isinstance(x, str)` for a primitive becomes `typeof x === "string"`. After the check, the compiler knows `x` is a `string` in the `if` and a `number` after it — `x.toUpperCase()` is allowed in the first branch and would be an error in the second.

## The four narrowing tools

**`typeof`** — for primitives. Returns one of `"string"`, `"number"`, `"boolean"`, `"bigint"`, `"symbol"`, `"undefined"`, `"object"`, `"function"`. (Famous wart: `typeof null === "object"`. Check `=== null` directly.)

**`instanceof`** — for class instances. This is the real match for `isinstance` on classes:

:::compare run
```python
if isinstance(err, ValueError):
    print("bad value")
```
```typescript
if (err instanceof RangeError) {
  console.log("bad value");
}
```
:::

**`in`** — tests whether a property exists, narrowing object unions by shape:

```typescript
type Cat = { meow: () => void };
type Dog = { bark: () => void };
function speak(pet: Cat | Dog) {
  if ("meow" in pet) pet.meow();  // narrowed to Cat
  else pet.bark();                 // narrowed to Dog
}
```

**Truthiness / equality** — `if (x)` removes `null`/`undefined`/`""`/`0`; `=== null`, `=== undefined`, and literal comparisons narrow too. This is what makes the `if (note === undefined)` checks from the null lesson work.

## Discriminated unions: the pattern to reach for

The cleanest way to model "one of several shapes" is to give each a literal-typed tag field, then `switch` on it. The compiler narrows each branch to the exact shape — this is the idiom that replaces a lot of Python `isinstance` ladders and `match` on class.

:::compare run
```python
# tagged shapes, matched by a discriminant
def area(shape: dict) -> float:
    match shape["kind"]:
        case "circle":
            return 3.14 * shape["r"] ** 2
        case "square":
            return shape["side"] ** 2
    return 0
print(area({"kind": "circle", "r": 2}))
```
```typescript
type Shape =
  | { kind: "circle"; r: number }
  | { kind: "square"; side: number };

function area(shape: Shape): number {
  switch (shape.kind) {
    case "circle":
      return Math.PI * shape.r ** 2;  // shape is the circle member
    case "square":
      return shape.side ** 2;          // shape is the square member
  }
}
console.log(area({ kind: "circle", r: 2 }));
```
:::

Each `case` narrows `shape` to one member, so `shape.r` is available in the circle branch and `shape.side` in the square branch — with full autocomplete and no casts.

## Exhaustiveness with `never`

`never` is the type with no values. Assigning a variable to a `never` only type-checks when the compiler believes that line is unreachable — so a `never` assignment in a `default` case becomes a compile-time guarantee that you've handled every union member. Add a case to the union and forget a branch, and this stops compiling. This is the upgrade promised back in the control-flow lesson for `describe`:

:::compare run
```python
# Python can't enforce this at "compile" time —
# a missing case just falls through to the default
def describe(c: str) -> str:
    match c:
        case "food": return "groceries"
        case "rent": return "roof"
        case _: raise ValueError(c)
print(describe("food"))
```
```typescript
type Category = "food" | "rent";
function describe(c: Category): string {
  switch (c) {
    case "food": return "groceries";
    case "rent": return "roof";
    default: {
      const unreachable: never = c; // errors if a Category is unhandled
      throw new Error(`unknown: ${String(unreachable)}`);
    }
  }
}
console.log(describe("food"));
```
:::

## Custom type guards: `x is T`

Sometimes the check is too complex for `typeof`/`in`. You write a function returning a **type predicate** `arg is T` — when it returns `true`, the compiler narrows the argument to `T`. It's the typed version of an `isinstance`-like helper:

```typescript
function isExpense(x: unknown): x is Expense {
  return typeof x === "object" && x !== null && "amount" in x;
}
if (isExpense(data)) {
  data.amount; // narrowed to Expense
}
```

## Translating `parse_amount`

The spine accepts a `string | number`, narrows the string case, converts it, and validates — every tool above in one small function:

:::compare run
```python
def parse_amount(raw: str | float) -> float:
    if isinstance(raw, str):
        try:
            raw = float(raw)
        except ValueError:
            raise ValueError(f"not a number: {raw!r}")
    if raw < 0:
        raise ValueError("amount must be positive")
    return raw

print(parse_amount("3.50"), parse_amount(14))
```
```typescript
function parseAmount(raw: string | number): number {
  let value = raw;
  if (typeof value === "string") {
    value = Number(value);
    if (Number.isNaN(value)) {
      throw new Error(`not a number: ${JSON.stringify(raw)}`);
    }
  }
  if (value < 0) {
    throw new Error("amount must be positive");
  }
  return value;
}

console.log(parseAmount("3.50"), parseAmount(14));
```
:::

`isinstance(raw, str)` is `typeof value === "string"`; `float(...)` + its `ValueError` becomes `Number(...)` + a `Number.isNaN` check (covered in the strings lesson). The `try/except` shape moves to `try/catch` in the async lesson, where we handle the errors this throws.

**File status:** ✅ `parse_amount` translated. ⏳ `find_first`, the `Ledger` class, and async still Python. Next: generics.
