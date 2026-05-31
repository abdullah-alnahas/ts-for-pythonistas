<script lang="ts">
	import { page } from '$app/state';
	import { base } from '$app/paths';
	import { goto } from '$app/navigation';
	import { search, searchCourse, type SearchHit } from '$lib/search';
	import { getCourseBySlug, getCourseById } from '$lib/courses';

	// Seed initial query from ?q= so direct links (and the sidebar mini-search)
	// land on results immediately, even with the input autofocused.
	let query = $state(page.url.searchParams.get('q') ?? '');

	// Keep in sync on later navigations (e.g. back/forward) without clobbering
	// what the user is actively typing.
	$effect(() => {
		const q = page.url.searchParams.get('q') ?? '';
		if (q !== query && document.activeElement?.tagName !== 'INPUT') query = q;
	});

	// Resolve the course from ?course= param; fall back to classic.
	const activeCourse = $derived.by(() => {
		const courseSlug = page.url.searchParams.get('course') ?? '';
		return getCourseBySlug(courseSlug) ?? getCourseById('classic');
	});

	const lessonHrefPrefix = $derived(
		activeCourse.id === 'classic'
			? `${base}/lesson`
			: `${base}/${activeCourse.routeSlug}/lesson`
	);

	const results = $derived<SearchHit[]>(
		query.trim() ? searchCourse(activeCourse.lessons, lessonHrefPrefix, query) : []
	);

	const SAMPLES = [
		'discriminated union',
		'narrowing',
		'structural typing',
		'event loop',
		'variance',
		'null vs undefined'
	];

	function focusOnMount(node: HTMLInputElement) {
		node.focus();
	}

	function runSample(s: string) {
		query = s;
		onInput();
	}

	function onInput() {
		const u = new URL(page.url);
		if (query) u.searchParams.set('q', query);
		else u.searchParams.delete('q');
		goto(u, { replaceState: true, keepFocus: true, noScroll: true });
	}
</script>

<svelte:head>
	<title>Search · TS for Pythonistas</title>
	<meta
		name="description"
		content="Search across every TypeScript-for-Pythonistas lesson and glossary entry by keyword."
	/>
</svelte:head>

<div class="page">
	<main class="prose">
		<div class="kicker">Search</div>
		<h1>Search the course</h1>
		<input
			class="search-input"
			type="search"
			aria-label="Search the course"
			placeholder="e.g. discriminated union, narrowing, null…"
			bind:value={query}
			oninput={onInput}
			use:focusOnMount
		/>

		{#if query.trim()}
			<p class="muted small">{results.length} result{results.length === 1 ? '' : 's'}</p>
			<ul class="results">
				{#each results as r}
					<li>
						<a href={r.href}>
							<span class="r-head">
								<span class="r-lesson">
									{#if r.kind === 'glossary'}
										<span class="r-badge">Glossary</span>
									{:else}
										{String(r.lessonOrder).padStart(2, '0')} · {r.lessonTitle}
									{/if}
								</span>
								<span class="r-section">{r.heading}</span>
							</span>
							<span class="r-snip">{r.snippet}</span>
						</a>
					</li>
				{:else}
					<li class="muted no-results">
						No matches for “{query}”. Try a single keyword, or one of these:
						<span class="samples">
							{#each SAMPLES as s}
								<button type="button" class="sample" onclick={() => runSample(s)}>{s}</button>
							{/each}
						</span>
					</li>
				{/each}
			</ul>
		{:else}
			<!-- A1.5: empty/zero state as onboarding -->
			<div class="search-empty">
				<p>Search {12} lessons and the glossary — concepts, code, and Python↔TS mappings.</p>
				<p class="muted small">Try one of these:</p>
				<div class="samples">
					{#each SAMPLES as s}
						<button type="button" class="sample" onclick={() => runSample(s)}>{s}</button>
					{/each}
				</div>
			</div>
		{/if}
	</main>
</div>

<style>
	.search-input {
		width: 100%;
		font: inherit;
		font-size: 1.05rem;
		padding: 0.7rem 1rem;
		border: 1px solid var(--border);
		border-radius: 10px;
		background: var(--bg-elev);
		color: var(--fg);
		margin: 0.6rem 0 1rem;
	}
	.search-input:focus {
		outline: 2px solid var(--accent);
	}
	.results {
		list-style: none;
		padding: 0;
	}
	.results li {
		margin: 0 0 0.6rem;
	}
	.results a {
		display: block;
		padding: 0.7rem 0.9rem;
		border: 1px solid var(--border);
		border-radius: 10px;
		color: var(--fg);
	}
	.results a:hover {
		text-decoration: none;
		border-color: var(--accent);
		background: var(--code-bg);
	}
	.r-head {
		display: flex;
		flex-wrap: wrap;
		gap: 0.5rem;
		align-items: baseline;
		justify-content: space-between;
	}
	.r-lesson {
		font-size: 0.78rem;
		color: var(--fg-muted);
		font-family: var(--font-mono);
	}
	.r-section {
		font-weight: 650;
	}
	.r-snip {
		display: block;
		margin-top: 0.3rem;
		font-size: 0.9rem;
		color: var(--fg-muted);
	}
	.r-badge {
		font-family: var(--font-mono);
		font-size: 0.68rem;
		text-transform: uppercase;
		letter-spacing: 0.06em;
		padding: 0.05rem 0.4rem;
		border-radius: 5px;
		background: color-mix(in srgb, var(--accent) 14%, transparent);
		color: var(--accent);
	}
	.search-empty {
		margin-top: 0.5rem;
		padding: 1.2rem 1.3rem;
		border: 1px dashed var(--border);
		border-radius: 12px;
		background: var(--bg-elev);
	}
	.search-empty p:first-child {
		margin-top: 0;
		font-weight: 600;
	}
	.samples {
		display: flex;
		flex-wrap: wrap;
		gap: 0.5rem;
		margin-top: 0.4rem;
	}
	.sample {
		font: inherit;
		font-size: 0.85rem;
		padding: 0.3rem 0.7rem;
		border: 1px solid var(--border);
		border-radius: 99px;
		background: var(--code-bg);
		color: var(--accent);
		cursor: pointer;
	}
	.sample:hover {
		border-color: var(--accent);
	}
	.no-results .samples {
		margin-top: 0.6rem;
	}
</style>
