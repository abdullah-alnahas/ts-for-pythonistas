---
term: == coercion algorithm
short: JS loose equality applies a multi-step type-conversion algorithm before comparing, producing surprises like `"" == 0` and `[] == ![]` being true.
domain: js
related: tdz, this-binding
---

`==` (loose equality) runs the **Abstract Equality** algorithm: if the operands
differ in type, it coerces one toward the other and retries. The rough order:

- `null == undefined` → `true` (and equal to nothing else).
- number vs string → string is converted **to number**.
- boolean vs anything → boolean is converted **to number** first.
- object vs primitive → object is converted via `ToPrimitive` (`valueOf` /
  `toString`).

```js
'' == 0;        // true  — '' → 0
'0' == 0;       // true
[] == 0;        // true  — [] → '' → 0
[] == ![];      // true  — ![] is false → 0, [] → 0
null == 0;      // false — null only equals undefined
NaN == NaN;     // false
```

The fix is simple: **use `===`** (strict equality), which never coerces. The
only defensible `==` use is `x == null` to catch both `null` and `undefined`.

## Python anchor

Python's `==` does *not* coerce across unrelated types (`"" == 0` is `False`),
so this is pure negative transfer for a Pythonista — the rule "loose equality is
fine" from Python actively misleads here. Treat JS `==` as a footgun and reach
for `===`.
