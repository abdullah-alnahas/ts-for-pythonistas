<script lang="ts">
	import { base } from '$app/paths';
	let { data } = $props();

	let q = $state('');
	const groups = $derived(
		data.groups
			.map((g) => ({
				...g,
				items: g.items.filter((e) => {
					const term = q.trim().toLowerCase();
					if (!term) return true;
					return (
						e.term.toLowerCase().includes(term) || e.short.toLowerCase().includes(term)
					);
				})
			}))
			.filter((g) => g.items.length > 0)
	);
	const shown = $derived(groups.reduce((n, g) => n + g.items.length, 0));
</script>

<svelte:head>
	<title>Glossary · TS for Pythonistas</title>
	<meta
		name="description"
		content="Definitions of TypeScript terms and concepts, explained for developers coming from Python."
	/>
</svelte:head>

<div class="page">
	<main class="prose">
		<div class="kicker">Reference</div>
		<h1>Glossary</h1>
		<p class="lead">
			Deep dives on the concepts that don't fit inline — TypeScript, JavaScript, Python, and
			general type-system theory. Each entry anchors to what you already know and cross-links to
			related ideas.
		</p>

		<input
			class="gloss-filter"
			type="search"
			placeholder="Filter {data.total} terms…"
			bind:value={q}
			aria-label="Filter glossary terms"
		/>

		{#if q.trim()}
			<p class="muted small">{shown} match{shown === 1 ? '' : 'es'}</p>
		{/if}

		{#each groups as g (g.domain)}
			<section class="gloss-domain">
				<h2 id={g.domain}>{g.label}</h2>
				<ul class="gloss-list">
					{#each g.items as e (e.slug)}
						<li>
							<a class="gloss-card" href="{base}/glossary/{e.slug}">
								<span class="gloss-card-term">{e.term}</span>
								<span class="gloss-card-short">{e.short}</span>
							</a>
						</li>
					{/each}
				</ul>
			</section>
		{:else}
			<p class="muted">No terms match “{q}”. Try a shorter keyword.</p>
		{/each}
	</main>
</div>

<style>
	.gloss-filter {
		width: 100%;
		font: inherit;
		font-size: 1.02rem;
		padding: 0.65rem 1rem;
		border: 1px solid var(--border);
		border-radius: 10px;
		background: var(--bg-elev);
		color: var(--fg);
		margin: 0.6rem 0 1.4rem;
	}
	.gloss-domain {
		margin-bottom: 1.6rem;
	}
	.gloss-list {
		list-style: none;
		padding: 0;
		display: grid;
		gap: 0.6rem;
	}
	.gloss-card {
		display: block;
		padding: 0.75rem 0.95rem;
		border: 1px solid var(--border);
		border-radius: 10px;
		color: var(--fg);
	}
	.gloss-card:hover {
		text-decoration: none;
		border-color: var(--accent);
		background: var(--code-bg);
	}
	.gloss-card-term {
		display: block;
		font-weight: 650;
	}
	.gloss-card-short {
		display: block;
		margin-top: 0.25rem;
		font-size: 0.9rem;
		color: var(--fg-muted);
	}
</style>
