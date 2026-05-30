---
term: MRO / C3 linearization
short: The deterministic order Python searches base classes for an attribute, computed by the C3 algorithm so multiple inheritance stays consistent.
domain: py
related: prototype-chain, descriptor-protocol, slots
---

The **Method Resolution Order** is the linear sequence of classes Python walks
when resolving an attribute on an instance. With multiple inheritance, that
order is computed by **C3 linearization**, which guarantees:

- a class always appears before its parents, and
- the relative order of parents is preserved (left-to-right).

```python
class A: ...
class B(A): ...
class C(A): ...
class D(B, C): ...
D.__mro__  # (D, B, C, A, object)
```

C3 is also what makes `super()` cooperative: `super()` follows the MRO of the
*instance's* type, not just the literal parent, so diamond hierarchies call each
class exactly once.

## JS/TS anchor

JavaScript's [[prototype chain]] is the analogous lookup, but it's a single
*chain* (no multiple inheritance), so there's no linearization problem to solve.
TypeScript classes are single-inheritance too; you compose behaviour with
interfaces + mixins rather than C3. The MRO is also the order in which the
[[descriptor protocol]] is consulted during attribute access.
