<script lang="ts">
	import { leetcodeFor, leetUrl } from '$lib/leetcode';

	let { slug }: { slug: string } = $props();
	const problems = $derived(leetcodeFor(slug));
</script>

{#if problems.length > 0}
	<h2 class="lc-heading">Practice on LeetCode</h2>
	<p class="muted small">Solve these in TypeScript to drill the lesson on real problems.</p>
	<ul class="lc-list">
		{#each problems as p (p.num)}
			<li>
				<a class="lc-link" href={leetUrl(p.slug)} target="_blank" rel="noreferrer">
					<span class="lc-num">{p.num}.</span>
					<span class="lc-title">{p.title}</span>
					<span class="lc-diff {p.difficulty.toLowerCase()}">{p.difficulty}</span>
				</a>
				<p class="lc-why">{p.why}</p>
			</li>
		{/each}
	</ul>
{/if}

<style>
	.lc-heading {
		margin-top: 2.6rem;
	}
	.lc-list {
		list-style: none;
		padding: 0;
	}
	.lc-list li {
		margin: 0 0 0.9rem;
		padding: 0.7rem 0.9rem;
		border: 1px solid var(--border);
		border-radius: 10px;
		background: var(--bg-elev);
	}
	.lc-link {
		display: flex;
		align-items: baseline;
		gap: 0.5rem;
		color: var(--fg);
		font-weight: 600;
	}
	.lc-num {
		color: var(--fg-muted);
		font-family: var(--font-mono);
		font-size: 0.85rem;
	}
	.lc-diff {
		margin-left: auto;
		font-size: 0.72rem;
		font-weight: 700;
		padding: 0.1rem 0.5rem;
		border-radius: 99px;
		text-transform: uppercase;
		letter-spacing: 0.03em;
	}
	/* Text colors deepened so each badge clears WCAG AA (≥4.5:1) on its own tint. */
	.lc-diff.easy {
		color: #136a2d;
		background: color-mix(in srgb, #1a7f37 14%, transparent);
	}
	.lc-diff.medium {
		color: #7d5a00;
		background: color-mix(in srgb, #bf8700 16%, transparent);
	}
	.lc-diff.hard {
		color: #a81620;
		background: color-mix(in srgb, #cf222e 14%, transparent);
	}
	.lc-why {
		margin: 0.35rem 0 0;
		font-size: 0.9rem;
		color: var(--fg-muted);
	}
</style>
