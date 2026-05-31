---
title: Decorators and metadata
subtitle: Why most Python decorators map to plain language features, and what TypeScript decorators actually are
---

Python developers reach for decorators constantly — `@property`, `@staticmethod`, `@dataclass`, `@app.route`. The trap when coming to TypeScript is assuming `@decorator` means the same thing. It mostly doesn't. **Most of the Python decorators you use every day correspond to built-in TypeScript syntax, not to TypeScript decorators.** This lesson sorts out which is which, and translates our spine's `@property total` and `@staticmethod describe`.

## The decorators that are really language features

`@property` and `@staticmethod` aren't general metaprogramming in spirit — they're how Python spells features other languages build into the class syntax. TypeScript has that syntax directly.

**`@property` → `get` / `set` accessors.** A getter is a method that's called like a field. This is our `Ledger.total`:

:::compare run
```python
class Ledger:
    def __init__(self):
        self._items = [3.5, 1200, 55]

    @property
    def total(self) -> float:
        return sum(self._items)

ledger = Ledger()
print(ledger.total)     # accessed like a field, no ()
```
```typescript
class Ledger {
  private items = [3.5, 1200, 55];

  get total(): number {
    return this.items.reduce((sum, n) => sum + n, 0);
  }
}
const ledger = new Ledger();
console.log(ledger.total);   // no parentheses — reads like a field
```
:::

`@property` becomes the `get` keyword; the call site is identical (`ledger.total`, no parentheses). A settable property — `@x.setter` in Python — is a matching `set total(value: number) { ... }`.

**`@staticmethod` / `@classmethod` → `static`.** A method on the class itself, not an instance. This is our `describe`, which the control-flow lesson left as a standalone function — now it moves onto the class:

:::compare run
```python
class Ledger:
    @staticmethod
    def describe(category: str) -> str:
        match category:
            case "food": return "groceries and eating out"
            case "rent": return "a roof over your head"
            case _: raise ValueError(category)

print(Ledger.describe("rent"))   # called on the class
```
```typescript
class Ledger {
  static describe(category: string): string {
    switch (category) {
      case "food": return "groceries and eating out";
      case "rent": return "a roof over your head";
      default: throw new Error(`unknown: ${category}`);
    }
  }
}
console.log(Ledger.describe("rent"));  // called on the class
```
:::

`@staticmethod` is the `static` keyword; you call it as `Ledger.describe(...)`. Python's `@classmethod` (which receives `cls`) also maps to `static` — in TypeScript a static method can refer to the class by name or via `this` in static context.

**`@dataclass` → an `interface` (or a class with parameter properties).** There is no `@dataclass` equivalent, because TypeScript doesn't generate `__init__`/`__eq__`/`__repr__` for you. For pure data you write an `interface` (as we did for `Expense`); for data-with-behavior you write a class with the parameter-property shorthand from the last lesson. Equality and printing are not auto-generated — objects compare by reference, and you write your own formatting.

The takeaway: before assuming you need a TypeScript decorator, check whether the Python decorator was really just `get`/`set`/`static`/an interface. Usually it was.

## What TypeScript decorators actually are

TypeScript *does* have decorators — `@something` on a class, method, field, or accessor — but they're a distinct, heavier feature aimed at frameworks, not everyday code. They are functions that observe or modify the thing they're attached to, and you'll meet them mainly when a library asks you to:

```typescript
// Angular / NestJS / TypeORM style — the framework defines these
@Injectable()
class UserService {
  @Input() name!: string;
  @Get("/users")
  list() { /* ... */ }
}
```

Key facts to keep you oriented:

- They reached **Stage 3** of the JavaScript standard and ship in current TypeScript without special flags. Older code (and Angular) uses the *legacy* form enabled by `"experimentalDecorators": true` in `tsconfig` — the two have different signatures, which is a common source of confusion.
- Unlike Python decorators, they **cannot change the type signature** of what they decorate in the way you'd hope, and parameter decorators are limited. They're for cross-cutting concerns: dependency injection, route registration, ORM column mapping, validation metadata.
- You will *use* far more decorators than you *write*. Writing one is rare outside framework authorship.

So when you see `@Component` or `@Entity` in a TypeScript codebase, that's a framework decorator — genuinely analogous to `@app.route` or `@dataclass` in Flask/SQLAlchemy. But `@property` and `@staticmethod` were never that; they were syntax, and TypeScript gives you the syntax plainly.

## File status

With `total` (a getter) and `describe` (a static method) done, the `Ledger` class is fully translated. The complete class:

```typescript
class Ledger {
  private items: Expense[] = [];
  private nextId = 1;

  add(description: string, amount: number, category: Category, note?: string): Expense {
    const item: Expense = { id: this.nextId, description, amount, category, note };
    this.items.push(item);
    this.nextId += 1;
    return item;
  }

  get total(): number {
    return this.items.reduce((sum, item) => sum + item.amount, 0);
  }

  all(): Expense[] { return [...this.items]; }

  categories(): Set<Category> {
    return new Set(this.items.map((item) => item.category));
  }

  byCategory(): Map<Category, number> {
    const totals = new Map<Category, number>();
    for (const item of this.items) {
      totals.set(item.category, (totals.get(item.category) ?? 0) + item.amount);
    }
    return totals;
  }

  static describe(category: Category): string {
    switch (category) {
      case Category.Food: return "groceries and eating out";
      case Category.Rent: return "a roof over your head";
      case Category.Transport: return "getting around";
      case Category.Fun: return "the good stuff";
      default: {
        const unreachable: never = category;
        throw new Error(`unknown category: ${String(unreachable)}`);
      }
    }
  }
}
```

**File status:** ✅ the entire `Ledger` class translated. ⏳ only the runtime section — `loadSeed`, `main`, imports — and the module split remain. Next: modules.
