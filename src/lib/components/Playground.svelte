<script lang="ts">
	import CodeEditor from './CodeEditor.svelte';
	import {
		runTs,
		warmup,
		inferTypes,
		editBuffer,
		type Diag,
		type InferredType
	} from '$lib/playground';

	let {
		initialCode = '',
		rows = 10,
		cacheKey = ''
	}: { initialCode?: string; rows?: number; cacheKey?: string } = $props();

	// Friction fix: never lose edited code if this playground re-mounts within the
	// session (e.g. a reveal re-renders the article). A session-scoped buffer keyed
	// by `cacheKey` holds the latest edit; fall back to the authored seed.
	// svelte-ignore state_referenced_locally — these are stable per-mount seeds
	let code = $state(cacheKey ? (editBuffer.get(cacheKey) ?? initialCode) : initialCode);
	let logs = $state<string[]>([]);
	let runtimeError = $state<string | undefined>(undefined);
	let diagnostics = $state<Diag[]>([]);
	let status = $state<'idle' | 'loading' | 'ran'>('idle');
	let busy = $state(false);

	// E1: inferred-type readout. Off by default; when on, each Run (and toggling
	// on) annotates the inferred type of every top-level binding — the type *is*
	// the lesson. Pure read of the TS language service, no effect on running.
	let showTypes = $state(false);
	let inferred = $state<InferredType[]>([]);
	let inferring = $state(false);

	async function refreshTypes() {
		if (!showTypes) return;
		inferring = true;
		try {
			inferred = await inferTypes(code);
		} catch {
			inferred = [];
		} finally {
			inferring = false;
		}
	}

	async function toggleTypes() {
		showTypes = !showTypes;
		if (showTypes) await refreshTypes();
		else inferred = [];
	}

	const errorCount = $derived(diagnostics.filter((d) => d.category === 'error').length);

	// Persist edits to the session buffer so a re-mount restores them.
	$effect(() => {
		if (cacheKey) editBuffer.set(cacheKey, code);
	});

	// Warm the TS engine on first interaction (focus/hover) so Run feels instant.
	function warm() {
		warmup();
	}

	async function run() {
		busy = true;
		if (status === 'idle') status = 'loading';
		try {
			const res = await runTs(code);
			logs = res.logs;
			runtimeError = res.runtimeError;
			diagnostics = res.diagnostics;
			status = 'ran';
			await refreshTypes();
		} catch (e) {
			runtimeError = `Engine failed to load: ${e instanceof Error ? e.message : String(e)}`;
			status = 'ran';
		} finally {
			busy = false;
		}
	}

	function reset() {
		code = initialCode;
		if (cacheKey) editBuffer.delete(cacheKey);
		logs = [];
		runtimeError = undefined;
		diagnostics = [];
		status = 'idle';
		inferred = [];
	}
</script>

<!-- svelte-ignore a11y_no_static_element_interactions -->
<div class="pg" onfocusin={warm} onpointerenter={warm}>
	<CodeEditor bind:value={code} {rows} />
	<div class="pg-bar">
		<button class="btn primary sm" onclick={run} disabled={busy}>
			{busy ? 'Running…' : '▶ Run'}
		</button>
		<button class="btn sm" onclick={reset} disabled={busy}>Reset</button>
		<button
			class="btn sm"
			class:active={showTypes}
			onclick={toggleTypes}
			aria-pressed={showTypes}
			title="Annotate the inferred type of each top-level binding"
		>
			{showTypes ? '✓ Inferred types' : 'Show inferred types'}
		</button>
		{#if status === 'ran'}
			<span class="pg-status" class:err={errorCount > 0}>
				{errorCount > 0 ? `${errorCount} type error${errorCount > 1 ? 's' : ''}` : '✓ type-checks'}
			</span>
		{/if}
	</div>

	{#if status === 'loading' && busy}
		<div class="pg-out muted">Loading the TypeScript compiler (first run only)…</div>
	{/if}

	{#if diagnostics.length > 0}
		<ul class="pg-diags">
			{#each diagnostics as d}
				<li class={d.category}>
					<span class="loc">{d.line}:{d.col}</span>
					<span class="ts-code">TS{d.code}</span>
					{d.message}
				</li>
			{/each}
		</ul>
	{/if}

	{#if showTypes}
		<div class="pg-types">
			<div class="pg-types-head">Inferred types{inferring ? ' …' : ''}</div>
			{#if inferred.length === 0 && !inferring}
				<span class="muted">No top-level bindings to infer.</span>
			{:else}
				<ul>
					{#each inferred as t}
						<li>
							<span class="ty-loc">L{t.line}</span>
							<code><span class="ty-name">{t.name}</span>: <span class="ty-type">{t.type}</span
								></code
							>
						</li>
					{/each}
				</ul>
			{/if}
		</div>
	{/if}

	{#if status === 'ran'}
		<div class="pg-out">
			{#if logs.length === 0 && !runtimeError}
				<span class="muted">(no console output)</span>
			{:else}
				{#each logs as line}<div class="log">{line}</div>{/each}
			{/if}
			{#if runtimeError}<div class="log runtime-err">⨯ {runtimeError}</div>{/if}
		</div>
	{/if}
</div>

<style>
	.pg {
		margin: 1.4rem 0;
		border: 1px solid var(--border);
		border-radius: 12px;
		padding: 0.8rem;
		background: var(--bg-elev);
	}
	.pg-bar {
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
	.pg-status {
		font-size: 0.82rem;
		color: var(--ok);
		font-weight: 600;
	}
	.pg-status.err {
		color: var(--danger);
	}
	.pg-diags {
		list-style: none;
		padding: 0;
		margin: 0.7rem 0 0;
		font-family: var(--font-mono);
		font-size: 0.8rem;
		border-radius: 8px;
		overflow: hidden;
		border: 1px solid var(--code-border);
	}
	.pg-diags li {
		margin: 0;
		padding: 0.4rem 0.7rem;
		border-left: 3px solid transparent;
		white-space: pre-wrap;
	}
	.pg-diags li.error {
		border-left-color: var(--danger);
		background: color-mix(in srgb, var(--danger) 8%, transparent);
	}
	.pg-diags li.warning {
		border-left-color: var(--warn);
		background: color-mix(in srgb, var(--warn) 10%, transparent);
	}
	.pg-diags .loc,
	.pg-diags .ts-code {
		color: var(--fg-muted);
		margin-right: 0.5rem;
	}
	.btn.active {
		border-color: var(--accent);
		color: var(--accent);
		font-weight: 600;
	}
	.pg-types {
		margin-top: 0.7rem;
		padding: 0.6rem 0.8rem;
		border-radius: 8px;
		border: 1px solid var(--code-border);
		background: var(--code-bg);
		font-size: 0.82rem;
	}
	.pg-types-head {
		font-size: 0.7rem;
		text-transform: uppercase;
		letter-spacing: 0.08em;
		color: var(--accent);
		font-weight: 700;
		margin-bottom: 0.4rem;
	}
	.pg-types ul {
		list-style: none;
		margin: 0;
		padding: 0;
		display: flex;
		flex-direction: column;
		gap: 0.2rem;
	}
	.pg-types li {
		display: flex;
		align-items: baseline;
		gap: 0.5rem;
		font-family: var(--font-mono);
	}
	.pg-types .ty-loc {
		color: var(--fg-muted);
		font-size: 0.72rem;
		flex: 0 0 auto;
	}
	.pg-types .ty-name {
		color: var(--fg);
	}
	.pg-types .ty-type {
		color: var(--accent);
	}
	.pg-out {
		margin-top: 0.7rem;
		padding: 0.7rem 0.9rem;
		border-radius: 8px;
		background: var(--code-bg);
		border: 1px solid var(--code-border);
		font-family: var(--font-mono);
		font-size: 0.82rem;
		white-space: pre-wrap;
	}
	.pg-out .log {
		padding: 0.05rem 0;
	}
	.runtime-err {
		color: var(--danger);
	}
</style>
