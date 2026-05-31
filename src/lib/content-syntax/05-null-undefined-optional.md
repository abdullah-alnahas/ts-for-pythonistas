---
title: null, undefined, and optional chaining
subtitle: Two flavors of "nothing," the operators that handle them safely, and how strict mode forces the issue
---

Python has one absence value: `None`. TypeScript has two — `null` and `undefined` — and a small family of operators built specifically for handling them. This is also where `strict` mode pays off: with it on, the compiler refuses to let you touch a value that might be missing without checking first. This lesson translates our spine's optional `note` field.

## `null` vs `undefined`

Both mean "no value," and the distinction is more cultural than logical:

- **`undefined`** — the absence the language produces. An unset variable, a missing object property, a parameter you didn't pass, a function with no `return` — all are `undefined`.
- **`null`** — the absence you assign deliberately, to say "intentionally empty."

| | Python | TypeScript |
|---|---|---|
| the value | `None` | `undefined` (default) / `null` (explicit) |
| missing property | `AttributeError` | `undefined` |
| function returns nothing | `None` | `undefined` |

A practical rule that keeps you out of trouble: **let `undefined` be the default, use optional properties (`?`), and don't introduce `null` yourself** unless an API hands it to you. That collapses the two-value awkwardness most of the time. Our `note: str | None` becomes an optional property, which is `string | undefined` — no `null` needed.

## strictNullChecks: the check that matters

With `strict` on (which includes `strictNullChecks`), a `string` is *guaranteed* to be a string — never null, never undefined. If a value can be missing, its type must say so with a union, and the compiler then forces you to handle the missing case before you use it.

:::compare run
```python
# Python: None slips through until it explodes at runtime
def label(note):
    return f"note: {note.upper()}"   # AttributeError if note is None

# label(None)  -> crash
print(label("morning"))
```
```typescript
function label(note: string | undefined): string {
  // return note.toUpperCase();  // compile error: 'note' is possibly undefined
  if (note === undefined) {
    return "note: (none)";
  }
  return `note: ${note.toUpperCase()}`; // here TS knows note is string
}

console.log(label("morning"));
```
:::

The error is the feature. `note.toUpperCase()` won't compile while `note` might be `undefined`; once you've checked, the compiler *narrows* the type to `string` inside the branch and lets you proceed. The runtime `AttributeError` becomes a compile-time red underline.

## The three operators

Checking with `if` works, but three operators make the common cases terse.

**Optional chaining `?.`** — access a property only if the thing isn't null/undefined; otherwise short-circuit to `undefined` instead of throwing. This is Python's "I wish `a.b.c` didn't crash when `a` is None."

:::compare run
```python
note = None
# guard by hand, or getattr gymnastics
length = len(note) if note is not None else None
print(length)
```
```typescript
const note: string | undefined = undefined;
const length = note?.length;   // undefined, no crash
console.log(length);

// chains and stops at the first nullish link:
// user?.profile?.email?.toLowerCase()
```
:::

**Nullish coalescing `??`** — "use the left value, but if it's null/undefined, use the right." It's `||` but it only falls back on `null`/`undefined`, not on every falsy value — so it doesn't wrongly replace `0` or `""`.

:::compare run
```python
amount = 0
shown = amount if amount is not None else 100   # keeps 0
fallback = amount or 100                          # WRONG: 0 is falsy -> 100
print(shown, fallback)
```
```typescript
const amount: number | undefined = 0;
const shown = amount ?? 100;   // 0  — only null/undefined trigger fallback
const wrong = amount || 100;   // 100 — || also falls back on 0, the classic bug
console.log(shown, wrong);
```
:::

Reach for `??` over `||` whenever the fallback is about *missing*, not about *falsy*. Using `||` for defaults is one of the most common bugs in JavaScript code, because `0`, `""`, and `false` are legitimate values that `||` throws away.

**Non-null assertion `!`** — "trust me, this isn't null." It tells the compiler to drop the null/undefined from a type without checking. It's the `# type: ignore` of the null world: occasionally necessary, usually a smell, and it does nothing at runtime — if you're wrong, you get the crash back.

```typescript
const el = document.querySelector(".x")!; // "I know it exists"  — verify you actually do
```

Now the real translation. Our spine's `label` uses the note only if it's present:

:::compare run
```python
def label(id, description, note=None):
    suffix = f" ({note})" if note else ""
    return f"#{id} {description}{suffix}"

print(label(1, "coffee", "morning"))
print(label(2, "rent"))
```
```typescript
function label(id: number, description: string, note?: string): string {
  const suffix = note ? ` (${note})` : "";
  return `#${id} ${description}${suffix}`;
}

console.log(label(1, "coffee", "morning"));
console.log(label(2, "rent"));
```
:::

`note?: string` is the optional parameter from the functions lesson; inside, `note` is `string | undefined`, and the ternary handles the missing case exactly like the Python.

**File status:** ✅ `label` translated; the optional `note` pattern is set for the `Expense` type later. ⏳ collections, types, the class, async still Python. Next: objects, arrays, Maps, and Sets.
