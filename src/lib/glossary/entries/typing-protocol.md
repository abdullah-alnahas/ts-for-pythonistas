---
term: typing.Protocol (structural matching)
short: Python's opt-in structural typing — a class matches a Protocol if it has the right methods/attributes, no explicit inheritance required.
domain: py
related: structural-typing, nominal-vs-structural, descriptor-protocol
---

`typing.Protocol` brings **structural** ("duck") typing to Python's static type
checker. A class satisfies a Protocol if it *has the right shape* — matching
methods and attributes — without ever subclassing it:

```python
from typing import Protocol

class Sized(Protocol):
    def __len__(self) -> int: ...

def total(x: Sized) -> int:
    return len(x)

total([1, 2, 3])  # ✅ list matches Sized structurally
```

This formalizes, for the type checker, the duck typing Python always had at
runtime. With `@runtime_checkable` you can even `isinstance`-check against a
Protocol (method presence only).

## TS anchor

This is **exactly** how TypeScript types work *by default* — see [[structural
typing]]. TS interfaces are structural everywhere; Python made structural typing
opt-in (Protocol) on top of an otherwise [[nominal vs structural|nominal]]
class system. So a Pythonista's clearest bridge to TS's type model is: "TS is
all `Protocol`, all the time."
