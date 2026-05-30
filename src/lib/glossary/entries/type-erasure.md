---
term: Type erasure
short: Types exist only at compile time and vanish from the emitted output — TS types and Python annotations leave no runtime trace by themselves.
domain: swe
related: branded-types, structural-typing, hindley-milner
---

**Type erasure** means the static types are used by the checker and then
*removed* before the program runs. The compiled artifact has no idea about your
generics, interfaces, or unions.

```ts
function id<T>(x: T): T { return x; }
// emitted JS: function id(x) { return x; }  — no T anywhere
```

Practical consequences in TypeScript:

- You **cannot** branch on a type at runtime (`if (x is Foo)` doesn't exist);
  you narrow with real runtime checks (`typeof`, `in`, discriminant fields).
- Generics carry no runtime info — no `new T()`, no reflection over type args.
- This is exactly why [[branded types]] are zero-cost: the brand field is
  erased.

## Python anchor

Python annotations are *also* erased in the sense that the interpreter doesn't
enforce them — `def f(x: int)` happily accepts a string at runtime; only a
checker like mypy complains. The difference: Python keeps annotations
*introspectable* at runtime (`__annotations__`, `typing.get_type_hints`),
whereas TS types are gone entirely after compilation. Both contrast with
languages that keep types around (reified generics). Type erasure is a
consequence of [[structural typing|structural]], inference-driven systems like
[[Hindley–Milner]].
