<script lang="ts">
	import { base } from '$app/paths';
	import { COURSES, type CourseId } from '$lib/courses';
	let { current }: { current?: CourseId } = $props();
	const href = (slug: string) => (slug === '' ? `${base}/` : `${base}/${slug}`);
	function remember(id: CourseId) {
		try {
			localStorage.setItem('ts-learn:course', id);
		} catch {
			/* ignore */
		}
	}
</script>

<ul class="course-cards">
	{#each COURSES as c}
		<li class:current={c.id === current}>
			<a href={href(c.routeSlug)} onclick={() => remember(c.id)}>
				<span class="cc-title">{c.title}</span>
				<span class="cc-tag">{c.tagline}</span>
				<span class="cc-spine">{c.spine}</span>
			</a>
		</li>
	{/each}
</ul>

<style>
	.course-cards {
		list-style: none;
		padding: 0;
		margin: 1rem 0 0;
		display: grid;
		gap: 0.75rem;
		grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
	}
	.course-cards a {
		display: flex;
		flex-direction: column;
		gap: 0.25rem;
		padding: 0.9rem 1rem;
		border: 1px solid var(--border, #d0d7de);
		border-radius: 10px;
		text-decoration: none;
		height: 100%;
	}
	.course-cards li.current a {
		border-color: var(--accent, #0969da);
	}
	.cc-title {
		font-weight: 650;
	}
	.cc-tag {
		font-size: 0.9rem;
	}
	.cc-spine {
		font-size: 0.8rem;
		/* Solid muted token (AA ≥4.5:1) instead of opacity, which dropped the
		   ratio to 3.4 and failed Lighthouse color-contrast. */
		color: var(--fg-muted);
	}
</style>
