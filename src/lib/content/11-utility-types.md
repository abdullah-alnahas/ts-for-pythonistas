---
title: Advanced & utility types
subtitle: Type-level programming — the part Python has nothing like
---

You have a `User` type. Now you need its PATCH-body shape — every field optional, minus `id` — for an update endpoint. In Python you copy the fields into a second `TypedDict` and keep the two in sync by hand forever. In TS you write `Partial<Omit<User, "id">>` and the shape is *computed* from `User`; change `User`, and it updates itself.

That difference is the whole lesson. TS types form a small **functional language that runs at compile time**: you compute new types from existing ones. Python's typing has almost nothing comparable, so lean on one idea — *treat types as values you can transform* — and the rest follows.

## keyof, typeof, indexed access

Three building blocks (you met `keyof` in Lesson 07).

```typescript
interface User { id: number; name: string; admin: boolean }

type UserKeys = keyof User;        // "id" | "name" | "admin"
type NameType = User["name"];      // string  (indexed access)
type IdOrName = User["id" | "name"]; // number | string

const config = { host: "db", port: 5432 };
type Config = typeof config;       // { host: string; port: number }
```

- `keyof T` — union of T's keys.
- `T[K]` — the type **at** key K (indexed access).
- `typeof value` — the **type** of a runtime value. (Different from JS's runtime `typeof`: in a *type position* it lifts a value's type; in an *expression* it returns a string. Same keyword, two worlds.)

A common combo — derive a literal union from a runtime array via `as const`. Run it, then add `"owner"` to the array: the runtime list grows *and* the `Role` type gains `"owner"` from the same edit, no second list to update.

:::play
```typescript
const ROLES = ["admin", "editor", "viewer"] as const;
type Role = typeof ROLES[number];  // "admin" | "editor" | "viewer"

const r: Role = "editor"; // only the array's members type-check
console.log(ROLES.join(", "));
// Try: add "owner" to ROLES, then set r = "owner" — both the value and the type follow.
```
:::

Worth unpacking slowly, because three things stack here and there's no Python equivalent to lean on:

```
  ["admin","editor","viewer"]            a runtime array (a value)
        │ as const
        ▼
  readonly ["admin", "editor", "viewer"] tuple of literal types (frozen, exact)
        │ typeof   (value ──▶ type)
        ▼
  the tuple type itself
        │ [number]  (index by ANY numeric index)
        ▼
  "admin" | "editor" | "viewer"          union of all element types
```

1. `as const` freezes the array to a `readonly` tuple of *literal* types (not `string[]`).
2. `typeof ROLES` lifts that runtime value into the type world.
3. `[number]` is an indexed access by *any* number index — so it yields the union of every element's type.

The payoff: one runtime list is the single source of truth for both the values (at runtime) and the type (at compile time). Add `"owner"` to the array and `Role` updates automatically.

## Built-in utility types

TS ships a standard library of type transformers. The essential ones:

```typescript
interface User { id: number; name: string; email: string }

Partial<User>          // all fields optional:  { id?, name?, email? }
Required<User>         // all fields required
Readonly<User>         // all fields readonly
Pick<User, "id"|"name">// subset: { id; name }
Omit<User, "email">    // all except email: { id; name }
Record<string, number> // { [k: string]: number } — a dict type
Exclude<"a"|"b"|"c", "a">  // "b" | "c"  (union subtraction)
Extract<Shape, {kind:"circle"}> // pull a member out of a union
NonNullable<string | null> // string
ReturnType<typeof fn>  // the return type of a function value
Parameters<typeof fn>  // [params] as a tuple
Awaited<Promise<User>> // User (unwrap a Promise)
```

Rough Python analogies exist for a few (`Partial` ~ `TypedDict(total=False)`, `Record` ~ `dict[str, int]`), but most — `Pick`, `Omit`, `ReturnType`, `Exclude` — have **no Python counterpart**. They let you define one source-of-truth type and derive the rest:

```typescript
interface User { id: number; name: string; password: string }
type PublicUser = Omit<User, "password">;       // safe to send to client
type UserPatch  = Partial<Omit<User, "id">>;    // PATCH body shape
```

## Mapped types — transform every key

These utilities are built from **mapped types**, which you can write yourself. Think of it as a type-level dict comprehension.

:::compare
```python
# A comprehension transforms a dict at runtime:
optional = {k: v | None for k, v in fields.items()}
# ...but you cannot do this to a TYPE in Python.
```
```typescript
// A mapped type transforms a type at compile time:
type Optional<T> = {
  [K in keyof T]?: T[K];   // for each key K of T, make it optional
};
// This is literally how Partial<T> is defined.

type Stringify<T> = {
  [K in keyof T]: string;  // every field becomes string
};
```
:::

Read `type Optional<T> = { [K in keyof T]?: T[K] }` as a loop: *for each key `K` in `keyof T`, produce a property `K` whose type is `T[K]`, marked optional.* Worked on a concrete `T`:

```
  T = { id: number; name: string }
  keyof T = "id" | "name"

  [K in keyof T]?: T[K]
     K = "id"   ──▶  id?:   T["id"]   = number   ──▶  id?: number
     K = "name" ──▶  name?: T["name"] = string   ──▶  name?: string

  result: { id?: number; name?: string }     // i.e. Partial<T>
```

`[K in keyof T]` iterates the keys; modifiers `?` (optional) and `readonly` can be added or removed (with `-?`, `-readonly`). You can also **remap keys** with `as`:

```typescript
type Getters<T> = {
  [K in keyof T as `get${Capitalize<string & K>}`]: () => T[K];
};
// Getters<{ name: string }> = { getName: () => string }
```

That backtick is a **template literal type** — string manipulation at the type level (`Capitalize`, `Uppercase`, etc. are built in). No Python equivalent whatsoever.

## Conditional types — types with if/else

`T extends U ? X : Y` is a ternary **in type space**.

```typescript
type IsString<T> = T extends string ? true : false;
type A = IsString<"hi">;  // true
type B = IsString<number>; // false

// Unwrap an array element type:
type ElementOf<T> = T extends (infer E)[] ? E : T;
type C = ElementOf<number[]>;  // number
type D = ElementOf<string>;    // string
```

`infer E` introduces a type variable captured from the match — "pattern-match the element type out of the array." This is how `ReturnType`, `Awaited`, etc. are built.

Conditional types also **distribute** over unions automatically: when the checked type is a union, TS applies the conditional to *each member* and unions the results. This is the mechanism behind `Exclude`:

```
  type Exclude<T, U> = T extends U ? never : T;

  Exclude<"a" | "b" | "c", "a">
    distributes member-by-member:
      "a" extends "a" ? never : "a"   ──▶  never
      "b" extends "a" ? never : "b"   ──▶  "b"
      "c" extends "a" ? never : "c"   ──▶  "c"
    union the results: never | "b" | "c"  ──▶  "b" | "c"
```

`never` vanishes from a union (it's the empty type — Lesson 05), so the matched member is subtracted. It's a genuinely Turing-ish sublanguage; Python's type system simply can't express it.

:::quiz
Recall Lesson 05's `never`. In `type NonNullable<T> = T extends null | undefined ? never : T`, walk `NonNullable<string | null | undefined>` and explain why the result is just `string`.
:::answer
Distribution applies the conditional to each union member:

- `string extends null | undefined` → false → `string`
- `null extends null | undefined` → true → `never`
- `undefined extends null | undefined` → true → `never`

Union the results: `string | never | never`. Because `never` is the empty type (Lesson 05), it drops out of any union, leaving **`string`**. So the two nullish members are filtered out exactly the way `Exclude` subtracts a member — same distribute-then-collapse-`never` pattern.
:::

## When to actually use this

Day to day you'll mostly **consume** the built-ins (`Partial`, `Pick`, `Omit`, `ReturnType`) and occasionally write a small mapped or conditional type. Deep type-level metaprogramming is the domain of library authors. Recognize it, use the standard utilities liberally, and don't feel obligated to write `infer`-heavy types early on.

## Recap

- TS types are a compile-time language you can compute with — Python has no equivalent.
- `keyof`, `T[K]` (indexed access), and `typeof value` are the primitives.
- `as const` + `typeof X[number]` derives a literal union from a runtime array.
- Utility types: `Partial`, `Required`, `Readonly`, `Pick`, `Omit`, `Record`, `Exclude`, `Extract`, `ReturnType`, `Parameters`, `Awaited` — derive types from one source of truth.
- Mapped types `{ [K in keyof T]: ... }` ≈ dict comprehension over a type; key remap with `as` + template literal types.
- Conditional types `T extends U ? X : Y` + `infer` = pattern matching in type space.

:::quiz
You have `interface User { id: number; name: string; password: string }`. Write the type for "the shape of a partial update that can touch any field except `id` and `password`." Which utilities do you compose?
:::answer
Compose **`Omit`** (drop the forbidden keys) with **`Partial`** (make the rest optional):

```typescript
type UserUpdate = Partial<Omit<User, "id" | "password">>;
// => { name?: string }
```

`Omit<User, "id" | "password">` yields `{ name: string }`, then `Partial<...>` makes `name` optional. If `User` later gains an `email` field, `UserUpdate` automatically includes `email?: string` — single source of truth. Doing this by hand (re-listing fields) is exactly what these utilities save you from, and there's no comparable one-liner in Python's typing.
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

Every type you derived here — `Role`, `UserUpdate`, the mapped and conditional types — exists only at compile time and is gone the instant `tsc` finishes (Lesson 01). Lesson 12 is the reckoning with that: what's actually left when the types vanish, and where the underlying JavaScript bites back.
