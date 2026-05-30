<script lang="ts">
	import Playground from '$lib/components/Playground.svelte';

	const initial = `// Scratch playground — real TypeScript, runs in your browser.
// Type errors and console output both show below. Try breaking it:
type Shape =
  | { kind: "circle"; radius: number }
  | { kind: "rect"; width: number; height: number };

function area(s: Shape): number {
  switch (s.kind) {
    case "circle": return Math.PI * s.radius ** 2;
    case "rect":   return s.width * s.height;
  }
}

console.log(area({ kind: "circle", radius: 2 }));
console.log(area({ kind: "rect", width: 3, height: 4 }));
`;
</script>

<svelte:head>
	<title>Playground · TS for Pythonistas</title>
	<meta
		name="description"
		content="A TypeScript scratchpad running the real compiler in your browser — edit, run, and read type diagnostics live, with no setup."
	/>
</svelte:head>

<div class="page">
	<main class="prose">
		<div class="kicker">Playground</div>
		<h1>TypeScript scratchpad</h1>
		<p class="muted">
			A blank canvas running the real TypeScript compiler client-side. Edit, Run, and read the
			type diagnostics — or open it in the official Playground.
		</p>
		<Playground initialCode={initial} rows={18} />
	</main>
</div>
