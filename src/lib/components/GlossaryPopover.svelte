<script lang="ts">
	// Global, single-instance glossary popover controller.
	//
	// Mounted once in the root layout. Uses event delegation on `.gloss-term`
	// triggers rendered by render.ts, so it works for every lesson/glossary page
	// without per-term component instances — which also makes "one popover at a
	// time" trivial.
	//
	// Accessibility model (UX spec 03):
	//  - Triggers are real <a> in tab order (rendered server-side); focusing one
	//    opens the preview, Esc closes, Enter/click navigates to the full page.
	//  - Hover opens after a short delay; closes after a grace period so the
	//    pointer can travel into the (hoverable) popover — the "diagonal problem".
	//  - aria-describedby wires the focused trigger to the popover for AT.
	//  - Touch devices get a bottom sheet (no hover-only, no double-tap hack).
	//  - Dismisses on Esc, scroll, route change, click-outside, pointer-leave.
	//  - prefers-reduced-motion disables the open/close transition.
	import { onMount, tick } from 'svelte';
	import { page } from '$app/state';
	import { base } from '$app/paths';

	const OPEN_DELAY = 120; // ms — avoid flicker on pass-through
	const CLOSE_GRACE = 220; // ms — let pointer reach the popover

	let open = $state(false);
	let title = $state('');
	let short = $state('');
	let slug = $state('');
	let style = $state(''); // absolute positioning for desktop side-note
	let isTouch = $state(false);
	let connector = $state<{ x: number; y: number } | null>(null);

	let popoverEl = $state<HTMLElement | null>(null);
	let currentTrigger: HTMLAnchorElement | null = null;
	let openTimer: ReturnType<typeof setTimeout> | null = null;
	let closeTimer: ReturnType<typeof setTimeout> | null = null;
	let pointerInPopover = false;
	const POP_ID = 'gloss-popover';

	function clearTimers() {
		if (openTimer) {
			clearTimeout(openTimer);
			openTimer = null;
		}
		if (closeTimer) {
			clearTimeout(closeTimer);
			closeTimer = null;
		}
	}

	function readTrigger(el: HTMLAnchorElement) {
		title = el.textContent?.trim() ?? '';
		short = el.dataset.glossShort ?? '';
		slug = el.dataset.gloss ?? '';
	}

	async function show(trigger: HTMLAnchorElement) {
		clearTimers();
		// Close any previously open popover on a different trigger first.
		if (currentTrigger && currentTrigger !== trigger) {
			currentTrigger.removeAttribute('aria-describedby');
		}
		currentTrigger = trigger;
		readTrigger(trigger);
		if (!slug || !short) return; // nothing to preview
		trigger.setAttribute('aria-describedby', POP_ID);
		open = true;
		await tick();
		if (isTouch) {
			connector = null;
			style = '';
		} else {
			position(trigger);
		}
	}

	function position(trigger: HTMLAnchorElement) {
		if (!popoverEl) return;
		const r = trigger.getBoundingClientRect();
		const pop = popoverEl.getBoundingClientRect();
		const margin = 8;
		const vw = window.innerWidth;
		const vh = window.innerHeight;

		// Prefer placing to the right of the term (uses the measure's whitespace);
		// fall back to left, then clamp. Never cover the term itself.
		let left = r.right + margin;
		if (left + pop.width > vw - margin) {
			// not enough room right — try left of the term
			const leftAlt = r.left - margin - pop.width;
			left = leftAlt >= margin ? leftAlt : Math.max(margin, vw - margin - pop.width);
		}
		// Vertically align near the term, clamp into viewport.
		let top = r.top;
		if (top + pop.height > vh - margin) top = Math.max(margin, vh - margin - pop.height);
		if (top < margin) top = margin;

		style = `position: fixed; left: ${Math.round(left)}px; top: ${Math.round(top)}px;`;
		// Connector dot near the term's vertical center, on the popover-facing edge.
		const onRight = left >= r.right;
		connector = {
			x: onRight ? r.right : r.left,
			y: Math.min(Math.max(r.top + r.height / 2, top + 12), top + pop.height - 12)
		};
	}

	function scheduleOpen(trigger: HTMLAnchorElement) {
		clearTimers();
		openTimer = setTimeout(() => show(trigger), OPEN_DELAY);
	}

	function scheduleClose() {
		clearTimers();
		closeTimer = setTimeout(() => {
			if (!pointerInPopover) close();
		}, CLOSE_GRACE);
	}

	function close() {
		clearTimers();
		open = false;
		connector = null;
		if (currentTrigger) {
			currentTrigger.removeAttribute('aria-describedby');
		}
		currentTrigger = null;
	}

	onMount(() => {
		isTouch = window.matchMedia('(hover: none), (pointer: coarse)').matches;

		function triggerFrom(target: EventTarget | null): HTMLAnchorElement | null {
			if (!(target instanceof Element)) return null;
			const el = target.closest('.gloss-term');
			return el instanceof HTMLAnchorElement ? el : null;
		}

		// --- pointer (hover) ---
		function onOver(e: PointerEvent) {
			if (isTouch) return;
			const t = triggerFrom(e.target);
			if (t) scheduleOpen(t);
		}
		function onOut(e: PointerEvent) {
			if (isTouch) return;
			const t = triggerFrom(e.target);
			if (t) scheduleClose();
		}

		// --- keyboard focus ---
		function onFocusIn(e: FocusEvent) {
			const t = triggerFrom(e.target);
			if (t) show(t);
		}
		function onFocusOut(e: FocusEvent) {
			const t = triggerFrom(e.target);
			// If focus moves into the popover, keep it open.
			if (t && !(e.relatedTarget instanceof Node && popoverEl?.contains(e.relatedTarget))) {
				scheduleClose();
			}
		}

		// --- touch: first tap opens preview, doesn't navigate ---
		function onClick(e: MouseEvent) {
			const t = triggerFrom(e.target);
			if (!t) return;
			if (isTouch) {
				// First tap on a not-yet-open term: open sheet, suppress navigation.
				if (!(open && currentTrigger === t)) {
					e.preventDefault();
					show(t);
				}
				// If already open for this term, let the click navigate (it's a real <a>).
			}
			// Desktop: real <a>, click navigates normally.
		}

		function onKeydown(e: KeyboardEvent) {
			if (e.key === 'Escape' && open) {
				const tr = currentTrigger;
				close();
				tr?.focus();
			}
		}

		function onScroll() {
			if (open) close();
		}
		function onDocPointerDown(e: PointerEvent) {
			if (!open) return;
			const t = e.target;
			if (
				t instanceof Node &&
				!popoverEl?.contains(t) &&
				!(t instanceof Element && t.closest('.gloss-term'))
			) {
				close();
			}
		}

		document.addEventListener('pointerover', onOver, true);
		document.addEventListener('pointerout', onOut, true);
		document.addEventListener('focusin', onFocusIn);
		document.addEventListener('focusout', onFocusOut);
		document.addEventListener('click', onClick, true);
		document.addEventListener('keydown', onKeydown);
		window.addEventListener('scroll', onScroll, true);
		document.addEventListener('pointerdown', onDocPointerDown, true);

		return () => {
			document.removeEventListener('pointerover', onOver, true);
			document.removeEventListener('pointerout', onOut, true);
			document.removeEventListener('focusin', onFocusIn);
			document.removeEventListener('focusout', onFocusOut);
			document.removeEventListener('click', onClick, true);
			document.removeEventListener('keydown', onKeydown);
			window.removeEventListener('scroll', onScroll, true);
			document.removeEventListener('pointerdown', onDocPointerDown, true);
			clearTimers();
		};
	});

	// Dismiss on route change.
	let lastPath = $state(page.url.pathname);
	$effect(() => {
		if (page.url.pathname !== lastPath) {
			lastPath = page.url.pathname;
			close();
		}
	});

	function onPopEnter() {
		pointerInPopover = true;
		clearTimers();
	}
	function onPopLeave() {
		pointerInPopover = false;
		scheduleClose();
	}
</script>

{#if open}
	{#if isTouch}
		<!-- Touch: bottom sheet. Backdrop click dismisses. -->
		<div
			class="gloss-sheet-backdrop"
			role="presentation"
			onclick={close}
			onkeydown={() => {}}
		></div>
		<div
			id={POP_ID}
			class="gloss-sheet"
			bind:this={popoverEl}
			role="dialog"
			aria-modal="false"
			aria-label="Glossary preview: {title}"
		>
			<div class="gloss-pop-head">{title}</div>
			<p class="gloss-pop-body">{short}</p>
			<a class="gloss-readfull btn primary sm" href="{base}/glossary/{slug}">Read full →</a>
		</div>
	{:else}
		{#if connector}
			<span
				class="gloss-connector"
				aria-hidden="true"
				style="position: fixed; left: {connector.x}px; top: {connector.y}px;"
			></span>
		{/if}
		<div
			id={POP_ID}
			class="gloss-pop"
			bind:this={popoverEl}
			role="tooltip"
			{style}
			onpointerenter={onPopEnter}
			onpointerleave={onPopLeave}
		>
			<div class="gloss-pop-head">{title}</div>
			<p class="gloss-pop-body">{short}</p>
			<a class="gloss-readfull" href="{base}/glossary/{slug}" tabindex="-1">Read full →</a>
		</div>
	{/if}
{/if}

<style>
	.gloss-pop {
		z-index: 1000;
		width: min(320px, calc(100vw - 24px));
		background: var(--bg-elev);
		border: 1px solid var(--border);
		border-radius: 12px;
		box-shadow: 0 8px 28px rgba(0, 0, 0, 0.18);
		padding: 0.7rem 0.85rem;
		font-size: 0.9rem;
		line-height: 1.5;
		animation: gloss-in 0.12s ease-out;
	}
	.gloss-connector {
		z-index: 1000;
		width: 8px;
		height: 8px;
		margin: -4px 0 0 -4px;
		border-radius: 50%;
		background: var(--accent);
		box-shadow: 0 0 0 3px color-mix(in srgb, var(--accent) 25%, transparent);
	}
	.gloss-pop-head {
		font-weight: 650;
		margin-bottom: 0.25rem;
		color: var(--fg);
	}
	.gloss-pop-body {
		margin: 0 0 0.5rem;
		color: var(--fg-muted);
	}
	.gloss-readfull {
		font-size: 0.85rem;
		font-weight: 600;
		color: var(--accent);
	}

	/* Touch bottom sheet */
	.gloss-sheet-backdrop {
		position: fixed;
		inset: 0;
		z-index: 999;
		background: rgba(0, 0, 0, 0.32);
	}
	.gloss-sheet {
		position: fixed;
		left: 0;
		right: 0;
		bottom: 0;
		z-index: 1000;
		background: var(--bg-elev);
		border-top: 1px solid var(--border);
		border-radius: 16px 16px 0 0;
		box-shadow: 0 -6px 28px rgba(0, 0, 0, 0.22);
		padding: 1.1rem 1.2rem calc(1.2rem + env(safe-area-inset-bottom, 0px));
		animation: gloss-up 0.18s ease-out;
	}
	.gloss-sheet .gloss-pop-head {
		font-size: 1.05rem;
	}
	.gloss-sheet .gloss-pop-body {
		font-size: 0.95rem;
		margin-bottom: 0.9rem;
	}
	.gloss-readfull.btn {
		display: inline-block;
		min-height: 44px;
		line-height: 1.6;
	}

	@keyframes gloss-in {
		from {
			opacity: 0;
			transform: translateY(2px);
		}
		to {
			opacity: 1;
			transform: none;
		}
	}
	@keyframes gloss-up {
		from {
			transform: translateY(100%);
		}
		to {
			transform: none;
		}
	}
	@media (prefers-reduced-motion: reduce) {
		.gloss-pop,
		.gloss-sheet {
			animation: none;
		}
	}
</style>
