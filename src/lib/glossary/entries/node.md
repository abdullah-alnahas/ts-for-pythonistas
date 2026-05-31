---
term: Node
short: Node.js — a JavaScript runtime that pairs the V8 engine with server-side APIs (filesystem, network, processes). It's what lets JavaScript run outside a browser, the way `python` runs a .py file.
domain: js
related: v8, browser, event-loop
---

Node.js is a JavaScript **runtime environment**: it embeds the [[v8|V8]]
engine and adds the APIs a program needs outside a browser — filesystem
(`fs`), network (`http`, sockets), processes, environment variables, a
module system. V8 runs the language; Node provides the world around it.

For a Python developer, the closest single thing to the `python` command
is the `node` command: both are the CLI that executes your code against a
standard library.

```bash
node app.js     # run JavaScript, like `python app.py`
```

What Node deliberately does *not* do, matching the rest of this course's
model:

- It does **not** type-check. `node` runs JavaScript; TypeScript must be
  [[type-erasure|erased]] first (by `tsc`, `tsx`, or Node's own
  type-stripping, none of which check types).
- It runs on a single-threaded [[event-loop|event loop]], like
  `asyncio` — concurrency without threads.

The other major runtime environment is [[browser|the browser]], which uses
the same V8 engine but swaps Node's server APIs for the DOM. Newer runtimes
(Bun, Deno) fill the same niche as Node; Bun and Deno can run TypeScript
directly by stripping types, still without checking them.
