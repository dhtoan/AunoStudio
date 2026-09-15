import { afterEach, expect, it, vi } from 'vitest';
import { render } from 'vitest-browser-svelte';
import PreviewAudioLayer from './preview-audio-layer.svelte';
import PreviewMixEntryLayer from './preview-mix-entry-layer.svelte';

afterEach(() => vi.restoreAllMocks());

it.each(['reversed', 'processed', 'nested'] as const)(
	'handles unsupported %s audio without an uncaught decode rejection',
	async (mode) => {
		const warning = vi.spyOn(console, 'warn').mockImplementation(() => undefined);
		const url = URL.createObjectURL(new Blob(['not encoded audio'], { type: 'audio/wav' }));
		try {
			const screen =
				mode === 'nested'
					? await render(PreviewMixEntryLayer, {
							entry: {
								itemId: 'nested-invalid',
								mediaId: 'invalid',
								trackId: 'audio',
								whenSeconds: 0,
								sourceOffsetSeconds: 0,
								playbackRate: 2,
								pitchShiftSemitones: 0,
								audioEqStages: [],
								audioEffects: [],
								reversed: false,
								durationSeconds: 1,
								gainPoints: [],
								previewGainPoints: [],
								mixerTrackGain: 1,
								transitionGainSpans: []
							},
							url
						})
					: await render(PreviewAudioLayer, {
							item: {
								id: 'reverse-invalid',
								trackId: 'audio',
								from: 0,
								durationInFrames: 30,
								label: 'Invalid audio',
								type: 'audio',
								isReversed: mode === 'reversed',
								speed: mode === 'processed' ? 2 : 1
							},
							url
						});
			await expect
				.poll(() =>
					warning.mock.calls.some(
						(call) =>
							call[0] ===
							(mode === 'reversed'
								? 'Reversed audio preview could not be decoded.'
								: 'Processed audio preview could not be prepared.')
					)
				)
				.toBe(true);
			expect(screen.container.querySelector('audio')?.src).toBe(url);
		} finally {
			URL.revokeObjectURL(url);
		}
	}
);
