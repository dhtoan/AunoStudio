import { planMotionGraph, type MotionSceneGraph } from '@auno/motion';
import { applyMotionGraphToProject } from '$lib/auno/motion/native-compiler';
import type {
	AutoVideoGenerationGraph,
	AutoVideoOwnedItem,
	AutoVideoSidecar,
	AutoVideoSource,
	AutoVideoStoryboard
} from '$lib/auno/auto-video/types';
import { createBlankProject } from '$lib/video-editor/project/defaults';
import type {
	Project,
	TimelineItem,
	TimelineMarker,
	TimelineTrack
} from '$lib/video-editor/project/types';
import { DOCUMENTARY_STYLE, type DocumentaryRun, type DocumentaryVisualPlan } from './types';

const WIDTH = 1920;
const HEIGHT = 1080;
const FPS = 30;

export interface DocumentaryCompileAsset {
	mediaId: string;
	kind: 'image' | 'video';
	fileName?: string;
	width: number;
	height: number;
	durationSeconds?: number;
	fps?: number;
}

export interface DocumentaryCompileResult {
	project: Project;
	sidecar: AutoVideoSidecar;
	motionGraph: MotionSceneGraph;
}

function track(id: string, name: string, kind: 'video' | 'audio', order: number, height = 72): TimelineTrack {
	return {
		id,
		name,
		kind,
		height,
		locked: false,
		syncLock: true,
		visible: true,
		muted: false,
		solo: false,
		...(kind === 'audio' ? { volume: 1 } : {}),
		order
	};
}

function documentaryTracks(): TimelineTrack[] {
	return [
		track('track-auno-labels', 'Auno Labels', 'video', 0, 64),
		track('track-auno-annotations', 'Auno Annotations', 'video', 1, 64),
		track('track-auno-motion', 'Auno Motion', 'video', 2, 72),
		track('track-video-main', 'Auno Visuals', 'video', 3, 96),
		track('track-auno-captions', 'Auno Captions', 'video', 4, 72),
		track('track-audio', 'Auno Voice', 'audio', 5, 72),
		track('track-auno-music', 'Auno Music', 'audio', 6, 72)
	];
}

function fitMedia(asset: DocumentaryCompileAsset): { width: number; height: number } {
	const sourceWidth = Math.max(1, asset.width || WIDTH);
	const sourceHeight = Math.max(1, asset.height || HEIGHT);
	const scale = Math.min(WIDTH / sourceWidth, HEIGHT / sourceHeight);
	return {
		width: Math.round(sourceWidth * scale),
		height: Math.round(sourceHeight * scale)
	};
}

function nativeMediaItem(
	beatId: string,
	from: number,
	durationInFrames: number,
	asset: DocumentaryCompileAsset
): TimelineItem {
	const sourceFps = asset.kind === 'video' ? Math.max(1, asset.fps || FPS) : undefined;
	const sourceDuration = asset.kind === 'video'
		? Math.max(1, Math.round(Math.max(asset.durationSeconds || durationInFrames / FPS, 1 / (sourceFps || FPS)) * (sourceFps || FPS)))
		: durationInFrames;
	const fit = fitMedia(asset);
	return {
		id: `${beatId}-media`,
		trackId: 'track-video-main',
		from,
		durationInFrames,
		label: asset.fileName || `${beatId} media`,
		type: asset.kind,
		mediaId: asset.mediaId,
		sourceStart: 0,
		sourceEnd: asset.kind === 'image' ? undefined : sourceDuration,
		sourceDuration,
		sourceFps,
		sourceWidth: asset.width,
		sourceHeight: asset.height,
		transform: {
			x: 0,
			y: 0,
			width: fit.width,
			height: fit.height,
			rotation: 0,
			opacity: 1
		}
	};
}

function placeholderBackground(beatId: string, from: number, durationInFrames: number, index: number): TimelineItem {
	return {
		id: `${beatId}-background`,
		trackId: 'track-video-main',
		from,
		durationInFrames,
		label: `${beatId} archival paper`,
		type: 'background',
		background: {
			kind: 'shader',
			shader: 'paper:paper-01',
			colors: ['#D7C3A3', '#B8A489', '#69635B', '#171411'],
			speed: 0,
			phase: index * 0.07,
			detail: 0.35,
			rotation: 0,
			scale: 1.04,
			offsetX: 0,
			offsetY: 0
		}
	};
}

function labelItem(
	beatId: string,
	from: number,
	durationInFrames: number,
	coreIdea: string,
	plan: DocumentaryVisualPlan | undefined
): TimelineItem {
	return {
		id: `${beatId}-text`,
		trackId: 'track-auno-labels',
		from,
		durationInFrames,
		label: `${beatId} label`,
		type: 'text',
		text: plan?.label?.trim() || coreIdea,
		textStylePresetId: 'clean-title',
		fontSize: 54,
		fontWeight: 700,
		color: '#171411',
		backgroundColor: '#F0E5D1E6',
		textAlign: 'left',
		verticalAlign: 'middle',
		lineHeight: 1.04,
		paddingX: 28,
		paddingY: 18,
		transform: {
			x: WIDTH * 0.08,
			y: HEIGHT * 0.78,
			width: WIDTH * 0.54,
			height: HEIGHT * 0.16,
			opacity: 1
		}
	};
}

function annotationItem(
	beatId: string,
	from: number,
	durationInFrames: number,
	plan: DocumentaryVisualPlan | undefined
): TimelineItem | null {
	const supports = plan?.supports?.filter(Boolean) ?? [];
	if (supports.length === 0) return null;
	return {
		id: `${beatId}-annotation`,
		trackId: 'track-auno-annotations',
		from,
		durationInFrames,
		label: `${beatId} annotation`,
		type: 'text',
		text: supports.slice(0, 3).join(' · '),
		fontSize: 28,
		fontWeight: 500,
		color: '#171411',
		backgroundColor: '#D7C3A3E6',
		textAlign: 'left',
		verticalAlign: 'middle',
		lineHeight: 1.1,
		paddingX: 18,
		paddingY: 12,
		transform: {
			x: WIDTH * 0.72,
			y: HEIGHT * 0.16,
			width: WIDTH * 0.42,
			height: HEIGHT * 0.12,
			opacity: 1
		}
	};
}

function fallbackSource(run: DocumentaryRun): AutoVideoSource {
	if (run.source) return run.source;
	return {
		id: `${run.id}-source`,
		kind: 'text',
		label: 'Documentary topic',
		value: run.customTopic?.trim() || run.script?.text?.trim() || 'Auno Documentary project'
	};
}

function bridgeStoryboard(run: DocumentaryRun): AutoVideoStoryboard {
	return {
		version: 1,
		id: `${run.id}-storyboard`,
		format: 'guide',
		title: run.ideas.find((idea) => idea.id === run.selectedIdeaId)?.title || run.customTopic || 'Auno Documentary',
		language: run.language || 'en-US',
		targetDurationSeconds: run.targetDurationSeconds || Math.round(run.beats.reduce((sum, beat) => sum + beat.durationSeconds, 0)),
		scenes: run.beats.map((beat) => ({
			id: beat.id,
			role: 'step',
			title: beat.coreIdea,
			voice: beat.narration,
			visualIntent: beat.visualIntent === 'motion-composition' ? 'motion-composition' : beat.visualIntent === 'map' || beat.visualIntent === 'map-route' ? 'map' : beat.visualIntent === 'archival-photo' || beat.visualIntent === 'halftone-subject' ? 'image' : 'document',
			durationSeconds: beat.durationSeconds,
			sourceIds: beat.evidenceRefs
		}))
	};
}

function normalizeTrackOrders(project: Project): Project {
	if (!project.timeline) return project;
	const canonical = new Map(documentaryTracks().map((entry) => [entry.id, entry]));
	const existing = new Map(project.timeline.tracks.map((entry) => [entry.id, entry]));
	const tracks = documentaryTracks().map((entry) => ({ ...entry, ...(existing.get(entry.id) ?? {}), order: entry.order, name: entry.name }));
	for (const entry of project.timeline.tracks) {
		if (!canonical.has(entry.id)) tracks.push(entry);
	}
	tracks.sort((left, right) => left.order - right.order);
	return { ...project, timeline: { ...project.timeline, tracks } };
}

export function compileDocumentaryRunToProject(
	run: DocumentaryRun,
	assets: readonly DocumentaryCompileAsset[] = []
): DocumentaryCompileResult {
	const title = run.ideas.find((idea) => idea.id === run.selectedIdeaId)?.title || run.customTopic || 'Auno Documentary';
	let project = createBlankProject(title, { width: WIDTH, height: HEIGHT, fps: FPS });
	if (!project.timeline) throw new Error('Auno Documentary project timeline is unavailable.');
	project.id = run.projectId || project.id;
	project.timeline.tracks = documentaryTracks();

	const assetById = new Map(assets.map((asset) => [asset.mediaId, asset]));
	const visualByBeat = new Map(run.visualPlans.map((plan) => [plan.beatId, plan]));
	const items: TimelineItem[] = [];
	const markers: TimelineMarker[] = [];
	const ownedItems: AutoVideoOwnedItem[] = [];
	const blocks: AutoVideoGenerationGraph['blocks'] = [];

	for (const beat of run.beats) {
		const from = Math.max(0, Math.round(beat.startSeconds * FPS));
		const durationInFrames = Math.max(1, Math.round(beat.durationSeconds * FPS));
		const plan = visualByBeat.get(beat.id);
		const asset = plan?.mediaId ? assetById.get(plan.mediaId) : undefined;
		const beatOwned: string[] = [];

		if (asset) {
			const media = nativeMediaItem(beat.id, from, durationInFrames, asset);
			items.push(media);
			beatOwned.push(media.id);
			ownedItems.push({ itemId: media.id, sceneId: beat.id, category: 'visual' });
		} else {
			const background = placeholderBackground(beat.id, from, durationInFrames, beat.index);
			items.push(background);
			beatOwned.push(background.id);
			ownedItems.push({ itemId: background.id, sceneId: beat.id, category: 'visual' });
		}

		const label = labelItem(beat.id, from, durationInFrames, beat.coreIdea, plan);
		items.push(label);
		beatOwned.push(label.id);
		ownedItems.push({ itemId: label.id, sceneId: beat.id, category: 'visual' });

		const annotation = annotationItem(beat.id, from, durationInFrames, plan);
		if (annotation) {
			items.push(annotation);
			beatOwned.push(annotation.id);
			ownedItems.push({ itemId: annotation.id, sceneId: beat.id, category: 'visual' });
		}

		markers.push({ id: `${beat.id}-marker`, frame: from, label: `${beat.index + 1}. ${beat.coreIdea}`, color: '#C92828' });
		blocks.push({ sceneId: beat.id, ownedItemIds: beatOwned, userModifiedItemIds: [] });
	}

	project.timeline.items = items;
	project.timeline.markers = markers;
	project.timeline.transitions = [];
	project.timeline.currentFrame = 0;
	project.timeline.inPoint = 0;
	const totalFrames = run.beats.reduce((maximum, beat) => Math.max(maximum, Math.round((beat.startSeconds + beat.durationSeconds) * FPS)), 0);
	project.timeline.outPoint = totalFrames;
	project.duration = totalFrames / FPS;
	project.description = `Auno Documentary Long-form · Vox Style · ${run.language || 'en-US'}`;

	const motionGraph = planMotionGraph({
		projectId: project.id,
		style: DOCUMENTARY_STYLE,
		scenes: run.beats.map((beat) => ({
			id: beat.id,
			title: beat.coreIdea,
			voice: beat.narration,
			visualIntent: beat.visualIntent,
			durationSeconds: beat.durationSeconds
		}))
	});
	project = normalizeTrackOrders(applyMotionGraphToProject(project, motionGraph));

	for (const beat of run.beats) {
		const motionItemId = `${beat.id}-motion-composition`;
		if (project.timeline?.items.some((item) => item.id === motionItemId)) {
			ownedItems.push({ itemId: motionItemId, sceneId: beat.id, category: 'motion' });
			const block = blocks.find((entry) => entry.sceneId === beat.id);
			if (block && !block.ownedItemIds.includes(motionItemId)) block.ownedItemIds.push(motionItemId);
		}
	}

	const now = Date.now();
	const generationGraph: AutoVideoGenerationGraph = {
		version: 1,
		blocks,
		ownedItems,
		documentary: { runId: run.id, beatIds: run.beats.map((beat) => beat.id), style: DOCUMENTARY_STYLE },
		motion: { schemaVersion: 1, style: DOCUMENTARY_STYLE, seed: motionGraph.seed, brief: motionGraph.brief }
	};
	const sidecar: AutoVideoSidecar = {
		version: 1,
		projectId: project.id,
		generationVersion: Math.max(1, run.generationVersion),
		templateId: DOCUMENTARY_STYLE,
		createdAt: now,
		updatedAt: now,
		source: fallbackSource(run),
		storyboard: bridgeStoryboard(run),
		providerManifest: { ...run.providerManifest, documentary: DOCUMENTARY_STYLE },
		generationGraph
	};

	project.updatedAt = now;
	return { project, sidecar, motionGraph };
}
