---
term: this binding
short: In JS `this` is set by *how a function is called*, not where it's defined — call-site, not lexical — except for arrow functions, which capture it.
domain: js
related: prototype-chain, event-loop
---

Unlike Python's explicit `self`, JavaScript's `this` is **dynamic**: it's
determined at the call site by *how* the function is invoked.

| Call form | `this` is |
|---|---|
| `obj.fn()` | `obj` (the receiver) |
| `fn()` | `undefined` (strict) / global (sloppy) |
| `fn.call(x)` / `.apply` / `.bind(x)` | `x` |
| `new Fn()` | the fresh instance |
| arrow `() => ...` | captured from the enclosing scope (lexical) |

```js
const obj = {
  name: 'A',
  greet() { return this.name; }
};
const loose = obj.greet;
loose(); // ❌ this is undefined — detached from obj
setTimeout(obj.greet, 0); // same trap (see the event loop)
```

The classic fix is an **arrow function** (lexical capture) or `.bind`.

## Python anchor

Python passes the receiver explicitly as the first parameter (`self`), bound at
*method-access* time, so `f = obj.method; f()` still works. JS does the binding
at *call* time, which is why detaching a method loses `this`. Callbacks queued
via the [[event loop]] are the most common place this bites.
