<script lang="ts">
	import { Button } from '$lib/components/ui/button';
	import type { DocumentaryScript } from '$lib/auno/documentary/types';

	let {
		script,
		disabled = false,
		onsave
	}: {
		script: DocumentaryScript;
		disabled?: boolean;
		onsave: (text: string) => void;
	} = $props();

	let draft = $state(script.text);
	$effect(() => {
		if (script.text !== draft) draft = script.text;
	});
</script>

<div class="space-y-3">
	<div class="flex flex-wrap items-center justify-between gap-2">
		<div class="text-xs text-muted-foreground">
			{script.wordCount} words · target {script.targetWordCount}
		</div>
		<Button type="button" size="sm" disabled={disabled || !draft.trim() || draft.trim() === script.text.trim()} onclick={() => onsave(draft.trim())}>
			Save script edits
		</Button>
	</div>
	<textarea
		bind:value={draft}
		rows="18"
		class="w-full resize-y rounded-md border bg-background px-3 py-3 text-sm leading-6"
		disabled={disabled}
		aria-label="Documentary narration script"
	></textarea>
	{#if script.diagnostics.length > 0}
		<div class="rounded-lg border border-amber-500/30 bg-amber-500/5 p-3 text-xs text-amber-800 dark:text-amber-200">
			{#each script.diagnostics as diagnostic (diagnostic)}
				<p>{diagnostic}</p>
			{/each}
		</div>
	{/if}
</div>
