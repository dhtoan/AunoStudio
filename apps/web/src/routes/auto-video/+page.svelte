<script lang="ts">
	import { goto } from '$app/navigation';
	import { resolveAppPath } from '$lib/app-path';
	import InlineNotice from '$lib/components/inline-notice.svelte';
	import { Button } from '$lib/components/ui/button';
	import { workspaceCtx } from '$lib/stores/workspace.svelte';
	import WorkspaceGatePanel from '$lib/video-editor/components/workspace-gate-panel.svelte';
	import { createWorkspaceGate } from '$lib/video-editor/gate/workspace-gate.svelte';
	import { createProject } from '$lib/video-editor/workspace-fs/projects';
	import { CloudVideoProjectRepository } from '$lib/video-editor/cloud/project-repository';
	import type { Project } from '$lib/video-editor/project/types';
	import { MOTION_STYLES, planMotionGraph, type MotionStyleId } from '@auno/motion';
	import { applyMotionGraphToProject } from '$lib/auno/motion/native-compiler';
	import { requestAIStoryboard, resolveAutoVideoSource } from '$lib/auno/auto-video/api';
	import {
		AUTO_VIDEO_CANVAS_SETTINGS,
		compileStoryboardToProject,
		type AutoVideoCanvasPreset
	} from '$lib/auno/auto-video/compiler';
	import {
		AUTO_VIDEO_FORMAT_LABELS,
		AUTO_VIDEO_FORMAT_SCENES
	} from '$lib/auno/auto-video/formats';
	import { saveAutoVideoSidecar, saveAutoVideoSidecarRemote } from '$lib/auno/auto-video/sidecar';
	import { buildStarterStoryboard } from '$lib/auno/auto-video/storyboard';
	import type {
		AutoVideoFormat,
		AutoVideoSource,
		AutoVideoStoryboard
	} from '$lib/auno/auto-video/types';

	const gate = createWorkspaceGate();
	let sourceKind = $state<'text' | 'url' | 'markdown'>('text');
	let sourceValue = $state('');
	let title = $state('');
	let format = $state<AutoVideoFormat>('review');
	let language = $state('en-US');
	let targetDurationSeconds = $state(45);
	let canvas = $state<AutoVideoCanvasPreset>('vertical');
	let motionStyle = $state<MotionStyleId>('editorial-fashion');
	let storageMode = $state<'cloud' | 'local'>('cloud');
	let storyboard = $state<AutoVideoStoryboard | null>(null);
	let activeSource = $state<AutoVideoSource | null>(null);
	let plannerModel = $state('starter-fallback');
	let sourceTruncated = $state(false);
	let error = $state('');
	let planning = $state(false);
	let creating = $state(false);

	function createSource(): AutoVideoSource {
		const value = sourceValue.trim();
		return {
			id: crypto.randomUUID(),
			kind: sourceKind,
			label: title.trim() || (sourceKind === 'url' ? 'Web source' : 'Source'),
			value,
			url: sourceKind === 'url' ? value : undefined
		};
	}

	async function generateStoryboard(): Promise<void> {
		error = '';
		if (!sourceValue.trim()) {
			error = 'Add source text, Markdown, or a URL first.';
			return;
		}
		planning = true;
		let source = createSource();
		const duration = Number(targetDurationSeconds);
		sourceTruncated = false;
		try {
			const workspaceId = workspaceCtx.currentWorkspace?.id?.trim() ?? '';
			if (source.kind === 'url') {
				if (!workspaceId) {
					error = 'Select a workspace before loading a URL source.';
					return;
				}
				const resolved = await resolveAutoVideoSource(workspaceId, source);
				source = resolved.source;
				sourceTruncated = resolved.truncated;
			}
			activeSource = source;
			if (workspaceId) {
				const generated = await requestAIStoryboard({
					workspaceId,
					format,
					title: title.trim(),
					language,
					targetDurationSeconds: duration,
					source
				});
				if (generated) {
					storyboard = generated.storyboard;
					plannerModel = generated.model;
					return;
				}
			}

			storyboard = buildStarterStoryboard({
				format,
				title,
				language,
				targetDurationSeconds: duration,
				source
			});
			plannerModel = 'starter-fallback';
		} catch (cause) {
			error = cause instanceof Error ? cause.message : String(cause);
		} finally {
			planning = false;
		}
	}

	async function createAndOpenProject(): Promise<void> {
		if (!storyboard || !activeSource || creating) return;
		error = '';
		const workspaceId = workspaceCtx.currentWorkspace?.id?.trim() ?? '';
		if (storageMode === 'local' && gate.state !== 'ready') {
			error = 'Choose or reconnect a Video Editor workspace folder before creating the local project.';
			return;
		}
		if (storageMode === 'cloud' && !workspaceId) {
			error = 'Select an Auno Studio workspace before creating a cloud project.';
			return;
		}

		creating = true;
		try {
			const baseProject = compileStoryboardToProject(storyboard, canvas);
			const motionGraph = planMotionGraph({
				projectId: baseProject.id,
				style: motionStyle,
				scenes: storyboard.scenes
			});
			const project = applyMotionGraphToProject(baseProject, motionGraph);
			const now = Date.now();
			const sidecar = {
				version: 1 as const,
				projectId: project.id,
				generationVersion: 1,
				templateId: storyboard.format,
				createdAt: now,
				updatedAt: now,
				source: activeSource,
				storyboard,
				providerManifest: { planner: plannerModel },
				generationGraph: {
					version: 1 as const,
					blocks: storyboard.scenes.map((scene) => ({
						sceneId: scene.id,
						ownedItemIds: [`${scene.id}-background`, `${scene.id}-text`],
						userModifiedItemIds: []
					})),
					motion: { schemaVersion: 1 as const, style: motionGraph.style, seed: motionGraph.seed }
				}
			};

			if (storageMode === 'cloud') {
				const repository = new CloudVideoProjectRepository<Project>(workspaceId);
				const cloudProject = await repository.createWithId(project.id, project.name, project);
				await saveAutoVideoSidecarRemote(workspaceId, sidecar);
				await goto(resolveAppPath(`/video-editor/${cloudProject.id}?storage=cloud&auno=auto-video`));
			} else {
				await createProject(project);
				saveAutoVideoSidecar(sidecar);
				await goto(resolveAppPath(`/video-editor/${project.id}?auno=auto-video`));
			}
		} catch (cause) {
			error = cause instanceof Error ? cause.message : String(cause);
		} finally {
			creating = false;
		}
	}
</script>

<svelte:head><title>AI Auto Video · Auno Studio</title></svelte:head>

<div class="mx-auto flex w-full max-w-6xl flex-col gap-6 px-4 py-8 sm:px-6 lg:px-8">
	<header class="space-y-2">
		<p class="text-sm font-medium text-muted-foreground">Create</p>
		<h1 class="text-3xl font-semibold tracking-tight">AI Auto Video</h1>
		<p class="max-w-3xl text-sm text-muted-foreground">
			Turn a source into an editable native Auno Studio timeline. A configured AI provider plans the storyboard first; the local starter planner keeps creation available when AI is not configured or temporarily unavailable.
		</p>
	</header>

	{#if error}<InlineNotice tone="error">{error}</InlineNotice>{/if}

	<div class="grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(22rem,0.8fr)]">
		<section class="space-y-5 rounded-xl border bg-card p-5">
			<div class="grid gap-4 sm:grid-cols-2">
				<label class="space-y-2 text-sm font-medium">
					<span>Source type</span>
					<select bind:value={sourceKind} class="h-10 w-full rounded-md border bg-background px-3 text-sm">
						<option value="text">Text</option>
						<option value="url">URL</option>
						<option value="markdown">Markdown</option>
					</select>
				</label>
				<label class="space-y-2 text-sm font-medium">
					<span>Title <span class="font-normal text-muted-foreground">optional</span></span>
					<input bind:value={title} class="h-10 w-full rounded-md border bg-background px-3 text-sm" placeholder="Project title" />
				</label>
			</div>

			<label class="block space-y-2 text-sm font-medium">
				<span>{sourceKind === 'url' ? 'Source URL' : 'Source content'}</span>
				<textarea
					bind:value={sourceValue}
					rows="10"
					class="w-full resize-y rounded-md border bg-background px-3 py-2 text-sm"
					placeholder={sourceKind === 'url'
						? 'https://example.com/article'
						: 'Paste the content, notes, script, or product information to turn into a video.'}
				></textarea>
			</label>

			<div class="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
				<label class="space-y-2 text-sm font-medium">
					<span>Format</span>
					<select bind:value={format} class="h-10 w-full rounded-md border bg-background px-3 text-sm">
						{#each Object.entries(AUTO_VIDEO_FORMAT_LABELS) as [value, label]}
							<option {value}>{label}</option>
						{/each}
					</select>
				</label>
				<label class="space-y-2 text-sm font-medium">
					<span>Canvas</span>
					<select bind:value={canvas} class="h-10 w-full rounded-md border bg-background px-3 text-sm">
						<option value="vertical">Vertical 9:16</option>
						<option value="landscape">Landscape 16:9</option>
						<option value="square">Square 1:1</option>
					</select>
				</label>
				<label class="space-y-2 text-sm font-medium">
					<span>Duration</span>
					<select bind:value={targetDurationSeconds} class="h-10 w-full rounded-md border bg-background px-3 text-sm">
						<option value={30}>30 seconds</option>
						<option value={45}>45 seconds</option>
						<option value={60}>60 seconds</option>
						<option value={90}>90 seconds</option>
					</select>
				</label>
				<label class="space-y-2 text-sm font-medium">
					<span>Storage</span>
					<select bind:value={storageMode} class="h-10 w-full rounded-md border bg-background px-3 text-sm">
						<option value="cloud">Cloud Workspace</option>
						<option value="local">Local-only</option>
					</select>
				</label>
				<label class="space-y-2 text-sm font-medium">
					<span>Motion style</span>
					<select bind:value={motionStyle} class="h-10 w-full rounded-md border bg-background px-3 text-sm">
						{#each Object.values(MOTION_STYLES) as definition (definition.id)}
							<option value={definition.id}>{definition.label}</option>
						{/each}
					</select>
				</label>
				<label class="space-y-2 text-sm font-medium">
					<span>Language</span>
					<select bind:value={language} class="h-10 w-full rounded-md border bg-background px-3 text-sm">
						<option value="en-US">English (US)</option>
						<option value="vi-VN">Tiếng Việt</option>
					</select>
				</label>
			</div>

			<div class="flex flex-wrap items-center gap-3">
				<Button onclick={generateStoryboard} disabled={planning}>{planning ? 'Planning…' : 'Generate storyboard'}</Button>
				<span class="text-xs text-muted-foreground">
					{AUTO_VIDEO_FORMAT_SCENES[format].length} scenes · {AUTO_VIDEO_CANVAS_SETTINGS[canvas].width}×{AUTO_VIDEO_CANVAS_SETTINGS[canvas].height}
				</span>
			</div>
		</section>

		<section class="space-y-4 rounded-xl border bg-card p-5">
			<div>
				<h2 class="font-semibold">Project storage</h2>
				<p class="mt-1 text-sm text-muted-foreground">Cloud Workspace syncs native project revisions and AI metadata. Local-only keeps the project in your selected browser folder.</p>
			</div>
			{#if storageMode === 'cloud'}
				{#if workspaceCtx.currentWorkspace?.id}
					<InlineNotice tone="success">Cloud Workspace ready. The native project and Auto Video metadata will sync to this workspace.</InlineNotice>
				{:else}
					<InlineNotice tone="warning">Select a workspace to use Cloud Workspace storage.</InlineNotice>
				{/if}
			{:else if gate.state !== 'ready'}
				<WorkspaceGatePanel {gate} />
			{:else}
				<InlineNotice tone="success">Local Video Editor workspace ready.</InlineNotice>
			{/if}
		</section>
	</div>

	{#if storyboard}
		<section class="space-y-4">
			<div class="flex flex-wrap items-end justify-between gap-3">
				<div>
					<p class="text-sm font-medium text-muted-foreground">Storyboard · {plannerModel}{sourceTruncated ? ' · source shortened to safe extraction limit' : ''}</p>
					<h2 class="text-xl font-semibold">{storyboard.title}</h2>
				</div>
				<Button
					onclick={createAndOpenProject}
					disabled={creating || (storageMode === 'local' ? gate.state !== 'ready' : !workspaceCtx.currentWorkspace?.id)}
				>
					{creating ? 'Creating project…' : 'Open in Video Editor'}
				</Button>
			</div>

			<div class="grid gap-3 md:grid-cols-2">
				{#each storyboard.scenes as scene, index (scene.id)}
					<article class="space-y-3 rounded-xl border bg-card p-4">
						<div class="flex items-center justify-between gap-3">
							<div>
								<p class="text-xs font-medium uppercase tracking-wide text-muted-foreground">Scene {index + 1} · {scene.visualIntent}</p>
								<h3 class="font-semibold">{scene.title}</h3>
							</div>
							<span class="rounded-full bg-muted px-2 py-1 text-xs">{scene.durationSeconds.toFixed(1)}s</span>
						</div>
						<textarea bind:value={scene.voice} rows="4" class="w-full resize-y rounded-md border bg-background px-3 py-2 text-sm"></textarea>
					</article>
				{/each}
			</div>
		</section>
	{/if}
</div>
