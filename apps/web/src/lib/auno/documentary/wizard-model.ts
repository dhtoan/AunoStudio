import type { DocumentaryRun, DocumentaryStep } from './types';
import { DOCUMENTARY_DURATIONS } from './types';

export const DOCUMENTARY_WIZARD_DEFAULTS = {
	canvas: 'landscape' as const,
	style: 'documentary-paper-collage' as const,
	duration: 60 as const,
	language: 'en-US' as const,
	durations: [...DOCUMENTARY_DURATIONS]
};

function selectedTopic(run: DocumentaryRun): boolean {
	return Boolean(run.selectedIdeaId?.trim() || run.customTopic?.trim());
}

function hasOutput(run: DocumentaryRun, step: DocumentaryStep): boolean {
	switch (step) {
		case 'source':
			return Boolean(run.source);
		case 'topic':
			return Boolean(run.niche?.trim() || run.customTopic?.trim());
		case 'ideas':
			return run.ideas.length > 0;
		case 'duration':
			return Boolean(run.targetDurationSeconds);
		case 'script':
			return Boolean(run.script?.text.trim());
		case 'voice':
			return Boolean(run.voice?.chunks.length || run.voice?.fingerprint);
		case 'beats':
			return run.beats.length > 0;
		case 'visuals':
			return run.visualPlans.length > 0;
		case 'animation':
			return run.visualPlans.some((plan) => Boolean(plan.animation));
		case 'thumbnails':
			return run.thumbnails.length > 0;
		case 'project':
			return Boolean(run.projectId);
	}
}

export function documentaryStepEnabled(run: DocumentaryRun, step: DocumentaryStep): boolean {
	switch (step) {
		case 'source':
		case 'topic':
			return true;
		case 'ideas':
			return Boolean(run.niche?.trim() || run.customTopic?.trim() || run.source);
		case 'duration':
			return run.ideas.length > 0 || Boolean(run.customTopic?.trim());
		case 'script':
			return selectedTopic(run) && Boolean(run.targetDurationSeconds);
		case 'voice':
			return Boolean(run.script?.text.trim());
		case 'beats':
			return Boolean(run.script?.text.trim());
		case 'visuals':
			return run.beats.length > 0;
		case 'animation':
			return run.visualPlans.length > 0;
		case 'thumbnails':
			return Boolean(run.script?.text.trim());
		case 'project':
			return run.beats.length > 0 && run.visualPlans.length > 0;
	}
}

export function documentaryStepState(
	run: DocumentaryRun,
	step: DocumentaryStep
): { status: 'pending' | 'ready' | 'stale'; hasOutput: boolean } {
	return {
		status: run.stepStates[step]?.status ?? (hasOutput(run, step) ? 'ready' : 'pending'),
		hasOutput: hasOutput(run, step)
	};
}
