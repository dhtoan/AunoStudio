import { describe, expect, it, vi } from 'vitest';
import type { DocumentaryVisualPlan } from './types';
import { importGeneratedDocumentaryAsset, replaceVisualPlanMedia } from './assets';

const plan: DocumentaryVisualPlan = {
	beatId: 'beat-1',
	visualIntent: 'archival-photo',
	hero: 'archive photograph',
	supports: [],
	prompt: 'archive photograph on paper',
	requiredSubjectIds: [],
	animation: { camera: 'locked', cadence: 'stepped', assemblyOrder: 'back-to-front', holdRatio: 0.18, ambientLife: [] }
};

describe('documentary generated asset imports', () => {
	it('imports through the supplied Media Library boundary and returns only durable media identity', async () => {
		const upload = vi.fn(async () => ({ id: 'media-123', mime_type: 'image/png' }));
		const file = new File(['pixels'], 'generated.png', { type: 'image/png' });
		const result = await importGeneratedDocumentaryAsset({
			workspaceId: 'workspace-1',
			file,
			kind: 'image',
			upload
		});
		expect(upload).toHaveBeenCalledOnce();
		expect(result).toEqual({ mediaId: 'media-123', kind: 'image', mimeType: 'image/png' });
		expect(JSON.stringify(result)).not.toContain('http');
	});

	it('replaces a visual plan with a Media Library id without flattening the beat', () => {
		const next = replaceVisualPlanMedia(plan, { mediaId: 'media-123', kind: 'image', mimeType: 'image/png' });
		expect(next.mediaId).toBe('media-123');
		expect(next.beatId).toBe(plan.beatId);
		expect(next.prompt).toBe(plan.prompt);
		expect(next.animation).toEqual(plan.animation);
	});

	it('rejects provider URL output and MIME/kind mismatches before project state can reference them', async () => {
		const upload = vi.fn();
		await expect(
			importGeneratedDocumentaryAsset({
				workspaceId: 'workspace-1',
				file: new File(['x'], 'generated.jpg', { type: 'image/jpeg' }),
				kind: 'video',
				upload
			})
		).rejects.toThrow(/does not match/i);
		expect(upload).not.toHaveBeenCalled();
	});
});
