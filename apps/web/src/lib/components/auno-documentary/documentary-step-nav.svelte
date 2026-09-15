<script lang="ts">
	import { Button } from '$lib/components/ui/button';
	import type { DocumentaryRun, DocumentaryStep } from '$lib/auno/documentary/types';
	import {
		DOCUMENTARY_STEP_ORDER,
		documentaryStepEnabled
	} from '$lib/auno/documentary/state';
	import { documentaryStepState } from '$lib/auno/documentary/wizard-model';

	let {
		run,
		activeStep,
		onselect
	}: {
		run: DocumentaryRun;
		activeStep: DocumentaryStep;
		onselect: (step: DocumentaryStep) => void;
	} = $props();

	const labels: Record<DocumentaryStep, string> = {
		source: 'Source',
		topic: 'Topic',
		ideas: '10 Ideas',
		duration: 'Duration',
		script: 'Script',
		voice: 'Voice',
		beats: 'Beats',
		visuals: 'Visuals',
		animation: 'Animation',
		thumbnails: 'Thumbnails',
		project: 'Project'
	};
</script>

<nav class="flex gap-2 overflow-x-auto pb-1" aria-label="Documentary workflow steps">
	{#each DOCUMENTARY_STEP_ORDER as step (step)}
		{@const state = documentaryStepState(run, step)}
		{@const selectable = documentaryStepEnabled(run, step) || state.hasOutput || step === 'source' || step === 'topic'}
		<Button
			type="button"
			size="sm"
			variant={activeStep === step ? 'default' : 'outline'}
			class="shrink-0 gap-1.5"
			disabled={!selectable}
			onclick={() => onselect(step)}
		>
			<span>{labels[step]}</span>
			{#if state.status === 'stale'}
				<span class="rounded-full bg-amber-500/15 px-1.5 py-0.5 text-[10px] text-amber-700 dark:text-amber-300">stale</span>
			{:else if state.status === 'ready'}
				<span class="text-[10px] opacity-70">✓</span>
			{/if}
		</Button>
	{/each}
</nav>
