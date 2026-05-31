---
title: The status union, narrowed and exhaustive
subtitle: How tsc tracks a union through branches, and how never makes "did I handle every case?" a compile error
---

## Where we pick up

We named `type Status = "todo" | "doing" | "done"` last episode — the compile-time twin of the `validateStatus` checker we hand-wrote in episode 2. That checker could only answer one question, at runtime: *is this string one of the three?* The union can do something `validateStatus` never could. The compiler can follow it through your code: inside `if (status === "done")`, `tsc` *knows* the value is exactly `"done"` and narrows the type accordingly. And it can tell you, at compile time, when you've written code that forgets one of the three cases. That second power — provable exhaustiveness — is the real prize of this episode, and it's something no runtime check gives you.

## Narrowing: the compiler follows your branches

A value of type `Status` is "one of three words" until your code rules some out. The moment you test it, TypeScript narrows the type within that branch. This is [[narrowing]], and you already do it informally in every language — *"inside this `if`, I know `x` is done"* — except here the compiler tracks it and enforces it.

:::play
```typescript
type Status = "todo" | "doing" | "done";

function label(status: Status): string {
  if (status === "done") {
    // here, tsc has narrowed `status` to exactly "done"
    return "✓ finished";
  }
  // here, status is "todo" | "doing" — the "done" possibility is ruled out
  if (status === "todo") {
    return "○ not started";
  }
  // only "doing" remains; tsc knows it
  return "● in progress";
}

console.log(label("done"));  // ✓ finished
console.log(label("doing")); // ● in progress
```
:::

Read what the compiler is doing. On entry, `status` is `"todo" | "doing" | "done"`. After `if (status === "done")` returns, the compiler *subtracts* `"done"` from the possibilities — past that point `status` is `"todo" | "doing"`. After the second `if` returns, `"todo"` is gone too, and the final `return` runs with `status` provably narrowed to `"doing"`. The compiler does this subtraction by reading your control flow: each test that returns removes a possibility from every line below it. This is the same reasoning a human does tracing the function — TypeScript just does it as a type, continuously, and will use it to catch mistakes.

:::narrow
start: "todo" | "doing" | "done"
- status === "done" -> "done"
- status === "todo" -> "todo"
- else -> "doing"
caption: Each branch that returns subtracts a member; the final else is provably "doing".
:::

Python developers get a partial version of this from recent type checkers — `mypy` and pyright narrow `Literal` types inside `if x == "done"` branches too. The mechanism is the same idea. The difference is reach: in TypeScript narrowing is woven through the whole language and pairs with the exhaustiveness check we're about to see, which Python's tooling supports more weakly.

## The discriminated union: narrowing whole objects

Narrowing a bare string is useful; narrowing a whole *object* by one of its fields is where it becomes structural muscle. When several object shapes share a common field whose literal value differs — a "tag" or "discriminant" — testing that field narrows the entire object to the matching shape. This is the pattern most tutorials call a tagged union, and it's how you model "a value that is one of several distinct kinds."

Our `Task` already has a discriminant: `status`. Suppose finished tasks carry a `completedAt` timestamp that pending ones don't. Model that as a union of shapes, discriminated by `status`:

```typescript
type Task =
  | { id: number; title: string; status: "todo" }
  | { id: number; title: string; status: "doing" }
  | { id: number; title: string; status: "done"; completedAt: number };

function summary(task: Task): string {
  if (task.status === "done") {
    // narrowed to the "done" shape — completedAt is known to exist here
    return `${task.title} (done at ${task.completedAt})`;
  }
  // narrowed to "todo" | "doing" — accessing task.completedAt here is a compile error
  return `${task.title} (${task.status})`;
}
```

Testing `task.status === "done"` narrows the *whole object* to the third member, so `task.completedAt` becomes legal — but *only* inside that branch. Try to read `completedAt` in the other branch and `tsc` rejects it, because the `"todo"` and `"doing"` shapes have no such field. The discriminant field steers the compiler to the right shape. (For the app's main flow we'll keep `Task` as a single interface with an optional `completedAt`, which episode 7 covers; the union form here is to show discrimination cleanly. Note the glossary doesn't have a dedicated entry for this pattern — it's just narrowing applied to a tagged object union.)

## Exhaustiveness: `never` makes "did I handle every case?" checkable

Here is the episode's centrepiece, and the thing that justifies unions over loose strings. When you handle a union case by case — typically with a `switch` — you want the compiler to tell you if you missed one, or if someone *adds* a fourth status next year and you forget to update this function. TypeScript can do that, using a type called [[never|narrowing]].

`never` is the type with no values — the empty set of possibilities. You reach it by narrowing a union all the way down until nothing is left. If you've handled `"todo"`, `"doing"`, and `"done"`, then in the `default` branch of a `switch` the compiler has subtracted all three and the value's type is `never` — there are no remaining possibilities. The trick: assign that value to a `never`-typed variable. If the type really is `never`, the assignment compiles. If you *missed* a case, the leftover type isn't `never`, the assignment fails, and the compiler tells you exactly which case you forgot.

:::play
```typescript
type Status = "todo" | "doing" | "done";

function icon(status: Status): string {
  switch (status) {
    case "todo":
      return "○";
    case "doing":
      return "●";
    case "done":
      return "✓";
    default: {
      // All three handled, so `status` is narrowed to `never` here.
      const _exhaustive: never = status; // compiles ONLY if every case is handled
      return _exhaustive;
    }
  }
}

console.log(icon("todo"), icon("doing"), icon("done")); // ○ ● ✓
```
:::

This compiles, because all three cases are handled and `status` in `default` is genuinely `never`. Now watch it earn its keep. Suppose the product grows and `Status` gains a fourth value, `"archived"`:

:::predict
We add `"archived"` to the union but *forget* to add a `case` for it in `icon`. What does the compiler do?

```typescript
type Status = "todo" | "doing" | "done" | "archived"; // new member
// icon() still only handles todo / doing / done
```

- ( ) Nothing at compile time; `icon("archived")` falls through to `default` and throws at runtime.
- ( ) Nothing — `default` catches everything, so the function is still valid.
- (x) A compile error in the `default` branch: `"archived"` is not assignable to `never`.
- ( ) A compile error at every call site of `icon`.
:::answer
A compile error in the `default` branch: *Type `"archived"` is not assignable to type `never`*. Because `"archived"` was added to `Status` but no `case` handles it, the compiler reaches `default` with `status` still possibly `"archived"` — so its narrowed type is `"archived"`, not `never`. Assigning `"archived"` to `const _exhaustive: never` fails, and the error points right at the function that's now incomplete. This is the payoff: the `never` assignment converts "did I handle every case?" from a question you have to remember to ask into a compile error you cannot ignore. Add a status, and every non-exhaustive `switch` lights up red until you handle it. No runtime check — no `validateStatus`, no test suite — can give you that, because it's a fact about your *code's coverage*, provable only by static analysis.
:::

## The callback: this is `validateStatus`, promoted

Hold episode 2's `validateStatus` next to this. The hand-written function:

```javascript
function validateStatus(s) {
  return s === "todo" || s === "doing" || s === "done";
}
```

did exactly one thing: at runtime, confirm a string was one of three words. The `Status` union does that *and three things the function couldn't*. It's enforced at every assignment and every parameter, not just where you remember to call it. It narrows: inside `if (status === "done")` the compiler knows the exact value, so the branches are checked against the right shape. And it powers exhaustiveness — the `never` trick proves you've handled every member, and breaks the build the day someone adds a fourth. The runtime checker was a snapshot verdict on one value; the type is a standing guarantee about the whole program, including coverage of cases that don't exist yet.

This is the clearest single example of what episode 3 promised: the compiler didn't just replicate the hand-built checker, it dominated it — same core idea (a closed set of allowed values), vastly more leverage, zero runtime cost. The one thing `validateStatus` still does better is the same thing it always did: check a value the compiler never saw, at the I/O boundary. A status string parsed from JSON still needs a runtime check that it's a member of the set, because the union is erased before the program runs.

## The contrast: Python `Literal`/`Enum`, C++/Java `enum`

:::compare
```python
from enum import Enum

class Status(Enum):
    TODO = "todo"
    DOING = "doing"
    DONE = "done"
# or, lighter: Status = Literal["todo", "doing", "done"]
# mypy warns on a non-exhaustive match via assert_never(), opt-in
```
```typescript
type Status = "todo" | "doing" | "done";
// exhaustiveness via `const _: never = x` in the default branch — built in
```
:::

Three points of contrast. Python's `Enum` is a *runtime object* — `Status.DONE` exists at runtime, carries a `.value`, can be iterated. TypeScript's union is pure compile-time and erased; there's no runtime `Status` object at all (TypeScript *does* have a separate `enum` construct that emits runtime code, but the idiomatic, zero-cost choice is the string-literal union). Python's `Literal` is the closer analogue and narrows similarly, with exhaustiveness available through `typing.assert_never` — the same `never` idea, opt-in via the type checker. C++ and Java `enum`s are nominal, runtime, integer-backed (Java's are full objects); a Java `switch` over an enum can warn on missing cases with tooling, but TypeScript's `never`-based check is a plain language-level pattern needing no special annotation. The string-literal union is the lightest of all of these: it costs nothing at runtime and gets the strongest compile-time coverage guarantee with one assignment line.

:::quiz
Why use the `const _exhaustive: never = status` pattern in `default` instead of just leaving `default` out, or writing `default: throw new Error("unknown status")`? What does each alternative cost you?
:::answer
Leaving `default` out gives you nothing at compile time about coverage — if you forget a case, the function silently returns `undefined` for the unhandled value (and under strict settings may complain about a missing return, but not about the specific missing case). Writing `default: throw new Error(...)` moves the failure to *runtime*: the function compiles fine even when incomplete, and you only discover the missing case when an `"archived"` task actually reaches it in production — exactly the after-the-fact timing we left behind in episode 3. The `const _exhaustive: never = status` pattern is the only one that makes incompleteness a *compile error*: because all handled cases narrow `status` to `never` in `default`, any unhandled member leaves a non-`never` type that fails the assignment, breaking the build the moment the union grows. It converts "remember to handle the new case" into "the compiler won't let you ship until you do." The throw is still worth keeping *after* the assignment as a runtime backstop for values that sneak in from outside the type system (erased types, untrusted input) — belt and suspenders.
:::

## Recap

- **Narrowing**: the compiler follows your control flow and subtracts union members in each branch. After `if (status === "done")` returns, `status` is `"todo" | "doing"` below it; the compiler proves it.
- A **discriminated union** narrows a whole object by a shared literal field (`status` as the discriminant): testing the tag unlocks the fields specific to that member, and only in that branch.
- **`never`** is the empty type. In a `switch`'s `default`, all cases handled means the value narrows to `never`; assigning it to `const _: never` compiles only if exhaustive — so a missed or newly-added case becomes a **compile error**.
- This is `validateStatus` promoted: same closed set, now enforced everywhere, narrowing-aware, and exhaustiveness-checked — none of which a runtime function can do. The runtime check survives only at the I/O boundary, where the union is erased.
- Contrast: Python `Literal`/`assert_never` is the close analogue; `Enum` and C++/Java `enum`s are runtime, nominal constructs. The string-literal union is the zero-runtime-cost option with the strongest static coverage.

Next episode: the field we keep deferring. `completedAt` and `tags` aren't always present, and a lookup like `findTask(id)` might not find anything. That's `T | undefined`, `strictNullChecks`, and optional fields — TypeScript's answer to the billion-dollar mistake, contrasted with Python's `Optional`/`None`, C++'s `nullptr`, and Java's `NullPointerException`.
