import { Marked, type Tokens, type TokenizerAndRendererExtension } from 'marked';
import {
	createHighlighter,
	type Highlighter,
	type BundledLanguage,
	type BundledTheme
} from 'shiki';
import { base } from '$app/paths';
import { resolveTerm } from './glossary';

const LANGS: BundledLanguage[] = ['python', 'typescript', 'javascript', 'json', 'bash', 'diff'];
const THEMES: BundledTheme[] = ['github-light-high-contrast', 'github-dark-high-contrast'];

let hlPromise: Promise<Highlighter> | null = null;

function highlighter(): Promise<Highlighter> {
	if (!hlPromise) {
		hlPromise = createHighlighter({ langs: LANGS, themes: THEMES });
	}
	return hlPromise;
}

function normalizeLang(lang: string | undefined): BundledLanguage {
	const l = (lang ?? '').toLowerCase().trim();
	if (l === 'py') return 'python';
	if (l === 'ts') return 'typescript';
	if (l === 'js') return 'javascript';
	if (l === 'sh' || l === 'shell') return 'bash';
	if ((LANGS as string[]).includes(l)) return l as BundledLanguage;
	return 'typescript';
}

async function codeToHtml(code: string, lang: string | undefined): Promise<string> {
	const h = await highlighter();
	return h.codeToHtml(code.replace(/\n$/, ''), {
		lang: normalizeLang(lang),
		themes: { light: 'github-light-high-contrast', dark: 'github-dark-high-contrast' },
		defaultColor: false
	});
}

// ---------- E5: compare diff line-highlighting ----------
// Compute the set of right-column line indices (0-based) that differ from the
// left column, via a simple LCS over trimmed lines. Used only when a
// `:::compare diff` flag is set — otherwise compare rendering is untouched.
function changedRightLines(left: string, right: string): Set<number> {
	const a = left.replace(/\n$/, '').split('\n').map((s) => s.trim());
	const b = right.replace(/\n$/, '').split('\n').map((s) => s.trim());
	const n = a.length;
	const m = b.length;
	// LCS length table.
	const lcs: number[][] = Array.from({ length: n + 1 }, () => new Array<number>(m + 1).fill(0));
	for (let i = n - 1; i >= 0; i--) {
		for (let j = m - 1; j >= 0; j--) {
			lcs[i][j] = a[i] === b[j] ? lcs[i + 1][j + 1] + 1 : Math.max(lcs[i + 1][j], lcs[i][j + 1]);
		}
	}
	// Walk the table; any right line not part of the common subsequence is "changed".
	const changed = new Set<number>();
	let i = 0;
	let j = 0;
	while (i < n && j < m) {
		if (a[i] === b[j]) {
			i++;
			j++;
		} else if (lcs[i + 1][j] >= lcs[i][j + 1]) {
			i++;
		} else {
			changed.add(j);
			j++;
		}
	}
	while (j < m) changed.add(j++);
	return changed;
}

// Add a CSS class to the Nth (0-based) `<span class="line">` spans listed in
// `lines`, leaving everything else byte-identical. Operates on shiki output.
function markChangedLines(html: string, lines: Set<number>): string {
	if (lines.size === 0) return html;
	let idx = -1;
	return html.replace(/<span class="line">/g, (match) => {
		idx++;
		return lines.has(idx) ? '<span class="line compare-line-changed">' : match;
	});
}

// ---------- custom token types ----------

interface CompareToken extends Tokens.Generic {
	type: 'compare';
	leftLang: string;
	leftCode: string;
	leftTitle: string;
	rightLang: string;
	rightCode: string;
	rightTitle: string;
	diff: boolean; // E5: highlight changed lines between the two columns
	run: boolean; // E3: make the TS (right) column runnable
	leftHtml?: string;
	rightHtml?: string;
}

interface QuizToken extends Tokens.Generic {
	type: 'quiz';
	promptMd: string;
	answerMd: string;
	promptHtml?: string;
	answerHtml?: string;
}

interface PlayToken extends Tokens.Generic {
	type: 'play';
	code: string;
}

interface PredictOption {
	label: string; // raw markdown for the option text
	correct: boolean;
}

interface PredictToken extends Tokens.Generic {
	type: 'predict';
	promptMd: string;
	options: PredictOption[];
	answerMd: string;
	promptHtml?: string;
	answerHtml?: string;
	optionsHtml?: string[];
}

interface NarrowStep {
	guard: string; // the condition that narrows (e.g. `typeof x === "string"`)
	result: string; // the resulting type at this branch (e.g. `string`)
}

interface NarrowToken extends Tokens.Generic {
	type: 'narrow';
	start: string; // the starting (widest) type
	steps: NarrowStep[];
	caption: string;
}

interface GlossToken extends Tokens.Generic {
	type: 'gloss';
	label: string;
	slug?: string;
	short?: string;
}

function escapeHtml(s: string): string {
	return s.replace(
		/[&<>"]/g,
		(c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c] ?? c
	);
}

function encodeCode(code: string): string {
	// Build-time (Node) base64 of percent-encoded UTF-8; decoded client-side
	// with decodeURIComponent(atob(...)).
	return Buffer.from(encodeURIComponent(code), 'utf8').toString('base64');
}

const FENCE = /```([^\n`]*)\n([\s\S]*?)```/g;

function parseFence(block: string): { lang: string; title: string; code: string }[] {
	const out: { lang: string; title: string; code: string }[] = [];
	let m: RegExpExecArray | null;
	FENCE.lastIndex = 0;
	while ((m = FENCE.exec(block))) {
		const info = m[1].trim();
		const sp = info.indexOf(' ');
		const lang = sp === -1 ? info : info.slice(0, sp);
		const title = sp === -1 ? '' : info.slice(sp + 1).trim();
		out.push({ lang, title, code: m[2] });
	}
	return out;
}

const compareExtension: TokenizerAndRendererExtension = {
	name: 'compare',
	level: 'block',
	start(src: string) {
		return src.indexOf(':::compare');
	},
	tokenizer(src: string) {
		// Optional space-separated flags on the opening line: `:::compare diff run`.
		// Unknown flags are ignored so the directive degrades gracefully.
		const m = /^:::compare[ \t]*([^\n]*)\n([\s\S]*?)\n:::[ \t]*(?:\n|$)/.exec(src);
		if (!m) return undefined;
		const flags = new Set(
			m[1]
				.trim()
				.toLowerCase()
				.split(/\s+/)
				.filter(Boolean)
		);
		const fences = parseFence(m[2]);
		if (fences.length < 2) return undefined;
		const [left, right] = fences;
		const token: CompareToken = {
			type: 'compare',
			raw: m[0],
			leftLang: left.lang || 'python',
			leftCode: left.code,
			leftTitle: left.title || 'Python',
			rightLang: right.lang || 'typescript',
			rightCode: right.code,
			rightTitle: right.title || 'TypeScript',
			diff: flags.has('diff'),
			run: flags.has('run')
		};
		return token;
	},
	renderer(token) {
		const t = token as CompareToken;
		const cls = t.diff ? 'compare compare-diff' : 'compare';
		// E3: when `run` is set, the TS column hosts a `.play-mount` that the
		// client hydrates into a Playground (same path as `:::play`). The Python
		// column stays static/illustrative. Without `run`, output is unchanged.
		const rightInner = t.run
			? `${t.rightHtml ?? ''}<div class="play-mount compare-run" data-code="${encodeCode(
					t.rightCode.replace(/\n$/, '')
				)}"></div>`
			: (t.rightHtml ?? '');
		return `<div class="${cls}">
  <div class="compare-col"><div class="compare-label">${t.leftTitle}</div>${t.leftHtml ?? ''}</div>
  <div class="compare-col"><div class="compare-label">${t.rightTitle}</div>${rightInner}</div>
</div>`;
	}
};

const quizExtension: TokenizerAndRendererExtension = {
	name: 'quiz',
	level: 'block',
	start(src: string) {
		return src.indexOf(':::quiz');
	},
	tokenizer(src: string) {
		const m = /^:::quiz[ \t]*\n([\s\S]*?)\n:::[ \t]*(?:\n|$)/.exec(src);
		if (!m) return undefined;
		const parts = m[1].split(/^:::answer[ \t]*$/m);
		const token: QuizToken = {
			type: 'quiz',
			raw: m[0],
			promptMd: (parts[0] ?? '').trim(),
			answerMd: (parts[1] ?? '').trim()
		};
		return token;
	},
	renderer(token) {
		const t = token as QuizToken;
		return `<div class="quiz">
  <div class="quiz-q">${t.promptHtml ?? ''}</div>
  <details class="quiz-a"><summary>Show answer</summary>${t.answerHtml ?? ''}</details>
</div>`;
	}
};

const playExtension: TokenizerAndRendererExtension = {
	name: 'play',
	level: 'block',
	start(src: string) {
		return src.indexOf(':::play');
	},
	tokenizer(src: string) {
		const m = /^:::play[ \t]*\n([\s\S]*?)\n:::[ \t]*(?:\n|$)/.exec(src);
		if (!m) return undefined;
		const fences = parseFence(m[1]);
		if (fences.length < 1) return undefined;
		const token: PlayToken = { type: 'play', raw: m[0], code: fences[0].code.replace(/\n$/, '') };
		return token;
	},
	renderer(token) {
		const t = token as PlayToken;
		// Placeholder; hydrated into an interactive <Playground> on the client.
		// A1.4: render a height-reserving skeleton so there's no blank flash / CLS
		// before the client `$effect` mounts the real <Playground>.
		return `<div class="play-mount" data-code="${encodeCode(t.code)}">
  <div class="play-skeleton" aria-hidden="true">
    <div class="play-skeleton-bar"></div>
    <div class="play-skeleton-lines"><span></span><span></span><span></span></div>
    <div class="play-skeleton-foot">Loading interactive playground…</div>
  </div>
</div>`;
	}
};

// ---------- E2: :::predict — a commit-gated predict-then-reveal ----------
// Body shape:  prompt markdown (may include a ```fence```) → an options list of
// `- ( ) wrong` / `- (x) correct` lines → `:::answer` → explanation markdown.
// The answer is gated behind selecting an option (a recorded commit) on the
// client. It is a stronger `:::quiz` and coexists with it; a `:::predict` with
// no parsable options degrades gracefully to a quiz-style reveal.
const OPTION_RE = /^[ \t]*-[ \t]*\(([ xX])\)[ \t]*(.*)$/;

function parsePredictBody(body: string): {
	promptMd: string;
	options: PredictOption[];
	answerMd: string;
} {
	const [pre, post = ''] = body.split(/^:::answer[ \t]*$/m);
	const answerMd = post.trim();
	// Split the pre-answer part into prompt lines and option lines. Options are
	// the trailing run of `- ( )` / `- (x)` lines; anything above them is prompt.
	const lines = pre.replace(/\n$/, '').split('\n');
	const options: PredictOption[] = [];
	let lastNonOption = lines.length;
	for (let i = lines.length - 1; i >= 0; i--) {
		if (OPTION_RE.test(lines[i])) lastNonOption = i;
		else if (lines[i].trim() === '') continue;
		else break;
	}
	const promptLines = lines.slice(0, lastNonOption);
	for (const line of lines.slice(lastNonOption)) {
		const m = OPTION_RE.exec(line);
		if (!m) continue;
		options.push({ correct: m[1].toLowerCase() === 'x', label: m[2].trim() });
	}
	return { promptMd: promptLines.join('\n').trim(), options, answerMd };
}

const predictExtension: TokenizerAndRendererExtension = {
	name: 'predict',
	level: 'block',
	start(src: string) {
		return src.indexOf(':::predict');
	},
	tokenizer(src: string) {
		const m = /^:::predict[ \t]*\n([\s\S]*?)\n:::[ \t]*(?:\n|$)/.exec(src);
		if (!m) return undefined;
		const { promptMd, options, answerMd } = parsePredictBody(m[1]);
		const token: PredictToken = {
			type: 'predict',
			raw: m[0],
			promptMd,
			options,
			answerMd
		};
		return token;
	},
	renderer(token) {
		const t = token as PredictToken;
		// Hydrated into an interactive <Predict> on the client (commit gate +
		// per-option correctness). The payload is base64 JSON so option labels
		// keep their rendered HTML and the answer stays hidden until commit.
		const payload = {
			prompt: t.promptHtml ?? '',
			options: (t.optionsHtml ?? []).map((html, i) => ({
				html,
				correct: t.options[i]?.correct ?? false
			})),
			answer: t.answerHtml ?? ''
		};
		const data = encodeCode(JSON.stringify(payload));
		// Progressive-enhancement fallback: a plain quiz-style reveal that works
		// with zero JS (and if hydration fails), so the answer is never lost.
		return `<div class="predict-mount" data-predict="${data}">
  <div class="quiz predict-fallback">
    <div class="quiz-q">${t.promptHtml ?? ''}</div>
    <details class="quiz-a"><summary>Show answer</summary>${t.answerHtml ?? ''}</details>
  </div>
</div>`;
	}
};

// ---------- E4: :::narrow — control-flow narrowing visualizer (set-piece #1) ----------
// One clean exemplar visualizer the content can opt into. Renders a starting
// union type and a sequence of guard → result steps as a vertical flow, so the
// reader sees a union collapse branch by branch. Pure server-side render (no
// client mount), fully additive: lessons that don't use `:::narrow` are untouched.
// Body shape:
//   start: string | number | null
//   - typeof x === "string" -> string
//   - x === null -> never
//   - else -> number
//   caption: TS tracks the type down each branch.   (optional)
const NARROW_STEP_RE = /^[ \t]*-[ \t]*(.+?)[ \t]*(?:->|→)[ \t]*(.+?)[ \t]*$/;

const narrowExtension: TokenizerAndRendererExtension = {
	name: 'narrow',
	level: 'block',
	start(src: string) {
		return src.indexOf(':::narrow');
	},
	tokenizer(src: string) {
		const m = /^:::narrow[ \t]*\n([\s\S]*?)\n:::[ \t]*(?:\n|$)/.exec(src);
		if (!m) return undefined;
		let start = '';
		let caption = '';
		const steps: NarrowStep[] = [];
		for (const line of m[1].split('\n')) {
			const startM = /^[ \t]*start:[ \t]*(.+?)[ \t]*$/.exec(line);
			if (startM) {
				start = startM[1];
				continue;
			}
			const capM = /^[ \t]*caption:[ \t]*(.+?)[ \t]*$/.exec(line);
			if (capM) {
				caption = capM[1];
				continue;
			}
			const stepM = NARROW_STEP_RE.exec(line);
			if (stepM) steps.push({ guard: stepM[1], result: stepM[2] });
		}
		// Degrade gracefully: a malformed block with no usable content is skipped
		// (returns undefined → marked treats it as plain text, nothing breaks).
		if (!start || steps.length === 0) return undefined;
		const token: NarrowToken = { type: 'narrow', raw: m[0], start, steps, caption };
		return token;
	},
	renderer(token) {
		const t = token as NarrowToken;
		const rows = t.steps
			.map(
				(s) => `    <li class="narrow-step">
      <code class="narrow-guard">${escapeHtml(s.guard)}</code>
      <span class="narrow-arrow" aria-hidden="true">→</span>
      <code class="narrow-type">${escapeHtml(s.result)}</code>
    </li>`
			)
			.join('\n');
		const cap = t.caption
			? `\n  <p class="narrow-caption">${escapeHtml(t.caption)}</p>`
			: '';
		return `<figure class="narrow">
  <div class="narrow-start"><span class="narrow-start-label">starts as</span> <code>${escapeHtml(
		t.start
	)}</code></div>
  <ul class="narrow-steps">
${rows}
  </ul>${cap}
</figure>`;
	}
};

// ---------- inline glossary directive: [[term]] or [[Display|slug]] ----------
// Purely additive. Resolves to a styled, accessible trigger linking to
// /glossary/[slug] and carrying the entry's `short` text for the popover.
// If the term doesn't resolve to a known entry, it renders as plain text so
// nothing breaks and legacy/unknown markdown is untouched.
const glossExtension: TokenizerAndRendererExtension = {
	name: 'gloss',
	level: 'inline',
	start(src: string) {
		return src.indexOf('[[');
	},
	tokenizer(src: string) {
		// Match [[...]] but never image/footnote/wikilink-with-newline noise.
		const m = /^\[\[([^\][\n|]+)(?:\|([^\][\n]+))?\]\]/.exec(src);
		if (!m) return undefined;
		const raw = m[1].trim();
		const explicitSlug = m[2]?.trim();
		// Form A: [[display|slug]]  Form B: [[term]] (term doubles as lookup key)
		const ref = explicitSlug || raw;
		const entry = resolveTerm(ref);
		const token: GlossToken = {
			type: 'gloss',
			raw: m[0],
			label: raw,
			slug: entry?.slug,
			short: entry?.short
		};
		return token;
	},
	renderer(token) {
		const t = token as GlossToken;
		const label = escapeHtml(t.label);
		// Unknown term → plain text, never a broken link.
		if (!t.slug) return label;
		const short = escapeHtml(t.short ?? '');
		// A real <a> in tab order; the popover hydrates progressive enhancement
		// over this. data-* read by GlossaryPopover. aria-describedby wired client-side.
		return `<a class="gloss-term" href="${base}/glossary/${escapeHtml(t.slug)}" data-gloss="${escapeHtml(t.slug)}" data-gloss-short="${short}">${label}</a>`;
	}
};

export interface TocItem {
	id: string;
	text: string;
	level: number; // 2 for ##, 3 for ###
}

function slugifyHeading(text: string, used: Set<string>): string {
	const base =
		text
			.toLowerCase()
			.replace(/[^\w\s-]/g, '')
			.trim()
			.replace(/\s+/g, '-')
			.replace(/-+/g, '-') || 'section';
	let id = base;
	let n = 2;
	while (used.has(id)) id = `${base}-${n++}`;
	used.add(id);
	return id;
}

export interface RenderedLesson {
	html: string;
	toc: TocItem[];
}

export async function renderMarkdown(md: string): Promise<RenderedLesson> {
	const marked = new Marked({ gfm: true, breaks: false });
	marked.use({
		extensions: [
			compareExtension,
			quizExtension,
			playExtension,
			predictExtension,
			narrowExtension,
			glossExtension
		]
	});
	// A2.1: collect a TOC from ## / ### headings and emit stable ids for anchors.
	const toc: TocItem[] = [];
	const usedIds = new Set<string>();
	marked.use({
		async: true,
		async walkTokens(token) {
			if (token.type === 'code') {
				const t = token as Tokens.Code;
				const html = await codeToHtml(t.text, t.lang);
				t.escaped = true;
				t.text = html;
			} else if (token.type === 'compare') {
				const t = token as CompareToken;
				t.leftHtml = await codeToHtml(t.leftCode, t.leftLang);
				t.rightHtml = await codeToHtml(t.rightCode, t.rightLang);
				// E5: highlight only the changed TS lines when `diff` is requested.
				if (t.diff) {
					const changed = changedRightLines(t.leftCode, t.rightCode);
					t.rightHtml = markChangedLines(t.rightHtml, changed);
				}
			} else if (token.type === 'quiz') {
				const t = token as QuizToken;
				t.promptHtml = await renderInner(t.promptMd);
				t.answerHtml = await renderInner(t.answerMd);
			} else if (token.type === 'predict') {
				const t = token as PredictToken;
				t.promptHtml = await renderInner(t.promptMd);
				t.answerHtml = await renderInner(t.answerMd);
				t.optionsHtml = await Promise.all(t.options.map((o) => renderInner(o.label)));
			}
		},
		renderer: {
			code(token) {
				// token.text already holds shiki HTML (escaped=true set above)
				return (token as Tokens.Code).text;
			},
			heading(token) {
				const t = token as Tokens.Heading;
				const inner = this.parser.parseInline(t.tokens);
				if (t.depth === 2 || t.depth === 3) {
					const plain = t.text.replace(/\[\[([^\]|]+)(?:\|[^\]]+)?\]\]/g, '$1').trim();
					const id = slugifyHeading(plain, usedIds);
					if (t.depth === 2) toc.push({ id, text: plain, level: t.depth });
					return `<h${t.depth} id="${id}">${inner}</h${t.depth}>\n`;
				}
				return `<h${t.depth}>${inner}</h${t.depth}>\n`;
			}
		}
	});
	const html = (await marked.parse(md)) as string;
	return { html, toc };
}

// Inner markdown (quiz prompt/answer) — reuse code highlighting + gloss links,
// no nested compare/quiz/play.
async function renderInner(md: string): Promise<string> {
	const marked = new Marked({ gfm: true });
	marked.use({ extensions: [glossExtension] });
	marked.use({
		async: true,
		async walkTokens(token) {
			if (token.type === 'code') {
				const t = token as Tokens.Code;
				t.text = await codeToHtml(t.text, t.lang);
				t.escaped = true;
			}
		},
		renderer: {
			code(token) {
				return (token as Tokens.Code).text;
			}
		}
	});
	return marked.parse(md) as Promise<string>;
}

// Glossary entry body — full markdown + code highlighting + inline [[term]]
// cross-links, but no lesson-only directives (compare/quiz/play).
export async function renderGlossary(md: string): Promise<string> {
	const marked = new Marked({ gfm: true, breaks: false });
	marked.use({ extensions: [glossExtension] });
	marked.use({
		async: true,
		async walkTokens(token) {
			if (token.type === 'code') {
				const t = token as Tokens.Code;
				t.text = await codeToHtml(t.text, t.lang);
				t.escaped = true;
			}
		},
		renderer: {
			code(token) {
				return (token as Tokens.Code).text;
			}
		}
	});
	return marked.parse(md) as Promise<string>;
}
