---
term: TDZ (temporal dead zone)
short: The span between entering a scope and a `let`/`const` declaration where the binding exists but accessing it throws a ReferenceError.
domain: js
related: coercion, this-binding
---

`let` and `const` bindings are **hoisted** to the top of their block, but —
unlike `var` — they are *not* initialized to `undefined`. From the start of the
block until the declaration line, the binding is in the **temporal dead zone**:
referencing it throws `ReferenceError`.

```js
console.log(a); // undefined — var is initialized to undefined
console.log(b); // ❌ ReferenceError — b is in the TDZ
var a = 1;
let b = 2;
```

The TDZ is a *feature*: it turns "use before declaration" bugs into loud errors
instead of silent `undefined`. It also applies to `class` declarations and to
default-parameter references.

## Python anchor

Python raises `UnboundLocalError` / `NameError` for a similar "used before
assigned" situation, but the mechanism differs: Python decides a name is *local*
for the whole function if it's assigned anywhere, so reading it earlier fails.
JS's TDZ is per-block and specifically tied to `let`/`const` hoisting. Both
share the spirit of "don't let reads of uninitialized names pass silently"
(contrast the silent surprises of [[== coercion algorithm]]).
