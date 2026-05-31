---
title: Union & intersection types
subtitle: A | B, A & B, and the discriminated unions Python has to hand-roll
---

## From naming one shape to naming several

Lesson 04 ended on the `|` that an `interface` can't express. An interface names exactly one object shape; the moment you want "one of several shapes," you reach for `type`, because only a `type` alias can hold a union. This lesson is about the three operators that combine types: `A | B`, `A & B`, and the pattern they make possible together. One of them you already write in Python; one reads backwards from the symbol; and the third is the modeling tool Python developers most often wish the language gave them, because Python makes you build it by hand every time.

## Unions: the same operator, used far more

`A | B` is the union: a value of this type is an `A` *or* a `B`, and at any given moment it's exactly one of them — you just don't statically know which. Python 3.10 spells it identically, so the syntax costs you nothing to learn.

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

The mechanical difference is small: `isinstance` interrogates a real runtime class, while `typeof` is a JavaScript operator inspecting a JavaScript value — the Lesson 01 distinction, that after [[erasure|type-erasure]] only the JS operators survive. The larger difference is cultural. In typed Python, unions show up mostly at function boundaries. In TypeScript they are load-bearing everywhere: return types, component props, configuration objects, the state of a request. You will reach for `|` far more often than `Union[...]` ever earned its keep in your Python, and the reason is the next operator and the pattern it unlocks.

The most common union isn't over classes at all — it's over literal types, the feature from Lesson 02:

```typescript
type Direction = "up" | "down" | "left" | "right";
type Dice = 1 | 2 | 3 | 4 | 5 | 6;
type Theme = "light" | "dark" | "auto";
```

This is `Literal["up", "down", ...]` from Python's `typing`, but where `Literal` is a niche tool, literal unions are the idiomatic stand-in for an enum. A function typed `(t: Theme) => void` rejects `"Light"` and `"system"` at compile time, and your editor autocompletes the three legal strings. No enum class, no runtime object — the union is [[erased|type-erasure]] like everything else; the check ran at compile time, before it vanished.

A union also tells you what you *cannot* do. Given `x: string | number`, the only members you may touch without further work are the ones both halves share. `.toUpperCase()` is a `string` method, so the compiler rejects it on the bare union; you have to narrow to `string` first, which is what the `typeof` check above does. That restriction is the whole point — the union is honest that it doesn't yet know which type it holds — and following it through every branch of your code is the subject of Lesson 08.

## Intersection: `A & B` reads backwards

`A & B` is the intersection: a value must satisfy *both* `A` and `B` at once. For object types this *merges* the shapes — the result has every member of `A` and every member of `B`. Python has no clean single-expression equivalent. The nearest thing is combining two bases by multiple inheritance, or composing two `Protocol`s, and both create a new named entity rather than an inline combination.

:::compare
```python
# No inline equivalent. The closest is a new class:
class Identified:  id: str
class Timestamped: created_at: float

class Entity(Identified, Timestamped):
    pass   # multiple inheritance to combine the two
```
```typescript
interface Identified  { id: string }
interface Timestamped { createdAt: number }

type Entity = Identified & Timestamped;
// Entity is { id: string; createdAt: number }

const e: Entity = { id: "x", createdAt: 0 }; // must satisfy BOTH
```
:::

The analogy to multiple inheritance breaks in two ways worth being precise about. First, `Entity` is [[structural|structural-typing]] (Lesson 03): any object with both an `id: string` and a `createdAt: number` is an `Entity`, regardless of how it was made — there's no base class, no [[MRO|mro-c3]], no `__mro__` to consult, because there's no class at all. Second, intersection is order-independent and flat. `A & B` and `B & A` are the same type, and there is no [[C3 linearization|mro-c3]] deciding which side "wins" a name — because for compatible shapes nothing has to win; the members simply union together. What happens when the two sides *disagree* about a member's type is a question the symbol's reading makes tempting to get wrong.

:::predict
`A` requires one field, `B` requires another. Does a value of type `A & B` need *fewer* fields than `A` alone, or *more*?

```typescript
type A = { a: number };
type B = { b: number };
type Both = A & B;   // a value of type Both must have… what?
```

- ( ) Fewer — `&` is the overlap of the two shapes, so it keeps only fields they share.
- (x) More — `&` requires every field from both sides at once.
- ( ) The same as `A` — the second operand only adds optional fields.
:::answer
**More.** A `Both` must carry both `a` and `b`; supply only `a` and the compiler rejects it:

```typescript
const oops: Both = { a: 1 };
// TS2322: Property 'b' is missing in type '{ a: number; }' but required in type 'B'.
```

The reading trips people because `&` *sounds* like "the overlap, therefore less." It is an overlap — but of the *values*, not the *fields*. A value is in `A & B` only if it qualifies as an `A` and also as an `B`, and qualifying as both means carrying both sets of members. So intersecting object types unions their field requirements (you need them all), while, as the next section shows, `|` is the operator that leaves you with *less* you can rely on. The set-theory and the field-counting point in opposite directions, which is the entire source of the confusion.
:::

So the rule for objects is the inverse of how the operators read: `&` is the union of the *fields* (you must provide all of them), and `|` is the union of the *values* (you hold one, statically unknown which, so you can rely only on what's common). Run both directions until the asymmetry stops surprising you:

:::play
```typescript
type A = { a: number };
type B = { b: number };

type Both   = A & B;  // { a: number; b: number } — needs a AND b
type Either = A | B;  // an a, or a b — and you don't know which

const both: Both = { a: 1, b: 2 };  // must supply both
console.log(both);

// Uncomment to watch the rule bite — Both demands b:
// const partial: Both = { a: 1 };   // error: 'b' is missing
```
:::

The everyday use of intersection is extension by composition: adding fields to an existing shape (`type Props = BaseProps & { onClose: () => void }`), or assembling a capability out of smaller mixins. It does the job `extends` does for a single interface (Lesson 04), but inline and over any two types, including ones you don't control.

That reading — `&` intersects the set of allowed values — also explains a result that looks like a paradox until you apply the definition literally.

:::predict
`&` demands both sides at once. So what is `string & number` — a value that's somehow both a string and a number?

```typescript
type X = string & number;
```

- ( ) A runtime error — the compiler rejects the declaration outright.
- ( ) `string`, because the left operand wins.
- (x) `never` — the empty type, because no value can satisfy both.
:::answer
**`never`.** The declaration is legal; the resulting type is just uninhabited. `&` keeps the values common to both operands, and no single value is simultaneously a `string` and a `number`, so the set is empty — and TypeScript's name for "a type with no values" is `never`. This is the same rule as `A & B` on objects, not a special case: there it intersected two sets that overlap, here it intersects two that don't. `never` is the *bottom type* — the lower bound of the type system, the dual of `unknown` at the top — and it's exactly what makes the next pattern's safety net work.
:::

The same thing happens, more quietly, when two object types intersect on a property whose types conflict: `{ kind: "circle" } & { kind: "rect" }` gives a type whose `kind` is `"circle" & "rect"`, i.e. `never` — a shape no object can satisfy. The intersection doesn't error at the type level; it produces an uninhabitable type, and you only hear about it when you try to construct a value. Hold onto that — it's the mechanism behind exhaustiveness checking below.

## Discriminated unions: the pattern Python hand-rolls

A bare union of object shapes is awkward to consume. Given `{ radius: number } | { width: number; height: number }`, you can't reach for `.radius` directly — it isn't on both members, so the compiler rejects it on the union. You'd narrow with the `in` operator (`if ("radius" in s)`), which works but is fragile: it keys off whichever field happens to be unique, and there's nothing forcing the shapes to stay distinguishable as they grow.

The disciplined version gives every member a shared field whose type is a distinct *literal* — a discriminant — and the compiler uses that one field to tell the variants apart:

```typescript
type Shape =
  | { kind: "circle"; radius: number }
  | { kind: "rect"; width: number; height: number }
  | { kind: "triangle"; base: number; height: number };

function area(s: Shape): number {
  switch (s.kind) {
    case "circle":
      return Math.PI * s.radius ** 2;   // here s is the circle variant
    case "rect":
      return s.width * s.height;        // s is the rect variant
    case "triangle":
      return 0.5 * s.base * s.height;
  }
}
```

Inside `case "circle"`, the compiler narrows `s` to exactly the circle variant: `s.radius` is available, and `s.width` is a compile error. It can do this because `s.kind` is typed `"circle" | "rect" | "triangle"` — a union of single literals, one per member — so matching `s.kind` against the literal `"circle"` is enough to identify which member `s` must be. This is structurally the tagged union you'd build in Python with a base class and a `match` over `isinstance` arms, or a `Literal` tag plus `match`, except TypeScript reads the tag off a plain object and does the narrowing in the type checker rather than at runtime. The objects are ordinary data; the discrimination is entirely a compile-time inference over the literal types.

The discriminant doesn't have to be a string. A boolean works — `{ ok: true; value: number } | { ok: false; error: string }`, narrowed by `if (r.ok)` — and so does a numeric literal. What it cannot be is a widened type, which is precisely why Lesson 02's `const`-versus-`let` behavior matters here.

:::quiz
The discriminant `kind` is typed `"circle" | "rect" | "triangle"`, not `string`. What earlier feature makes that possible, and why would `string` break the whole pattern?
:::answer
**Literal types** (Lesson 02). Because each member fixes `kind` to one literal, the union of members gives `s.kind` the literal-union type `"circle" | "rect" | "triangle"`. That is what lets `switch (s.kind)` discriminate: matching `case "circle"` means `s` can only be the member whose `kind` is *exactly* `"circle"`. Widen `kind` to `string` and every branch could hold any string, so the compiler can never rule a member out — no narrowing happens. This is why literal inference is load-bearing: the moment the tag widens to `string` (what a plain `let` or an un-asserted object property gives you), the discriminated union silently degrades into an ordinary union you can't `switch` on.
:::

## Exhaustiveness checking, for free and forever

The version above has a quiet weakness: if you add a fourth variant later and forget to handle it, the `switch` simply falls through and the function returns `undefined` at runtime — and because the return type is `number`, that's a real bug the compiler didn't catch. There's a one-line idiom that converts that runtime hole into a compile error, and it's built directly on the `never` rule from earlier.

```typescript
function area(s: Shape): number {
  switch (s.kind) {
    case "circle":   return Math.PI * s.radius ** 2;
    case "rect":     return s.width * s.height;
    case "triangle": return 0.5 * s.base * s.height;
    default: {
      const _exhaustive: never = s; // compile error here if a variant is unhandled
      return _exhaustive;
    }
  }
}
```

The mechanism is exact. As the compiler narrows past each handled `case`, it subtracts that variant from the type of `s`. After all three cases, the only thing `s` *could* still be in the `default` branch is nothing — so the compiler narrows `s` to `never`, and `const _exhaustive: never = s` type-checks. The moment you add `{ kind: "square"; side: number }` to `Shape` and don't add a `case` for it, `s` in the `default` branch is no longer `never` but the leftover `square` variant, which is not assignable to `never`, and that assignment fails to compile. Concretely, the failing assignment reads `TS2322: Type '{ kind: "square"; side: number }' is not assignable to type 'never'.` The `never` annotation is doing the work: it's an assertion that *no case should be reachable here*, and the compiler verifies it on every future edit.

This is meaningfully stronger than Python's `match`. A Python `match` with no `case _` falls through silently, and even with `assert_never` from `typing` the check is only as good as a type checker you have to remember to run — `python` itself will execute the function and return `None`. The TypeScript idiom is part of the same build that produces your JavaScript, so the contract can't drift: add a variant, the build breaks, you handle it.

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

// Add `| { kind: "square"; side: number }` to Shape above and watch the
// `_exhaustive` line turn red until you add a `case "square"`.
```
:::

## Modeling so bad states can't be written

The payoff that makes all this worth the trouble is the one Lesson 01 promised: with a discriminated union you can build types where invalid combinations are unrepresentable, rather than possible-but-guarded-against. The standard example is request state. The shape you reach for first usually allows nonsense:

```typescript
// Permits states that should never exist together:
interface RequestState {
  loading: boolean;
  data?: string;
  error?: string;
}
// Nothing stops { loading: true, data: "x", error: "y" } — loaded, failed, AND in-flight.
```

Modeled as a discriminated union, the illegal combinations don't typecheck because they aren't in the type:

```typescript
type RequestState =
  | { status: "idle" }
  | { status: "loading" }
  | { status: "success"; data: string }
  | { status: "error"; error: string };
```

Now `data` exists only on the `"success"` member and `error` only on `"error"`; there is no value of this type that is loading *and* carries data, because no member describes that. You haven't added a runtime guard against the bad state — you've removed it from the space of values the type admits, so the guard is unnecessary. This is the same move you'd make in Python with a closed family of frozen dataclasses and `assert_never`, but the union expresses it inline, without a class per variant, and the exhaustiveness check enforces it on every consumer for free.

## Recap

- `A | B` is "one of," exactly as in Python 3.10 — but idiomatic TypeScript leans on it everywhere, especially over literal types used as lightweight enums.
- `A & B` is "both at once." For objects it *merges* shapes, so it requires the union of all their fields — the opposite of what the symbol suggests. It's [[structural|structural-typing]] and order-independent, not a class with an [[MRO|mro-c3]].
- Intersecting disjoint value sets gives `never`: `string & number` is empty, and a conflicting discriminant collapses a member to an uninhabitable shape.
- A **discriminated union** — members sharing a literal-typed tag — is the central modeling pattern. The literal tag (Lesson 02) is what lets the compiler narrow each branch to one variant.
- A `default` branch asserting `const _exhaustive: never = s` turns a forgotten case into a compile error, permanently — stronger than Python's `match`.
- Used well, unions let you model data so invalid states are unrepresentable, replacing a runtime guard with a type that has no bad values.

:::quiz
You add `{ kind: "square"; side: number }` to the `Shape` union but update only the type, not the `area` function — which still has the `never` default case. What happens, and exactly where?
:::answer
The build fails **at `const _exhaustive: never = s;`**. After the `circle`/`rect`/`triangle` cases are handled, `s` in the `default` branch is narrowed to the leftover `square` variant, which is not assignable to `never`, so the assignment errors there (TS2322). That error is the entire point: it names the unhandled variant and refuses to compile until you add a `case "square"`. Delete the `never` line and the same omission becomes a silent runtime bug — `area` returns `undefined` for a square while still claiming to return `number`. That's why the `never`-default idiom belongs on every discriminated-union `switch`.
:::

A discriminated union narrows by its tag: inside `case "circle"`, `s.radius` appears and `s.width` becomes an error. The compiler runs that same machinery well beyond a `switch` — through every `if`, `typeof`, `in`, and early `return` in your code — which is a large enough subject to be its own lesson (Lesson 08, where it also turns out sharper than [[mypy]] in places and blind in others). Before the general case, though, comes the narrowest and most common union you'll write: a value that is either present or empty. Python spells that one way, `None`. TypeScript spells it two, `null` and `undefined`, and under `strict` it won't let you use such a value until you've ruled the empty case out. That's Lesson 06.
