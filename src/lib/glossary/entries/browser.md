---
term: browser
short: The other place JavaScript runs — a JS engine (like V8) plus the DOM and web APIs. Same language as Node, different surrounding APIs. Python has no everyday equivalent, which trips up newcomers.
domain: js
related: v8, node, event-loop
---

The browser is a JavaScript **runtime environment**: a JS engine
(Chrome/Edge use [[v8|V8]]; Firefox uses SpiderMonkey; Safari uses
JavaScriptCore) plus the APIs that make a web page interactive — the DOM
(`document`, `window`), `fetch`, events, timers, storage.

The key idea for a Python developer: JavaScript runs in **two** very
different worlds, and the *language* is the same in both — only the
surrounding APIs differ.

| | Engine | Extra APIs available |
| --- | --- | --- |
| [[node|Node.js]] | V8 | filesystem, network sockets, processes |
| Browser | V8 (or SpiderMonkey/JSC) | DOM, `fetch`, `localStorage`, events |

Python has no mainstream browser runtime, so this split has no Python
analogue — which is exactly why it confuses people arriving from Python.
Code that calls `document.querySelector` works in the browser and crashes
in Node; code that calls `fs.readFile` is the reverse.

Both worlds share the single-threaded [[event-loop|event loop]] model, and
both run plain JavaScript — your TypeScript is [[type-erasure|erased]]
before either one sees it. When this site's Playground "runs TypeScript in
the browser," it compiles TS to JS in the page and the browser's V8
executes the result.
