<script lang="ts">
	import { Button } from '$lib/components/ui/button';
	import {
		DOCUMENTARY_VISUAL_INTENTS,
		type DocumentaryBeat,
		type DocumentaryVisualPlan
	} from '$lib/auno/documentary/types';
	import {
		mergeDocumentaryBeatWithNext,
		splitDocumentaryBeat,
		updateDocumentaryBeat,
		visibleBeatWindow
	} from '$lib/auno/documentary/beat-window';

	let {
		beats,
		visualPlans = [],
		disabled = false,
		onchange,
		onvisualchange,
		onregeneratevisual
	}: {
		beats: DocumentaryBeat[];
		visualPlans?: DocumentaryVisualPlan[];
		disabled?: boolean;
		onchange: (beats: DocumentaryBeat[]) => void;
		onvisualchange?: (plans: DocumentaryVisualPlan[]) => void;
		onregeneratevisual?: (beatId: string) => void;
	} = $props();

	const ROW_HEIGHT = 156;
	let anchor = $state(0);
	const windowRange = $derived(visibleBeatWindow(beats.length, anchor, 18));
	const visibleBeats = $derived(beats.slice(windowRange.start, windowRange.end));
	const visualByBeat = $derived(new Map(visualPlans.map((plan) => [plan.beatId, plan])));

	function onscroll(event: Event): void {
		const target = event.currentTarget as HTMLDivElement;
		anchor = Math.max(0, Math.min(beats.length - 1, Math.floor(target.scrollTop / ROW_HEIGHT)));
	}

	function saveNarration(beat: DocumentaryBeat, value: string): void {
		const narration = value.trim();
		if (!narration || narration === beat.narration) return;
		onchange(
			updateDocumentaryBeat(beats, beat.id, {
				narration,
				coreIdea: beat.coreIdea || narration
			})
		);
	}

	function saveIntent(beat: DocumentaryBeat, value: DocumentaryBeat['visualIntent']): void {
		if (value === beat.visualIntent) return;
		onchange(updateDocumentaryBeat(beats, beat.id, { visualIntent: value }));
	}

	function saveMediaId(beatId: string, value: string): void {
		if (!onvisualchange) return;
		const next = visualPlans.map((plan) =>
			plan.beatId === beatId ? { ...plan, mediaId: value.trim() || undefined } : { ...plan }
		);
		onvisualchange(next);
	}
</script>

<div class="space-y-3">
	<div class="flex flex-wrap items-center justify-between gap-2 text-xs text-muted-foreground">
		<span>{beats.length} beats · rendering {windowRange.start + 1}–{windowRange.end}</span>
		<span>Only a bounded edit window stays mounted for long projects.</span>
	</div>
	<div class="max-h-[42rem] overflow-y-auto rounded-lg border bg-muted/10" onscroll={onscroll}>
		<div aria-hidden="true" style={`height:${windowRange.start * ROW_HEIGHT}px`}></div>
		<div class="space-y-2 p-2">
			{#each visibleBeats as beat (beat.id)}
				{@const visual = visualByBeat.get(beat.id)}
				<article class="space-y-2 rounded-lg border bg-card p-3">
					<div class="flex flex-wrap items-center justify-between gap-2">
						<div class="text-xs text-muted-foreground">
							Beat {beat.index + 1} · {beat.startSeconds.toFixed(1)}–{(beat.startSeconds + beat.durationSeconds).toFixed(1)}s
						</div>
						<div class="flex gap-1">
							<Button type="button" size="sm" variant="ghost" disabled={disabled} onclick={() => onchange(splitDocumentaryBeat(beats, beat.id))}>Split</Button>
							<Button type="button" size="sm" variant="ghost" disabled={disabled || beat.index >= beats.length - 1} onclick={() => onchange(mergeDocumentaryBeatWithNext(beats, beat.id))}>Merge next</Button>
							{#if onregeneratevisual && visual}
								<Button type="button" size="sm" variant="ghost" disabled={disabled} onclick={() => onregeneratevisual?.(beat.id)}>Regenerate visual</Button>
							{/if}
						</div>
					</div>
					<textarea
						value={beat.narration}
						rows="2"
						class="w-full resize-y rounded-md border bg-background px-3 py-2 text-sm"
						disabled={disabled}
						onchange={(event) => saveNarration(beat, event.currentTarget.value)}
					></textarea>
					<div class="grid gap-2 sm:grid-cols-2">
						<select
							value={beat.visualIntent}
							disabled={disabled}
							class="h-9 rounded-md border bg-background px-2 text-xs"
							onchange={(event) => saveIntent(beat, event.currentTarget.value as DocumentaryBeat['visualIntent'])}
						>
							{#each DOCUMENTARY_VISUAL_INTENTS as intent (intent)}<option value={intent}>{intent}</option>{/each}
						</select>
						{#if visual && onvisualchange}
							<input
								value={visual.mediaId ?? ''}
								disabled={disabled}
								class="h-9 rounded-md border bg-background px-2 text-xs"
								placeholder="Optional Media Library ID"
								onchange={(event) => saveMediaId(beat.id, event.currentTarget.value)}
							/>
						{/if}
					</div>
				</article>
			{/each}
		</div>
		<div aria-hidden="true" style={`height:${Math.max(0, beats.length - windowRange.end) * ROW_HEIGHT}px`}></div>
	</div>
</div>
