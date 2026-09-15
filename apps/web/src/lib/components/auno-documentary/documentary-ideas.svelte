<script lang="ts">
	import { Button } from '$lib/components/ui/button';
	import type { DocumentaryIdea } from '$lib/auno/documentary/types';

	let {
		ideas,
		selectedId,
		disabled = false,
		onselect
	}: {
		ideas: DocumentaryIdea[];
		selectedId?: string;
		disabled?: boolean;
		onselect: (id: string) => void;
	} = $props();
</script>

<div class="grid gap-3 md:grid-cols-2">
	{#each ideas as idea, index (idea.id)}
		<article class="space-y-3 rounded-xl border bg-card p-4 {selectedId === idea.id ? 'ring-2 ring-primary/40' : ''}">
			<div class="flex items-start justify-between gap-3">
				<div class="min-w-0">
					<p class="text-xs font-medium uppercase tracking-wide text-muted-foreground">Idea {index + 1} · {idea.subterritory}</p>
					<h3 class="mt-1 font-semibold leading-snug">{idea.title}</h3>
				</div>
				<Button
					type="button"
					size="sm"
					variant={selectedId === idea.id ? 'default' : 'outline'}
					disabled={disabled}
					onclick={() => onselect(idea.id)}
				>
					{selectedId === idea.id ? 'Selected' : 'Choose'}
				</Button>
			</div>
			<p class="text-sm leading-6 text-muted-foreground">{idea.hook}</p>
			{#if idea.evidenceAnchors.length > 0}
				<div class="flex flex-wrap gap-1.5">
					{#each idea.evidenceAnchors as anchor (anchor)}
						<span class="rounded-full bg-muted px-2 py-1 text-[11px]">{anchor}</span>
					{/each}
				</div>
			{/if}
		</article>
	{/each}
</div>
