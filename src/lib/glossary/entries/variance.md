---
term: Variance (covariance / contravariance)
short: The rule for whether a subtype relationship survives being wrapped. Given Dog is a kind of Animal, is Dog[] usable as an Animal[] (covariance)? And why can a function taking Animal stand in for one taking Dog, but not the reverse (contravariance)?
domain: ts
related: structural-typing, soundness-vs-completeness, type-erasure
---

Start from the one fact variance is built on. Say `Dog` is a subtype of
`Animal` — every `Dog` is an `Animal`, so a `Dog` is usable anywhere an
`Animal` is expected. Variance is the question of whether that relationship
*survives* when you wrap the types in something else. Given that `Dog` relates
to `Animal`, what is the relationship between `Dog[]` and `Animal[]`? Between
`(x: Dog) => void` and `(x: Animal) => void`? The answer is not always "the same
direction" — and getting it wrong is how a fully type-checked program still
crashes. There are three possible answers.

## The names are the answer

The words are built to be read literally; decode them once and the cases name
themselves. The root is **variance**, from *vary*: how the subtyping of the
*wrapper* changes relative to the subtyping of the *part* inside it. Whether it
changes at all, and in which direction, is what the prefix records.

- **co-** (Latin *com-*, "with, together") → varies **with** the inner type:
  *same* direction. `Dog <: Animal` gives `Dog[] <: Animal[]`. The arrow keeps
  pointing the same way.
- **contra-** ("against, opposite") → varies **against** the inner type:
  *reversed*. `Dog <: Animal` gives `(x: Animal) => void <: (x: Dog) => void` —
  the wrapper's arrow flips relative to the part's.
- **in-** ("not") → **invariant**: does not vary. No relationship lifts from the
  part to the wrapper at all; only an exact match is assignable (this is Python's
  mutable `list[T]`, below).
- **bi-** ("two") → **bivariant**: varies in *both* directions at once — accepts
  the co- case and the contra- case together, which is why it's unsound.

(Read `A <: B` as "`A` is a subtype of `B`," i.e. an `A` is assignable wherever a
`B` is wanted.) The vocabulary is lifted straight from mathematics — covariant
and contravariant *functors* in category theory, covariant/contravariant tensors
in physics — where the same prefixes mark the same thing: whether a
transformation preserves the direction of the underlying arrows or reverses it. A
type constructor like `Array<T>` or `(x: T) => R` is exactly such a
transformation, and an instance's variance is just the record of which way each
of its arrows points. So **co**variant = co-directional, **contra**variant =
counter-directional, **in**variant = no direction — the term is the rule.

## Covariance — the relationship is preserved

If `Dog` is a subtype of `Animal`, then `Dog[]` is treated as assignable to
`Animal[]`. This is the intuitive case, and it is genuinely safe *as long as you
only read*: pull an element out of an `Animal[]` that's really a `Dog[]` and you
get a `Dog`, which is an `Animal` — no problem. Things you read *out of* are
covariant: a function's **return type** is covariant (a function returning `Dog`
can stand in for one promising `Animal`), and so are read-only collections.

The trap is that arrays are also writable, and writing flips the safety:

```ts
class Animal { legs = 4; }
class Dog extends Animal { bark() {} }
class Cat extends Animal { meow() {} }

const dogs: Dog[] = [new Dog()];
const animals: Animal[] = dogs;   // allowed — TS arrays are covariant
animals.push(new Cat());          // allowed — a Cat is an Animal
dogs[1].bark();                   // runtime TypeError: dogs[1] is a Cat, has no .bark
```

Every line type-checks; the program throws anyway. TypeScript knows this and
permits it regardless — array covariance is one of the deliberate
[[unsoundnesses|soundness-vs-completeness]] it accepts because invariant arrays
would be too annoying to use. The honest summary: covariance is sound for
reading and unsound for writing, and an array lets you do both.

## Contravariance — the relationship reverses

This is the one that reads backwards until you walk through it, so walk through
it with functions, where it actually shows up. Suppose some code expects a
`(x: Dog) => void` — meaning it is going to call your function with a `Dog`.
Which functions can safely sit in that slot?

```ts
type NeedsDogHandler = (x: Dog) => void;

const takesAnimal = (a: Animal) => console.log(a.legs);
const handler: NeedsDogHandler = takesAnimal;  // OK — parameters are contravariant
```

A function that copes with *any* `Animal` certainly copes with the `Dog` it will
be handed — it only ever touches `Animal` members, and a `Dog` has all of those.
So the *more general* parameter type is the safe substitute: `(x: Animal) => void`
is assignable where `(x: Dog) => void` is wanted. The reverse is rejected, and
should be — a `(x: Dog) => void` given some arbitrary `Animal` might reach for
`.bark()` on a `Cat`. Parameters are **contravariant**: accept wider, never
narrower.

Put the two halves together and you get the whole rule for function
assignability: **one function is substitutable for another when its parameters
are the same or wider, and its return type is the same or narrower** —
contravariant in, covariant out.

## Bivariance — both directions allowed

Bivariance permits the narrower-parameter substitution that contravariance
forbids, so it is unsound. TypeScript allows it in exactly one place, for
historical and ergonomic reasons: **method** parameters. A parameter on a method
(`foo(x: T): void`) is checked bivariantly, while the same parameter written as
a standalone function-typed property (`foo: (x: T) => void`) is checked with
proper contravariance once `strictFunctionTypes` is on. That split is also why
the unsound array assignment above slides through at method call sites like
`push` and `forEach` — they are methods, so their parameters are bivariant.

## Python anchor

Python makes variance **explicit** instead of inferring it from structure. You
declare it on a `TypeVar` — `TypeVar("T_co", covariant=True)`,
`TypeVar("T_contra", contravariant=True)` — or, with the 3.12+ generics syntax,
the checker infers it from how the parameter is used (`class Box[T]: ...`).

The consequence is the sharpest divergence from TypeScript: Python's *mutable*
containers are **invariant**. `list[Dog]` is neither a subtype nor a supertype
of `list[Animal]`, so mypy rejects exactly the assignment TypeScript waved
through above — closing the write hole at the cost of some convenience. The
read-only protocols are covariant, because with no write method there is nothing
to exploit: `Sequence[Dog]` *is* a `Sequence[Animal]`.

So this is a real design choice, not an accident. Faced with the
mutable-covariant-container hole, Python closed it (invariant `list` — sound,
slightly less convenient) and TypeScript left it open (covariant arrays —
unsound, more convenient). The one place the two systems agree outright is
functions: Python's `Callable` is contravariant in its argument types and
covariant in its return, the same rule derived above.

See [[structural typing|structural-typing]] for why assignability is decided by
shape in the first place, and [[soundness vs completeness|soundness-vs-completeness]]
for the broader pattern of TypeScript trading guarantees for usability.
