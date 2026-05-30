---
term: Variance (covariance / contravariance)
short: How subtyping of a container relates to subtyping of its parts — whether `Dog[]` is a `Animal[]`, and which direction function arguments flow.
domain: ts
related: structural-typing, soundness-vs-completeness, type-erasure
---

**Variance** describes how the subtype relationship on a type constructor (like
`Array<T>` or `(x: T) => R`) relates to the subtype relationship on `T`.

- **Covariance** — preserves direction. If `Dog <: Animal`, then `Dog[]` is
  treated as assignable to `Animal[]`. Reading is safe; writing is where it gets
  unsound.
- **Contravariance** — reverses direction. A function `(a: Animal) => void` is
  assignable where `(a: Dog) => void` is expected, because a handler that copes
  with *any* animal certainly copes with a dog.
- **Bivariance** — both directions allowed. TypeScript does this for *method*
  parameters (a deliberate unsoundness for ergonomics) but uses strict
  contravariance for standalone function-typed parameters under
  `strictFunctionTypes`.

```ts
declare let animals: Animal[];
declare let dogs: Dog[];
animals = dogs; // OK — arrays are covariant (and unsound on write)
animals.push(new Cat()); // now `dogs` secretly contains a Cat 😱

type Handler<T> = (x: T) => void;
let h: Handler<Dog> = (d: Animal) => {}; // OK — params are contravariant
```

## Python anchor

Python's `typing` makes variance explicit on `TypeVar`: `TypeVar("T_co",
covariant=True)` / `contravariant=True`. `Sequence[Dog]` is a `Sequence[Animal]`
(covariant, read-only) while `list[Dog]` is *invariant* — exactly because `list`
is mutable, the same hole TypeScript chooses to leave open for arrays.

This is one place TS trades [[soundness vs completeness]] for convenience. See
also [[structural typing]] for *why* assignability is by shape.
