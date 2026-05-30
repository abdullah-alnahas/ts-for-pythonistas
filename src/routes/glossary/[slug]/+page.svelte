<script lang="ts">
	import { base } from '$app/paths';
	let { data } = $props();
	const entry = $derived(data.entry);
</script>

<svelte:head>
	<title>{entry.term} · Glossary · TS for Pythonistas</title>
	<meta name="description" content={entry.short} />
</svelte:head>

<div class="page">
	<main class="prose">
		<p class="gloss-crumbs">
			<a href="{base}/glossary">Glossary</a>
			<span aria-hidden="true">/</span>
			<span class="gloss-domain-tag">{entry.domainLabel}</span>
		</p>
		<h1>{entry.term}</h1>
		<p class="lead">{entry.short}</p>

		<div class="prose gloss-body">{@html data.html}</div>

		{#if data.related.length > 0}
			<section class="gloss-related">
				<h2>Related</h2>
				<ul class="gloss-related-list">
					{#each data.related as r (r.slug)}
						<li>
							<a href="{base}/glossary/{r.slug}">
								<span class="rel-term">{r.term}</span>
								<span class="rel-short">{r.short}</span>
							</a>
						</li>
					{/each}
				</ul>
			</section>
		{/if}

		<p class="gloss-back">
			<a href="{base}/glossary">← Back to glossary</a>
		</p>
	</main>
</div>

<style>
	.gloss-crumbs {
		display: flex;
		gap: 0.5rem;
		align-items: center;
		font-size: 0.85rem;
		color: var(--fg-muted);
		margin: 0 0 0.4rem;
	}
	.gloss-domain-tag {
		font-family: var(--font-mono);
		font-size: 0.74rem;
		text-transform: uppercase;
		letter-spacing: 0.06em;
		padding: 0.1rem 0.45rem;
		border-radius: 5px;
		background: color-mix(in srgb, var(--accent) 12%, transparent);
		color: var(--accent);
	}
	.gloss-related {
		margin-top: 2.4rem;
	}
	.gloss-related-list {
		list-style: none;
		padding: 0;
		display: grid;
		gap: 0.5rem;
	}
	.gloss-related-list a {
		display: block;
		padding: 0.6rem 0.85rem;
		border: 1px solid var(--border);
		border-radius: 9px;
		color: var(--fg);
	}
	.gloss-related-list a:hover {
		text-decoration: none;
		border-color: var(--accent);
		background: var(--code-bg);
	}
	.rel-term {
		display: block;
		font-weight: 650;
	}
	.rel-short {
		display: block;
		margin-top: 0.2rem;
		font-size: 0.86rem;
		color: var(--fg-muted);
	}
	.gloss-back {
		margin-top: 2.4rem;
		padding-top: 1.2rem;
		border-top: 1px solid var(--border);
	}
</style>
