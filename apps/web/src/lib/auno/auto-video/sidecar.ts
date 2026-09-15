import type { AutoVideoSidecar } from './types';

const SIDECAR_PREFIX = 'auno:auto-video:';

function key(projectId: string): string {
	return `${SIDECAR_PREFIX}${projectId}`;
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
