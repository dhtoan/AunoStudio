<script lang="ts">
	import { onMount } from 'svelte';
	import { workspaceCtx } from '$lib/stores/workspace.svelte';
	import { Button } from '$lib/components/ui/button';
	import { requestAIStoryboard } from '$lib/auno/auto-video/api';
	import {
		loadAutoVideoSidecarRemote,
		saveAutoVideoSidecarRemote
	} from '$lib/auno/auto-video/sidecar';
	import type {
		AutoVideoGenerationBlock,
		AutoVideoScene,
		AutoVideoSidecar
	} from '$lib/auno/auto-video/types';
	import { timelineStore } from '$lib/video-editor/timeline/stores/timeline-store.svelte';
	import { updateItemProperties } from '$lib/video-editor/timeline/actions/items';

	let {
		projectId,
		onautosave
	}: {
		projectId: string;
		onautosave: () => void;
	} = $props();

	let sidecar = $state<AutoVideoSidecar | null>(null);
	let loading = $state(true);
	let busyScene = $state<number | 'all' | null>(null);
	let status = $state('');

	const workspaceId = $derived(workspaceCtx.currentWorkspace?.id?.trim() ?? '');

	function blockForScene(sceneId: string): AutoVideoGenerationBlock | undefined {
		return sidecar?.generationGraph?.blocks.find((block) => block.sceneId === sceneId);
	}

	function textItemId(scene: AutoVideoScene): string {
		return blockForScene(scene.id)?.ownedItemIds.find((id) => id.endsWith('-text')) ?? `${scene.id}-text`;
	}

	function expectedText(scene: AutoVideoScene): string {
		return `${scene.title}\n${scene.voice}`;
	}

	function manuallyEdited(scene: AutoVideoScene): boolean {
		const item = timelineStore.itemById.get(textItemId(scene));
		return Boolean(item && item.text !== expectedText(scene));
	}

	async function refreshSidecar(): Promise<void> {
		loading = true;
		status = '';
		try {
			sidecar = await loadAutoVideoSidecarRemote(workspaceId, projectId);
		} finally {
			loading = false;
		}
	}

	async function regenerate(target: number | 'all'): Promise<void> {
		if (!sidecar || busyScene !== null) return;
		if (!workspaceId) {
			status = 'Select an Auno Studio workspace to use AI regeneration.';
			return;
		}
		busyScene = target;
		status = '';
		try {
			const generated = await requestAIStoryboard({
				workspaceId,
				format: sidecar.storyboard.format,
				title: sidecar.storyboard.title,
				language: sidecar.storyboard.language,
				targetDurationSeconds: sidecar.storyboard.targetDurationSeconds,
				source: sidecar.source
			});
			if (!generated) {
				status = 'The configured AI planner is unavailable right now. Your project was not changed.';
				return;
			}

			let updated = 0;
			let protectedCount = 0;
			const nextScenes = sidecar.storyboard.scenes.map((oldScene, index) => {
				if (target !== 'all' && target !== index) return oldScene;
				const nextGenerated = generated.storyboard.scenes[index];
				if (!nextGenerated) return oldScene;
				const itemId = textItemId(oldScene);
				const item = timelineStore.itemById.get(itemId);
				if (!item || item.type !== 'text') return oldScene;
				if (item.text !== expectedText(oldScene)) {
					protectedCount += 1;
					return oldScene;
				}
				const nextScene: AutoVideoScene = {
					...nextGenerated,
					id: oldScene.id,
					sourceIds: oldScene.sourceIds
				};
				updateItemProperties(
					itemId,
					{ text: expectedText(nextScene), label: nextScene.title },
					'AUNO_REGENERATE_SCENE'
				);
				updated += 1;
				return nextScene;
			});

			const nextBlocks = (sidecar.generationGraph?.blocks ?? []).map((block) => {
				const scene = sidecar?.storyboard.scenes.find((entry) => entry.id === block.sceneId);
				if (!scene || !manuallyEdited(scene)) return block;
				const itemId = textItemId(scene);
				return block.userModifiedItemIds.includes(itemId)
					? block
					: { ...block, userModifiedItemIds: [...block.userModifiedItemIds, itemId] };
			});

			const now = Date.now();
			const nextSidecar: AutoVideoSidecar = {
				...sidecar,
				generationVersion: sidecar.generationVersion + 1,
				updatedAt: now,
				storyboard: { ...sidecar.storyboard, scenes: nextScenes },
				providerManifest: { ...sidecar.providerManifest, planner: generated.model },
				generationGraph: sidecar.generationGraph
					? { ...sidecar.generationGraph, blocks: nextBlocks }
					: undefined
			};
			sidecar = nextSidecar;
			await saveAutoVideoSidecarRemote(workspaceId, nextSidecar);
			if (updated > 0) onautosave();
			status = protectedCount > 0
				? `Updated ${updated} scene(s). Preserved ${protectedCount} manually edited scene(s).`
				: `Updated ${updated} scene(s).`;
		} catch (cause) {
			status = cause instanceof Error ? cause.message : String(cause);
		} finally {
			busyScene = null;
		}
	}

	onMount(() => {
		void refreshSidecar();
	});
</script>

<div class="flex h-full min-h-0 flex-col" data-testid="auno-auto-video-panel">
	<div class="shrink-0 border-b border-[var(--video-editor-border)] px-3 py-2">
		<div class="flex items-center justify-between gap-2">
			<div>
				<p class="text-xs font-semibold text-[var(--video-editor-text)]">Auno AI</p>
				<p class="text-[11px] text-[var(--video-editor-muted)]">Regenerate without overwriting manual edits.</p>
			</div>
			{#if sidecar}
				<span class="rounded bg-[var(--video-editor-control)] px-1.5 py-1 text-[10px] text-[var(--video-editor-muted)]">v{sidecar.generationVersion}</span>
			{/if}
		</div>
	</div>

	<div class="min-h-0 flex-1 overflow-y-auto p-3">
		{#if loading}
			<p class="text-xs text-[var(--video-editor-muted)]">Loading Auto Video metadata…</p>
		{:else if !sidecar}
			<div class="space-y-2 rounded-md border border-[var(--video-editor-border)] p-3">
				<p class="text-xs font-medium text-[var(--video-editor-text)]">This is a normal Video Editor project.</p>
				<p class="text-[11px] leading-relaxed text-[var(--video-editor-muted)]">Projects created through AI Auto Video keep optional generation metadata here. Native editing remains available without it.</p>
			</div>
		{:else}
			<div class="space-y-3">
				<div class="rounded-md bg-[var(--video-editor-control)] p-2.5">
					<p class="text-xs font-medium text-[var(--video-editor-text)]">{sidecar.storyboard.title}</p>
					<p class="mt-1 text-[11px] text-[var(--video-editor-muted)]">{sidecar.storyboard.format} · {sidecar.storyboard.language} · {sidecar.providerManifest.planner ?? 'planner'}</p>
				</div>

				<Button type="button" size="sm" variant="outline" class="w-full" disabled={busyScene !== null} onclick={() => regenerate('all')}>
					{busyScene === 'all' ? 'Regenerating…' : 'Rewrite generated narration'}
				</Button>

				<div class="space-y-2">
					{#each sidecar.storyboard.scenes as scene, index (scene.id)}
						{@const protectedEdit = manuallyEdited(scene)}
						<div class="rounded-md border border-[var(--video-editor-border)] p-2.5">
							<div class="flex items-start justify-between gap-2">
								<div class="min-w-0">
									<p class="truncate text-xs font-medium text-[var(--video-editor-text)]">{index + 1}. {scene.title}</p>
									<p class="mt-0.5 line-clamp-2 text-[11px] leading-relaxed text-[var(--video-editor-muted)]">{scene.voice}</p>
								</div>
								{#if protectedEdit}
									<span class="shrink-0 rounded bg-[var(--video-editor-control)] px-1.5 py-0.5 text-[10px] text-[var(--video-editor-muted)]">Manual edit</span>
								{/if}
							</div>
							<Button type="button" size="sm" variant="ghost" class="mt-2 w-full" disabled={busyScene !== null || protectedEdit} onclick={() => regenerate(index)}>
								{busyScene === index ? 'Regenerating…' : protectedEdit ? 'Manual edit protected' : 'Regenerate scene'}
							</Button>
						</div>
					{/each}
				</div>

				{#if status}
					<p class="rounded-md bg-[var(--video-editor-control)] p-2 text-[11px] leading-relaxed text-[var(--video-editor-muted)]">{status}</p>
				{/if}
			</div>
		{/if}
	</div>
</div>
