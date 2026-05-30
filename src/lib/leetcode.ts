// Curated LeetCode problems per lesson. LeetCode supports TypeScript as a
// submission language, so each is solvable in TS while exercising that lesson's
// feature. `why` frames the connection honestly — some are classic algorithm
// problems, others are from LeetCode's JavaScript/TypeScript track.
export interface LeetProblem {
	num: number;
	title: string;
	slug: string;
	difficulty: 'Easy' | 'Medium' | 'Hard';
	why: string;
}

const url = (slug: string) => `https://leetcode.com/problems/${slug}/`;
export const leetUrl = url;

export const leetcode: Record<string, LeetProblem[]> = {
	'setup-story': [
		{
			num: 1,
			title: 'Two Sum',
			slug: 'two-sum',
			difficulty: 'Easy',
			why: 'Submit your first TypeScript solution — LeetCode compiles it with tsc, exactly the erase-then-run pipeline from this lesson. (A classic algorithm problem; here it just gets you through the TS submission loop.)'
		}
	],
	'primitives-variables': [
		{
			num: 412,
			title: 'Fizz Buzz',
			slug: 'fizz-buzz',
			difficulty: 'Easy',
			why: 'Number arithmetic and template-literal string building — the primitives you just met.'
		},
		{
			num: 7,
			title: 'Reverse Integer',
			slug: 'reverse-integer',
			difficulty: 'Medium',
			why: "Forces you to reckon with TS's single IEEE-754 `number` type and 32-bit overflow."
		}
	],
	'structural-typing': [
		{
			num: 2695,
			title: 'Array Wrapper',
			slug: 'array-wrapper',
			difficulty: 'Easy',
			why: "From LeetCode's TS track: you implement a class whose instances behave structurally under `+` and `String()`. A direct feel for shape-based behavior over class identity."
		}
	],
	'interface-vs-type': [
		{
			num: 1603,
			title: 'Design Parking System',
			slug: 'design-parking-system',
			difficulty: 'Easy',
			why: 'Model car sizes as a literal union (`type`) and the lot state as an object (`interface`) — the exact decision from this lesson.'
		}
	],
	'unions-intersections': [
		{
			num: 1472,
			title: 'Design Browser History',
			slug: 'design-browser-history',
			difficulty: 'Medium',
			why: 'Model navigation state; try expressing operations as a discriminated union and watch narrowing kick in.'
		}
	],
	'null-undefined': [
		{
			num: 206,
			title: 'Reverse Linked List',
			slug: 'reverse-linked-list',
			difficulty: 'Easy',
			why: 'The node type is `ListNode | null` — a pure workout in strict null handling and `?.`/guards.'
		},
		{
			num: 21,
			title: 'Merge Two Sorted Lists',
			slug: 'merge-two-sorted-lists',
			difficulty: 'Easy',
			why: 'Two nullable list heads to merge — careful null narrowing or the compiler stops you.'
		}
	],
	generics: [
		{
			num: 2724,
			title: 'Sort By',
			slug: 'sort-by',
			difficulty: 'Easy',
			why: 'Write a generic `<T>` signature for an array + key function — inference in action.'
		},
		{
			num: 2627,
			title: 'Debounce',
			slug: 'debounce',
			difficulty: 'Medium',
			why: 'Typing a higher-order function generically (preserving the wrapped function’s params) stretches generics.'
		},
		{
			num: 2629,
			title: 'Function Composition',
			slug: 'function-composition',
			difficulty: 'Easy',
			why: "TS track: type an array of `(x: number) => number` and the composed result. Pure signature work — the algorithm is trivial, the typing is the point."
		}
	],
	'narrowing-guards': [
		{
			num: 341,
			title: 'Flatten Nested List Iterator',
			slug: 'flatten-nested-list-iterator',
			difficulty: 'Medium',
			why: 'Each element is `number | NestedInteger` — you must narrow with a guard before using it.'
		},
		{
			num: 2705,
			title: 'Compact Object',
			slug: 'compact-object',
			difficulty: 'Medium',
			why: 'Drop falsy values — a direct lesson in JS truthiness and narrowing.'
		}
	],
	functions: [
		{
			num: 2667,
			title: 'Create Hello World Function',
			slug: 'create-hello-world-function',
			difficulty: 'Easy',
			why: 'Closures, rest params, and typing a returned function — function fundamentals.'
		},
		{
			num: 2665,
			title: 'Counter II',
			slug: 'counter',
			difficulty: 'Easy',
			why: 'Return an object of functions; practice function types and the options-object idiom.'
		}
	],
	classes: [
		{
			num: 155,
			title: 'Min Stack',
			slug: 'min-stack',
			difficulty: 'Easy',
			why: 'A small class with private state and methods — TS class basics with real invariants.'
		},
		{
			num: 146,
			title: 'LRU Cache',
			slug: 'lru-cache',
			difficulty: 'Medium',
			why: 'Class design with a generic-ish `Map`, private fields, and access modifiers.'
		}
	],
	'utility-types': [
		{
			num: 2619,
			title: 'Array Prototype Last',
			slug: 'array-prototype-last',
			difficulty: 'Easy',
			why: 'You augment the global `Array<T>` interface — real declaration merging plus `keyof`/indexed thinking.'
		},
		{
			num: 2822,
			title: 'Inversion of Object',
			slug: 'inversion-of-object',
			difficulty: 'Easy',
			why: "TS track: invert a record's keys and values. The runtime is one loop — but typing the inverted `Record` precisely is the utility-types muscle from this lesson."
		}
	],
	'js-reality-gotchas': [
		{
			num: 2727,
			title: 'Is Object Empty',
			slug: 'is-object-empty',
			difficulty: 'Easy',
			why: 'Truthiness, `{}`-is-truthy, and object checks — the exact JS traps from this lesson.'
		},
		{
			num: 2705,
			title: 'Compact Object',
			slug: 'compact-object',
			difficulty: 'Medium',
			why: 'Falsy filtering forces you to confront `0`/`""`/`null` coercion head-on.'
		}
	]
};

export function leetcodeFor(slug: string): LeetProblem[] {
	return leetcode[slug] ?? [];
}
