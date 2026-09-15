import { applyAPIRequestHeaders } from '$lib/api/client';
import type { AutoVideoSource } from '$lib/auno/auto-video/types';
import type {
	DocumentaryAnimationBrief,
	DocumentaryBeat,
	DocumentaryIdea,
	DocumentaryRun,
	DocumentaryScript,
	DocumentaryStep,
	DocumentaryStepState,
	DocumentaryThumbnailPlan,
	DocumentaryVisualPlan,
	DocumentaryVoiceManifest
} from './types';

interface SourceDTO {
	id: string;
	kind: AutoVideoSource['kind'];
	label: string;
	value: string;
	url?: string;
	mime_type?: string;
	media_id?: string;
}

interface IdeaDTO {
	id: string;
	title: string;
	hook: string;
	subterritory: string;
	evidence_anchors?: string[];
}

interface ScriptDTO {
	text: string;
	word_count: number;
	target_word_count: number;
	evidence_refs?: string[];
	fingerprint: string;
	diagnostics?: string[];
}

interface VoiceDTO {
	provider?: string;
	voice?: string;
	direction?: string[];
	chunks?: Array<{
		id: string;
		beat_ids?: string[];
		text: string;
		media_id?: string;
		item_id?: string;
		duration_seconds?: number;
	}>;
	measured_duration_seconds?: number;
	fingerprint?: string;
}

interface BeatDTO {
	id: string;
	index: number;
	narration: string;
	start_seconds: number;
	duration_seconds: number;
	core_idea: string;
	evidence_refs?: string[];
	visual_intent: DocumentaryBeat['visualIntent'];
	required_subject_ids?: string[];
}

interface AnimationDTO {
	camera: DocumentaryAnimationBrief['camera'];
	cadence: DocumentaryAnimationBrief['cadence'];
	assembly_order: DocumentaryAnimationBrief['assemblyOrder'];
	hold_ratio: number;
	ambient_life?: DocumentaryAnimationBrief['ambientLife'];
}

interface VisualPlanDTO {
	beat_id: string;
	visual_intent: DocumentaryVisualPlan['visualIntent'];
	hero: string;
	supports?: string[];
	label?: string;
	prompt: string;
	required_subject_ids?: string[];
	media_id?: string;
	animation: AnimationDTO;
	fingerprint?: string;
}

interface ThumbnailDTO {
	id: string;
	hero: string;
	headline?: string;
	text_elements?: string[];
	prompt: string;
	media_id?: string;
}

interface RunDTO {
	schema_version: 1;
	id: string;
	workspace_id: string;
	project_id?: string;
	mode: 'documentary-long-form';
	style: 'documentary-paper-collage';
	current_step: DocumentaryStep;
	generation_version: number;
	source?: SourceDTO;
	niche?: string;
	ideas?: IdeaDTO[];
	selected_idea_id?: string;
	custom_topic?: string;
	target_duration_seconds?: DocumentaryRun['targetDurationSeconds'];
	language?: string;
	script?: ScriptDTO;
	voice?: VoiceDTO;
	beats?: BeatDTO[];
	visual_plans?: VisualPlanDTO[];
	thumbnails?: ThumbnailDTO[];
	step_states?: Partial<Record<DocumentaryStep, DocumentaryStepState>>;
	provider_manifest?: Record<string, string>;
	created_at: string;
	updated_at: string;
}

export interface CreateDocumentaryRunInput {
	workspaceId: string;
	source?: AutoVideoSource;
	niche?: string;
	customTopic?: string;
	language?: string;
}

function requestHeaders(): Headers {
	return applyAPIRequestHeaders(new Headers({ 'Content-Type': 'application/json' }));
}

function sourceToDTO(source: AutoVideoSource): SourceDTO {
	return {
		id: source.id,
		kind: source.kind,
		label: source.label,
		value: source.value,
		url: source.url,
		mime_type: source.mimeType,
		media_id: source.mediaId
	};
}

function sourceFromDTO(source: SourceDTO): AutoVideoSource {
	return {
		id: source.id,
		kind: source.kind,
		label: source.label,
		value: source.value,
		url: source.url,
		mimeType: source.mime_type,
		mediaId: source.media_id
	};
}

function ideaFromDTO(idea: IdeaDTO): DocumentaryIdea {
	return { ...idea, evidenceAnchors: idea.evidence_anchors ?? [] };
}

function scriptFromDTO(script: ScriptDTO): DocumentaryScript {
	return {
		text: script.text,
		wordCount: script.word_count,
		targetWordCount: script.target_word_count,
		evidenceRefs: script.evidence_refs ?? [],
		fingerprint: script.fingerprint,
		diagnostics: script.diagnostics ?? []
	};
}

function voiceFromDTO(voice: VoiceDTO): DocumentaryVoiceManifest {
	return {
		provider: voice.provider,
		voice: voice.voice,
		direction: voice.direction ?? [],
		chunks: (voice.chunks ?? []).map((chunk) => ({
			id: chunk.id,
			beatIds: chunk.beat_ids ?? [],
			text: chunk.text,
			mediaId: chunk.media_id,
			itemId: chunk.item_id,
			durationSeconds: chunk.duration_seconds
		})),
		measuredDurationSeconds: voice.measured_duration_seconds,
		fingerprint: voice.fingerprint
	};
}

function beatFromDTO(beat: BeatDTO): DocumentaryBeat {
	return {
		id: beat.id,
		index: beat.index,
		narration: beat.narration,
		startSeconds: beat.start_seconds,
		durationSeconds: beat.duration_seconds,
		coreIdea: beat.core_idea,
		evidenceRefs: beat.evidence_refs ?? [],
		visualIntent: beat.visual_intent,
		requiredSubjectIds: beat.required_subject_ids ?? []
	};
}

function animationFromDTO(animation: AnimationDTO): DocumentaryAnimationBrief {
	return {
		camera: animation.camera,
		cadence: animation.cadence,
		assemblyOrder: animation.assembly_order,
		holdRatio: animation.hold_ratio,
		ambientLife: animation.ambient_life ?? []
	};
}

function visualFromDTO(plan: VisualPlanDTO): DocumentaryVisualPlan {
	return {
		beatId: plan.beat_id,
		visualIntent: plan.visual_intent,
		hero: plan.hero,
		supports: plan.supports ?? [],
		label: plan.label,
		prompt: plan.prompt,
		requiredSubjectIds: plan.required_subject_ids ?? [],
		mediaId: plan.media_id,
		animation: animationFromDTO(plan.animation),
		fingerprint: plan.fingerprint
	};
}

function thumbnailFromDTO(plan: ThumbnailDTO): DocumentaryThumbnailPlan {
	return {
		id: plan.id,
		hero: plan.hero,
		headline: plan.headline,
		textElements: plan.text_elements ?? [],
		prompt: plan.prompt,
		mediaId: plan.media_id
	};
}

export function documentaryRunFromDTO(value: RunDTO): DocumentaryRun {
	return {
		schemaVersion: 1,
		id: value.id,
		workspaceId: value.workspace_id,
		projectId: value.project_id,
		mode: value.mode,
		style: value.style,
		currentStep: value.current_step,
		generationVersion: value.generation_version,
		source: value.source ? sourceFromDTO(value.source) : undefined,
		niche: value.niche,
		ideas: (value.ideas ?? []).map(ideaFromDTO),
		selectedIdeaId: value.selected_idea_id,
		customTopic: value.custom_topic,
		targetDurationSeconds: value.target_duration_seconds,
		language: value.language ?? 'en-US',
		script: value.script ? scriptFromDTO(value.script) : undefined,
		voice: value.voice ? voiceFromDTO(value.voice) : undefined,
		beats: (value.beats ?? []).map(beatFromDTO),
		visualPlans: (value.visual_plans ?? []).map(visualFromDTO),
		thumbnails: (value.thumbnails ?? []).map(thumbnailFromDTO),
		stepStates: value.step_states ?? {},
		providerManifest: value.provider_manifest ?? {},
		createdAt: value.created_at,
		updatedAt: value.updated_at
	};
}

function scriptToDTO(script: DocumentaryScript): ScriptDTO {
	return {
		text: script.text,
		word_count: script.wordCount,
		target_word_count: script.targetWordCount,
		evidence_refs: script.evidenceRefs,
		fingerprint: script.fingerprint,
		diagnostics: script.diagnostics
	};
}

function voiceToDTO(voice: DocumentaryVoiceManifest): VoiceDTO {
	return {
		provider: voice.provider,
		voice: voice.voice,
		direction: voice.direction,
		chunks: voice.chunks.map((chunk) => ({
			id: chunk.id,
			beat_ids: chunk.beatIds,
			text: chunk.text,
			media_id: chunk.mediaId,
			item_id: chunk.itemId,
			duration_seconds: chunk.durationSeconds
		})),
		measured_duration_seconds: voice.measuredDurationSeconds,
		fingerprint: voice.fingerprint
	};
}

function beatToDTO(beat: DocumentaryBeat): BeatDTO {
	return {
		id: beat.id,
		index: beat.index,
		narration: beat.narration,
		start_seconds: beat.startSeconds,
		duration_seconds: beat.durationSeconds,
		core_idea: beat.coreIdea,
		evidence_refs: beat.evidenceRefs,
		visual_intent: beat.visualIntent,
		required_subject_ids: beat.requiredSubjectIds
	};
}

function visualToDTO(plan: DocumentaryVisualPlan): VisualPlanDTO {
	return {
		beat_id: plan.beatId,
		visual_intent: plan.visualIntent,
		hero: plan.hero,
		supports: plan.supports,
		label: plan.label,
		prompt: plan.prompt,
		required_subject_ids: plan.requiredSubjectIds,
		media_id: plan.mediaId,
		animation: {
			camera: plan.animation.camera,
			cadence: plan.animation.cadence,
			assembly_order: plan.animation.assemblyOrder,
			hold_ratio: plan.animation.holdRatio,
			ambient_life: plan.animation.ambientLife
		},
		fingerprint: plan.fingerprint
	};
}

function documentaryRunToDTO(run: DocumentaryRun): RunDTO {
	return {
		schema_version: 1,
		id: run.id,
		workspace_id: run.workspaceId,
		project_id: run.projectId,
		mode: run.mode,
		style: run.style,
		current_step: run.currentStep,
		generation_version: run.generationVersion,
		source: run.source ? sourceToDTO(run.source) : undefined,
		niche: run.niche,
		ideas: run.ideas.map((idea) => ({ ...idea, evidence_anchors: idea.evidenceAnchors })),
		selected_idea_id: run.selectedIdeaId,
		custom_topic: run.customTopic,
		target_duration_seconds: run.targetDurationSeconds,
		language: run.language,
		script: run.script ? scriptToDTO(run.script) : undefined,
		voice: run.voice ? voiceToDTO(run.voice) : undefined,
		beats: run.beats.map(beatToDTO),
		visual_plans: run.visualPlans.map(visualToDTO),
		thumbnails: run.thumbnails.map((plan) => ({
			id: plan.id,
			hero: plan.hero,
			headline: plan.headline,
			text_elements: plan.textElements,
			prompt: plan.prompt,
			media_id: plan.mediaId
		})),
		step_states: run.stepStates,
		provider_manifest: run.providerManifest,
		created_at: run.createdAt,
		updated_at: run.updatedAt
	};
}

async function readRun(response: Response, action: string): Promise<DocumentaryRun> {
	if (response.status === 409) throw new Error('This documentary changed in another session. Reload it before saving again.');
	if (!response.ok) throw new Error(`${action} failed (${response.status}).`);
	return documentaryRunFromDTO((await response.json()) as RunDTO);
}

export async function createDocumentaryRun(input: CreateDocumentaryRunInput): Promise<DocumentaryRun> {
	const response = await fetch('/api/v1/auno/auto-video/documentary/runs', {
		method: 'POST',
		credentials: 'include',
		headers: requestHeaders(),
		body: JSON.stringify({
			workspace_id: input.workspaceId,
			source: input.source ? sourceToDTO(input.source) : undefined,
			niche: input.niche ?? '',
			custom_topic: input.customTopic ?? '',
			language: input.language ?? 'en-US'
		})
	});
	return readRun(response, 'Creating documentary run');
}

export async function getDocumentaryRun(workspaceId: string, runId: string): Promise<DocumentaryRun> {
	const query = new URLSearchParams({ workspace_id: workspaceId });
	const response = await fetch(`/api/v1/auno/auto-video/documentary/runs/${encodeURIComponent(runId)}?${query}`, {
		credentials: 'include',
		headers: applyAPIRequestHeaders(new Headers())
	});
	return readRun(response, 'Loading documentary run');
}

export async function updateDocumentaryRun(
	workspaceId: string,
	run: DocumentaryRun,
	options: { clearSource?: boolean } = {}
): Promise<DocumentaryRun> {
	const response = await fetch(`/api/v1/auno/auto-video/documentary/runs/${encodeURIComponent(run.id)}`, {
		method: 'PUT',
		credentials: 'include',
		headers: requestHeaders(),
		body: JSON.stringify({
			workspace_id: workspaceId,
			generation_version: run.generationVersion,
			clear_source: Boolean(options.clearSource),
			run: documentaryRunToDTO(run)
		})
	});
	return readRun(response, 'Saving documentary run');
}

async function generateStep(workspaceId: string, run: DocumentaryRun, step: string): Promise<DocumentaryRun> {
	const response = await fetch(`/api/v1/auno/auto-video/documentary/runs/${encodeURIComponent(run.id)}/${step}`, {
		method: 'POST',
		credentials: 'include',
		headers: requestHeaders(),
		body: JSON.stringify({ workspace_id: workspaceId, generation_version: run.generationVersion })
	});
	return readRun(response, `Generating documentary ${step}`);
}

export const generateDocumentaryIdeas = (workspaceId: string, run: DocumentaryRun) =>
	generateStep(workspaceId, run, 'ideas');
export const generateDocumentaryScript = (workspaceId: string, run: DocumentaryRun) =>
	generateStep(workspaceId, run, 'script');
export const generateDocumentaryBeats = (workspaceId: string, run: DocumentaryRun) =>
	generateStep(workspaceId, run, 'beats');
export const generateDocumentaryVisuals = (workspaceId: string, run: DocumentaryRun) =>
	generateStep(workspaceId, run, 'visuals');
export async function regenerateDocumentaryVisual(
	workspaceId: string,
	run: DocumentaryRun,
	beatId: string
): Promise<DocumentaryRun> {
	const response = await fetch(
		`/api/v1/auno/auto-video/documentary/runs/${encodeURIComponent(run.id)}/visuals/${encodeURIComponent(beatId)}`,
		{
			method: 'POST',
			credentials: 'include',
			headers: requestHeaders(),
			body: JSON.stringify({ workspace_id: workspaceId, generation_version: run.generationVersion })
		}
	);
	return readRun(response, 'Regenerating documentary beat visual');
}
export const generateDocumentaryThumbnails = (workspaceId: string, run: DocumentaryRun) =>
	generateStep(workspaceId, run, 'thumbnails');
