---
title: Classes — an optional OO take
subtitle: Access modifiers, implements, and an honest account of why TypeScript code often skips classes entirely
---

## Where we pick up

We've actually been using a class since episode 07 — `Store<T>` is one. We reached for it without comment, because for a thing that holds private state and exposes methods, a class is the obvious tool. This episode makes that choice explicit and examines it. We'll write a `TaskStore` that `implements` a declared interface, learn the access modifiers and the constructor shorthand, and then — this is the part that matters — make the honest argument that TypeScript code often *shouldn't* reach for classes the way a Python or Java developer's reflex would. The two organizations sit side by side:

```typescript
// The interface that describes what a task store can do:
interface TaskRepository {
  add(item: Task): void;
  get(id: TaskId): Task | undefined;
  all(): Task[];
}

// A class implementing it — the OO take:
class TaskStore implements TaskRepository { /* ... */ }
```

Whether you write `TaskStore` or keep the generic `Store<Task>` plus free functions is a genuine design decision, not a settled best practice, and the goal here is to let you make it deliberately.

## Classes, with the parts that differ from Python

The class syntax will feel familiar coming from Python, with a few concrete differences:

:::compare
```python
class TaskStore:
    def __init__(self) -> None:
        self._items: list[Task] = []   # _ = convention only

    def add(self, item: Task) -> None:
        self._items.append(item)

    def get(self, id: int) -> Task | None:
        return next((t for t in self._items if t.id == id), None)
```
```typescript
class TaskStore {
  private items: Task[] = [];          // private = enforced by tsc

  add(item: Task): void {
    this.items.push(item);
  }

  get(id: TaskId): Task | undefined {
    return this.items.find((t) => t.id === id);
  }
}
```
:::

Three differences are worth stating. First, **`this` is explicit but not a parameter.** Python threads `self` through every method signature; TypeScript uses `this` inside the body but you don't declare it. (The mechanics of what `this` binds to at call time are genuinely tricky in JavaScript — a method pulled off its object loses its `this` — which is why arrow functions and `.bind` exist; see [[this-binding|this-binding]] if you hit it.) Second, **fields are declared**, not conjured by assignment in the constructor — `private items: Task[] = []` is a class field with a type and an initializer. Third, **access modifiers are real.** Python's leading underscore is a convention the runtime ignores; TypeScript's `private` is enforced by the compiler — `store.items` from outside is a compile error. There's also `#items`, JavaScript's *runtime*-private fields, which stay private even after erasure; `private` is compile-time only and the field is plain and accessible in the emitted JavaScript. The contrast spans the families: Python `_` (advisory), TypeScript `private` (compile-time enforced, erased), `#private` and Java/C++ `private` (runtime-enforced).

The **constructor shorthand** is a TypeScript convenience with no Python analogue — prefix a constructor parameter with an access modifier and it's automatically declared and assigned as a field:

```typescript
class TaskStore {
  constructor(private items: Task[] = []) {}
  // `private items` here both declares the field and assigns it — no `this.items = items` line.
}
```

That single line replaces a field declaration plus a `this.items = items` assignment. It's idiomatic and worth recognizing, especially in dependency-injection-heavy codebases where constructors take several injected services.

## `implements`: a structural promise, checked

`implements` asserts that a class provides everything an interface requires. The compiler verifies it at the class definition, so a missing or mis-typed method is an error *there*, not at some distant call site:

```typescript
interface TaskRepository {
  add(item: Task): void;
  get(id: TaskId): Task | undefined;
  all(): Task[];
}

class TaskStore implements TaskRepository {
  private items: Task[] = [];
  add(item: Task): void { this.items.push(item); }
  get(id: TaskId): Task | undefined { return this.items.find((t) => t.id === id); }
  all(): Task[] { return this.items; }
  // omit `all` and you get: error TS2420: Class 'TaskStore' incorrectly
  //   implements interface 'TaskRepository'. Property 'all' is missing.
}
```

This is Python's `Protocol` plus an explicit declaration that you mean to satisfy it. But here's the structural-typing twist that catches Java developers: in TypeScript, `implements` is *optional even when it's true*. Because the type system is [[structural|structural-typing]], any class that happens to have `add`, `get`, and `all` with the right signatures is *already* assignable to `TaskRepository` — whether or not it wrote `implements`. The keyword doesn't create the relationship; it only asks the compiler to check it early, at the class, as documentation and a guardrail. In Java, `implements` is load-bearing: without it the class is *not* the interface type, no matter its shape (episode 03's nominal-vs-structural split, now at the class level). In TypeScript it's a courtesy to your future self.

:::predict
You have `interface TaskRepository { add(...); get(...); all(...); }` and a class `MemoryStore` that defines all three methods correctly but does **not** write `implements TaskRepository`. A function expects a `TaskRepository`. Can you pass a `new MemoryStore()`?

- ( ) No — without `implements`, `MemoryStore` is not a `TaskRepository`.
- (x) Yes — structural typing makes it assignable on shape alone; `implements` is optional.
- ( ) Only if you cast it with `as TaskRepository`.
- ( ) Yes, but only at runtime; the compiler rejects it.
:::answer
Yes. TypeScript checks the *shape*: `MemoryStore` has `add`, `get`, and `all` with matching signatures, so it satisfies `TaskRepository` and is assignable wherever one is expected — the `implements` keyword is not required for the relationship to hold. This is the exact inverse of Java, where the relationship exists *only* if declared. Writing `implements` would still be worthwhile here, because it makes the compiler verify the match at the class definition (so a typo in a method name is caught there, not at the call site) and documents the intent — but it never changes whether the class *is* a `TaskRepository`. Its shape already decided that.
:::

## The honest case for not using a class

Here's the part the title promises. A class buys you encapsulated mutable state with methods that operate on it, plus inheritance and `instanceof`. The question is whether *this* app needs that, and the honest answer for a lot of TypeScript code is no — and the reasons are worth being precise about, because the reflex to use classes is strong in anyone coming from Python (where modules are class-shaped) or Java (where everything *must* be a class).

What the functional alternative — episode 08's `Store<Task>` plus free `addCmd`/`completeCmd`/`filter` functions — gives up and gains:

- **You give up nothing in type safety.** Both are equally checked; the types we've built work identically either way.
- **You gain easier testing and composition.** A free function `filterByStatus(tasks, status)` is trivial to test in isolation — no instance to construct, no `this` to worry about. Functions compose; methods are bound to their object.
- **You sidestep `this` entirely.** Method references that lose their binding are a real JavaScript footgun ([[this-binding|this-binding]]); free functions don't have the problem because there's no `this`.
- **It erases more cleanly into the functional, data-first style** that dominates modern TypeScript — plain objects as data, functions as transformations, which is also how the language's own array methods (`map`, `filter`, `reduce`) want you to work.

When a class *does* earn its place: when you have genuinely encapsulated state with invariants to protect (a connection pool, a state machine, a cache with eviction), when a framework asks for one (some expect class components or injectable services), or when modeling a domain where identity and lifecycle matter. `Store<T>` is a borderline case — it holds state and protects it with `private` — which is exactly why it's a reasonable class. But `TaskStore` adds little over `Store<Task>`, and the free command handlers add nothing a class would improve. The mature TypeScript instinct, unlike the Java one, is *reach for a function first; promote to a class when state or invariants demand it.*

This is a real divergence from both anchors. Java forces classes — there's no top-level function, so even a pure utility is a static method on a class. Python is class-friendly but not class-mandatory, and idiomatic Python already mixes functions and classes freely, which is closer to TypeScript's posture. If you're coming from Java, the advice is to *resist* the class reflex; if from Python, you'll find the balance familiar, just with `this` and access modifiers added.

## Both takes, side by side

:::play
```typescript
type TaskId = number;
type Status = "todo" | "doing" | "done";
interface Task { id: TaskId; title: string; status: Status; tags?: string[]; }

interface TaskRepository {
  add(item: Task): void;
  get(id: TaskId): Task | undefined;
  all(): Task[];
}

// The OO take: a class that implements the interface.
class TaskStore implements TaskRepository {
  constructor(private items: Task[] = []) {} // constructor-shorthand field
  add(item: Task): void { this.items.push(item); }
  get(id: TaskId): Task | undefined { return this.items.find((t) => t.id === id); }
  all(): Task[] { return this.items; }
}

// The functional take: free functions over a plain array. Same type safety.
function addTo(items: Task[], item: Task): void { items.push(item); }
function getFrom(items: Task[], id: TaskId): Task | undefined {
  return items.find((t) => t.id === id);
}

const store = new TaskStore();
store.add({ id: 1, title: "write the intro", status: "todo" });
console.log(store.get(1)?.title); // write the intro

const arr: Task[] = [];
addTo(arr, { id: 1, title: "write the intro", status: "todo" });
console.log(getFrom(arr, 1)?.title); // write the intro

// store.items — error: 'items' is private and only accessible within 'TaskStore'.
```
:::

Both print the same thing, both are equally type-checked. The class encapsulates; the functions compose. For *this* app, either is defensible — and recognizing that the choice is yours, rather than dictated by the language, is the actual lesson.

## Recap and what's next

- TypeScript classes: declared, typed fields; `this` used but not a parameter; **compiler-enforced** `private`/`protected`/`public` (vs Python's advisory `_`), plus `#private` for true runtime privacy. The **constructor shorthand** (`constructor(private x: T)`) declares-and-assigns in one line.
- `implements` is checked at the class — but it's *optional*, because [[structural typing|structural-typing]] makes any correctly-shaped class assignable to the interface regardless. The inverse of Java, where `implements` is mandatory for the relationship to exist.
- The honest default in modern TypeScript is **functions first, classes when state or invariants demand it** — you lose no type safety, gain testability and composition, and dodge [[this|this-binding]]. Java forces classes; Python is flexible; TypeScript leans functional.

We now have the full app twice over, fully typed. The last episode is the capstone: the utility types (`Partial`, `Pick`, `Omit`, `Record`) that let `editTask` accept a partial patch without a hand-written type, turning on the complete `strict` config, and a clear-eyed tour of the bugs types *still* can't catch — the JS-reality gotchas that send us off toward understanding why `tsc` can do any of this in the first place.
