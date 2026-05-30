---
term: Event loop
short: The single-threaded scheduler that runs JS to completion, then drains microtasks (promises) before the next macrotask (timers, I/O).
domain: js
related: this-binding, gil, prototype-chain
---

JavaScript runs on one thread driven by the **event loop**. The model:

1. Run the current task (a script, a callback) **to completion** — JS never
   preempts mid-function.
2. Drain the **microtask queue** *entirely* — resolved Promise callbacks
   (`.then`, `await` continuations), `queueMicrotask`.
3. Render (in browsers), then pick **one macrotask** — `setTimeout`, I/O,
   message events — and go back to step 1.

```js
console.log('A');
setTimeout(() => console.log('D'), 0); // macrotask
Promise.resolve().then(() => console.log('C')); // microtask
console.log('B');
// A B C D — microtasks drain before the timer fires
```

The "run to completion" rule is why a long synchronous loop freezes the UI, and
why `await` yields control without true parallelism.

## Python anchor

`asyncio` is the direct analog: one event loop, coroutines that yield at
`await`. Python's loop is explicit (`asyncio.run`, `loop.run_until_complete`),
JS's is ambient. Both are *concurrency without parallelism* — and both have a
single-thread constraint (compare the [[GIL]]). Contrast with the [[this
binding]] surprises that come from callbacks running later, detached from their
original call site.
