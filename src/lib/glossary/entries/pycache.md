---
term: __pycache__/
short: The directory CPython writes .pyc bytecode caches into. Auto-generated, safe to delete, belongs in .gitignore. Python's equivalent of a build/cache folder.
domain: py
related: pyc, bytecode, cpython
---

`__pycache__/` is the folder [[cpython|CPython]] creates next to your
modules to hold their compiled [[pyc|`.pyc`]] [[bytecode]] caches. You never
create or edit it by hand.

Practical facts:

- **Auto-generated.** Appears the first time a module is imported.
- **Safe to delete.** It regenerates; removing it only forces one
  recompile.
- **Should be git-ignored.** It's machine- and version-specific build
  output, never source.
- The top-level script you run directly does *not* get a `.pyc` (only
  imported modules do).

If you've wondered why a Python repo's `.gitignore` lists
`__pycache__/`, this is why — it's the same reflex that puts `node_modules/`
or a `dist/` folder in `.gitignore`: generated artifacts stay out of
version control.
