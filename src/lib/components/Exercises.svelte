<script lang="ts">
	import ExerciseCard from './ExerciseCard.svelte';
	import { exercisesFor } from '$lib/exercises';

	let { slug }: { slug: string } = $props();
	const list = $derived(exercisesFor(slug));
</script>

{#if list.length > 0}
	<h2 class="ex-heading">Exercises</h2>
	<p class="muted small">
		Edit the code, then <strong>Run tests</strong>. They execute in your browser against the real
		TypeScript compiler — type errors and test failures both show up.
	</p>
	{#each list as ex (ex.id)}
		<ExerciseCard exercise={ex} />
	{/each}
{/if}

<style>
	.ex-heading {
		margin-top: 2.6rem;
	}
</style>
