// In-browser TypeScript engine: lazy-loads the real TS compiler + a virtual file
// system from esm.sh, so we get genuine type-checking diagnostics AND the ability
// to transpile + run snippets with captured console output. Nothing here is
// bundled — the heavy deps load on first use, client-side only.
import type * as TSNS from 'typescript';

type TS = typeof import('typescript');
const TS_VERSION = '5.9.3';

export interface Diag {
	line: number;
	col: number;
	message: string;
	category: 'error' | 'warning' | 'message';
	code: number;
}

export interface RunResult {
	logs: string[];
	runtimeError?: string;
	diagnostics: Diag[];
}

// ---- minimal structural types for the lazily-loaded modules ----
interface VfsEnv {
	languageService: {
		getSemanticDiagnostics(file: string): readonly TSNS.Diagnostic[];
		getSyntacticDiagnostics(file: string): readonly TSNS.DiagnosticWithLocation[];
		getProgram(): TSNS.Program | undefined;
		getQuickInfoAtPosition(file: string, position: number): TSNS.QuickInfo | undefined;
	};
	updateFile(file: string, content: string): void;
}
interface VfsModule {
	createDefaultMapFromCDN(
		opts: TSNS.CompilerOptions,
		version: string,
		cache: boolean,
		ts: TS,
		lz?: unknown
	): Promise<Map<string, string>>;
	createSystem(map: Map<string, string>): unknown;
	createVirtualTypeScriptEnvironment(
		sys: unknown,
		files: string[],
		ts: TS,
		opts: TSNS.CompilerOptions
	): VfsEnv;
}
interface LzModule {
	compressToEncodedURIComponent(input: string): string;
}

let tsMod: TS | null = null;
let lzMod: LzModule | null = null;
let libsPromise: Promise<{ ts: TS; vfs: VfsModule; libs: Map<string, string> }> | null = null;

const FILE = 'index.ts';

async function importExternal<T>(url: string): Promise<T> {
	const mod = (await import(/* @vite-ignore */ url)) as { default?: unknown } & Record<
		string,
		unknown
	>;
	// CommonJS-via-esm.sh often lands on `default`; fall back to namespace.
	return (mod.default ?? mod) as T;
}

async function loadTs(): Promise<TS> {
	if (!tsMod) tsMod = await importExternal<TS>(`https://esm.sh/typescript@${TS_VERSION}`);
	return tsMod;
}

async function loadLz(): Promise<LzModule> {
	if (!lzMod) lzMod = await importExternal<LzModule>('https://esm.sh/lz-string@1.5.0');
	return lzMod;
}

function compilerOptions(ts: TS): TSNS.CompilerOptions {
	return {
		target: ts.ScriptTarget.ES2020,
		module: ts.ModuleKind.ESNext,
		strict: true,
		noUncheckedIndexedAccess: true,
		lib: ['lib.es2020.d.ts', 'lib.dom.d.ts'],
		skipLibCheck: true
	};
}

// Cache the (network-fetched) lib .d.ts files only. A fresh System + environment
// is built per check with the real code already present — the docs-faithful flow,
// which avoids the cached-env + updateFile path that caused TS6053.
async function getLibs(): Promise<{ ts: TS; vfs: VfsModule; libs: Map<string, string> }> {
	if (!libsPromise) {
		libsPromise = (async () => {
			const ts = await loadTs();
			const vfs = await importExternal<VfsModule>('https://esm.sh/@typescript/vfs@1.6.0');
			const lz = await loadLz();
			const libs = await vfs.createDefaultMapFromCDN(compilerOptions(ts), ts.version, true, ts, lz);
			return { ts, vfs, libs };
		})();
	}
	return libsPromise;
}

function toDiags(ts: TS, file: TSNS.SourceFile | undefined, list: readonly TSNS.Diagnostic[]): Diag[] {
	return list.map((d) => {
		let line = 0;
		let col = 0;
		if (d.file && typeof d.start === 'number') {
			const pos = d.file.getLineAndCharacterOfPosition(d.start);
			line = pos.line + 1;
			col = pos.character + 1;
		}
		const category =
			d.category === ts.DiagnosticCategory.Error
				? 'error'
				: d.category === ts.DiagnosticCategory.Warning
					? 'warning'
					: 'message';
		return {
			line,
			col,
			code: d.code,
			category,
			message: ts.flattenDiagnosticMessageText(d.messageText, '\n')
		} satisfies Diag;
	});
}

export async function typeCheck(code: string): Promise<Diag[]> {
	const { ts, vfs, libs } = await getLibs();
	const fsMap = new Map(libs); // clone so the cached lib map is never mutated
	fsMap.set(FILE, code);
	const opts = compilerOptions(ts);
	const system = vfs.createSystem(fsMap);
	const env = vfs.createVirtualTypeScriptEnvironment(system, [FILE], ts, opts);
	const syntactic = env.languageService.getSyntacticDiagnostics(FILE);
	const semantic = env.languageService.getSemanticDiagnostics(FILE);
	return toDiags(ts, undefined, [...syntactic, ...semantic]).sort((a, b) => a.line - b.line);
}

export interface InferredType {
	line: number; // 1-based, the line the binding sits on
	name: string; // the binding identifier (e.g. `x`)
	type: string; // the inferred type as TS would display it (e.g. `string`)
}

// E1: inferred-type readout. The narrowed/inferred type *is* the lesson, so we
// surface what TS infers for each top-level binding using the real language
// service's quick-info (the same data a hover tooltip shows). Best-effort:
// returns [] on any failure so it never blocks running.
export async function inferTypes(code: string): Promise<InferredType[]> {
	const { ts, vfs, libs } = await getLibs();
	const fsMap = new Map(libs);
	fsMap.set(FILE, code);
	const opts = compilerOptions(ts);
	const system = vfs.createSystem(fsMap);
	const env = vfs.createVirtualTypeScriptEnvironment(system, [FILE], ts, opts);
	const ls = env.languageService;
	const program = ls.getProgram();
	const source = program?.getSourceFile(FILE);
	if (!source) return [];

	// Collect top-level binding identifiers (let/const/var + function/class names).
	const targets: TSNS.Identifier[] = [];
	for (const stmt of source.statements) {
		if (ts.isVariableStatement(stmt)) {
			for (const decl of stmt.declarationList.declarations) {
				if (ts.isIdentifier(decl.name)) targets.push(decl.name);
			}
		} else if (
			(ts.isFunctionDeclaration(stmt) || ts.isClassDeclaration(stmt)) &&
			stmt.name &&
			ts.isIdentifier(stmt.name)
		) {
			targets.push(stmt.name);
		}
	}

	const out: InferredType[] = [];
	const seen = new Set<string>();
	for (const id of targets) {
		const info = ls.getQuickInfoAtPosition(FILE, id.getStart(source));
		const display = info?.displayParts?.map((p) => p.text).join('') ?? '';
		// quick-info reads like "const x: string" or "function f(a: number): number";
		// keep the part after the first identifier as the type, dropping the keyword.
		const type = extractType(display, id.text);
		if (!type) continue;
		const line = source.getLineAndCharacterOfPosition(id.getStart(source)).line + 1;
		const key = `${line}:${id.text}`;
		if (seen.has(key)) continue;
		seen.add(key);
		out.push({ line, name: id.text, type });
	}
	return out;
}

// Turn a quick-info display string into just the type portion. Handles the
// common forms: "const x: T", "let y: T", "function f(...): R", "class C".
function extractType(display: string, name: string): string {
	if (!display) return '';
	// Strip a leading declaration keyword if present.
	const noKw = display.replace(/^(const|let|var|function|class|enum|namespace)\s+/, '');
	// For `name: Type`, return Type; for functions `name(...)`, return the signature.
	if (noKw.startsWith(`${name}:`)) return noKw.slice(name.length + 1).trim();
	if (noKw.startsWith(`${name}(`) || noKw.startsWith(`${name}<`))
		return noKw.slice(name.length).trim();
	if (noKw.startsWith(name)) return noKw.slice(name.length).trim();
	return noKw.trim();
}

// Type-check but never throw — diagnostics are a best-effort aid and must not
// block the learner from running their code (e.g. if the CDN/vfs is unavailable).
async function safeTypeCheck(code: string): Promise<Diag[]> {
	try {
		return await typeCheck(code);
	} catch {
		return [];
	}
}

function format(v: unknown): string {
	if (typeof v === 'string') return v;
	if (v === undefined) return 'undefined';
	if (v === null) return 'null';
	if (typeof v === 'bigint') return `${v}n`;
	if (typeof v === 'function') return `[Function: ${(v as { name?: string }).name || 'anonymous'}]`;
	try {
		return JSON.stringify(v, (_k, val) => (typeof val === 'bigint' ? `${val}n` : val), 2);
	} catch {
		return String(v);
	}
}

// Trust boundary: `js` is the learner's OWN code, transpiled from what they typed
// into the editor (or the lesson's authored example), executed in their own browser
// tab with no server, network, or cross-user data involved — identical to the
// official TS Playground. The eval-by-design here is the feature, not untrusted input.
function runJs(js: string): { logs: string[]; runtimeError?: string } {
	const logs: string[] = [];
	const sink = (...args: unknown[]) => logs.push(args.map(format).join(' '));
	const fakeConsole = { log: sink, info: sink, warn: sink, error: sink, debug: sink };
	try {
		// eslint-disable-next-line no-new-func
		const fn = new Function('console', `"use strict";\n${js}`);
		fn(fakeConsole);
	} catch (e) {
		return { logs, runtimeError: e instanceof Error ? `${e.name}: ${e.message}` : String(e) };
	}
	return { logs };
}

/**
 * Transpile + execute, returning logs. Type diagnostics are gathered best-effort
 * (in parallel) and never block execution — types are advisory, just like tsc.
 */
export async function runTs(code: string): Promise<RunResult> {
	const ts = await loadTs();
	const diagnostics = await safeTypeCheck(code);
	const js = ts.transpileModule(code, {
		compilerOptions: { target: ts.ScriptTarget.ES2020, module: ts.ModuleKind.None }
	}).outputText;
	const { logs, runtimeError } = runJs(js);
	return { logs, runtimeError, diagnostics };
}

export interface TestSpec {
	name: string;
	code: string;
}
export interface TestResult {
	name: string;
	pass: boolean;
	error?: string;
}

const TEST_HELPERS = `
function assert(cond, msg){ if(!cond) throw new Error(msg || "Expected value to be truthy"); }
function assertEqual(actual, expected, msg){
  var a = JSON.stringify(actual), b = JSON.stringify(expected);
  if(a !== b) throw new Error((msg ? msg + ": " : "") + "expected " + b + " but got " + a);
}
function assertThrows(fn, msg){
  try { fn(); } catch(_e) { return; }
  throw new Error(msg || "expected the function to throw");
}`;

/**
 * Type-check the learner's code, then run a set of named tests against it.
 * Each test's `code` runs in a closure with access to the learner's top-level
 * declarations plus assert/assertEqual/assertThrows; throwing fails the test.
 */
export async function runTests(
	userCode: string,
	tests: TestSpec[]
): Promise<{ results: TestResult[]; diagnostics: Diag[] }> {
	const ts = await loadTs();
	const diagnostics = await safeTypeCheck(userCode);
	const harness = tests
		.map(
			(t) =>
				`try{ (function(){\n${t.code}\n})(); __results.push({name:${JSON.stringify(
					t.name
				)},pass:true}); }catch(__e){ __results.push({name:${JSON.stringify(
					t.name
				)},pass:false,error:(__e&&__e.message)||String(__e)}); }`
		)
		.join('\n');
	const full = `${TEST_HELPERS}\n${userCode}\nvar __results=[];\n${harness}\nreturn __results;`;
	const js = ts.transpileModule(full, {
		compilerOptions: { target: ts.ScriptTarget.ES2020, module: ts.ModuleKind.None }
	}).outputText;
	try {
		// Learner's own code, client-side (see runJs trust-boundary note).
		// eslint-disable-next-line no-new-func
		const fn = new Function(`"use strict";\n${js}`);
		return { results: (fn() as TestResult[]) ?? [], diagnostics };
	} catch (e) {
		const error = e instanceof Error ? e.message : String(e);
		return { results: tests.map((t) => ({ name: t.name, pass: false, error })), diagnostics };
	}
}

// Friction fix: warm the TS engine ahead of the first Run so the learner doesn't
// eat the cold-load latency mid-interaction (Doherty <400ms goal). Kicks off the
// lib download + compiler import; idempotent (getLibs caches the promise). Errors
// are swallowed — warming is best-effort and never user-visible.
// Session-scoped (in-memory, per page load) store of edited playground code,
// keyed by a stable per-block key. Lets a `:::play` survive a re-render/reveal
// without losing the reader's edits. Not persisted to storage — intentionally
// resets on full reload, matching "within a session" semantics.
export const editBuffer = new Map<string, string>();

let warmed = false;
export function warmup(): void {
	if (warmed) return;
	warmed = true;
	void getLibs().catch(() => {
		warmed = false; // allow a later real run to retry the load
	});
}
