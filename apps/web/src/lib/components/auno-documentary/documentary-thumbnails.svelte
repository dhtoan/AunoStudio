<script lang="ts">
	import type { DocumentaryThumbnailPlan } from '$lib/auno/documentary/types';

	let { plans }: { plans: DocumentaryThumbnailPlan[] } = $props();
</script>

<div class="grid gap-3 lg:grid-cols-3">
	{#each plans as plan, index (plan.id)}
		<article class="space-y-3 rounded-xl border bg-card p-4">
			<div>
				<p class="text-xs font-medium uppercase tracking-wide text-muted-foreground">Thumbnail {index + 1}</p>
				<h3 class="mt-1 font-semibold">{plan.headline || plan.hero}</h3>
			</div>
			<p class="text-sm leading-6 text-muted-foreground">{plan.hero}</p>
			{#if plan.textElements.length > 0}
				<div class="flex flex-wrap gap-1.5">
					{#each plan.textElements as text (text)}
						<span class="rounded bg-muted px-2 py-1 text-xs">{text}</span>
					{/each}
				</div>
			{/if}
			<div class="rounded-lg border bg-muted/20 p-3 text-xs leading-5">{plan.prompt}</div>
		</article>
	{/each}
</div>
