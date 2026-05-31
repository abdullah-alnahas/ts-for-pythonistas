---
term: pyproject.toml
short: Python's single declarative project file — build config, dependencies, and tool settings (including the type checker's) live here. The TypeScript analogue split across package.json + tsconfig.json.
domain: py
related: tool-mypy, mypy
---

`pyproject.toml` is the standardized config file for a Python project
(PEP 518 / PEP 621). One TOML file holds the build system, project
metadata, dependencies, and per-tool settings. Tools read their own
table from it: `[tool.mypy]`, `[tool.ruff]`, `[tool.pytest.ini_options]`.

The TypeScript world splits the same job across two files:

- `package.json` — metadata, dependencies, scripts (like `[project]` +
  `[build-system]`).
- `tsconfig.json` — the compiler/type-checker settings (like
  [[tool-mypy|`[tool.mypy]`]]).

So when a lesson compares `tsconfig.json` to `pyproject.toml`, the precise
mapping is `tsconfig.json` ≈ the `[tool.mypy]` table inside `pyproject.toml`:
both are where you turn the type checker's strictness up or down.

```toml
# pyproject.toml
[tool.mypy]
strict = true
```

```json
// tsconfig.json
{ "compilerOptions": { "strict": true } }
```
