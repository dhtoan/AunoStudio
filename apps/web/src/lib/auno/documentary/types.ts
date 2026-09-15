import type { AutoVideoSource } from '$lib/auno/auto-video/types';

export const DOCUMENTARY_MODE = 'documentary-long-form' as const;
export const DOCUMENTARY_STYLE = 'documentary-paper-collage' as const;
export const DOCUMENTARY_DURATIONS = [30, 60, 120, 180, 300] as const;

export type DocumentaryDuration = (typeof DOCUMENTARY_DURATIONS)[number];
export type DocumentaryStep =
	| 'source'
	| 'topic'
	| 'ideas'
	| 'duration'
	| 'script'
	| 'voice'
	| 'beats'
	| 'visuals'
	| 'animation'
	| 'thumbnails'
	| 'project';
export type DocumentaryStepStatus = 'pending' | 'ready' | 'stale';

export interface DocumentaryStepState {
	fingerprint?: string;
	status: DocumentaryStepStatus;
}

export interface DocumentaryIdea {
	id: string;
	title: string;
	hook: string;
	subterritory: string;
	evidenceAnchors: string[];
}

export interface DocumentaryScript {
	text: string;
	wordCount: number;
	targetWordCount: number;
	evidenceRefs: string[];
	fingerprint: string;
	diagnostics: string[];
}

export interface DocumentaryVoiceChunk {
	id: string;
	beatIds: string[];
	text: string;
	mediaId?: string;
	itemId?: string;
	durationSeconds?: number;
}

export interface DocumentaryVoiceManifest {
	provider?: string;
	voice?: string;
	direction: string[];
	chunks: DocumentaryVoiceChunk[];
	measuredDurationSeconds?: number;
	fingerprint?: string;
}

export const DOCUMENTARY_VISUAL_INTENTS = [
	'archival-photo',
	'halftone-subject',
	'paper-document',
	'map',
	'map-route',
	'timeline',
	'newspaper-clipping',
	'object-evidence',
	'number-card',
	'quote-strip',
	'diagram',
	'connection-board',
	'location-card',
	'motion-composition'
] as const;
export type DocumentaryVisualIntent = (typeof DOCUMENTARY_VISUAL_INTENTS)[number];

export interface DocumentaryBeat {
	id: string;
	index: number;
	narration: string;
	startSeconds: number;
	durationSeconds: number;
	coreIdea: string;
	evidenceRefs: string[];
	visualIntent: DocumentaryVisualIntent;
	requiredSubjectIds: string[];
}

export interface DocumentaryAnimationBrief {
	camera: 'locked' | 'micro-push';
	cadence: 'stepped';
	assemblyOrder: 'back-to-front' | 'hero-first';
	holdRatio: number;
	ambientLife: Array<'paper-corner-lift' | 'shadow-breathe' | 'halftone-flicker' | 'string-quiver'>;
}

export interface DocumentaryVisualPlan {
	beatId: string;
	visualIntent: DocumentaryVisualIntent;
	hero: string;
	supports: string[];
	label?: string;
	prompt: string;
	requiredSubjectIds: string[];
	mediaId?: string;
	animation: DocumentaryAnimationBrief;
	fingerprint?: string;
}

export interface DocumentaryThumbnailPlan {
	id: string;
	hero: string;
	headline?: string;
	textElements: string[];
	prompt: string;
	mediaId?: string;
}

export interface DocumentaryRun {
	schemaVersion: 1;
	id: string;
	workspaceId: string;
	projectId?: string;
	mode: typeof DOCUMENTARY_MODE;
	style: typeof DOCUMENTARY_STYLE;
	currentStep: DocumentaryStep;
	generationVersion: number;
	source?: AutoVideoSource;
	niche?: string;
	ideas: DocumentaryIdea[];
	selectedIdeaId?: string;
	customTopic?: string;
	targetDurationSeconds?: DocumentaryDuration;
	language: string;
	script?: DocumentaryScript;
	voice?: DocumentaryVoiceManifest;
	beats: DocumentaryBeat[];
	visualPlans: DocumentaryVisualPlan[];
	thumbnails: DocumentaryThumbnailPlan[];
	stepStates: Partial<Record<DocumentaryStep, DocumentaryStepState>>;
	providerManifest: Record<string, string>;
	createdAt: string;
	updatedAt: string;
}
