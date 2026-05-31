<script lang="ts">
	import '$lib/styles/global.css';
	import Sidebar from '$lib/components/Sidebar.svelte';
	import GlossaryPopover from '$lib/components/GlossaryPopover.svelte';
	import { onMount } from 'svelte';

	// ---------- left sidebar: drag-resizable width + hideable (desktop) ----------
	// The reading card is centered in the viewport and the sidebar overlays the
	// left gutter, so changing the sidebar width or hiding it never moves the text.
	let { children } = $props();

	const MIN_W = 200;
	const MAX_W = 460;
	const KEY = 'ts-learn:sidebar-w';
	const COLLAPSE_KEY = 'ts-learn:sidebar-collapsed';
	let width = $state(280);
	let dragging = $state(false);
	let collapsed = $state(false);

	const clamp = (w: number) => Math.max(MIN_W, Math.min(MAX_W, Math.round(w)));
	function applyWidth(w: number) {
		document.documentElement.style.setProperty('--sidebar-w', `${w}px`);
	}
	function applyCollapsed(c: boolean) {
		document.documentElement.classList.toggle('sidebar-collapsed', c);
	}
	function commitWidth(w: number) {
		width = w;
		applyWidth(w);
		localStorage.setItem(KEY, String(w));
	}
	function toggleSidebar() {
		collapsed = !collapsed;
		applyCollapsed(collapsed);
		localStorage.setItem(COLLAPSE_KEY, collapsed ? '1' : '0');
	}

	// ---------- reading card: symmetric drag-resize around the centre ----------
	const READ_MIN = 540;
	const READ_MAX = 1040;
	const READ_KEY = 'ts-learn:read-w';
	let readW = $state(760);
	let readDragging = $state(false);

	const clampR = (w: number) => Math.max(READ_MIN, Math.min(READ_MAX, Math.round(w)));
	function applyRead(w: number) {
		document.documentElement.style.setProperty('--read-w', `${w}px`);
	}
	function commitRead(w: number) {
		readW = w;
		applyRead(w);
		localStorage.setItem(READ_KEY, String(w));
	}

	onMount(() => {
		const saved = Number(localStorage.getItem(KEY));
		if (saved && !Number.isNaN(saved)) {
			width = clamp(saved);
			applyWidth(width);
		}
		collapsed = localStorage.getItem(COLLAPSE_KEY) === '1';
		applyCollapsed(collapsed);
		const savedR = Number(localStorage.getItem(READ_KEY));
		if (savedR && !Number.isNaN(savedR)) {
			readW = clampR(savedR);
			applyRead(readW);
		}
	});

	// --- sidebar width drag ---
	function onPointerDown(e: PointerEvent) {
		dragging = true;
		(e.target as HTMLElement).setPointerCapture(e.pointerId);
		document.body.style.userSelect = 'none';
		e.preventDefault();
	}
	function onPointerMove(e: PointerEvent) {
		if (!dragging) return;
		width = clamp(e.clientX); // sidebar starts at x=0, so clientX is its width
		applyWidth(width);
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
		commitWidth(next);
	}

	// --- reading-card symmetric drag (either grip; width = 2× distance from centre) ---
	function readDown(e: PointerEvent) {
		readDragging = true;
		(e.target as HTMLElement).setPointerCapture(e.pointerId);
		document.body.style.userSelect = 'none';
		e.preventDefault();
	}
	function readMove(e: PointerEvent) {
		if (!readDragging) return;
		const half = Math.abs(e.clientX - window.innerWidth / 2);
		readW = clampR(half * 2);
		applyRead(readW);
	}
	function readUp(e: PointerEvent) {
		if (!readDragging) return;
		readDragging = false;
		(e.target as HTMLElement).releasePointerCapture?.(e.pointerId);
		document.body.style.userSelect = '';
		localStorage.setItem(READ_KEY, String(readW));
	}
	function readKeydown(e: KeyboardEvent) {
		let next = readW;
		if (e.key === 'ArrowLeft') next = clampR(readW - 24);
		else if (e.key === 'ArrowRight') next = clampR(readW + 24);
		else if (e.key === 'Home') next = READ_MIN;
		else if (e.key === 'End') next = READ_MAX;
		else return;
		e.preventDefault();
		commitRead(next);
	}
</script>

<a class="skip-link" href="#main-content">Skip to content</a>

<div class="sidebar-wrap">
	<Sidebar />
</div>

<!-- Desktop sidebar hide/show. Hidden on mobile (the hamburger owns it there). -->
{#if collapsed}
	<button type="button" class="sidebar-toggle show" onclick={toggleSidebar} aria-label="Show sidebar"
		>☰ Menu</button
	>
{:else}
	<button type="button" class="sidebar-toggle hide" onclick={toggleSidebar} aria-label="Hide sidebar"
		>‹</button
	>
{/if}

<!-- Drag handle straddling the sidebar's right edge: a real slider control. -->
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

<!-- Reading-width grips: one at each edge of the centred card. Dragging either
     resizes the card symmetrically around the viewport centre, so it stays put. -->
<button
	type="button"
	class="read-resize left"
	class:dragging={readDragging}
	role="slider"
	aria-orientation="vertical"
	aria-label="Resize reading width"
	aria-valuenow={readW}
	aria-valuemin={READ_MIN}
	aria-valuemax={READ_MAX}
	onpointerdown={readDown}
	onpointermove={readMove}
	onpointerup={readUp}
	onkeydown={readKeydown}
></button>
<button
	type="button"
	class="read-resize right"
	class:dragging={readDragging}
	role="slider"
	aria-orientation="vertical"
	aria-label="Resize reading width"
	aria-valuenow={readW}
	aria-valuemin={READ_MIN}
	aria-valuemax={READ_MAX}
	onpointerdown={readDown}
	onpointermove={readMove}
	onpointerup={readUp}
	onkeydown={readKeydown}
></button>

<!-- Single global glossary popover controller (event-delegated). -->
<GlossaryPopover />
