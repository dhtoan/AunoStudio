import { frameProbeFrames, type MotionFrameProbe, type MotionProbePlan } from '@auno/motion';
import { timelineStore } from '$lib/video-editor/timeline/stores/timeline-store.svelte';

export interface MotionProbeRange {
	id: string;
	frame: number;
	startFrame: number;
	endFrame: number;
}

/** Preview uses the exact persisted frame, never wall-clock playback time. */
export function seekPreviewMotionProbe(probe: MotionFrameProbe | number): number {
	const requested = typeof probe === 'number' ? probe : probe.frame;
	const maxFrame = Math.max(0, timelineStore.maxItemEndFrame - 1);
	const frame = Math.max(0, Math.min(maxFrame, Math.round(requested)));
	timelineStore.setAll({ currentFrame: frame });
	return frame;
}

/**
 * Export/image-sequence code can consume these one-frame ranges verbatim.
 * endFrame is exclusive, matching normal editor export range semantics.
 */
export function motionProbeExportRanges(plan: MotionProbePlan): MotionProbeRange[] {
	return plan.projectFrames.map((projectFrame, index) => {
		const frame = Math.max(0, Math.min(plan.totalFrames - 1, Math.round(projectFrame)));
		return {
			id: `motion-project-probe:${index}:${frame}`,
			frame,
			startFrame: frame,
			endFrame: frame + 1
		};
	});
}

export function motionProbeFramesMatchPlan(plan: MotionProbePlan): boolean {
	const expected = frameProbeFrames(plan.totalFrames);
	const actual = plan.projectFrames;
	return expected.length === actual.length && expected.every((frame, index) => frame === actual[index]);
}
