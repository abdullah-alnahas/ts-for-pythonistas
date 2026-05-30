<script lang="ts">
	import { mount, unmount, tick, onMount, untrack } from 'svelte';
	import { base } from '$app/paths';
	import Playground from '$lib/components/Playground.svelte';
	import Predict from '$lib/components/Predict.svelte';
	import Exercises from '$lib/components/Exercises.svelte';
	import LeetCode from '$lib/components/LeetCode.svelte';
	import Toc from '$lib/components/Toc.svelte';
	import { progress, toggleDone, hydrateProgress, setLastViewed } from '$lib/progress.svelte';

	let { data } = $props();
	hydrateProgress();

	const lesson = $derived(data.lesson);
	const done = $derived(!!progress.done[lesson.slug]);
	const totalLessons = $derived(data.totalLessons);
	const doneCount = $derived(Object.values(progress.done).filter(Boolean).length);

	let article = $state<HTMLElement | null>(null);
	let justCompleted = $state(false);

	// Hideable right-hand TOC rail. When hidden, its column collapses and the
	// freed width goes to the main content. Persisted across lessons.
	const TOC_KEY = 'ts-learn:toc-hidden';
	let tocHidden = $state(false);
	function toggleToc() {
		tocHidden = !tocHidden;
		localStorage.setItem(TOC_KEY, tocHidden ? '1' : '0');
	}

	function markDone() {
		const wasDone = !!progress.done[lesson.slug];
		toggleDone(lesson.slug);
		// A1.8: celebratory beat only when transitioning to done.
		justCompleted = !wasDone;
	}

	// A2.4: reset the completion beat when navigating to a different lesson.
	// Only track lesson.slug; the write is untracked so it never re-triggers
	// this effect (avoids an effect-update loop).
	let lastSeenSlug = '';
	$effect(() => {
		const slug = lesson.slug;
		if (slug !== lastSeenSlug) {
			lastSeenSlug = slug;
			untrack(() => {
				justCompleted = false;
				setLastViewed(slug, 0); // record arrival; scroll updates below
			});
		}
	});

	// Record scroll position for resume (A2.4). Lives outside the reactive
	// graph entirely — pure DOM listener.
	onMount(() => {
		tocHidden = localStorage.getItem(TOC_KEY) === '1';
		let raf = 0;
		function onScroll() {
			cancelAnimationFrame(raf);
			raf = requestAnimationFrame(() => setLastViewed(lesson.slug, window.scrollY));
		}
		window.addEventListener('scroll', onScroll, { passive: true });
		return () => {
			window.removeEventListener('scroll', onScroll);
			cancelAnimationFrame(raf);
		};
	});

	function decode(b64: string): string {
		return decodeURIComponent(atob(b64));
	}

	function escapeHtml(s: string): string {
		return s.replace(/[&<>]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;' })[c] ?? c);
	}

	// Hydrate the interactive directives in the rendered markdown.
	//  - `:::predict` (`.predict-mount`): mounted eagerly — cheap, no TS engine.
	//  - `:::play` / runnable `:::compare` (`.play-mount`): lazy-hydrated when they
	//    scroll near the viewport (IntersectionObserver), and the TS engine is
	//    warmed as a block approaches so the first Run feels instant. Edited code
	//    survives a re-render via a per-block cacheKey (see Playground/editBuffer).
	// Re-runs whenever the lesson (html) changes.
	$effect(() => {
		void data.html; // dependency
		const slug = lesson.slug;
		let mounted: Array<Record<string, unknown>> = [];
		let cancelled = false;
		let observer: IntersectionObserver | null = null;

		function mountPlay(node: HTMLElement, key: string): void {
			if (node.dataset.hydrated === '1') return;
			node.dataset.hydrated = '1';
			const code = decode(node.dataset.code ?? '');
			node.innerHTML = '';
			try {
				mounted.push(
					mount(Playground, { target: node, props: { initialCode: code, cacheKey: key } })
				);
			} catch (e) {
				// A4.2: graceful fallback if the interactive embed fails to mount.
				const msg = e instanceof Error ? e.message : String(e);
				node.innerHTML =
					`<div class="play-error" role="alert">` +
					`<p>This interactive playground failed to load.</p>` +
					`<pre>${escapeHtml(msg)}</pre>` +
					`</div>`;
			}
		}

		tick().then(() => {
			if (cancelled || !article) return;

			// Predict gates: mount eagerly (no heavy deps).
			article.querySelectorAll<HTMLElement>('.predict-mount').forEach((node) => {
				if (node.dataset.hydrated === '1') return;
				node.dataset.hydrated = '1';
				try {
					const payload = JSON.parse(decode(node.dataset.predict ?? '{}'));
					node.innerHTML = '';
					mounted.push(mount(Predict, { target: node, props: payload }));
				} catch {
					// Leave the no-JS quiz fallback already in the placeholder intact.
				}
			});

			// Playgrounds: lazy-hydrate on scroll-into-view, warm the engine early.
			const plays = Array.from(article.querySelectorAll<HTMLElement>('.play-mount'));
			const supportsIO = typeof IntersectionObserver !== 'undefined';
			if (!supportsIO) {
				plays.forEach((node, i) => mountPlay(node, `${slug}:play:${i}`));
				return;
			}
			observer = new IntersectionObserver(
				(entries, obs) => {
					for (const entry of entries) {
						if (!entry.isIntersecting) continue;
						const node = entry.target as HTMLElement;
						// Mount the (cheap) editor on approach; the heavy TS engine is NOT
						// fetched here — it warms only on real interaction (focus/hover of a
						// playground), keeping page load off the esm.sh critical path.
						mountPlay(node, node.dataset.key ?? '');
						obs.unobserve(node);
					}
				},
				{ rootMargin: '400px 0px' } // hydrate just before it enters view
			);
			plays.forEach((node, i) => {
				node.dataset.key = `${slug}:play:${i}`;
				observer?.observe(node);
			});
		});
		return () => {
			cancelled = true;
			observer?.disconnect();
			observer = null;
			mounted.forEach((m) => unmount(m));
			mounted = [];
		};
	});
</script>

<svelte:head>
	<title>{lesson.title} · TS for Pythonistas</title>
	<meta
		name="description"
		content={lesson.subtitle ??
			`Lesson ${lesson.order}: ${lesson.title} — TypeScript for Python developers.`}
	/>
</svelte:head>

<div class="lesson-layout" class:toc-hidden={tocHidden}>
	<div class="page lesson-page">
		<main class="lesson">
			<div class="kicker">Lesson {String(lesson.order).padStart(2, '0')}</div>
			<h1 class="lesson-title">{lesson.title}</h1>
			{#if lesson.subtitle}<p class="lesson-sub">{lesson.subtitle}</p>{/if}

			<!-- Mobile TOC sits inline at the top; the rail copy is sticky on wide screens. -->
			<div class="toc-inline">
				<Toc items={data.toc} container={article} />
			</div>

			<!-- Rendered to HTML at build time in +page.server.ts -->
			<div class="prose" bind:this={article}>{@html data.html}</div>

			<LeetCode slug={lesson.slug} />
			<Exercises slug={lesson.slug} />

			<div class="lesson-foot">
				<button class="btn done-btn" class:active={done} onclick={markDone}>
					{done ? '✓ Marked done' : 'Mark lesson done'}
				</button>

				{#if justCompleted}
					<!-- A1.8: celebratory completion beat -->
					<div class="done-beat" role="status">
						<span class="done-beat-emoji" aria-hidden="true">🎉</span>
						<div>
							<strong>Lesson complete!</strong>
							<span class="done-beat-count">{doneCount} / {totalLessons} done</span>
						</div>
						{#if doneCount >= totalLessons}
							<a class="btn primary done-beat-cta" href="{base}/done">See your finale →</a>
						{:else if data.next}
							<a class="btn primary done-beat-cta" href="{base}/lesson/{data.next.slug}">
								Next: {data.next.title} →
							</a>
						{/if}
					</div>
				{/if}

				<!-- A1.3: bigger, button-like prev/next with explicit labels -->
				<div class="nav-row">
					{#if data.prev}
						<a class="navlink prev" href="{base}/lesson/{data.prev.slug}">
							<span class="navlink-dir">← Previous</span>
							<span class="navlink-title">{data.prev.title}</span>
						</a>
					{:else}
						<span></span>
					{/if}
					{#if data.next}
						<a class="navlink next" href="{base}/lesson/{data.next.slug}">
							<span class="navlink-dir">Next →</span>
							<span class="navlink-title">{data.next.title}</span>
						</a>
					{:else}
						<a class="navlink next finale" href="{base}/done">
							<span class="navlink-dir">Finish →</span>
							<span class="navlink-title">Course complete</span>
						</a>
					{/if}
				</div>
			</div>
		</main>
	</div>

	<aside class="toc-rail" aria-hidden={tocHidden}>
		<button class="toc-toggle" onclick={toggleToc} aria-expanded="true">Hide contents ›</button>
		<Toc items={data.toc} container={article} />
	</aside>

	{#if tocHidden}
		<button class="toc-show-tab" onclick={toggleToc} aria-label="Show contents">‹ Contents</button>
	{/if}
</div>
