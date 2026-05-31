---
title: A reusable Store<T>
subtitle: Generics, the constraint that unlocks an id lookup, and why erased types let one class serve every shape
---

## Where we pick up

Look at what the app actually does with `tasks`. It pushes onto an array, finds one element by `id`, and reads them all back. Strip the word "task" out of those operations and nothing task-specific remains — "add an item, get one by id, list them all" is a *container*, and it would work identically for users, projects, or anything with an id. Right now that container is a bare `Task[]` plus three loose functions. This episode pulls it into one reusable thing:

```typescript
class Store<T extends { id: number }> {
  private items: T[] = [];
  add(item: T): void { this.items.push(item); }
  get(id: number): T | undefined { return this.items.find((it) => it.id === id); }
  all(): T[] { return this.items; }
}

const tasks = new Store<Task>();
```

The `<T>` is a generic type parameter, the same idea as Python's `TypeVar`. The interesting part is the constraint `T extends { id: number }`, because without it the `get` method can't compile — and seeing exactly why is the cleanest way to understand what constraints are *for*.

## A generic is a TypeVar

You parameterize the container over the element type, write the type once, and the compiler fills in the concrete type at each use site.

:::compare
```python
from typing import Generic, TypeVar

T = TypeVar("T")

class Store(Generic[T]):
    def __init__(self) -> None:
        self._items: list[T] = []
    def add(self, item: T) -> None:
        self._items.append(item)
    def all(self) -> list[T]:
        return self._items

# Python 3.12+ inline form, no TypeVar object:
class Store[T]: ...
```
```typescript
class Store<T> {
  private items: T[] = [];
  add(item: T): void { this.items.push(item); }
  all(): T[] { return this.items; }
}
```
:::

`<T>` after the class name declares the parameter; you then use `T` for the element type, the method argument, and the return. Python 3.12's `class Store[T]` is now nearly identical, down to dropping the separate `TypeVar` object. When you write `new Store<Task>()`, every `T` becomes `Task` for that instance: `add` takes a `Task`, `all` returns `Task[]`. One class definition, checked once, specialized at each instantiation. That's the entire value proposition — the lookup logic lives in one place and stays type-safe for whatever you store.

## The wall: `get` can't see `.id`

Add the `get(id)` method and the compiler refuses:

```typescript
class Store<T> {
  private items: T[] = [];
  get(id: number): T | undefined {
    return this.items.find((it) => it.id === id);
    // error TS2339: Property 'id' does not exist on type 'T'.
  }
}
```

This is the moment most Python developers underestimate, so it's worth dwelling on. An unconstrained `T` is *opaque*: the compiler knows it's some type but knows nothing about its shape, and it must make `Store` type-check for *every* possible `T` — `Store<number>`, `Store<string>`, `Store<() => void>`. Most types have no `.id`, so `it.id` can't be guaranteed safe, and the compiler rejects it. In Python the same code runs fine until a runtime `AttributeError`; the annotation `T` bought you nothing the interpreter enforces. In TypeScript an unconstrained `T` is genuinely unusable beyond storing and returning it — you can move a `T` around, but you can't *open* it. To read a member, you must first promise it exists.

## The reveal: the constraint unlocks the member

The promise is a constraint, written `T extends { id: number }`:

:::compare
```python
from typing import Protocol, TypeVar

class HasId(Protocol):
    id: int

T = TypeVar("T", bound=HasId)

class Store(Generic[T]):
    def get(self, id: int) -> T | None:
        return next((it for it in self._items if it.id == id), None)
```
```typescript
class Store<T extends { id: number }> {
  private items: T[] = [];
  get(id: number): T | undefined {
    return this.items.find((it) => it.id === id); // ok now
  }
}
```
:::

`T extends { id: number }` is precisely Python's `TypeVar("T", bound=HasId)`. It does two jobs at once. First, it *filters* which types may instantiate `Store`: only types whose shape includes an `id: number`. Second — and this is what fixes the error — inside the class the compiler now knows every `T` has an `id: number`, so `it.id` is legal. The constraint is the guarantee that holds for *every* instantiation, which is exactly what the compiler needed.

The word `extends` is a trap for anyone coming from Java. It does **not** mean "subclass." In a generic bound it means *assignable to* — the [[structural|structural-typing]] relation from episode 03, not inheritance. `Task` satisfies `{ id: number }` not because it was declared to extend anything, but because it *has* an `id: number` field. Any shape with an `id: number` qualifies, named or not.

:::predict
`Store<T extends { id: number }>`. Which of these instantiations compile?

```typescript
new Store<Task>();                       // Task has id: number
new Store<{ id: number; name: string }>();
new Store<{ name: string }>();
new Store<number>();
```

- ( ) Only `Store<Task>` — the constraint was written with `Task` in mind.
- ( ) All four — `extends` is advisory and TypeScript coerces to satisfy it.
- (x) The first two compile; the last two are errors.
- ( ) Only the first three — a `number` is fine because it's a primitive.
:::answer
The first two compile, the last two fail. `Task` has an `id: number`, and `{ id: number; name: string }` has one too (plus an extra field, which is fine — "at least what's required," episode 03). `{ name: string }` has no `id` at all, so it doesn't satisfy the bound: `error TS2344: Type '{ name: string; }' does not satisfy the constraint '{ id: number; }'`. And `number` is a primitive with no `id` property, so it's rejected the same way. The constraint reads as Python's `bound=HasId` under [[structural typing|nominal-vs-structural]]: "any type whose shape includes `{ id: number }`," never "any subclass." Note this is the same structural check from episode 03, now controlling which types are allowed to parameterize the generic.
:::

## Inference: you rarely write `<T>` at the call site

When you *use* a generic function, the compiler usually solves `T` from the arguments — you don't spell it out. The class case is slightly different (you write `new Store<Task>()` because there's no constructor argument to infer from), but the moment a method takes a `T`, inference kicks in:

```typescript
function firstOf<T>(items: T[]): T | undefined {
  return items[0];
}

firstOf([task1, task2]); // T solved as Task — no annotation written
firstOf([1, 2, 3]);       // T solved as number
```

The compiler matches the parameter type `T[]` against the argument type `Task[]` and concludes `T = Task` — this is [[unification|hindley-milner]], the same machinery Python's `TypeVar` enables a checker to perform after the fact. The practical gap: Python annotates and `mypy` confirms; TypeScript infers as you type and fills the type argument in for you. For our `Store`, we annotate the element type once at construction (`new Store<Task>()`) and inference handles everything downstream.

## Types vanish: erasure, and the three families' generics

Here is the through-line of the whole course, made concrete by generics. After `tsc` checks `Store<Task>`, it *erases* the type information and emits plain JavaScript — a single `Store` class with no `T`, no `Task`, no record that this instance was specialized. At runtime there is one `Store`; the `<Task>` existed only during checking. This is [[type erasure|type-erasure]], and the three language families handle it three different ways, which is worth holding side by side:

- **TypeScript** erases. `Store<Task>` and `Store<User>` are the *same* runtime class; the parameter is gone. You cannot ask, at runtime, "what `T` is this `Store`?" — the answer was discarded.
- **Java** also erases, for backward compatibility — `List<String>` and `List<Integer>` share one runtime `List` class, and `new T()` is famously impossible. TypeScript's erasure is the same shape of limitation, so the Java intuitions transfer directly: no runtime type tests on the parameter, no instantiating `T`.
- **C++** does the *opposite*: templates are **monomorphized** — the compiler stamps out a separate, fully-specialized `Store<Task>` and `Store<User>` at compile time, each a distinct type in the binary. More code, but the type is present at runtime.

The practical consequence for you: because TypeScript erases like Java, you can never branch on `T` at runtime (`if (T === Task)` is meaningless and won't compile), and a generic can't construct a `T` out of nothing. When you need runtime behavior that depends on the actual type, you pass a value or a tag, not the type parameter. This is the same fact episode 01 opened with — types are a compile-time checking artifact and are gone before anything runs — now shown at the level of generics.

## The app, as a generic store

:::play
```typescript
type TaskId = number;
type Status = "todo" | "doing" | "done";

interface Task {
  id: TaskId;
  title: string;
  status: Status;
  tags?: string[];
}

class Store<T extends { id: number }> {
  private items: T[] = [];
  add(item: T): void { this.items.push(item); }
  get(id: number): T | undefined { return this.items.find((it) => it.id === id); }
  all(): T[] { return this.items; }
}

const tasks = new Store<Task>();
tasks.add({ id: 1, title: "write the intro", status: "todo" });
tasks.add({ id: 2, title: "ship it", status: "doing", tags: ["urgent"] });

const t = tasks.get(1);              // Task | undefined — still must be narrowed
console.log(t?.title);               // write the intro
console.log(tasks.all().length);    // 2

// The same class, a different shape — works because User has an id: number:
interface User { id: number; name: string; }
const users = new Store<User>();
users.add({ id: 10, name: "Ada" });
console.log(users.get(10)?.name);   // Ada

// tasks.get(1) is Task | undefined, not Task — episode 06's rule still holds.
```
:::

The `Store<Task>` and `Store<User>` instances share one class definition, checked once. And `get` still returns `T | undefined` — generics produce that union (the element might not be found), they don't resolve it; narrowing it is the episode-06 rule, unchanged.

## Recap and what's next

- A generic `<T>` parameterizes a type or function over an unknown type — Python's `TypeVar` / `class Store[T]`. The compiler specializes each use site; for functions it usually [[infers|hindley-milner]] `T` from the arguments, so you rarely write it.
- An unconstrained `T` is opaque — you can move it but not open it, because the code must hold for every possible `T`.
- `T extends { id: number }` is a **bound** (`bound=`), [[structural|structural-typing]] not inheritance. It filters which types qualify *and* unlocks the members it promises — which is what lets `get` read `.id`.
- Types are [[erased|type-erasure]]: like Java (and unlike C++'s monomorphized templates), `Store<Task>` and `Store<User>` are one runtime class. No runtime test on `T`, no `new T()`.

We have a typed container. What we don't have yet is a typed account of the *operations* — `add`, `complete`, `edit`, `filter` are still loose functions or, worse, sketches. The next episode types the command handlers properly: function types, parameters and returns, optional and default and rest parameters, and a `Command` type that describes the shape of a handler itself — the place where Python's `*args`/`**kwargs` meet TypeScript's rest and optional parameters.
