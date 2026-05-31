---
term: __annotations__
short: The dict Python stores type hints in at runtime, keyed by name. This is the crucial difference from TypeScript — Python keeps annotations as real, inspectable runtime data; TypeScript erases them entirely.
domain: py
related: type-erasure, typing-protocol, mypy
---

`__annotations__` is a plain `dict` Python attaches to modules, classes,
and functions, mapping each annotated name to its hint expression. The
hints you write *do not vanish* — they're stored here.

```python
def greet(name: str) -> bool: ...
greet.__annotations__
# {'name': <class 'str'>, 'return': <class 'bool'>}

class User:
    id: int
    name: str
User.__annotations__   # {'id': <class 'int'>, 'name': <class 'str'>}
```

This is the single sharpest contrast with TypeScript. Both languages
ignore types *for execution* — [[mypy]] doesn't stop `python`, just as a
TS type error doesn't stop the JS. But Python keeps the annotations as
**runtime-introspectable data**, while TypeScript [[type-erasure|erases]]
its types completely: there is no `__annotations__` equivalent in the
emitted JavaScript.

That retained data is what powers libraries like Pydantic, dataclasses,
and FastAPI — they read `__annotations__` at runtime to build validators
and routes. The TypeScript ecosystem can't read types that way, so it
reaches for [[zod|schema libraries]] where you declare the shape as a real
value instead. Same goal (validate at the boundary), opposite mechanism:
Python *reflects on* its hints, TypeScript *replaces* them with runtime
schemas.

(Note: under `from __future__ import annotations`, hints are stored as
strings and resolved lazily — still present, just not pre-evaluated.)
