<script lang="ts">
	import { page } from '$app/state';
	import { base } from '$app/paths';
	import { goto } from '$app/navigation';
	import { lessons, type Lesson } from '$lib/content';
	import { hydrateProgress, courseDone, courseLast } from '$lib/progress.svelte';

	hydrateProgress('classic');

	let q = $state('');
	function submitSearch(e: SubmitEvent) {
		e.preventDefault();
		goto(`${base}/search${q.trim() ? `?q=${encodeURIComponent(q.trim())}` : ''}`);
	}

	// A2.2: group lessons into named phases (Miller / chunking / serial position).
	const PHASES: { label: string; range: [number, number] }[] = [
		{ label: 'Foundations', range: [1, 4] },
		{ label: 'The Type System', range: [5, 8] },
		{ label: 'Functions & Classes', range: [9, 10] },
		{ label: 'Advanced & JS Reality', range: [11, 12] }
	];
	const phases = $derived(
		PHASES.map((p) => ({
			label: p.label,
			items: lessons.filter((l) => l.order >= p.range[0] && l.order <= p.range[1])
		})).filter((p) => p.items.length > 0)
	);

	// A2.3: mobile drawer open/close (only affects <880px via CSS).
	let navOpen = $state(false);
	function closeNav() {
		navOpen = false;
	}

	// A2.4: resume affordance — last viewed lesson.
	const lastLesson = $derived<Lesson | undefined>(
		courseLast('classic') ? lessons.find((l) => l.slug === courseLast('classic')?.slug) : undefined
	);

	let theme = $state<'auto' | 'light' | 'dark'>('auto');

	$effect(() => {
		const saved = localStorage.getItem('tsfp-theme') as 'auto' | 'light' | 'dark' | null;
		setTheme(saved ?? 'auto');
	});

	function setTheme(t: 'auto' | 'light' | 'dark') {
		theme = t;
		const root = document.documentElement;
		if (t === 'auto') {
			root.removeAttribute('data-theme');
			localStorage.removeItem('tsfp-theme');
		} else {
			root.setAttribute('data-theme', t);
			localStorage.setItem('tsfp-theme', t);
		}
	}

	const doneCount = $derived(lessons.filter((l) => courseDone('classic')[l.slug]).length);
</script>

<!-- A2.3: mobile top bar with hamburger (visible only <880px) -->
<div class="mobile-bar">
	<a class="brand mobile-brand" href="{base}/" onclick={closeNav}>
		<span class="brand-py">Py</span><span class="brand-arrow">→</span><span class="brand-ts">TS</span>
	</a>
	<button
		class="hamburger"
		aria-expanded={navOpen}
		aria-controls="primary-nav"
		aria-label={navOpen ? 'Close navigation' : 'Open navigation'}
		onclick={() => (navOpen = !navOpen)}
	>
		{navOpen ? '✕' : '☰'} Menu
	</button>
</div>

<nav class="sidebar" id="primary-nav" class:open={navOpen} aria-label="Primary">
	<div
		class="progress-bar"
		role="progressbar"
		aria-label="Lessons completed"
		aria-valuenow={doneCount}
		aria-valuemin={0}
		aria-valuemax={lessons.length}
		aria-valuetext="{doneCount} of {lessons.length} lessons done"
	>
		<div class="progress-fill" style="width: {(doneCount / lessons.length) * 100}%"></div>
	</div>

	<form class="side-search" onsubmit={submitSearch}>
		<input type="search" placeholder="Search lessons…" bind:value={q} aria-label="Search lessons" />
	</form>

	{#if lastLesson}
		<a class="resume-link" href="{base}/lesson/{lastLesson.slug}" onclick={closeNav}>
			<span class="resume-eyebrow">Continue where you left off</span>
			<span class="resume-title">{lastLesson.title}</span>
		</a>
	{/if}

	<div class="sidebar-group">
		<div class="sidebar-group-label">Tools</div>
		<a href="{base}/playground" class:active={page.url.pathname === `${base}/playground`} onclick={closeNav}>
			<span class="num">▶</span><span class="lbl">Playground</span>
		</a>
		<a
			href="{base}/glossary"
			class:active={page.url.pathname.startsWith(`${base}/glossary`)}
			onclick={closeNav}
		>
			<span class="num">§</span><span class="lbl">Glossary</span>
		</a>
		<a href="{base}/search" class:active={page.url.pathname === `${base}/search`} onclick={closeNav}>
			<span class="num">⌕</span><span class="lbl">Search</span>
		</a>
	</div>

	<div class="sidebar-group">
		<a class="about-link" href="{base}/" class:active={page.url.pathname === `${base}/`} onclick={closeNav}>
			<span class="num">✦</span><span class="lbl">About this course</span>
		</a>
	</div>

	{#each phases as phase}
		<div class="sidebar-group">
			<div class="sidebar-group-label">{phase.label}</div>
			{#each phase.items as l}
				<a
					href="{base}/lesson/{l.slug}"
					class:active={page.url.pathname === `${base}/lesson/${l.slug}`}
					class:done={courseDone('classic')[l.slug]}
					onclick={closeNav}
				>
					<span class="num">{String(l.order).padStart(2, '0')}</span>
					<span class="lbl">{l.title}</span>
				</a>
			{/each}
		</div>
	{/each}

	<div class="theme-toggle" role="group" aria-label="Theme">
		<button aria-pressed={theme === 'auto'} class:active={theme === 'auto'} onclick={() => setTheme('auto')}>Auto</button>
		<button aria-pressed={theme === 'light'} class:active={theme === 'light'} onclick={() => setTheme('light')}>Light</button>
		<button aria-pressed={theme === 'dark'} class:active={theme === 'dark'} onclick={() => setTheme('dark')}>Dark</button>
	</div>

	<div class="footer">
		<p class="muted small">For Python developers learning TypeScript.</p>
	</div>
</nav>
