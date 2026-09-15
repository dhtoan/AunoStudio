import { applyAPIRequestHeaders } from '$lib/api/client';
import type {
	AutoVideoDocumentaryManifest,
	AutoVideoGenerationGraph,
	AutoVideoSidecar,
	AutoVideoSource,
	AutoVideoStoryboard
} from './types';

const SIDECAR_PREFIX = 'auno:auto-video:';

function key(projectId: string): string {
	return `${SIDECAR_PREFIX}${projectId}`;
}

function requestHeaders(): Headers {
	return applyAPIRequestHeaders(new Headers({ 'Content-Type': 'application/json' }));
}

export function documentaryManifest(
	sidecar: AutoVideoSidecar | null | undefined
): AutoVideoDocumentaryManifest | null {
	const manifest = sidecar?.generationGraph?.documentary;
	if (!manifest?.runId || !Array.isArray(manifest.beatIds) || !manifest.style) return null;
	return manifest;
}

export function saveAutoVideoSidecar(sidecar: AutoVideoSidecar): void {
	if (typeof localStorage === 'undefined') return;
	localStorage.setItem(key(sidecar.projectId), JSON.stringify(sidecar));
}

export function loadAutoVideoSidecar(projectId: string): AutoVideoSidecar | null {
	if (typeof localStorage === 'undefined') return null;
	const raw = localStorage.getItem(key(projectId));
	if (!raw) return null;
	try {
		const parsed = JSON.parse(raw) as AutoVideoSidecar;
		return parsed?.version === 1 && parsed.projectId === projectId ? parsed : null;
	} catch {
		return null;
	}
}

export function removeAutoVideoSidecar(projectId: string): void {
	if (typeof localStorage === 'undefined') return;
	localStorage.removeItem(key(projectId));
}

type RemoteSidecar = {
	project_id: string;
	workspace_id: string;
	generation_version: number;
	template_id?: string;
	source_manifest: { source?: AutoVideoSource };
	storyboard: AutoVideoStoryboard;
	provider_manifest: Record<string, string>;
	generation_graph?: AutoVideoGenerationGraph;
	created_at: string;
	updated_at: string;
};

function fromRemote(value: RemoteSidecar): AutoVideoSidecar | null {
	const source = value.source_manifest?.source;
	if (!source || !value.storyboard || value.storyboard.version !== 1) return null;
	const createdAt = Date.parse(value.created_at);
	const updatedAt = Date.parse(value.updated_at);
	return {
		version: 1,
		projectId: value.project_id,
		generationVersion: value.generation_version,
		templateId: value.template_id || undefined,
		createdAt: Number.isFinite(createdAt) ? createdAt : Date.now(),
		updatedAt: Number.isFinite(updatedAt) ? updatedAt : Date.now(),
		source,
		storyboard: value.storyboard,
		providerManifest: value.provider_manifest ?? {},
		generationGraph: value.generation_graph
	};
}

export async function saveAutoVideoSidecarRemote(
	workspaceId: string,
	sidecar: AutoVideoSidecar,
	signal?: AbortSignal
): Promise<boolean> {
	saveAutoVideoSidecar(sidecar);
	if (!workspaceId.trim()) return false;
	try {
		const response = await fetch(`/api/v1/auno/auto-video/projects/${encodeURIComponent(sidecar.projectId)}`, {
			method: 'PUT',
			credentials: 'include',
			headers: requestHeaders(),
			signal,
			body: JSON.stringify({
				workspace_id: workspaceId,
				generation_version: sidecar.generationVersion,
				template_id: sidecar.templateId ?? '',
				source_manifest: { source: sidecar.source },
				storyboard: sidecar.storyboard,
				provider_manifest: sidecar.providerManifest,
				generation_graph: sidecar.generationGraph ?? { version: 1, blocks: [] }
			})
		});
		return response.ok;
	} catch {
		return false;
	}
}

export async function loadAutoVideoSidecarRemote(
	workspaceId: string,
	projectId: string,
	signal?: AbortSignal
): Promise<AutoVideoSidecar | null> {
	if (!workspaceId.trim()) return loadAutoVideoSidecar(projectId);
	try {
		const query = new URLSearchParams({ workspace_id: workspaceId });
		const response = await fetch(
			`/api/v1/auno/auto-video/projects/${encodeURIComponent(projectId)}?${query.toString()}`,
			{ credentials: 'include', headers: requestHeaders(), signal }
		);
		if (!response.ok) return loadAutoVideoSidecar(projectId);
		const remote = fromRemote((await response.json()) as RemoteSidecar);
		if (remote) saveAutoVideoSidecar(remote);
		return remote ?? loadAutoVideoSidecar(projectId);
	} catch {
		return loadAutoVideoSidecar(projectId);
	}
}

export async function removeAutoVideoSidecarRemote(
	workspaceId: string,
	projectId: string,
	signal?: AbortSignal
): Promise<void> {
	removeAutoVideoSidecar(projectId);
	if (!workspaceId.trim()) return;
	try {
		await fetch(`/api/v1/auno/auto-video/projects/${encodeURIComponent(projectId)}`, {
			method: 'DELETE',
			credentials: 'include',
			headers: requestHeaders(),
			signal,
			body: JSON.stringify({ workspace_id: workspaceId })
		});
	} catch {
		// Sidecar deletion is best-effort and must never block the native project.
	}
}
