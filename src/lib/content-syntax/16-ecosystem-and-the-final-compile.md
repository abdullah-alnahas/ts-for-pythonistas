---
title: Ecosystem, tooling, and the final compile
subtitle: The whole program in TypeScript — compiling clean and running — plus the tools you'll meet on day one
---

Fifteen lessons ago, `ledger.py` was entirely Python. Every construct has now been translated: constants, control flow, functions, optionals, collections, strings, types, narrowing, a generic, a class, getters and statics, modules, and async with error handling. This lesson assembles the whole thing into one `ledger.ts`, compiles it under `--strict` with zero errors, and runs it on Node to the exact output Python produced. Then a tour of the tooling you'll reach for immediately.

## The whole program

Here is the finished `ledger.ts`. Run it — this is the complete spine, executing in your browser:

:::play
```typescript
// ledger.ts — a tiny command-line expense ledger, now in TypeScript.

const CURRENCY = "$";
const WARN_OVER = 1000;

enum Category {
  Food = "food",
  Rent = "rent",
  Transport = "transport",
  Fun = "fun",
}

interface Expense {
  id: number;
  description: string;
  amount: number;
  category: Category;
  note?: string;
}

function label(e: Expense): string {
  const suffix = e.note ? ` (${e.note})` : "";
  return `#${e.id} ${e.description}${suffix}`;
}

class Ledger {
  private items: Expense[] = [];
  private nextId = 1;

  add(description: string, amount: number, category: Category, note?: string): Expense {
    const item: Expense = { id: this.nextId, description, amount, category, note };
    this.items.push(item);
    this.nextId += 1;
    return item;
  }

  get total(): number {
    return this.items.reduce((sum, item) => sum + item.amount, 0);
  }

  all(): Expense[] {
    return [...this.items];
  }

  categories(): Set<Category> {
    return new Set(this.items.map((item) => item.category));
  }

  byCategory(): Map<Category, number> {
    const totals = new Map<Category, number>();
    for (const item of this.items) {
      totals.set(item.category, (totals.get(item.category) ?? 0) + item.amount);
    }
    return totals;
  }

  static describe(category: Category): string {
    switch (category) {
      case Category.Food:
        return "groceries and eating out";
      case Category.Rent:
        return "a roof over your head";
      case Category.Transport:
        return "getting around";
      case Category.Fun:
        return "the good stuff";
      default: {
        const unreachable: never = category;
        throw new Error(`unknown category: ${String(unreachable)}`);
      }
    }
  }
}

function parseAmount(raw: string | number): number {
  let value = raw;
  if (typeof value === "string") {
    value = Number(value);
    if (Number.isNaN(value)) {
      throw new Error(`not a number: ${JSON.stringify(raw)}`);
    }
  }
  if (value < 0) {
    throw new Error("amount must be positive");
  }
  return value;
}

function findFirst<T>(items: T[], keep: (item: T) => boolean): T | undefined {
  for (const item of items) {
    if (keep(item)) {
      return item;
    }
  }
  return undefined;
}

function formatMoney(amount: number): string {
  return `${CURRENCY}${amount.toFixed(2)}`;
}

function summarize(ledger: Ledger): string {
  const lines = ledger.all().map((item) => `${label(item)}: ${formatMoney(item.amount)}`);
  for (const [category, subtotal] of ledger.byCategory()) {
    lines.push(`  ${category} — ${Ledger.describe(category)}: ${formatMoney(subtotal)}`);
  }
  lines.push(`total: ${formatMoney(ledger.total)}`);
  if (ledger.total > WARN_OVER) {
    lines.push("(over budget!)");
  }
  return lines.join("\n");
}

type Seed = [string, string | number, Category, string | undefined];

const SEED: Seed[] = [
  ["coffee", "3.50", Category.Food, "morning"],
  ["rent", 1200, Category.Rent, undefined],
  ["bus pass", "55", Category.Transport, undefined],
  ["cinema", 14, Category.Fun, "new release"],
];

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function loadSeed(ledger: Ledger): Promise<void> {
  for (const [description, raw, category, note] of SEED) {
    await sleep(0); // pretend each row comes from slow I/O
    ledger.add(description, parseAmount(raw), category, note);
  }
}

async function main(): Promise<void> {
  const ledger = new Ledger();
  await loadSeed(ledger);
  console.log(`tracking ${ledger.categories().size} categories`);
  console.log(summarize(ledger));

  const big = findFirst(ledger.all(), (e) => e.amount > 100);
  if (big !== undefined) {
    console.log(`biggest single hit: ${label(big)}`);
  }
}

main();
```
:::

## Compiling it for real

In a project, this file lives next to a `tsconfig.json`:

```json
{
  "compilerOptions": {
    "strict": true,
    "target": "es2020",
    "lib": ["es2020", "dom"],
    "module": "commonjs",
    "noUnusedLocals": true,
    "noUnusedParameters": true
  },
  "files": ["ledger.ts"]
}
```

```bash
tsc -p tsconfig.json   # 0 errors, 0 warnings
node ledger.js
```

The output is byte-for-byte what `python ledger.py` prints:

```
tracking 4 categories
#1 coffee (morning): $3.50
#2 rent: $1200.00
#3 bus pass: $55.00
#4 cinema (new release): $14.00
  food — groceries and eating out: $3.50
  rent — a roof over your head: $1200.00
  transport — getting around: $55.00
  fun — the good stuff: $14.00
total: $1272.50
(over budget!)
biggest single hit: #2 rent
```

That `strict` flag carried every guarantee in the course: `strictNullChecks` forced the optional-`note` handling, the `never` in `describe` makes a missing category a compile error, `noUnusedLocals` keeps the file honest. This is the payoff TypeScript promises — the program either compiles clean or tells you exactly what's unsound, before it runs.

## The tooling you'll meet immediately

A real project is more than `tsc`. The pieces, with their Python analogs:

| Job | TypeScript tool | Python analog |
|---|---|---|
| package manifest / deps | `package.json` + npm / pnpm / [Bun](https://bun.sh) | `pyproject.toml` + pip / uv |
| type checker / compiler | `tsc` | mypy / pyright |
| formatter | [Prettier](https://prettier.io) | Black / Ruff format |
| linter | [ESLint](https://eslint.org) (`typescript-eslint`) | Ruff / flake8 |
| test runner | [Vitest](https://vitest.dev) / [Jest](https://jestjs.io) | pytest |
| runtime validation | [Zod](https://zod.dev) | Pydantic |
| web server | [Express](https://expressjs.com) / [Fastify](https://fastify.dev) | FastAPI / Flask |
| bundler (frontend) | [Vite](https://vite.dev) / esbuild | — |

Two deserve a closer word for a Python developer:

- **[[Zod]] is your Pydantic.** Because types are erased (lesson 08), you can't trust data crossing a runtime boundary — a JSON body, an env var, a database row — just because you annotated it. Zod defines a schema *once* and gives you both runtime validation and a static type: `const Expense = z.object({ id: z.number(), amount: z.number() }); type Expense = z.infer<typeof Expense>;`. Parse untyped input through it and what comes out is both validated and typed. This is the standard answer to "but how do I know the API actually sent me an `Expense`."
- **`package.json` scripts** are where commands live: `"scripts": { "build": "tsc", "test": "vitest", "lint": "eslint ." }`, run with `npm run build`. It's the `Makefile`/`[tool.*]` of the ecosystem.

## Where to go from here

You can now read and write idiomatic TypeScript: declarations, control flow, functions, the type system, classes, modules, and async. What's left is depth, and this site has it:

- The **Mapped to Python** course goes concept-by-concept into *why* the type system behaves as it does — variance, structural typing, inference.
- **How Types Really Work** builds a type checker by hand, then shows `tsc` is the same idea at compile time.
- The **Glossary** is the reference for the deep cuts this course pointed at: [[structural typing|structural-typing]], [[narrowing]], [[generics|mapped-types]], [[type erasure|type-erasure]], [[the event loop|event-loop]], [[Zod]].

You already knew how to program. Now you know how to write TypeScript.

**File status:** ✅ complete. `ledger.ts` compiles under `--strict` with zero errors and runs on Node to output identical to `ledger.py`. The translation is done.
