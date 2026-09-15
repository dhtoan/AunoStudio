import { describe, expect, it } from 'vitest';
import type { DocumentaryRun } from './types';
import { documentaryCapabilityLevel, documentaryNextActions } from './capabilities';

const run = {
	id: 'run-1',
	beats: [{ id: 'beat-1' }],
	visualPlans: [{ beatId: 'beat-1', prompt: 'archival paper document' }]
} as unknown as DocumentaryRun;

describe('documentary degraded capabilities', () => {
	it('keeps prompt pack and native project creation in text-only mode', () => {
		const capabilities = {
			documentaryPlanner: true,
			browserTTS: false,
			browserMusic: false,
			serverImageGeneration: false,
			serverVideoGeneration: false
		};
		expect(documentaryCapabilityLevel(capabilities)).toBe('text-only');
		expect(documentaryNextActions(capabilities, run).map((action) => action.id)).toEqual(
			expect.arrayContaining(['export-prompt-pack', 'create-project'])
		);
		expect(documentaryNextActions(capabilities, run).some((action) => action.id === 'create-project' && action.available)).toBe(true);
	});

	it('adds voice and image actions without exposing video animation in tts-image mode', () => {
		const capabilities = {
			documentaryPlanner: true,
			browserTTS: true,
			browserMusic: true,
			serverImageGeneration: true,
			serverVideoGeneration: false
		};
		expect(documentaryCapabilityLevel(capabilities)).toBe('tts-image');
		const actions = documentaryNextActions(capabilities, run);
		expect(actions.find((action) => action.id === 'generate-voice')?.available).toBe(true);
		expect(actions.find((action) => action.id === 'generate-images')?.available).toBe(true);
		expect(actions.find((action) => action.id === 'generate-video-variants')?.available).toBe(false);
		expect(actions.find((action) => action.id === 'create-project')?.available).toBe(true);
	});

	it('adds optional animation variants only when full-media is actually configured', () => {
		const capabilities = {
			documentaryPlanner: true,
			browserTTS: true,
			browserMusic: true,
			serverImageGeneration: true,
			serverVideoGeneration: true
		};
		expect(documentaryCapabilityLevel(capabilities)).toBe('full-media');
		expect(documentaryNextActions(capabilities, run).find((action) => action.id === 'generate-video-variants')?.available).toBe(true);
		expect(documentaryNextActions(capabilities, run).find((action) => action.id === 'create-project')?.available).toBe(true);
	});
});
