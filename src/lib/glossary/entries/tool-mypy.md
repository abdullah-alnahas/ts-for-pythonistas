---
term: "[tool.mypy]"
short: The table inside pyproject.toml where mypy's settings live. The direct analogue of tsconfig.json's compilerOptions — this is where you set strict mode.
domain: py
related: pyproject-toml, mypy
---

`[tool.mypy]` is the section of [[pyproject-toml|`pyproject.toml`]] that
[[mypy]] reads for its configuration. (Older projects use a standalone
`mypy.ini` or `setup.cfg`; the TOML table is the modern home.)

It is the closest Python equivalent to `tsconfig.json`'s `compilerOptions`:
both are the one place you tune how strict the type checker is.

```toml
[tool.mypy]
strict = true              # turn everything on
warn_unused_ignores = true
disallow_untyped_defs = true
```

```json
// tsconfig.json — the parallel
{
  "compilerOptions": {
    "strict": true
  }
}
```

`strict = true` here switches on the same family of checks `strict: true`
does in TypeScript: no implicit `Any`, no silent `None`/`null`
holes. The shared lesson: start strict, don't loosen it to silence one
error.
