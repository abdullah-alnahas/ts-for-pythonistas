---
title: Objects and collections
subtitle: Arrays, tuples, objects vs Maps, Sets, and the destructuring you'll use in every file
---

Python's four workhorses are `list`, `dict`, `set`, and `tuple`. TypeScript has direct counterparts, plus one fork that trips people up: Python's `dict` maps to *two* different TypeScript things — the object literal and the `Map` — and choosing wrong is a common early mistake. This lesson translates our spine's `SEED` data and the collection types the `Ledger` uses.

## Arrays

Python's `list` is TypeScript's array. Same literal syntax, typed as `T[]`.

:::compare run
```python
items: list[str] = ["a", "b", "c"]
items.append("d")
first = items[0]
n = len(items)
print(items, first, n)
```
```typescript
const items: string[] = ["a", "b", "c"];
items.push("d");
const first = items[0];
const n = items.length;
console.log(items, first, n);
```
:::

`append` is `push`, `len(x)` is `x.length`. Indexing is the same, but note: an out-of-range index returns `undefined` rather than throwing `IndexError`. The type is written `string[]` (or equivalently `Array<string>`). The rich transforming methods — `map`, `filter`, `reduce` — get their own lesson next.

## Tuples

Python tuples become **tuple types**: fixed-length arrays where each position has its own type. Our `SEED` is a list of 4-tuples, and the type spells out each slot:

:::compare run
```python
SEED: list[tuple[str, float, str, str | None]] = [
    ("coffee", 3.5, "food", "morning"),
    ("rent", 1200, "rent", None),
]
for description, amount, category, note in SEED:
    print(description, amount)
```
```typescript
type Seed = [string, number, string, string | undefined];

const SEED: Seed[] = [
  ["coffee", 3.5, "food", "morning"],
  ["rent", 1200, "rent", undefined],
];

for (const [description, amount, category, note] of SEED) {
  console.log(description, amount);
}
```
:::

`tuple[str, float, ...]` becomes `[string, number, ...]`. The array-destructuring in the `for` loop is identical in spirit to Python's tuple unpacking — `[a, b] = pair`. (Honestly, beyond fixed pairs like `Map` entries, named objects usually read better than tuples; we use one here because the data is genuinely positional.)

## Objects vs Maps — the `dict` fork

This is the important one. A Python `dict` does two distinct jobs, and TypeScript splits them:

1. **A record with known, fixed keys** (a struct) → an **object literal**.
2. **A lookup table with dynamic keys added at runtime** → a **`Map`**.

:::compare run
```python
# (1) fixed-shape record
expense = {"id": 1, "description": "coffee", "amount": 3.5}
print(expense["description"])

# (2) dynamic lookup, keys not known ahead of time
totals = {}
totals["food"] = totals.get("food", 0) + 3.5
print(totals)
```
```typescript
// (1) object literal — dot access, fixed shape
const expense = { id: 1, description: "coffee", amount: 3.5 };
console.log(expense.description);   // dot, not ["..."]

// (2) Map — dynamic keys, real .get/.set, any key type
const totals = new Map<string, number>();
totals.set("food", (totals.get("food") ?? 0) + 3.5);
console.log(totals);
```
:::

Why it matters:

- **Object keys are always strings** (or symbols). `obj[1]` and `obj["1"]` are the same key. A `Map` can key on *anything* — numbers, objects, our `Category` enum — and remembers insertion order with a real `.size`, `.get`, `.set`, `.has`, `.delete`.
- Objects carry inherited properties from their prototype; iterating an object needs care (`Object.keys/values/entries`). A `Map` iterates cleanly.

Rule of thumb: **known shape → object; accumulating/dynamic keys → `Map`.** Our `Ledger.by_category()` builds a running total keyed by category, so it's a `Map`; an individual `Expense` has a fixed shape, so it's an object (and we'll give that shape a name — an `interface` — in the types lesson).

Access also differs: objects use dot notation (`expense.description`), and bracket access (`expense["description"]`) is reserved for dynamic string keys. Python only has `obj["key"]` for dicts and `obj.attr` for objects; TypeScript objects give you both, and dot is the default.

## Sets

Python's `set` is TypeScript's `Set` — same idea, method names differ:

:::compare run
```python
seen = set()
seen.add("food")
seen.add("food")
print("food" in seen, len(seen))
```
```typescript
const seen = new Set<string>();
seen.add("food");
seen.add("food");
console.log(seen.has("food"), seen.size); // true 1
```
:::

`x in seen` is `seen.has(x)`, `len` is `.size`. Build one from an array to dedupe: `new Set(items)`, and back to an array with `[...set]`.

## Destructuring and spread

Two pieces of syntax you'll use constantly. **Destructuring** pulls fields out by name or position; **spread** (`...`) copies/merges.

:::compare run
```python
# unpacking
description, amount, *_ = ("coffee", 3.5, "food", None)

# merge dicts
base = {"tls": False}
opts = {**base, "host": "db"}
print(description, amount, opts)
```
```typescript
// array destructuring (by position)
const [description, amount, ...rest] = ["coffee", 3.5, "food", undefined];

// object destructuring (by name) — no Python equivalent, hugely common
const { id, note } = { id: 1, note: "morning" };

// spread to merge / copy
const base = { tls: false };
const opts = { ...base, host: "db" };
console.log(description, amount, opts);
```
:::

Object destructuring — `const { id, note } = expense` — has no Python equivalent and is everywhere in real code (it's how you "unpack" a config object, an API response, a React prop). The spread `{ ...base, host: "db" }` is `{**base, "host": "db"}`; later keys win.

**File status:** ✅ `SEED` and its tuple type translated; collection types (`Map`, `Set`, array) chosen for the `Ledger`. ⏳ the functions that use them, the `Expense`/`Category` types, the class, async still Python. Next: strings, numbers, and the array methods that replace comprehensions.
