import type { ImageEditorDocument, ImageEditorPage } from './types';
import { renderImageEditorPreview } from './static-renderer';

const MAX_CONCURRENT_PREVIEWS = 2;

export function createImageEditorPreviewQueue(
	render: (document: ImageEditorDocument, page: ImageEditorPage) => Promise<Blob>
): (document: ImageEditorDocument, page: ImageEditorPage, signal: AbortSignal) => Promise<Blob> {
	let activePreviews = 0;
	const pendingPreviews: Array<{
		document: ImageEditorDocument;
		page: ImageEditorPage;
		signal: AbortSignal;
		resolve: (blob: Blob) => void;
		reject: (error: Error) => void;
	}> = [];

	function startPendingPreviews(): void {
		while (activePreviews < MAX_CONCURRENT_PREVIEWS && pendingPreviews.length > 0) {
			const pending = pendingPreviews.shift()!;
			if (pending.signal.aborted) {
				pending.reject(new DOMException('Preview canceled', 'AbortError'));
				continue;
			}
			activePreviews++;
			void render(pending.document, pending.page)
				.then((blob) => {
					if (pending.signal.aborted)
						pending.reject(new DOMException('Preview canceled', 'AbortError'));
					else pending.resolve(blob);
				})
				.catch((error: Error) => pending.reject(error))
				.finally(() => {
					activePreviews--;
					startPendingPreviews();
				});
		}
	}

	return (document, page, signal) =>
		new Promise((resolve, reject) => {
			pendingPreviews.push({ document, page, signal, resolve, reject });
			startPendingPreviews();
		});
}

export const queueImageEditorPreview = createImageEditorPreviewQueue(renderImageEditorPreview);
