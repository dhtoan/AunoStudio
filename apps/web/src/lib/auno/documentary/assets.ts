import { uploadMediaFile } from '$lib/media-upload-client';
import type { DocumentaryVisualPlan } from './types';

export type DocumentaryGeneratedAssetKind = 'image' | 'video';

export interface DocumentaryGeneratedAsset {
	mediaId: string;
	kind: DocumentaryGeneratedAssetKind;
	mimeType: string;
}

interface UploadedMediaIdentity {
	id: string;
	mime_type?: string;
}

export type DocumentaryMediaUpload = (input: {
	workspaceId: string;
	file: File;
	source: 'generated';
	assetKind: 'library';
	retentionClass: 'library';
	prepareVideo: boolean;
}) => Promise<UploadedMediaIdentity>;

function mimeMatchesKind(mimeType: string, kind: DocumentaryGeneratedAssetKind): boolean {
	const normalized = mimeType.trim().toLowerCase();
	return kind === 'image' ? normalized.startsWith('image/') : normalized.startsWith('video/');
}

export async function importGeneratedDocumentaryAsset(options: {
	workspaceId: string;
	file: File;
	kind: DocumentaryGeneratedAssetKind;
	upload?: DocumentaryMediaUpload;
}): Promise<DocumentaryGeneratedAsset> {
	const workspaceId = options.workspaceId.trim();
	if (!workspaceId) throw new Error('A workspace is required to import documentary media.');
	const mimeType = options.file.type.trim().toLowerCase();
	if (!mimeMatchesKind(mimeType, options.kind)) {
		throw new Error(`Generated asset MIME ${mimeType || 'unknown'} does not match ${options.kind}.`);
	}
	const upload = options.upload ?? (uploadMediaFile as DocumentaryMediaUpload);
	const uploaded = await upload({
		workspaceId,
		file: options.file,
		source: 'generated',
		assetKind: 'library',
		retentionClass: 'library',
		prepareVideo: options.kind === 'video'
	});
	const uploadedMime = (uploaded.mime_type || mimeType).trim().toLowerCase();
	if (!uploaded.id?.trim() || !mimeMatchesKind(uploadedMime, options.kind)) {
		throw new Error('Generated documentary media import returned an invalid durable media identity.');
	}
	return { mediaId: uploaded.id, kind: options.kind, mimeType: uploadedMime };
}

export function replaceVisualPlanMedia(
	plan: DocumentaryVisualPlan,
	asset: DocumentaryGeneratedAsset
): DocumentaryVisualPlan {
	return { ...plan, mediaId: asset.mediaId };
}
