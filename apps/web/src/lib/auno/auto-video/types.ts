import type { MotionProbePlan, MotionValidationIssue, StyleBrief } from '@auno/motion';

export const AUTO_VIDEO_FORMATS = ['review', 'news', 'guide', 'compare', 'top-n'] as const;
export type AutoVideoFormat = (typeof AUTO_VIDEO_FORMATS)[number];

export const AUTO_VIDEO_SOURCE_KINDS = [
	'text',
	'url',
	'markdown',
	'txt',
	'image',
	'video',
	'pdf',
	'media'
] as const;
export type AutoVideoSourceKind = (typeof AUTO_VIDEO_SOURCE_KINDS)[number];

export const AUTO_VIDEO_VISUAL_INTENTS = [
	'image',
	'video',
	'b-roll',
	'icon',
	'chart',
	'big-number',
	'split-screen',
	'document',
	'map',
	'product',
	'quote',
	'motion-composition'
] as const;
export type AutoVideoVisualIntent = (typeof AUTO_VIDEO_VISUAL_INTENTS)[number];

export type AutoVideoSceneRole =
	| 'hook'
	| 'overview'
	| 'feature'
	| 'pros'
	| 'cons'
	| 'verdict'
	| 'cta'
	| 'what-happened'
	| 'key-fact'
	| 'big-number'
	| 'why-it-matters'
	| 'impact'
	| 'what-next'
	| 'problem'
	| 'definition'
	| 'step'
	| 'mistake'
	| 'tip'
	| 'versus'
	| 'price'
	| 'advantage'
	| 'disadvantage'
	| 'best-for'
	| 'rank'
	| 'summary';

export interface AutoVideoSource {
	id: string;
	kind: AutoVideoSourceKind;
	label: string;
	value: string;
	url?: string;
	mimeType?: string;
	mediaId?: string;
	fetchedAt?: number;
}

export interface AutoVideoScene {
	id: string;
	role: AutoVideoSceneRole;
	title: string;
	voice: string;
	visualIntent: AutoVideoVisualIntent;
	durationSeconds: number;
	sourceIds: string[];
}

export interface AutoVideoStoryboard {
	version: 1;
	id: string;
	format: AutoVideoFormat;
	title: string;
	language: string;
	targetDurationSeconds: number;
	scenes: AutoVideoScene[];
}

export type AutoVideoOwnershipCategory = 'visual' | 'motion' | 'voice' | 'caption' | 'music';

export interface AutoVideoOwnedItem {
	itemId: string;
	sceneId?: string;
	category: AutoVideoOwnershipCategory;
	generatedHash?: string;
}

export interface AutoVideoGenerationBlock {
	sceneId: string;
	/** Legacy flat ownership retained for existing sidecars. */
	ownedItemIds: string[];
	userModifiedItemIds: string[];
}

export interface AutoVideoVoiceAsset {
	sceneId: string;
	itemId: string;
	mediaId: string;
	durationSeconds: number;
	engine: string;
	voice: string;
}

export interface AutoVideoCaptionAsset {
	itemId: string;
	generatedAt: number;
	source: 'script';
}

export interface AutoVideoMusicAsset {
	itemId: string;
	mediaId: string;
	durationSeconds: number;
	provider: string;
	prompt: string;
	seed?: number;
}

export interface AutoVideoGeneratedMedia {
	voices?: AutoVideoVoiceAsset[];
	captions?: AutoVideoCaptionAsset;
	music?: AutoVideoMusicAsset;
}

export interface AutoVideoMotionState {
	schemaVersion: 1;
	style: string;
	seed: number;
	brief?: StyleBrief;
	diagnostics?: MotionValidationIssue[];
	probePlan?: MotionProbePlan;
	probeSignature?: string;
}

export interface AutoVideoGenerationGraph {
	version: 1;
	blocks: AutoVideoGenerationBlock[];
	/** Category-aware ownership. Missing on legacy sidecars; consumers fall back to blocks/media. */
	ownedItems?: AutoVideoOwnedItem[];
	media?: AutoVideoGeneratedMedia;
	motion?: AutoVideoMotionState;
}

export interface AutoVideoSidecar {
	version: 1;
	projectId: string;
	generationVersion: number;
	templateId?: string;
	createdAt: number;
	updatedAt: number;
	source: AutoVideoSource;
	storyboard: AutoVideoStoryboard;
	providerManifest: Record<string, string>;
	generationGraph?: AutoVideoGenerationGraph;
}

export interface BuildStoryboardInput {
	format: AutoVideoFormat;
	title?: string;
	language: string;
	targetDurationSeconds: number;
	source: AutoVideoSource;
}
