---
title: Types — aliases, interfaces, unions, enums
subtitle: The four ways you name a shape, structural typing, and why none of it exists at runtime
---

So far we've leaned on inference. This lesson is about *declaring* types: giving a shape a name so the rest of the code can refer to it. It's the heart of the language, and it's where TypeScript diverges most from Python's `class`-and-annotation model. We translate our spine's `Category` enum and `Expense` dataclass here, finishing the data model.

## `type` aliases and `interface`

Two ways to name an object shape. For a plain record they're interchangeable; pick one and be consistent.

:::compare run
```python
from dataclasses import dataclass

@dataclass
class Expense:
    id: int
    description: str
    amount: float
    note: str | None = None

e = Expense(1, "coffee", 3.5, "morning")
print(e.description)
```
```typescript
interface Expense {
  id: number;
  description: string;
  amount: number;
  note?: string;   // optional, = string | undefined
}

const e: Expense = { id: 1, description: "coffee", amount: 3.5, note: "morning" };
console.log(e.description);
```
:::

A few things at once:

- An `interface` is a *description*, not a constructor. There's no `new Expense(...)`; you write an object literal that matches the shape. Unlike a `@dataclass`, it generates **no runtime code at all** — it's pure compile-time documentation (more on that below).
- `note?: string` is the optional field — the type-level version of the optional parameter, equivalent to `note: string | undefined`.
- The `type` alias form is `type Expense = { id: number; ... }`. Use `interface` for object shapes that might be extended or implemented; use `type` for everything else (unions, tuples, function types, primitives). See [[interface vs type|declaration-merging]] for the one real difference — interfaces merge across declarations, types don't.

A `type` alias names *any* type, not just objects — our tuple from the last lesson, for instance:

```typescript
type Seed = [string, number, Category, string | undefined];
```

## Structural typing: the big mental shift

This is the deepest difference from Python's runtime, and from nominal languages like Java. TypeScript checks types **by shape, not by name**. Anything with the right fields *is* an `Expense`, whether or not it was declared as one.

:::compare run
```python
# Python isinstance is nominal: it checks the actual class
@dataclass
class Expense:
    id: int
    description: str

class Other:
    def __init__(self):
        self.id = 1
        self.description = "x"

print(isinstance(Other(), Expense))  # False — different class
```
```typescript
interface Expense { id: number; description: string; }

// no 'implements', no inheritance — same shape is enough
const thing = { id: 1, description: "x", extra: true };
const e: Expense = thing;  // OK! thing has id+description, so it fits
console.log(e.description);
```
:::

If it has the required fields with the right types, it's accepted — this is [[structural typing|structural-typing]], and it's closer to Python's duck typing ("if it quacks like a duck") than to `isinstance`. It's why TypeScript interfaces feel lighter than Java classes: you rarely declare that a type implements an interface; it just has to fit. (The flip side: there's no built-in "this is a *different* `UserId` than that `OrderId`" — both are `number`. When you need that, see [[branded types|branded-types]].)

## Unions and literal types

A union type — `A | B` — says "one of these." You've seen it on `string | undefined`. Python's `typing.Union` / `X | Y` is the direct ancestor, and TypeScript leans on it far more heavily.

The powerful variant is the **literal union**: the allowed values are specific constants, not just types. This is how you model "one of these exact strings," and it's often better than an enum.

:::compare run
```python
from typing import Literal
Status = Literal["todo", "doing", "done"]

def set_status(s: Status) -> None: ...
set_status("done")
# set_status("nope")  # mypy error
```
```typescript
type Status = "todo" | "doing" | "done";

function setStatus(s: Status): void {}
setStatus("done");
// setStatus("nope"); // compile error: not assignable to Status
```
:::

The compiler knows the only legal values are those three strings, autocompletes them, and rejects anything else — with zero runtime cost. Combined with the exhaustive `switch` from the control-flow lesson, literal unions are the idiomatic way to model a closed set of options.

## Enums — and when to skip them

TypeScript has a real `enum` keyword, the closest match to Python's `Enum`. It's what our spine uses:

:::compare run
```python
from enum import Enum

class Category(Enum):
    FOOD = "food"
    RENT = "rent"
    FUN = "fun"

print(Category.FOOD.value)   # "food"
```
```typescript
enum Category {
  Food = "food",
  Rent = "rent",
  Fun = "fun",
}

console.log(Category.Food);   // "food"
```
:::

`Category.Food` carries the string value `"food"`. One thing to know: unlike everything else in this lesson, a (non-`const`) `enum` *does* emit runtime code — a real object you can iterate. Many teams prefer a literal union (`type Category = "food" | "rent" | "fun"`) precisely because it has zero runtime footprint and the same compile-time safety. We keep the `enum` in the spine because it matches the Python `Enum` one-to-one and reads well; just know the union alternative exists.

## None of this exists at runtime

The rule that ties the lesson together, and the biggest difference from Python: **types are erased.** `tsc` checks them, then deletes every interface, type alias, and annotation when it emits JavaScript. There is no `Expense` class to `isinstance`-check at runtime, no way to ask a value "what's your type" — the information is gone. This is [[type erasure|type-erasure]], and it's why you can't do `if (x instanceof Expense)` for an interface, and why runtime validation of external data needs a separate tool (we'll meet [[zod]] in the ecosystem lesson). Python keeps annotations around in `__annotations__`; TypeScript keeps nothing.

## Milestone: the data model in TypeScript

With `Category` and `Expense` done, the top of `ledger.ts` now stands fully translated:

```typescript
const CURRENCY = "$";
const WARN_OVER = 1000;

enum Category {
  Food = "food",
  Rent = "rent",
  Transport = "transport",
  Fun = "fun",
}

interface Expense {
  id: number;
  description: string;
  amount: number;
  category: Category;
  note?: string;
}

type Seed = [string, string | number, Category, string | undefined];
```

**File status:** ✅ data model (`Category`, `Expense`, `Seed`, constants) fully translated. ⏳ `parse_amount`, `find_first`, the `Ledger` class, and async still Python. Next: narrowing — proving to the compiler which type you've got.
