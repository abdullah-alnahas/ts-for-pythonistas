<script lang="ts">
	import { base } from '$app/paths';
	import CourseSwitcher from '$lib/components/CourseSwitcher.svelte';
	import { hydrateProgress, courseDone, courseLast } from '$lib/progress.svelte';

	let { data } = $props();
	hydrateProgress(data.courseId);
	const done = $derived(courseDone(data.courseId));
	const doneCount = $derived(data.lessons.filter((l) => done[l.slug]).length);
	const last = $derived(courseLast(data.courseId));
	const resume = $derived(
		(last && data.lessons.find((l) => l.slug === last.slug)) ??
			data.lessons.find((l) => !done[l.slug]) ??
			data.lessons[0]
	);
</script>

<svelte:head>
	<title>{data.title} — TypeScript for Pythonistas</title>
	<meta name="description" content={data.tagline} />
</svelte:head>

<div class="page">
	<main class="prose home">
		<div class="kicker">{data.spine}</div>
		<h1>{data.title}</h1>
		<p class="lead">{data.tagline}</p>

		<div class="cta-row">
			<a class="btn primary" href="{base}/{data.courseSlug}/lesson/{resume.slug}">
				{doneCount > 0 ? 'Continue' : 'Start'} → {resume.title}
			</a>
			<span class="muted">{doneCount} / {data.lessons.length} lessons done</span>
		</div>

		<h2>The roadmap</h2>
		<ol class="roadmap">
			{#each data.lessons as l}
				<li class:done={done[l.slug]}>
					<a href="{base}/{data.courseSlug}/lesson/{l.slug}">
						<span class="r-num">{String(l.order).padStart(2, '0')}</span>
						<span class="r-body">
							<span class="r-title">{l.title}</span>
							{#if l.subtitle}<span class="r-sub">{l.subtitle}</span>{/if}
						</span>
					</a>
				</li>
			{/each}
		</ol>

		<h2>Pick a different path</h2>
		<CourseSwitcher current={data.courseId} />
	</main>
</div>
