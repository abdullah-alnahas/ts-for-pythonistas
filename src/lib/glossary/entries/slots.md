---
term: __slots__
short: A class declaration that replaces the per-instance `__dict__` with fixed slots — saving memory and forbidding new attributes.
domain: py
related: descriptor-protocol, mro-c3, gil
---

By default every Python instance carries a `__dict__`, so you can attach
arbitrary attributes. Declaring `__slots__` swaps that dict for a fixed set of
**slot descriptors**, one per named attribute:

```python
class Point:
    __slots__ = ('x', 'y')
    def __init__(self, x, y):
        self.x, self.y = x, y

p = Point(1, 2)
p.z = 3  # ❌ AttributeError — no __dict__, no new attrs
```

Benefits: lower memory per instance (no dict) and faster attribute access.
Costs: no dynamic attributes, and multiple inheritance with slots is fiddly.
Each slot is implemented as a data [[descriptor protocol|descriptor]] on the
class.

## JS/TS anchor

There's no runtime equivalent — JS objects are always open bags of properties.
The *static* analog is a TypeScript `interface`/`class` with a fixed shape: the
compiler rejects unknown properties (excess-property checks), giving you the
"only these fields" guarantee at type-check time rather than at runtime. For a
similar "fixed, sealed shape," see how branded/structural typing constrains
objects.
