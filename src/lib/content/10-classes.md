---
title: Classes
subtitle: Familiar shape, but structural — plus modifiers Python fakes
---

## The basics line up

Classes are the most familiar area in the language — `class`, fields, methods, inheritance, all roughly where you'd expect. The interesting part is what *doesn't* carry over: a class type is still matched by shape, so a plain object can stand in for an instance; `private` is enforced by the checker but vanishes at runtime; and `this` keeps the call-site quirk from Lesson 09. Start with the shape that lines up, then chase the three that don't.

:::compare
```python
class Point:
    def __init__(self, x: int, y: int):
        self.x = x
        self.y = y

    def dist(self) -> float:
        return (self.x**2 + self.y**2) ** 0.5

p = Point(1, 2)
```
```typescript
class Point {
  x: number;
  y: number;

  constructor(x: number, y: number) {
    this.x = x;
    this.y = y;
  }

  dist(): number {
    return Math.hypot(this.x, this.y);
  }
}

const p = new Point(1, 2); // `new` is required
```
:::

Differences right away:

- **Fields must be declared** (`x: number;`) — you can't just assign `this.x` in the constructor and have it appear (under strict). Python infers attributes from `__init__`; TS wants them declared.
- **`new` is mandatory.** `Point(1, 2)` without `new` is an error. Python has no `new`.
- **`this`, not `self`**, and it's implicit (not a parameter) — see Lesson 09 for its quirks.

## Parameter properties — constructor shorthand

TS has a shortcut that collapses declare + assign, similar in spirit to a `@dataclass`.

:::compare
```python
from dataclasses import dataclass

@dataclass
class Point:
    x: int
    y: int
```
```typescript
class Point {
  constructor(
    public x: number,
    public y: number,
  ) {}
  // x and y are declared AND assigned automatically
}
```
:::

Prefixing a constructor param with an access modifier (`public`/`private`/`readonly`) auto-declares and auto-assigns it. It's the closest TS gets to `@dataclass` for the boilerplate, though `@dataclass` also generates `__eq__`/`__repr__` (TS gives you none of that).

## Access modifiers are real (mostly)

Python privacy is convention (`_x`) or name-mangling (`__x`). TS has enforced `public`/`protected`/`private` — but with a catch.

```typescript
class Account {
  public id: string = "";       // default; accessible anywhere
  protected balance = 0;        // this class + subclasses
  private pin = "0000";         // this class only
  readonly created = Date.now();// can't reassign after construction

  constructor() {
    this.created = 0; // ERROR even here? No — readonly allows set in constructor
  }
}
```

:::quiz
**Predict before you read on.** `pin` is declared `private`. You reach in from outside with a string key, bypassing the dotted access TS guards. What does `acc["pin"]` give you at runtime?

```typescript
class Account { private pin = "0000"; }
const acc = new Account();
acc["pin"]; // ?
```
:::answer
**`"0000"`** — the field is right there. `private` is **compile-time only**, erased like every type; at runtime the field is an ordinary property and the bracket access reaches it. TS only stops you at *compile* time via the dotted `acc.pin` syntax. For privacy that survives to runtime you need a genuinely different field — `#pin`.
:::

**Catch:** `private`/`protected` are **compile-time only** — erased like all types. At runtime the field is just a normal property, reachable via `obj["pin"]`. For *runtime* privacy use a `#field` (true JS private). Run this to see one field exposed and the other truly hidden:

:::play
```typescript
class Account {
  private pin = "0000"; // checker-only privacy
  #secret = "1234";     // real runtime privacy
  peek() { return this.#secret; } // the class itself can still read it
}

const acc = new Account();
console.log((acc as Record<string, unknown>)["pin"]);     // "0000" — reachable
console.log((acc as Record<string, unknown>)["#secret"]); // undefined — no string key exists
console.log(acc.peek());                                  // "1234" — only from inside
```
:::

So: `private` = "mypy-style enforced by the checker"; `#pin` = "actually inaccessible at runtime" (closer to Python's `__x` mangling, but stronger).

## Structural typing applies to classes too

`show` wants a `Point` *instance*. Predict whether a bare object literal with the same fields — no `new`, no class — is allowed through.

:::quiz
**Predict before you read on.** `show(p: Point)` expects a class instance. Does the plain object pass?

```typescript
class Point { constructor(public x: number, public y: number) {} }
function show(p: Point) {}

show({ x: 1, y: 2 }); // a bare object, never `new Point` — error or fine?
```
:::answer
**Fine.** A class type is still just a shape (Lesson 03), so any object with `x: number; y: number` satisfies `Point` — the `new`, the constructor, the class name are all irrelevant to assignability. This catches people because Python's mypy *rejects* a dict where a `Point` is expected. The exception comes next: add a `private` field and the rule flips.
:::

So TS compares classes **by shape**, not by name or inheritance. A plain object — or an unrelated class — can satisfy a class type. Run both forms:

:::play
```typescript
class Point { constructor(public x: number, public y: number) {} }

function show(p: Point) { return p.x + p.y; }

console.log(show({ x: 1, y: 2 }));   // OK! matches Point's shape
console.log(show(new Point(3, 4)));  // also OK
```
:::

(Exception: a class with `private`/`#` members is *not* structurally matchable by outsiders — the private brand makes it nominal. A deliberate trick to force nominal typing.) Contrast Python, where passing a dict to a `Point` parameter fails mypy.

:::quiz
Recall Lesson 03. `show({ x: 1, y: 2 })` is accepted where a `Point` *class instance* is expected. But add a `private id = 0` field to `Point` and the same call breaks. Why does one private field flip the rule?
:::answer
Structural typing normally compares classes by **shape**, so a plain object with matching public members satisfies a class type (Lesson 03's rule extends to classes). But a `private` (or `#`) member acts as a **nominal brand**: TS treats it as a member that *only* instances created from that exact class declaration can have, so no outside object — and no other class — can be structurally compatible. It's the one built-in escape from structural typing, used deliberately when you want a class to be matchable only by its real instances.
:::

## Inheritance, abstract, implements

:::compare
```python
from abc import ABC, abstractmethod

class Shape(ABC):
    @abstractmethod
    def area(self) -> float: ...

class Circle(Shape):
    def __init__(self, r: float):
        self.r = r
    def area(self) -> float:
        return 3.14159 * self.r ** 2
```
```typescript
abstract class Shape {
  abstract area(): number;
}

class Circle extends Shape {
  constructor(private r: number) { super(); }
  area(): number {
    return Math.PI * this.r ** 2;
  }
}
```
:::

Python's `ABC` makes the subclass relationship load-bearing; TS `abstract` shapes the contract but leaves compatibility structural.

- `extends` for inheritance; **`super()` must be called** in a subclass constructor before using `this`.
- `abstract class` / `abstract method` ≈ `ABC` / `@abstractmethod`.
- **`implements`** declares a class conforms to an interface — but because typing is structural, it's an *optional* assertion (a checked annotation), not required for compatibility:

```typescript
interface Drawable { draw(): void }
class Sprite implements Drawable {  // verified at the class definition
  draw() {}
}
```

This is purely a "check me now" aid; you can pass any `draw()`-having object where `Drawable` is expected regardless of `implements`. Python's `Protocol` works the same (implicit), while inheriting an `ABC` is explicit/required — TS `implements` sits in between (explicit but not load-bearing).

## Getters, setters, static

```typescript
class Temp {
  #c = 0;
  get fahrenheit() { return this.#c * 9 / 5 + 32; } // like @property
  set fahrenheit(f: number) { this.#c = (f - 32) * 5 / 9; }
  static fromF(f: number) { const t = new Temp(); t.fahrenheit = f; return t; }
}

const t = new Temp();
t.fahrenheit = 212;     // calls the setter
console.log(t.fahrenheit); // calls the getter -> 212
Temp.fromF(32);         // static, like @classmethod/@staticmethod
```

`get`/`set` ≈ `@property`/`@x.setter`; `static` ≈ `@staticmethod` (and there's no separate `@classmethod` — static methods just reference the class).

## Recap

- Fields must be **declared**; `new` is mandatory; `this` not `self`.
- **Parameter properties** (`constructor(public x: number)`) ≈ `@dataclass` boilerplate.
- `public`/`protected`/`private` are **compile-time only**; use `#field` for runtime privacy.
- Classes are matched **structurally** — unless they have private/`#` members (then nominal).
- `extends` + `super()`, `abstract` ≈ `ABC`, `implements` is an optional conformance check.
- `get`/`set` ≈ `@property`; `static` ≈ `@staticmethod`.

:::quiz
Both methods look private. Which one actually prevents `acc["secret"]` from working at runtime, and why?

```typescript
class Acc {
  private a = 1;
  #b = 2;
}
const acc = new Acc();
```
:::answer
Only **`#b`** is private at runtime. `private a` is a **compile-time-only** annotation — it's erased, so the field is a normal property and `acc["a"]` (or `(acc as any).a`) reaches it at runtime; TS only stops you at *compile* time via the `.a` syntax. `#b` is a real JavaScript private field — there is no string key for it, so `acc["#b"]` is `undefined` and `acc.#b` from outside the class is a syntax error. Use `#` when you need genuine encapsulation (e.g. hiding secrets), and `private` when a checker-level guard suffices.
:::

Classes earn their keep by having a *runtime* presence — real constructors, real `#` fields, things that exist when the program runs. Lesson 11 goes the opposite direction: types computed from other types, an entire sublanguage that runs only at compile time and leaves nothing behind at all.
