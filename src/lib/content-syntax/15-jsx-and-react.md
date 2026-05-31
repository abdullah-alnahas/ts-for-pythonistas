---
title: JSX and a first React component
subtitle: The one part of TypeScript with no Python equivalent — typed UI as expressions
---

Every other lesson translated Python to TypeScript. This one can't, because the thing it teaches has no Python counterpart: **JSX**, the syntax that lets you write HTML-like markup directly inside TypeScript, and the component model ([[React|node]] and friends) built on it. It's worth a lesson because the moment you touch a TypeScript frontend, this is most of what you'll read. For a backend engineer it's optional; for fluency in reading real TypeScript, it's unavoidable. The spine `ledger.ts` stays exactly as it was — this is a detour, not a translation.

## What JSX is

JSX is an expression syntax: HTML-like tags that evaluate to values you can store in variables, return from functions, and put in arrays. A file using it is `.tsx` (not `.ts`), and `tsconfig` needs `"jsx": "react-jsx"`. The closest Python mental model is a template engine like Jinja — but inverted. Jinja embeds Python *inside* HTML templates; JSX embeds HTML-like markup *inside* TypeScript, with the full type checker watching.

:::compare
```python
# Python's closest thing: build markup with a template or f-strings
def expense_row(description: str, amount: float) -> str:
    return f"<li>{description}: ${amount:.2f}</li>"

# or a Jinja template, evaluated separately from your code
```
```tsx
// JSX: markup is a typed expression, checked by the compiler
function ExpenseRow({ description, amount }: { description: string; amount: number }) {
  return <li>{description}: ${amount.toFixed(2)}</li>;
}
```
:::

The `{...}` inside the markup is an escape back into TypeScript — any expression, type-checked. It's the inverse of an f-string's `{}`, which escapes from text into Python. Misspell `amount` or call a method that doesn't exist and it's a compile error, inside the markup.

## A component is a function returning markup

A React component is just a function whose name is `PascalCase` and which returns JSX. Props — its inputs — are an object you type with an interface, and you usually destructure them in the parameter list.

```tsx
interface ExpenseRowProps {
  description: string;
  amount: number;
  note?: string;
}

function ExpenseRow({ description, amount, note }: ExpenseRowProps) {
  return (
    <li className="row">
      <span>{description}</span>
      {note && <em> ({note})</em>}      {/* render <em> only if note exists */}
      <strong>${amount.toFixed(2)}</strong>
    </li>
  );
}
```

Things to notice, because they're the common stumbles:

- **`className`, not `class`** — `class` is a reserved word, so the HTML attribute is renamed. `for` becomes `htmlFor` likewise. Attributes are `camelCase` (`onClick`, `tabIndex`).
- **`{note && <em>...</em>}`** — conditional rendering uses the `&&` short-circuit you learned in control flow. `{cond ? <A/> : <B/>}` for either/or. There's no `if` statement *inside* markup; you use expressions.
- **One root element** — a component returns a single node. Wrap siblings in a fragment `<>...</>` when you don't want an extra wrapper.

## Rendering a list — `.map` with a `key`

The array `.map` from the strings lesson is exactly how you render a collection. Each item needs a stable `key` prop so the renderer can track it:

```tsx
function ExpenseList({ expenses }: { expenses: Expense[] }) {
  return (
    <ul>
      {expenses.map((e) => (
        <ExpenseRow key={e.id} description={e.description} amount={e.amount} note={e.note} />
      ))}
    </ul>
  );
}
```

This is our `Ledger` data on screen: `expenses.map(...)` produces an array of `<ExpenseRow>` elements, one per expense, and JSX renders an array of elements in place. The `key={e.id}` is required for lists — forget it and you get a console warning.

## State and events, briefly

Interactivity uses *hooks* — functions like `useState` that give a component memory. `useState` is generic, so the state is fully typed, and the event handler is an arrow function (the [[this binding|this-binding]] reason from the classes lesson is exactly why):

```tsx
import { useState } from "react";

function AddButton() {
  const [count, setCount] = useState<number>(0); // typed state + setter
  return (
    <button onClick={() => setCount(count + 1)}>
      added {count}
    </button>
  );
}
```

`useState<number>(0)` returns a `[value, setter]` tuple — destructured by position, the tuple typing from the collections lesson. `onClick` takes a function, not a string; the handler is an arrow so it closes over `count` correctly.

## How much to learn

For reading and lightly editing a frontend, this is enough: components are typed functions returning JSX, props are typed objects, lists are `.map` with `key`, conditionals are `&&`/ternary, state is `useState`. The deeper topics — effects, context, the rendering model, the framework around React ([Next.js](https://nextjs.org), [Remix](https://remix.run)) — are their own course. The point here is that none of it is *new programming*; it's TypeScript syntax you already know (functions, objects, arrays, generics, arrows) pointed at the screen, plus JSX as the one genuinely new piece.

**File status:** the spine `ledger.ts` is untouched — JSX is off the translation path. Next, the finale: assemble the whole file, compile it under `--strict`, and run it on Node.
