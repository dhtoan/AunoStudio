import { autoVideoMediaKind, listAutoVideoLibraryMedia } from '$lib/auno/auto-video/media-library';
import { saveAutoVideoSidecarRemote } from '$lib/auno/auto-video/sidecar';
import { CloudVideoProjectRepository } from '$lib/video-editor/cloud/project-repository';
import type { Project } from '$lib/video-editor/project/types';
import { compileDocumentaryRunToProject, type DocumentaryCompileAsset } from './compiler';
import type { DocumentaryRun } from './types';

export interface DocumentaryProjectHandoff {
	projectId: string;
	project: Project;
	missingMediaIds: string[];
}

async function compileAssets(workspaceId: string, run: DocumentaryRun): Promise<{
	assets: DocumentaryCompileAsset[];
	missingMediaIds: string[];
}> {
	const requested = [...new Set(run.visualPlans.map((plan) => plan.mediaId?.trim()).filter((id): id is string => Boolean(id)))];
	if (requested.length === 0) return { assets: [], missingMediaIds: [] };
	const library = await listAutoVideoLibraryMedia(workspaceId);
	const byId = new Map(library.map((item) => [item.id, item]));
	const assets: DocumentaryCompileAsset[] = [];
	const missingMediaIds: string[] = [];
	for (const mediaId of requested) {
		const item = byId.get(mediaId);
		const kind = item ? autoVideoMediaKind(item.mime_type) : null;
		if (!item || (kind !== 'image' && kind !== 'video')) {
			missingMediaIds.push(mediaId);
			continue;
		}
		const extended = item as typeof item & {
			width?: number;
			height?: number;
			duration?: number;
			fps?: number;
			file_name?: string;
		};
		assets.push({
			mediaId,
			kind,
			fileName: extended.file_name || item.alt_text || `${kind}-${mediaId.slice(0, 8)}`,
			width: Math.max(1, extended.width || 1920),
			height: Math.max(1, extended.height || 1080),
			durationSeconds: kind === 'video' ? Math.max(0, extended.duration || 0) : undefined,
			fps: kind === 'video' ? Math.max(1, extended.fps || 30) : undefined
		});
	}
	return { assets, missingMediaIds };
}

export async function createCloudDocumentaryProject(
	workspaceId: string,
	run: DocumentaryRun
): Promise<DocumentaryProjectHandoff> {
	const normalizedWorkspaceId = workspaceId.trim();
	if (!normalizedWorkspaceId) throw new Error('Select the workspace that owns this documentary run.');
	if (run.beats.length === 0) throw new Error('Generate documentary beats before creating the native project.');

	const { assets, missingMediaIds } = await compileAssets(normalizedWorkspaceId, run);
	const compiled = compileDocumentaryRunToProject(run, assets);
	const repository = new CloudVideoProjectRepository<Project>(normalizedWorkspaceId);
	const created = await repository.createWithId(compiled.project.id, compiled.project.name, compiled.project);
	compiled.sidecar.projectId = created.id;
	await saveAutoVideoSidecarRemote(normalizedWorkspaceId, compiled.sidecar);
	return { projectId: created.id, project: compiled.project, missingMediaIds };
}
