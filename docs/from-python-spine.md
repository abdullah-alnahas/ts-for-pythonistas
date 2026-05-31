# "Straight to Syntax" — course spine & translation ledger

The fifth course (`id: syntax`, route `from-python`, title **Straight to Syntax**) is a
Python→TypeScript syntax reference for experienced engineers. Goal: *"You already know
how to program. Here is how you write TypeScript."* Breadth over depth; every construct
shown TS-first, then the Python equivalent, then the differences that bite.

## The spine conceit

One clean single-file Python program, `ledger.py`, runs through the whole course. Each
lesson translates the constructs it teaches into TypeScript, in place. The rest stays
Python on purpose, clearly marked, so the learner always sees how far the migration has
come. The final lesson assembles the complete `ledger.ts`, which **compiles under
`--strict` with zero errors and runs on Node producing output identical to the Python**.

Both endpoints are verified (see `/tmp/spine` during authoring; the canonical text lives
in the lessons). Verification command for the final file:

```
tsc -p tsconfig.json   # strict, target es2020, lib es2020+dom, noUnusedLocals/Params → 0 errors
node ledger.js         # output identical to `python ledger.py`
```

## Original `ledger.py`

The whole program the course starts from. Chosen because it exercises every construct in
the syllabus: consts, control flow, functions/defaults, `Optional`, dict/list/set/tuple,
f-strings + comprehensions, dataclass/`Enum`/unions, `isinstance` narrowing, a `TypeVar`
generic, a class with methods, `@dataclass`/`@property`/`@staticmethod`, imports, and
`asyncio` + `try/except`.

(See the verified source embedded in lessons 01 and 16.)

## Final `ledger.ts`

Idiomatic TS target. Key translation choices:

- `CURRENCY`/`WARN_OVER` → `const`; `WARN_OVER` drops the `.0` (one `number` type).
- `class Category(Enum)` → `enum Category { Food = "food", ... }` (string enum).
- `@dataclass Expense` → `interface Expense` (TS has no dataclass); `note: str | None` →
  optional `note?: string`.
- `@property label` → standalone `label(e)` then discussed as a getter in the decorators
  lesson; `Ledger.total` is the surviving `get` accessor.
- `dict` → `Map`, `set` → `Set`, `list` → array, `tuple[...]` → tuple type `Seed`.
- f-strings → template literals; comprehensions/`sum` → `.map`/`.reduce`.
- `match` → `switch` with a `never` exhaustiveness guard in `default`.
- `isinstance(x, str)` → `typeof x === "string"`; `float()` → `Number()` + `Number.isNaN`.
- `TypeVar`/`Callable` → `<T>` generic + `(item: T) => boolean`; `T | None` → `T | undefined`.
- `asyncio.sleep` → a `sleep()` wrapping `setTimeout` in a `Promise`; `await` is the same.

## Per-lesson translation ledger (single-owner: each unit is translated once)

| # | Lesson | Translates (owner) |
|---|--------|--------------------|
| 01 | Setup & running TS | nothing — meet `ledger.py`, install toolchain, create empty `ledger.ts` + `tsconfig.json`, run both |
| 02 | Variables & primitives | `CURRENCY`, `WARN_OVER` |
| 03 | Control flow | `describe()` (standalone `match`→`switch`); while/ternary/`===` via short asides |
| 04 | Functions | `format_money` (declaration, params, return type); arrow form via `sleep` + the `lambda` |
| 05 | null, undefined & optional chaining | `label` (`note` optional, `?.`, `??`) |
| 06 | Objects & collections | `SEED` (array + tuple); object literals for `Expense` rows; dict/set preview |
| 07 | Strings, numbers & built-ins | `summarize` (template literals, `.map`/`.reduce`/`.join`, `.toFixed`) |
| 08 | Types: alias, interface, union, enum | `Category`, `Expense`, `Seed`, the `note` union |
| 09 | Narrowing & type guards | `parse_amount` (`typeof`, `Number.isNaN`) |
| 10 | Generics & utility types | `find_first<T>` |
| 11 | Classes | `Ledger` skeleton: fields, `private`, constructor, `add`/`all`/`categories`/`byCategory` |
| 12 | Decorators & metadata | `Ledger.total` (`@property`→`get`), `Ledger.describe` (`@staticmethod`→`static`, relocated from L03) |
| 13 | Modules | split `ledger.ts` into `category.ts`/`expense.ts`/`ledger.ts` — `import`/`export` |
| 14 | Async & error handling | `loadSeed`, `main`, `sleep`, `await`, `try/catch` |
| 15 | JSX & a first React component | off-spine: Python has no JSX equivalent; show TS on the frontend |
| 16 | Ecosystem, tooling & the final compile | assemble full `ledger.ts`, `tsconfig`, `tsc` 0 errors, `node` run; npm/libs/what-next |

Each lesson ends with a short **File status** note (✅ translated / ⏳ still Python).
Full-file checkpoints at the end of L08 (data model), L14 (logic), and L16 (complete).
