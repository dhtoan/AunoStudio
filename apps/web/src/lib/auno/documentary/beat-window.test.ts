import { describe, expect, it } from 'vitest';
import type { DocumentaryBeat } from './types';
import {
	mergeDocumentaryBeatWithNext,
	splitDocumentaryBeat,
	visibleBeatWindow
} from './beat-window';

function beats(count: number): DocumentaryBeat[] {
	return Array.from({ length: count }, (_, index) => ({
		id: `beat-${index + 1}`,
		index,
		narration: `Narration ${index + 1}`,
		startSeconds: index * 2.5,
		durationSeconds: 2.5,
		coreIdea: `Idea ${index + 1}`,
		evidenceRefs: [],
		visualIntent: 'archival-photo',
		requiredSubjectIds: []
	}));
}

describe('visibleBeatWindow', () => {
	it('bounds a 120 beat project to a small rendering window', () => {
		expect(visibleBeatWindow(120, 60, 18)).toEqual({ start: 42, end: 79 });
		expect(79 - 42).toBeLessThanOrEqual(37);
	});

	it('clamps safely at project edges', () => {
		expect(visibleBeatWindow(120, 0, 18)).toEqual({ start: 0, end: 19 });
		expect(visibleBeatWindow(120, 119, 18)).toEqual({ start: 101, end: 120 });
	});
});

describe('manual beat edits', () => {
	it('splits a beat without changing total duration', () => {
		const input = beats(3);
		const output = splitDocumentaryBeat(input, 'beat-2');
		expect(output).toHaveLength(4);
		expect(output.reduce((sum, beat) => sum + beat.durationSeconds, 0)).toBe(7.5);
		expect(output.map((beat) => beat.startSeconds)).toEqual([0, 2.5, 3.75, 5]);
	});

	it('merges with the next beat while preserving the full timeline range', () => {
		const input = beats(3);
		const output = mergeDocumentaryBeatWithNext(input, 'beat-2');
		expect(output).toHaveLength(2);
		expect(output[1]?.durationSeconds).toBe(5);
		expect(output.reduce((sum, beat) => sum + beat.durationSeconds, 0)).toBe(7.5);
		expect(output[1]?.narration).toBe('Narration 2 Narration 3');
	});
});
