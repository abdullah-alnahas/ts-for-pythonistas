---
term: Declaration merging
short: TypeScript combines multiple declarations with the same name (interfaces, namespaces) into one — letting you extend types you don't own.
domain: ts
related: structural-typing
---

**Declaration merging** is TypeScript folding two or more declarations sharing a
name into a single definition. The most common case is **interfaces**, which
merge their members:

```ts
interface User { id: string; }
interface User { name: string; }
// User is now { id: string; name: string }
```

`type` aliases do *not* merge — a duplicate `type` is an error. This is the main
behavioural reason to reach for an `interface` when you want a type to be open to
extension (e.g. augmenting a library's types via
`declare module "x" { interface Y { ... } }`).

Namespaces also merge with functions, classes, and enums, which is how older
"namespace + function" library shapes attach static members.

## Python anchor

The closest Python idea is **monkey-patching** — assigning new attributes onto a
class or module at runtime (`SomeClass.extra = ...`). The difference: declaration
merging is purely *static/compile-time* (it changes the type, not the runtime
object) and is the sanctioned way to do it, whereas monkey-patching mutates real
objects at runtime. See [[interface vs type]] for when each shines.
