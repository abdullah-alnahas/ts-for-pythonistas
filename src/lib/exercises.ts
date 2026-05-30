// Checked coding exercises, keyed by lesson slug. Each exercise gives starter
// code the learner edits; `tests` run against their top-level declarations using
// assert / assertEqual / assertThrows (injected by the test runner).
export interface ExerciseTest {
	name: string;
	code: string;
}

// Bloom-aligned difficulty band. Optional so existing consumers keep compiling;
// when absent, treat an exercise as 'apply' (the baseline). No-Python-analog
// topics (utility-types, narrowing) carry the heavier 'analyze'/'create' sets.
export type ExerciseDifficulty = 'apply' | 'analyze' | 'create';

export interface Exercise {
	id: string;
	prompt: string;
	starter: string;
	tests: ExerciseTest[];
	// Optional metadata (added for the assessment revamp; safe to ignore).
	difficulty?: ExerciseDifficulty;
	// True for cumulative/interleaved review items that mix multiple lessons.
	review?: boolean;
}

export const exercises: Record<string, Exercise[]> = {
	'setup-story': [
		{
			id: 'runtime-describe',
			difficulty: 'apply',
			prompt:
				'Because TS types are *erased*, you can only inspect values at runtime with real JS operators. Implement `describe(x: unknown)` that returns `"number"`, `"string"`, or `"other"` using `typeof` — NOT a type annotation. Open in the Playground to see there is no type info left at runtime to lean on.',
			starter: `function describe(x: unknown): "number" | "string" | "other" {
  // TODO: use typeof — types are gone at runtime
  return "other";
}`,
			tests: [
				{ name: '42 -> "number"', code: 'assertEqual(describe(42), "number");' },
				{ name: '"hi" -> "string"', code: 'assertEqual(describe("hi"), "string");' },
				{ name: 'true -> "other"', code: 'assertEqual(describe(true), "other");' },
				{ name: 'null -> "other"', code: 'assertEqual(describe(null), "other");' }
			]
		}
	],
	'primitives-variables': [
		{
			id: 'fizzbuzz',
			difficulty: 'apply',
			prompt: 'Implement `fizzbuzz(n)`: return `"Fizz"` if divisible by 3, `"Buzz"` if by 5, `"FizzBuzz"` if both, otherwise the number as a string. Use a template literal for the number case.',
			starter: `function fizzbuzz(n: number): string {
  // TODO
  return "";
}`,
			tests: [
				{ name: '3 -> "Fizz"', code: 'assertEqual(fizzbuzz(3), "Fizz");' },
				{ name: '5 -> "Buzz"', code: 'assertEqual(fizzbuzz(5), "Buzz");' },
				{ name: '15 -> "FizzBuzz"', code: 'assertEqual(fizzbuzz(15), "FizzBuzz");' },
				{ name: '7 -> "7"', code: 'assertEqual(fizzbuzz(7), "7");' }
			]
		}
	],
	'structural-typing': [
		{
			id: 'greet-structural',
			difficulty: 'apply',
			prompt: 'Write `greet(n)` accepting anything with a `name: string` and returning `"Hi, <name>"`. The tests pass an object with *extra* properties — structural typing should accept it.',
			starter: `interface Named { name: string }

function greet(n: Named): string {
  // TODO
  return "";
}`,
			tests: [
				{ name: 'greets a plain Named', code: 'assertEqual(greet({ name: "Ada" }), "Hi, Ada");' },
				{
					name: 'accepts an object with extra props',
					code: 'assertEqual(greet({ name: "Bo", age: 9, admin: true } as any), "Hi, Bo");'
				}
			]
		}
	],
	'interface-vs-type': [
		{
			id: 'stringify-id',
			difficulty: 'apply',
			prompt: 'Define a `type ID = string | number` and a function `stringifyId(id)` that returns the id as a string. (Only `type` can express that union — `interface` cannot.)',
			starter: `type ID = string | number;

function stringifyId(id: ID): string {
  // TODO
  return "";
}`,
			tests: [
				{ name: 'number id', code: 'assertEqual(stringifyId(42), "42");' },
				{ name: 'string id', code: 'assertEqual(stringifyId("abc"), "abc");' }
			]
		}
	],
	'unions-intersections': [
		{
			id: 'area-union',
			difficulty: 'analyze',
			prompt: 'Implement `area(s)` for the discriminated union `Shape`. Switch on `s.kind`; TS narrows each branch for you.',
			starter: `type Shape =
  | { kind: "circle"; radius: number }
  | { kind: "rect"; width: number; height: number };

function area(s: Shape): number {
  // TODO: switch on s.kind
  return 0;
}`,
			tests: [
				{
					name: 'circle area',
					code: 'assertEqual(Math.round(area({ kind: "circle", radius: 2 })), 13);'
				},
				{
					name: 'rect area',
					code: 'assertEqual(area({ kind: "rect", width: 3, height: 4 }), 12);'
				}
			]
		},
		{
			id: 'exhaustive-area',
			difficulty: 'create',
			prompt:
				'Now make it future-proof. Implement `area(s)` over the THREE-variant `Shape` with an exhaustive `switch` plus a `default` that assigns `s` to a `const _exhaustive: never`. Verify it compiles; then mentally add a fourth variant and confirm you understand why the `never` line would error. The runtime tests check your three cases.',
			starter: `type Shape =
  | { kind: "circle"; radius: number }
  | { kind: "rect"; width: number; height: number }
  | { kind: "triangle"; base: number; height: number };

function area(s: Shape): number {
  switch (s.kind) {
    // TODO: handle every variant, then add:
    //   default: { const _exhaustive: never = s; return _exhaustive; }
    default:
      return 0;
  }
}`,
			tests: [
				{
					name: 'circle',
					code: 'assertEqual(Math.round(area({ kind: "circle", radius: 2 })), 13);'
				},
				{
					name: 'rect',
					code: 'assertEqual(area({ kind: "rect", width: 3, height: 4 }), 12);'
				},
				{
					name: 'triangle',
					code: 'assertEqual(area({ kind: "triangle", base: 6, height: 4 }), 12);'
				}
			]
		}
	],
	'null-undefined': [
		{
			id: 'display-name',
			difficulty: 'apply',
			prompt: 'Implement `displayName(user)` returning the name, or `"anonymous"` when it is absent. Use `??` so an empty string stays empty (only null/undefined falls back).',
			starter: `function displayName(user: { name?: string }): string {
  // TODO: use ??
  return "";
}`,
			tests: [
				{ name: 'has name', code: 'assertEqual(displayName({ name: "Ada" }), "Ada");' },
				{ name: 'missing -> anonymous', code: 'assertEqual(displayName({}), "anonymous");' },
				{
					name: 'empty string is preserved (not anonymous)',
					code: 'assertEqual(displayName({ name: "" }), "");'
				}
			]
		}
	],
	generics: [
		{
			id: 'last',
			difficulty: 'apply',
			prompt: 'Implement a generic `last<T>(xs)` that returns the final element, or `undefined` for an empty array.',
			starter: `function last<T>(xs: T[]): T | undefined {
  // TODO
  return undefined;
}`,
			tests: [
				{ name: 'numbers', code: 'assertEqual(last([1, 2, 3]), 3);' },
				{ name: 'strings', code: 'assertEqual(last(["a", "b"]), "b");' },
				{ name: 'empty -> undefined', code: 'assertEqual(last([]), undefined);' }
			]
		},
		{
			id: 'get-prop',
			difficulty: 'create',
			prompt:
				'Implement the ubiquitous type-safe getter: `getProp<T, K extends keyof T>(obj, key): T[K]`. The signature is the whole exercise — `K extends keyof T` constrains the key to a real key of `T`, and the return type `T[K]` (indexed access) must track which key was passed. Fill in both the signature and the one-line body.',
			starter: `function getProp(obj: unknown, key: unknown): unknown {
  // TODO: retype as <T, K extends keyof T>(obj: T, key: K): T[K]
  return undefined;
}`,
			tests: [
				{
					name: 'reads name (string)',
					code: 'assertEqual(getProp({ name: "Ada", age: 36 } as any, "name" as any), "Ada");'
				},
				{
					name: 'reads age (number)',
					code: 'assertEqual(getProp({ name: "Ada", age: 36 } as any, "age" as any), 36);'
				}
			]
		}
	],
	'narrowing-guards': [
		{
			id: 'format-value',
			difficulty: 'apply',
			prompt: 'Implement `formatValue(x: string | number)`: uppercase a string, or format a number to 2 decimals (`toFixed(2)`). Narrow with `typeof`.',
			starter: `function formatValue(x: string | number): string {
  // TODO: narrow with typeof
  return "";
}`,
			tests: [
				{ name: 'string -> upper', code: 'assertEqual(formatValue("hi"), "HI");' },
				{ name: 'number -> fixed(2)', code: 'assertEqual(formatValue(3.1), "3.10");' }
			]
		},
		{
			id: 'is-user-guard',
			difficulty: 'create',
			prompt:
				'Write a CORRECT user-defined type guard `isUser(x: unknown): x is User` for `interface User { name: string }`. It must actually check the shape — `typeof x === "object" && x !== null && "name" in x && typeof x.name === "string"` — not just `typeof x === "object"` (which would wrongly accept `null`, arrays, dates). The tests feed it junk and a real user.',
			starter: `interface User { name: string }

function isUser(x: unknown): x is User {
  // TODO: verify the shape fully — guards are trusted, so be honest
  return false;
}`,
			tests: [
				{ name: 'accepts a real user', code: 'assert(isUser({ name: "Ada" }), "should accept { name }");' },
				{ name: 'rejects null', code: 'assert(!isUser(null), "null is not a User");' },
				{ name: 'rejects an array', code: 'assert(!isUser([1, 2]), "array is not a User");' },
				{
					name: 'rejects wrong-typed name',
					code: 'assert(!isUser({ name: 42 }), "name must be a string");'
				}
			]
		}
	],
	functions: [
		{
			id: 'sum-rest',
			difficulty: 'apply',
			prompt: 'Implement `sum(...ns)` using a rest parameter; return the total (0 for no args).',
			starter: `function sum(...ns: number[]): number {
  // TODO
  return 0;
}`,
			tests: [
				{ name: 'sum(1,2,3) === 6', code: 'assertEqual(sum(1, 2, 3), 6);' },
				{ name: 'sum() === 0', code: 'assertEqual(sum(), 0);' }
			]
		}
	],
	classes: [
		{
			id: 'counter',
			difficulty: 'apply',
			prompt: 'Implement a `Counter` class with a private count starting at 0, an `inc()` method, and a `value` getter.',
			starter: `class Counter {
  // TODO: private field, inc(), get value()
}`,
			tests: [
				{
					name: 'starts at 0',
					code: 'const c = new Counter(); assertEqual(c.value, 0);'
				},
				{
					name: 'inc twice -> 2',
					code: 'const c = new Counter(); c.inc(); c.inc(); assertEqual(c.value, 2);'
				}
			]
		}
	],
	'utility-types': [
		{
			id: 'to-public',
			difficulty: 'analyze',
			prompt: 'Implement `toPublic(u)` returning the user without the `password` field. The return type should be `Omit<User, "password">`.',
			starter: `interface User { id: number; name: string; password: string }

function toPublic(u: User): Omit<User, "password"> {
  // TODO: return id and name only
  return { id: u.id, name: u.name };
}`,
			tests: [
				{
					name: 'keeps id and name',
					code: 'const p = toPublic({ id: 1, name: "Ada", password: "x" }); assertEqual(p.name, "Ada"); assertEqual(p.id, 1);'
				},
				{
					name: 'drops password',
					code: 'const p = toPublic({ id: 1, name: "Ada", password: "x" }); assert(!("password" in p), "password should be removed");'
				}
			]
		},
		{
			id: 'roles-as-const',
			difficulty: 'create',
			prompt:
				'Single-source-of-truth pattern (no Python equivalent). Declare `const ROLES = ["admin", "editor", "viewer"] as const` and derive `type Role = typeof ROLES[number]`. Then implement `isRole(x: string): x is Role` that checks membership against `ROLES`. Adding a role to the array alone must extend both the type and the runtime check.',
			starter: `const ROLES = ["admin", "editor", "viewer"] as const;
type Role = typeof ROLES[number];

function isRole(x: string): x is Role {
  // TODO: check x against ROLES (which is readonly at the type level)
  return false;
}`,
			tests: [
				{ name: 'admin is a role', code: 'assert(isRole("admin"), "admin should be a role");' },
				{ name: 'viewer is a role', code: 'assert(isRole("viewer"), "viewer should be a role");' },
				{ name: 'guest is not', code: 'assert(!isRole("guest"), "guest is not a role");' }
			]
		}
	],
	'js-reality-gotchas': [
		{
			id: 'safe-parse-int',
			difficulty: 'apply',
			prompt: 'Implement `safeParseInt(s)` returning the parsed integer, or `null` when the result is `NaN`. Use `Number(s)` + `Number.isNaN`.',
			starter: `function safeParseInt(s: string): number | null {
  // TODO
  return null;
}`,
			tests: [
				{ name: '"42" -> 42', code: 'assertEqual(safeParseInt("42"), 42);' },
				{ name: '"abc" -> null', code: 'assertEqual(safeParseInt("abc"), null);' },
				{ name: '"0" -> 0 (not null!)', code: 'assertEqual(safeParseInt("0"), 0);' }
			]
		}
	],

	// Cumulative / interleaved review set (not tied to a single lesson). Mixes
	// topics on purpose and resurfaces the highest-decay primitives — `unknown`
	// vs `any`, the excess-property corner, and the two empties / truthiness.
	// Consumed by Stream A's review surface (or a later pass); B only supplies
	// the data. All items carry `review: true`.
	review: [
		{
			id: 'r-empty-checks',
			review: true,
			difficulty: 'analyze',
			prompt:
				'Interleaved (L06 + L12). Implement `isEmpty(c: unknown[] | string | Record<string, unknown>)` returning true for an empty array, empty string, or empty object. Remember `[]`/`{}` are TRUTHY in JS — you cannot use bare truthiness; check `.length` / `Object.keys`.',
			starter: `function isEmpty(c: unknown[] | string | Record<string, unknown>): boolean {
  // TODO: arrays & strings via .length; objects via Object.keys
  return false;
}`,
			tests: [
				{ name: '[] is empty', code: 'assert(isEmpty([]), "[] should be empty");' },
				{ name: '"" is empty', code: 'assert(isEmpty(""), "empty string");' },
				{ name: '{} is empty', code: 'assert(isEmpty({}), "{} should be empty");' },
				{ name: '[1] is not empty', code: 'assert(!isEmpty([1]), "[1] is not empty");' },
				{ name: '{a:1} is not empty', code: 'assert(!isEmpty({ a: 1 }), "{a:1} is not empty");' }
			]
		},
		{
			id: 'r-coalesce',
			review: true,
			difficulty: 'analyze',
			prompt:
				'Interleaved (L06 + L12). Implement `orDefault<T>(value: T | null | undefined, fallback: T): T` that returns `fallback` ONLY when value is null/undefined — so `0`, `""`, and `false` pass through unchanged. (This is the `??`-vs-`||` trap as a generic.)',
			starter: `function orDefault<T>(value: T | null | undefined, fallback: T): T {
  // TODO: use ?? semantics, not ||
  return fallback;
}`,
			tests: [
				{ name: 'null -> fallback', code: 'assertEqual(orDefault(null, 5), 5);' },
				{ name: 'undefined -> fallback', code: 'assertEqual(orDefault(undefined, 5), 5);' },
				{ name: '0 passes through', code: 'assertEqual(orDefault(0, 5), 0);' },
				{ name: '"" passes through', code: 'assertEqual(orDefault("", "x"), "");' }
			]
		},
		{
			id: 'r-safe-len',
			review: true,
			difficulty: 'create',
			prompt:
				'Interleaved (L08 + L12). Implement `safeLen(x: unknown): number` returning the length if `x` is a string or array, else `0`. Start from `unknown` (NOT `any`) and narrow with `typeof` / `Array.isArray` before touching `.length` — the compiler must force the guards.',
			starter: `function safeLen(x: unknown): number {
  // TODO: narrow unknown before reading .length
  return 0;
}`,
			tests: [
				{ name: 'string length', code: 'assertEqual(safeLen("hello"), 5);' },
				{ name: 'array length', code: 'assertEqual(safeLen([1, 2, 3]), 3);' },
				{ name: 'number -> 0', code: 'assertEqual(safeLen(42), 0);' },
				{ name: 'null -> 0', code: 'assertEqual(safeLen(null), 0);' }
			]
		}
	]
};

export function exercisesFor(slug: string): Exercise[] {
	return exercises[slug] ?? [];
}
