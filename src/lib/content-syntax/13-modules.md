---
title: Modules
subtitle: import and export, named vs default, and the file-extension rule that confuses everyone
---

A TypeScript file is a module, and `import`/`export` move things between files. The concepts match Python's almost exactly — the syntax differs, there's a named-vs-default fork Python doesn't have, and one resolution rule (the file extension in imports) reliably trips up newcomers. To exercise it, we split our single `ledger.ts` into a small module layout.

## Every export is explicit

The core difference from Python: nothing leaves a file unless you `export` it. There's no module-level "everything public by default." A file with no exports is private to itself.

:::compare run
```python
# category.py
from enum import Enum

class Category(Enum):
    FOOD = "food"
    RENT = "rent"

CURRENCY = "$"           # importable: module globals are public
```
```typescript
// category.ts
export enum Category {
  Food = "food",
  Rent = "rent",
}

export const CURRENCY = "$"; // only `export`-ed names are importable
const internal = "hidden";   // no export -> private to this file
```
:::

Put `export` in front of any declaration — `export const`, `export function`, `export class`, `export interface`, `export type`, `export enum`. That name is now importable; everything else stays local.

## Named imports

The common form maps directly to Python's `from module import name`:

:::compare run
```python
from category import Category, CURRENCY
from category import Category as Cat

print(Category.FOOD, CURRENCY)
```
```typescript
import { Category, CURRENCY } from "./category.js";
import { Category as Cat } from "./category.js";

console.log(Category.Food, CURRENCY);
```
:::

`from x import a, b` becomes `import { a, b } from "./x.js"`. Aliasing is `as`, same word. To bring in everything as a namespace — Python's `import category` — use `import * as category from "./category.js"` and then `category.Category`.

## The extension rule (the gotcha)

Look closely at those imports: `"./category.js"` — with a `.js` extension, even though the file is `category.ts`. In modern ESM module resolution (`"module": "nodenext"`), **relative imports must include the extension, and it's `.js`, not `.ts`** — because you're importing the *compiled output*, and the compiler doesn't rewrite the path. This is the single most common "why won't it resolve" for newcomers.

- Modern Node ESM (`nodenext`): write `./category.js`. Verified by the compiler.
- Bundlers (Vite, webpack) and some setups: extensionless `./category` works.
- Bun / Deno: extension rules of their own (Deno wants the explicit extension too).

When in doubt, follow the extension your `tsconfig`'s module setting demands; `nodenext` is increasingly the default and it wants `.js`. There is no `__init__.py` and no implicit package; a directory isn't a module, a file is.

## Default exports (and why named usually wins)

TypeScript adds a feature Python lacks: a module can have one **default** export, imported without braces under any name you choose.

:::compare
```python
# Python has no "default" — you always name what you import
from ledger import Ledger
```
```typescript
// default export — the importer picks the name
export default class Ledger { /* ... */ }
// elsewhere:
import Ledger from "./ledger.js";     // no braces; name is arbitrary
import Whatever from "./ledger.js";   // also legal — same thing
```
:::

Most style guides now **prefer named exports** even for a file's main thing, because the name is fixed across the codebase (better autocomplete, safer renames, no two files calling the same import different names). React components and some libraries still use defaults; mixing is fine. Rule of thumb: default named exports unless a tool expects a default.

## `import type` — a TypeScript-only wrinkle

Because types are erased, importing something used *only as a type* can be marked `import type`, so the compiler knows to drop the import entirely from the output (it would otherwise be a runtime import of nothing):

```typescript
import type { Expense } from "./expense.js"; // erased at compile time
import { Ledger } from "./ledger.js";        // real runtime import
```

Not mandatory, but it prevents accidental runtime dependencies and is required under some strict settings (`verbatimModuleSyntax`).

## Splitting the spine

The single file becomes a small package. A common layout:

```
src/
  category.ts   // export enum Category; export const CURRENCY, WARN_OVER
  expense.ts    // export interface Expense; export function label(...)
  ledger.ts     // import { Category } ...; export class Ledger
  main.ts       // import { Ledger } ...; the async entry point
```

```typescript
// expense.ts
import { Category } from "./category.js";
export interface Expense { id: number; description: string; amount: number; category: Category; note?: string; }
export function label(e: Expense): string {
  const suffix = e.note ? ` (${e.note})` : "";
  return `#${e.id} ${e.description}${suffix}`;
}

// ledger.ts
import type { Expense } from "./expense.js";
import { Category } from "./category.js";
export class Ledger { /* ... as built in the classes lesson ... */ }
```

A **barrel file** — an `index.ts` that re-exports the package's public surface — is the closest thing to `__init__.py`:

```typescript
// index.ts
export { Category, CURRENCY, WARN_OVER } from "./category.js";
export { Ledger } from "./ledger.js";
export type { Expense } from "./expense.js";
```

For the finale we'll keep everything in one `ledger.ts` (it's a script, and one file is simplest to compile and run), but this is how you'd break it up the moment it grows. The [[Node|node]] resolver, bundlers, and `tsconfig` `paths` handle the lookup; the syntax above is all you write.

**File status:** unchanged code, now organized into modules — the import/export layer is understood. ⏳ only the async runtime section remains. Next: Promises, async/await, and error handling.
