import { describe, expect, it } from 'vitest';
import type { DocumentaryRun } from './types';
import { compileDocumentaryRunToProject, type DocumentaryCompileAsset } from './compiler';

function run(): DocumentaryRun {
	return {
		schemaVersion: 1,
		id: 'doc-run-1',
		workspaceId: 'workspace-1',
		mode: 'documentary-long-form',
		style: 'documentary-paper-collage',
		currentStep: 'visuals',
		generationVersion: 7,
		customTopic: 'How a paper archive changed a city',
		targetDurationSeconds: 30,
		language: 'en-US',
		ideas: [],
		beats: [
			{
				id: 'beat-1',
				index: 0,
				narration: 'First, the archive appears.',
				startSeconds: 0,
				durationSeconds: 2,
				coreIdea: 'The archive appears',
				evidenceRefs: [],
				visualIntent: 'motion-composition',
				requiredSubjectIds: []
			},
			{
				id: 'beat-2',
				index: 1,
				narration: 'A photograph establishes the place.',
				startSeconds: 2,
				durationSeconds: 2,
				coreIdea: 'A photograph establishes the place',
				evidenceRefs: [],
				visualIntent: 'archival-photo',
				requiredSubjectIds: []
			},
			{
				id: 'beat-3',
				index: 2,
				narration: 'Then the original footage moves.',
				startSeconds: 4,
				durationSeconds: 2,
				coreIdea: 'The original footage moves',
				evidenceRefs: [],
				visualIntent: 'object-evidence',
				requiredSubjectIds: []
			}
		],
		visualPlans: [
			{
				beatId: 'beat-1',
				visualIntent: 'motion-composition',
				hero: 'paper archive',
				supports: [],
				prompt: 'paper archive',
				requiredSubjectIds: [],
				animation: {
					camera: 'locked',
					cadence: 'stepped',
					assemblyOrder: 'back-to-front',
					holdRatio: 0.18,
					ambientLife: []
				}
			},
			{
				beatId: 'beat-2',
				visualIntent: 'archival-photo',
				hero: 'city photo',
				supports: [],
				prompt: 'city photo',
				requiredSubjectIds: [],
				mediaId: 'media-image',
				animation: {
					camera: 'locked',
					cadence: 'stepped',
					assemblyOrder: 'back-to-front',
					holdRatio: 0.18,
					ambientLife: []
				}
			},
			{
				beatId: 'beat-3',
				visualIntent: 'object-evidence',
				hero: 'film reel',
				supports: [],
				prompt: 'film reel',
				requiredSubjectIds: [],
				mediaId: 'media-video',
				animation: {
					camera: 'micro-push',
					cadence: 'stepped',
					assemblyOrder: 'hero-first',
					holdRatio: 0.2,
					ambientLife: []
				}
			}
		],
		thumbnails: [],
		stepStates: {},
		providerManifest: {},
		createdAt: '2026-09-15T00:00:00Z',
		updatedAt: '2026-09-15T00:00:00Z'
	};
}

const assets: DocumentaryCompileAsset[] = [
	{ mediaId: 'media-image', kind: 'image', fileName: 'archive.jpg', width: 1600, height: 1200 },
	{
		mediaId: 'media-video',
		kind: 'video',
		fileName: 'footage.mp4',
		width: 1920,
		height: 1080,
		durationSeconds: 8,
		fps: 30
	}
];

describe('documentary native compiler', () => {
	it('compiles placeholder, image, and video beats into editable native project state', () => {
		const result = compileDocumentaryRunToProject(run(), assets);
		const timeline = result.project.timeline!;

		expect(result.project.metadata).toMatchObject({ width: 1920, height: 1080, fps: 30 });
		const placeholder = timeline.items.find((item) => item.id === 'beat-1-background');
		expect(placeholder?.type).toBe('background');
		expect(placeholder?.background).toMatchObject({ kind: 'pattern' });
		expect('smoothness' in (placeholder?.background ?? {})).toBe(false);
		expect(timeline.items.some((item) => item.id === 'beat-1-text' && item.type === 'text')).toBe(
			true
		);
		expect(
			timeline.items.some(
				(item) => item.id === 'beat-1-motion-composition' && item.type === 'composition'
			)
		).toBe(true);

		const image = timeline.items.find((item) => item.id === 'beat-2-media');
		const video = timeline.items.find((item) => item.id === 'beat-3-media');
		expect(image).toMatchObject({
			type: 'image',
			mediaId: 'media-image',
			trackId: 'track-video-main'
		});
		expect(video).toMatchObject({
			type: 'video',
			mediaId: 'media-video',
			trackId: 'track-video-main'
		});
		expect(
			timeline.items
				.filter((item) => item.type === 'video')
				.every((item) => item.mediaId === 'media-video')
		).toBe(true);

		expect(timeline.markers?.map((marker) => marker.frame)).toEqual([0, 60, 120]);
		expect(result.motionGraph.style).toBe('documentary-paper-collage');
		expect(result.sidecar.generationGraph?.documentary).toEqual({
			runId: 'doc-run-1',
			beatIds: ['beat-1', 'beat-2', 'beat-3'],
			style: 'documentary-paper-collage'
		});
		expect(result.sidecar.generationGraph?.ownedItems).toEqual(
			expect.arrayContaining([
				expect.objectContaining({ itemId: 'beat-2-media', sceneId: 'beat-2', category: 'visual' }),
				expect.objectContaining({
					itemId: 'beat-1-motion-composition',
					sceneId: 'beat-1',
					category: 'motion'
				})
			])
		);
	});
});
