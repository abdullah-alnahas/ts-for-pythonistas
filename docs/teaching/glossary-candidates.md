# Glossary candidates

Depth pulled out of the lean lesson spine during the Stream B restructure (plan item B2.1). Each entry is a digression / advanced aside / Python-internals note that does **not** belong on the main path but is worth a hover-then-click glossary term later.

Format per entry:

- **slug** — the term's URL slug.
- **domain** — `ts` | `js` | `py` | `swe`.
- **summary** — one-line hover note (the *peek*).
- **body** — the deep text (the *dive*), lifted from the lesson it left.
- **from** — lesson it was pulled out of (for the post-merge linking pass).

The post-merge integration pass (see CONSOLIDATED-PLAN.md "After both streams land") promotes these into real `src/lib/glossary/**` entries and inserts `[[slug]]` links back into the lessons. Do **not** add `[[slug]]` into lessons in this stream.

---

## bigint

- **domain:** ts
- **summary:** A separate numeric type for arbitrary-precision integers; literals take an `n` suffix and can't be mixed with `number`.
- **from:** 02-primitives-variables
- **body:**
  `bigint` is TS/JS's answer to Python's unbounded `int`. Literals need the `n` suffix (`10n`), and you **cannot** mix `bigint` and `number` in arithmetic (`1n + 1` is a type error and a runtime `TypeError`). It exists because the default `number` is an IEEE-754 double and loses integer precision above `Number.MAX_SAFE_INTEGER` (2^53 − 1). Reach for it only when you genuinely need exact integers beyond that range (IDs from some backends, crypto, big counters); otherwise `number` is idiomatic.

## wrapper-objects

- **domain:** js
- **summary:** `String`/`Number`/`Boolean` (capitalized) are object wrappers around primitives — you almost never want them as types.
- **from:** 02-primitives-variables
- **body:**
  JS has primitive values (`"hi"`, `3`, `true`) and matching wrapper *objects* (`new String("hi")`, etc.). The capitalized type names `String`/`Number`/`Boolean` refer to those wrapper-object types, not the primitives. Using them as annotations is almost always a mistake: `const s: String = "hi"` technically works but `s` is now typed as the object form, which is assignable from but not identical to the primitive `string`, and `new String("x") === "x"` is `false`. Always annotate with the lowercase primitive (`string`, `number`, `boolean`). This is the opposite of Python, where `str`/`int`/`bool` are the canonical types and there is no lowercase variant.

## declaration-merging

- **domain:** ts
- **summary:** Multiple `interface` declarations with the same name merge into one; used to augment third-party types like `Window`.
- **from:** 04-interface-vs-type
- **body:**
  When two `interface` declarations share a name, TS merges their members into a single interface. `type` aliases cannot do this — a duplicate name is a "Duplicate identifier" error. The dominant real use is **augmentation**: adding a field to an ambient type you don't own, e.g. `declare global { interface Window { myFlag: boolean } }`, or extending a library's `Request` in an Express app. Python has no analog — you cannot reopen a `TypedDict`. It's a feature for library authors and ambient-type extension; in everyday application code it's mostly a footgun when two files accidentally declare the same interface name and silently merge.

## branded-types

- **domain:** ts
- **summary:** A trick to make two structurally-identical types non-interchangeable by adding a phantom marker property.
- **from:** 03-structural-typing
- **body:**
  Structural typing makes `type Meters = { value: number }` and `type Seconds = { value: number }` mutually assignable — usually convenient, occasionally dangerous (you don't want to pass seconds where meters are expected). "Branding" forces nominal behavior by intersecting in a phantom, never-constructed marker:
  ```typescript
  type Meters = number & { readonly __brand: "Meters" };
  type Seconds = number & { readonly __brand: "Seconds" };
  const m = 5 as Meters;   // construct via an assertion at the boundary
  // passing m where Seconds is expected is now a type error
  ```
  The `__brand` property never exists at runtime (it's erased like all types); it exists purely to make the two types structurally distinct. This is how you opt *out* of structural typing when you specifically want a nominal distinction (currencies, units, validated-vs-raw strings, entity IDs).

## void-vs-undefined

- **domain:** ts
- **summary:** A `void` return type means "caller ignores the result" and accepts a function returning any value; `undefined` requires returning `undefined`.
- **from:** 09-functions
- **body:**
  `void` and `undefined` are not the same return type. `void` is a *bivariance hatch* for callbacks: a function slot typed `() => void` will accept a function that actually returns something, because the return value is contractually discarded. This is why `arr.forEach(x => out.push(x))` typechecks even though `push` returns a `number`. A slot typed `() => undefined` would instead *require* the function to return `undefined`, rejecting the `push` callback. Rule of thumb: type callbacks whose result you discard as `=> void`; use `undefined` only when you specifically mean "the value `undefined`."

## this-binding

- **domain:** js
- **summary:** In JS `this` is determined by how a function is *called*, not where it's defined; arrow functions capture `this` lexically instead.
- **from:** 09-functions
- **body:**
  Unlike Python's explicit `self` first parameter, JS `this` is dynamic. The four call patterns determine `this`: method call (`obj.fn()` → `this = obj`), plain call (`fn()` → `this = undefined` under strict mode), `new` (→ the fresh instance), and explicit `fn.call(x)`/`apply`/`bind` (→ `x`). Detaching a method loses its receiver: `const f = obj.method; f()` has `this === undefined`. Arrow functions have **no own `this`** — they close over the `this` of the enclosing lexical scope at definition time, which is exactly why they're the right choice for callbacks (`setInterval(() => this.tick(), 1000)` keeps `this` bound to the instance). TS can model the expected receiver with a fake first parameter, `function f(this: Window, ...)`, checked at compile time and erased at runtime.

## equality-coercion

- **domain:** js
- **summary:** `==` runs the Abstract Equality algorithm (type coercion) before comparing; `===` compares without coercion. Always use `===`.
- **from:** 12-js-reality-gotchas
- **body:**
  `==` invokes JS's Abstract Equality Comparison, which coerces operands toward a common type before comparing, producing the infamous results: `0 == ""` (both coerce to `0`), `0 == "0"`, `[] == false` (`[]` → `""` → `0`, `false` → `0`), `null == undefined` (special-cased true), but `NaN == NaN` is `false`. `===` (Strict Equality) skips all coercion: different types are simply unequal. For objects both operators compare by reference (identity), like Python's `is` — there is no `__eq__` to overload. The one defensible `==` use is `x == null`, which is true for exactly `null` and `undefined` and nothing else — a deliberate shorthand for the two-empties check.

## type-erasure

- **domain:** swe
- **summary:** Types are checked at compile time then removed from the emitted code; nothing about them survives to runtime. Java generics and TS types both do this.
- **from:** 01-setup-story
- **body:**
  Type erasure means the type layer is a *compile-time-only* artifact: after checking, the compiler emits code with the types stripped out. In TS, `: string`, `interface`, `type`, `private`, generic parameters — all gone in the emitted JS. The runtime is plain JavaScript with no memory that the types ever existed. Java does the same with generics (`List<String>` is just `List` at runtime, which is why you can't do `new T()`). The practical consequences cascade through the whole language: you cannot `instanceof` an interface, you cannot reflect on a generic parameter, and any trust you place in a value's shape at a runtime boundary (parsed JSON, network input) must be *earned with a runtime check* (a guard or a schema validator), because the type annotation guarantees nothing once the program runs. Contrast Python, where annotations are at least partially present at runtime via `__annotations__` and `isinstance` works on real classes.

## noUncheckedIndexedAccess

- **domain:** ts
- **summary:** A tsconfig flag (not in `strict`) that makes `arr[i]` / `obj[key]` yield `T | undefined`, catching out-of-bounds and missing-key bugs.
- **from:** 12-js-reality-gotchas
- **body:**
  By default — even under `strict` — indexing an array or record gives you `T`, optimistically assuming the index is in range and the key present. `noUncheckedIndexedAccess` changes every indexed access to `T | undefined`, forcing you to handle the "off the end" / "key absent" case the type system otherwise lets you ignore. It's the single highest-value flag outside the `strict` family for catching real bugs (`const x = arr[arr.length]` is `undefined`, not a crash, but the type now reflects it). The tradeoff is more `?.`/guards in index-heavy code, which is why the TS team kept it out of `strict` — but for new code it's strongly recommended.
