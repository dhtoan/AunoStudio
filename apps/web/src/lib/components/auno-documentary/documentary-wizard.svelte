<script lang="ts">
	import { goto } from '$app/navigation';
	import { resolveAppPath } from '$lib/app-path';
	import { onMount } from 'svelte';
	import InlineNotice from '$lib/components/inline-notice.svelte';
	import { Button } from '$lib/components/ui/button';
	import { workspaceCtx } from '$lib/stores/workspace.svelte';
	import { uploadMediaFile } from '$lib/media-upload-client';
	import {
		autoVideoMediaKind,
		listAutoVideoLibraryMedia,
		type AutoVideoLibraryMedia
	} from '$lib/auno/auto-video/media-library';
	import type { AutoVideoSource } from '$lib/auno/auto-video/types';
	import {
		createDocumentaryRun,
		generateDocumentaryBeats,
		generateDocumentaryIdeas,
		generateDocumentaryScript,
		generateDocumentaryThumbnails,
		generateDocumentaryVisuals,
		regenerateDocumentaryVisual,
		getDocumentaryRun,
		updateDocumentaryRun
	} from '$lib/auno/documentary/api';
	import { cloneDocumentaryRun } from '$lib/auno/documentary/state';
	import { createCloudDocumentaryProject } from '$lib/auno/documentary/project-handoff';
	import {
		documentaryCapabilityLevel,
		documentaryNextActions,
		loadDocumentaryCapabilities,
		type DocumentaryCapabilities
	} from '$lib/auno/documentary/capabilities';
	import {
		DOCUMENTARY_DURATIONS,
		type DocumentaryDuration,
		type DocumentaryRun,
		type DocumentaryStep
	} from '$lib/auno/documentary/types';
	import DocumentaryStepNav from './documentary-step-nav.svelte';
	import DocumentaryIdeas from './documentary-ideas.svelte';
	import DocumentaryBeatEditor from './documentary-beat-editor.svelte';
	import DocumentaryScript from './documentary-script.svelte';
	import DocumentaryPromptPack from './documentary-prompt-pack.svelte';
	import DocumentaryThumbnails from './documentary-thumbnails.svelte';

	const NICHE_OPTIONS = [
		'Crime & Investigation',
		'History',
		'Money & Power',
		'Disaster & Survival',
		'Mystery & Unsolved',
		'Technology',
		'Sports',
		'Custom topic'
	] as const;

	let run = $state.raw<DocumentaryRun | null>(null);
	let activeStep = $state<DocumentaryStep>('source');
	let busyAction = $state('');
	let error = $state('');
	let resumeRunId = $state('');
	let capabilityLoading = $state(true);
	let capabilities = $state<DocumentaryCapabilities>({
		documentaryPlanner: false,
		browserTTS: false,
		browserMusic: false,
		serverImageGeneration: false,
		serverVideoGeneration: false
	});
	const capabilityLevel = $derived(documentaryCapabilityLevel(capabilities));
	const nextActions = $derived(documentaryNextActions(capabilities, run));

	let sourceMode = $state<'none' | 'text' | 'url' | 'media'>('none');
	let sourceValue = $state('');
	let sourceDraft = $state.raw<AutoVideoSource | undefined>(undefined);
	let sourceUploading = $state(false);
	let libraryMedia = $state.raw<AutoVideoLibraryMedia[]>([]);
	let libraryLoading = $state(false);
	let selectedLibraryMediaId = $state('');
	let niche = $state<string>('History');
	let customTopic = $state('');
	let language = $state('en-US');

	function workspaceId(): string {
		return workspaceCtx.currentWorkspace?.id?.trim() ?? '';
	}

	function setFailure(cause: unknown): void {
		error = cause instanceof Error ? cause.message : String(cause);
	}

	function sourceFromInputs(): AutoVideoSource | undefined {
		if (sourceMode === 'none') return undefined;
		if (sourceMode === 'media') return sourceDraft;
		const value = sourceValue.trim();
		if (!value) throw new Error(sourceMode === 'url' ? 'Enter a public source URL.' : 'Add source text first.');
		if (value.length > 50_000) throw new Error('Documentary text sources are capped at 50,000 characters.');
		return {
			id: crypto.randomUUID(),
			kind: sourceMode,
			label: customTopic.trim() || (sourceMode === 'url' ? 'Documentary web source' : 'Documentary text source'),
			value,
			url: sourceMode === 'url' ? value : undefined
		};
	}

	function hydrateInputs(value: DocumentaryRun): void {
		niche = value.niche || 'History';
		customTopic = value.customTopic ?? '';
		language = value.language || 'en-US';
		if (!value.source) {
			sourceMode = 'none';
			sourceValue = '';
			sourceDraft = undefined;
			return;
		}
		if (value.source.mediaId) {
			sourceMode = 'media';
			sourceDraft = value.source;
			sourceValue = value.source.value;
			return;
		}
		sourceMode = value.source.kind === 'url' ? 'url' : 'text';
		sourceValue = value.source.kind === 'url' ? value.source.url || value.source.value : value.source.value;
		sourceDraft = value.source;
	}

	async function createRun(): Promise<void> {
		const currentWorkspaceId = workspaceId();
		if (!currentWorkspaceId) {
			error = 'Select an Auno Studio workspace before starting a documentary.';
			return;
		}
		error = '';
		busyAction = 'create';
		try {
			const source = sourceFromInputs();
			run = await createDocumentaryRun({
				workspaceId: currentWorkspaceId,
				source,
				niche: niche === 'Custom topic' ? '' : niche,
				customTopic: customTopic.trim(),
				language
			});
			resumeRunId = run.id;
			activeStep = 'topic';
		} catch (cause) {
			setFailure(cause);
		} finally {
			busyAction = '';
		}
	}

	async function resumeRun(): Promise<void> {
		const currentWorkspaceId = workspaceId();
		const id = resumeRunId.trim();
		if (!currentWorkspaceId || !id) {
			error = 'Select a workspace and enter the documentary run ID.';
			return;
		}
		error = '';
		busyAction = 'resume';
		try {
			run = await getDocumentaryRun(currentWorkspaceId, id);
			hydrateInputs(run);
			activeStep = run.currentStep;
		} catch (cause) {
			setFailure(cause);
		} finally {
			busyAction = '';
		}
	}

	async function saveRun(
		label: string,
		mutate: (next: DocumentaryRun) => void,
		options: { clearSource?: boolean } = {}
	): Promise<DocumentaryRun | null> {
		if (!run) return null;
		const currentWorkspaceId = workspaceId();
		if (!currentWorkspaceId) {
			error = 'Select the workspace that owns this documentary run.';
			return null;
		}
		error = '';
		busyAction = label;
		try {
			const next = cloneDocumentaryRun(run);
			mutate(next);
			run = await updateDocumentaryRun(currentWorkspaceId, next, options);
			return run;
		} catch (cause) {
			setFailure(cause);
			return null;
		} finally {
			busyAction = '';
		}
	}

	async function saveTopic(): Promise<void> {
		const updated = await saveRun('topic', (next) => {
			next.niche = niche === 'Custom topic' ? '' : niche;
			next.customTopic = customTopic.trim();
			next.language = language;
			next.currentStep = 'topic';
		});
		if (updated) activeStep = 'ideas';
	}

	async function saveSource(): Promise<void> {
		if (!run) return;
		if (sourceMode === 'none') {
			const updated = await saveRun('source', (next) => {
				next.source = undefined;
				next.currentStep = 'source';
			}, { clearSource: true });
			if (updated) activeStep = 'topic';
			return;
		}
		let source: AutoVideoSource;
		try {
			const built = sourceFromInputs();
			if (!built) throw new Error('Choose or enter a documentary source.');
			source = built;
		} catch (cause) {
			setFailure(cause);
			return;
		}
		const updated = await saveRun('source', (next) => {
			next.source = source;
			next.currentStep = 'source';
		});
		if (updated) {
			hydrateInputs(updated);
			activeStep = 'topic';
		}
	}

	async function generateIdeas(): Promise<void> {
		if (!run) return;
		error = '';
		busyAction = 'ideas';
		try {
			run = await generateDocumentaryIdeas(workspaceId(), run);
			activeStep = 'ideas';
		} catch (cause) {
			setFailure(cause);
		} finally {
			busyAction = '';
		}
	}

	async function selectIdea(id: string): Promise<void> {
		const updated = await saveRun('idea', (next) => {
			next.selectedIdeaId = id;
			next.currentStep = 'ideas';
		});
		if (updated) activeStep = 'duration';
	}

	async function selectDuration(event: Event): Promise<void> {
		const seconds = Number((event.currentTarget as HTMLSelectElement).value) as DocumentaryDuration;
		if (!DOCUMENTARY_DURATIONS.includes(seconds)) return;
		const updated = await saveRun('duration', (next) => {
			next.targetDurationSeconds = seconds;
			next.currentStep = 'duration';
		});
		if (updated) activeStep = 'script';
	}

	async function generateScript(): Promise<void> {
		if (!run) return;
		error = '';
		busyAction = 'script';
		try {
			run = await generateDocumentaryScript(workspaceId(), run);
			activeStep = 'script';
		} catch (cause) {
			setFailure(cause);
		} finally {
			busyAction = '';
		}
	}

	async function saveScript(text: string): Promise<void> {
		if (!run?.script) return;
		await saveRun('script-edit', (next) => {
			if (next.script) next.script = { ...next.script, text };
			next.currentStep = 'script';
		});
	}

	async function generateBeats(): Promise<void> {
		if (!run) return;
		error = '';
		busyAction = 'beats';
		try {
			run = await generateDocumentaryBeats(workspaceId(), run);
			activeStep = 'beats';
		} catch (cause) {
			setFailure(cause);
		} finally {
			busyAction = '';
		}
	}

	async function saveBeats(beats: DocumentaryRun['beats']): Promise<void> {
		await saveRun('beat-edit', (next) => {
			next.beats = beats;
			next.currentStep = 'beats';
		});
	}

	async function saveVisualPlans(plans: DocumentaryRun['visualPlans']): Promise<void> {
		await saveRun('visual-edit', (next) => {
			next.visualPlans = plans;
			next.currentStep = 'visuals';
		});
	}

	async function regenerateBeatVisual(beatId: string): Promise<void> {
		if (!run) return;
		error = '';
		busyAction = `visual:${beatId}`;
		try {
			run = await regenerateDocumentaryVisual(workspaceId(), run, beatId);
		} catch (cause) {
			setFailure(cause);
		} finally {
			busyAction = '';
		}
	}

	async function generateVisuals(): Promise<void> {
		if (!run) return;
		error = '';
		busyAction = 'visuals';
		try {
			run = await generateDocumentaryVisuals(workspaceId(), run);
			activeStep = 'visuals';
		} catch (cause) {
			setFailure(cause);
		} finally {
			busyAction = '';
		}
	}

	async function generateThumbnails(): Promise<void> {
		if (!run) return;
		error = '';
		busyAction = 'thumbnails';
		try {
			run = await generateDocumentaryThumbnails(workspaceId(), run);
			activeStep = 'thumbnails';
		} catch (cause) {
			setFailure(cause);
		} finally {
			busyAction = '';
		}
	}

	async function createOrOpenProject(): Promise<void> {
		if (!run) return;
		const currentWorkspaceId = workspaceId();
		if (!currentWorkspaceId) {
			error = 'Select the workspace that owns this documentary run.';
			return;
		}
		if (run.projectId) {
			await goto(resolveAppPath(`/video-editor/${run.projectId}?storage=cloud&auno=documentary&documentary_run=${encodeURIComponent(run.id)}`));
			return;
		}
		error = '';
		busyAction = 'project';
		try {
			const handoff = await createCloudDocumentaryProject(currentWorkspaceId, run);
			const updated = await saveRun('project-link', (next) => {
				next.projectId = handoff.projectId;
				next.currentStep = 'project';
			});
			if (!updated) return;
			if (handoff.missingMediaIds.length > 0) {
				console.info(`Auno Documentary used editable placeholders for ${handoff.missingMediaIds.length} unresolved media asset(s).`);
			}
			await goto(resolveAppPath(`/video-editor/${handoff.projectId}?storage=cloud&auno=documentary&documentary_run=${encodeURIComponent(updated.id)}`));
		} catch (cause) {
			setFailure(cause);
		} finally {
			busyAction = '';
		}
	}

	async function loadMediaLibrary(): Promise<void> {
		const currentWorkspaceId = workspaceId();
		if (!currentWorkspaceId) {
			error = 'Select a workspace before browsing Media Library.';
			return;
		}
		error = '';
		libraryLoading = true;
		try {
			libraryMedia = await listAutoVideoLibraryMedia(currentWorkspaceId);
		} catch (cause) {
			setFailure(cause);
		} finally {
			libraryLoading = false;
		}
	}

	function chooseLibraryMedia(event: Event): void {
		const mediaId = (event.currentTarget as HTMLSelectElement).value;
		selectedLibraryMediaId = mediaId;
		const item = libraryMedia.find((entry) => entry.id === mediaId);
		if (!item) {
			sourceDraft = undefined;
			return;
		}
		const kind = autoVideoMediaKind(item.mime_type);
		if (!kind) return;
		sourceDraft = {
			id: crypto.randomUUID(),
			kind,
			label: `Media Library ${kind}`,
			value: `Selected Media Library ${kind} source: ${item.id}`,
			mimeType: item.mime_type ?? '',
			mediaId: item.id
		};
		sourceMode = 'media';
	}

	onMount(() => {
		void (async () => {
			capabilityLoading = true;
			try {
				capabilities = await loadDocumentaryCapabilities();
			} catch {
				// A failed capability probe must not hide the text-only documentary workflow.
			} finally {
				capabilityLoading = false;
			}
		})();
	});

	async function uploadSourceFile(event: Event): Promise<void> {
		const input = event.currentTarget as HTMLInputElement;
		const file = input.files?.[0];
		if (!file) return;
		const currentWorkspaceId = workspaceId();
		if (!currentWorkspaceId) {
			error = 'Select a workspace before uploading documentary source media.';
			input.value = '';
			return;
		}
		if (file.size <= 0 || file.size > 25 * 1024 * 1024) {
			error = 'Documentary PDF, image, and video sources are limited to 25 MB.';
			input.value = '';
			return;
		}
		const kind = file.type === 'application/pdf'
			? 'pdf'
			: file.type.startsWith('image/')
				? 'image'
				: file.type.startsWith('video/')
					? 'video'
					: null;
		if (!kind) {
			error = 'Choose a PDF, image, or video file.';
			input.value = '';
			return;
		}
		sourceUploading = true;
		error = '';
		try {
			const uploaded = await uploadMediaFile({
				workspaceId: currentWorkspaceId,
				file,
				source: 'upload',
				assetKind: 'library',
				retentionClass: 'library',
				prepareVideo: false
			});
			sourceDraft = {
				id: crypto.randomUUID(),
				kind,
				label: file.name,
				value: `Attached ${kind} source: ${file.name}`,
				mimeType: uploaded.mime_type || file.type,
				mediaId: uploaded.id
			};
			sourceMode = 'media';
		} catch (cause) {
			setFailure(cause);
		} finally {
			sourceUploading = false;
			input.value = '';
		}
	}
</script>

<section class="space-y-5 rounded-xl border bg-card p-5">
	<div class="flex flex-wrap items-start justify-between gap-3">
		<div>
			<p class="text-xs font-medium uppercase tracking-wide text-muted-foreground">Documentary Long-form</p>
			<h2 class="mt-1 text-xl font-semibold">Vox Style</h2>
			<p class="mt-1 max-w-3xl text-sm text-muted-foreground">Evidence-led 16:9 documentary workflow with archival paper collage, persistent planning state, editable native motion, and up to five minutes of narration.</p>
		</div>
		<div class="rounded-lg border bg-muted/20 px-3 py-2 text-xs text-muted-foreground">
			1920×1080 · Vox Style · 30–300s
		</div>
	</div>

	<div class="rounded-lg border bg-muted/20 p-3">
		<div class="flex flex-wrap items-center justify-between gap-2">
			<div>
				<p class="text-xs font-medium">Media capability</p>
				<p class="mt-0.5 text-[11px] text-muted-foreground">{capabilityLoading ? 'Checking available adapters…' : capabilityLevel}</p>
			</div>
			<div class="flex flex-wrap gap-1.5">
				{#each nextActions as action (action.id)}
					<span class={`rounded-full border px-2 py-1 text-[10px] ${action.available ? 'bg-background text-foreground' : 'bg-muted/40 text-muted-foreground opacity-60'}`} title={action.reason ?? action.label}>
						{action.available ? '✓' : '–'} {action.label}
					</span>
				{/each}
			</div>
		</div>
		{#if capabilityLevel === 'text-only'}
			<p class="mt-2 text-[11px] leading-relaxed text-muted-foreground">Optional media providers are unavailable. Prompt-pack export, editable paper placeholders, manual Media Library assignment, and native project creation remain available.</p>
		{/if}
	</div>

	{#if error}<InlineNotice tone="error">{error}</InlineNotice>{/if}

	{#if !run}
		<div class="grid gap-5 lg:grid-cols-[minmax(0,1fr)_20rem]">
			<div class="space-y-4">
				<div class="grid gap-4 sm:grid-cols-2">
					<label class="space-y-2 text-sm font-medium">
						<span>Source <span class="font-normal text-muted-foreground">optional</span></span>
						<select bind:value={sourceMode} class="h-10 w-full rounded-md border bg-background px-3 text-sm">
							<option value="none">Skip source</option>
							<option value="text">Text</option>
							<option value="url">Public URL</option>
							<option value="media">PDF / image / video / Media Library</option>
						</select>
					</label>
					<label class="space-y-2 text-sm font-medium">
						<span>Niche</span>
						<select bind:value={niche} class="h-10 w-full rounded-md border bg-background px-3 text-sm">
							{#each NICHE_OPTIONS as option (option)}<option value={option}>{option}</option>{/each}
						</select>
					</label>
				</div>

				{#if sourceMode === 'text' || sourceMode === 'url'}
					<textarea bind:value={sourceValue} rows="8" maxlength="50000" class="w-full resize-y rounded-md border bg-background px-3 py-2 text-sm" placeholder={sourceMode === 'url' ? 'https://example.com/article' : 'Paste up to 50,000 characters of source material.'}></textarea>
				{:else if sourceMode === 'media'}
					<div class="space-y-3 rounded-lg border bg-muted/20 p-3">
						<div class="flex flex-wrap gap-2">
							<label class="inline-flex h-9 cursor-pointer items-center rounded-md border bg-background px-3 text-xs font-medium hover:bg-muted">
								{sourceUploading ? 'Uploading…' : 'Choose PDF / Image / Video'}
								<input type="file" class="sr-only" accept="application/pdf,image/*,video/*" disabled={sourceUploading} onchange={uploadSourceFile} />
							</label>
							<Button type="button" size="sm" variant="outline" disabled={libraryLoading} onclick={loadMediaLibrary}>{libraryLoading ? 'Loading…' : 'Browse Media Library'}</Button>
						</div>
						{#if libraryMedia.length > 0}
							<select value={selectedLibraryMediaId} onchange={chooseLibraryMedia} class="h-10 w-full rounded-md border bg-background px-3 text-sm">
								<option value="">Select an existing source…</option>
								{#each libraryMedia as item (item.id)}
									<option value={item.id}>{(autoVideoMediaKind(item.mime_type) ?? 'media').toUpperCase()} · {item.id.slice(0, 8)} · {((item.size ?? 0) / 1024 / 1024).toFixed(1)} MB</option>
								{/each}
							</select>
						{/if}
						{#if sourceDraft}<p class="text-xs text-muted-foreground">Selected: {sourceDraft.label}</p>{/if}
					</div>
				{/if}

				<label class="block space-y-2 text-sm font-medium">
					<span>Custom topic <span class="font-normal text-muted-foreground">optional</span></span>
					<input bind:value={customTopic} maxlength="500" class="h-10 w-full rounded-md border bg-background px-3 text-sm" placeholder="A specific documentary topic or angle" />
				</label>
				<label class="block max-w-xs space-y-2 text-sm font-medium">
					<span>Language</span>
					<select bind:value={language} class="h-10 w-full rounded-md border bg-background px-3 text-sm">
						<option value="en-US">English (US)</option>
						<option value="vi-VN">Tiếng Việt</option>
					</select>
				</label>
				<Button type="button" disabled={busyAction !== '' || !workspaceId()} onclick={createRun}>{busyAction === 'create' ? 'Creating…' : 'Start documentary run'}</Button>
			</div>

			<aside class="space-y-3 rounded-lg border bg-muted/20 p-4">
				<div>
					<h3 class="font-medium">Resume a run</h3>
					<p class="mt-1 text-xs text-muted-foreground">Documentary planning is stored before the Video Editor project exists.</p>
				</div>
				<input bind:value={resumeRunId} class="h-10 w-full rounded-md border bg-background px-3 text-sm" placeholder="Documentary run ID" />
				<Button type="button" size="sm" variant="outline" class="w-full" disabled={busyAction !== '' || !resumeRunId.trim() || !workspaceId()} onclick={resumeRun}>{busyAction === 'resume' ? 'Loading…' : 'Resume run'}</Button>
			</aside>
		</div>
	{:else}
		<div class="space-y-4">
			<div class="flex flex-wrap items-center justify-between gap-3 rounded-lg border bg-muted/20 p-3 text-xs text-muted-foreground">
				<span>Run {run.id} · generation {run.generationVersion}</span>
				<span>{run.providerManifest.script || run.providerManifest.ideas || 'planner pending'}</span>
			</div>
			<DocumentaryStepNav {run} {activeStep} onselect={(step) => (activeStep = step)} />

			{#if activeStep === 'source'}
				<div class="space-y-4 rounded-lg border p-4">
					<div class="grid gap-4 sm:grid-cols-2">
						<label class="space-y-2 text-sm font-medium">
							<span>Source</span>
							<select bind:value={sourceMode} class="h-10 w-full rounded-md border bg-background px-3 text-sm">
								<option value="none">Skip source</option>
								<option value="text">Text</option>
								<option value="url">Public URL</option>
								<option value="media">PDF / image / video / Media Library</option>
							</select>
						</label>
						<div class="self-end text-xs text-muted-foreground">Changing source marks dependent AI outputs stale; previous outputs remain visible until regenerated.</div>
					</div>
					{#if sourceMode === 'text' || sourceMode === 'url'}
						<textarea bind:value={sourceValue} rows="7" maxlength="50000" class="w-full resize-y rounded-md border bg-background px-3 py-2 text-sm"></textarea>
					{:else if sourceMode === 'media'}
						<div class="flex flex-wrap items-center gap-2">
							<label class="inline-flex h-9 cursor-pointer items-center rounded-md border bg-background px-3 text-xs font-medium hover:bg-muted">
								{sourceUploading ? 'Uploading…' : 'Choose PDF / Image / Video'}
								<input type="file" class="sr-only" accept="application/pdf,image/*,video/*" disabled={sourceUploading} onchange={uploadSourceFile} />
							</label>
							<Button type="button" size="sm" variant="outline" onclick={loadMediaLibrary} disabled={libraryLoading}>{libraryLoading ? 'Loading…' : 'Browse library'}</Button>
							{#if sourceDraft}<span class="text-xs text-muted-foreground">{sourceDraft.label}</span>{/if}
						</div>
						{#if libraryMedia.length > 0}
							<select value={selectedLibraryMediaId} onchange={chooseLibraryMedia} class="h-10 w-full rounded-md border bg-background px-3 text-sm">
								<option value="">Select an existing source…</option>
								{#each libraryMedia as item (item.id)}<option value={item.id}>{(autoVideoMediaKind(item.mime_type) ?? 'media').toUpperCase()} · {item.id.slice(0, 8)}</option>{/each}
							</select>
						{/if}
					{/if}
					<Button type="button" size="sm" disabled={busyAction !== ''} onclick={saveSource}>{busyAction === 'source' ? 'Saving…' : 'Save source'}</Button>
				</div>
			{:else if activeStep === 'topic'}
				<div class="space-y-4 rounded-lg border p-4">
					<div class="grid gap-4 sm:grid-cols-2">
						<label class="space-y-2 text-sm font-medium">
							<span>Niche</span>
							<select bind:value={niche} class="h-10 w-full rounded-md border bg-background px-3 text-sm">{#each NICHE_OPTIONS as option (option)}<option value={option}>{option}</option>{/each}</select>
						</label>
						<label class="space-y-2 text-sm font-medium">
							<span>Language</span>
							<select bind:value={language} class="h-10 w-full rounded-md border bg-background px-3 text-sm"><option value="en-US">English (US)</option><option value="vi-VN">Tiếng Việt</option></select>
						</label>
					</div>
					<input bind:value={customTopic} maxlength="500" class="h-10 w-full rounded-md border bg-background px-3 text-sm" placeholder="Optional custom topic or angle" />
					<div class="flex flex-wrap gap-2">
						<Button type="button" size="sm" disabled={busyAction !== ''} onclick={saveTopic}>{busyAction === 'topic' ? 'Saving…' : 'Save topic'}</Button>
						<Button type="button" size="sm" variant="outline" disabled={busyAction !== '' || (!run.niche && !run.customTopic && !run.source)} onclick={generateIdeas}>{busyAction === 'ideas' ? 'Generating 10 ideas…' : 'Generate 10 ideas'}</Button>
					</div>
				</div>
			{:else if activeStep === 'ideas'}
				<div class="space-y-4">
					<div class="flex flex-wrap items-center justify-between gap-2">
						<div><h3 class="font-semibold">Ten documentary directions</h3><p class="text-xs text-muted-foreground">Choose one direction. Regenerating ideas keeps old downstream work visible but marks it stale.</p></div>
					<Button type="button" size="sm" variant="outline" disabled={busyAction !== ''} onclick={generateIdeas}>{busyAction === 'ideas' ? 'Generating…' : 'Regenerate 10 ideas'}</Button>
					</div>
					{#if run.ideas.length > 0}
						<DocumentaryIdeas ideas={run.ideas} selectedId={run.selectedIdeaId} disabled={busyAction !== ''} onselect={selectIdea} />
					{:else}
						<InlineNotice tone="warning">Generate ideas from your topic or source first.</InlineNotice>
					{/if}
				</div>
			{:else if activeStep === 'duration'}
				<div class="space-y-3 rounded-lg border p-4">
					<h3 class="font-semibold">Documentary duration</h3>
					<select value={run.targetDurationSeconds ?? 60} onchange={selectDuration} disabled={busyAction !== ''} class="h-10 w-full max-w-xs rounded-md border bg-background px-3 text-sm">
						{#each DOCUMENTARY_DURATIONS as seconds (seconds)}<option value={seconds}>{seconds < 60 ? `${seconds} seconds` : `${seconds / 60} minute${seconds === 60 ? '' : 's'}`}</option>{/each}
					</select>
					<p class="text-xs text-muted-foreground">Default narration rate is about 150 words/minute. Measured TTS duration becomes authoritative after voice generation.</p>
				</div>
			{:else if activeStep === 'script'}
				<div class="space-y-4">
					<div class="flex flex-wrap items-center justify-between gap-2">
						<div><h3 class="font-semibold">Continuous documentary narration</h3><p class="text-xs text-muted-foreground">No chapter headings, sponsor copy, or forced CTA.</p></div>
						<Button type="button" size="sm" variant="outline" disabled={busyAction !== '' || !run.targetDurationSeconds || (!run.selectedIdeaId && !run.customTopic)} onclick={generateScript}>{busyAction === 'script' ? 'Writing…' : run.script ? 'Regenerate script' : 'Generate script'}</Button>
					</div>
					{#if run.script}<DocumentaryScript script={run.script} disabled={busyAction !== ''} onsave={saveScript} />{:else}<InlineNotice tone="warning">Choose an idea and duration, then generate the narration.</InlineNotice>{/if}
				</div>
			{:else if activeStep === 'voice'}
				<div class="space-y-3 rounded-lg border p-4">
					<h3 class="font-semibold">Narration voice</h3>
					<p class="text-sm text-muted-foreground">Voice generation remains provider-neutral. The next implementation step will chunk long narration, import editable audio assets, and retime beats from measured speech duration.</p>
					{#if run.voice}<p class="text-xs">{run.voice.chunks.length} voice chunks · {run.voice.measuredDurationSeconds?.toFixed(1) ?? 'estimated'}s</p>{/if}
				</div>
			{:else if activeStep === 'beats'}
				<div class="space-y-4">
					<div class="flex flex-wrap items-center justify-between gap-2">
						<div><h3 class="font-semibold">Visual beats</h3><p class="text-xs text-muted-foreground">Usually 2–3 seconds each. Timing stays deterministic until measured voice duration is available.</p></div>
						<Button type="button" size="sm" variant="outline" disabled={busyAction !== '' || !run.script} onclick={generateBeats}>{busyAction === 'beats' ? 'Segmenting…' : run.beats.length ? 'Regenerate beats' : 'Generate beats'}</Button>
					</div>
					{#if run.beats.length > 0}
						<DocumentaryBeatEditor
							beats={run.beats}
							visualPlans={run.visualPlans}
							disabled={busyAction !== ''}
							onchange={saveBeats}
							onvisualchange={saveVisualPlans}
							onregeneratevisual={run.visualPlans.length > 0 ? regenerateBeatVisual : undefined}
						/>
					{/if}
				</div>
			{:else if activeStep === 'visuals'}
				<div class="space-y-4">
					<div class="flex flex-wrap items-center justify-between gap-2">
						<div><h3 class="font-semibold">Beat visual plans</h3><p class="text-xs text-muted-foreground">Original archival paper-collage prompts, one dominant visual concept per beat.</p></div>
						<Button type="button" size="sm" variant="outline" disabled={busyAction !== '' || run.beats.length === 0} onclick={generateVisuals}>{busyAction === 'visuals' ? 'Planning visuals…' : run.visualPlans.length ? 'Regenerate visuals' : 'Generate visual plans'}</Button>
					</div>
					{#if run.visualPlans.length > 0}<DocumentaryPromptPack plans={run.visualPlans} />{/if}
				</div>
			{:else if activeStep === 'animation'}
				<div class="space-y-3">
					<h3 class="font-semibold">Native paper-collage animation treatment</h3>
					<p class="text-sm text-muted-foreground">Vox Style keeps the camera locked or nearly locked. Paper elements assemble in stepped motion, then settle into a living poster. These briefs compile into native Auno Motion structures rather than opaque scene MP4s.</p>
					<div class="grid gap-2 md:grid-cols-2">
						{#each run.visualPlans as plan (plan.beatId)}
							<div class="rounded-lg border bg-muted/20 p-3 text-xs"><strong>{plan.beatId}</strong> · {plan.animation.camera} · {plan.animation.assemblyOrder} · hold {(plan.animation.holdRatio * 100).toFixed(0)}%</div>
						{/each}
					</div>
				</div>
			{:else if activeStep === 'thumbnails'}
				<div class="space-y-4">
					<div class="flex flex-wrap items-center justify-between gap-2">
						<div><h3 class="font-semibold">Thumbnail Pack</h3><p class="text-xs text-muted-foreground">Three high-contrast 16:9 concepts in the same documentary world.</p></div>
						<Button type="button" size="sm" variant="outline" disabled={busyAction !== '' || !run.script} onclick={generateThumbnails}>{busyAction === 'thumbnails' ? 'Generating…' : run.thumbnails.length ? 'Regenerate thumbnails' : 'Generate 3 thumbnails'}</Button>
					</div>
					{#if run.thumbnails.length > 0}<DocumentaryThumbnails plans={run.thumbnails} />{/if}
				</div>
			{:else if activeStep === 'project'}
				<div class="space-y-4 rounded-lg border p-4">
					<div>
						<h3 class="font-semibold">Native Video Editor handoff</h3>
						<p class="mt-1 text-sm text-muted-foreground">Compile every documentary beat into an editable 1920×1080 OpenPost project. Assigned Media Library images/videos remain native media clips; unresolved visuals stay editable paper placeholders.</p>
					</div>
					<div class="grid gap-2 text-xs text-muted-foreground sm:grid-cols-3">
						<div class="rounded-md bg-muted/30 p-3"><strong class="block text-foreground">{run.beats.length}</strong> native beats</div>
						<div class="rounded-md bg-muted/30 p-3"><strong class="block text-foreground">{run.visualPlans.filter((plan) => plan.mediaId).length}</strong> assigned media</div>
						<div class="rounded-md bg-muted/30 p-3"><strong class="block text-foreground">Vox Style</strong> editable motion</div>
					</div>
					{#if run.projectId}
						<InlineNotice tone="success">Native project linked: {run.projectId}</InlineNotice>
					{/if}
					<Button type="button" disabled={busyAction !== '' || run.beats.length === 0} onclick={createOrOpenProject}>
						{busyAction === 'project' || busyAction === 'project-link' ? 'Creating native project…' : run.projectId ? 'Open in Video Editor' : 'Create & open in Video Editor'}
					</Button>
				</div>
			{/if}
		</div>
	{/if}
</section>
