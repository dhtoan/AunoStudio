<script lang="ts">
	import type { MotionStyleCustomization, MotionTransitionKind } from '@auno/motion';

	let {
		customization = $bindable({})
	}: {
		customization?: MotionStyleCustomization;
	} = $props();

	const transitions: Array<{ id: MotionTransitionKind; label: string }> = [
		{ id: 'crossfade', label: 'Crossfade' },
		{ id: 'depth-push', label: 'Depth push' },
		{ id: 'match-movement', label: 'Match movement' },
		{ id: 'hard-cut', label: 'Hard cut' },
		{ id: 'slide', label: 'Slide' }
	];

	function paletteValue(index: number, fallback: string): string {
		return customization.palette?.[index] ?? fallback;
	}

	function setPalette(index: number, value: string): void {
		const palette = [
			paletteValue(0, '#F3E8D8'),
			paletteValue(1, '#191919'),
			paletteValue(2, '#B8895A')
		];
		palette[index] = value.toUpperCase();
		customization = { ...customization, palette };
	}

	function toggleTransition(id: MotionTransitionKind, checked: boolean): void {
		const current = customization.transitionLanguage ?? [];
		const transitionLanguage = checked
			? [...new Set([...current, id])]
			: current.filter((entry) => entry !== id);
		customization = {
			...customization,
			transitionLanguage: transitionLanguage.length ? transitionLanguage : undefined
		};
	}

	function reset(): void {
		customization = {};
	}
</script>

<details class="rounded-lg border bg-muted/20 p-3">
	<summary class="cursor-pointer text-xs font-medium">Advanced · Customize Style</summary>
	<div class="mt-3 space-y-4">
		<label class="block space-y-1.5 text-xs font-medium">
			<span class="flex items-center justify-between gap-3">
				<span>Motion intensity</span>
				<span class="font-normal text-muted-foreground">
					{Math.round((customization.motionIntensity ?? 0.7) * 100)}%
				</span>
			</span>
			<input
				type="range"
				min="0"
				max="1"
				step="0.05"
				value={customization.motionIntensity ?? 0.7}
				class="w-full"
				oninput={(event) =>
					(customization = {
						...customization,
						motionIntensity: Number(event.currentTarget.value)
					})}
			/>
		</label>

		<div class="space-y-1.5">
			<p class="text-xs font-medium">Palette</p>
			<div class="grid grid-cols-3 gap-2">
				{#each [0, 1, 2] as index}
					<label class="flex items-center gap-2 rounded-md border bg-background px-2 py-1.5">
						<input
							type="color"
							value={paletteValue(index, ['#F3E8D8', '#191919', '#B8895A'][index]!)}
							oninput={(event) => setPalette(index, event.currentTarget.value)}
							class="h-6 w-7 border-0 bg-transparent p-0"
						/>
						<span class="truncate text-[10px] text-muted-foreground">
							{paletteValue(index, ['#F3E8D8', '#191919', '#B8895A'][index]!)}
						</span>
					</label>
				{/each}
			</div>
		</div>

		<div class="grid gap-3 sm:grid-cols-2">
			<label class="space-y-1.5 text-xs font-medium">
				<span>Camera language</span>
				<input
					value={customization.cameraLanguage ?? ''}
					placeholder="Use preset default"
					class="h-9 w-full rounded-md border bg-background px-3 text-xs"
					onchange={(event) =>
						(customization = {
							...customization,
							cameraLanguage: event.currentTarget.value.trim() || undefined
						})}
				/>
			</label>
			<label class="space-y-1.5 text-xs font-medium">
				<span>Background family</span>
				<input
					value={customization.backgroundLanguage ?? ''}
					placeholder="Use preset default"
					class="h-9 w-full rounded-md border bg-background px-3 text-xs"
					onchange={(event) =>
						(customization = {
							...customization,
							backgroundLanguage: event.currentTarget.value.trim() || undefined
						})}
				/>
			</label>
		</div>

		<div class="space-y-2">
			<p class="text-xs font-medium">Transition families</p>
			<div class="flex flex-wrap gap-2">
				{#each transitions as transition (transition.id)}
					<label class="inline-flex items-center gap-1.5 rounded-md border bg-background px-2 py-1.5 text-[11px]">
						<input
							type="checkbox"
							checked={customization.transitionLanguage?.includes(transition.id) ?? false}
							onchange={(event) => toggleTransition(transition.id, event.currentTarget.checked)}
						/>
						{transition.label}
					</label>
				{/each}
			</div>
		</div>

		<div class="flex items-center justify-between gap-3 border-t pt-3">
			<p class="text-[11px] leading-relaxed text-muted-foreground">
				Customization stays deterministic and is saved with the Auto Video project for regeneration.
			</p>
			<button type="button" class="shrink-0 text-xs font-medium underline-offset-4 hover:underline" onclick={reset}>
				Reset
			</button>
		</div>
	</div>
</details>
