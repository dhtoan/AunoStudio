<script lang="ts">
	import { page } from '$app/state';
	import { onMount } from 'svelte';
	import { MOTION_STYLES, planMotionGraph, type MotionStyleId } from '@auno/motion';
	import { workspaceCtx } from '$lib/stores/workspace.svelte';
	import { Button } from '$lib/components/ui/button';
	import { requestAIStoryboard } from '$lib/auno/auto-video/api';
	import {
		loadAutoVideoSidecarRemote,
		saveAutoVideoSidecarRemote
	} from '$lib/auno/auto-video/sidecar';
	import {
		generateAutoVideoCaptions,
		generateAutoVideoMusic,
		generateAutoVideoVoices
	} from '$lib/auno/auto-video/enrichment';
	import type {
		AutoVideoGenerationBlock,
		AutoVideoScene,
		AutoVideoSidecar
	} from '$lib/auno/auto-video/types';
	import { timelineStore } from '$lib/video-editor/timeline/stores/timeline-store.svelte';
	import { removeItems, updateItemProperties } from '$lib/video-editor/timeline/actions/items';
	import { applyMotionGraphToLiveTimeline } from '$lib/auno/motion/live-applier';
	import { editorSession } from '$lib/video-editor/editor.svelte';
	import { inspectMusicGenerationStorage } from '$lib/video-editor/local-ai/music/ace-step-service';

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
	let mediaBusy = $state<'voice' | 'captions' | 'music' | null>(null);
	let voiceProgress = $state('');
	let motionStyle = $state<MotionStyleId>('editorial-fashion');
	let motionBusy = $state(false);
	let autoEnrichmentStarted = false;
	let status = $state('');

	const workspaceId = $derived(workspaceCtx.currentWorkspace?.id?.trim() ?? '');
	const voiceCount = $derived(sidecar?.generationGraph?.media?.voices?.length ?? 0);
	const hasCaptions = $derived(Boolean(sidecar?.generationGraph?.media?.captions));
	const hasMusic = $derived(Boolean(sidecar?.generationGraph?.media?.music));

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

	async function persistSidecar(next: AutoVideoSidecar): Promise<void> {
		sidecar = next;
		await saveAutoVideoSidecarRemote(workspaceId, next);
	}

	async function refreshSidecar(): Promise<void> {
		loading = true;
		status = '';
		try {
			const loaded = await loadAutoVideoSidecarRemote(workspaceId, projectId);
			sidecar = loaded;
			const savedStyle = loaded?.generationGraph?.motion?.style;
			if (savedStyle && savedStyle in MOTION_STYLES) motionStyle = savedStyle as MotionStyleId;
		} finally {
			loading = false;
		}
	}

	async function regenerate(target: number | 'all'): Promise<void> {
		if (!sidecar || busyScene !== null || mediaBusy !== null) return;
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
			const invalidatedSceneIds = new Set<string>();
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
				if (nextScene.voice !== oldScene.voice) invalidatedSceneIds.add(oldScene.id);
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

			const previousMedia = sidecar.generationGraph?.media;
			const invalidVoiceItems = (previousMedia?.voices ?? [])
				.filter((asset) => invalidatedSceneIds.has(asset.sceneId))
				.map((asset) => asset.itemId);
			if (invalidVoiceItems.length > 0) removeItems(invalidVoiceItems, false);
			if (invalidatedSceneIds.size > 0 && previousMedia?.captions) {
				removeItems([previousMedia.captions.itemId], false);
			}

			const nextSidecar: AutoVideoSidecar = {
				...sidecar,
				generationVersion: sidecar.generationVersion + 1,
				updatedAt: Date.now(),
				storyboard: { ...sidecar.storyboard, scenes: nextScenes },
				providerManifest: { ...sidecar.providerManifest, planner: generated.model },
				generationGraph: sidecar.generationGraph
					? {
							...sidecar.generationGraph,
							blocks: nextBlocks,
							media: previousMedia
								? {
										...previousMedia,
										voices: previousMedia.voices?.filter(
											(asset) => !invalidatedSceneIds.has(asset.sceneId)
										),
										captions:
											invalidatedSceneIds.size > 0 ? undefined : previousMedia.captions
									}
								: undefined
						}
					: undefined
			};
			await persistSidecar(nextSidecar);
			if (updated > 0) onautosave();
			const staleMessage = invalidatedSceneIds.size > 0 ? ' Voice/captions for rewritten scenes were cleared.' : '';
			status = protectedCount > 0
				? `Updated ${updated} scene(s). Preserved ${protectedCount} manually edited scene(s).${staleMessage}`
				: `Updated ${updated} scene(s).${staleMessage}`;
		} catch (cause) {
			status = cause instanceof Error ? cause.message : String(cause);
		} finally {
			busyScene = null;
		}
	}

	async function applyMotionStyle(): Promise<void> {
		if (!sidecar || motionBusy || mediaBusy !== null || busyScene !== null) return;
		const project = editorSession.project;
		if (!project) {
			status = 'The native video project is not ready yet.';
			return;
		}
		motionBusy = true;
		status = '';
		try {
			const previousMotion = sidecar.generationGraph?.motion;
			const graph = planMotionGraph({
				projectId,
				style: motionStyle,
				seed: previousMotion?.style === motionStyle ? previousMotion.seed : undefined,
				scenes: sidecar.storyboard.scenes
			});
			applyMotionGraphToLiveTimeline({
				graph,
				width: project.metadata.width,
				height: project.metadata.height
			});
			const nextSidecar: AutoVideoSidecar = {
				...sidecar,
				generationVersion: sidecar.generationVersion + 1,
				updatedAt: Date.now(),
				providerManifest: { ...sidecar.providerManifest, motion: `auno-motion:${motionStyle}` },
				generationGraph: {
					...sidecar.generationGraph,
					version: 1,
					blocks: sidecar.generationGraph?.blocks ?? [],
					motion: { schemaVersion: 1, style: graph.style, seed: graph.seed }
				}
			};
			await persistSidecar(nextSidecar);
			onautosave();
			status = `Applied ${MOTION_STYLES[motionStyle].label} as native editable motion.`;
		} catch (cause) {
			status = cause instanceof Error ? cause.message : String(cause);
		} finally {
			motionBusy = false;
		}
	}

	async function generateVoices(): Promise<void> {
		if (!sidecar || mediaBusy !== null || busyScene !== null) return;
		mediaBusy = 'voice';
		voiceProgress = '';
		status = '';
		try {
			const result = await generateAutoVideoVoices({
				projectId,
				workspaceId,
				sidecar,
				onProgress: (completed, total) => {
					voiceProgress = `${completed}/${total}`;
				}
			});
			let nextSidecar = result.sidecar;
			const project = editorSession.project;
			const savedMotion = nextSidecar.generationGraph?.motion;
			if (project && savedMotion && savedMotion.style in MOTION_STYLES) {
				const style = savedMotion.style as MotionStyleId;
				const graph = planMotionGraph({
					projectId,
					style,
					seed: savedMotion.seed,
					scenes: nextSidecar.storyboard.scenes
				});
				applyMotionGraphToLiveTimeline({
					graph,
					width: project.metadata.width,
					height: project.metadata.height
				});
				nextSidecar = {
					...nextSidecar,
					updatedAt: Date.now(),
					providerManifest: { ...nextSidecar.providerManifest, motion: `auno-motion:${style}` },
					generationGraph: {
						...nextSidecar.generationGraph,
						version: 1,
						blocks: nextSidecar.generationGraph?.blocks ?? [],
						motion: { schemaVersion: 1, style: graph.style, seed: graph.seed }
					}
				};
			}
			await persistSidecar(nextSidecar);
			onautosave();
			status = `Generated ${result.assets.length} editable voice clip(s), retimed scenes from real speech duration, and reflowed native motion.`;
		} catch (cause) {
			status = cause instanceof Error ? cause.message : String(cause);
		} finally {
			mediaBusy = null;
			voiceProgress = '';
		}
	}

	async function generateCaptions(): Promise<void> {
		if (!sidecar || mediaBusy !== null || busyScene !== null) return;
		mediaBusy = 'captions';
		status = '';
		try {
			const result = generateAutoVideoCaptions(sidecar);
			await persistSidecar(result.sidecar);
			onautosave();
			status = 'Created native editable captions directly from the approved script.';
		} catch (cause) {
			status = cause instanceof Error ? cause.message : String(cause);
		} finally {
			mediaBusy = null;
		}
	}

	async function generateMusic(): Promise<void> {
		if (!sidecar || mediaBusy !== null || busyScene !== null) return;
		mediaBusy = 'music';
		status = '';
		try {
			const result = await generateAutoVideoMusic({ projectId, workspaceId, sidecar });
			await persistSidecar(result.sidecar);
			onautosave();
			status = 'Generated editable background music at a voice-friendly mix level.';
		} catch (cause) {
			status = cause instanceof Error ? cause.message : String(cause);
		} finally {
			mediaBusy = null;
		}
	}

	async function runRequestedAutoEnrichment(): Promise<void> {
		if (!sidecar || autoEnrichmentStarted) return;
		const requested = new Set(
			(page.url.searchParams.get('autogen') ?? '')
				.split(',')
				.map((value) => value.trim())
				.filter(Boolean)
		);
		if (requested.size === 0) return;
		autoEnrichmentStarted = true;
		if (requested.has('voice') && (sidecar.generationGraph?.media?.voices?.length ?? 0) === 0) {
			await generateVoices();
		}
		if (requested.has('captions') && sidecar && !sidecar.generationGraph?.media?.captions) {
			await generateCaptions();
		}
		if (requested.has('music-if-ready') && sidecar && !sidecar.generationGraph?.media?.music) {
			try {
				const storage = await inspectMusicGenerationStorage('standard');
				if (storage.missingBytes === 0 && storage.sufficient) await generateMusic();
			} catch {
				// Optional background music never blocks a completed Auto Video project.
			}
		}
	}

	onMount(() => {
		void (async () => {
			await refreshSidecar();
			await runRequestedAutoEnrichment();
		})();
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

				<div class="grid grid-cols-[minmax(0,1fr)_auto] gap-1.5">
					<select bind:value={motionStyle} aria-label="Motion style" class="h-9 min-w-0 rounded border border-[var(--video-editor-border)] bg-[var(--video-editor-panel)] px-2 text-[11px] text-[var(--video-editor-text)]" disabled={motionBusy || mediaBusy !== null || busyScene !== null}>
						{#each Object.values(MOTION_STYLES) as definition (definition.id)}
							<option value={definition.id}>{definition.label}</option>
						{/each}
					</select>
					<Button type="button" size="sm" variant="outline" disabled={motionBusy || mediaBusy !== null || busyScene !== null} onclick={applyMotionStyle}>
						{motionBusy ? 'Applying…' : 'Apply motion'}
					</Button>
				</div>

				<div class="grid grid-cols-3 gap-1.5">
					<Button type="button" size="sm" variant="outline" disabled={mediaBusy !== null || busyScene !== null} onclick={generateVoices}>
						{mediaBusy === 'voice' ? `Voice ${voiceProgress}` : voiceCount > 0 ? `Voice · ${voiceCount}` : 'Voice'}
					</Button>
					<Button type="button" size="sm" variant="outline" disabled={mediaBusy !== null || busyScene !== null} onclick={generateCaptions}>
						{mediaBusy === 'captions' ? 'Captions…' : hasCaptions ? 'Captions ✓' : 'Captions'}
					</Button>
					<Button type="button" size="sm" variant="outline" disabled={mediaBusy !== null || busyScene !== null} onclick={generateMusic}>
						{mediaBusy === 'music' ? 'Music…' : hasMusic ? 'Music ✓' : 'Music'}
					</Button>
				</div>

				<p class="text-[10px] leading-relaxed text-[var(--video-editor-muted)]">
					Voice uses the selected local TTS model, captions come from the approved script, and music uses local ACE-Step when WebGPU is available. All outputs remain editable project assets.
				</p>

				<Button type="button" size="sm" variant="outline" class="w-full" disabled={busyScene !== null || mediaBusy !== null} onclick={() => regenerate('all')}>
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
							<Button type="button" size="sm" variant="ghost" class="mt-2 w-full" disabled={busyScene !== null || mediaBusy !== null || protectedEdit} onclick={() => regenerate(index)}>
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
