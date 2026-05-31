---
title: Strings, numbers, and built-in methods
subtitle: Template literals, the array methods that replace comprehensions, and number formatting without format specs
---

This lesson covers the everyday standard-library surface: building strings, formatting numbers, and transforming collections. It's where Python's comprehensions and f-strings meet TypeScript's `map`/`filter`/`reduce` and template literals. By the end we translate `summarize`, the function that turns the ledger into its printed report.

## Template literals replace f-strings

Backtick strings with `${...}` are TypeScript's f-strings. The only real difference is the formatting: there's no `:.2f` mini-language inside the braces — you call a method on the value instead.

:::compare run
```python
name = "coffee"
amount = 3.5
print(f"{name}: ${amount:.2f}")     # coffee: $3.50
print(f"{name.upper()} x{2}")        # COFFEE x2
```
```typescript
const name = "coffee";
const amount = 3.5;
console.log(`${name}: $${amount.toFixed(2)}`); // coffee: $3.50
console.log(`${name.toUpperCase()} x${2}`);    // COFFEE x2
```
:::

Any expression goes inside `${}` — method calls, arithmetic, ternaries. Note `$${amount...}`: the first `$` is a literal dollar sign, the second begins the interpolation. Backtick strings are also multi-line by default (like Python's triple-quotes), and `+` concatenates plain strings if you ever need it.

## String methods

The methods you reach for daily, renamed:

| Python | TypeScript |
|---|---|
| `s.upper()` / `s.lower()` | `s.toUpperCase()` / `s.toLowerCase()` |
| `s.strip()` | `s.trim()` |
| `s.startswith(x)` / `s.endswith(x)` | `s.startsWith(x)` / `s.endsWith(x)` |
| `x in s` | `s.includes(x)` |
| `s.split(",")` | `s.split(",")` |
| `",".join(items)` | `items.join(",")` |
| `s.replace(a, b)` (all) | `s.replaceAll(a, b)` |
| `len(s)` | `s.length` |

The reversal that catches people: **`join` is a method on the array, not the separator.** Python's `",".join(items)` becomes `items.join(",")`.

## Numbers

One `number` type means formatting is method-based, not format-spec-based:

:::compare run
```python
print(f"{3.14159:.2f}")     # 3.14
print(round(3.14159, 2))    # 3.14
print(int("42"), float("3.5"))
print(3.0.is_integer())     # True
```
```typescript
console.log((3.14159).toFixed(2));        // "3.14"  (a string!)
console.log(Math.round(3.14159 * 100) / 100); // 3.14 (a number)
console.log(Number("42"), Number("3.5"));
console.log(Number.isInteger(3.0));       // true
```
:::

Two traps: `toFixed` returns a **string**, not a number — it's for display. And parsing: `Number("42")` is the clean converter; the older `parseInt`/`parseFloat` stop at the first non-digit (`parseInt("3px")` is `3`), which is occasionally what you want and often not. `Number("nope")` yields `NaN`, the not-a-number value — check it with `Number.isNaN(x)`, never `x === NaN` (which is always false).

## Comprehensions become `map` / `filter` / `reduce`

There's no comprehension syntax. The transforming array methods replace it, chained, each taking an arrow function. This is the single biggest day-to-day shift from Python.

:::compare run
```python
nums = [1, 2, 3, 4]
doubled = [n * 2 for n in nums]
evens = [n for n in nums if n % 2 == 0]
total = sum(nums)
print(doubled, evens, total)
```
```typescript
const nums = [1, 2, 3, 4];
const doubled = nums.map((n) => n * 2);
const evens = nums.filter((n) => n % 2 === 0);
const total = nums.reduce((acc, n) => acc + n, 0);
console.log(doubled, evens, total);
```
:::

- `[f(x) for x in xs]` → `xs.map((x) => f(x))`
- `[x for x in xs if cond]` → `xs.filter((x) => cond)`
- `sum(xs)` / `functools.reduce` → `xs.reduce((acc, x) => ..., initial)` (always pass the initial value)
- a filter-then-map comprehension → `.filter(...).map(...)`, chained left to right

Other common ones: `any(cond for x in xs)` is `xs.some((x) => cond)`; `all(...)` is `xs.every(...)`; `next(x for x in xs if cond)` is `xs.find((x) => cond)`. Generators and lazy iterators are a separate topic, but for the eager list-in/list-out cases, these methods are the direct translation.

## Translating `summarize`

Now the spine function. It maps each item to a line, appends category subtotals and a total, and joins with newlines:

:::compare run
```python
def summarize(items, total):
    lines = [f"{d}: ${a:.2f}" for d, a in items]
    lines.append(f"total: ${total:.2f}")
    if total > 1000:
        lines.append("(over budget!)")
    return "\n".join(lines)

print(summarize([("coffee", 3.5), ("rent", 1200)], 1203.5))
```
```typescript
function summarize(items: [string, number][], total: number): string {
  const lines = items.map(([d, a]) => `${d}: $${a.toFixed(2)}`);
  lines.push(`total: $${total.toFixed(2)}`);
  if (total > 1000) {
    lines.push("(over budget!)");
  }
  return lines.join("\n");
}

console.log(summarize([["coffee", 3.5], ["rent", 1200]], 1203.5));
```
:::

The list comprehension becomes `.map` with a destructured tuple parameter `([d, a]) => ...`; `"\n".join(lines)` becomes `lines.join("\n")`. (The full spine `summarize` also walks the category `Map` and calls `Ledger.describe`; we wire those in once the class exists.)

**File status:** ✅ `summarize`'s shape translated. ⏳ the `Category`/`Expense` types, the class, and async still Python. Next: naming types — aliases, interfaces, unions, and enums.
