import { page } from '$app/state';
import type { Project, TimelineItem } from '$lib/video-editor/project/types';
import type { MediaMetadata } from '$lib/video-editor/media/types';
import { mediaPool } from '$lib/video-editor/media/pool.svelte';
import { importGeneratedAudio } from '$lib/video-editor/media/import.svelte';
import { CloudVideoProjectRepository } from '$lib/video-editor/cloud/project-repository';
import { importCloudProjectAssetFile } from '$lib/video-editor/cloud/import-project-assets';
import { timelineStore } from '$lib/video-editor/timeline/stores/timeline-store.svelte';
import { execute, executeAtomic } from '$lib/video-editor/timeline/commands/command-store.svelte';
import { removeItems } from '$lib/video-editor/timeline/actions/items';
import { addSubtitleItemFromSrt } from '$lib/video-editor/transcript/captions';
import {
	defaultLocalTtsVoice,
	generateLocalSpeech,
	isLocalTtsSupported,
	localTtsTags,
	type LocalTtsEngine
} from '$lib/video-editor/local-ai/tts/registry';
import { getStoredLocalTtsEngine } from '$lib/video-editor/local-ai/tts/preferences';
import {
	generateLocalMusic,
	inspectMusicGenerationSupport,
	musicGenerationTags
} from '$lib/video-editor/local-ai/music/ace-step-service';
import { replaceOwnershipCategory } from './ownership';
import type {
	AutoVideoCaptionAsset,
	AutoVideoMusicAsset,
	AutoVideoScene,
	AutoVideoSidecar,
	AutoVideoVoiceAsset
} from './types';

const VOICE_TRACK_ID = 'track-audio';
const MUSIC_TRACK_ID = 'track-auno-music';

function isCloudProject(): boolean {
	return page.url.searchParams.get('storage') === 'cloud';
}

function sceneTextItemId(scene: AutoVideoScene): string {
	return `${scene.id}-text`;
}

function sceneBackgroundItemId(scene: AutoVideoScene): string {
	return `${scene.id}-background`;
}

async function importGeneratedProjectAudio(options: {
	projectId: string;
	workspaceId: string;
	file: File;
	duration: number;
	tags: string[];
}): Promise<MediaMetadata> {
	if (isCloudProject()) {
		if (!options.workspaceId.trim()) throw new Error('A workspace is required for cloud project assets.');
		const repository = new CloudVideoProjectRepository<Project>(options.workspaceId);
		const media = await importCloudProjectAssetFile({
			projectId: options.projectId,
			repository,
			file: options.file,
			tags: options.tags
		});
		if (!media) throw new Error('Generated audio could not be imported into the cloud project.');
		return media;
	}
	return importGeneratedAudio(options.file, {
		projectId: options.projectId,
		duration: options.duration,
		tags: options.tags
	});
}

function audioTimelineItem(options: {
	id: string;
	media: MediaMetadata;
	trackId: string;
	from: number;
	volume?: number;
	label?: string;
}): TimelineItem {
	const fps = timelineStore.fps;
	const sourceFps = options.media.fps > 0 ? options.media.fps : fps;
	const durationInFrames = Math.max(1, Math.round(options.media.duration * fps));
	return {
		id: options.id,
		trackId: options.trackId,
		from: options.from,
		durationInFrames,
		label: options.label ?? options.media.fileName,
		type: 'audio',
		mediaId: options.media.id,
		originId: crypto.randomUUID(),
		sourceStart: 0,
		sourceEnd: Math.max(1, Math.round(options.media.duration * sourceFps)),
		sourceDuration: Math.max(1, Math.round(options.media.duration * sourceFps)),
		sourceFps,
		volume: options.volume ?? 1
	};
}

function currentSceneFrames(scene: AutoVideoScene): { from: number; duration: number } {
	const background = timelineStore.itemById.get(sceneBackgroundItemId(scene));
	if (background) return { from: background.from, duration: background.durationInFrames };
	const text = timelineStore.itemById.get(sceneTextItemId(scene));
	if (text) return { from: text.from, duration: text.durationInFrames };
	return { from: 0, duration: Math.max(1, Math.round(scene.durationSeconds * timelineStore.fps)) };
}

function retimeScenes(sidecar: AutoVideoSidecar, durations: Map<string, number>): void {
	const fps = timelineStore.fps;
	let cursor = 0;
	const updates: Array<{ id: string; patch: Partial<TimelineItem> }> = [];
	const markerFrames = new Map<string, number>();
	for (const scene of sidecar.storyboard.scenes) {
		const seconds = Math.max(2, durations.get(scene.id) ?? scene.durationSeconds);
		const durationInFrames = Math.max(fps * 2, Math.ceil((seconds + 0.15) * fps));
		for (const itemId of [sceneBackgroundItemId(scene), sceneTextItemId(scene)]) {
			if (timelineStore.itemById.has(itemId)) {
				updates.push({ id: itemId, patch: { from: cursor, durationInFrames } });
			}
		}
		markerFrames.set(`${scene.id}-marker`, cursor);
		cursor += durationInFrames;
	}

	executeAtomic('AUNO_RETIME_VOICE_SCENES', () => {
		if (updates.length > 0) timelineStore._updateItems(updates);
		timelineStore._setMarkers(
			timelineStore.markers.map((marker) => {
				const frame = markerFrames.get(marker.id);
				return frame === undefined ? marker : { ...marker, frame };
			})
		);
		timelineStore.setAll({ outPoint: cursor });
	});
}

export async function generateAutoVideoVoices(options: {
	projectId: string;
	workspaceId: string;
	sidecar: AutoVideoSidecar;
	engine?: LocalTtsEngine;
	voice?: string;
	onProgress?: (completed: number, total: number) => void;
}): Promise<{ sidecar: AutoVideoSidecar; assets: AutoVideoVoiceAsset[] }> {
	const engine = options.engine ?? getStoredLocalTtsEngine();
	if (!isLocalTtsSupported(engine)) throw new Error(`${engine} TTS is not supported in this browser.`);
	const voice = options.voice ?? defaultLocalTtsVoice(engine);
	const previous = options.sidecar.generationGraph?.media?.voices ?? [];
	if (previous.length > 0) removeItems(previous.map((asset) => asset.itemId), false);

	const generated: Array<{ scene: AutoVideoScene; media: MediaMetadata; duration: number }> = [];
	for (const [index, scene] of options.sidecar.storyboard.scenes.entries()) {
		const result = await generateLocalSpeech({
			engine,
			text: scene.voice,
			voice,
			language: options.sidecar.storyboard.language,
			speed: 1
		});
		const media = await importGeneratedProjectAudio({
			projectId: options.projectId,
			workspaceId: options.workspaceId,
			file: result.file,
			duration: result.duration,
			tags: [...localTtsTags(engine, voice), 'auno-auto-video', `auno-scene:${scene.id}`]
		});
		generated.push({ scene, media, duration: result.duration });
		options.onProgress?.(index + 1, options.sidecar.storyboard.scenes.length);
	}

	retimeScenes(options.sidecar, new Map(generated.map((entry) => [entry.scene.id, entry.duration])));
	const assets: AutoVideoVoiceAsset[] = [];
	execute('AUNO_INSERT_VOICE_TRACK', () => {
		const items = [...timelineStore.items];
		for (const entry of generated) {
			const range = currentSceneFrames(entry.scene);
			const itemId = `auno-voice-${entry.scene.id}-${crypto.randomUUID()}`;
			items.push(
				audioTimelineItem({
					id: itemId,
					media: entry.media,
					trackId: VOICE_TRACK_ID,
					from: range.from,
					label: `Voice · ${entry.scene.title}`
				})
			);
			assets.push({
				sceneId: entry.scene.id,
				itemId,
				mediaId: entry.media.id,
				durationSeconds: entry.duration,
				engine,
				voice
			});
		}
		timelineStore._setItems(items);
	});

	const actualDurations = new Map(generated.map((entry) => [entry.scene.id, entry.duration]));
	const nextSidecar: AutoVideoSidecar = {
		...options.sidecar,
		generationVersion: options.sidecar.generationVersion + 1,
		updatedAt: Date.now(),
		storyboard: {
			...options.sidecar.storyboard,
			scenes: options.sidecar.storyboard.scenes.map((scene) => ({
				...scene,
				durationSeconds: Math.max(2, actualDurations.get(scene.id) ?? scene.durationSeconds)
			}))
		},
		providerManifest: { ...options.sidecar.providerManifest, voice: `${engine}:${voice}` },
		generationGraph: {
			...options.sidecar.generationGraph,
			version: 1,
			blocks: options.sidecar.generationGraph?.blocks ?? [],
			ownedItems: replaceOwnershipCategory(
				options.sidecar,
				'voice',
				assets.map((asset) => ({ itemId: asset.itemId, sceneId: asset.sceneId, category: 'voice' as const }))
			),
			media: { ...options.sidecar.generationGraph?.media, voices: assets }
		}
	};
	return { sidecar: nextSidecar, assets };
}

function formatSrtTimestamp(seconds: number): string {
	const milliseconds = Math.max(0, Math.round(seconds * 1000));
	const hours = Math.floor(milliseconds / 3_600_000);
	const minutes = Math.floor((milliseconds % 3_600_000) / 60_000);
	const secs = Math.floor((milliseconds % 60_000) / 1000);
	const ms = milliseconds % 1000;
	return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:${String(secs).padStart(2, '0')},${String(ms).padStart(3, '0')}`;
}

export function generateAutoVideoCaptions(sidecar: AutoVideoSidecar): {
	sidecar: AutoVideoSidecar;
	asset: AutoVideoCaptionAsset;
} {
	const previous = sidecar.generationGraph?.media?.captions;
	if (previous) removeItems([previous.itemId], false);
	const fps = timelineStore.fps;
	const cues = sidecar.storyboard.scenes.map((scene, index) => {
		const range = currentSceneFrames(scene);
		const startSeconds = range.from / fps;
		const endSeconds = (range.from + range.duration) / fps;
		return `${index + 1}\n${formatSrtTimestamp(startSeconds)} --> ${formatSrtTimestamp(endSeconds)}\n${scene.voice.trim()}\n`;
	});
	const itemId = addSubtitleItemFromSrt(cues.join('\n'));
	const asset: AutoVideoCaptionAsset = { itemId, generatedAt: Date.now(), source: 'script' };
	return {
		sidecar: {
			...sidecar,
			generationVersion: sidecar.generationVersion + 1,
			updatedAt: Date.now(),
			generationGraph: {
				...sidecar.generationGraph,
				version: 1,
				blocks: sidecar.generationGraph?.blocks ?? [],
				ownedItems: replaceOwnershipCategory(sidecar, 'caption', [
					{ itemId: asset.itemId, category: 'caption' as const }
				]),
				media: { ...sidecar.generationGraph?.media, captions: asset }
			}
		},
		asset
	};
}

export async function generateAutoVideoMusic(options: {
	projectId: string;
	workspaceId: string;
	sidecar: AutoVideoSidecar;
	prompt?: string;
}): Promise<{ sidecar: AutoVideoSidecar; asset: AutoVideoMusicAsset }> {
	const support = await inspectMusicGenerationSupport();
	if (!support.supported) throw new Error('Local music generation requires desktop Chromium, HTTPS, and WebGPU.');
	const previous = options.sidecar.generationGraph?.media?.music;
	if (previous) removeItems([previous.itemId], false);
	const totalFrames = Math.max(1, timelineStore.maxItemEndFrame);
	const durationSeconds = Math.min(120, Math.max(2, totalFrames / timelineStore.fps));
	const prompt =
		options.prompt?.trim() ||
		`Modern instrumental background music for a ${options.sidecar.storyboard.format} short video. Clean mix, clear edit points, no vocals.`;
	const generated = await generateLocalMusic({
		prompt,
		durationSeconds,
		audioQuality: 'standard'
	});
	const media = await importGeneratedProjectAudio({
		projectId: options.projectId,
		workspaceId: options.workspaceId,
		file: generated.file,
		duration: generated.duration,
		tags: [...musicGenerationTags(generated), 'auno-auto-video']
	});
	const itemId = `auno-music-${crypto.randomUUID()}`;
	execute('AUNO_INSERT_MUSIC', () => {
		timelineStore._addItem(
			audioTimelineItem({
				id: itemId,
				media,
				trackId: MUSIC_TRACK_ID,
				from: 0,
				volume: 0.18,
				label: 'Auno Background Music'
			})
		);
	});
	const asset: AutoVideoMusicAsset = {
		itemId,
		mediaId: media.id,
		durationSeconds: generated.duration,
		provider: generated.model,
		prompt,
		seed: generated.seed
	};
	return {
		sidecar: {
			...options.sidecar,
			generationVersion: options.sidecar.generationVersion + 1,
			updatedAt: Date.now(),
			providerManifest: { ...options.sidecar.providerManifest, music: generated.model },
			generationGraph: {
				...options.sidecar.generationGraph,
				version: 1,
				blocks: options.sidecar.generationGraph?.blocks ?? [],
				ownedItems: replaceOwnershipCategory(options.sidecar, 'music', [
					{ itemId: asset.itemId, category: 'music' as const }
				]),
				media: { ...options.sidecar.generationGraph?.media, music: asset }
			}
		},
		asset
	};
}

export function generatedMediaAvailable(mediaId: string): boolean {
	return mediaPool.get(mediaId) !== undefined;
}
