import { describe, expect, it, vi } from 'vitest';
import type { ImageEditorDocument, ImageEditorPage } from './types';
import { createImageEditorPreviewQueue } from './preview-queue';

describe('Image Editor page preview queue', () => {
	it('renders at most two pages at once and skips a canceled queued page', async () => {
		const resolvers: Array<(blob: Blob) => void> = [];
		const render = vi.fn(
			(_document: ImageEditorDocument, _page: ImageEditorPage): Promise<Blob> =>
				new Promise((resolve) => resolvers.push(resolve))
		);
		const pages: ImageEditorPage[] = ['one', 'two', 'three'].map((id) => ({
			id,
			name: id,
			background_color: '#ffffff',
			layers: []
		}));
		const document: ImageEditorDocument = {
			schema_version: 1,
			title: 'Queue test',
			preset_key: 'custom',
			width_px: 512,
			height_px: 512,
			brand_kit_revision: 0,
			export_defaults: { format: 'png', quality: 0.9, matte_color: '#ffffff' },
			pages
		};
		const queue = createImageEditorPreviewQueue(render);
		const signals = pages.map(() => new AbortController());
		const jobs = pages.map((page, index) => queue(document, page, signals[index].signal));
		expect(render).toHaveBeenCalledTimes(2);
		signals[2].abort();
		const canceled = jobs[2].catch(() => undefined);
		resolvers[0](new Blob());
		await jobs[0];
		await canceled;
		expect(render).toHaveBeenCalledTimes(2);
		resolvers[1](new Blob());
		await jobs[1];
	});
});
