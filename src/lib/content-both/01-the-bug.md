---
title: The bug types would have caught
subtitle: Ship a todo app in plain JS, watch it break at runtime, and ask what could have stopped it
---

## Where we start

This course has a single running program, and we are going to build it twice. The first time, in plain JavaScript, it will have a bug — a real one, the kind that ships, sits quiet, and surfaces three days later in a place far from where it was caused. We will then spend two episodes building, by hand, the thing that would have caught it: a function that takes a value and answers one question, *is this the shape I expected?* And then, having built that by hand and felt exactly what it costs, we will meet the tool that does the same job for free, at compile time, and delete our hand-written version on camera.

So the arc is: feel the pain, build the cure by hand, then discover the cure already exists and is better than ours. That is the whole shape of the course. This episode is the pain. No types yet — not one annotation. We are writing JavaScript a Python developer could read on sight, and we are going to break it.

## The app

A todo list. The smallest interesting program that still has *data with a shape*, which is the thing types are about. Each task is an object:

```javascript
// app.js — plain JavaScript, no types anywhere
const tasks = [];

function addTask(title) {
  tasks.push({
    id: tasks.length + 1,
    title: title,
    status: "todo",
  });
}

function listTasks() {
  for (const task of tasks) {
    console.log(`[${task.status}] #${task.id} ${task.title}`);
  }
}

addTask("write the intro");
addTask("record the screencast");
listTasks();
```

If you read Python, this reads. `const tasks = []` is `tasks = []`. `function addTask(title)` is `def add_task(title)`. `tasks.push(...)` is `tasks.append(...)`. `for (const task of tasks)` is `for task in tasks`. The template literal `` `[${task.status}] ...` `` is an f-string, `f"[{task['status']}] ..."`. The one genuinely new idea is that the curly-brace object literal `{ id: ..., title: ..., status: ... }` is doing the work of a Python `dict` *and* the work of a lightweight class instance at once — in JavaScript there is no separate `dict` type, the object literal is the data structure. Run it and it prints three lines, each task tagged `[todo]`. Nothing surprising.

:::play
```typescript
const tasks: any[] = [];

function addTask(title: string) {
  tasks.push({
    id: tasks.length + 1,
    title: title,
    status: "todo",
  });
}

function listTasks() {
  for (const task of tasks) {
    console.log(`[${task.status}] #${task.id} ${task.title}`);
  }
}

addTask("write the intro");
addTask("record the screencast");
listTasks();
```
:::

That ran in the playground, which uses the TypeScript compiler — but we fed it untyped JavaScript and it complied, because TypeScript is a superset of JavaScript: valid JS is valid TS, just with every type left for the compiler to guess. We are deliberately not using that guessing yet. Pretend it's a plain Node script.

## Now grow it, the way real code grows

A program is never finished in one sitting. A week later you add a feature: mark a task done. You write it quickly, against the shape you remember the tasks having.

```javascript
function completeTask(id) {
  for (const task of tasks) {
    if (task.id === id) {
      task.state = "done"; // <- the bug
    }
  }
}
```

Read that line again. It says `task.state = "done"`. But every task created by `addTask` has a field named `status`, not `state`. You misremembered the name — an entirely ordinary mistake, the kind your fingers make when the field was named a week ago in a different file. And here is the thing that should bother you: **nothing complains.** Not the editor, not the runtime, not the assignment itself.

In Python the closest analogue would be `task["state"] = "done"` on a dict — also silent, also legal, because a dict accepts any key. If `task` were a class instance with `__slots__`, Python would at least raise `AttributeError` on `task.state = ...`. JavaScript objects have no slots and no schema: assigning to a property that doesn't exist *creates* it. So after `completeTask` runs, the task doesn't have its `status` changed. It grows a brand-new, second field called `state`, and keeps its original `status: "todo"` untouched, sitting right next to it.

:::predict
We add a task, complete it, then list. Given the typo above, what does `listTasks` print for that task — and why?

```javascript
addTask("ship the bug");
completeTask(1);
listTasks(); // prints what for task #1?
```

- ( ) `[done] #1 ship the bug` — the assignment found the field and updated it.
- ( ) It throws — assigning `task.state` on an object with no `state` field is an error.
- (x) `[todo] #1 ship the bug` — `completeTask` set a new `state` field; `status` never changed.
- ( ) `[undefined] #1 ship the bug` — writing `state` overwrote `status` with `undefined`.
:::answer
`[todo] #1 ship the bug`. The assignment `task.state = "done"` succeeded — it just succeeded at the wrong thing. JavaScript created a new property called `state` on the object and set it to `"done"`. The original `status` field, which `listTasks` actually reads, was never touched, so it still holds `"todo"`. The task object now carries *both* `status: "todo"` and `state: "done"`. No error fired anywhere: not at the assignment (writing an unknown property is legal), not at the read (reading the known `status` works fine). The program is wrong and silent — the worst combination.
:::

## Watch it run

This is the episode's centrepiece, so run it yourself and read the output before reading on.

:::play
```typescript
const tasks: any[] = [];

function addTask(title: string) {
  tasks.push({ id: tasks.length + 1, title: title, status: "todo" });
}

function completeTask(id: number) {
  for (const task of tasks) {
    if (task.id === id) {
      task.state = "done"; // typo: should be task.status
    }
  }
}

function listTasks() {
  for (const task of tasks) {
    console.log(`[${task.status}] #${task.id} ${task.title}`);
  }
}

addTask("ship the bug");
completeTask(1);
listTasks();                       // [todo] #1 ship the bug   — still todo!
console.log(JSON.stringify(tasks)); // the object grew a stray "state" field
```
:::

The `JSON.stringify` line is the tell. The task object serializes as `{"id":1,"title":"ship the bug","status":"todo","state":"done"}` — two fields where you intended one. In a real app this is the data that gets written to a database, sent over the wire, rendered in a UI. The `complete` button "works" in the sense that it runs without error, and "fails" in the sense that the task stays `todo` forever. The bug report you'll get three days later is *"the done button doesn't do anything,"* and you will look at `completeTask`, see an assignment that plainly says `"done"`, and not understand why.

## Why this whole class of bug exists

Step back from the typo. The deeper fact is that **JavaScript objects have no enforced shape.** A function that receives an object cannot, on its own, know what fields that object is supposed to have. `completeTask` receives an `id`, finds an object, and writes to it — and the only "schema" for what that object should look like lives in your head and in the *other* function, `addTask`, that happened to create it. There is no point in the program where the intended shape is written down in a way the machine checks.

Python developers feel a softer version of this. Duck typing means a Python function also doesn't demand a specific class; it just calls the methods it needs and trusts they're there. But Python has guardrails JavaScript lacks. Reading a missing dict key with `task["status"]` raises `KeyError` loudly. Reading a missing attribute raises `AttributeError`. Dataclasses and `__slots__` can lock a shape down. JavaScript's reflex in every one of these cases is to *not* complain: missing property reads return `undefined`, missing property writes create the property. The language was designed to keep running in a browser no matter what, and "keep running" beats "be correct."

That design choice is the entire reason this course exists. The bug above is not a story about carelessness — careful people ship it weekly. It is a story about a language that will happily let an object's shape drift away from what every function reading it expects, and never say a word.

## What would have caught it?

Here is the question that drives the next two episodes. Suppose, before `completeTask` trusted the object, we ran it past a *checker* — a plain function we write ourselves, that takes a value and returns yes or no to one question: *does this object have exactly the shape a task is supposed to have — an `id` that's a number, a `title` that's a string, a `status` that's one of the allowed words?* If the typo'd object had an extra `state` field and we checked for it, the checker could have flagged it. More importantly: if we ran that checker over every task and asked "is the `status` here valid," the task stuck at `"todo"` would have looked fine — but a checker that knew the *complete set* of fields could notice the stray `state` that shouldn't be there.

That function — value in, ok/not-ok out — is the seed of everything. It is, when you strip away the machinery, exactly what a type check *is*. Not a class, not a framework: a function from a value to a verdict. We are going to write it by hand, in plain JavaScript, in the next episode. We'll call the main one `isTask`, and a smaller helper `validateStatus`. We will feel how tedious it is to check every field of every object by hand, everywhere data enters the program.

And then, in the episode after that, we'll hit the wall that hand-written checkers run into — they cost runtime, they're verbose, and they only fire *after* the wrong code has already run — and we'll meet the tool that does this checking at compile time, before the program runs at all, derived from a shape you write down once. We'll delete our hand-built checker and replace it with that. But we have to build it first, because you only trust a tool once you've done its job by hand and felt why you wouldn't want to.

## Recap

- The running app is a plain-JS todo list: tasks are object literals with `id`, `title`, and `status`. No types yet.
- We introduced a realistic bug: `task.state = "done"` instead of `task.status`. JavaScript silently *creates* the misspelled property instead of erroring, so the task keeps its old `status` and the "complete" feature quietly does nothing.
- The root cause isn't carelessness; it's that JavaScript objects have no enforced shape. Missing-property reads return `undefined`, missing-property writes create the property. Python at least raises `KeyError` / `AttributeError`; JS keeps running.
- The fix we're heading toward: a checker — a function from a value to a yes/no verdict about its shape. That function is the seed of what a "type" is, and we build it by hand next.

:::quiz
Why does `task.state = "done"` fail silently in JavaScript, and what single Python construct would have turned the equivalent mistake into a loud error at the moment it happened?
:::answer
It fails silently because JavaScript objects are open: assigning to a property name that doesn't exist *adds* that property rather than rejecting the write. So `state` gets created, `status` is left alone, and no error fires at the write or at the later read of `status`. In Python, the equivalent mistake is loud only if the object's shape is locked down. A plain dict (`task["state"] = "done"`) is just as silent. But a class instance with `__slots__ = ("id", "title", "status")` — or a frozen dataclass — raises `AttributeError: 'Task' object has no attribute 'state'` the instant you assign the unknown field, because slots reserve a fixed set of attribute names and forbid the rest. That "fixed, enforced set of fields" is exactly the idea we're about to build by hand, and then exactly what TypeScript's `interface` will give us at compile time.
:::

Next episode: we stop describing the cure and build it. From an empty function, by hand, we write `isTask(value)` — checking each field with `typeof` — and `validateStatus(s)`. Pure JavaScript, no type system. By the end you'll have a working runtime checker, and a precise feel for what it costs to run one everywhere.
