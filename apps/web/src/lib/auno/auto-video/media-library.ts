import {
	mediaListQueryOptions,
	type MediaListItem
} from '@openpost/query-catalog';
import { queryClient } from '$lib/query/client';
import { mediaQueryAPI } from '$lib/query/media';

const MAX_AUTO_VIDEO_MEDIA_BYTES = 25 * 1024 * 1024;

export type AutoVideoLibraryMedia = MediaListItem;

export function autoVideoMediaKind(
	mimeType: string | undefined
): 'pdf' | 'image' | 'video' | null {
	const mime = (mimeType ?? '').trim().toLowerCase();
	if (mime === 'application/pdf') return 'pdf';
	if (mime.startsWith('image/')) return 'image';
	if (mime.startsWith('video/')) return 'video';
	return null;
}

export async function listAutoVideoLibraryMedia(
	workspaceId: string
): Promise<AutoVideoLibraryMedia[]> {
	if (!workspaceId.trim()) return [];
	const result = await queryClient.fetchQuery(
		mediaListQueryOptions(mediaQueryAPI, workspaceId, {
			lifecycle: 'library',
			sort: 'newest',
			type: 'all',
			limit: 50,
			offset: 0
		})
	);
	return (result.media ?? []).filter((item) => {
		if (!autoVideoMediaKind(item.mime_type)) return false;
		if (item.processing_status && item.processing_status !== 'ready') return false;
		const size = item.size ?? 0;
		return size > 0 && size <= MAX_AUTO_VIDEO_MEDIA_BYTES;
	});
}
