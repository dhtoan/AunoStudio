<script lang="ts">
	import { Button } from '$lib/components/ui/button';
	import type { DocumentaryVisualPlan } from '$lib/auno/documentary/types';

	let { plans }: { plans: DocumentaryVisualPlan[] } = $props();
	let copied = $state(false);

	const promptPack = $derived(
		plans
			.map((plan) => plan.prompt.trim())
			.filter(Boolean)
			.join('\n\n')
	);

	async function copyPack(): Promise<void> {
		if (!promptPack) return;
		await navigator.clipboard.writeText(promptPack);
		copied = true;
		window.setTimeout(() => (copied = false), 1500);
	}

	function downloadPack(): void {
		if (!promptPack) return;
		const blob = new Blob([promptPack], { type: 'text/plain;charset=utf-8' });
		const url = URL.createObjectURL(blob);
		const anchor = document.createElement('a');
		anchor.href = url;
		anchor.download = 'auno-documentary-visual-prompts.txt';
		anchor.click();
		URL.revokeObjectURL(url);
	}
</script>

<div class="space-y-3">
	<div class="flex flex-wrap items-center justify-between gap-2">
		<div>
			<h3 class="font-semibold">Visual Prompt Pack</h3>
			<p class="text-xs text-muted-foreground">{plans.length} independent beat prompts. Each block can be sent to an external batch image generator.</p>
		</div>
		<div class="flex gap-2">
			<Button type="button" size="sm" variant="outline" disabled={!promptPack} onclick={copyPack}>
				{copied ? 'Copied' : 'Copy all'}
			</Button>
			<Button type="button" size="sm" variant="outline" disabled={!promptPack} onclick={downloadPack}>Download .txt</Button>
		</div>
	</div>
	<div class="max-h-[34rem] space-y-3 overflow-y-auto pr-1">
		{#each plans as plan, index (plan.beatId)}
			<article class="rounded-lg border bg-muted/20 p-3">
				<div class="mb-2 flex items-center justify-between gap-2 text-xs text-muted-foreground">
					<span>Beat {index + 1} · {plan.visualIntent}</span>
					{#if plan.label}<span class="rounded bg-background px-1.5 py-0.5">{plan.label}</span>{/if}
				</div>
				<p class="text-sm leading-6">{plan.prompt}</p>
			</article>
		{/each}
	</div>
</div>
