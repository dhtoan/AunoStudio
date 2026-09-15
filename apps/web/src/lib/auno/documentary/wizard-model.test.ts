import { describe, expect, it } from 'vitest';
import type { DocumentaryRun } from './types';
import {
	DOCUMENTARY_WIZARD_DEFAULTS,
	documentaryStepEnabled,
	documentaryStepState
} from './wizard-model';

function runFixture(): DocumentaryRun {
	return {
		schemaVersion: 1,
		id: 'run-1',
		workspaceId: 'workspace-1',
		mode: 'documentary-long-form',
		style: 'documentary-paper-collage',
		currentStep: 'ideas',
		generationVersion: 2,
		language: 'en-US',
		ideas: Array.from({ length: 10 }, (_, index) => ({
			id: `idea-${String(index + 1).padStart(2, '0')}`,
			title: `Idea ${index + 1}`,
			hook: `Hook ${index + 1}`,
			subterritory: `Territory ${index + 1}`,
			evidenceAnchors: []
		})),
		beats: [],
		visualPlans: [],
		thumbnails: [],
		stepStates: { ideas: { status: 'ready' } },
		providerManifest: {},
		createdAt: '2026-09-15T00:00:00Z',
		updatedAt: '2026-09-15T00:00:00Z'
	};
}

describe('documentary wizard model', () => {
	it('defaults to landscape Vox Style and the approved durations', () => {
		expect(DOCUMENTARY_WIZARD_DEFAULTS).toEqual({
		canvas: 'landscape',
		style: 'documentary-paper-collage',
		duration: 60,
		language: 'en-US',
		durations: [30, 60, 120, 180, 300]
	});
	});

	it('enables duration after ideas exist and script only after topic selection plus duration', () => {
		const run = runFixture();
		expect(documentaryStepEnabled(run, 'duration')).toBe(true);
		expect(documentaryStepEnabled(run, 'script')).toBe(false);

		run.selectedIdeaId = 'idea-01';
		run.targetDurationSeconds = 60;
		expect(documentaryStepEnabled(run, 'script')).toBe(true);
	});

	it('keeps stale outputs inspectable instead of treating them as missing', () => {
		const run = runFixture();
		run.stepStates.visuals = { status: 'stale', fingerprint: 'old' };
		run.visualPlans = [
			{
				beatId: 'beat-01',
				visualIntent: 'paper-document',
				hero: 'Archived document',
				supports: [],
				prompt: 'Archived document on paper.',
				requiredSubjectIds: [],
				animation: {
					camera: 'locked',
					cadence: 'stepped',
					assemblyOrder: 'back-to-front',
					holdRatio: 0.3,
					ambientLife: []
				}
			}
		];

		expect(documentaryStepState(run, 'visuals')).toEqual({ status: 'stale', hasOutput: true });
	});
});
