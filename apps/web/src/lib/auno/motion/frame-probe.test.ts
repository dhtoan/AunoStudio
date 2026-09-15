import { describe, expect, it } from 'vitest';
import type { MotionProbePlan } from '@auno/motion';
import { motionProbeExportRanges, motionProbeFramesMatchPlan } from './frame-probe';

describe('motion frame probes', () => {
	it('maps persisted project probes to exact one-frame export ranges', () => {
		const plan: MotionProbePlan = {
			schemaVersion: 1,
			fps: 30,
			totalFrames: 300,
			projectFrames: [0, 75, 150, 225, 299],
			probes: []
		};

		expect(motionProbeFramesMatchPlan(plan)).toBe(true);
		expect(motionProbeExportRanges(plan)).toEqual([
			{ id: 'motion-project-probe:0:0', frame: 0, startFrame: 0, endFrame: 1 },
			{ id: 'motion-project-probe:1:75', frame: 75, startFrame: 75, endFrame: 76 },
			{ id: 'motion-project-probe:2:150', frame: 150, startFrame: 150, endFrame: 151 },
			{ id: 'motion-project-probe:3:225', frame: 225, startFrame: 225, endFrame: 226 },
			{ id: 'motion-project-probe:4:299', frame: 299, startFrame: 299, endFrame: 300 }
		]);
	});

	it('rejects a persisted project probe set that drifts from the canonical plan', () => {
		const plan: MotionProbePlan = {
			schemaVersion: 1,
			fps: 30,
			totalFrames: 300,
			projectFrames: [0, 75, 149, 225, 299],
			probes: []
		};

		expect(motionProbeFramesMatchPlan(plan)).toBe(false);
	});
});
