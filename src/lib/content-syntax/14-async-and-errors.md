---
title: Async and error handling
subtitle: Promises, async/await, try/catch, and the differences from asyncio that actually matter
---

If you've used `asyncio`, TypeScript's `async`/`await` will feel like coming home — the keywords are the same and the model is similar. The differences are in the plumbing: a `Promise` instead of a coroutine, no event-loop you start by hand, and a single-threaded runtime where async is the *only* concurrency model. We finish the spine here, translating `loadSeed`, `main`, and the error handling.

## Promises are awaitable values

An `async` function returns a `Promise<T>` — a value that will be ready later. `await` unwraps it. The Python analog is a coroutine you `await`; the shapes line up.

:::compare run
```python
import asyncio

async def get_total() -> float:
    await asyncio.sleep(0)   # yield to the loop
    return 1272.5

async def main():
    total = await get_total()
    print(total)

asyncio.run(main())          # explicitly start the loop
```
```typescript
function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function getTotal(): Promise<number> {
  await sleep(0);
  return 1272.5;
}

async function main(): Promise<void> {
  const total = await getTotal();
  console.log(total);
}

main();                      // just call it — the runtime owns the loop
```
:::

Three differences worth internalizing:

- **`async def` → `async function`**, and the return type is `Promise<T>`, never bare `T`. `await` works only inside an `async` function (and at the top level of a module).
- **No `asyncio.run`.** The JavaScript runtime *is* the event loop — it's always running. You start async work by calling the function; you don't create or run a loop.
- **No `asyncio.sleep`.** The primitive is `setTimeout`, which is callback-based, so the idiom is to wrap it in a `Promise` once — that `sleep` helper above is boilerplate every project writes (or imports).

## The event loop, and the one big difference

JavaScript is **single-threaded**. There is exactly one [[event loop|event-loop]], and `async` is the *only* built-in concurrency — there's no threading escape hatch the way Python has `threading` alongside `asyncio`. While one `async` function `await`s, others run; but synchronous CPU-bound work blocks everything, because there's no other thread to run on. (For real parallelism you reach for Web Workers / worker threads, which pass messages — closer to `multiprocessing` than `threading`.)

The practical upshot is the same discipline as `asyncio`: don't do long synchronous loops on the main thread, and `await` your I/O.

## Running things concurrently

`asyncio.gather` is `Promise.all` — fire several at once, wait for all:

:::compare run
```python
import asyncio
async def fetch(n): 
    await asyncio.sleep(0); return n * 10

async def main():
    results = await asyncio.gather(fetch(1), fetch(2), fetch(3))
    print(results)
asyncio.run(main())
```
```typescript
async function fetchN(n: number): Promise<number> {
  return n * 10;
}
async function main(): Promise<void> {
  const results = await Promise.all([fetchN(1), fetchN(2), fetchN(3)]);
  console.log(results); // [10, 20, 30]
}
main();
```
:::

The family: `Promise.all` (all succeed or it rejects), `Promise.allSettled` (wait for all, successes and failures), `Promise.race` (first to settle), `Promise.any` (first to succeed). The common bug coming from Python: writing `await` in a loop when you meant to run concurrently — `for (const x of xs) await f(x)` runs them one at a time; `await Promise.all(xs.map(f))` runs them together.

## Error handling: try / catch / finally

`try/except/finally` becomes `try/catch/finally`, and `raise` becomes `throw`. The one real difference: a caught error is typed `unknown`, not a specific exception class, because *anything* can be thrown in JavaScript (not just `Error` objects).

:::compare run
```python
def parse(raw: str) -> float:
    try:
        return float(raw)
    except ValueError as e:
        raise ValueError(f"bad: {raw}") from e
    finally:
        pass  # cleanup

try:
    parse("nope")
except ValueError as e:
    print("caught:", e)
```
```typescript
function parse(raw: string): number {
  const n = Number(raw);
  if (Number.isNaN(n)) {
    throw new Error(`bad: ${raw}`);
  }
  return n;
}

try {
  parse("nope");
} catch (e) {            // e is `unknown`
  if (e instanceof Error) {
    console.log("caught:", e.message);  // narrow before using
  }
}
```
:::

Key points:

- **`raise X` → `throw new Error(...)`.** You throw a *value*, conventionally an `Error` (or a subclass). There's no separate exception hierarchy you `except` by type — you catch everything, then narrow with `instanceof`.
- **`except ValueError as e:` has no by-type form.** `catch (e)` catches all; you check `e instanceof RangeError` inside (the [[narrowing]] from lesson 09). Custom errors are just `class NotFound extends Error {}`.
- `finally` is identical. There's no `else` clause on `try`.

## Finishing the spine

Now `loadSeed` and `main`, with `parseAmount`'s throw handled:

:::compare run
```python
SEED = [("coffee", "3.50"), ("rent", 1200), ("oops", "nope")]

async def load_seed(items):
    out = []
    for description, raw in items:
        await asyncio.sleep(0)
        try:
            out.append((description, parse_amount(raw)))
        except ValueError as e:
            print(f"skipped {description}: {e}")
    return out

asyncio.run(load_seed(SEED))
```
```typescript
const SEED: [string, string | number][] = [["coffee", "3.50"], ["rent", 1200], ["oops", "nope"]];

async function loadSeed(items: typeof SEED): Promise<[string, number][]> {
  const out: [string, number][] = [];
  for (const [description, raw] of items) {
    await sleep(0);
    try {
      out.push([description, parseAmount(raw)]);
    } catch (e) {
      console.log(`skipped ${description}: ${e instanceof Error ? e.message : e}`);
    }
  }
  return out;
}
loadSeed(SEED);
```
:::

`for ... in SEED` with tuple unpacking becomes `for (const [a, b] of SEED)`; `await asyncio.sleep` becomes `await sleep`; `except ... as e` becomes `catch (e)` with an `instanceof Error` narrow. (In the real spine, `loadSeed` calls `ledger.add`, and bad rows simply throw — we keep the strict version that lets `parseAmount` reject negatives and non-numbers.)

**File status:** ✅ async runtime translated — `sleep`, `loadSeed`, `main`, `try/catch`. The entire program is now TypeScript. ⏳ nothing of the spine remains in Python. Next: a detour Python can't make — JSX and a first React component.
