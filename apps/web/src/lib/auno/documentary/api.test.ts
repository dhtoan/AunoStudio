import { afterEach, describe, expect, it, vi } from 'vitest';
import { updateDocumentaryRun } from './api';
import type { DocumentaryRun } from './types';

function runFixture(): DocumentaryRun {
	return {
		schemaVersion: 1,
		id: 'run-1',
		workspaceId: 'workspace-1',
		mode: 'documentary-long-form',
		style: 'documentary-paper-collage',
		currentStep: 'ideas',
		generationVersion: 2,
		ideas: [
			{
				id: 'idea-1',
				title: 'The hidden archive',
				hook: 'One document changes the story.',
				subterritory: 'archival evidence',
				evidenceAnchors: ['source-1']
			}
		],
		language: 'en-US',
		beats: [],
		visualPlans: [],
		thumbnails: [],
		stepStates: {},
		providerManifest: {},
		createdAt: '2026-09-15T00:00:00Z',
		updatedAt: '2026-09-15T00:00:00Z'
	};
}

describe('documentary API', () => {
	afterEach(() => vi.unstubAllGlobals());

	it('serializes ideas using only the snake-case API contract', async () => {
		const run = runFixture();
		let request: RequestInit | undefined;
		vi.stubGlobal(
			'fetch',
			vi.fn(async (_input: RequestInfo | URL, init?: RequestInit) => {
				request = init;
				return Response.json({
					schema_version: 1,
					id: run.id,
					workspace_id: run.workspaceId,
					mode: run.mode,
					style: run.style,
					current_step: run.currentStep,
					generation_version: run.generationVersion,
					ideas: [],
					language: run.language,
					beats: [],
					visual_plans: [],
					thumbnails: [],
					step_states: {},
					provider_manifest: {},
					created_at: run.createdAt,
					updated_at: run.updatedAt
				});
			})
		);

		await updateDocumentaryRun(run.workspaceId, run);

		const body = JSON.parse(String(request?.body)) as { run: { ideas: unknown[] } };
		expect(body.run.ideas).toEqual([
			{
				id: 'idea-1',
				title: 'The hidden archive',
				hook: 'One document changes the story.',
				subterritory: 'archival evidence',
				evidence_anchors: ['source-1']
			}
		]);
	});
});
