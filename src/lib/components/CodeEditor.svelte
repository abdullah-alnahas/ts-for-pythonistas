<script lang="ts">
	// Minimal dependency-free code editor: a textarea with tab-to-indent and a
	// monospace gutter feel. Good enough for short learning snippets.
	let {
		value = $bindable(''),
		rows = 10,
		readonly = false
	}: { value: string; rows?: number; readonly?: boolean } = $props();

	function onKeydown(e: KeyboardEvent) {
		const ta = e.target as HTMLTextAreaElement;
		if (e.key === 'Tab') {
			e.preventDefault();
			const start = ta.selectionStart;
			const end = ta.selectionEnd;
			value = value.slice(0, start) + '  ' + value.slice(end);
			queueMicrotask(() => (ta.selectionStart = ta.selectionEnd = start + 2));
		}
	}
</script>

<textarea
	class="code-editor"
	aria-label="Code editor"
	spellcheck="false"
	autocapitalize="off"
	autocomplete="off"
	{rows}
	{readonly}
	bind:value
	onkeydown={onKeydown}
></textarea>

<style>
	.code-editor {
		width: 100%;
		font-family: var(--font-mono);
		font-size: 0.85rem;
		line-height: 1.55;
		tab-size: 2;
		padding: 0.85rem 1rem;
		border: 1px solid var(--code-border);
		border-radius: 9px;
		background: var(--code-bg);
		color: var(--fg);
		resize: vertical;
		white-space: pre;
		overflow-wrap: normal;
		overflow-x: auto;
	}
	.code-editor:focus {
		outline: 2px solid var(--accent);
		outline-offset: -1px;
	}
</style>
