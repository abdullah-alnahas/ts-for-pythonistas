<script lang="ts">
	import { page } from '$app/state';
	import { base } from '$app/paths';
	import { goto } from '$app/navigation';
	import { COURSES, getCourseBySlug, getCourseById } from '$lib/courses';
	import { hydrateProgress, courseDone, courseLast } from '$lib/progress.svelte';
	import type { Lesson } from '$lib/parse-course';

	// Derive the active course from the URL — first path segment after base.
	const activeCourse = $derived.by(() => {
		const path = page.url.pathname.slice(base.length).replace(/^\//, '');
		const seg = path.split('/')[0];
		return getCourseBySlug(seg) ?? getCourseById('classic');
	});

	$effect(() => {
		hydrateProgress(activeCourse.id);
	});

	const done = $derived(courseDone(activeCourse.id));
	const lessons = $derived(activeCourse.lessons);

	// Helpers for lesson and home links — course-prefixed for AK courses.
	const lessonHref = (slug: string) =>
		activeCourse.id === 'classic'
			? `${base}/lesson/${slug}`
			: `${base}/${activeCourse.routeSlug}/lesson/${slug}`;

	const homeHref = $derived(
		activeCourse.id === 'classic' ? `${base}/` : `${base}/${activeCourse.routeSlug}`
	);

	let q = $state('');
	function submitSearch(e: SubmitEvent) {
		e.preventDefault();
		const courseParam =
			activeCourse.id !== 'classic' ? `&course=${activeCourse.routeSlug}` : '';
		goto(
			`${base}/search${q.trim() ? `?q=${encodeURIComponent(q.trim())}${courseParam}` : courseParam ? `?${courseParam.slice(1)}` : ''}`
		);
	}

	const courseList = $derived(
		COURSES.map((c) => ({
			id: c.id,
			title: c.title,
			href: c.routeSlug === '' ? `${base}/` : `${base}/${c.routeSlug}`,
			active: c.id === activeCourse.id
		}))
	);

	const phases = $derived(
		activeCourse.phases
			.map((p) => ({
				label: p.label,
				items: lessons.filter((l) => l.order >= p.range[0] && l.order <= p.range[1])
			}))
			.filter((p) => p.items.length > 0)
	);

	// A2.3: mobile drawer open/close (only affects <880px via CSS).
	let navOpen = $state(false);
	function closeNav() {
		navOpen = false;
	}

	// A2.4: resume affordance — last viewed lesson.
	const lastLesson = $derived<Lesson | undefined>(
		courseLast(activeCourse.id)
			? lessons.find((l) => l.slug === courseLast(activeCourse.id)?.slug)
			: undefined
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

	const doneCount = $derived(lessons.filter((l) => done[l.slug]).length);
</script>

<!-- A2.3: mobile top bar with hamburger (visible only <880px) -->
<div class="mobile-bar">
	<a class="brand mobile-brand" href={homeHref} onclick={closeNav}>
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

	<nav class="course-switch" aria-label="Choose a course">
		<span class="course-switch-label">Course</span>
		{#each courseList as c}
			<a
				class="course-switch-link"
				class:active={c.active}
				aria-current={c.active ? 'page' : undefined}
				href={c.href}
				onclick={() => {
					try {
						localStorage.setItem('ts-learn:course', c.id);
					} catch {
						/* ignore */
					}
				}}>{c.title}</a
			>
		{/each}
	</nav>

	<form class="side-search" onsubmit={submitSearch}>
		<input type="search" placeholder="Search lessons…" bind:value={q} aria-label="Search lessons" />
	</form>

	{#if lastLesson}
		<a class="resume-link" href={lessonHref(lastLesson.slug)} onclick={closeNav}>
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
		<a class="about-link" href={homeHref} class:active={page.url.pathname === homeHref} onclick={closeNav}>
			<span class="num">✦</span><span class="lbl">About this course</span>
		</a>
	</div>

	{#each phases as phase}
		<div class="sidebar-group">
			<div class="sidebar-group-label">{phase.label}</div>
			{#each phase.items as l}
				<a
					href={lessonHref(l.slug)}
					class:active={page.url.pathname === lessonHref(l.slug)}
					class:done={done[l.slug]}
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

<style>
	.course-switch {
		display: flex;
		flex-wrap: wrap;
		gap: 0.3rem;
		align-items: center;
		margin: 0.25rem 0 0.75rem;
	}
	.course-switch-label {
		width: 100%;
		font-size: 0.7rem;
		text-transform: uppercase;
		letter-spacing: 0.05em;
		opacity: 0.6;
	}
	.course-switch-link {
		font-size: 0.78rem;
		line-height: 1.1;
		padding: 0.25rem 0.5rem;
		border: 1px solid var(--border, #d0d7de);
		border-radius: 999px;
		text-decoration: none;
		color: inherit;
		opacity: 0.8;
	}
	.course-switch-link:hover {
		opacity: 1;
	}
	.course-switch-link.active {
		border-color: var(--accent, #0969da);
		color: var(--accent, #0969da);
		opacity: 1;
		font-weight: 600;
	}
</style>
