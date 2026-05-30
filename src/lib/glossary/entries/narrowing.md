---
term: Narrowing
short: How TypeScript shrinks a union to a more specific type inside a branch by reading control flow — a typeof/in/instanceof/truthiness check or an early return — and tracking what each one proves. Compile-time only; erased at runtime.
domain: ts
related: soundness-vs-completeness, type-erasure
---

A value typed `string | undefined` is genuinely both possibilities when it
enters a scope. Narrowing is the compiler following your control flow and ruling
possibilities out: inside `if (x !== undefined) { ... }`, `x` is `string` for the
rest of the block, because reaching that line proves it. The same machinery runs
through `typeof`, `in`, `instanceof`, equality against a literal, and a
discriminated union's tag.

```ts
function f(x: string | number) {
  if (typeof x === "string") {
    x.toUpperCase(); // x is string here
  } else {
    x.toFixed(2);    // x is number here
  }
}
```

Two of the tools are promises rather than checks. A custom type guard
(`x is Foo`) and an assertion function (`asserts x is Foo`) let a function tell
the compiler the result of a test it can't see into — and the compiler trusts
the signature without re-verifying the body. That is the deliberate
[[unsound|soundness-vs-completeness]] seam: lie in a guard and narrowing
propagates the lie.

## Python anchor

`isinstance(x, str)` narrows for mypy too, and `typing.TypeGuard` is the direct
analogue of `x is Foo`. The difference is what survives. Python's checks are real
runtime class tests that still exist while the program runs; TypeScript's
narrowing is pure compile-time control-flow analysis — it
[[erases|type-erasure]] to nothing, and the runtime checks it reads (`typeof`,
`instanceof`) work only because they were JavaScript to begin with.
