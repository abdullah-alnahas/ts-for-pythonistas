---
title: A store for any shape with an id
subtitle: class Store<T extends { id: number }> — and the realization that a generic checker takes the shape as a parameter
---

## Where we pick up

The app keeps tasks in an array and threads `tasks: Task[]` through every function. That works, but it's leaking a pattern: `findTask`, `addTask`, `completeTask` all do the same array bookkeeping — find by id, append, update — specialized to `Task`. The day we add a second kind of record (a `User`, a `Project`), we'd copy all of it, swapping `Task` for `User` line by line. That copy-paste is the wall this episode walks into, and the tool past it is generics: write the storage logic *once*, over an unknown type, and let the compiler specialize it at each use.

The callback writes itself, and it's the deepest one in the course. In episode 2 we hand-wrote `isTask` — a checker hardcoded to one shape. What would a checker that worked for *any* shape look like? It would have to take the shape as a *parameter*. That's exactly what `<T>` is: a type parameter. A generic is a checker — or a container, or a function — that takes the shape as an argument instead of baking it in.

## The wall: one Store per type

Here's the specialized version, the thing we'd be tempted to duplicate:

```typescript
class TaskStore {
  private items: Task[] = [];
  add(item: Task): void { this.items.push(item); }
  get(id: number): Task | undefined { return this.items.find((t) => t.id === id); }
  all(): Task[] { return this.items; }
}
```

Nothing in `add`, `get`, or `all` actually cares that the items are *tasks*. `push` works on any array. `find((t) => t.id === id)` needs only that each item has a numeric `id`. `all` just returns the array. The word `Task` appears five times, and in not one of them does the logic depend on a task's `title` or `status` — it depends only on "these are objects with an `id`." Write `UserStore` next week and it's the same five lines with `User` substituted. The type is a parameter we've hardcoded. Generics let us un-hardcode it.

## `<T>`: the shape as a parameter

You already met generics if you've used `Array<T>` or `Map<K, V>`. Declaring your own is the same: a type parameter in angle brackets after the name, then used wherever a concrete type would go.

:::compare
```python
from typing import TypeVar, Generic

T = TypeVar("T")

class Store(Generic[T]):
    def __init__(self) -> None:
        self.items: list[T] = []
    def add(self, item: T) -> None:
        self.items.append(item)
    def all(self) -> list[T]:
        return self.items
```
```typescript
class Store<T> {
  private items: T[] = [];
  add(item: T): void { this.items.push(item); }
  all(): T[] { return this.items; }
}
```
:::

`class Store<T>` declares a type parameter `T`. Inside, `items` is `T[]`, `add` takes a `T`, `all` returns `T[]` — the shape is referred to by name, not pinned to `Task`. At the use site you fill `T` in: `new Store<Task>()` makes a store of tasks, `new Store<User>()` a store of users, from the *same* class. This is Python's `Generic[T]` with `TypeVar`, written more tersely — `<T>` inline does the job of declaring the `TypeVar` and saying `Generic[T]` at once.

But there's a problem with the version above, and it's the one that makes generics interesting: `get(id)` needs to read `item.id`, and a bare `T` is opaque. The compiler knows `T` is *some* type but nothing about its shape, so `item.id` is rejected — it can't prove every possible `T` has an `id`. We need to *constrain* `T`.

## The constraint: `T extends { id: number }`

A bare `T` can be moved around but not inspected, because the class must type-check for *every* type someone might plug in, and most types have no `id`. To unlock `item.id`, you promise that every `T` will have one, with a constraint:

:::play
```typescript
class Store<T extends { id: number }> {
  private items: T[] = [];

  add(item: T): void {
    this.items.push(item);
  }

  get(id: number): T | undefined {
    return this.items.find((item) => item.id === id); // item.id is legal: T has an id
  }

  all(): T[] {
    return this.items;
  }
}

interface Task { id: number; title: string; status: "todo" | "doing" | "done"; }

const tasks = new Store<Task>();
tasks.add({ id: 1, title: "generic store", status: "todo" });
const found = tasks.get(1);                 // Task | undefined
console.log(found?.title ?? "not found");   // generic store
```
:::

`T extends { id: number }` reads as "T is any type whose shape includes a `number` field called `id`." Two things happen at once. The constraint *filters* which types may instantiate `Store` — try `new Store<{ name: string }>()` and the compiler rejects it, because that shape has no `id`. And it *tells the compiler the minimum shape* every `T` has, which is what makes `item.id` legal inside `get`: the compiler now knows that whatever `T` turns out to be, it has at least an `id: number`.

The trap, for a Python or Java reader, is the word `extends`. It does **not** mean "subclass." It means "assignable to," the [[structural|structural-typing]] relation from episode 4. `Task extends { id: number }` holds not because `Task` inherits from anything, but because `Task`'s *shape* includes an `id: number`. Any object with a numeric `id` satisfies the bound, declared kinship or not — this is Python's `TypeVar("T", bound=...)` under structural typing.

:::predict
Which of these instantiations compile against `class Store<T extends { id: number }>`?

```typescript
new Store<Task>();                          // Task has id: number
new Store<{ id: number; name: string }>();  // has id, plus extra
new Store<{ name: string }>();              // no id
new Store<number>();                        // a primitive
```

- ( ) All four — `extends` is advisory.
- ( ) Only `Store<Task>` — the constraint was written with tasks in mind.
- (x) The first two compile; the last two are rejected.
- ( ) Only the second — it matches `{ id: number }` most exactly.
:::answer
The first two compile; the last two are rejected. `Task` has an `id: number`, so it's assignable to `{ id: number }` and satisfies the bound — structurally, no inheritance required. `{ id: number; name: string }` also satisfies it: having *more* than the required `id` is fine (episode 4's "at least the required fields"). `{ name: string }` has no `id` and fails: *does not satisfy the constraint '{ id: number }'*. `number` is a primitive with no `id` property and fails too. The constraint is doing exactly the job episode 4 described — structural assignability — now as the gate on which types may parameterize the store. And inside the class, that same guarantee is what lets `get` read `item.id`.
:::

## The callback: a generic is a parameterized checker

Now the payoff. Put `isTask` from episode 2 next to `Store<T>` and look at the relationship.

`isTask(value)` was a checker hardcoded to one shape: it checked for `id`, `title`, `status`, those exact fields, baked into the function body. If you wanted to check a `User`, you'd write a brand-new `isUser` with the same defensive boilerplate and different fields. The shape was *fixed in the code*.

A *generic* lifts the shape out of the code and into a parameter. `Store<T extends { id: number }>` says "I work for any shape `T`, as long as it has an `id`" — the shape isn't baked in, it's supplied at the use site. `<T>` **is the mechanism for taking the shape as an argument.** The constraint `extends { id: number }` is the part of `isTask` that says "must at least have these fields," generalized: it's the *minimum* requirement, leaving the rest of the shape free.

So the thing you would have wished for in episode 2 — "I don't want to rewrite `isTask` for every type; I want one checker that takes the shape as a parameter" — is precisely what generics give you, at the type level, at compile time. `Store<Task>` and `Store<User>` are the one piece of logic, specialized by the compiler to each shape, the way a single generic `isTask<T>` would be specialized to each value's expected type. The hand-built checker couldn't do this without macro-like code generation; the compiler does it from one type parameter.

:::quiz
In episode 2 you wrote `isTask` and would have written a separate `isUser`, `isProject`, etc. — one hand-coded checker per shape. Explain precisely how `Store<T extends { id: number }>` is the generalization of that situation, and what the `extends { id: number }` constraint corresponds to in the hand-written checkers.
:::answer
The hand-written checkers shared a *structure* — guard the value is an object, then check a fixed list of fields — and differed only in *which* fields they checked. That "which fields" was hardcoded into each function body, forcing one function per shape. `Store<T>` factors the shape out into a type parameter `T`: the storage logic is written once over an unknown `T`, and the *specific* shape is supplied at each use site (`Store<Task>`, `Store<User>`), exactly the de-duplication you wanted but never got from copy-pasting `isTask`. The `extends { id: number }` constraint corresponds to the *common, required* part every hand-checker verified — in `Store`'s case, "is an object with a numeric `id`," which is the minimum the storage logic depends on (it reads `item.id` in `get`). It plays the role of the shared early guards in `isTask` (the part that's the same across `isTask`/`isUser`/`isProject`), while leaving the type-specific fields unconstrained, because the store doesn't care about them. One difference to keep honest: `Store<T>` specializes at *compile time* and the type vanishes at runtime, whereas `isTask` ran at runtime over real values — same "parameterize over the shape" idea, the recurring two-machines distinction from episode 3.
:::

## How `<T>` runs: erasure, not monomorphization (the C++/Java contrast)

This is the sharpest cross-language point of the episode, and it explains a lot of TypeScript's behaviour. There are two ways a language can implement generics, and TypeScript and C++ sit at opposite ends.

**C++ templates monomorphize.** `std::vector<int>` and `std::vector<string>` cause the compiler to *generate two separate concrete classes* at compile time — real, distinct machine code for each type argument. The type information is baked into the emitted binary; `vector<int>` and `vector<string>` are genuinely different code. This is fast and type-specialized, at the cost of code bloat (every instantiation is its own copy) and slow compiles.

**TypeScript erases.** `Store<Task>` and `Store<User>` compile to the *same* JavaScript — a single `Store` class with no type information at all. `<T>`, the constraint, every type argument: all [[erased|type-erasure]] before the program runs, exactly like every other type in this course. At runtime there is one `Store`, and it has no idea whether it holds tasks or users.

**Java erases too** — Java generics are famously implemented by erasure (`List<String>` and `List<Integer>` are both just `List` at runtime), which is the model TypeScript follows. The consequence is the same in both: you cannot ask, at runtime, "what was `T`?" There's no `T` left to ask about. In our `Store`, you cannot write a runtime check like "is this a `Store<Task>`?" — the type argument is gone. If you need to know an item's shape at runtime, you're back at the boundary, running a value-level check (`isTask`) on the actual object, because the type that would have told you was erased.

:::compare
```python
# Python generics are also erased at runtime — T is hints only
store: Store[Task] = Store()
# at runtime there's just a Store; the [Task] is invisible to the interpreter
```
```typescript
const store = new Store<Task>();
// compiles to: const store = new Store();  — the <Task> is gone
```
:::

Python is in the same camp as TypeScript and Java: type parameters are erased, present only for the checker, invisible at runtime. C++ is the outlier, baking types into the binary. The practical upshot for you is the recurring one: a generic gives you complete compile-time safety over the shape and *nothing* at runtime, so anything that has to decide a shape while the program runs — the I/O boundary — still needs the value-level checker we built in episode 2.

## Recap

- Specializing storage logic per type (`TaskStore`, `UserStore`) is duplication; the logic depends only on "objects with an `id`," not on the specific type.
- `class Store<T>` declares a **type parameter** — the shape supplied at the use site, not baked in. It's Python's `Generic[T]` / `TypeVar`, written inline.
- A bare `T` is opaque; `T extends { id: number }` **constrains** it — `extends` means [[structurally assignable to|structural-typing]], not subclass — which both filters valid type arguments and unlocks `item.id` inside the class.
- **The callback:** a generic is a parameterized checker. `<T>` is the mechanism for taking the shape as an argument — exactly what you wished for when you'd have had to write `isTask`, `isUser`, `isProject` by hand. The constraint is the shared "must at least have these fields" part, generalized.
- Implementation: TypeScript and Java/Python **erase** generics (one `Store` at runtime, no `T`); C++ **monomorphizes** (a separate concrete class per type argument). Erasure means no runtime knowledge of `T` — so shape decisions at runtime still need a value-level check.

Next episode: the app's functions deserve the same care as its data. Function *types*, optional and default and rest parameters, typed command handlers, and a `Command` type that ties the operations together — contrasted with Python's `*args`/`**kwargs`.
