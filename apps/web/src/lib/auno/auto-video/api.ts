import { applyAPIRequestHeaders } from '$lib/api/client';
import type { AutoVideoScene, AutoVideoSource, AutoVideoStoryboard, AutoVideoFormat } from './types';

type PlannerSceneDTO = {
	id: string;
	role: AutoVideoScene['role'];
	title: string;
	voice: string;
	visual_intent: AutoVideoScene['visualIntent'];
	duration_seconds: number;
	source_ids: string[];
};

type PlannerStoryboardDTO = {
	version: 1;
	id: string;
	format: AutoVideoFormat;
	title: string;
	language: string;
	target_duration_seconds: number;
	scenes: PlannerSceneDTO[];
};

type PlannerResponseDTO = {
	storyboard: PlannerStoryboardDTO;
	model: string;
};

export type AIStoryboardResult = {
	storyboard: AutoVideoStoryboard;
	model: string;
};

export type AIStoryboardRequest = {
	workspaceId: string;
	format: AutoVideoFormat;
	title: string;
	language: string;
	targetDurationSeconds: number;
	source: AutoVideoSource;
};

function fromDTO(value: PlannerStoryboardDTO): AutoVideoStoryboard {
	return {
		version: 1,
		id: value.id,
		format: value.format,
		title: value.title,
		language: value.language,
		targetDurationSeconds: value.target_duration_seconds,
		scenes: value.scenes.map((scene) => ({
			id: scene.id,
			role: scene.role,
			title: scene.title,
			voice: scene.voice,
			visualIntent: scene.visual_intent,
			durationSeconds: scene.duration_seconds,
			sourceIds: scene.source_ids
		}))
	};
}

export async function requestAIStoryboard(
	input: AIStoryboardRequest,
	signal?: AbortSignal
): Promise<AIStoryboardResult | null> {
	const headers = applyAPIRequestHeaders(new Headers({ 'Content-Type': 'application/json' }));
	const response = await fetch('/api/v1/auno/auto-video/storyboard', {
		method: 'POST',
		credentials: 'include',
		headers,
		signal,
		body: JSON.stringify({
			workspace_id: input.workspaceId,
			format: input.format,
			title: input.title,
			language: input.language,
			target_duration_seconds: input.targetDurationSeconds,
			source: {
				id: input.source.id,
				kind: input.source.kind,
				label: input.source.label,
				value: input.source.value,
				url: input.source.url ?? ''
			}
		})
	});

	if ([400, 429, 502, 503].includes(response.status)) return null;
	if (!response.ok) {
		throw new Error(`AI Auto Video planning failed (${response.status}).`);
	}
	const body = (await response.json()) as PlannerResponseDTO;
	if (!body?.storyboard || !Array.isArray(body.storyboard.scenes)) return null;
	return { storyboard: fromDTO(body.storyboard), model: body.model || 'configured AI' };
}
