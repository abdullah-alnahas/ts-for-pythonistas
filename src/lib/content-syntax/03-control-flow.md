---
title: Control flow
subtitle: if and switch, the four kinds of for, and the equality trap that has no Python equivalent
---

Control flow is where TypeScript looks most like a different family from Python: C-style braces and parentheses instead of colons and indentation. The shapes are the same; the punctuation moves.

## `if` / `else if` / `else`

:::compare run
```python
total = 1272.5
if total > 1000:
    print("over budget")
elif total > 500:
    print("watch it")
else:
    print("fine")
```
```typescript
const total = 1272.5;
if (total > 1000) {
  console.log("over budget");
} else if (total > 500) {
  console.log("watch it");
} else {
  console.log("fine");
}
```
:::

Condition in parentheses, body in braces, `else if` is two words. No `elif`. Indentation is for humans only — the braces define the blocks. Most teams enforce braces even on one-line bodies (a linter rule), so write them.

## The equality trap: `===` not `==`

This one has no Python counterpart and it catches everyone. JavaScript has two equality operators, and you want the strict one.

:::compare run
```python
# Python compares by value, with sane rules
1 == 1.0      # True
1 == "1"      # False
```
```typescript
// == coerces types before comparing — avoid it
console.log(1 == ("1" as unknown));  // true  (string coerced to number!)
console.log(0 == ("" as unknown));   // true
// === checks type AND value, no coercion — always use this
console.log(1 === (1 as number));    // true
console.log((1 as unknown) === "1"); // false
```
:::

`==` performs [[type coercion|coercion]] — it converts operands to a common type first, producing famous absurdities like `0 == ""` being `true`. **Always use `===` and `!==`.** Treat `==` as a bug. Linters flag it by default.

Truthiness also differs in the edges. Falsy values in TypeScript are: `false`, `0`, `""`, `null`, `undefined`, `NaN`. Note `0` and `""` are falsy (same as Python), but an empty array `[]` and empty object `{}` are **truthy** (unlike Python, where `[]` and `{}` are falsy). So `if (items.length)` not `if (items)` to test for a non-empty array.

## Ternary, and short-circuits

The conditional expression is C-style, and the boolean operators double as value-selectors just like Python's `and`/`or`:

:::compare run
```python
suffix = f" ({note})" if note else ""
name = given or "anonymous"
```
```typescript
const note: string | null = "morning";
const suffix = note ? ` (${note})` : "";
const name = (note || "anonymous");
console.log(suffix, name);
```
:::

`a if cond else b` becomes `cond ? a : b`. `or` is `||`, `and` is `&&`, and they short-circuit and return a value the same way Python's do. (There's a sharper tool, `??`, for the null case specifically — that's the next lesson.)

## The four `for` loops

Python's `for x in seq` splits into two different keywords in TypeScript depending on what you want.

:::compare run
```python
items = ["a", "b", "c"]

for x in items:          # values
    print(x)

for i, x in enumerate(items):  # index + value
    print(i, x)

d = {"k": 1}
for key in d:            # dict keys
    print(key)
```
```typescript
const items = ["a", "b", "c"];

for (const x of items) {        // for...OF: values
  console.log(x);
}

items.forEach((x, i) => console.log(i, x)); // index + value

const d = { k: 1 };
for (const key in d) {          // for...IN: object KEYS (rarely what you want)
  console.log(key);
}
```
:::

Burn this in: **`for...of` iterates values, `for...in` iterates keys.** `for...in` on an array gives you `"0"`, `"1"`, … (string indices) and is almost never what you want — reach for `for...of` or `.forEach`. For index+value, the idiomatic move is `.entries()`:

```typescript
for (const [i, x] of items.entries()) {
  console.log(i, x); // 0 "a", 1 "b", ...
}
```

The C-style counting loop still exists for the rare case you need it: `for (let i = 0; i < n; i++) { ... }`. And `while` is identical in spirit:

:::compare
```python
while queue:
    process(queue.pop())
```
```typescript
while (queue.length > 0) {
  process(queue.pop());
}
```
:::

## `switch` — and translating `match`

Our spine has a `match` statement in `describe()`. TypeScript's `switch` is the closest tool, with two gotchas: cases fall through unless you `break` (or `return`), and there's no pattern destructuring — it compares one value with `===`.

:::compare run
```python
def describe(category):
    match category:
        case "food":
            return "groceries and eating out"
        case "rent":
            return "a roof over your head"
        case "transport":
            return "getting around"
        case "fun":
            return "the good stuff"

print(describe("rent"))
```
```typescript
function describe(category: string): string {
  switch (category) {
    case "food":
      return "groceries and eating out";
    case "rent":
      return "a roof over your head";
    case "transport":
      return "getting around";
    case "fun":
      return "the good stuff";
    default:
      throw new Error(`unknown category: ${category}`);
  }
}

console.log(describe("rent"));
```
:::

Each `case` here ends in `return`, so fall-through never happens. When a case's body doesn't return, you must end it with `break` or execution slides into the next case — the single most common `switch` bug coming from any language. The `default` is your `else`. When we revisit `describe` in the classes and types lessons, that `default` becomes an *exhaustiveness check* — a way to make the compiler force you to handle every category — but the shape is exactly this.

**File status:** ✅ `describe` translated as a standalone function (it becomes a class method later). ⏳ the rest still Python. Next: functions, arrow syntax, and default parameters.
