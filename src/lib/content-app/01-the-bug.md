---
title: The bug types would have caught
subtitle: A fifteen-line todo app that ships a silent bug, and what a build step does about it
---

Here is the whole app. It is fifteen lines of plain JavaScript, and it works — you can add a task, list what you have, mark one done. This is the artifact we are going to grow across the next ten episodes until it has a generic store, typed command handlers, and a strict compiler config. But it starts here, deliberately small, deliberately untyped, so that the first thing you feel is the problem types exist to solve.

```javascript
// todo.js
let tasks = [];

function addTask(title) {
  tasks.push({ id: tasks.length + 1, title: title, done: false });
}

function completeTask(id) {
  const task = tasks.find((t) => t.id === id);
  task.done = true;
}

addTask("write the intro");
completeTask(1);
console.log(tasks);
// [ { id: 1, title: 'write the intro', done: true } ]
```

Run that with `node todo.js` and it prints exactly what you'd expect. Nothing is wrong yet. The trouble starts the moment a caller makes an ordinary mistake — the kind every codebase makes weekly — and the language does nothing to stop it.

## The mistake, and the silence

A second function shows up, written by someone who half-remembers the field names. They think the field is `text`, not `title`:

```javascript
function addTaskWrong(text) {
  tasks.push({ id: tasks.length + 1, text: text, done: false });
}

addTaskWrong("file the taxes");
console.log(tasks[1].title);   // undefined
```

There is no error. `addTaskWrong` pushes an object with a `text` field and no `title` field. Reading `tasks[1].title` gives back `undefined`, because in JavaScript reading a missing property is not a failure — it is a defined operation that returns `undefined`. The program keeps running. The bug is now sitting in your data, dormant.

It detonates later, somewhere far from where it was introduced:

```javascript
function render(task) {
  return task.title.toUpperCase();   // "WRITE THE INTRO" ... or a crash
}

tasks.forEach((t) => console.log(render(t)));
// WRITE THE INTRO
// TypeError: Cannot read properties of undefined (reading 'toUpperCase')
```

The crash points at `render`, which is correct code. The actual fault is in `addTaskWrong`, written earlier, by someone else, with a typo in a field name. The distance between the cause and the symptom is the whole problem. This is exactly the situation a Python developer already knows.

## This is the Python you already write

Translate it directly and the behavior is identical, because Python and JavaScript share the same posture toward missing data — they find out at runtime or not at all.

:::compare
```python
tasks = []

def add_task_wrong(text):
    tasks.append({"id": len(tasks) + 1, "text": text, "done": False})

add_task_wrong("file the taxes")
print(tasks[0]["title"])   # KeyError: 'title'
```
```typescript
let tasks = [];

function addTaskWrong(text) {
  tasks.push({ id: tasks.length + 1, text, done: false });
}

addTaskWrong("file the taxes");
console.log(tasks[0].title);   // undefined — no error at all
```
:::

The two languages even disagree on *how* loud they are. Python's dict raises `KeyError` the instant you read the missing key, which is the friendlier failure — it fails at the read, not three functions later. JavaScript is quieter still: the missing property reads as `undefined` and the program sails on, so the failure is deferred until something tries to *use* that `undefined`. But both share the defining trait: nothing checked the object's shape before the code ran. There is no point at which a tool looked at `add_task_wrong` and said *that object is the wrong shape for a task*. The shape lives only in your head and in the prose of a comment.

Now contrast the other side of the family. In Java or C++ a `Task` would be a declared type — a `class` or a `struct` with named fields — and `task.text = ...` where the field is `title` would not compile. The compiler reads the declaration, sees no `text` field, and refuses to produce a program. The error arrives before anything runs, with a file and a line number, pointing straight at the typo. That is the difference we are after. It is not about ceremony or verbosity; it is about *when* you find out.

:::predict
Three languages, the same `text`-instead-of-`title` typo. When does each one tell you something is wrong?

- ( ) All three at runtime — a typo in a field name is impossible to catch ahead of time.
- ( ) All three at compile time — every modern language checks field names.
- (x) Python raises at runtime (on the read), JavaScript fails silently at runtime (later, on use), and Java/C++ refuse to compile.
- ( ) Only Java catches it; C++ field access is unchecked like C.
:::answer
Python raises `KeyError` the moment you read the missing key — runtime, but at least at the point of access. JavaScript returns `undefined` and defers the failure until some later operation chokes on it — runtime, and displaced from the cause. Java and C++ both have the field set fixed by a declared type, so the typo is a compile error and the program never runs. The axis that separates them is *when the shape gets checked*, and the only language family that checks it before running is the one with a compile step and declared types. TypeScript is going to give JavaScript exactly that.
:::

## What "caught at build time" actually means

Here is the mental shift, and it is the largest one in this whole course. Python and JavaScript are *interpreted*: you hand the source to an interpreter (`python`, `node`) and it executes it line by line. There is no separate phase that inspects the whole program first. The first time anyone looks hard at line 40 is when execution reaches line 40 — and if a buggy branch never runs in your test, no one ever looks at it.

TypeScript inserts a phase before that. You do not run a `.ts` file directly; you run the **type checker** (`tsc`) over it first. `tsc` reads every line, builds a model of what type each value has, and verifies that every operation is legal for the types involved — `.toUpperCase()` only on strings, `.push` only on arrays, a field access only on a type that has that field. If anything fails, it reports an error and you fix it; nothing executes until it passes. *Then* `tsc` strips the types back out and emits plain JavaScript, which is what actually runs. The types are a checking artifact; they are [[erased|type-erasure]] before runtime and contribute nothing to the running program.

So "caught at build time" means caught in that checking phase, by reading the code rather than running it — which means caught on *every* line, including the branches your tests never reach, including code paths that fire once a year. That is the property Python's `mypy` chases too, and the comparison is worth making precisely: `mypy` is a static checker you run over Python, much like `tsc`. The difference is enforcement. `mypy` is advisory — Python runs whether `mypy` is happy or not, because the types were never part of the language the interpreter sees. With TypeScript the check is the gate: the toolchain's normal path is "check, then build," and a failing check stops the build. Same idea as `mypy`, wired into the front of the pipeline instead of off to the side.

## Renaming the file is the whole first step

We are not writing a single annotation yet. The first move is just to rename `todo.js` to `todo.ts` and run the checker. That alone — with no types added — already finds something, because `tsc` under `strict` flags one thing on sight.

```typescript
// todo.ts — renamed, not yet annotated
let tasks = [];

function addTask(title) {
  tasks.push({ id: tasks.length + 1, title, done: false });
}

function completeTask(id) {
  const task = tasks.find((t) => t.id === id);
  task.done = true;
}
```

Run `tsc --noEmit todo.ts` (the `--noEmit` flag means *check only, produce no output file*) and the first complaint is not about the typo we haven't reintroduced — it's about the parameters:

```
todo.ts:4:18 - error TS7006: Parameter 'title' implicitly has an 'any' type.
todo.ts:8:23 - error TS7006: Parameter 'id' implicitly has an 'any' type.
```

`tsc` is telling you it has no idea what `title` or `id` are. An unannotated parameter has no type the checker can infer — there's no assignment to learn from — so under `strict` it refuses to silently treat it as `any` (the escape-hatch "any type at all, check nothing" type) and asks you to say. This is the `--noEmit` workflow you'll lean on constantly: ask the checker what it thinks, before you run anything.

There is a second, quieter problem the checker will get to once the parameters are typed — `tasks.find(...)` can return `undefined` if no task matches that `id`, and then `task.done = true` is reading a property off a possibly-missing value. That is the same missing-data fault from the top of the episode, and it's the entire subject of episode 06. For now, notice only that the checker is already looking in the right places.

:::predict
Given the renamed `todo.ts` above under `strict`, which line does `tsc` report an error on *first*?

```typescript
let tasks = [];                                    // 2
function addTask(title) {                          // 4
  tasks.push({ id: tasks.length + 1, title, done: false });
}
function completeTask(id) {                         // 8
  const task = tasks.find((t) => t.id === id);
  task.done = true;
}
```

- ( ) Line 2 — `let tasks = []` is an error because the array's element type is unknown.
- (x) Line 4 — `Parameter 'title' implicitly has an 'any' type.`
- ( ) Line 7 — `task.done = true` fails because `find` might return `undefined`.
- ( ) No error — nothing is annotated, so there is nothing to check.
:::answer
Line 4 reports first: `error TS7006: Parameter 'title' implicitly has an 'any' type.` An unannotated parameter under `strict` is a hard error, because the checker has no value to infer the type from and `strict` forbids the implicit `any` fallback. Line 2 is *not* an error — `let tasks = []` infers the type `any[]`, which `strict` tolerates (the array literal gives it something to work with, even if that something is loose). And the `find`-might-be-`undefined` problem on line 7 is real, but the checker can't even get there while the parameter types are still broken; it surfaces only once `id` is typed. The order matters less than the lesson: with one rename and zero annotations, the build step is already pointing at the soft spots a runtime never would.
:::

## Try it

Here is the broken version, end to end, the way it actually fails. Run it and watch the crash land in the wrong place — on `render`, the one function that's correct.

:::play
```typescript
// The original app plus one ordinary typo. This RUNS (it is valid
// JavaScript); the bug is in the data, and it surfaces far from its cause.
let tasks: { id: number; title?: string; done: boolean }[] = [];

function addTask(title: string) {
  tasks.push({ id: tasks.length + 1, title, done: false });
}
function addTaskWrong(text: string) {
  // the typo: writes `text`, never sets `title`
  tasks.push({ id: tasks.length + 1, done: false } as never);
}

addTask("write the intro");
addTaskWrong("file the taxes");

function render(task: { title?: string }) {
  return task.title!.toUpperCase(); // crashes on the second task
}

console.log(render(tasks[0])); // WRITE THE INTRO
console.log(render(tasks[1])); // TypeError at runtime: title is undefined
```
:::

The crash is real and it lands on `render`. Hold onto the feeling: the correct function takes the blame because the broken object reached it intact, unchecked. Everything from here is about giving that object a shape the compiler knows, so the typo never makes it past the build.

## Recap and what's next

- Plain JS (and Python) check an object's shape at runtime or never; a wrong field name reads as `undefined` (JS) or raises late (Python), and the failure shows up far from its cause.
- Java/C++ reject the same typo at compile time, because the type is declared and read before the program runs. TypeScript brings that property to JavaScript.
- "Caught at build time" means caught by `tsc` reading every line, not by execution reaching one — so even unrun branches are checked. It's `mypy`'s idea, but wired in as a gate: check, then build, and types are [[erased|type-erasure]] before anything runs.
- Renaming `todo.js` to `todo.ts` and running `tsc --noEmit` already flags the untyped parameters under `strict`, with zero annotations written.

We have a `todo.ts` that the checker is unhappy with, and the unhappiness is pointing exactly where the bugs hide. Episode 02 answers the question the checker is really asking: what *is* a task? We give `Task` a shape — an `interface` — and watch the typo become a red squiggle instead of a 2 a.m. page.
