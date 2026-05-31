---
title: Advanced & utility types
subtitle: Computing types from other types — the part Python's typing has no analog for
---

Classes earned their place by having a runtime body: a real constructor, real `#` fields, objects that exist while the program runs. This lesson runs in the other direction entirely. Everything here is type-level computation — it happens at compile time and leaves nothing behind. You write expressions that evaluate to *types*, `tsc` reduces them, and then [[erases|type-erasure]] the lot (Lesson 01). The output isn't code that runs; it's the set of constraints the compiler checks your code against.

Here is the problem it solves. You have a `User` type, and you need the shape of a PATCH body for an update endpoint: every field optional, minus `id`. In Python you write a second `TypedDict` with the fields copied over and `total=False`, and you keep the two in sync by hand for the life of the codebase. In TypeScript you write `Partial<Omit<User, "id">>`, and the shape is *computed* from `User`. Add a field to `User` and the patch shape gains it on the next compile, with no edit to the derived type.

That is the whole lesson in one line: TypeScript's types form a small functional language that runs at compile time, and you can compute new types from existing ones. Python's `typing` has almost nothing comparable — `TypedDict` is a fixed declaration, not something you can transform — so there's little to map onto. The one idea to carry through is *a type is a value you can pass to a function and get a new value back*. Everything else is which functions exist.

## The three primitives: keyof, indexed access, typeof

Before the transformers, three operators that read a type apart. You met `keyof` in passing with generics (Lesson 07); here it joins two siblings.

```typescript
interface User { id: number; name: string; admin: boolean }

type UserKeys = keyof User;          // "id" | "name" | "admin"
type NameType = User["name"];        // string         (indexed access)
type IdOrName = User["id" | "name"]; // number | string

const config = { host: "db", port: 5432 };
type Config = typeof config;         // { host: string; port: number }
```

- `keyof T` is the union of `T`'s keys, as a union of string-literal types. Not `string` — the specific literals `"id" | "name" | "admin"`.
- `T[K]` is the type *at* key `K`. Indexing by a union of keys gives a union of the value types, which is why `User["id" | "name"]` is `number | string`.
- `typeof value` lifts a runtime value into a type.

That last one collides with a JavaScript keyword you already know, and the collision is exactly backwards from what the name suggests. In an *expression* position, `typeof x` is the JavaScript operator from Lesson 01 — it runs at runtime and returns a string like `"number"`. In a *type* position, `typeof x` is a TypeScript operator that produces the static type of `x` and never runs at all. Same keyword, two languages, disambiguated entirely by where it sits. The type-position one is the only place a value flows *into* the type world; everywhere else in this lesson, types come from other types.

The closest Python reflex is `type(x)`, but that returns a runtime class object, not a static type, and the difference is the usual one: `type(config)` gives you `dict` at runtime, while `typeof config` gives the compiler `{ host: string; port: number }` and then disappears.

## Deriving a literal union from a runtime array

Those primitives combine into a pattern worth its own section, because it threads a value through the type world and back. You have one runtime array of role names, and you want a type that admits exactly those strings — without writing the list twice.

:::play
```typescript
const ROLES = ["admin", "editor", "viewer"] as const;
type Role = typeof ROLES[number];  // "admin" | "editor" | "viewer"

const r: Role = "editor"; // only the array's members type-check
console.log(ROLES.join(", "));
// Try: add "owner" to ROLES, then set r = "owner" — both the value and the type follow.
```
:::

Three steps stack here, and since there's no Python equivalent to lean on, each is worth naming:

```
  ["admin","editor","viewer"]              a runtime array (a value)
        │ as const
        ▼
  readonly ["admin","editor","viewer"]     tuple of literal types (frozen, exact)
        │ typeof   (value ──▶ type)
        ▼
  the tuple type itself
        │ [number]   (index by ANY numeric index)
        ▼
  "admin" | "editor" | "viewer"            union of all element types
```

The `as const` is the load-bearing part. Without it the compiler *widens* the array to `string[]`: a mutable array of `"admin"` could later hold any string, so keeping the literal would be [[unsound|soundness-vs-completeness]]. `as const` marks the array `readonly`, which licenses the compiler to keep the exact literal types and freeze the length into a tuple. This is the widening from Lesson 02 — `const x = "admin"` infers `"admin"`, `let x = "admin"` infers `string` — extended into arrays and objects.

Then `typeof ROLES` lifts the tuple into the type world, and `[number]` is indexed access by `number` — not a literal position like `[0]`, but *any* numeric index, which yields the union of every element's type. It parses as `(typeof ROLES)[number]`; the parentheses are optional.

The payoff is a single source of truth. The runtime array drives the runtime behavior (you `.join` it, iterate it, send it over the wire), and the same array drives the compile-time type. There is no second list to forget. In Python you'd reach for an `Enum` to get both a runtime collection and a static type from one declaration — which is close in spirit, but an `Enum`'s members are `Enum` instances, not the bare strings, so it's a different runtime shape, not a type derived from a plain list.

## The built-in utility types

That pattern you wrote by hand; most type-level transforms you'll never write, because TypeScript ships a standard library of them. You'll spend most of your time *consuming* these rather than authoring your own. The ones worth knowing on sight:

Skim this as a catalog; the mechanism behind the derivations comes in the next two sections.

```typescript
interface User { id: number; name: string; email: string }

Partial<User>             // every field optional:  { id?; name?; email? }
Required<User>            // every field required (strips ?)
Readonly<User>            // every field readonly
Pick<User, "id" | "name"> // keep only these:  { id; name }
Omit<User, "email">       // drop these:       { id; name }
Record<string, number>    // { [k: string]: number } — an index/dict type
Exclude<"a" | "b" | "c", "a"> // "b" | "c"     (subtract from a union)
Extract<"a" | "b", "a" | "x"> // "a"           (intersect a union)
NonNullable<string | null>    // string
ReturnType<typeof fn>     // the return type of a function value
Parameters<typeof fn>     // its parameters as a tuple type
Awaited<Promise<User>>    // User             (unwrap a Promise, recursively)
```

A few have rough Python counterparts — `Partial<User>` is the spirit of `TypedDict(total=False)`, and `Record<string, number>` is `dict[str, int]`. But the difference that matters isn't the individual mappings; it's that Python's versions are things you *declare*, while these are things you *derive*. `Pick`, `Omit`, `ReturnType`, `Exclude` have no Python equivalent at all, because Python has no way to say "the same shape as that one, minus a field" — you'd retype the fields.

That deriving is the entire point. From one source-of-truth type you compute the rest, and they track it:

```typescript
interface User { id: number; name: string; password: string }

type PublicUser = Omit<User, "password">;    // safe to serialize to a client
type UserPatch  = Partial<Omit<User, "id">>; // PATCH body: optional, no id
```

Add `email: string` to `User`, and `PublicUser` gains `email` while `UserPatch` gains `email?` — both on the next compile, with no edit to either derived line. The hand-maintained `TypedDict` pair has no equivalent guarantee; nothing fails when the two drift apart, which is precisely how they drift apart.

Now you try, before reading on:

:::predict
Given `interface User { id: number; name: string; admin: boolean }`, what exact shape does `Partial<Pick<User, "id" | "name">>` produce?

- ( ) `{ id: number; name: string }` — `Pick` keeps the two fields, and `Partial` here is a no-op.
- (x) `{ id?: number; name?: string }` — `Pick` keeps `id` and `name`, then `Partial` makes both optional.
- ( ) `{ id?: number; name?: string; admin?: boolean }` — `Partial` reaches every field of `User`.
- ( ) An error — `Partial` and `Pick` cannot be composed.
:::answer
`{ id?: number; name?: string }`. Composition runs inside-out: `Pick<User, "id" | "name">` first selects those two keys to give `{ id: number; name: string }`, and `Partial<…>` then maps the *result*, marking each surviving key optional. `admin` was dropped by the inner `Pick` and never reaches `Partial`, which is why it isn't in the output. Swap the order to `Pick<Partial<User>, "id" | "name">` and you get the same shape here — but in general each utility transforms only the type handed to it, so read the nesting from the inside out.
:::

## Mapped types — transforming every key

The utilities above aren't compiler magic. They're written in the same language you have access to, and the construct underneath most of them is the [[mapped type|mapped-types]]. The runtime analog is a dict comprehension; the difference is that this one runs over a *type*.

:::compare
```python
# A comprehension rebuilds a dict at runtime, key by key:
optional = {k: v | None for k, v in fields.items()}
# There is no way to write this against a *type*.
# A TypedDict is fixed; you can't derive Partial[SomeTypedDict].
```
```typescript
// A mapped type rebuilds a type at compile time, key by key:
type Optional<T> = {
  [K in keyof T]?: T[K]; // for each key K of T, copy it, make it optional
};
// This is, almost exactly, how the built-in Partial<T> is defined.

type Stringify<T> = {
  [K in keyof T]: string; // every field's type becomes string
};
```
:::

Read `{ [K in keyof T]?: T[K] }` as a loop that builds an object type: *for each key `K` in `keyof T`, emit a property named `K` whose type is `T[K]`, marked optional.* Traced on a concrete `T`:

```
  T = { id: number; name: string }
  keyof T = "id" | "name"

  [K in keyof T]?: T[K]
     K = "id"   ──▶  id?:   T["id"]   = number   ──▶  id?: number
     K = "name" ──▶  name?: T["name"] = string   ──▶  name?: string

  result: { id?: number; name?: string }     // i.e. Partial<T>
```

The `?` and `readonly` here are *modifiers*, and you can add or remove them. Adding is plain (`?`, `readonly`); removing uses a minus prefix, which is how `Required<T>` is built as `{ [K in keyof T]-?: T[K] }` — it strips optionality off every key. That `-?` has no parallel anywhere in Python's typing; you cannot take an existing `TypedDict` and produce a version with its optional keys made required.

You can also rename keys as you map, with an `as` clause, and that opens the door to manipulating the key *strings* themselves:

```typescript
type Getters<T> = {
  [K in keyof T as `get${Capitalize<string & K>}`]: () => T[K];
};
// Getters<{ name: string }> = { getName: () => string }
```

The backtick form is a **template literal type**: string concatenation at the type level, with `Capitalize`, `Uppercase`, `Lowercase`, and `Uncapitalize` built in as intrinsic transformations. The `string & K` is a small necessity — `K` ranges over `keyof T`, which can include `number | symbol` keys, and template literal types only interpolate strings, so intersecting with `string` narrows `K` to just its string members. This is the corner of the type system with genuinely no Python counterpart: you are computing field *names* from other field names, before any code runs.

## Conditional types — branching in type space

Mapped types iterate. The other half of the language is [[conditional types|conditional-types]], which branch: `T extends U ? X : Y` is a ternary that the compiler evaluates against types.

```typescript
type IsString<T> = T extends string ? true : false;
type A = IsString<"hi">;   // true
type B = IsString<number>; // false
```

The test is not equality — it's [[assignability|structural-typing]]. `T extends U` asks "is every `T` a `U`?", the same question the compiler asks at an assignment or a function call, lifted into the type level. `"hi" extends string` is true because the literal `"hi"` is assignable to `string`.

The real power comes from capturing part of the matched type, which is what `infer` does:

```typescript
type ElementOf<T> = T extends (infer E)[] ? E : T;
type C = ElementOf<number[]>;  // number
type D = ElementOf<string>;    // string
```

`infer E` declares a placeholder inside the `extends` pattern. If the match succeeds, the compiler binds `E` to whatever filled that slot — here, the array's element type. It is pattern-matching with destructuring, evaluated by `tsc`. This is exactly how `ReturnType` (`infer` the return slot of a function type) and `Awaited` (`infer` the value inside a `Promise`) are defined; you now have the tools to read their source.

The behavior that makes [[conditional types|conditional-types]] feel like a real language is **distribution**. When the type being checked is a bare type parameter and you hand it a union, the compiler doesn't test the union as a whole — it applies the conditional to each member separately, then unions the results. That is the entire mechanism behind `Exclude`:

:::predict
What is `Exclude<'a' | 'b' | 'c', 'a'>`, and does the conditional see the union whole or one member at a time?
:::answer
The result is `'b' | 'c'`. Because the checked type is a bare parameter and the argument is a union, the conditional distributes: it sees one member at a time, evaluates `T extends 'a' ? never : T` for each, then unions the results. `'a'` maps to `never` and drops out, leaving `'b' | 'c'`.
:::

```
  type Exclude<T, U> = T extends U ? never : T;

  Exclude<"a" | "b" | "c", "a">
    distributes member by member:
      "a" extends "a" ? never : "a"   ──▶  never
      "b" extends "a" ? never : "b"   ──▶  "b"
      "c" extends "a" ? never : "c"   ──▶  "c"
    union the results:  never | "b" | "c"  ──▶  "b" | "c"
```

`never` is the empty type (Lesson 05), and it vanishes from any union — a value is either one of the remaining members or there's no value at all, so `never | "b"` is just `"b"`. The matched member is subtracted by mapping it to `never` and letting it evaporate. This distribute-then-collapse pattern is the workhorse: it's how `Exclude`, `Extract`, and `NonNullable` are all built.

Distribution is sometimes not what you want — occasionally you need to test a union *as a single unit*. The opt-out is to wrap both sides in a one-tuple, `[T] extends [U]`, which stops `T` from being "bare" and disables distribution. `[string | number] extends [string]` is one comparison (and false), where the un-wrapped `string | number extends string` would distribute into two. It's worth knowing the lever exists even if you rarely pull it.

:::quiz
Recall `never` from Lesson 05. In `type NonNullable<T> = T extends null | undefined ? never : T`, walk `NonNullable<string | null | undefined>` step by step and explain why the result is exactly `string`.
:::answer
The checked type is a bare parameter and the argument is a union, so the conditional distributes over each member:

- `string extends null | undefined` → false → `string`
- `null extends null | undefined` → true → `never`
- `undefined extends null | undefined` → true → `never`

Union the three results: `string | never | never`. Because `never` is the empty type (Lesson 05), it drops out of any union it's part of, leaving **`string`**. The two nullish members are filtered exactly the way `Exclude` subtracts a member — same distribute-then-collapse-`never` pattern, which is why `NonNullable` and `Exclude` share a definition shape.
:::

## Branded types — faking nominality in a structural world

One genuinely practical thing this machinery buys you, and the one place a Python analog lines up cleanly. TypeScript is [[structurally typed|structural-typing]] (Lesson 03): a `UserId` that's "really" a `string` is interchangeable with every other `string`, so nothing stops you from passing an order ID where a user ID is expected. Both are strings; the compiler sees no difference.

You can manufacture a difference by intersecting the base type with a marker field that exists only at the type level:

```typescript
type Brand<T, B extends string> = T & { readonly __brand: B };
type UserId  = Brand<string, "UserId">;
type OrderId = Brand<string, "OrderId">;

function getUser(id: UserId) { /* ... */ }

const raw = "u_123";
// Drop 'as const' on the brand and Role widens to string — then `const bad: Role = "nope"` compiles, defeating the point.
getUser(raw);            // Argument of type 'string' is not assignable to parameter of type 'UserId'.
getUser(raw as UserId);  // OK — mint the brand explicitly at the boundary
```

`UserId` is `string & { readonly __brand: "UserId" }`. A plain `string` lacks the `__brand` field, so it isn't assignable; a `UserId` *is* a `string`, so it still works everywhere a string is wanted. The `__brand` field is fictional — no value ever carries it — and it's [[erased|type-erasure]] with everything else, so the [[brand|branded-types]] costs nothing at runtime. Its only job is to make the compiler reject accidental mixing. The `as UserId` is the deliberate, searchable point where an unchecked string becomes a trusted ID, which is exactly where you'd want a validation call.

This is the rare feature with a first-class Python equivalent: `typing.NewType("UserId", str)` creates a distinct static type that's a plain `str` at runtime — the same "nominal wrapper, zero runtime cost" idea. The analogy is unusually tight. Where it breaks is the construction: `NewType` gives you a callable (`UserId("u_123")`) that [[mypy]] treats as a conversion, whereas the TS [[brand|branded-types]] is a pure type-level intersection with no constructor — you mint it with an `as` assertion, not a call. Same goal, [[nominal typing|nominal-vs-structural]] inside a [[structural|structural-typing]] system, reached by different mechanics.

## When to reach for this

The honest scope: day to day you'll *consume* the built-ins — `Partial`, `Pick`, `Omit`, `ReturnType` — constantly, write the occasional small [[mapped|mapped-types]] or [[conditional type|conditional-types]], and [[brand|branded-types]] an ID or two. The `infer`-heavy, recursive, template-literal-driven types are the province of library authors building APIs that infer your shapes for you (think a query builder or a router that types its routes). You should be able to *read* those and know what's possible, but reaching for a five-line [[conditional type|conditional-types]] where a plain interface would do is a cost, not a flex — it's slower to compile, harder for the next reader, and usually a sign the data should have been modeled differently. Use the standard utilities liberally; escalate to hand-written type-level code only when a real source-of-truth relationship demands it.

## Recap

- TypeScript's types are a compile-time functional language: you compute new types from existing ones. Python's `typing` has no equivalent — `TypedDict` is declared, not derived.
- `keyof T`, indexed access `T[K]`, and type-position `typeof value` are the primitives that read a type apart. `typeof` in a type position is a different operator from the JavaScript one despite the shared keyword.
- `as const` + `typeof X[number]` derives a literal union from a single runtime array — one source of truth for value and type.
- The built-in utilities (`Partial`, `Required`, `Readonly`, `Pick`, `Omit`, `Record`, `Exclude`, `Extract`, `NonNullable`, `ReturnType`, `Parameters`, `Awaited`) derive shapes from a source type so they can't drift.
- [[Mapped types|mapped-types]] `{ [K in keyof T]: ... }` are a dict comprehension over a type; `-?`/`-readonly` strip modifiers, and `as` + template literal types rewrite keys.
- [[Conditional types|conditional-types]] `T extends U ? X : Y` branch on assignability; `infer` captures part of the match; distribution applies them member-by-member over unions, and `never` collapsing is what subtracts members.
- [[Branded types|branded-types]] intersect a base type with a fictional marker to fake nominality — the one place `typing.NewType` maps over cleanly.

:::quiz
You have `interface User { id: number; name: string; password: string }`. Write the type for "a partial update that may touch any field except `id` and `password`." Which utilities do you compose, and in what order?
:::answer
Compose **`Omit`** to drop the forbidden keys, then **`Partial`** to make the rest optional — Partial on the outside, because you want optionality applied to what's left after omitting:

```typescript
type UserUpdate = Partial<Omit<User, "id" | "password">>;
// => { name?: string }
```

`Omit<User, "id" | "password">` yields `{ name: string }`, then `Partial<…>` makes `name` optional. If `User` later gains `email: string`, `UserUpdate` automatically includes `email?: string` — single source of truth, no second declaration to update. The order matters only in that each utility transforms the output of the one inside it; here either reading gives the same result, but in general you compose inside-out.
:::

Run it, then add `email: string` to `User` — `UserUpdate` picks up `email?` with no edit to the derived type:

:::play
```typescript
interface User { id: number; name: string; password: string }

type UserUpdate = Partial<Omit<User, "id" | "password">>;

const patch: UserUpdate = { name: "Ada" }; // id/password rejected, name optional
console.log(patch);
// Try: add `email: string` to User, then set patch.email — it's allowed automatically.
```
:::

Every type computed here — `Role`, `UserUpdate`, the [[branded|branded-types]] IDs, the [[mapped|mapped-types]] and [[conditional types|conditional-types]] — exists only while `tsc` runs and is gone the instant it finishes (Lesson 01). Lesson 12 is the reckoning with that [[erasure|type-erasure]]: what's actually left when every type vanishes, why `any` quietly switches the checker off where `unknown` makes you prove your case, and the places the underlying JavaScript — truthiness, `==`, runtime shapes — bites back through the type layer.
