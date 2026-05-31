---
title: Classes, and when not to reach for one
subtitle: Access modifiers, implements, readonly — building TaskStore, and the case for plain objects in TypeScript
---

## Where we pick up

We've used `class Store<T>` already, leaning on the parts that look like Python. This episode covers what TypeScript adds on top: access modifiers that are actually checked, `implements` for conforming to an interface, `readonly` fields, and the constructor shorthand that removes most class boilerplate. We'll build the app's optional `class TaskStore` as the worked example. But the most useful thing in this episode is the last section, because the honest answer to "should this be a class?" in TypeScript is, more often than a Java or Python developer expects, *no* — and knowing why is part of writing idiomatic TypeScript.

## The class, and the access modifiers Java developers will recognize

A TypeScript class looks like Python's with annotations, plus three keywords on members — `public`, `private`, `protected` — that read exactly like Java and C++.

:::compare
```python
class TaskStore:
    def __init__(self) -> None:
        self._items: list[Task] = []   # "_" = private by convention only

    def add(self, item: Task) -> None:
        self._items.append(item)
```
```typescript
class TaskStore {
  private items: Task[] = [];          // private is enforced by the compiler

  add(item: Task): void {
    this.items.push(item);
  }
}
```
:::

Two differences from Python jump out. First, `this` instead of `self`, and it's implicit in the method signature — you don't list it as a parameter the way Python lists `self`. Second, and more substantive: `private` is *checked*. Python's leading-underscore `_items` is a convention; nothing stops `store._items` from outside. TypeScript's `private items` is a compile error if accessed from outside the class — *Property 'items' is private and only accessible within class 'TaskStore'*. This is Java's and C++'s `private`: an actual access boundary the compiler enforces, not a naming hint. `protected` is the same idea allowing subclasses, `public` is the default.

One honest caveat, the recurring theme of this course: `private` is a *compile-time* check, and it's erased. The emitted JavaScript has an ordinary property, reachable by anyone willing to ignore the types (or by code that never saw them). For a hard runtime privacy boundary, JavaScript has genuine private fields with a `#` prefix (`#items`) that are inaccessible outside the class *at runtime*. `private` is the type-level guarantee; `#` is the runtime one. Most app code uses `private` and is fine; reach for `#` when you need privacy that survives erasure.

## Constructor shorthand and `readonly`

TypeScript has a shorthand that collapses the most tedious class boilerplate — declaring a field, then assigning a constructor parameter to it. Put an access modifier on a constructor parameter and TypeScript declares *and* assigns the field for you:

:::play
```typescript
class Task {
  // These three parameters become fields automatically — declared and assigned.
  constructor(
    public readonly id: number,
    public title: string,
    public status: "todo" | "doing" | "done" = "todo",
  ) {}

  describe(): string {
    return `#${this.id} [${this.status}] ${this.title}`;
  }
}

const t = new Task(1, "use the shorthand");
console.log(t.describe());   // #1 [todo] use the shorthand
t.title = "rename me";       // ok — title is mutable
// t.id = 99;                // error: Cannot assign to 'id' because it is a read-only property.
```
:::

`public readonly id: number` in the constructor parameter list does three things at once: declares an `id` field, marks it `public` and `readonly`, and assigns the constructor argument to it. No `this.id = id` line needed. This is the most pleasant ergonomic win in TypeScript classes — the boilerplate that Python's `__init__` and Java's constructors force, gone. The `readonly` modifier means the field can be set once (in the constructor) and never reassigned — the field-level cousin of `const`, and the way you express Python's `@dataclass(frozen=True)` field-by-field. `status` even carries a default, the episode-9 default-parameter feature, used here for a field.

## `implements`: conforming a class to an interface

A class can declare that it satisfies an interface with `implements`. This is a *compile-time check* that the class has the interface's shape — it does not change the class's behaviour, only verifies it conforms.

```typescript
interface Describable {
  describe(): string;
}

class Task implements Describable {
  constructor(public readonly id: number, public title: string) {}
  describe(): string {                // must exist, or `implements` errors
    return `#${this.id} ${this.title}`;
  }
}
```

If `Task` lacked a conforming `describe`, the compiler would reject the `implements` clause, naming the missing or mismatched member. The subtlety a Java developer must absorb: because TypeScript is [[structural|structural-typing]], `implements` is *optional documentation*, not the thing that makes the class usable as a `Describable`. Any class with a `describe(): string` method is *already* a `Describable` — structurally — whether or not it says `implements`. In Java, a class must declare `implements Describable` to be used as one; in TypeScript the conformance is automatic by shape, and `implements` just asks the compiler to check it *early*, at the class definition, with a clearer error than you'd get at a far-away use site. Use it as a guardrail, not as a requirement.

:::predict
`Logger` does not say `implements Describable`, but has a matching method. Does the assignment compile?

```typescript
interface Describable { describe(): string; }

class Logger {                       // no `implements`
  describe(): string { return "log"; }
}

const d: Describable = new Logger(); // ?
```

- ( ) No — a class must `implements Describable` to be assignable to it.
- (x) Yes — `Logger` structurally has `describe(): string`, so it *is* a `Describable`.
- ( ) No — classes are nominal in TypeScript even though objects are structural.
- ( ) Only if `Logger` extends a common base class.
:::answer
Yes, it compiles. `Logger` has a `describe(): string` method, so its *shape* matches `Describable`, and TypeScript's structural typing makes it assignable to `Describable` regardless of the missing `implements` clause. This is the key difference from Java, where the assignment would require `Logger implements Describable` explicitly. In TypeScript, `implements` doesn't *create* the relationship — the shape does; `implements` only asks the compiler to verify conformance at the definition site (so you find out there, not at the use site). Classes are structural in TypeScript just like object literals are; there's no nominal exception for classes. The one quasi-nominal wrinkle is `private`/`protected` members, which *do* make two otherwise-identical classes incompatible — a deliberate carve-out so private state can't be duck-typed around.
:::

## The worked example: `class TaskStore`

Putting it together, the app's optional `TaskStore` — a class wrapping the storage and operations, with enforced privacy on the internal array:

:::play
```typescript
interface Task { id: number; title: string; status: "todo" | "doing" | "done"; }

class TaskStore {
  private items: Task[] = [];        // enforced private — no outside mutation
  private nextId = 1;

  add(title: string): Task {
    const task: Task = { id: this.nextId++, title, status: "todo" };
    this.items.push(task);
    return task;
  }

  complete(id: number): boolean {
    const task = this.items.find((t) => t.id === id);
    if (!task) return false;
    task.status = "done";
    return true;
  }

  filter(status: Task["status"]): Task[] {
    return this.items.filter((t) => t.status === status);
  }
}

const store = new TaskStore();
store.add("write episode 10");
store.add("review the draft");
store.complete(1);
console.log(store.filter("done"));  // [{ id: 1, title: "write episode 10", status: "done" }]
console.log(store.filter("todo"));  // [{ id: 2, title: "review the draft", status: "todo" }]
```
:::

The `private items` array is genuinely sealed: outside code can `add`, `complete`, and `filter`, but cannot reach in and corrupt `items` directly — the encapsulation Java developers expect, enforced by the compiler. Note `filter(status: Task["status"])` uses an *indexed access type*: `Task["status"]` is the type of the `status` field, i.e. `"todo" | "doing" | "done"`, derived from `Task` rather than rewritten — so if the status union ever changes, this signature follows automatically. That's a small preview of episode 11's type-from-type computation.

## When *not* to reach for a class

Here's the part that matters most, because the instinct a Java developer (and to a lesser extent a Python developer) brings is "model everything as a class," and in TypeScript that instinct is often wrong. Three reasons.

**Data is better as a plain type.** A `Task` is data — `id`, `title`, `status`. We modeled it as an `interface` and created tasks as object literals, *not* as `new Task(...)`. That's deliberate and idiomatic. A class for pure data adds a constructor, an instance prototype, and `instanceof` semantics you don't need, and — the practical killer — class instances don't survive `JSON.stringify`/`JSON.parse` as instances. Parse a stored task back and you get a plain object, not a `Task` instance; any methods are gone. Data that crosses the I/O boundary should be a plain shape (interface) so that a parsed object simply *is* a valid value, structurally, with no resurrection step. This is why the whole app models `Task` as an interface and only `Store`/`TaskStore` as classes.

**Behaviour is often better as functions.** Episode 9's `Command` handlers were plain functions over a `Task[]`, not methods on a class. That's frequently cleaner: functions are easier to test in isolation, easier to tree-shake, and don't carry `this`-binding hazards (a method pulled off its object loses its `this`; a plain function never does — the [[this-binding]] problem the classic course covers). Reach for a class when you have *state plus the operations that guard it* — exactly `TaskStore`, where the point is sealing `items` behind methods. Reach for functions when you have stateless transformations.

**`this` is a genuine hazard.** Python's `self` is explicit and stable; JavaScript's `this` is determined by *how a method is called*, not where it's defined, so `const c = store.complete; c(1)` loses `this` and breaks. Classes invite this bug; plain functions and closures sidestep it entirely. It's a real reason to prefer a closure-based store or plain functions for simpler cases.

The rule of thumb: **use a class when you have private state that operations must protect** (`TaskStore`), and prefer interfaces-plus-functions for data and stateless behaviour. TypeScript will not push you toward classes the way Java does; lean into that.

:::quiz
We modeled `Task` as an `interface` and create tasks with object literals, but modeled `TaskStore` as a `class`. Give the principled reason for each choice, and explain what specifically would break if we made `Task` a class and stored/loaded tasks via `JSON.parse`.
:::answer
`Task` is an `interface` because it's **pure data that crosses the I/O boundary** — created, serialized to JSON, parsed back. Modeling it as a structural shape means a parsed object simply *is* a valid `Task` (structural typing: shape is identity), with nothing to reconstruct. `TaskStore` is a `class` because it has **private state (`items`) that its operations must protect** — encapsulation is the entire point, and a class with `private` is the tool for sealing state behind methods. If `Task` were a class: `JSON.stringify(task)` produces a plain object (JSON has no notion of classes), and `JSON.parse` returns a plain object too — *not* a `Task` instance. So `parsed instanceof Task` is `false`, any methods defined on the class are gone, and if downstream code relied on those methods or on `instanceof`, it breaks silently — a parsed task looks right but isn't an instance. You'd have to manually re-instantiate (`new Task(parsed.id, ...)`) every loaded record, reintroducing exactly the boundary boilerplate we've been eliminating. Interfaces avoid all of it because they're erased and structural: the parsed object's shape is the only thing that matters, and at the boundary you check that shape with a runtime guard (episode 2's `isTask`), not with `instanceof`. This is the recurring lesson — data shapes belong in the erased, structural type system; classes are for runtime behaviour and state.
:::

## Recap

- TypeScript classes use `this` (implicit) and add compiler-enforced **access modifiers**: `private`/`protected`/`public`, a real boundary unlike Python's `_` convention. But `private` is erased — use `#field` for runtime privacy.
- **Constructor shorthand** (`constructor(public readonly id: number)`) declares and assigns fields in one line. `readonly` is the field-level `const` / `frozen=True`.
- **`implements`** checks conformance at the class definition, but is optional: structural typing makes any class with the right shape assignable to an interface anyway. It's an early guardrail, not a requirement (Java requires it; TypeScript doesn't).
- `class TaskStore` is the right use of a class: **private state protected by operations**. `Task["status"]` (indexed access) derives a field's type from the shape.
- **When not to use a class:** pure data → `interface` + literals (survives JSON, no `instanceof` traps); stateless behaviour → functions (testable, no `this` hazard). Use classes for state-plus-guarding-operations; prefer interfaces and functions otherwise.

Next episode: editing a task. `editTask(id, patch)` should accept *some* of a task's fields, not all — and the type for "some of `Task`" is `Partial<Task>`. We meet the utility types `Partial`, `Pick`, `Omit`, and `Record` — types computed *from* `Task` rather than written by hand, the type-level descendants of the checker we built field by field.
