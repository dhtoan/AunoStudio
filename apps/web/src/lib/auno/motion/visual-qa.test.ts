import { describe, expect, it } from 'vitest';
import type { AutoVideoVisualIssue } from '$lib/auno/auto-video/types';
import { mergeVisualDiagnostics } from './visual-qa';

describe('mergeVisualDiagnostics', () => {
	it('deduplicates the same measurable issue while preserving error severity', () => {
		const authored: AutoVideoVisualIssue[] = [
			{
				code: 'visual.text_clipped',
				severity: 'warning',
				sceneId: 'scene-1',
				itemId: 'scene-1-text',
				message: 'Static safe-area warning.'
			}
		];
		const runtime: AutoVideoVisualIssue[] = [
			{
				code: 'visual.text_clipped',
				severity: 'error',
				sceneId: 'scene-1',
				itemId: 'scene-1-text',
				message: 'Measured text bounds leave the stage safe area.'
			}
		];

		expect(mergeVisualDiagnostics(authored, runtime)).toEqual([
			{
				code: 'visual.text_clipped',
				severity: 'error',
				sceneId: 'scene-1',
				itemId: 'scene-1-text',
				message: 'Measured text bounds leave the stage safe area.'
			}
		]);
	});

	it('keeps unrelated diagnostics in stable input order', () => {
		const authored: AutoVideoVisualIssue[] = [
			{ code: 'visual.blank_scene', severity: 'error', sceneId: 'a', message: 'blank' }
		];
		const runtime: AutoVideoVisualIssue[] = [
			{ code: 'visual.low_contrast', severity: 'warning', sceneId: 'b', itemId: 'label', message: 'contrast' }
		];

		expect(mergeVisualDiagnostics(authored, runtime)).toEqual([...authored, ...runtime]);
	});
});
