import { page } from '$app/state';
import { planMotionGraph } from '@auno/motion';
import { applyMotionGraphToLiveTimeline } from '$lib/auno/motion/live-applier';
import { replaceOwnershipCategory } from '$lib/auno/auto-video/ownership';
import type { AutoVideoCaptionAsset, AutoVideoSidecar, AutoVideoVoiceAsset } from '$lib/auno/auto-video/types';
import { CloudVideoProjectRepository } from '$lib/video-editor/cloud/project-repository';
import { importCloudProjectAssetFile } from '$lib/video-editor/cloud/import-project-assets';
import {
	defaultLocalTtsVoice,
	generateLocalSpeech,
	isLocalTtsSupported,
	localTtsTags,
	type LocalTtsEngine
} from '$lib/video-editor/local-ai/tts/registry';
import { getStoredLocalTtsEngine } from '$lib/video-editor/local-ai/tts/preferences';
import { importGeneratedAudio } from '$lib/video-editor/media/import.svelte';
import type { MediaMetadata } from '$lib/video-editor/media/types';
import type { Project, TimelineItem } from '$lib/video-editor/project/types';
import { addSubtitleItemFromSrt } from '$lib/video-editor/transcript/captions';
import { execute, executeAtomic } from '$lib/video-editor/timeline/commands/command-store.svelte';
import { removeItems } from '$lib/video-editor/timeline/actions/items';
import { timelineStore } from '$lib/video-editor/timeline/stores/timeline-store.svelte';
import { DOCUMENTARY_STYLE, type DocumentaryBeat, type DocumentaryRun, type DocumentaryVoiceChunk } from './types';

const WORDS_PER_SECOND = 2.5;
const VOICE_TRACK_ID = 'track-audio';

export interface DocumentaryChunkMeasurement {
	chunkId: string;
	beatIds: string[];
	durationSeconds: number;
}

export interface DocumentaryNarrationPackage {
	kind: 'text-only';
	language: string;
	voiceDirection: string[];
	chunks: DocumentaryVoiceChunk[];
	script: string;
}

export interface GenerateDocumentaryVoiceResult {
	run: DocumentaryRun;
	sidecar: AutoVideoSidecar;
	assets: AutoVideoVoiceAsset[];
	caption?: AutoVideoCaptionAsset;
	narrationPackage?: DocumentaryNarrationPackage;
}

function words(text: string): string[] {
	return text.trim().split(/\s+/).filter(Boolean);
}

function estimatedSeconds(text: string): number {
	return words(text).length / WORDS_PER_SECOND;
}

function makeChunk(index: number, beatIds: string[], text: string): DocumentaryVoiceChunk {
	return {
		id: `voice-chunk-${String(index + 1).padStart(3, '0')}`,
		beatIds: [...new Set(beatIds)],
		text: text.trim()
	};
}

export function planVoiceChunks(
	beats: readonly DocumentaryBeat[],
	maxEstimatedSeconds = 25
): DocumentaryVoiceChunk[] {
	const safeMax = Number.isFinite(maxEstimatedSeconds) ? Math.max(1, maxEstimatedSeconds) : 25;
	const maxWords = Math.max(1, Math.floor(safeMax * WORDS_PER_SECOND));
	const chunks: DocumentaryVoiceChunk[] = [];
	let chunkBeatIds: string[] = [];
	let chunkWords: string[] = [];

	const flush = () => {
		if (chunkWords.length === 0) return;
		chunks.push(makeChunk(chunks.length, chunkBeatIds, chunkWords.join(' ')));
		chunkBeatIds = [];
		chunkWords = [];
	};

	for (const beat of beats) {
		const beatWords = words(beat.narration);
		if (beatWords.length === 0) continue;
		if (beatWords.length <= maxWords) {
			if (chunkWords.length > 0 && chunkWords.length + beatWords.length > maxWords) flush();
			chunkWords.push(...beatWords);
			chunkBeatIds.push(beat.id);
			if (chunkWords.length >= maxWords) flush();
			continue;
		}
		flush();
		let cursor = 0;
		while (cursor < beatWords.length) {
			const capacity = maxWords - chunkWords.length;
			if (capacity <= 0) {
				flush();
				continue;
			}
			const take = Math.min(capacity, beatWords.length - cursor);
			chunkWords.push(...beatWords.slice(cursor, cursor + take));
			chunkBeatIds.push(beat.id);
			cursor += take;
			flush();
		}
	}
	flush();
	return chunks.filter((chunk) => estimatedSeconds(chunk.text) <= safeMax + 1e-9);
}

export function redistributeBeatDurations(
	beats: readonly DocumentaryBeat[],
	chunkMeasurements: readonly DocumentaryChunkMeasurement[]
): DocumentaryBeat[] {
	if (beats.length === 0) return [];
	const sourceById = new Map(beats.map((beat) => [beat.id, beat]));
	const measuredByBeat = new Map<string, number>();
	const touched = new Set<string>();

	for (const measurement of chunkMeasurements) {
		const duration = Number.isFinite(measurement.durationSeconds)
			? Math.max(0, measurement.durationSeconds)
			: 0;
		const ids = [...new Set(measurement.beatIds)].filter((id) => sourceById.has(id));
		if (duration <= 0 || ids.length === 0) continue;
		const weights = ids.map((id) => Math.max(0.001, sourceById.get(id)!.durationSeconds));
		const totalWeight = weights.reduce((sum, value) => sum + value, 0);
		let assigned = 0;
		ids.forEach((id, index) => {
			const share = index === ids.length - 1
				? duration - assigned
				: duration * (weights[index]! / totalWeight);
			measuredByBeat.set(id, (measuredByBeat.get(id) ?? 0) + share);
			touched.add(id);
			assigned += share;
		});
	}

	const allMeasured = beats.every((beat) => touched.has(beat.id));
	let cursor = 0;
	return beats.map((beat, index) => {
		const measured = measuredByBeat.get(beat.id);
		const durationSeconds = measured !== undefined && measured > 0
			? measured
			: allMeasured
				? 0.001
				: Math.max(0.001, beat.durationSeconds);
		const next = { ...beat, index, startSeconds: cursor, durationSeconds };
		cursor += durationSeconds;
		return next;
	});
}

function isCloudProject(): boolean {
	return page.url.searchParams.get('storage') === 'cloud';
}

async function importGeneratedProjectAudio(options: {
	projectId: string;
	workspaceId: string;
	file: File;
	duration: number;
	tags: string[];
}): Promise<MediaMetadata> {
	if (isCloudProject()) {
		if (!options.workspaceId.trim()) throw new Error('A workspace is required for cloud documentary assets.');
		const repository = new CloudVideoProjectRepository<Project>(options.workspaceId);
		const media = await importCloudProjectAssetFile({
			projectId: options.projectId,
			repository,
			file: options.file,
			tags: options.tags
		});
		if (!media) throw new Error('Generated documentary audio could not be imported into the cloud project.');
		return media;
	}
	return importGeneratedAudio(options.file, {
		projectId: options.projectId,
		duration: options.duration,
		tags: options.tags
	});
}

function audioItem(options: {
	id: string;
	media: MediaMetadata;
	from: number;
	label: string;
}): TimelineItem {
	const fps = timelineStore.fps;
	const sourceFps = options.media.fps > 0 ? options.media.fps : fps;
	const durationInFrames = Math.max(1, Math.round(options.media.duration * fps));
	const sourceDuration = Math.max(1, Math.round(options.media.duration * sourceFps));
	return {
		id: options.id,
		trackId: VOICE_TRACK_ID,
		from: options.from,
		durationInFrames,
		label: options.label,
		type: 'audio',
		mediaId: options.media.id,
		originId: crypto.randomUUID(),
		sourceStart: 0,
		sourceEnd: sourceDuration,
		sourceDuration,
		sourceFps,
		volume: 1
	};
}

function beatFrameMap(beats: readonly DocumentaryBeat[]): Map<string, { from: number; duration: number }> {
	const fps = timelineStore.fps;
	return new Map(
		beats.map((beat) => [
			beat.id,
			{
				from: Math.max(0, Math.round(beat.startSeconds * fps)),
				duration: Math.max(1, Math.round(beat.durationSeconds * fps))
			}
		])
	);
}

function retimeDocumentaryTimeline(beats: readonly DocumentaryBeat[]): void {
	const ranges = beatFrameMap(beats);
	const markerFrames = new Map(beats.map((beat) => [`${beat.id}-marker`, ranges.get(beat.id)!.from]));
	const updates: Array<{ id: string; patch: Partial<TimelineItem> }> = [];
	for (const item of timelineStore.items) {
		const beat = beats.find((candidate) => item.id.startsWith(`${candidate.id}-`));
		if (!beat || item.type === 'audio') continue;
		const range = ranges.get(beat.id)!;
		updates.push({ id: item.id, patch: { from: range.from, durationInFrames: range.duration } });
	}
	const outPoint = beats.reduce(
		(maximum, beat) => Math.max(maximum, (ranges.get(beat.id)?.from ?? 0) + (ranges.get(beat.id)?.duration ?? 0)),
		0
	);
	executeAtomic('AUNO_RETIME_DOCUMENTARY_BEATS', () => {
		if (updates.length > 0) timelineStore._updateItems(updates);
		timelineStore._setMarkers(
			timelineStore.markers.map((marker) => {
				const frame = markerFrames.get(marker.id);
				return frame === undefined ? marker : { ...marker, frame };
			})
		);
		timelineStore.setAll({ outPoint });
	});
}

function formatSrtTimestamp(seconds: number): string {
	const milliseconds = Math.max(0, Math.round(seconds * 1000));
	const hours = Math.floor(milliseconds / 3_600_000);
	const minutes = Math.floor((milliseconds % 3_600_000) / 60_000);
	const secs = Math.floor((milliseconds % 60_000) / 1000);
	const ms = milliseconds % 1000;
	return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:${String(secs).padStart(2, '0')},${String(ms).padStart(3, '0')}`;
}

function createDocumentaryCaptions(beats: readonly DocumentaryBeat[]): AutoVideoCaptionAsset {
	const srt = beats.map((beat, index) => {
		const start = beat.startSeconds;
		const end = beat.startSeconds + beat.durationSeconds;
		return `${index + 1}\n${formatSrtTimestamp(start)} --> ${formatSrtTimestamp(end)}\n${beat.narration.trim()}\n`;
	}).join('\n');
	const itemId = addSubtitleItemFromSrt(srt);
	return { itemId, generatedAt: Date.now(), source: 'script' };
}

export function narrationPackage(run: DocumentaryRun, maxEstimatedSeconds = 25): DocumentaryNarrationPackage {
	return {
		kind: 'text-only',
		language: run.language || 'en-US',
		voiceDirection: run.voice?.direction?.length
			? [...run.voice.direction]
			: ['calm', 'restrained', 'evidence-led', 'documentary'],
		chunks: planVoiceChunks(run.beats, maxEstimatedSeconds),
		script: run.script?.text ?? run.beats.map((beat) => beat.narration).join(' ')
	};
}

export async function generateDocumentaryVoice(options: {
	projectId: string;
	workspaceId: string;
	run: DocumentaryRun;
	sidecar: AutoVideoSidecar;
	engine?: LocalTtsEngine;
	voice?: string;
	onProgress?: (completed: number, total: number) => void;
}): Promise<GenerateDocumentaryVoiceResult> {
	const engine = options.engine ?? getStoredLocalTtsEngine();
	const plannedChunks = planVoiceChunks(options.run.beats, 25);
	if (!isLocalTtsSupported(engine)) {
		return {
			run: options.run,
			sidecar: options.sidecar,
			assets: [],
			narrationPackage: narrationPackage(options.run)
		};
	}

	const voice = options.voice ?? defaultLocalTtsVoice(engine);
	const previousVoices = options.sidecar.generationGraph?.media?.voices ?? [];
	if (previousVoices.length > 0) removeItems(previousVoices.map((asset) => asset.itemId), false);
	const previousCaption = options.sidecar.generationGraph?.media?.captions;
	if (previousCaption) removeItems([previousCaption.itemId], false);

	const generated: Array<{ chunk: DocumentaryVoiceChunk; media: MediaMetadata; duration: number }> = [];
	for (const [index, chunk] of plannedChunks.entries()) {
		const speech = await generateLocalSpeech({
			engine,
			text: chunk.text,
			voice,
			language: options.run.language || 'en-US',
			speed: 1
		});
		const media = await importGeneratedProjectAudio({
			projectId: options.projectId,
			workspaceId: options.workspaceId,
			file: speech.file,
			duration: speech.duration,
			tags: [...localTtsTags(engine, voice), 'auno-documentary', `auno-chunk:${chunk.id}`]
		});
		generated.push({ chunk, media, duration: speech.duration });
		options.onProgress?.(index + 1, plannedChunks.length);
	}

	const measurements = generated.map((entry) => ({
		chunkId: entry.chunk.id,
		beatIds: entry.chunk.beatIds,
		durationSeconds: entry.duration
	}));
	const beats = redistributeBeatDurations(options.run.beats, measurements);
	retimeDocumentaryTimeline(beats);

	const savedSeed = options.sidecar.generationGraph?.motion?.seed;
	const customization = options.sidecar.generationGraph?.motion?.customization;
	const graph = planMotionGraph({
		projectId: options.projectId,
		style: DOCUMENTARY_STYLE,
		seed: savedSeed,
		customization,
		scenes: beats.map((beat) => ({
			id: beat.id,
			title: beat.coreIdea,
			voice: beat.narration,
			visualIntent: beat.visualIntent,
			durationSeconds: beat.durationSeconds
		}))
	});
	const applied = applyMotionGraphToLiveTimeline({ graph, width: 1920, height: 1080 });

	const ranges = beatFrameMap(beats);
	const assets: AutoVideoVoiceAsset[] = [];
	execute('AUNO_INSERT_DOCUMENTARY_VOICE', () => {
		const items = [...timelineStore.items];
		for (const entry of generated) {
			const firstBeat = entry.chunk.beatIds.map((id) => beats.find((beat) => beat.id === id)).find(Boolean);
			if (!firstBeat) continue;
			const from = ranges.get(firstBeat.id)?.from ?? 0;
			const itemId = `auno-documentary-voice-${entry.chunk.id}-${crypto.randomUUID()}`;
			items.push(audioItem({ id: itemId, media: entry.media, from, label: `Documentary voice · ${entry.chunk.id}` }));
			assets.push({
				sceneId: entry.chunk.id,
				itemId,
				mediaId: entry.media.id,
				durationSeconds: entry.duration,
				engine,
				voice
			});
		}
		timelineStore._setItems(items);
	});

	const caption = createDocumentaryCaptions(beats);
	const nextRun: DocumentaryRun = {
		...options.run,
		currentStep: 'voice',
		beats,
		voice: {
			provider: engine,
			voice,
			direction: options.run.voice?.direction?.length ? options.run.voice.direction : ['calm', 'restrained', 'evidence-led'],
			chunks: generated.map((entry, index) => ({
				...entry.chunk,
				mediaId: entry.media.id,
				itemId: assets[index]?.itemId,
				durationSeconds: entry.duration
			})),
			measuredDurationSeconds: generated.reduce((sum, entry) => sum + entry.duration, 0),
			fingerprint: `${options.run.id}:${generated.map((entry) => `${entry.chunk.id}:${entry.duration.toFixed(3)}`).join('|')}`
		}
	};
	const withMotionOwnership: AutoVideoSidecar = {
		...options.sidecar,
		generationGraph: {
			...options.sidecar.generationGraph,
			version: 1,
			blocks: options.sidecar.generationGraph?.blocks ?? [],
			ownedItems: replaceOwnershipCategory(
				options.sidecar,
				'motion',
				applied.ownedItems.map((item) => ({ ...item, category: 'motion' as const }))
			)
		}
	};
	const withVoiceOwnership: AutoVideoSidecar = {
		...withMotionOwnership,
		generationGraph: {
			...withMotionOwnership.generationGraph!,
			ownedItems: replaceOwnershipCategory(
				withMotionOwnership,
				'voice',
				assets.map((asset) => ({ itemId: asset.itemId, sceneId: asset.sceneId, category: 'voice' as const }))
			)
		}
	};
	const ownedItems = replaceOwnershipCategory(withVoiceOwnership, 'caption', [
		{ itemId: caption.itemId, category: 'caption' }
	]);
	const nextSidecar: AutoVideoSidecar = {
		...options.sidecar,
		generationVersion: options.sidecar.generationVersion + 1,
		updatedAt: Date.now(),
		storyboard: {
			...options.sidecar.storyboard,
			targetDurationSeconds: generated.reduce((sum, entry) => sum + entry.duration, 0),
			scenes: options.sidecar.storyboard.scenes.map((scene) => {
				const beat = beats.find((candidate) => candidate.id === scene.id);
				return beat ? { ...scene, voice: beat.narration, durationSeconds: beat.durationSeconds } : scene;
			})
		},
		providerManifest: { ...options.sidecar.providerManifest, voice: `${engine}:${voice}` },
		generationGraph: {
			...options.sidecar.generationGraph,
			version: 1,
			blocks: options.sidecar.generationGraph?.blocks ?? [],
			ownedItems,
			media: { ...options.sidecar.generationGraph?.media, voices: assets, captions: caption },
			motion: {
				...options.sidecar.generationGraph?.motion,
				schemaVersion: 1,
				style: DOCUMENTARY_STYLE,
				seed: graph.seed,
				brief: graph.brief,
				customization
			}
		}
	};
	return { run: nextRun, sidecar: nextSidecar, assets, caption };
}
