import {
	createDocumentaryRun,
	generateDocumentaryBeats,
	generateDocumentaryIdeas,
	generateDocumentaryScript,
	generateDocumentaryVisuals,
	updateDocumentaryRun
} from './api';
import { createCloudDocumentaryProject } from './project-handoff';
import { workspaceCtx } from '$lib/stores/workspace.svelte';
import { editorSession } from '$lib/video-editor/editor.svelte';
import { timelineStore } from '$lib/video-editor/timeline/stores/timeline-store.svelte';
import type { Project, TimelineItem } from '$lib/video-editor/project/types';

interface VoxFixtureSummary {
	runId: string;
	projectId: string;
	mode: 'documentary-long-form';
	style: 'documentary-paper-collage';
	ideaCount: number;
	selectedIdeaId: string;
	targetDurationSeconds: number;
	scriptWordCount: number;
	scriptTargetWordCount: number;
	beatCount: number;
	visualPlanCount: number;
	nativeTimelineItemCount: number;
	compositionItemId: string;
	compositionId: string;
	controlId: string;
}

interface VoxDocumentaryTestHook {
	runFixture(): Promise<VoxFixtureSummary>;
	setCompositionOverride(input: {
		itemId: string;
		controlId: string;
		value: string;
	}): Promise<void>;
	readCompositionOverride(input: { itemId: string; controlId: string }): string | null;
	reloadProject(projectId: string): Promise<void>;
	seekBeat(
		index: number
	): Promise<{ index: number; frame: number; itemId: string; itemCount: number }>;
	exportEntryState(): Promise<{ available: boolean; durationFrames: number }>;
}

declare global {
	interface Window {
		__AUNO_DOCUMENTARY_TEST__?: VoxDocumentaryTestHook;
	}
}

async function activeWorkspaceId(): Promise<string> {
	if (!workspaceCtx.currentWorkspace?.id) await workspaceCtx.initialize();
	const workspaceId = workspaceCtx.currentWorkspace?.id?.trim();
	if (!workspaceId) throw new Error('Auno documentary E2E fixture requires an active workspace');
	return workspaceId;
}

async function waitForEditorProject(projectId?: string): Promise<void> {
	for (let attempt = 0; attempt < 160; attempt += 1) {
		const project = editorSession.project;
		if (!editorSession.loading && project && (!projectId || project.id === projectId)) return;
		await new Promise((resolve) => setTimeout(resolve, 25));
	}
	throw new Error(`Auno documentary editor project ${projectId ?? ''} did not become ready`);
}

function findCompositionFixture(project: Project) {
	const timeline = project.timeline;
	const item = timeline?.items.find(
		(candidate): candidate is TimelineItem & { type: 'composition'; compositionId: string } =>
			candidate.type === 'composition' && Boolean(candidate.compositionId)
	);
	if (!item?.compositionId)
		throw new Error('Vox E2E fixture did not compile an editable motion composition');
	const composition = timeline?.compositions?.find(
		(candidate) => candidate.id === item.compositionId
	);
	const control = composition?.compositionControls?.controls.find(
		(candidate) => candidate.id === 'paper-jitter'
	);
	if (!composition || !control)
		throw new Error('Vox E2E motion composition controls are unavailable');
	return { item, composition, control };
}

async function runFixture(): Promise<VoxFixtureSummary> {
	const workspaceId = await activeWorkspaceId();
	let run = await createDocumentaryRun({
		workspaceId,
		customTopic: 'A deterministic investigation of one public record',
		language: 'en-US'
	});
	run = await generateDocumentaryIdeas(workspaceId, run);
	const selectedIdeaId = run.ideas[0]?.id;
	if (!selectedIdeaId) throw new Error('Vox E2E fixture did not generate documentary ideas');
	run = await updateDocumentaryRun(workspaceId, {
		...run,
		selectedIdeaId,
		targetDurationSeconds: 300
	});
	run = await generateDocumentaryScript(workspaceId, run);
	run = await generateDocumentaryBeats(workspaceId, run);
	run = await generateDocumentaryVisuals(workspaceId, run);
	const handoff = await createCloudDocumentaryProject(workspaceId, run);
	const { item, composition, control } = findCompositionFixture(handoff.project);
	return {
		runId: run.id,
		projectId: handoff.projectId,
		mode: run.mode,
		style: run.style,
		ideaCount: run.ideas.length,
		selectedIdeaId: run.selectedIdeaId ?? '',
		targetDurationSeconds: run.targetDurationSeconds ?? 0,
		scriptWordCount: run.script?.wordCount ?? 0,
		scriptTargetWordCount: run.script?.targetWordCount ?? 0,
		beatCount: run.beats.length,
		visualPlanCount: run.visualPlans.length,
		nativeTimelineItemCount: handoff.project.timeline?.items.length ?? 0,
		compositionItemId: item.id,
		compositionId: composition.id,
		controlId: control.id
	};
}

async function setCompositionOverride(input: {
	itemId: string;
	controlId: string;
	value: string;
}): Promise<void> {
	await waitForEditorProject();
	const item = timelineStore.itemById.get(input.itemId);
	if (!item || item.type !== 'composition')
		throw new Error(`Composition item ${input.itemId} is unavailable`);
	timelineStore._updateItems([
		{
			id: item.id,
			patch: {
				compositionControlOverrides: {
					...(item.compositionControlOverrides ?? {}),
					[input.controlId]: input.value
				}
			}
		}
	]);
	editorSession.scheduleAutosave();
	await editorSession.flushAutosave();
}

function readCompositionOverride(input: { itemId: string; controlId: string }): string | null {
	const item = timelineStore.itemById.get(input.itemId);
	if (!item || item.type !== 'composition') return null;
	return item.compositionControlOverrides?.[input.controlId] ?? null;
}

async function reloadProject(projectId: string): Promise<void> {
	await editorSession.load(projectId, await activeWorkspaceId());
	await waitForEditorProject(projectId);
}

async function seekBeat(index: number): Promise<{
	index: number;
	frame: number;
	itemId: string;
	itemCount: number;
}> {
	const markers = [...timelineStore.markers].sort((left, right) => left.frame - right.frame);
	const marker = markers[index];
	if (!marker) throw new Error(`Vox E2E beat ${index} is unavailable`);
	timelineStore._setCurrentFrame(marker.frame);
	editorSession.syncTimelineClock();
	const item = timelineStore.items.find(
		(candidate) =>
			candidate.id.includes('beat-') &&
			marker.frame >= candidate.from &&
			marker.frame < candidate.from + candidate.durationInFrames
	);
	if (!item) throw new Error(`Vox E2E beat ${index} has no native timeline item`);
	return {
		index,
		frame: marker.frame,
		itemId: item.id,
		itemCount: markers.length
	};
}

async function exportEntryState(): Promise<{ available: boolean; durationFrames: number }> {
	await waitForEditorProject();
	return {
		available: Boolean(editorSession.project && timelineStore.items.length > 0),
		durationFrames: timelineStore.maxItemEndFrame
	};
}

export function installAunoDocumentaryE2EHook(): () => void {
	const previous = window.__AUNO_DOCUMENTARY_TEST__;
	window.__AUNO_DOCUMENTARY_TEST__ = {
		runFixture,
		setCompositionOverride,
		readCompositionOverride,
		reloadProject,
		seekBeat,
		exportEntryState
	};
	return () => {
		if (previous) window.__AUNO_DOCUMENTARY_TEST__ = previous;
		else delete window.__AUNO_DOCUMENTARY_TEST__;
	};
}
