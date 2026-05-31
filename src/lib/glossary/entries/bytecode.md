---
term: bytecode
short: A compact, low-level instruction set a virtual machine executes, sitting between human source and native machine code. Python compiles to bytecode; so, internally, does V8's JavaScript.
domain: swe
related: python-vm, cpython, pyc, v8
---

Bytecode is an intermediate instruction format: lower-level than source,
higher-level than the CPU's native machine code. A [[python-vm|virtual
machine]] interprets it. The name comes from each opcode historically
being one byte.

Python's compile step turns your `.py` into bytecode, which the
[[cpython|CPython]] VM then runs. You can see it:

```python
import dis
def add(a, b): return a + b
dis.dis(add)
#   LOAD_FAST  a
#   LOAD_FAST  b
#   BINARY_OP  +
#   RETURN_VALUE
```

This is why "Python is interpreted" is only half true: there *is* a
compile step (source → bytecode), it just targets a VM instead of the
hardware, and types are ignored during it.

JavaScript engines do the same internally. [[v8|V8]] compiles JS to
bytecode for its **Ignition** interpreter, then JIT-compiles the hot parts
to native code with **TurboFan**. The difference from Python is mostly that
V8 aggressively JITs; CPython historically interpreted bytecode straight
through (a JIT is arriving in newer versions).

TypeScript itself never reaches bytecode as TypeScript — it is
[[type-erasure|erased]] to JavaScript first, and the *engine* compiles
that.
