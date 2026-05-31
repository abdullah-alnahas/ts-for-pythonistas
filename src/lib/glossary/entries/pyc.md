---
term: .pyc
short: A cached compiled-bytecode file Python writes so it can skip re-parsing source on the next import. Stored under __pycache__/. A build cache, not a distributable binary.
domain: py
related: pycache, bytecode, cpython, python-vm
---

A `.pyc` file holds the [[bytecode]] [[cpython|CPython]] produced from a
`.py` module, plus a small header recording the source's timestamp/hash and
the Python version. On the next import, if the source is unchanged, Python
loads the `.pyc` and skips parse-and-compile.

It's purely a cache:

- Deleting `.pyc` files is always safe — they regenerate on next run.
- They're version-specific: the filename encodes the interpreter, e.g.
  `app.cpython-312.pyc`.
- They live in [[pycache|`__pycache__/`]] (for imported modules).
- They are **not** a compiled binary you ship; the source still drives
  everything, and the bytecode is trivially decompilable.

The honest TypeScript-build analogy is `tsc`'s `.tsbuildinfo` /
`outDir`-cached output or a bundler's cache: artifacts that exist to make
the next build faster, never the thing you reason about. Note types play no
part here — a `.pyc` is produced after hints are ignored, exactly as
TypeScript's emitted `.js` is produced after types are
[[type-erasure|erased]].
