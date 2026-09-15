import { describe, expect, it } from 'vitest';
import type { DocumentaryRun } from './types';
import {
	cloneDocumentaryRun,
	documentaryRunToMotionScenes,
	isDocumentaryStepStale
} from './state';

function fixture(): DocumentaryRun {
	return {
		schemaVersion: 1,
		id: 'run-1',
		workspaceId: 'workspace-1',
		mode: 'documentary-long-form',
		style: 'documentary-paper-collage',
		currentStep: 'beats',
		generationVersion: 7,
		language: 'en-US',
		ideas: [{ id: 'idea-01', title: 'Idea', hook: 'Hook', subterritory: 'Archive', evidenceAnchors: [] }],
		selectedIdeaId: 'idea-01',
		beats: [
			{
				id: 'beat-01-a',
				index: 0,
				narration: 'First beat narration.',
				startSeconds: 0,
				durationSeconds: 2.5,
				coreIdea: 'First beat',
				evidenceRefs: [],
				visualIntent: 'paper-document',
				requiredSubjectIds: []
			},
			{
				id: 'beat-02-b',
				index: 1,
				narration: 'Second beat narration.',
				startSeconds: 2.5,
				durationSeconds: 2.5,
				coreIdea: 'Second beat',
				evidenceRefs: [],
				visualIntent: 'map-route',
				requiredSubjectIds: []
			}
		],
		visualPlans: [],
		thumbnails: [],
		stepStates: { beats: { status: 'ready' }, visuals: { status: 'stale' } },
		providerManifest: {},
		createdAt: '2026-09-15T00:00:00Z',
		updatedAt: '2026-09-15T00:00:00Z'
	};
}

describe('documentary state helpers', () => {
	it('deep clones resumable run state', () => {
		const original = fixture();
		const cloned = cloneDocumentaryRun(original);
		cloned.ideas[0]!.title = 'Changed';
		cloned.beats[0]!.narration = 'Changed beat';

		expect(original.selectedIdeaId).toBe('idea-01');
		expect(original.ideas[0]!.title).toBe('Idea');
		expect(original.beats[0]!.narration).toBe('First beat narration.');
	});

	it('maps absolute documentary beat data to motion source scenes', () => {
		expect(documentaryRunToMotionScenes(fixture())).toEqual([
			{
				id: 'beat-01-a',
				title: 'First beat',
				voice: 'First beat narration.',
				visualIntent: 'paper-document',
				durationSeconds: 2.5
			},
			{
				id: 'beat-02-b',
				title: 'Second beat',
				voice: 'Second beat narration.',
				visualIntent: 'map-route',
				durationSeconds: 2.5
			}
		]);
	});

	it('reports only explicit stale state as stale', () => {
		const run = fixture();
		expect(isDocumentaryStepStale(run, 'visuals')).toBe(true);
		expect(isDocumentaryStepStale(run, 'beats')).toBe(false);
		expect(isDocumentaryStepStale(run, 'thumbnails')).toBe(false);
	});
});
