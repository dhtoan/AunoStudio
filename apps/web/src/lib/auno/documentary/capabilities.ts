import { applyAPIRequestHeaders } from '$lib/api/client';
import type { DocumentaryRun } from './types';

export type DocumentaryCapabilityLevel = 'text-only' | 'tts-image' | 'full-media';

export interface DocumentaryCapabilities {
	documentaryPlanner: boolean;
	browserTTS: boolean;
	browserMusic: boolean;
	serverImageGeneration: boolean;
	serverVideoGeneration: boolean;
}

export type DocumentaryActionId =
	| 'export-prompt-pack'
	| 'create-project'
	| 'generate-voice'
	| 'generate-images'
	| 'generate-video-variants'
	| 'generate-music';

export interface DocumentaryNextAction {
	id: DocumentaryActionId;
	label: string;
	available: boolean;
	reason?: string;
}

interface AunoCapabilitiesDTO {
	documentary_planner_available?: boolean;
	browser_tts?: boolean;
	browser_music_generation?: boolean;
	documentary_server_image_generation?: boolean;
	documentary_server_video_generation?: boolean;
}

export function documentaryCapabilityLevel(
	capabilities: DocumentaryCapabilities
): DocumentaryCapabilityLevel {
	if (capabilities.serverVideoGeneration) return 'full-media';
	if (capabilities.browserTTS || capabilities.serverImageGeneration) return 'tts-image';
	return 'text-only';
}

export function documentaryNextActions(
	capabilities: DocumentaryCapabilities,
	run?: DocumentaryRun | null
): DocumentaryNextAction[] {
	const hasBeats = Boolean(run?.beats?.length);
	const hasVisualPlans = Boolean(run?.visualPlans?.length);
	return [
		{
			id: 'export-prompt-pack',
			label: 'Export prompt pack',
			available: true
		},
		{
			id: 'create-project',
			label: run?.projectId ? 'Open native project' : 'Create native project',
			available: true
		},
		{
			id: 'generate-voice',
			label: 'Generate local voice',
			available: capabilities.browserTTS && hasBeats,
			reason: capabilities.browserTTS ? (hasBeats ? undefined : 'Generate beats first.') : 'Local browser TTS is not available.'
		},
		{
			id: 'generate-images',
			label: 'Generate/import images',
			available: capabilities.serverImageGeneration && hasVisualPlans,
			reason: capabilities.serverImageGeneration
				? (hasVisualPlans ? undefined : 'Generate visual plans first.')
				: 'No configured server image-generation adapter.'
		},
		{
			id: 'generate-video-variants',
			label: 'Generate animation variants',
			available: capabilities.serverVideoGeneration && hasVisualPlans,
			reason: capabilities.serverVideoGeneration
				? (hasVisualPlans ? undefined : 'Generate visual plans first.')
				: 'No configured server video-generation adapter.'
		},
		{
			id: 'generate-music',
			label: 'Generate local music',
			available: capabilities.browserMusic,
			reason: capabilities.browserMusic ? undefined : 'Local browser music generation is not available.'
		}
	];
}

export async function loadDocumentaryCapabilities(signal?: AbortSignal): Promise<DocumentaryCapabilities> {
	const response = await fetch('/api/v1/auno/ai/capabilities', {
		credentials: 'include',
		headers: applyAPIRequestHeaders(new Headers()),
		signal
	});
	if (!response.ok) {
		return {
			documentaryPlanner: false,
			browserTTS: false,
			browserMusic: false,
			serverImageGeneration: false,
			serverVideoGeneration: false
		};
	}
	const body = (await response.json()) as AunoCapabilitiesDTO;
	return {
		documentaryPlanner: Boolean(body.documentary_planner_available),
		browserTTS: Boolean(body.browser_tts),
		browserMusic: Boolean(body.browser_music_generation),
		serverImageGeneration: Boolean(body.documentary_server_image_generation),
		serverVideoGeneration: Boolean(body.documentary_server_video_generation)
	};
}
