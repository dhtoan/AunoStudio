import type { MotionSourceScene } from '@auno/motion';
import type { DocumentaryRun, DocumentaryStep } from './types';

export const DOCUMENTARY_STEP_ORDER: readonly DocumentaryStep[] = [
	'source',
	'topic',
	'ideas',
	'duration',
	'script',
	'voice',
	'beats',
	'visuals',
	'animation',
	'thumbnails',
	'project'
];

export function cloneDocumentaryRun(run: DocumentaryRun): DocumentaryRun {
	return structuredClone(run);
}

export function isDocumentaryStepStale(run: DocumentaryRun, step: DocumentaryStep): boolean {
	return run.stepStates[step]?.status === 'stale';
}

export function documentaryStepReady(run: DocumentaryRun, step: DocumentaryStep): boolean {
	return run.stepStates[step]?.status === 'ready';
}

export function documentaryRunToMotionScenes(run: DocumentaryRun): MotionSourceScene[] {
	return run.beats.map((beat) => ({
		id: beat.id,
		title: beat.coreIdea || beat.narration,
		voice: beat.narration,
		visualIntent: beat.visualIntent,
		durationSeconds: beat.durationSeconds
	}));
}
