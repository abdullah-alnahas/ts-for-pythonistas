<script lang="ts">
	// A2.5: course-completion finale — a real "you're done" peak (Peak-End).
	import { base } from '$app/paths';
	import { lessons } from '$lib/content';
	import { hydrateProgress, courseDone } from '$lib/progress.svelte';

	hydrateProgress('classic');
	const doneCount = $derived(lessons.filter((l) => courseDone('classic')[l.slug]).length);
	const total = lessons.length;
	const complete = $derived(doneCount >= total);
	const remaining = $derived(lessons.filter((l) => !courseDone('classic')[l.slug]));
</script>

<svelte:head>
	<title>{complete ? 'Course complete' : 'Almost there'} · TS for Pythonistas</title>
	<meta
		name="description"
		content="Your progress through the TypeScript for Pythonistas course — see what's done and what's left."
	/>
</svelte:head>

<div class="page">
	<main class="prose done-finale">
		{#if complete}
			<div class="finale-badge" aria-hidden="true">🎓</div>
			<div class="kicker">Course complete</div>
			<h1>You finished all {total} lessons.</h1>
			<p class="lead">
				You've mapped TypeScript onto everything you already knew from Python — structural typing,
				generics, narrowing, the JS reality underneath. The types you've been reading erase to plain
				JavaScript at runtime; the mental model stays with you.
			</p>
			<div class="cta-row">
				<a class="btn primary" href="{base}/playground">Open the playground →</a>
				<a class="btn" href="{base}/glossary">Browse the glossary</a>
			</div>
			<h2>Where to go next</h2>
			<ul>
				<li>Keep the <a href="{base}/glossary">glossary</a> handy for the deep cuts (variance, conditional types, the event loop).</li>
				<li>Re-run any lesson's <strong>predict-then-run</strong> playgrounds — retrieval beats re-reading.</li>
				<li>Take a real TS codebase and read its types first; you now have the vocabulary.</li>
			</ul>
		{:else}
			<div class="kicker">Almost there</div>
			<h1>{doneCount} / {total} lessons done</h1>
			<p class="lead">
				A few lessons left before the finale. Finish these to complete the course:
			</p>
			<ul class="finale-remaining">
				{#each remaining as l (l.slug)}
					<li>
						<a href="{base}/lesson/{l.slug}">
							<span class="r-num">{String(l.order).padStart(2, '0')}</span>
							<span>{l.title}</span>
						</a>
					</li>
				{/each}
			</ul>
		{/if}
	</main>
</div>

<style>
	.done-finale {
		text-align: center;
	}
	.finale-badge {
		font-size: 3.5rem;
		line-height: 1;
		margin-bottom: 0.4rem;
	}
	.done-finale .cta-row {
		justify-content: center;
	}
	.done-finale h2,
	.done-finale ul,
	.done-finale .lead {
		text-align: left;
	}
	.finale-remaining {
		list-style: none;
		padding: 0;
		display: grid;
		gap: 0.5rem;
		text-align: left;
	}
	.finale-remaining a {
		display: flex;
		gap: 0.7rem;
		align-items: baseline;
		padding: 0.6rem 0.85rem;
		border: 1px solid var(--border);
		border-radius: 9px;
		color: var(--fg);
	}
	.finale-remaining a:hover {
		text-decoration: none;
		border-color: var(--accent);
		background: var(--code-bg);
	}
	.finale-remaining .r-num {
		font-family: var(--font-mono);
		color: var(--fg-muted);
		font-size: 0.85rem;
	}
</style>
