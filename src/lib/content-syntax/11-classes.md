---
title: Classes
subtitle: Constructors, fields, access modifiers, and the `this` rule that bites Python developers
---

TypeScript classes will feel familiar — `class`, methods, inheritance — with tighter syntax around fields and access, and one genuine hazard: `this` does not behave like Python's explicit `self`. We translate the `Ledger` class here: its fields, constructor, and the methods that don't need decorators yet.

## The basic shape

:::compare run
```python
class Ledger:
    def __init__(self) -> None:
        self._items: list = []
        self._next_id = 1

    def add(self, description: str, amount: float) -> dict:
        item = {"id": self._next_id, "description": description, "amount": amount}
        self._items.append(item)
        self._next_id += 1
        return item

ledger = Ledger()
print(ledger.add("coffee", 3.5))
```
```typescript
class Ledger {
  private items: Expense[] = [];
  private nextId = 1;

  add(description: string, amount: number): Expense {
    const item: Expense = { id: this.nextId, description, amount } as Expense;
    this.items.push(item);
    this.nextId += 1;
    return item;
  }
}

const ledger = new Ledger();
console.log(ledger.add("coffee", 3.5));
```
:::

Differences to register:

- **Fields are declared**, not invented inside `__init__`. `private items: Expense[] = []` declares the field, its type, and its initial value at class scope. There's no `self.whatever = ...` springing a new attribute into existence.
- **`__init__` is `constructor`**; you call it with `new Ledger()`. The `new` keyword is required.
- **`self` is `this`, and it's implicit** — methods don't take it as a first parameter. You write `add(description, amount)`, not `add(self, ...)`, and refer to fields as `this.items`.
- Method definitions drop the `function` keyword inside a class body.

## Access modifiers

Python signals "private" with a leading underscore and trusts you. TypeScript has real keywords the compiler enforces:

| | Python | TypeScript |
|---|---|---|
| public (default) | `self.x` | `x` |
| private (convention) | `self._x` | `private x` — compile error to access outside |
| private (hard) | `self.__x` (name-mangled) | `#x` — truly private, enforced at runtime too |
| read-only | `@property` w/o setter, or `frozen` | `readonly x` |

```typescript
class Account {
  readonly id: number;       // settable in constructor, immutable after
  private balance = 0;       // compile-time private
  #pin = "0000";             // runtime-private (the JS-native form)
  constructor(id: number) { this.id = id; }
}
```

`private` is checked by `tsc` but erased at runtime (it's a type-level promise); `#field` is JavaScript's own private syntax, enforced even at runtime. Both are fine; `private` is more common in TypeScript-first code.

## Parameter properties: the constructor shorthand

A very common pattern — assigning constructor arguments straight to fields — has dedicated syntax. Prefix a constructor parameter with an access modifier and TypeScript declares *and* assigns the field for you. This is the closest thing to a `@dataclass` for a class with behavior:

:::compare run
```python
class Point:
    def __init__(self, x: float, y: float):
        self.x = x
        self.y = y

p = Point(1, 2)
print(p.x, p.y)
```
```typescript
class Point {
  constructor(public x: number, public y: number) {}
  // declares this.x, this.y AND assigns them — no body needed
}
const p = new Point(1, 2);
console.log(p.x, p.y);
```
:::

## Inheritance, `implements`, `abstract`

`extends` for inheritance, `super` for the parent, `implements` to promise an interface (a constraint with no Python equivalent, since TS interfaces are structural), and `abstract` for classes that can't be instantiated:

```typescript
abstract class Shape {
  abstract area(): number;          // subclasses must implement
  describe(): string { return `area ${this.area()}`; }
}
class Circle extends Shape implements Comparable {
  constructor(private r: number) { super(); }
  area(): number { return Math.PI * this.r ** 2; }
}
```

`super().__init__()` is `super()`; method override is implicit (no decorator), though `override` can be required as a safety check.

## The `this` hazard

Here is the one that costs Python developers an afternoon. In Python, `method` and `obj.method` both carry the instance — `self` is explicit and always bound. In TypeScript, `this` is determined by **how a method is called**, not where it's defined. Detach a method from its object and `this` is lost:

:::compare run
```python
class Counter:
    def __init__(self): self.n = 0
    def tick(self): self.n += 1; return self.n

c = Counter()
f = c.tick      # bound method — still knows self
print(f())      # 1
```
```typescript
class Counter {
  n = 0;
  tick() { this.n += 1; return this.n; }
  tickArrow = () => { this.n += 1; return this.n; }; // bound to instance
}
const c = new Counter();
const f = c.tick;        // detached — `this` is now undefined
// f();                  // crash: cannot read 'n' of undefined
console.log(c.tickArrow()); // arrow field stays bound: 1
```
:::

When you pass a method as a callback (`onClick={this.handle}`, `arr.forEach(this.process)`), it gets detached and `this` breaks. The fixes: define the method as an **arrow-function field** (`tick = () => {...}`, permanently bound), or bind at the call site (`this.tick.bind(this)`). The full mechanics are in [[this binding|this-binding]]; the working rule is *use arrow fields for methods you'll pass as callbacks.*

## Translating the `Ledger` methods

The methods that don't need a decorator translate directly. `dict.get(k, default)` becomes `map.get(k) ?? default`; the comprehension-style accumulation uses the `Map` and `Set` from the collections lesson:

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

  all(): Expense[] {
    return [...this.items];
  }

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
}
```

**File status:** ✅ `Ledger` fields, constructor, and `add`/`all`/`categories`/`byCategory` translated. ⏳ `total` and `describe` (they need decorator syntax), plus async. Next: decorators — and the `@property`/`@staticmethod` we deferred.
