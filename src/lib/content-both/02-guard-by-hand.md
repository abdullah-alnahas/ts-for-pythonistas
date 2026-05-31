---
title: A runtime checker, from scratch
subtitle: Build isTask and validateStatus by hand in plain JS — and see that a "type check" is just a function from a value to yes/no
---

## Where we pick up

Last episode we shipped a todo app with a silent bug: `task.state = "done"` created a stray field instead of updating `status`, and nothing complained. We ended on a question — what if, before trusting an object, we ran it past a function that answered *is this the shape a task is supposed to be?*

This episode we build that function. By hand, in plain JavaScript, starting from nothing. No type system, no library, no annotations — just a function that takes a value and returns `true` or `false`. By the end you'll have a working checker for the app's data, and, more importantly, the mental model that the whole rest of the course rests on: **a type check is a function from a value to a verdict.** Not a class. Not a framework. A function. We are going to build the simplest possible version of the thing TypeScript does, so that when we meet TypeScript you recognize it.

## The smallest check: one field

Start narrower than `isTask`. A task's `status` is supposed to be one of exactly three words: `"todo"`, `"doing"`, `"done"`. Anything else is invalid. Write the function that decides that, and nothing else:

```javascript
function validateStatus(s) {
  return s === "todo" || s === "doing" || s === "done";
}
```

That's the whole thing. It takes a value, returns a boolean. `validateStatus("done")` is `true`; `validateStatus("complete")` is `false`; `validateStatus(42)` is `false` because a number is `===` to none of those strings. In Python you'd write the same idea as `s in ("todo", "doing", "done")`, or reach for an `Enum` and check membership. The shape is identical: a value goes in, a yes/no comes out. Hold onto that — it's the atom. Every richer check we build is made of checks this small, combined.

:::compare
```python
def validate_status(s):
    return s in ("todo", "doing", "done")
```
```typescript
function validateStatus(s) {
  return s === "todo" || s === "doing" || s === "done";
}
```
:::

Note what `validateStatus` is *not*. It is not a type. It is not a declaration. It runs. It is ordinary code that executes when you call it, costs a few comparisons, and produces a value at runtime. Keep that fact in view; in two episodes it becomes the entire point.

## Checking a whole object: `isTask`

Now the real one. A task is an object with three required fields, each with its own expected kind:

- `id` — a number
- `title` — a string
- `status` — one of the three words (we already have the checker for that)

To ask "is this value a task?" we have to check, in order: is it even an object? does it have an `id` that's a number? a `title` that's a string? a `status` that passes `validateStatus`? Each of those is a small boolean test, and `isTask` is their conjunction. The tool for "what kind of value is this?" in JavaScript is `typeof`, which returns a string: `typeof 3` is `"number"`, `typeof "hi"` is `"string"`, `typeof {}` is `"object"`. We build the function one guard at a time.

```javascript
function isTask(value) {
  // 1. It must be a non-null object. typeof null is "object" (a JS wart),
  //    so we exclude null explicitly, and exclude arrays too.
  if (typeof value !== "object" || value === null || Array.isArray(value)) {
    return false;
  }
  // 2. id must be a number.
  if (typeof value.id !== "number") return false;
  // 3. title must be a string.
  if (typeof value.title !== "string") return false;
  // 4. status must be one of the allowed words. Reuse the atom.
  if (!validateStatus(value.status)) return false;
  // Every field checked out.
  return true;
}
```

Read it top to bottom; every line earns its place. The first guard is the one that surprises people, and it's worth pausing on. `typeof null` returns `"object"` — a bug baked into JavaScript in 1995 and never fixable without breaking the web. So `typeof value === "object"` is `true` for `null`, and if we didn't exclude `null` explicitly, the next line `value.id` would throw *Cannot read properties of null*. We also exclude arrays, because `typeof [] === "object"` too, and an array is not a task. This is the kind of defensive, paranoid detail that hand-written runtime checks are *full* of, and that's part of the lesson: doing this by hand means knowing every wart of the language's runtime.

The middle three guards are the substance. Each one reads a field and asks `typeof` whether it's the kind we expect. They're written as early returns — the moment any field fails, we bail with `false` — so by the time we reach the final `return true`, every field has been verified. This early-return-on-failure shape is exactly how you'd hand-validate a dict in Python:

:::compare
```python
def is_task(value):
    if not isinstance(value, dict):
        return False
    if not isinstance(value.get("id"), int):
        return False
    if not isinstance(value.get("title"), str):
        return False
    if not validate_status(value.get("status")):
        return False
    return True
```
```typescript
function isTask(value) {
  if (typeof value !== "object" || value === null || Array.isArray(value)) {
    return false;
  }
  if (typeof value.id !== "number") return false;
  if (typeof value.title !== "string") return false;
  if (!validateStatus(value.status)) return false;
  return true;
}
```
:::

The Python version uses `isinstance` where the JS version uses `typeof`, and `dict.get` where JS reads the property directly, but they are the *same function* — same structure, same guards, same verdict. This is the point worth saying out loud: every language gives you some way to write "value in, yes/no out," because every program eventually has to check the shape of data it didn't create. Python's `isinstance`, a Pydantic validator, a hand-written `is_task` — all the same idea at different levels of polish.

## Run it against the bug

Let's point the checker at the exact bug from episode 1 and at a few honest mistakes, and watch it earn its keep.

:::play
```typescript
function validateStatus(s: unknown): boolean {
  return s === "todo" || s === "doing" || s === "done";
}

function isTask(value: unknown): boolean {
  if (typeof value !== "object" || value === null || Array.isArray(value)) return false;
  const v = value as Record<string, unknown>;
  if (typeof v.id !== "number") return false;
  if (typeof v.title !== "string") return false;
  if (!validateStatus(v.status)) return false;
  return true;
}

const good = { id: 1, title: "ship it", status: "todo" };
const badStatus = { id: 2, title: "typo", status: "complete" };
const badId = { id: "3", title: "string id", status: "done" };
const notObject = "not even close";

console.log(isTask(good));      // true
console.log(isTask(badStatus)); // false — "complete" fails validateStatus
console.log(isTask(badId));     // false — id is a string, not a number
console.log(isTask(notObject)); // false — not an object at all
```
:::

Four values, four correct verdicts. The checker catches a bad status, a mistyped id, and a non-object — each at the moment we ask, by running real comparisons. We now have a tool that turns "I hope this object is a task" into "I have verified this object is a task."

## Where you'd actually call it

A checker you never call protects nothing. The place it pays off is the *boundary* — wherever data enters the program from somewhere you don't control. In our app the obvious one is loading saved tasks back from storage. Imagine the tasks were written to disk as JSON last session; today we read them back:

```javascript
function loadTasks(json) {
  const parsed = JSON.parse(json); // could be anything — JSON.parse trusts nobody
  const tasks = [];
  for (const item of parsed) {
    if (isTask(item)) {
      tasks.push(item); // verified — safe to use
    } else {
      console.warn("dropping malformed task:", item);
    }
  }
  return tasks;
}
```

`JSON.parse` returns whatever was in the string — a value of completely unknown shape, because the file could have been edited, corrupted, or written by an older version of the app. `isTask` is the gate: only objects that pass it make it into the `tasks` array. Everything downstream — `completeTask`, `listTasks` — can now trust the shape, because nothing reaches them unchecked. This is the discipline of runtime validation: **check at the edges, trust the inside.** Remember this boundary; it is the one place that, twelve episodes from now, still needs a runtime checker even after TypeScript has taken over everything else.

:::predict
We feed `loadTasks` a JSON string where one of the three saved objects has `status: "archived"`. The other two are well-formed. What does `loadTasks` return, and what does it log?

```javascript
loadTasks('[{"id":1,"title":"a","status":"todo"},{"id":2,"title":"b","status":"archived"},{"id":3,"title":"c","status":"done"}]');
```

- ( ) All three tasks — `isTask` only checks that `status` is a string, and `"archived"` is a string.
- (x) Two tasks, and it warns once about the `"archived"` item.
- ( ) It throws when it hits the `"archived"` item, returning nothing.
- ( ) Zero tasks — one bad item invalidates the whole array.
:::answer
It returns the two well-formed tasks and logs one warning, `dropping malformed task: { id: 2, title: "b", status: "archived" }`. `isTask` calls `validateStatus("archived")`, which compares it against the three allowed words, finds no match, and returns `false` — so that object is rejected and the loop moves on. Nothing throws, because we chose to *skip* invalid items rather than blow up; that's a policy decision the hand-written checker lets us make. The other two pass every guard and make it into the result. This is exactly the kind of partial-corruption case a boundary check exists for: one bad record doesn't poison the rest, and it doesn't sneak through either.
:::

## The mental model (say it plainly)

Here is the sentence to carry forward. A *type check* is a function from a value to a verdict: it takes a value and answers a yes/no question about that value's shape. We just wrote two of them — `validateStatus` over a single field, `isTask` over a whole object — and they are not toys, they are genuinely what runtime validation libraries do, only by hand and without the conveniences.

But notice what they cost. `isTask` is fifteen lines for an object with *three* fields. Add `createdAt` and `tags` and it grows. Add a second kind of object — a `User`, a `Project` — and you write a whole new function with the same defensive `typeof` boilerplate. Every field's expected kind is written out by hand, every `null` wart guarded by hand. And every check *runs*: it executes at runtime, costs comparisons, and — this is the sharp one — it can only tell you the object was wrong *after* the wrong object already exists and reached the gate. The checker catches the bad task at the door; it does nothing about the typo in `completeTask` that would create a bad task in the first place, because that typo is in code, not data.

Those costs — the verbosity, the runtime expense, and the *after-the-fact* timing — are the wall. We'll walk straight into it next episode, and on the other side of it is the tool that does all of this from a shape you write once, at compile time, before the program ever runs. We'll delete `isTask` on camera and replace it with that. But we built it first, and now we know exactly what it does, because we did its job by hand.

## Recap

- A type check is a **function from a value to a verdict** — value in, yes/no out. We built two by hand in plain JS.
- `validateStatus(s)` is the atom: `s === "todo" || s === "doing" || s === "done"`. Same idea as Python's `s in (...)` or an `Enum` membership check.
- `isTask(value)` is the conjunction of per-field guards, written as early returns. It uses `typeof` to ask each field's kind, and must defensively exclude `null` (because `typeof null === "object"`) and arrays.
- It maps one-to-one onto a Python `is_task` using `isinstance` — every language gives you some "value in, yes/no out" because every program validates data it didn't create.
- Call checkers at the **boundary** (e.g. after `JSON.parse` in `loadTasks`): check at the edges, trust the inside. Keep this boundary in mind — it outlives the rest.
- The costs that become next episode's wall: it's verbose, it grows per-type, it *runs* at runtime, and it only catches a bad value *after* the value exists.

:::quiz
`isTask` starts with `if (typeof value !== "object" || value === null || Array.isArray(value)) return false;`. Why are all three sub-conditions necessary — what specific bad input does each one catch that the others miss?
:::answer
Each guards a distinct failure. `typeof value !== "object"` rejects primitives — a string, number, or boolean passed where a task object was expected; without it, `value.id` on a string would just read `undefined` and the kind checks would limp along on a non-object. `value === null` is the one you cannot skip, because `typeof null` is `"object"` (a permanent JavaScript wart), so `null` slips past the first check — and then `value.id` would throw *Cannot read properties of null*. `Array.isArray(value)` rejects arrays, which also report `typeof === "object"`; an array isn't a task, but without this guard an array with a numeric `length`... no — the real risk is just that arrays are objects and would otherwise proceed into the field checks and possibly pass by accident. Together they narrow `value` to "a plain, non-null, non-array object" before any field is read. This pile of defensive special cases is exactly the runtime tedium that the compile-time checker, two episodes out, makes vanish.
:::

Next episode: the wall. Guards everywhere, the runtime cost, the after-the-fact timing — and then we meet `tsc`, delete the hand guards, and write the shape down once as an `interface`. We'll also be scrupulously honest about what `tsc` is and is *not* compared to what we just built.
