---
title: What even is a type check?
subtitle: Before tsc, we build the idea by hand
---

## Where we start

Here is a value. Someone sent it to your program — over the wire, from a form, out of a config file. You want to treat it as a `Task`.

```typescript
const incoming = JSON.parse('{"title": "buy milk", "done": false}');
```

Is it a valid `Task`? You can't *see* a type. The value is just bytes that parsed into an object. The question "is this a Task?" is not answered by looking — it's answered by *checking*. Something has to take the value, ask a series of questions about it, and return a verdict. That something is a type check, and across this course you are going to build it. By hand, from an empty file, one kind of type per episode, until you have a small checker that verifies arbitrary values against arbitrary shapes. At the very end — once the machine is built and you understand every part of it — we'll reveal that you have been rebuilding the mental model of `tsc` the whole time.

So before any TypeScript syntax, the thing to internalize is this: **a type check is a function from a value to a verdict.** Input: some value you don't trust. Output: yes or no, this conforms or it doesn't. Everything else in this course is detail layered onto that one sentence.

You already own this idea from Python, you just haven't named it.

## The Python you already do

When a Python program meets an untrusted value, you check it at runtime. `isinstance` is the canonical move:

```python
def handle(value):
    if not isinstance(value, str):
        raise TypeError("expected a string")
    return value.upper()
```

`isinstance(value, str)` *is* a type check: it takes a value, asks one question — does this belong to the type `str`? — and returns a verdict, `True` or `False`. You then branch on the verdict. The annotation `value: str`, if you wrote one, does nothing here; [[mypy]] might read it, but the running program ignores it. The thing that actually protects the function at runtime is the `isinstance` call. That call is a function from a value to a boolean, and a boolean is the smallest possible verdict.

That is the whole concept. We are going to build our own `isinstance`, except instead of leaning on a built-in we'll write the questions out ourselves, so that nothing is hidden. Once you've written the check by hand, there's no magic left in it.

## Building the smallest checker by hand

Start with the simplest type there is: string. Forget objects, forget `Task`, forget anything compound. Just answer one question for one value: is this a string?

In JavaScript — which is what TypeScript compiles to, and the language whose values we're actually inspecting — the runtime way to ask "what kind of value is this?" is the `typeof` operator. It returns a string naming the value's runtime kind:

```typescript
typeof "hello"   // "string"
typeof 42        // "number"
typeof true      // "boolean"
typeof undefined // "undefined"
typeof {}        // "object"
```

This is the runtime tag every JavaScript value carries, the direct analogue of Python's `type(value)`. So our first checker is one line of logic: take a value, ask whether its `typeof` is `"string"`, return the verdict.

```typescript
function checkString(value: unknown): boolean {
  return typeof value === "string";
}
```

Look at the parameter type: `unknown`. This is deliberate and it is the most important annotation in the whole course. The input to a checker is, by definition, a value we do *not* trust — that's why we're checking it. `unknown` is TypeScript's honest name for "a value of some type I refuse to assume anything about." It is the top type: everything is assignable *to* it, but it lets you do *nothing* with it until you've checked. It is the opposite of `any`, which is the lie that says "trust me, treat this as whatever you like." We will never write `any` in this course. The checker's job is precisely to convert an `unknown` into something you've earned the right to use.

Run it:

:::play
```typescript
function checkString(value: unknown): boolean {
  return typeof value === "string";
}

console.log(checkString("hello")); // true
console.log(checkString(42));      // false
console.log(checkString(null));    // false
console.log(checkString(["a"]));   // false
```
:::

That's a type checker. Forty characters of logic. It takes any value, asks one question, and returns a verdict — exactly the shape of the sentence we started with. Everything we add for the rest of the course is more questions and better verdicts, but never a different shape.

## The same check, side by side

Here is `checkString` next to the Python it mirrors, so the mapping is explicit:

:::compare
```python
def check_string(value) -> bool:
    return isinstance(value, str)

check_string("hello")  # True
check_string(42)       # False
```
```typescript
function checkString(value: unknown): boolean {
  return typeof value === "string";
}

checkString("hello"); // true
checkString(42);       // false
```
:::

The structure is identical. Python reaches for `isinstance` and a class object; JavaScript reaches for `typeof` and a tag string. Both are runtime operations on a runtime value, and both hand back a boolean. If you're coming from C++ or Java, notice what's *missing*: there's no `instanceof` against a class here, no `dynamic_cast`, no RTTI. For the primitive kinds, JavaScript's `typeof` is a flat string tag, not a walk up a class hierarchy — which will matter a great deal in Episode 3, when "what type is this?" stops being a single tag and becomes a question about *shape*.

:::predict
JavaScript's `typeof` has one infamous wart. What does `typeof null` return?

- ( ) `"null"` — the obvious answer.
- (x) `"object"` — a bug from 1995 that can never be fixed.
- ( ) `"undefined"` — `null` and `undefined` are the same.
- ( ) It throws a `TypeError`.
:::answer
`typeof null` is `"object"`. This is a genuine bug in the original JavaScript implementation, preserved forever because too much code now depends on it. It's why `checkString(null)` correctly returns `false` (the tag is `"object"`, not `"string"`, so the check fails as we want) — but it's also a landmine waiting in Episode 3, where we check for objects and have to remember that `null`'s tag lies. Note it now; we'll handle it deliberately when it bites.
:::

## A verdict, not just a boolean

`checkString` returns a bare `boolean`. That's enough to branch on, but it's a thin verdict. When a check *fails*, a boolean tells you *that* it failed and nothing about *why*. Compare the two failures a real validator has to distinguish:

- The value isn't a string at all.
- The value is a string, but it's empty, or too long, or not an email.

A boolean flattens both into `false`. Python's `isinstance` has the same limitation, which is why real validation code raises an exception with a *message* instead of returning a bare `False` — the message is the part a human can act on. Hold that thought. In the next episode, the very first thing we do is upgrade the verdict from a `boolean` to a small `Result` — a value that's either "ok" or "an error with a message" — because once we have more than one kind of check, "why did it fail" becomes the question worth answering. The boolean is the seed; the `Result` is the efficient version of it, and we'll feel exactly why before we build it.

## Recap

- A type check is a function from a value to a verdict. Input: a value you don't trust. Output: does it conform? That sentence is the spine of the entire course.
- Python already does this at runtime with `isinstance`. We rebuild it with JavaScript's `typeof`, writing the questions by hand so nothing is hidden.
- The input to a checker is typed `unknown` — TypeScript's honest "I assume nothing about this value." Never `any`. The checker's job is to earn the right to use the value.
- `checkString(value: unknown): boolean` is the whole idea in one function. Everything later is more questions and richer verdicts, never a different shape.
- `typeof null` is `"object"` — a permanent wart we'll have to step around in Episode 3.

The verdict is a `boolean` and the checker handles exactly one type. The next episode fixes both at once: more primitive checks — `checkNumber`, `checkBoolean` — and a real vocabulary to write them in, a `Checker` type and a `Result` that carries a reason when it says no. We're about to stop writing checks one at a time and start describing what a check *is*.
