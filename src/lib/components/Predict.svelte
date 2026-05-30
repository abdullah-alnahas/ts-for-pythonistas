<script lang="ts">
	// E2: a commit-gated predict-then-reveal. The reader must pick an option and
	// commit before the answer unlocks — a stronger `:::quiz`. Pure client state;
	// nothing is sent anywhere. Hydrated over a `.predict-mount` placeholder that
	// already contains a no-JS quiz fallback (replaced on mount).
	interface PredictOption {
		html: string;
		correct: boolean;
	}
	let {
		prompt = '',
		options = [],
		answer = ''
	}: { prompt?: string; options?: PredictOption[]; answer?: string } = $props();

	// svelte-ignore state_referenced_locally
	const hasOptions = options.length > 0;
	let selected = $state<number | null>(null);
	let committed = $state(false);

	const chosen = $derived(selected !== null ? options[selected] : undefined);
	const correct = $derived(committed && chosen?.correct === true);

	function commit() {
		if (selected === null) return;
		committed = true;
	}
</script>

<div class="predict" class:committed>
	<div class="predict-q">{@html prompt}</div>

	{#if hasOptions}
		<ul class="predict-options" role="radiogroup" aria-label="Predict the result">
			{#each options as opt, i}
				<li role="presentation">
					<label
						class="predict-option"
						class:selected={selected === i}
						class:correct={committed && opt.correct}
						class:wrong={committed && selected === i && !opt.correct}
					>
						<input
							type="radio"
							name="predict"
							value={i}
							disabled={committed}
							checked={selected === i}
							onchange={() => (selected = i)}
						/>
						<span class="predict-option-body">{@html opt.html}</span>
						{#if committed && opt.correct}<span class="predict-mark" aria-hidden="true">✓</span>{/if}
						{#if committed && selected === i && !opt.correct}<span
								class="predict-mark"
								aria-hidden="true">✗</span
							>{/if}
					</label>
				</li>
			{/each}
		</ul>

		{#if !committed}
			<button class="btn primary sm" onclick={commit} disabled={selected === null}>
				Commit answer
			</button>
		{:else}
			<p class="predict-verdict" class:ok={correct} role="status">
				{correct ? '✓ Correct.' : '✗ Not quite — here is why.'}
			</p>
		{/if}
	{:else}
		<!-- No parsable options: behave like a click-to-reveal quiz, but still
		     record a commit so the reader can't skim past the gate. -->
		{#if !committed}
			<button class="btn primary sm" onclick={() => (committed = true)}>Reveal answer</button>
		{/if}
	{/if}

	{#if committed}
		<div class="predict-a">{@html answer}</div>
	{/if}
</div>

<style>
	.predict {
		margin: 1.4rem 0;
		border: 1px solid var(--border);
		border-radius: 10px;
		padding: 0.9rem 1.1rem;
		background: var(--bg-elev);
	}
	.predict-q::before {
		content: 'Predict';
		display: inline-block;
		font-size: 0.7rem;
		text-transform: uppercase;
		letter-spacing: 0.08em;
		color: var(--accent);
		font-weight: 700;
		margin-bottom: 0.4rem;
	}
	.predict-q :global(p:first-child) {
		margin-top: 0;
	}
	.predict-options {
		list-style: none;
		margin: 0.8rem 0;
		padding: 0;
		display: flex;
		flex-direction: column;
		gap: 0.4rem;
	}
	.predict-option {
		display: flex;
		align-items: center;
		gap: 0.55rem;
		padding: 0.45rem 0.7rem;
		border: 1px solid var(--code-border);
		border-radius: 8px;
		cursor: pointer;
	}
	.predict-option:hover {
		border-color: var(--accent);
	}
	.predict.committed .predict-option {
		cursor: default;
	}
	.predict-option.selected {
		border-color: var(--accent);
	}
	.predict-option.correct {
		border-color: var(--ok);
		background: color-mix(in srgb, var(--ok) 10%, transparent);
	}
	.predict-option.wrong {
		border-color: var(--danger);
		background: color-mix(in srgb, var(--danger) 9%, transparent);
	}
	.predict-option-body {
		flex: 1;
		min-width: 0;
	}
	.predict-option-body :global(p) {
		margin: 0;
	}
	.predict-option-body :global(code) {
		font-size: 0.85em;
	}
	.predict-mark {
		font-weight: 700;
	}
	.predict-option.correct .predict-mark {
		color: var(--ok);
	}
	.predict-option.wrong .predict-mark {
		color: var(--danger);
	}
	.predict-verdict {
		margin: 0.4rem 0 0;
		font-weight: 600;
		color: var(--danger);
	}
	.predict-verdict.ok {
		color: var(--ok);
	}
	.predict-a {
		margin-top: 0.7rem;
		border-top: 1px dashed var(--border);
		padding-top: 0.6rem;
	}
	.predict-a :global(p:first-child) {
		margin-top: 0;
	}
</style>
