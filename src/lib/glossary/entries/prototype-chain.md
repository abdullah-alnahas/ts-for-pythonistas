---
term: Prototype chain
short: JS resolves a property by walking an object's `[[Prototype]]` links upward until found or null — the mechanism behind inheritance and `class`.
domain: js
related: this-binding, mro-c3, declaration-merging
---

Every JS object has an internal `[[Prototype]]` link (exposed as
`Object.getPrototypeOf(o)` / `__proto__`). Property lookup walks this **chain**:
check the object, then its prototype, then *its* prototype, until found or the
chain ends at `null`.

```js
const animal = { speak() { return 'generic'; } };
const dog = Object.create(animal);
dog.bark = () => 'woof';
dog.speak(); // 'generic' — found one link up
```

`class` syntax is sugar over this: methods live on `Constructor.prototype`, and
`extends` links one prototype to another. `new` creates an object whose
`[[Prototype]]` is the constructor's `.prototype`.

## Python anchor

Python resolves attributes through the **[[MRO/C3|method resolution order]]** —
a linearized list of classes — which is conceptually the same "walk a chain of
namespaces" idea, but computed up-front per class (C3 linearization) rather than
followed link-by-link per object. JS's chain is per-*object* and mutable at
runtime. Method calls along the chain still bind `this`/`self` to the original
receiver — see [[this binding]].
