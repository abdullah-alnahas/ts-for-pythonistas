---
term: Python VM
short: The stack-based virtual machine inside CPython that executes bytecode. The runtime "computer" your Python actually runs on — analogous to V8's bytecode interpreter for JavaScript.
domain: py
related: cpython, bytecode, pyc, v8
---

The Python VM is the part of [[cpython|CPython]] that executes
[[bytecode]]. It's a **stack machine**: opcodes push and pop values on an
evaluation stack rather than naming registers. The big evaluation loop that
dispatches one opcode after another is informally "the bytecode
interpreter" (historically a giant `switch` in C called the *ceval loop*).

It is the runtime your code truly runs on. Source and types are long gone
by the time the VM sees a `LOAD_FAST` or `BINARY_OP`; the VM only knows
values and opcodes. That's the concrete reason Python's type hints have no
runtime effect — same shape of fact as TypeScript types being
[[type-erasure|erased]] before [[v8|V8]] runs the JavaScript.

Mental mapping:

| Python | JavaScript |
| --- | --- |
| `.py` source | `.ts` / `.js` source |
| [[cpython|CPython]] compiler → [[bytecode]] | [[v8|V8]] parser → bytecode |
| Python VM (ceval loop) | V8 Ignition interpreter |

Both languages are "compile to bytecode, run on a VM." The everyday
difference is that V8 then JIT-compiles hot bytecode to native code, which
CPython has only recently begun to do.
