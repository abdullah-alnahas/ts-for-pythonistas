---
term: CPython
short: The reference Python implementation, written in C. It compiles your source to bytecode and runs it on a stack-based VM. "Python" on your machine almost always means CPython.
domain: py
related: bytecode, python-vm, pyc, pycache, gil
---

CPython is the original and standard implementation of Python, written in
C. When you type `python` and it isn't otherwise configured, you are
running CPython. It is the thing that owns the [[gil|GIL]], the
`__pycache__` directory, and the `.pyc` files.

What it does when you run a file:

1. Parse the `.py` source into an AST.
2. Compile that to [[bytecode]] (a compact instruction format).
3. Execute the bytecode on the [[python-vm|CPython VM]], a stack machine.

The bytecode is cached to [[pyc|`.pyc`]] files under
[[pycache|`__pycache__/`]] so step 1–2 can be skipped next time.

Other implementations exist and skip or replace parts of this: **PyPy**
(JIT-compiled, much faster for long-running code), **Jython** (runs on the
JVM), **GraalPy**. They're API-compatible but not bytecode-compatible.

The TypeScript-world counterpart to "CPython is the C program that runs
Python" is "[[v8|V8]] is the C++ engine that runs JavaScript." Both are
the concrete machine underneath a language people discuss in the abstract.
