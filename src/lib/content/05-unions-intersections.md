---
title: Union & intersection types
subtitle: A | B you half-know from Python; A & B you don't; discriminated unions you'll love
---

This lesson holds the one pattern Python developers most often wish they had: a value the compiler *knows* is one specific shape out of several, checked exhaustively, with a build error the day someone adds a case and forgets to handle it. Two of the three pieces are familiar. `A | B` you already write in Python 3.10. `A & B` you don't — and it behaves the opposite of how the symbol reads. Start with the free part, then spend the budget on the surprises.

## Unions: familiar, but everywhere

`A | B` means "either type." Python 3.10+ has the exact same syntax, so this part is free.

:::compare
```python
def parse(x: str | int) -> int:
    if isinstance(x, str):
        return int(x)
    return x
```
```typescript
function parse(x: string | number): number {
  if (typeof x === "string") {
    return parseInt(x, 10);
  }
  return x;
}
```
:::

The difference is *cultural*: unions are everywhere in idiomatic TS — return types, props, configs, state. You'll model "this is one of N shapes" with unions constantly, far more than typical Python.

Literal unions are the most common form (from Lesson 02):

```typescript
type Direction = "up" | "down" | "left" | "right";
type Dice = 1 | 2 | 3 | 4 | 5 | 6;
type Theme = "light" | "dark" | "auto";
```

This is `Literal[...]` in Python, but used pervasively as lightweight enums.

## Intersection: A & B — no real Python equivalent

`A & B` means "has **both** sets of members at once" — it *merges* shapes. Python has nothing clean for this (you'd make a new class inheriting both, or a `Protocol`).

:::compare
```python
# No direct equivalent. Closest:
class Identified:  name: str
class Timestamped: created_at: float

class Entity(Identified, Timestamped):
    pass   # multiple inheritance to combine
```
```typescript
interface Identified  { name: string }
interface Timestamped { createdAt: number }

type Entity = Identified & Timestamped;
// Entity = { name: string; createdAt: number }

const e: Entity = { name: "x", createdAt: 0 }; // must have BOTH
```
:::

:::quiz
**Predict before you read on.** `A` has one field, `B` has another. Does `A & B` (intersection) require *fewer* fields or *more* than `A` alone?

```typescript
type A = { a: number };
type B = { b: number };
type Both = A & B;   // a value of type Both must have… what?
```
:::answer
**More.** `A & B` requires *both* `a` and `b` — the intersection *widens* the required shape. This reads backwards: `&` (which sounds like "the overlap, so less") demands more, and `|` (which sounds like "either, so more options") gives you *less* to rely on. The trick: `&` is the union of the *fields* (you need them all); `|` is the union of the *values* (you hold one, and don't know which).
:::

So, for objects, `&` is roughly **union of the fields** (you need them all), while `|` is **union of the values** (you have one of them). Run it both ways:

:::play
```typescript
type A = { a: number };
type B = { b: number };

type Both   = A & B;  // { a: number; b: number } — needs a AND b
type Either = A | B;  // need a, OR b, but not guaranteed which

const both: Both = { a: 1, b: 2 };  // must supply both
console.log(both);
// Uncomment to feel the rule bite — Both demands b:
// const oops: Both = { a: 1 };      // error: 'b' is missing
```
:::

Common real use: mixins / combining capabilities, and adding fields to props: `type Props = BaseProps & { onClose: () => void }`.

:::quiz
**Predict before you read on.** `&` demands both sides at once. So what type is `string & number` — a value that is somehow both?

```typescript
type X = string & number;
```
:::answer
**`never`** — the empty type. No value can be a `string` *and* a `number` simultaneously, so the set of valid values is empty, and TS spells "empty set of values" as `never`. This is consistent, not a special case: `&` intersects the allowed values, and these two sets don't overlap.
:::

So intersecting incompatible primitives gives `never` (the empty type). `type X = string & number` is `never` — nothing can be both.

## The killer pattern: discriminated unions

This is the TS pattern Python developers most wish they'd had. A union of object shapes that share a common **literal "tag"** field. TS uses the tag to narrow exhaustively.

```typescript
type Shape =
  | { kind: "circle"; radius: number }
  | { kind: "rect"; width: number; height: number }
  | { kind: "triangle"; base: number; height: number };

function area(s: Shape): number {
  switch (s.kind) {
    case "circle":
      return Math.PI * s.radius ** 2;   // here, s is the circle variant
    case "rect":
      return s.width * s.height;        // s is the rect variant
    case "triangle":
      return 0.5 * s.base * s.height;
  }
}
```

Inside each `case`, TS **narrows** `s` to exactly that variant — `s.radius` is available in `"circle"` and a type error in `"rect"`. The `kind` field is the *discriminant*. The Python analog is a tagged union you'd hand-roll with `match` + `isinstance` on separate classes; TS does it with plain objects and literal tags.

:::quiz
Recall Lesson 02. The discriminant `kind` is typed `"circle" | "rect" | "triangle"`, not `string`. What earlier feature makes that possible, and why does it have to be that and not `string`?
:::answer
**Literal types** (Lesson 02). Each variant's `kind` is a single literal (`"circle"`), so the union of variants forms the literal union `"circle" | "rect" | "triangle"`. That's what lets `switch (s.kind)` narrow: when `case "circle"` matches, TS knows `s` must be the variant whose `kind` is *exactly* `"circle"`. If `kind` were widened to `string`, every case would be possible in every branch and no narrowing could happen — which is exactly why `const`/literal inference (not `let`/`string` widening) matters here.
:::

## Exhaustiveness checking (compile-time, free)

Add a `never` fallback and TS will **error if you forget a case** — including when you later add a new variant. This is a genuinely better experience than Python's `match`.

```typescript
function area(s: Shape): number {
  switch (s.kind) {
    case "circle":   return Math.PI * s.radius ** 2;
    case "rect":     return s.width * s.height;
    case "triangle": return 0.5 * s.base * s.height;
    default: {
      const _exhaustive: never = s; // ERROR here if a variant is unhandled
      return _exhaustive;
    }
  }
}
```

If you add `{ kind: "square"; side: number }` to `Shape` and forget to handle it, the `const _exhaustive: never = s` line fails to compile — because `s` is now `square`, not `never`. Free safety net for every future edit.

## Try it live

Run this, then add `{ kind: "square"; side: number }` to the union (and a call to `area`) — watch the `never` line light up as a type error until you handle it.

:::play
```typescript
type Shape =
  | { kind: "circle"; radius: number }
  | { kind: "rect"; width: number; height: number };

function area(s: Shape): number {
  switch (s.kind) {
    case "circle": return Math.PI * s.radius ** 2;
    case "rect":   return s.width * s.height;
    default: {
      const _exhaustive: never = s;
      return _exhaustive;
    }
  }
}

console.log(area({ kind: "circle", radius: 2 }).toFixed(2));
console.log(area({ kind: "rect", width: 3, height: 4 }));
```
:::

## Recap

- `A | B` = one of; same as Python 3.10 `|`, but used far more.
- `A & B` = all of; merges object shapes; **no clean Python equivalent**.
- For objects: `&` widens required fields, `|` narrows what's guaranteed.
- **Discriminated unions** (shared literal tag) are the central TS modeling pattern.
- A `never` default case gives **compile-time exhaustiveness checks**.

:::quiz
You add a fourth shape, `{ kind: "square"; side: number }`, to the `Shape` union but only update the `type`, not the `area` function. With the `never` default case present, what happens — and where?
:::answer
The code **fails to compile at the `const _exhaustive: never = s;` line**. After handling `circle`/`rect`/`triangle`, `s` is narrowed to the `square` variant in the `default` branch — which is **not** assignable to `never`, so TS errors there. That error is exactly the point: it forces you to handle every variant. Remove the `never` line and the bug becomes silent (the function just returns nothing for squares). This is why the `never`-default idiom is worth adding to every discriminated-union switch.
:::

A discriminated union narrows by its tag — inside `case "circle"`, `s.radius` is suddenly available and `s.width` is an error. But the compiler does that *everywhere*, not just in a `switch`: it tracks which shape a value could be through every `if`, return, and `&&` in your code. Lesson 08 follows that tracking to its surprising limits.
