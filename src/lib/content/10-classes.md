---
title: Classes
subtitle: A familiar shape, still matched structurally, plus modifiers Python only fakes
---

## Where the analogy mostly holds

Lesson 09 ended on `this`: a parameter the compiler tracks but [[the runtime binds at the call site|this-binding]], unlike Python's explicit `self`. Classes are where `this` lives, so this is the natural place to continue — and most of the surface here will feel familiar. `class`, fields, methods, inheritance, getters, statics: all roughly where a Python developer expects them. The parts worth your attention are the three places the familiarity is misleading. A class type is still matched by shape, so a plain object can stand in for an instance. `private` is enforced by the checker and then [[erased|type-erasure]], so it buys you nothing at runtime. And class fields initialize with define semantics, not assignment, which quietly diverges from how Python populates an instance `__dict__`. We start with the shape that lines up, then spend the lesson on the three that don't.

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

Three differences are visible before we touch the type system:

- **Fields must be declared.** The `x: number; y: number;` lines are not optional. Drop them and assigning `this.x = x` in the constructor is an error (`TS2339: Property 'x' does not exist on type 'Point'`). Python builds the instance `__dict__` from whatever `__init__` assigns; TypeScript needs the field set fixed at the class declaration, because the instance type is derived from the declared members, not from tracing what the constructor happens to touch.
- **`new` is mandatory.** `Point(1, 2)` without `new` is an error. There is no `new` in Python — `Point(1, 2)` *is* the call that allocates and runs `__init__` — but in JavaScript a class is a function, and calling it without `new` would run the constructor body with `this` unbound. TypeScript rejects the bare call rather than let that reach the runtime.
- **`this`, not `self`, and implicit.** It isn't a parameter, so it never appears in the signature, and its [[call-site binding from Lesson 09|this-binding]] applies unchanged inside methods.

## Parameter properties collapse declare-and-assign

The declare-then-assign pattern above is exactly the boilerplate `@dataclass` removes in Python. TypeScript has its own shorthand, though it solves a narrower problem.

:::compare
```python
from dataclasses import dataclass

@dataclass
class Point:
    x: int
    y: int
    # also generates __init__, __eq__, __repr__
```
```typescript
class Point {
  constructor(
    public x: number,
    public y: number,
  ) {}
  // x and y are declared AND assigned from the params
}
```
:::

Prefixing a constructor parameter with an access modifier (`public`, `private`, `protected`, or `readonly`) tells the compiler to declare a field of that name and assign the parameter to it automatically. The two-line ceremony of declaring `x: number` and then writing `this.x = x` collapses into one. That is the full extent of the feature, and the difference from `@dataclass` is worth stating plainly: `@dataclass` also synthesizes `__init__`, `__eq__`, and `__repr__`, so two dataclasses with equal fields compare equal. Parameter properties generate nothing but the declaration and the assignment. Structural equality, ordering, a readable repr — none of it appears. If you want value semantics you write them yourself, or reach for a library.

## Access modifiers are real until the types are erased

Python privacy is a social contract: a leading underscore signals intent, and `__x` triggers name mangling to `_ClassName__x`, which discourages collisions but is trivially reachable as `obj._ClassName__x`. TypeScript has `public`, `protected`, and `private` that the checker genuinely enforces. The catch is the one fact that has governed this whole course: types are checked, then [[erased|type-erasure]] (Lesson 01). `private` is a type-level annotation, so it lives entirely at compile time and leaves no trace in the emitted JavaScript.

```typescript
class Account {
  public id = "";          // default; accessible anywhere
  protected balance = 0;   // this class and subclasses
  private pin = "0000";    // this class only
  readonly created = Date.now(); // assignable in the constructor, never after

  reset() {
    this.created = 0; // TS2540: cannot assign to a read-only property
  }
}
```

`readonly` is the analogue of a frozen attribute, with a precise rule: the field may be assigned in its initializer or anywhere inside the constructor, and nowhere else. It is a compile-time guarantee, not a runtime one — nothing stops a write at runtime — and it is roughly what `@dataclass(frozen=True)` promises, except `frozen=True` actually raises `FrozenInstanceError` at runtime because it overrides `__setattr__`. `readonly` makes no such guarantee once the program runs.

The [[erasure|type-erasure]] of `private` has a consequence you can reach for directly. Consider how you would defeat it.

:::predict
`pin` is declared `private`, so `acc.pin` from outside the class is a compile error. You instead reach in with a string key — `acc["pin"]` — and the program runs. What do you get?

```typescript
class Account { private pin = "0000"; }
const acc = new Account();
acc["pin"]; // ?
```

- ( ) A compile error — bracket access is just sugar for dotted access, so `private` blocks it too.
- ( ) `undefined` at runtime — the field is renamed under the hood, the way Python mangles `__x`.
- (x) `"0000"`, and it even type-checks — the field is an ordinary property and the bracket form isn't guarded.
- ( ) A `TypeError` thrown by the runtime when the private field is touched from outside.
:::answer
`"0000"`. Two things are true at once. At runtime the field is a perfectly ordinary property named `pin`, because `private` was [[erased|type-erasure]]; the bracket access reaches it like any other. And at compile time, element access with a string literal is *not* checked against `private` the way dotted access is — `acc.pin` is rejected with `TS2341`, but `acc["pin"]` passes the type checker with no cast at all. So the privacy is enforced for the one syntax (`.pin`) and silently bypassed by the other (`["pin"]`). The lesson: `private` is a checker convention on dotted access, not an access control mechanism. For privacy that the runtime itself enforces, you need a different kind of field.
:::

That different field is the ECMAScript private field, written with a leading `#`. It is a JavaScript language feature, not a TypeScript one, so it survives [[erasure|type-erasure]] intact: `#secret` is not a string-keyed property at all, there is no `"#secret"` entry to look up, and reading `obj.#secret` from outside the declaring class is a syntax error the parser rejects. The two privacies are not two flavors of the same thing — they operate on different layers.

:::play
```typescript
class Account {
  private pin = "0000"; // checker-only: erased, then an ordinary property
  #secret = "1234";     // a real JS private field, no string key exists
  peek() { return this.#secret; } // only the class can read it
}

const acc = new Account();
console.log(acc["pin"]); // "0000" — bracket access slips past the private check
console.log(acc.peek()); // "1234" — #secret reachable only from inside
```
:::

So `private` maps to [[mypy]]'s notion of privacy: a static check, advisory once the program runs. `#secret` maps to Python's `__x` mangling in spirit — both make the member awkward to reach from outside — but `#` is strictly stronger, because mangling only renames the key while `#` removes the string key entirely. There is genuinely no expression that retrieves `#secret` from outside `Account`.

## Structural typing reaches classes too

This is the place the familiarity misleads most. In Python, a class is a [[nominal|nominal-vs-structural]] type: [[mypy]] rejects a `dict` where a `Point` is expected, because being a `Point` means descending from `Point`. TypeScript carried [[structural typing|structural-typing]] (Lesson 03) all the way into classes. A class type is still a description of a shape, and the `new`, the constructor, and the class name contribute nothing to assignability.

:::predict
`show` is annotated to take a `Point` *instance*. You hand it a bare object literal with the right fields — never constructed, no class involved. Does it type-check?

```typescript
class Point { constructor(public x: number, public y: number) {} }
function show(p: Point) { return p.x + p.y; }

show({ x: 1, y: 2 }); // a bare object, never `new Point`
```

- ( ) Error — a `Point` parameter requires a value made with `new Point`, the way mypy requires a real instance.
- (x) Fine — the object has `x: number` and `y: number`, which is all `Point` means structurally.
- ( ) Fine, but only because object literals get a special exemption that named variables wouldn't.
- ( ) Error — class types are the one place TypeScript falls back to nominal checking.
:::answer
Fine. `Point` as a type is just `{ x: number; y: number }`, and the literal has exactly those members. The constructor, the `new`, the name `Point` — none of them enter the assignability check. This is the same rule as Lesson 03, now applied to a `class` declaration rather than an `interface`. It surprises people coming from [[mypy]] precisely because [[mypy]] would reject the dict; [[nominal typing|nominal-vs-structural]] makes class identity load-bearing, and [[structural typing|structural-typing]] does not.
:::

The class declaration does double duty: it produces a runtime value (the constructor function) and a compile-time type (the shape of its instances). Annotating a parameter as `Point` uses only the second, and the second is a structural shape like any other. A plain object satisfies it; so does an instance of an entirely unrelated class with matching public members.

There is exactly one built-in exception, and it follows from the previous section. Add a `private` (or `#`) member and the class stops being [[structurally|structural-typing]] matchable from outside.

:::quiz
`show({ x: 1, y: 2 })` is accepted where a `Point` instance is expected. Add a single `private id = 0` field to `Point` and the same call now fails to compile. One private field flips the whole rule — why?
:::answer
A `private` or `#` member acts as a [[nominal|nominal-vs-structural]] [[brand|branded-types]]. The compiler treats it as a member that *only* a value originating from that exact class declaration can possess, because the field's identity is tied to the declaration, not to its name. A bare object literal has no such origin, so it can never carry the [[brand|branded-types]] — and assignability fails. The mechanism is sharper than "matching members": two different classes that each declare `private id = 0` are also mutually incompatible. Same field name, same type, two declarations, two distinct [[brands|branded-types]]:

```typescript
class A { private id = 0; }
class B { private id = 0; }

let b: B = new A(); // TS2322: Type 'A' is not assignable to type 'B'. Types have separate declarations of a private property 'id'.
```

This is the deliberate way to force [[nominal typing|nominal-vs-structural]] in a [[structural|structural-typing]] system: give a class a private member and only its real instances will satisfy it.
:::

## Inheritance, abstract classes, and implements

Inheritance reads the way you expect, with one ordering rule that has teeth.

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
  constructor(private r: number) {
    super();           // must precede any use of `this`
  }
  area(): number {
    return Math.PI * this.r ** 2;
  }
}
```
:::

`extends` is single inheritance — no [[MRO|mro-c3]], no [[C3 linearization|mro-c3]], because there is no multiple inheritance to order. `abstract class` and `abstract` members line up with `ABC` and `@abstractmethod`: an abstract class cannot be instantiated (`new Shape()` is `TS2511`), and a concrete subclass that omits an abstract member is rejected (`TS2515`). The ordering rule is `super()`: in a subclass constructor it must run before any reference to `this`. The reason is mechanical. Subclass field initializers — including those generated by parameter properties like `private r` above — run immediately after `super()` returns, so before `super()` the instance's own fields don't exist yet, and the compiler refuses to let you read `this` into that gap (`TS17009`). Python is more forgiving: `super().__init__()` is an ordinary call you can place anywhere, and accessing a not-yet-set attribute raises `AttributeError` at runtime rather than being caught earlier.

`implements` is the piece with no clean Python equivalent, and its status is easy to overstate:

```typescript
interface Drawable { draw(): void }

class Sprite implements Drawable { // verified here, at the declaration
  draw() {}
}

function render(d: Drawable) { d.draw(); }
render(new Sprite());
render({ draw() {} }); // no `implements` anywhere, still accepted
```

`implements` is a checked assertion, not a requirement. It tells the compiler to verify, at the class declaration, that `Sprite` has everything `Drawable` demands — a useful early error if you forget a method. It does not create the compatibility. Because typing is [[structural|structural-typing]], any object with a `draw(): void` method satisfies `Drawable` whether or not its class said `implements`, which is why `render({ draw() {} })` compiles. This sits between Python's two options. Inheriting an `ABC` is explicit *and* load-bearing — you are [[nominally|nominal-vs-structural]] a subclass and must implement the abstract methods. A [[typing.Protocol|typing-protocol]] is implicit and [[structural|structural-typing]] — conformance is by shape, never declared. TypeScript's `implements` is explicit but *not* load-bearing: you may declare the conformance and have it checked, but the type relationship would hold without it.

## Getters, setters, and statics

The last familiar corner, with one gap to work around: TypeScript has no `@classmethod`, so how do you write an alternate constructor — the named factory you'd reach for `cls` to build? `get`/`set` are the [[descriptor|descriptor-protocol]]-backed accessors you know as `@property` and its setter, and `static` members hang off the constructor rather than the instance. The `fromF` factory below is the answer to the alternate-constructor question.

:::play
```typescript
class Temp {
  #c = 0;
  get fahrenheit(): number { return this.#c * 9 / 5 + 32; }
  set fahrenheit(f: number) { this.#c = (f - 32) * 5 / 9; }
  static fromF(f: number): Temp {
    const t = new Temp();
    t.fahrenheit = f;
    return t;
  }
}

const t = new Temp();
t.fahrenheit = 212;        // invokes the setter
console.log(t.fahrenheit); // invokes the getter -> 212
console.log(Temp.fromF(32).fahrenheit); // static factory -> 32
```
:::

A `get` with no matching `set` is read-only from outside: assigning to it is `TS2540`, exactly as a Python `@property` with no setter raises `AttributeError` on assignment — but again, the TypeScript version is a compile-time check, not a runtime guard. `static` corresponds to `@staticmethod`. There is no separate `@classmethod`: a static method already has the constructor in scope by name (`Temp` here), so the role `cls` plays — referring to the class to call a factory or another static — is filled by naming the class directly. The `fromF` factory above is the idiomatic stand-in for the alternate-constructor pattern you'd write as a `@classmethod` in Python.

## One last divergence: fields define, they don't assign

There is a subtlety that does not show up until you subclass, and it is the third misleading-familiarity case from the opening. Under a modern compile target, TypeScript class fields use *define* semantics — the field is installed with the equivalent of `Object.defineProperty` (the spec's `[[DefineOwnProperty]]`), which writes a fresh own property directly onto the instance — rather than *set* semantics, an ordinary assignment that would consult the [[prototype chain|prototype-chain]]. The difference is invisible until a subclass field collides with an inherited accessor.

:::predict
`Base` declares a `get x`/`set x` accessor pair. `Derived extends Base` declares `x = 2` as an instance field. Predict what `new Derived().x` returns and whether the base setter fires.

```typescript
class Base {
  get x(): number { return 1; }
  set x(v: number) { /* validate, log, etc. */ }
}
class Derived extends Base {
  x = 2; // ?
}
```

- ( ) `2`, and the base setter runs once with `2` — the field assignment routes through the inherited setter the way Python's data descriptor would.
- ( ) `1`, and the base setter fires — the field never installs because the accessor wins.
- (x) Neither happens as written — the compiler rejects the field with `TS2610` before any of this runs.
- ( ) `2`, and the base setter never fires, with no compile error.
:::answer
The compiler rejects it: `TS2610: 'x' is an accessor in Base, but is overridden here as an instance property`. The Python intuition is that `x = 2` in the subclass routes through the inherited setter — assigning `self.x` invokes an inherited data [[descriptor|descriptor-protocol]]. Under `[[Define]]` it does not: the field declaration defines a fresh own property with `Object.defineProperty`, which installs straight over the [[prototype's|prototype-chain]] accessor without ever calling it. Were the compiler to allow it, the base's setter would be silently dead. It doesn't allow it — TypeScript flags the collision and makes you say what you mean. If you suppress the error and run it: with the default `[[Define]]`, `new Derived().x` yields `2` and the base setter never fires; flip `useDefineForClassFields` to `false` and the same source yields `1` while the setter records the write — assignment, the Python behavior.
:::

So you have two intents and a modifier for each. If you really want a fresh own field, the explicit form is an accessor pair or a field on a non-accessor base. If you mean "the base already provides this, I'm only narrowing its type for the checker, don't emit anything," that is the `declare` modifier (`declare x: number`), which records the type and produces no field — the clean opt-out of `[[Define]]` when redefinition is exactly what you don't want.

## Recap

- Fields must be declared at the class; `new` is mandatory; `this` is implicit and [[binds at the call site|this-binding]] (Lesson 09).
- Parameter properties (`constructor(public x: number)`) collapse declare-and-assign, but generate none of `@dataclass`'s equality or repr.
- `public`/`protected`/`private` and `readonly` are checker-only and [[erased|type-erasure]]; bracket access (`acc["pin"]`) even slips past `private` at compile time. For runtime privacy use a `#field`.
- Class types are matched [[structurally|structural-typing]], the same rule as Lesson 03 — a plain object can stand in for an instance. A `private`/`#` member is the one built-in escape: it [[brands|branded-types]] the class [[nominally|nominal-vs-structural]] so only its real instances qualify.
- `extends` is single inheritance; `super()` must precede `this`; `abstract` ≈ `ABC`/`@abstractmethod`; `implements` is a checked assertion, not load-bearing.
- `get`/`set` ≈ `@property`; `static` ≈ `@staticmethod`, with the class name standing in for `cls`.
- Class fields use `[[Define]]`, not assignment: a subclass field would install over an inherited accessor instead of calling it, so the compiler blocks the collision (`TS2610`); `declare` is the opt-out when you only mean to narrow the type.

:::quiz
Both fields look private. Reaching in by string key, one of `acc["a"]` and `acc["#b"]` still returns its value at runtime and one does not. Which is which, and what mechanism makes the difference?

```typescript
class Acc {
  private a = 1;
  #b = 2;
}
const acc = new Acc();
```
:::answer
Only `#b`. `private a` is a compile-time annotation that gets [[erased|type-erasure]], so at runtime the instance carries an ordinary property `a`, and `acc["a"]` returns `1` — the checker only ever guarded the dotted form `acc.a`, and not even reliably (bracket access with a string literal is unchecked). `#b` is a real JavaScript private field: there is no string key `"#b"`, so `acc["#b"]` is `undefined`, and `acc.#b` from outside `Acc` is a syntax error the parser rejects outright. The difference is the layer each one lives on — `private` is a type-system convention, `#` is a runtime language feature that [[erasure|type-erasure]] can't touch.
:::

Everything in this lesson has a runtime footprint: constructors run, `#` fields exist, `static` members hang off real objects. The class declaration produced both a type and a value. Lesson 11 goes the other way — types computed from other types, [[conditional|conditional-types]] and [[mapped types|mapped-types]], an entire sublanguage that runs only during type-checking and emits nothing at all. Python has decorators and metaclasses for runtime metaprogramming; it has nothing for the compile-time-only kind that comes next.
