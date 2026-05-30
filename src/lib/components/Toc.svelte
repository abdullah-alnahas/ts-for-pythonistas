<script lang="ts">
	// Per-lesson table of contents (A2.1). Sticky on wide screens, a collapsible
	// <details> on mobile. Highlights the active section via IntersectionObserver
	// (A4.1) — recognition over recall + wayfinding.
	import { onMount } from 'svelte';
	import type { TocItem } from '$lib/render';

	let { items, container }: { items: TocItem[]; container: HTMLElement | null } = $props();

	let activeId = $state('');

	$effect(() => {
		if (!container || items.length === 0) return;
		const ids = items.map((i) => i.id);
		const headings = ids
			.map((id) => container!.querySelector<HTMLElement>(`#${CSS.escape(id)}`))
			.filter((el): el is HTMLElement => !!el);
		if (headings.length === 0) return;

		const visible = new Set<string>();
		const obs = new IntersectionObserver(
			(entries) => {
				for (const e of entries) {
					if (e.isIntersecting) visible.add(e.target.id);
					else visible.delete(e.target.id);
				}
				// Pick the first heading (in document order) currently visible.
				const first = ids.find((id) => visible.has(id));
				if (first) activeId = first;
			},
			{ rootMargin: '0px 0px -70% 0px', threshold: 0 }
		);
		headings.forEach((h) => obs.observe(h));
		return () => obs.disconnect();
	});

	function go(e: MouseEvent, id: string) {
		const el = container?.querySelector<HTMLElement>(`#${CSS.escape(id)}`);
		if (!el) return; // fall back to default anchor jump
		e.preventDefault();
		const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
		el.scrollIntoView({ behavior: reduce ? 'auto' : 'smooth', block: 'start' });
		history.replaceState(null, '', `#${id}`);
		activeId = id;
	}
</script>

{#if items.length > 1}
	<nav class="toc" aria-label="On this page">
		<details class="toc-details" open>
			<summary class="toc-title">On this page</summary>
			<ul>
				{#each items as item (item.id)}
					<li>
						<a
							href="#{item.id}"
							class:active={activeId === item.id}
							aria-current={activeId === item.id ? 'true' : undefined}
							onclick={(e) => go(e, item.id)}>{item.text}</a
						>
					</li>
				{/each}
			</ul>
		</details>
	</nav>
{/if}

<style>
	.toc {
		font-size: 0.86rem;
	}
	.toc ul {
		list-style: none;
		margin: 0.4rem 0 0;
		padding: 0;
		display: flex;
		flex-direction: column;
		gap: 0.1rem;
	}
	.toc li {
		margin: 0;
	}
	.toc a {
		display: block;
		padding: 0.25rem 0.5rem;
		border-left: 2px solid var(--border);
		color: var(--fg-muted);
		line-height: 1.35;
	}
	.toc a:hover {
		text-decoration: none;
		color: var(--fg);
		border-left-color: color-mix(in srgb, var(--accent) 50%, var(--border));
	}
	.toc a.active {
		color: var(--accent);
		font-weight: 600;
		border-left-color: var(--accent);
	}
	.toc-title {
		font-size: 0.7rem;
		text-transform: uppercase;
		letter-spacing: 0.08em;
		color: var(--fg-muted);
		font-weight: 700;
		cursor: default;
		list-style: none;
	}
	.toc-title::-webkit-details-marker {
		display: none;
	}
</style>
