---
title: The wall, and meeting tsc
subtitle: Hit the limits of the hand-built checker, meet the compiler that does it for free — and be honest about what is and isn't the same
---

## Where we pick up

We have a working runtime checker: `isTask(value)` and `validateStatus(s)`, both written by hand in plain JavaScript, both running at the program's boundary in `loadTasks`. They take a value and return a verdict. They work. This episode we run them into a wall, meet the tool that gets past it, and — the part that matters most — we are honest about exactly how that tool relates to what we built. Then we delete the hand guards. By the end the app has its first real type: `interface Task`.

## The wall

The hand-built checker has three problems, and they compound.

**It's verbose, and it grows.** `isTask` is fifteen lines for three fields. Our running spec for the app already wants more: an optional `createdAt`, optional `tags`. Each new field is another `typeof` guard, another `null` consideration. And the moment the app has a second kind of object — a `User`, a `Project`, a `Settings` blob — you write a whole second function with the same defensive boilerplate. The checking logic scales with the product of (number of types) × (fields per type), and every line is hand-maintained. Rename a field and you must remember to update the checker too, or it silently checks the old shape.

**It runs, so it costs.** Every call to `isTask` executes real comparisons at runtime. In a loop over ten thousand loaded tasks, that's ten thousand object-type checks, three `typeof` reads each, plus the `validateStatus` comparisons. Usually negligible — but it is never free, and you are paying it on every value, forever, in production.

**And the sharp one: it fires too late.** This is the limitation that no amount of cleverness fixes. `isTask` can only tell you an object is malformed *after* that object exists and reaches the checker. Go back to episode 1's bug: `task.state = "done"` instead of `task.status`. That typo is in *code*, not in data. It creates a malformed task internally — it never passes through `loadTasks`, never hits `isTask`. Our runtime checker is blind to it. The program has to actually run, actually execute the buggy line, actually produce the wrong object, before any check could even theoretically see it. By then the damage — the wrong data written to disk, sent over the wire — may already be done.

:::predict
We add the boundary checker to the app, but the episode-1 bug is still in `completeTask` (`task.state = "done"`). Does running `isTask` anywhere save us from that bug?

- ( ) Yes — `isTask` checks for unexpected fields, so it catches the stray `state` the moment it's created.
- ( ) Yes — every property assignment is routed through `isTask` automatically.
- (x) No — the bug is a typo in code that mutates an already-loaded object; it never crosses the boundary where `isTask` runs.
- ( ) No — but only because `isTask` doesn't check the `state` field, which is an easy fix.
:::answer
No. `isTask` runs at the *data* boundary — when tasks are loaded from JSON in `loadTasks`. The episode-1 bug lives in `completeTask`, which mutates a task object that's already inside the program and already passed any boundary check. The typo creates a stray `state` field at runtime, in code, far from any `isTask` call. You could, in principle, re-run `isTask` after every mutation and reject objects with extra fields — but that means calling it constantly, it's still after the fact, and our `isTask` doesn't even reject extra fields (it only checks the ones it knows). The honest conclusion: a runtime checker guards the *edges* of the program against bad *data*; it does almost nothing about bad *code* inside. To catch a typo in an assignment, you'd need something that inspects the code *before it runs*.
:::

That last sentence is the whole turn. "Something that inspects the code before it runs" is not a runtime checker at all. It's a *compiler*.

## Meet `tsc`

TypeScript is JavaScript plus a layer that the TypeScript compiler, `tsc`, reads *before* your code runs. You write down the shape of your data once — as a declaration, not as executable code — and `tsc` checks every line of the program against that shape at compile time. If `completeTask` writes `task.state`, and `tsc` knows a task has no `state` field, it stops you. Not at runtime. Not after the bad object exists. At the moment you type the line, with a red underline in the editor and an error when you compile.

Here is the declaration. This is the shape of a task, written once:

```typescript
interface Task {
  id: number;
  title: string;
  status: "todo" | "doing" | "done";
}
```

Read it against `isTask` from last episode. `id: number` is the guard `typeof value.id === "number"`. `title: string` is `typeof value.title === "string"`. And `status: "todo" | "doing" | "done"` — a union of three string literal types — is exactly `validateStatus`: the field may be one of those three words and nothing else. The interface *is* the checker, transcribed into a form the compiler reads. Everything `isTask` said with running code, `interface Task` says with a declaration.

The difference is what happens with it. Watch the bug get caught at compile time:

:::play
```typescript
interface Task {
  id: number;
  title: string;
  status: "todo" | "doing" | "done";
}

const tasks: Task[] = [];

function addTask(title: string): void {
  tasks.push({ id: tasks.length + 1, title, status: "todo" });
}

function completeTask(id: number): void {
  for (const task of tasks) {
    if (task.id === id) {
      task.state = "done"; // error: Property 'state' does not exist on type 'Task'. Did you mean 'status'?
    }
  }
}

addTask("ship it");
completeTask(1);
```
:::

There it is — the episode-1 bug, caught. `tsc` reads `task.state =`, knows `task` is a `Task`, knows a `Task` has no `state`, and reports *Property 'state' does not exist on type 'Task'. Did you mean 'status'?* It even suggests the right field. This is the bug that ran silently for three days in episode 1, stopped before the program runs at all, with a message that points at the fix. We didn't call a checker. We annotated the data with its shape, and the compiler did the rest.

## Delete the guards

So we no longer need `isTask` and `validateStatus` to police our own code. Inside the program — wherever `tsc` can see both the data's declared shape and the code touching it — the compiler is the checker now, and it's a strictly better one: it sees more (typos in code, not just bad data), it costs nothing at runtime (the checks happen at compile time and then vanish), and it fires earlier (before the program runs). So we delete them.

This is the micrograd move: build the thing by hand, feel it, then reveal the tool is the efficient version and take the hand-built one out. Here is the diff — the hand-written guards gone, replaced by annotations:

:::compare diff
```python
# Before: hand-written runtime checker, called everywhere
def validate_status(s):
    return s in ("todo", "doing", "done")

def is_task(value):
    if not isinstance(value, dict): return False
    if not isinstance(value.get("id"), int): return False
    if not isinstance(value.get("title"), str): return False
    if not validate_status(value.get("status")): return False
    return True

def complete_task(tasks, id):
    for task in tasks:
        if is_task(task) and task["id"] == id:
            task["status"] = "done"
```
```typescript
// After: the shape is declared once; tsc checks every line against it
interface Task {
  id: number;
  title: string;
  status: "todo" | "doing" | "done";
}

function completeTask(tasks: Task[], id: number): void {
  for (const task of tasks) {
    if (task.id === id) {
      task.status = "done";
    }
  }
}
```
:::

The entire `validate_status` / `is_task` apparatus is gone. The shape lives in `interface Task`, written once. `completeTask` no longer calls a checker before trusting the object, because the parameter type `tasks: Task[]` already guarantees every element is a `Task` — the compiler verified that at every call site. And `task.status = "done"` is checked against the interface: misspell it `task.state` and you get the error we just saw. Less code, more safety, zero runtime cost.

## The honesty beat — read this slowly

Here is the part the rest of this course is built on, and the part most tutorials skip. **You did not rebuild `tsc`.** What you built by hand and what `tsc` does are not the same thing, and pretending otherwise would teach you a wrong model that breaks the first time you hit a real boundary.

Three differences, each load-bearing:

**Runtime vs. compile time.** `isTask` runs *while your program runs* — it inspects actual values that exist in memory at that moment. `tsc` runs *before your program runs* — it inspects your source code, reasons about what types values *will* have, and then exits. By the time your program executes, `tsc` is long gone. The check happened at a completely different time, on a completely different object: `isTask` checks a value; `tsc` checks a program.

**Values vs. types.** `isTask` answers "is *this specific object* in front of me a task?" `tsc` answers "could *any* value flowing into this position ever fail to be a task, across all paths through the code?" One is a question about a concrete value; the other is a question about every possible value, proved by analysis. That's why `tsc` catches the typo in `completeTask` and `isTask` can't: `tsc` reasons about the code, not about one run of it.

**And the consequence that will bite if you forget it:** TypeScript's types are [[erased|type-erasure]]. After `tsc` checks your code, it *deletes every type* and emits plain JavaScript. The `interface Task` does not exist at runtime — there is no `Task` object, no shape to check against, nothing. So when a value arrives from *outside* the program — `JSON.parse`, a `fetch` response, a form field, a file — `tsc` was never there to check it, because `tsc` only ever saw your source code, not the bytes that arrive at runtime. At that boundary, the compiler's guarantee is gone, and you are back to needing exactly the kind of runtime checker we just deleted.

So what did we actually rebuild? Not the compiler. We rebuilt the **mental model**: the idea that a type check is a function from a value to a verdict about its shape. `isTask` is that idea made of running code; `interface Task` + `tsc` is that idea made of a declaration plus static analysis. Same idea, two utterly different machines. TypeScript is the vastly more powerful machine for checking *your code* — but it runs at a different time, reasons about types rather than values, and vanishes before runtime. The hand-built checker still owns the one job the compiler structurally cannot do: checking values that arrive from the outside world. We will return to that boundary in the final episode, because it never goes away.

:::quiz
After `tsc` compiles our app, someone loads tasks from a file with `const tasks = JSON.parse(fileContents)`. The file has been corrupted and contains `[{"id":"oops","title":42}]`. Does TypeScript catch this? Why or why not — and what's the fix?
:::answer
No, TypeScript does not catch it, and this is the central honesty point. `JSON.parse` is typed to return `any` (we'll see why in the final episode), so `tsc` has no idea what shape comes back and won't complain when you treat it as `Task[]`. More fundamentally: the corruption is in *data that arrives at runtime*, and `tsc` finished its work at compile time, looking only at your source code — it was never present when the file was read. Types are erased, so there is no `Task` shape in the running program to check the parsed value against. The fix is precisely the runtime checker we just deleted: at the `JSON.parse` boundary you still run something like `isTask` over each parsed item before trusting it. Inside the program, `tsc` is the checker; at the I/O boundary, a runtime guard still has a real job. Static structural checking and runtime value checking are different tools for different moments, and a robust program uses both.
:::

## Recap

- The hand-built checker hits a wall: it's **verbose and grows per type**, it **costs at runtime**, and it fires **too late** — only after a bad value exists, and never for typos in code that never cross the boundary.
- `tsc` reads your code *before it runs*. You declare the shape once with `interface Task { id: number; title: string; status: "todo" | "doing" | "done" }`, and the compiler checks every line against it.
- The interface *is* the checker transcribed: `id: number` ↔ the `typeof` guard, the `status` union ↔ `validateStatus`. We deleted `isTask`/`validateStatus` for internal use — the compiler is a strictly better checker of our own code.
- **The honesty beat:** you did not rebuild `tsc`. Runtime ≠ compile time; checking a *value* ≠ checking a *program*; and types are [[erased|type-erasure]] before runtime. You rebuilt the *mental model* — type check = value-to-verdict function — not the compiler.
- The one job the compiler can't do — checking values from outside the program (`JSON.parse`, `fetch`, forms) — still belongs to a runtime checker. We come back to it in episode 12.

This is the hinge of the whole course. Act 1 is done: we felt the pain, built the cure by hand, met the better tool, and were honest about the difference. From here the same todo app grows in real TypeScript, and every new type feature we meet, we'll connect back to the checker we just deleted. Next episode answers the first question the interface raises: why did `tsc` accept that object literal as a `Task` at all, when we never wrote the word `Task` anywhere near it? That's structural typing.
