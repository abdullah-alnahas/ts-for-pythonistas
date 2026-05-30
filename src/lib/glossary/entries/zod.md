---
term: zod
short: A TypeScript-first runtime validation library — you declare a schema once, and it both validates unknown data at runtime and gives you a static type inferred from that schema. The runtime counterpart to erased types at the program's edge.
domain: ts
related: type-erasure, mypy, branded-types
---

**zod** is a runtime validation library for TypeScript. You describe the shape
of some data as a *schema* value, and that one schema does two jobs: it checks
real data at runtime, and it carries a static type you can pull out with
`z.infer`.

```ts
import { z } from "zod";

const User = z.object({ name: z.string(), age: z.number().int() });
type User = z.infer<typeof User>;   // { name: string; age: number }

const parsed = User.parse(JSON.parse(input));   // throws if the data is wrong
// parsed is typed User — checked at runtime AND known to the compiler
```

It exists because of [[type erasure|type-erasure]]. Your `interface`s and
`type`s vanish at compile time, so they can say nothing about data that arrives
while the program runs — a request body, a parsed JSON file, an environment
variable, a database row. That data is `unknown` until something verifies it.
zod is that something: `parse` throws on bad input, `safeParse` returns a
discriminated `{ success: true; data } | { success: false; error }` result you
narrow. Either way, on the far side the value is both validated and correctly
typed, with the schema as the single source of truth — the type can't drift
from the check, because the type is *derived from* the check.

This is the standard answer to "where do types meet reality" in TypeScript:
`tsc` proves the contracts inside your code, and a schema like zod guards the
edges where outside data gets in.

## Python anchor

The closest analog is **pydantic**. Both validate at runtime and unify the
static and runtime view of a shape, but they run in opposite directions.
pydantic builds its validator *from* class-level annotations (the annotations
are the source, the validator is derived) — it can do this because Python keeps
those annotations at runtime ([[mypy]] reads the same ones statically). zod
inverts it: the schema is the source and the static type is *inferred from the
schema* with `z.infer`, because there are no runtime annotations for it to read.
Same goal — one declaration, checked both statically and at runtime — reached
from the opposite end, which is a direct consequence of erasure.
