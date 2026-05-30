---
term: mypy
short: Python's optional static type checker — a separate tool that reads PEP 484 annotations and reports type errors, but never runs your code or changes its behavior.
domain: py
related: type-erasure, soundness-vs-completeness, typing-protocol
---

**mypy** is a static type checker for Python: a third-party tool you
`pip install` and run over your source. It reads your PEP 484 annotations
(`def f(x: int) -> str`), checks them for consistency, and prints errors. It
does not execute your program, rewrite it, or enforce anything at runtime —
`python` runs the file with or without mypy's blessing.

```python
x: int = "nope"     # mypy: error — Incompatible types
print(x)            # python: prints "nope" anyway
```

Two properties matter most:

- **It's advisory.** mypy is never in the execution path. A failing check
  doesn't stop `python`, the way a failing `tsc` check doesn't (by default)
  stop the emitted JS from running.
- **It's gradual.** Unannotated code is implicitly `Any` and silently passes;
  only the parts you annotate are checked. The `Any` escape hatch makes the
  system intentionally unsound — convenient, but it means a green mypy run is
  not a proof of type correctness ([[soundness vs completeness|soundness-vs-completeness]]).

By default mypy checks **nominally** (a type matches by name/inheritance). For
duck-typed, shape-based matching you opt in with `typing.Protocol`, which is
mypy's analog of a TS interface — see [[typing.Protocol|typing-protocol]].

## TS/TypeScript anchor

mypy is the closest Python analog to TypeScript's checker, but the relationship
is inverted. mypy is an *optional bolt-on*: separate from the interpreter, easy
to never run. In TypeScript the checker **is** the compiler — checking is part
of producing the JavaScript you ship. The other inversion is what survives:
Python keeps annotations introspectable at runtime (`__annotations__`,
`typing.get_type_hints`), whereas TypeScript erases its types entirely
([[type erasure|type-erasure]]). Same idea — static checking layered over a
dynamic language — reached from opposite directions.
