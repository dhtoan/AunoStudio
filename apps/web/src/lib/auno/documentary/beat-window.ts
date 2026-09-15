import type { DocumentaryBeat } from './types';

export interface BeatWindow {
	start: number;
	end: number;
}

export function visibleBeatWindow(total: number, anchor: number, radius = 18): BeatWindow {
	const count = Math.max(0, Math.floor(total));
	if (count === 0) return { start: 0, end: 0 };
	const normalizedRadius = Math.max(0, Math.floor(radius));
	const normalizedAnchor = Math.min(count - 1, Math.max(0, Math.floor(anchor)));
	return {
		start: Math.max(0, normalizedAnchor - normalizedRadius),
		end: Math.min(count, normalizedAnchor + normalizedRadius + 1)
	};
}

function retimeBeats(beats: DocumentaryBeat[]): DocumentaryBeat[] {
	let cursor = 0;
	return beats.map((beat, index) => {
		const next = {
			...beat,
			index,
			startSeconds: cursor,
			durationSeconds: Math.max(0.1, beat.durationSeconds)
		};
		cursor += next.durationSeconds;
		return next;
	});
}

export function updateDocumentaryBeat(
	beats: readonly DocumentaryBeat[],
	beatId: string,
	patch: Partial<Pick<DocumentaryBeat, 'narration' | 'coreIdea' | 'visualIntent' | 'requiredSubjectIds'>>
): DocumentaryBeat[] {
	return beats.map((beat) => (beat.id === beatId ? { ...beat, ...patch } : { ...beat }));
}

export function splitDocumentaryBeat(
	beats: readonly DocumentaryBeat[],
	beatId: string
): DocumentaryBeat[] {
	const index = beats.findIndex((beat) => beat.id === beatId);
	if (index < 0) return beats.map((beat) => ({ ...beat }));
	const beat = beats[index]!;
	const words = beat.narration.trim().split(/\s+/).filter(Boolean);
	const splitAt = Math.max(1, Math.min(words.length - 1, Math.ceil(words.length / 2)));
	const firstNarration = words.length > 1 ? words.slice(0, splitAt).join(' ') : beat.narration.trim();
	const secondNarration = words.length > 1 ? words.slice(splitAt).join(' ') : beat.narration.trim();
	const firstDuration = beat.durationSeconds / 2;
	const secondDuration = beat.durationSeconds - firstDuration;
	const left: DocumentaryBeat = {
		...beat,
		id: `${beat.id}-a`,
		narration: firstNarration,
		coreIdea: firstNarration || beat.coreIdea,
		durationSeconds: firstDuration
	};
	const right: DocumentaryBeat = {
		...beat,
		id: `${beat.id}-b`,
		narration: secondNarration,
		coreIdea: secondNarration || beat.coreIdea,
		durationSeconds: secondDuration
	};
	return retimeBeats([
		...beats.slice(0, index).map((entry) => ({ ...entry })),
		left,
		right,
		...beats.slice(index + 1).map((entry) => ({ ...entry }))
	]);
}

export function mergeDocumentaryBeatWithNext(
	beats: readonly DocumentaryBeat[],
	beatId: string
): DocumentaryBeat[] {
	const index = beats.findIndex((beat) => beat.id === beatId);
	if (index < 0 || index >= beats.length - 1) return beats.map((beat) => ({ ...beat }));
	const current = beats[index]!;
	const next = beats[index + 1]!;
	const merged: DocumentaryBeat = {
		...current,
		narration: `${current.narration.trim()} ${next.narration.trim()}`.trim(),
		coreIdea: current.coreIdea || next.coreIdea,
		durationSeconds: current.durationSeconds + next.durationSeconds,
		evidenceRefs: [...new Set([...current.evidenceRefs, ...next.evidenceRefs])],
		requiredSubjectIds: [...new Set([...current.requiredSubjectIds, ...next.requiredSubjectIds])]
	};
	return retimeBeats([
		...beats.slice(0, index).map((entry) => ({ ...entry })),
		merged,
		...beats.slice(index + 2).map((entry) => ({ ...entry }))
	]);
}
