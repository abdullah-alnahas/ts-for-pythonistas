---
title: Setup and running TypeScript
subtitle: The toolchain, a tsconfig that works, and the one Python program we will translate end to end
---

You already know how to program. You design systems, read unfamiliar languages, and reach for the docs when syntax escapes you. So this course skips what a loop *is* and shows you what a loop *looks like* in TypeScript, next to the Python you'd write for the same thing. Every lesson is the same shape: here is the TypeScript, here is the Python equivalent, here are the differences that will trip you up, here is how people actually write it.

To keep it concrete, the whole course translates one real program. This is it — `ledger.py`, a tiny command-line expense tracker. No third-party packages, runs with `python ledger.py`:

```python
"""ledger.py — a tiny command-line expense ledger."""

from __future__ import annotations

import asyncio
from dataclasses import dataclass
from enum import Enum
from typing import Callable, TypeVar

CURRENCY = "$"
WARN_OVER = 1000.0

T = TypeVar("T")


class Category(Enum):
    FOOD = "food"
    RENT = "rent"
    TRANSPORT = "transport"
    FUN = "fun"


@dataclass
class Expense:
    id: int
    description: str
    amount: float
    category: Category
    note: str | None = None

    @property
    def label(self) -> str:
        suffix = f" ({self.note})" if self.note else ""
        return f"#{self.id} {self.description}{suffix}"


class Ledger:
    def __init__(self) -> None:
        self._items: list[Expense] = []
        self._next_id = 1

    def add(self, description: str, amount: float, category: Category,
            note: str | None = None) -> Expense:
        item = Expense(self._next_id, description, amount, category, note)
        self._items.append(item)
        self._next_id += 1
        return item

    @property
    def total(self) -> float:
        return sum(item.amount for item in self._items)

    def all(self) -> list[Expense]:
        return list(self._items)

    def categories(self) -> set[Category]:
        return {item.category for item in self._items}

    def by_category(self) -> dict[Category, float]:
        totals: dict[Category, float] = {}
        for item in self._items:
            totals[item.category] = totals.get(item.category, 0.0) + item.amount
        return totals

    @staticmethod
    def describe(category: Category) -> str:
        match category:
            case Category.FOOD:
                return "groceries and eating out"
            case Category.RENT:
                return "a roof over your head"
            case Category.TRANSPORT:
                return "getting around"
            case Category.FUN:
                return "the good stuff"


def parse_amount(raw: str | float) -> float:
    if isinstance(raw, str):
        try:
            raw = float(raw)
        except ValueError:
            raise ValueError(f"not a number: {raw!r}")
    if raw < 0:
        raise ValueError("amount must be positive")
    return raw


def find_first(items: list[T], keep: Callable[[T], bool]) -> T | None:
    for item in items:
        if keep(item):
            return item
    return None


def format_money(amount: float) -> str:
    return f"{CURRENCY}{amount:.2f}"


def summarize(ledger: Ledger) -> str:
    lines = [f"{item.label}: {format_money(item.amount)}" for item in ledger.all()]
    for category, subtotal in ledger.by_category().items():
        lines.append(f"  {category.value} — {Ledger.describe(category)}: {format_money(subtotal)}")
    lines.append(f"total: {format_money(ledger.total)}")
    if ledger.total > WARN_OVER:
        lines.append("(over budget!)")
    return "\n".join(lines)


SEED: list[tuple[str, str | float, Category, str | None]] = [
    ("coffee", "3.50", Category.FOOD, "morning"),
    ("rent", 1200, Category.RENT, None),
    ("bus pass", "55", Category.TRANSPORT, None),
    ("cinema", 14, Category.FUN, "new release"),
]


async def load_seed(ledger: Ledger) -> None:
    for description, raw, category, note in SEED:
        await asyncio.sleep(0)  # pretend each row comes from slow I/O
        ledger.add(description, parse_amount(raw), category, note)


async def main() -> None:
    ledger = Ledger()
    await load_seed(ledger)
    print(f"tracking {len(ledger.categories())} categories")
    print(summarize(ledger))

    big = find_first(ledger.all(), lambda e: e.amount > 100)
    if big is not None:
        print(f"biggest single hit: {big.label}")


if __name__ == "__main__":
    asyncio.run(main())
```

That one file uses almost every construct you'll meet: constants, control flow, functions with defaults, optionals, dicts and lists and sets and tuples, f-strings, a dataclass, an enum, unions, `isinstance`, a generic, a class, decorators, imports, and `async` with error handling. Over the next fifteen lessons we translate it piece by piece. Each lesson converts the parts it teaches into TypeScript and leaves the rest in Python on purpose, so you can always see how far the migration has come. By the final lesson the whole file is `ledger.ts`, it compiles under `--strict` with zero errors, and `node` runs it to the same output Python produces.

## Running TypeScript at all

The first difference is the one that surprises every Python developer: nothing runs your `.ts` file directly the way `python` runs your `.py`. TypeScript is a layer on top of JavaScript; a tool removes the types and produces JavaScript, and a JavaScript runtime ([[Node|node]], [[Deno|node]], a [[browser]]) runs that.

:::compare
```python
# one step: the interpreter runs your source
python ledger.py
```
```bash
# classic two steps: compile to JS, then run the JS
tsc ledger.ts        # emits ledger.js
node ledger.js
```
:::

You rarely do those two steps by hand during development. The common setups:

- **Node 22.18+** runs `.ts` directly by stripping types: `node ledger.ts`. No build step, no config, good for scripts.
- **[`tsx`](https://github.com/privatenumber/tsx)** — `npx tsx ledger.ts` — the most common "just run it" tool on older Node. Think of it as `python` for TypeScript.
- **[Bun](https://bun.sh)** and **[Deno](https://deno.com)** run `.ts` natively: `bun ledger.ts`, `deno run ledger.ts`.
- **`tsc`**, the official compiler, is what you use to *type-check* and to emit JavaScript for production. Even when a runtime strips types for you, `tsc --noEmit` is what actually tells you about type errors — the runtimes above ignore them and run anyway.

The mental split worth keeping: **running** your code (any of the above) is separate from **type-checking** it (`tsc`). A file can run fine and still be full of type errors, because the runtime deletes the types without reading them. `tsc` is the part that reads them.

## A project that type-checks

For anything bigger than a one-off script you want a `package.json` and a `tsconfig.json`. The minimum that gives you real checking:

```bash
mkdir ledger && cd ledger
npm init -y
npm install --save-dev typescript
npx tsc --init        # creates tsconfig.json
```

`tsconfig.json` is to `tsc` what `pyproject.toml`'s `[tool.mypy]` section is to mypy: the one place that configures the checker. The settings that matter on day one:

```json
{
  "compilerOptions": {
    "strict": true,
    "target": "es2020",
    "module": "nodenext",
    "outDir": "dist"
  }
}
```

`strict` is the big one — it turns on the checks that make TypeScript worth using (we break it down in the variables lesson). Leave it on. `target` sets which JavaScript version `tsc` emits; `es2020` is a safe modern baseline. With this in place, `npx tsc` checks every `.ts` file in the project and writes JavaScript to `dist/`.

## Hello, and the goal

Create `ledger.ts` with one line and run it, just to prove the pipeline works:

:::compare run
```python
print("ledger: starting from scratch")
```
```typescript
console.log("ledger: starting from scratch");
```
:::

`print` is `console.log`. (Try the **Run** button on the TypeScript above — every runnable example in this course executes in your browser.) That `console.log` is the entire TypeScript file so far. Everything else is still Python, waiting. Run the original whenever you want the target output:

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

That is what `ledger.ts` will print, from `node`, by the end.

**File status:** `ledger.ts` exists with a single `console.log`. Everything else lives in `ledger.py`. Next we translate the two module constants.
