---
title: Generics and utility types
subtitle: Type parameters, constraints, and the built-in transformers you'll use long before you write your own
---

Generics are the part of TypeScript that looks intimidating and is mostly mechanical. If you've used `TypeVar` in Python, you already have the model: a type parameter is a placeholder filled in per call. The difference is that TypeScript leans on generics far harder, the inference is better, and the standard library ships a set of generic *utility types* that do real work for you. We translate our spine's `find_first` here. This lesson is an overview — the deep machinery has its own glossary entries.

## Generic functions

A generic function declares a type parameter in angle brackets, then uses it in the signature. The caller almost never specifies it — the compiler infers it from the arguments.

:::compare run
```python
from typing import TypeVar, Callable

T = TypeVar("T")

def find_first(items: list[T], keep: Callable[[T], bool]) -> T | None:
    for item in items:
        if keep(item):
            return item
    return None

print(find_first([1, 2, 3], lambda n: n > 1))
```
```typescript
function findFirst<T>(items: T[], keep: (item: T) => boolean): T | undefined {
  for (const item of items) {
    if (keep(item)) {
      return item;
    }
  }
  return undefined;
}

console.log(findFirst([1, 2, 3], (n) => n > 1));
```
:::

The mapping is tight: `T = TypeVar("T")` plus its use becomes a `<T>` right after the function name. `Callable[[T], bool]` is a function type `(item: T) => boolean`. `T | None` is `T | undefined`. Call `findFirst([1,2,3], ...)` and the compiler infers `T = number`, so the return is `number | undefined` and the callback's `n` is a `number` — all without you writing `<number>` anywhere. That inference is the payoff: one definition, correctly typed at every call site.

## Constraints with `extends`

By default a type parameter could be anything, so you can't assume it has any properties. `extends` constrains it — Python's `TypeVar("T", bound=...)`:

:::compare run
```python
from typing import TypeVar
T = TypeVar("T", bound="HasId")  # T must have an id

def get_id(x: T) -> int:
    return x.id
```
```typescript
function getId<T extends { id: number }>(x: T): number {
  return x.id;   // allowed: every T is guaranteed to have id
}
getId({ id: 7, name: "x" }); // ok
// getId({ name: "x" });     // error: missing id
```
:::

`<T extends Shape>` means "any type assignable to `Shape`," which unlocks the members of `Shape` on `x` while still preserving the specific type that was passed in.

## Generic types and classes

Types and classes take parameters the same way. You've already used several: `Array<T>`, `Map<K, V>`, `Set<T>`, `Promise<T>` are all generic.

```typescript
interface Box<T> {
  value: T;
}
class Store<T> {
  private items: T[] = [];
  add(item: T): void { this.items.push(item); }
  all(): T[] { return [...this.items]; }
}
const s = new Store<Expense>();  // a store of Expenses
```

This is `Generic[T]` / `class Store(Generic[T])` from Python's `typing`, with friendlier syntax.

## Utility types: generics the standard library already wrote

Here's where TypeScript pulls ahead of mypy in daily use. The standard library ships generic types that transform other types. You'll use these constantly — long before you write a generic of your own. Given an `Expense`:

| Utility | Produces | Python analog |
|---|---|---|
| `Partial<Expense>` | all fields optional | `Expense` with every field `\| None`-ish |
| `Required<Expense>` | all fields required | — |
| `Readonly<Expense>` | all fields read-only | `frozen=True` dataclass |
| `Pick<Expense, "id" \| "amount">` | only those fields | — |
| `Omit<Expense, "note">` | all fields except those | — |
| `Record<string, number>` | an object with string keys, number values | `dict[str, float]` |
| `ReturnType<typeof parseAmount>` | the function's return type (`number`) | — |

```typescript
function updateExpense(id: number, patch: Partial<Expense>): void { /* ... */ }
updateExpense(1, { amount: 4 });   // patch only some fields, fully type-checked

type ExpenseSummary = Pick<Expense, "id" | "amount">; // { id: number; amount: number }
```

`Partial<T>` turning every field optional is the everyday one — it's how you type "a patch" or "options" object. These aren't magic; they're written in plain TypeScript using [[mapped types|mapped-types]] and [[conditional types|conditional-types]] (with [[infer]] for extraction). You can read and write your own once you need them, but reaching for the built-ins covers most cases.

When you do go deeper, the toolkit is: mapped types (`{ [K in keyof T]: ... }`) to transform every field, conditional types (`T extends U ? X : Y`) to branch on a type, and `infer` to pull a type out of another. That's the machinery behind the whole table above — but treat it as a "when you need it" topic, not a day-one one.

**File status:** ✅ `find_first` translated. The data model and all free functions are now TypeScript. ⏳ the `Ledger` class and the async section remain. Next: classes.
