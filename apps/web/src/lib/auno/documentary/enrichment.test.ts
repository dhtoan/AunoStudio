import { describe, expect, it } from 'vitest';
import type { DocumentaryBeat } from './types';
import { planVoiceChunks, redistributeBeatDurations } from './enrichment';

function beats(count: number, seconds = 3): DocumentaryBeat[] {
	let cursor = 0;
	return Array.from({ length: count }, (_, index) => {
		const beat: DocumentaryBeat = {
			id: `beat-${index + 1}`,
			index,
			narration: `Beat ${index + 1} explains one evidence-led documentary idea with enough words for stable narration timing.`,
			startSeconds: cursor,
			durationSeconds: seconds,
			coreIdea: `Idea ${index + 1}`,
			evidenceRefs: [],
			visualIntent: 'paper-document',
			requiredSubjectIds: []
		};
		cursor += seconds;
		return beat;
	});
}

describe('documentary voice enrichment', () => {
	it('bounds a 60 second narration into chunks estimated at 25 seconds or less', () => {
		const source = beats(20, 3);
		const chunks = planVoiceChunks(source, 25);
		expect(chunks.length).toBeGreaterThanOrEqual(3);
		for (const chunk of chunks) {
			const wordCount = chunk.text.trim().split(/\s+/).filter(Boolean).length;
			expect(wordCount / 2.5).toBeLessThanOrEqual(25.001);
			expect(chunk.beatIds.length).toBeGreaterThan(0);
		}
		expect(chunks.flatMap((chunk) => chunk.beatIds)).toEqual(source.map((beat) => beat.id));
	});

	it('isolates oversized beat fragments from adjacent beats', () => {
		const source = beats(3, 3).map((beat, index) => ({
			...beat,
			id: ['before', 'oversized', 'after'][index]!,
			narration: Array.from(
				{ length: [8, 23, 7][index]! },
				(_, wordIndex) => `word-${index}-${wordIndex}`
			).join(' ')
		}));
		const chunks = planVoiceChunks(source, 4);

		expect(chunks.map((chunk) => chunk.beatIds)).toEqual([
			['before'],
			['oversized'],
			['oversized'],
			['oversized'],
			['after']
		]);

		const next = redistributeBeatDurations(
			source,
			chunks.map((chunk, index) => ({
				chunkId: chunk.id,
				beatIds: chunk.beatIds,
				durationSeconds: [3, 4, 4, 1, 2][index]!
			}))
		);
		expect(next.map((beat) => beat.durationSeconds)).toEqual([3, 9, 2]);
	});

	it('redistributes measured chunk time proportionally and keeps exact cumulative timing', () => {
		const source = beats(3, 2);
		const chunks = planVoiceChunks(source, 25);
		expect(chunks).toHaveLength(1);
		const next = redistributeBeatDurations(source, [
			{ chunkId: chunks[0]!.id, beatIds: chunks[0]!.beatIds, durationSeconds: 24.4 }
		]);
		expect(next[0]!.startSeconds).toBe(0);
		expect(next[1]!.startSeconds).toBeCloseTo(next[0]!.durationSeconds, 9);
		expect(next[2]!.startSeconds).toBeCloseTo(next[0]!.durationSeconds + next[1]!.durationSeconds, 9);
		expect(next.reduce((sum, beat) => sum + beat.durationSeconds, 0)).toBeCloseTo(24.4, 3);
		expect(next.every((beat) => beat.durationSeconds > 0)).toBe(true);
	});

	it('preserves chunk totals exactly while rebuilding global starts without gaps', () => {
		const source = beats(10, 3);
		const chunks = planVoiceChunks(source, 10);
		const measured = chunks.map((chunk, index) => ({
			chunkId: chunk.id,
			beatIds: chunk.beatIds,
			durationSeconds: 7.125 + index * 0.375
		}));
		const next = redistributeBeatDurations(source, measured);
		for (let index = 1; index < next.length; index += 1) {
			expect(next[index]!.startSeconds).toBeCloseTo(
				next[index - 1]!.startSeconds + next[index - 1]!.durationSeconds,
				9
			);
		}
		const measuredTotal = measured.reduce((sum, entry) => sum + entry.durationSeconds, 0);
		const actualTotal = next.reduce((sum, beat) => sum + beat.durationSeconds, 0);
		expect(actualTotal).toBeCloseTo(measuredTotal, 3);
	});
});
