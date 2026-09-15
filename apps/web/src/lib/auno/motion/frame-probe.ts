import type { MotionFrameProbe, MotionProbePlan } from '@auno/motion';
import { timelineStore } from '$lib/video-editor/timeline/stores/timeline-store.svelte';

export interface MotionProbeRange {
	probe: MotionFrameProbe;
	startFrame: number;
	endFrame: number;
}

/** Canonical whole-project probes: 0%, 25%, 50%, 75%, and the final authored frame. */
export function frameProbeFrames(totalFrames: number): number[] {
	const total = Math.max(1, Math.round(totalFrames));
	const last = total - 1;
	return [...new Set([
		0,
		Math.round(last * 0.25),
		Math.round(last * 0.5),
		Math.round(last * 0.75),
		last
	])];
}

/** Preview uses the exact persisted frame, never wall-clock playback time. */
export function seekPreviewMotionProbe(probe: MotionFrameProbe): number {
	const maxFrame = Math.max(0, timelineStore.maxItemEndFrame - 1);
	const frame = Math.max(0, Math.min(maxFrame, Math.round(probe.frame)));
	timelineStore.setAll({ currentFrame: frame });
	return frame;
}

/**
 * Export/image-sequence code can consume these one-frame ranges verbatim.
 * endFrame is exclusive, matching normal editor export range semantics.
 */
export function motionProbeExportRanges(plan: MotionProbePlan): MotionProbeRange[] {
	return plan.projectProbes.map((probe) => {
		const frame = Math.max(0, Math.min(plan.totalFrames - 1, Math.round(probe.frame)));
		return { probe, startFrame: frame, endFrame: frame + 1 };
	});
}

export function motionProbeFramesMatchPlan(plan: MotionProbePlan): boolean {
	const expected = frameProbeFrames(plan.totalFrames);
	const actual = plan.projectProbes.map((probe) => probe.frame);
	return expected.length === actual.length && expected.every((frame, index) => frame === actual[index]);
}
