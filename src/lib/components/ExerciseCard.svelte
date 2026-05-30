<script lang="ts">
	import { onMount } from 'svelte';
	import CodeEditor from './CodeEditor.svelte';
	import { runTests, type TestResult, type Diag } from '$lib/playground';
	import type { Exercise } from '$lib/exercises';

	let { exercise }: { exercise: Exercise } = $props();

	// svelte-ignore state_referenced_locally — exercise is a stable per-card prop
	const storageKey = `tsfp-ex-${exercise.id}`;
	// svelte-ignore state_referenced_locally — starter is a stable per-card seed
	let code = $state(exercise.starter);
	let results = $state<TestResult[]>([]);
	let diagnostics = $state<Diag[]>([]);
	let ran = $state(false);
	let busy = $state(false);
	let mounted = $state(false);
	let savedNote = $state(false);

	// Restore the learner's saved edits (client-only), then persist on every change.
	onMount(() => {
		const saved = localStorage.getItem(storageKey);
		if (saved !== null) code = saved;
		mounted = true;
	});

	$effect(() => {
		if (!mounted) return;
		localStorage.setItem(storageKey, code);
		savedNote = code !== exercise.starter;
	});

	const passed = $derived(results.filter((r) => r.pass).length);
	const allPass = $derived(ran && results.length > 0 && passed === results.length);

	async function check() {
		busy = true;
		try {
			const out = await runTests(code, exercise.tests);
			results = out.results;
			diagnostics = out.diagnostics;
			ran = true;
		} catch (e) {
			diagnostics = [];
			results = exercise.tests.map((t) => ({
				name: t.name,
				pass: false,
				error: e instanceof Error ? e.message : String(e)
			}));
			ran = true;
		} finally {
			busy = false;
		}
	}

	function reset() {
		code = exercise.starter;
		localStorage.removeItem(storageKey);
		savedNote = false;
		results = [];
		diagnostics = [];
		ran = false;
	}

	const typeErrors = $derived(diagnostics.filter((d) => d.category === 'error'));
</script>

<div class="ex" class:solved={allPass}>
	<p class="ex-prompt">{exercise.prompt}</p>
	<CodeEditor bind:value={code} rows={9} />
	<div class="ex-bar">
		<button class="btn primary sm" onclick={check} disabled={busy}>
			{busy ? 'Checking…' : 'Run tests'}
		</button>
		<button class="btn sm" onclick={reset} disabled={busy}>Reset</button>
		{#if ran}
			<span class="ex-score" class:ok={allPass}>{passed} / {results.length} passing</span>
		{/if}
		{#if savedNote}<span class="ex-saved" title="Your edits are saved locally">saved ✓</span>{/if}
	</div>

	{#if typeErrors.length > 0}
		<ul class="ex-diags">
			{#each typeErrors as d}
				<li><span class="loc">{d.line}:{d.col}</span> TS{d.code}: {d.message}</li>
			{/each}
		</ul>
	{/if}

	{#if ran}
		<ul class="ex-results">
			{#each results as r}
				<li class={r.pass ? 'pass' : 'fail'}>
					<span class="mark">{r.pass ? '✓' : '✕'}</span>
					<span class="name">{r.name}</span>
					{#if !r.pass && r.error}<span class="err">— {r.error}</span>{/if}
				</li>
			{/each}
		</ul>
		{#if allPass}<p class="ex-done">🎉 All tests pass.</p>{/if}
	{/if}
</div>

<style>
	.ex {
		margin: 1.2rem 0;
		border: 1px solid var(--border);
		border-radius: 12px;
		padding: 1rem;
		background: var(--bg-elev);
	}
	.ex.solved {
		border-color: var(--ok);
	}
	.ex-prompt {
		margin-top: 0;
	}
	.ex-bar {
		display: flex;
		flex-wrap: wrap;
		align-items: center;
		gap: 0.5rem;
		margin-top: 0.6rem;
	}
	.btn.sm {
		padding: 0.32rem 0.7rem;
		font-size: 0.84rem;
	}
	.ex-score {
		font-size: 0.84rem;
		font-weight: 600;
		color: var(--fg-muted);
	}
	.ex-score.ok {
		color: var(--ok);
	}
	.ex-saved {
		font-size: 0.76rem;
		color: var(--fg-muted);
	}
	.ex-diags {
		list-style: none;
		padding: 0.5rem 0.7rem;
		margin: 0.7rem 0 0;
		font-family: var(--font-mono);
		font-size: 0.78rem;
		border-radius: 8px;
		border-left: 3px solid #cf222e;
		background: color-mix(in srgb, #cf222e 8%, transparent);
	}
	.ex-diags .loc {
		color: var(--fg-muted);
		margin-right: 0.4rem;
	}
	.ex-results {
		list-style: none;
		padding: 0;
		margin: 0.7rem 0 0;
		font-family: var(--font-mono);
		font-size: 0.82rem;
	}
	.ex-results li {
		margin: 0.15rem 0;
	}
	.ex-results .mark {
		display: inline-block;
		width: 1.2em;
		font-weight: 700;
	}
	.ex-results li.pass .mark {
		color: var(--ok);
	}
	.ex-results li.fail .mark {
		color: #cf222e;
	}
	.ex-results .err {
		color: #cf222e;
	}
	.ex-done {
		color: var(--ok);
		font-weight: 600;
		margin-bottom: 0;
	}
</style>
