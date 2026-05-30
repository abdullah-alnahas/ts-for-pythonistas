---
term: Descriptor protocol
short: Python's mechanism where objects defining `__get__`/`__set__` customize attribute access — the engine behind `property`, methods, and `classmethod`.
domain: py
related: mro-c3, slots, typing-protocol
---

A **descriptor** is any object that implements `__get__` (and optionally
`__set__`/`__delete__`). When such an object is stored as a *class* attribute,
Python routes attribute access through it instead of returning it directly.

```python
class Celsius:
    def __get__(self, obj, owner): return obj._c
    def __set__(self, obj, value): obj._c = max(value, -273.15)

class Temp:
    c = Celsius()  # descriptor instance lives on the class
```

Descriptors power a huge amount of "magic": `property`, `staticmethod`,
`classmethod`, and even plain *functions* (a function is a descriptor whose
`__get__` produces a bound method — that's how `self` gets injected).

## JS/TS anchor

The closest JS analog is an **accessor property** defined with
`Object.defineProperty(obj, 'x', { get, set })` or `get`/`set` in a class body —
but JS accessors live per-property, whereas a Python descriptor is a reusable
*object* you can attach to many attributes. TS models accessors with `get x():
T`. Attribute lookup that consults descriptors happens during the [[MRO/C3|MRO]]
walk; `__slots__` (see [[__slots__]]) interacts with them because slots
*are* data descriptors.
