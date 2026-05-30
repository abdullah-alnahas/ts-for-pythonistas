<script lang="ts">
	import '$lib/styles/global.css';
	import Sidebar from '$lib/components/Sidebar.svelte';
	import GlossaryPopover from '$lib/components/GlossaryPopover.svelte';
	import { onMount } from 'svelte';

	let { children } = $props();

	// Drag-resizable left sidebar. `--sidebar-w` feeds both the sidebar width and
	// the content's left margin, so shrinking the sidebar widens the main pane.
	const MIN_W = 200;
	const MAX_W = 520;
	const KEY = 'ts-learn:sidebar-w';
	let width = $state(290);
	let dragging = $state(false);

	const clamp = (w: number) => Math.max(MIN_W, Math.min(MAX_W, Math.round(w)));
	function apply(w: number) {
		document.documentElement.style.setProperty('--sidebar-w', `${w}px`);
	}
	function commit(w: number) {
		width = w;
		apply(w);
		localStorage.setItem(KEY, String(w));
	}

	onMount(() => {
		const saved = Number(localStorage.getItem(KEY));
		if (saved && !Number.isNaN(saved)) {
			width = clamp(saved);
			apply(width);
		}
	});

	function onPointerDown(e: PointerEvent) {
		dragging = true;
		(e.target as HTMLElement).setPointerCapture(e.pointerId);
		document.body.style.userSelect = 'none';
		e.preventDefault();
	}
	function onPointerMove(e: PointerEvent) {
		if (!dragging) return;
		width = clamp(e.clientX); // sidebar starts at x=0, so clientX is its width
		apply(width);
	}
	function onPointerUp(e: PointerEvent) {
		if (!dragging) return;
		dragging = false;
		(e.target as HTMLElement).releasePointerCapture?.(e.pointerId);
		document.body.style.userSelect = '';
		localStorage.setItem(KEY, String(width));
	}
	function onKeydown(e: KeyboardEvent) {
		let next = width;
		if (e.key === 'ArrowLeft') next = clamp(width - 16);
		else if (e.key === 'ArrowRight') next = clamp(width + 16);
		else if (e.key === 'Home') next = MIN_W;
		else if (e.key === 'End') next = MAX_W;
		else return;
		e.preventDefault();
		commit(next);
	}
</script>

<a class="skip-link" href="#main-content">Skip to content</a>
<div class="sidebar-wrap">
	<Sidebar />
</div>

<!-- Drag handle straddling the sidebar's right edge (hidden on mobile).
     Modeled as a slider: it has a value (the width), min, max, orientation,
     and arrow-key stepping — a real interactive control, no tabindex hack. -->
<button
	type="button"
	class="sidebar-resize"
	class:dragging
	role="slider"
	aria-orientation="vertical"
	aria-label="Resize sidebar"
	aria-valuenow={width}
	aria-valuemin={MIN_W}
	aria-valuemax={MAX_W}
	onpointerdown={onPointerDown}
	onpointermove={onPointerMove}
	onpointerup={onPointerUp}
	onkeydown={onKeydown}
></button>

<div class="app-shell">
	<div class="content" id="main-content">
		{@render children?.()}
	</div>
</div>

<!-- Single global glossary popover controller (event-delegated). -->
<GlossaryPopover />
