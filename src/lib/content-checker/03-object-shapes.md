---
title: Checking a shape
subtitle: checkObject turns a map of field-checkers into one checker — and that act is exactly what structural typing is
---

## Where we pick up

We have three primitive checkers and a vocabulary to write them in:

```typescript
type Result = { ok: true } | { ok: false; error: string };
type Checker = (value: unknown) => Result;

const checkString: Checker = (v) => typeof v === "string" ? ok() : err(`expected string, got ${typeof v}`);
const checkNumber: Checker = (v) => typeof v === "number" ? ok() : err(`expected number, got ${typeof v}`);
const checkBoolean: Checker = (v) => typeof v === "boolean" ? ok() : err(`expected boolean, got ${typeof v}`);
```

But the value we opened the course with wasn't a primitive. It was this:

```typescript
const incoming = { title: "buy milk", done: false };
```

To check it's a `Task` we have to ask several questions at once: is it an object at all? does it have a `title` that's a string? does it have a `done` that's a boolean? Three checks, anded together, plus a guard that the thing is even an object first. We could write `checkTask` by hand for this one shape. But we'd write `checkUser` next, and `checkOrder` after that, each one the same loop over different fields. The smell from Episode 2 is back, one level up: not repeated *checks*, but repeated *structure*. So instead of hand-writing one object checker, we'll write a function that *builds* an object checker from a description of its fields. That function is `checkObject`, and building it is the heart of this episode — because the way it works turns out to be the literal mechanism behind TypeScript's most distinctive idea.

## Describing a shape as data

The key move from Episode 2 was making a check a *value*. Now we cash that in. A `Checker` is a value, so we can put one in an object, keyed by field name:

```typescript
const taskShape = {
  title: checkString,
  done: checkBoolean,
};
```

This is a plain object whose values are checkers — a map from field name to "how to check that field." Its type is `Record<string, Checker>`: a [[mapped|mapped-types]] object where every value is a `Checker`. We'll call this a *shape*. It is data describing a type, the way a Python `TypedDict`'s annotations describe a shape — except here the description is an ordinary runtime object we can iterate, not a class annotation the runtime discards.

```typescript
type Shape = Record<string, Checker>;
```

## Building `checkObject`

Now the builder. `checkObject` takes a `Shape` and returns a `Checker` — a function that, given an unknown value, verifies it's an object with each field passing its checker. This is the first time we write a function that *returns* a checker, the higher-order pattern Episode 2 promised:

:::play
```typescript
type Result = { ok: true } | { ok: false; error: string };
type Checker = (value: unknown) => Result;
const ok = (): Result => ({ ok: true });
const err = (error: string): Result => ({ ok: false, error });
const checkString: Checker = (v) => typeof v === "string" ? ok() : err(`expected string`);
const checkBoolean: Checker = (v) => typeof v === "boolean" ? ok() : err(`expected boolean`);

type Shape = Record<string, Checker>;

function checkObject(shape: Shape): Checker {
  return (value) => {
    // Guard 1: is it even an object? (and not null — typeof null is "object")
    if (typeof value !== "object" || value === null) {
      return err(`expected object, got ${value === null ? "null" : typeof value}`);
    }
    // Guard 2: check each field against its checker.
    for (const key in shape) {
      const fieldResult = shape[key]((value as Record<string, unknown>)[key]);
      if (!fieldResult.ok) {
        return err(`field "${key}": ${fieldResult.error}`);
      }
    }
    return ok();
  };
}

const checkTask = checkObject({ title: checkString, done: checkBoolean });

console.log(checkTask({ title: "buy milk", done: false })); // { ok: true }
console.log(checkTask({ title: "buy milk", done: "no" }));  // field "done": expected boolean
console.log(checkTask({ title: "buy milk" }));              // field "done": expected boolean (missing → undefined)
console.log(checkTask("not an object"));                    // expected object, got string
console.log(checkTask(null));                               // expected object, got null
```
:::

Walk the mechanism, because every line earns its place. The guard does two jobs: `typeof value !== "object"` rejects primitives, and `value === null` rejects `null` — the wart from Episode 1, where `typeof null` lies and returns `"object"`. If we trusted `typeof` alone, `null` would slip past the guard and crash on field access. We handle it explicitly, exactly as promised.

Then the loop. For each field name in the *shape*, we pull that field's checker (`shape[key]`) and run it against the corresponding field of the *value* (`value[key]`). If any field fails, we return early with a message naming the field. If they all pass, the object passes. The `value as Record<string, unknown>` is a cast: we've proven at runtime that `value` is a non-null object, but the compiler still types it `object`, which has no indexable keys — so we tell it "treat this as a string-keyed bag of unknowns." The fields come out as `unknown`, which is exactly right: each field checker re-establishes the type of its own field. We never assume; we check, one field at a time.

Notice the missing-field case: `checkTask({ title: "buy milk" })` fails on `done`, because reading a missing key yields `undefined`, and `checkBoolean(undefined)` is `false`. A missing field and a field of the wrong kind fail the same way — which is correct for now. Episode 6 is where we'll care about the difference between "absent" and "present but wrong," when we model optional fields.

## This *is* structural typing

Stop and look at what `checkObject` actually decides. It never asks "is this value an instance of the `Task` class?" There is no class. It never asks "was this object constructed by a `Task` constructor?" It asks one thing: *does this value have these fields, of these kinds?* If yes, it's a Task — regardless of where the value came from, what made it, or what anyone called it.

That is [[structural typing]], and you just built its engine by hand. A type, to our checker, is a *shape* — a set of fields and their kinds — and a value belongs to the type if and only if it *has that shape*. The name is irrelevant. The origin is irrelevant. Only the structure is checked.

This is the largest single departure from Java and C++, and it's worth making the contrast sharp:

:::compare
```python
# Python with isinstance is NOMINAL — name/class based:
class Task:
    def __init__(self, title, done):
        self.title = title
        self.done = done

t = Task("buy milk", False)
isinstance(t, Task)   # True
isinstance({"title": "buy milk", "done": False}, Task)  # False — a dict is not a Task
```
```typescript
// Our checkObject is STRUCTURAL — shape based:
const checkTask = checkObject({ title: checkString, done: checkBoolean });

checkTask({ title: "buy milk", done: false });
// { ok: true } — it has the shape, so it IS a Task. Nobody had to "construct" it.
```
:::

In Java, `class Task` and `class Todo` with identical fields are *different types*; an assignment between them is a compile error even though every field lines up, because Java checks the *name*. C++ is the same — type identity is the declared type, and you reach for `dynamic_cast` to ask "is this *actually* a `Task*`?", which walks the class hierarchy. Both are [[nominal|nominal-vs-structural]] systems: identity is the name you gave the type. Python's `isinstance` is nominal too — a `dict` with the right keys is emphatically *not* a `Task` instance.

Our checker is the other thing entirely. It has no names to check against, only shapes, so it *can't* be nominal. And here is the reveal that lands fully in Episode 10: TypeScript's static type system makes the same choice our runtime checker is forced into. When `tsc` decides whether a value is assignable to `interface Task { title: string; done: boolean }`, it checks the value's *shape*, not its declared class. Two types with the same structure are the same type. The thing you'll feel as "TypeScript is weirdly loose about classes" is exactly the behavior of the `checkObject` you just wrote.

:::predict
Python developers know this as duck typing — "if it walks like a duck." Given `const checkTask = checkObject({ title: checkString, done: checkBoolean })`, what does `checkTask` say about an object that has the two required fields *plus an extra one*?

```typescript
checkTask({ title: "buy milk", done: false, priority: 9 }); // ?
```

- ( ) `{ ok: false }` — the extra `priority` field isn't in the shape, so it's rejected.
- (x) `{ ok: true }` — the shape's fields are all present and valid; extra fields are ignored.
- ( ) A runtime error — unknown keys aren't allowed.
- ( ) It depends on the order the fields were declared.
:::answer
`{ ok: true }`. Our loop iterates over the *shape's* keys, not the value's, so it only ever asks about `title` and `done`. An extra `priority` field is never inspected, so it can't cause a failure. This is exactly TypeScript's structural rule: a value is assignable to a type if it has *at least* the required members — extra properties are fine. (The one exception in `tsc` is "excess property checks" on object *literals* assigned directly, a deliberate typo-catching special case — but the underlying assignability relation is "has at least these fields," which is precisely what our loop computes. The duck has the right beak and feet; we don't care that it also has a hat.)
:::

## Composing checkers, which is the point

One detail is worth dwelling on: the field checkers in a shape can themselves be *any* checker — including one built by `checkObject`. Shapes nest:

:::play
```typescript
type Result = { ok: true } | { ok: false; error: string };
type Checker = (value: unknown) => Result;
const ok = (): Result => ({ ok: true });
const err = (e: string): Result => ({ ok: false, error: e });
const checkString: Checker = (v) => typeof v === "string" ? ok() : err("expected string");
const checkNumber: Checker = (v) => typeof v === "number" ? ok() : err("expected number");
function checkObject(shape: Record<string, Checker>): Checker {
  return (value) => {
    if (typeof value !== "object" || value === null) return err("expected object");
    for (const key in shape) {
      const r = shape[key]((value as Record<string, unknown>)[key]);
      if (!r.ok) return err(`field "${key}": ${r.error}`);
    }
    return ok();
  };
}

const checkUser = checkObject({
  name: checkString,
  address: checkObject({          // a checker nested inside a shape
    city: checkString,
    zip: checkNumber,
  }),
});

console.log(checkUser({ name: "Ada", address: { city: "London", zip: 90210 } })); // { ok: true }
console.log(checkUser({ name: "Ada", address: { city: "London", zip: "90210" } }));
// field "address": field "zip": expected number
```
:::

Because `checkObject` *returns* a `Checker`, and `checkObject` *takes* `Checker`s, it composes with itself to any depth. The error message even nests, tracing the path to the failing field. This is the combinator pattern arriving early: small checkers combine into bigger ones with no special machinery, just the uniform `Checker` type doing its job. Episode 9 makes this explicit; you're seeing the first instance of it.

## Recap

- A *shape* is data describing a type: `Record<string, Checker>`, a map from field name to how to check that field. Because a check is a value (Episode 2), a shape is just an ordinary object.
- `checkObject(shape)` is our first checker *builder*: it takes a shape and returns a `Checker` that guards "is it an object (and not null)?", then runs each field's checker against the matching field.
- The `null` guard is the Episode 1 wart paid off: `typeof null === "object"`, so we reject `null` explicitly before touching fields.
- What `checkObject` decides — "does this value have these fields of these kinds?", ignoring name and origin — *is* [[structural typing]]. It checks shape, not name. Java/C++/`isinstance` are [[nominal|nominal-vs-structural]]: identity is the declared class. TypeScript's static checker makes our checker's choice.
- Extra fields pass; only the shape's fields are inspected — the structural "has at least these members" rule.
- Object checkers nest, because the builder both takes and returns `Checker`s. Composition for free.

We've been writing shapes as runtime objects: `{ title: checkString, done: checkBoolean }`. But TypeScript already has a way to write down "an object with a string `title` and a boolean `done`" — the `interface`. The next episode lines up our runtime shape against the static `interface` it mirrors, and shows they are two encodings of the very same idea: one you can run, one the compiler runs for you.
