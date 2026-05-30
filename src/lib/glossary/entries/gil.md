---
term: GIL (global interpreter lock)
short: CPython's mutex that lets only one thread execute Python bytecode at a time — so threads help with I/O but not CPU-bound parallelism.
domain: py
related: event-loop, slots
---

The **Global Interpreter Lock** is a mutex in CPython that serializes execution
of Python bytecode: even on a multicore machine, only one thread runs Python
code at any instant. It exists to make reference-counting memory management
thread-safe without per-object locks.

Consequences:

- **I/O-bound** work *does* benefit from threads — the GIL is released during
  blocking I/O and many C extension calls.
- **CPU-bound** work does **not** scale across threads; you reach for
  `multiprocessing`, subinterpreters, or native extensions instead.
- It's a CPython implementation detail, not a language rule (PyPy has it too;
  free-threaded "no-GIL" builds are emerging in 3.13+).

## JS/TS anchor

JavaScript is *natively* single-threaded for your code — there's no shared-memory
threading to lock in the first place. Concurrency comes from the [[event loop]]
(cooperative, one task at a time), and true parallelism comes from **Web
Workers / Worker threads**, which don't share mutable memory (they message-pass),
sidestepping the whole locking problem. So both ecosystems end up at "one thread
runs your logic," but for different reasons.
