import { describe, expect, it } from 'vitest';
import { measureRuntimeVisualQA } from './runtime-visual-qa';

describe('measureRuntimeVisualQA', () => {
	it('reports a required subject that is not visible at the probe frame', () => {
		const issues = measureRuntimeVisualQA({
			sceneId: 'beat-7',
			stage: { x: 0, y: 0, width: 1920, height: 1080 },
			visibleItems: [],
			requiredSubjectIds: ['subject-doc'],
			textRects: [],
			assets: []
		});

		expect(issues.map((issue) => issue.code)).toContain('visual.missing_subject');
	});

	it('reports low contrast only from measured foreground and background colors', () => {
		const issues = measureRuntimeVisualQA({
			sceneId: 'beat-2',
			stage: { x: 0, y: 0, width: 1920, height: 1080 },
			visibleItems: ['label'],
			requiredSubjectIds: [],
			textRects: [],
			assets: [],
			contrastSamples: [
				{ itemId: 'label', foreground: '#777777', background: '#808080', sizeClass: 'normal' }
			]
		});

		expect(issues.map((issue) => issue.code)).toContain('visual.low_contrast');
	});

	it('does not infer low contrast when no measured sample is provided', () => {
		const issues = measureRuntimeVisualQA({
			sceneId: 'beat-2',
			stage: { x: 0, y: 0, width: 1920, height: 1080 },
			visibleItems: ['label'],
			requiredSubjectIds: [],
			textRects: [],
			assets: []
		});

		expect(issues.map((issue) => issue.code)).not.toContain('visual.low_contrast');
	});

	it('reports required assets that are not ready', () => {
		const issues = measureRuntimeVisualQA({
			sceneId: 'beat-3',
			stage: { x: 0, y: 0, width: 1920, height: 1080 },
			visibleItems: ['hero'],
			requiredSubjectIds: [],
			textRects: [],
			assets: [{ itemId: 'hero', status: 'loading', required: true }]
		});

		expect(issues.map((issue) => issue.code)).toContain('visual.asset_not_ready');
	});
});
