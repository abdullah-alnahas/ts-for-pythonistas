---
title: Functions
subtitle: Declarations, arrow functions, typed parameters, defaults, rest — and which form to reach for
---

Functions are where TypeScript's type annotations do their most useful work: they pin down the inputs and the output so callers can't pass the wrong thing. The syntax for a named function is close to Python's; the surprise is the second form, the arrow function, which has no real Python equivalent and which you'll write constantly.

## Declarations

:::compare run
```python
def format_money(amount: float) -> str:
    return f"${amount:.2f}"

print(format_money(3.5))
```
```typescript
function formatMoney(amount: number): string {
  return `$${amount.toFixed(2)}`;
}

console.log(formatMoney(3.5));
```
:::

`def` becomes `function`. The parameter annotation is Python's `name: type`. The return type goes after the parameter list with the same `: type` syntax (Python's `->` becomes a trailing colon). Note `formatMoney` — TypeScript convention is `camelCase` for functions and variables, `PascalCase` for types and classes, not Python's `snake_case`.

Return-type annotations are optional — the compiler infers them — but on exported, public functions most teams write them anyway. The annotation makes the function's contract explicit and turns "I accidentally returned the wrong thing" into an error at the function, not at some distant call site.

## Parameters: defaults, optional, rest

All three of Python's parameter features have direct equivalents, plus one new distinction.

:::compare run
```python
def greet(name: str, greeting: str = "hi", *rest: str) -> str:
    return f"{greeting}, {name} {' '.join(rest)}"

print(greet("Sam"))
print(greet("Sam", "yo", "and", "co"))
```
```typescript
function greet(name: string, greeting = "hi", ...rest: string[]): string {
  return `${greeting}, ${name} ${rest.join(" ")}`;
}

console.log(greet("Sam"));
console.log(greet("Sam", "yo", "and", "co"));
```
:::

- **Default values**: `greeting = "hi"` — identical idea, and the type is inferred from the default.
- **Rest parameters**: `*rest` becomes `...rest`, and it must be typed as an array (`string[]`).
- **Optional parameters**: the new one. A parameter can be marked optional with `?`, meaning the caller may omit it, in which case it's `undefined`:

```typescript
function add(description: string, amount: number, note?: string): void {
  // note is `string | undefined` here
}
add("coffee", 3.5);          // ok, note omitted
add("coffee", 3.5, "morning"); // ok
```

This is how we'll translate our spine's `note: str | None = None` parameter — an optional `note?: string`. A required parameter cannot follow an optional one, same as Python.

There are **no keyword arguments**. You cannot call `greet(name="Sam")`. The universal pattern for "named, optional configuration" is to pass a single object and destructure it — you'll see it everywhere:

```typescript
function connect(opts: { host: string; port?: number; tls?: boolean }): void { /* ... */ }
connect({ host: "db.local", tls: true }); // reads like kwargs
```

## Arrow functions

The second form is the **arrow function** — an expression that evaluates to a function, used for callbacks and short helpers. Its closest Python relative is `lambda`, but unlike `lambda` it has no body restriction: it can be one expression or a full block.

:::compare run
```python
# lambda: single expression only
is_big = lambda e: e > 100

# multi-statement needs a def
def double(x):
    return x * 2

print(is_big(150), double(21))
```
```typescript
// arrow: single expression — the value is returned implicitly
const isBig = (e: number) => e > 100;

// block body — needs an explicit return
const double = (x: number) => {
  return x * 2;
};

console.log(isBig(150), double(21));
```
:::

The rules: `(params) => expression` returns the expression's value with no `return` keyword. `(params) => { statements }` is a normal block where you `return` explicitly. A single typed parameter still needs parentheses in TypeScript. This is the form you pass to `.map`, `.filter`, `setTimeout`, event handlers — anywhere Python would take a `lambda` or a named function. Our spine's `lambda e: e.amount > 100` becomes `(e) => e.amount > 100`, and the `asyncio.sleep` wrapper becomes an arrow too.

## Which form, and the one real difference

For top-level named functions, either form works and teams pick one; `function` declarations have the advantage of *hoisting* (callable before their definition line in the file). For callbacks and methods-assigned-to-fields, use arrows. The one behavioral difference that matters: arrow functions don't bind their own `this`, they inherit it from the surrounding scope. That solves a whole class of bugs that the `function` keyword creates inside classes — covered in [[this binding|this-binding]] when we get to classes. Until then: **arrows for callbacks, and you'll rarely be wrong.**

**File status:** ✅ `format_money` translated; the arrow form is ready for the `lambda` and the `sleep` helper later. ⏳ the rest still Python. Next: `null`, `undefined`, and optional chaining — TypeScript's two flavors of "nothing."
