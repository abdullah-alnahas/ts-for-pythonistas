<script lang="ts">
	import { base } from '$app/paths';
	import { lessons } from '$lib/content';
	import { hydrateProgress, courseDone, courseLast } from '$lib/progress.svelte';

	hydrateProgress('classic');
	const first = lessons[0];
	const done = $derived(courseDone('classic'));
	const last = $derived(courseLast('classic'));
	const doneCount = $derived(lessons.filter((l) => done[l.slug]).length);
	const complete = $derived(doneCount >= lessons.length);
	// A2.4: resume target — last viewed, else first unfinished, else first.
	const resume = $derived(
		(last && lessons.find((l) => l.slug === last?.slug)) ??
			lessons.find((l) => !done[l.slug]) ??
			first
	);
</script>

<svelte:head>
	<title>TypeScript for Pythonistas — learn TS by mapping it to Python</title>
	<meta
		name="description"
		content="A TypeScript course for experienced Python developers. Every feature is anchored to its Python equivalent, with an in-browser playground, exercises, and practice problems."
	/>
</svelte:head>

<div class="page">
	<main class="prose home">
		<div class="kicker">A course, mapped to what you already know</div>
		<h1>TypeScript for Pythonistas</h1>
		<p class="lead">
			If you already think in Python, this course teaches TypeScript by anchoring every feature to
			its Python equivalent (or noting when there isn't one). Lead with the contrast, learn the
			surprise.
		</p>

		<div class="cta-row">
			{#if complete}
				<a class="btn primary" href="{base}/done">🎓 See your finale →</a>
			{:else}
				<a class="btn primary" href="{base}/lesson/{resume.slug}">
					{doneCount > 0 ? 'Continue' : 'Start'} → {resume.title}
				</a>
			{/if}
			<span class="muted">{doneCount} / {lessons.length} lessons done</span>
		</div>

		<h2>The roadmap</h2>
		<ol class="roadmap">
			{#each lessons as l}
				<li class:done={done[l.slug]}>
					<a href="{base}/lesson/{l.slug}">
						<span class="r-num">{String(l.order).padStart(2, '0')}</span>
						<span class="r-body">
							<span class="r-title">{l.title}</span>
							{#if l.subtitle}<span class="r-sub">{l.subtitle}</span>{/if}
						</span>
					</a>
				</li>
			{/each}
		</ol>

		<h2>How to read each lesson</h2>
		<ul>
			<li><strong>Compare blocks</strong> show Python on the left, TypeScript on the right.</li>
			<li><strong>Quick checks</strong> have a “Show answer” reveal — try before peeking.</li>
			<li>
				<strong>Glossary terms</strong> wear a dashed underline — hover (or tap) for a one-line
				gloss, click to open the full <a href="{base}/glossary">glossary</a> entry.
			</li>
			<li>Mark a lesson <strong>done</strong> at the bottom to track progress (stored locally).</li>
		</ul>
		<p class="muted small">
			Tip: drop any TS snippet into the in-app
			<a href="{base}/playground">Playground</a>
			to run it and read its type diagnostics live — the real compiler, in your browser.
		</p>
		<p class="muted small">
			Live at
			<a href="https://abdullah-alnahas.github.io/ts-for-pythonistas/">abdullah-alnahas.github.io/ts-for-pythonistas</a>
			— share it with anyone moving from Python to TypeScript.
		</p>
	</main>
</div>
