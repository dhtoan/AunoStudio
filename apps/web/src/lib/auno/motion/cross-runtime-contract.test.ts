import { describe, expect, it } from 'vitest';
import type { MotionSceneGraph } from '@auno/motion';
import { buildMotionCompositionOverlays } from './motion-composition';

function documentaryFixture(): MotionSceneGraph {
	return {
		schemaVersion: 1,
		style: 'documentary-paper-collage',
		seed: 42,
		brief: {
			palette: ['#111111', '#222222', '#cc3333'],
			typography: 'condensed-editorial-typewriter-label',
			cameraLanguage: 'locked-documentary-tabletop',
			motionSignature: 'paper-assembly-stop-motion',
			backgroundLanguage: 'archival-newsprint-paper',
			transitionLanguage: ['hard-cut', 'crossfade']
		},
		scenes: [
			{
				id: 'motion-beat-001',
				sourceSceneId: 'beat-001',
				visualIntent: 'motion-composition',
				startSeconds: 2,
				durationSeconds: 3,
				camera: {
					scaleFrom: 1,
					scaleTo: 1,
					xFrom: 0,
					xTo: 0,
					yFrom: 0,
					yTo: 0,
					rotationFrom: 0,
					rotationTo: 0
				},
				background: {
					rotationFrom: 0,
					rotationTo: 0,
					scaleFrom: 1,
					scaleTo: 1,
					offsetXFrom: 0,
					offsetXTo: 0,
					offsetYFrom: 0,
					offsetYTo: 0,
					smoothness: 0.4
				},
				text: { inPreset: 'cascade', outPreset: 'fade-down', intensity: 0.4, staggerFrames: 2 }
			}
		]
	};
}

/**
 * Canonical fixture mirrored by apps/server/internal/aunomotion/compiler_test.go.
 * Both runtimes must keep these structural fields identical; JSON object key order
 * and implementation-specific keyframe serialization are deliberately excluded.
 */
describe('Auno Motion cross-runtime composition contract', () => {
	it('keeps Vox paper composition IDs, timing, controls, tracks and item kinds stable', () => {
		const [overlay] = buildMotionCompositionOverlays({
			graph: documentaryFixture(),
			width: 1920,
			height: 1080,
			fps: 30
		});
		expect(overlay).toBeTruthy();

		const composition = overlay!.composition;
		const item = overlay!.item;
		expect({
			compositionId: composition.id,
			timelineItemId: item.id,
			timelineItemType: item.type,
			timelineTrackId: item.trackId,
			from: item.from,
			durationInFrames: item.durationInFrames,
			compositionDurationInFrames: composition.durationInFrames,
			internalTrackIds: composition.tracks.map((track) => track.id),
			controlIds: composition.compositionControls?.controls.map((control) => control.id),
			controlDefaults: composition.compositionControls?.controls.map((control) => control.defaultValue),
			nestedItems: composition.items.map((nested) => ({ id: nested.id, type: nested.type })),
			overrideCount: Object.keys(item.compositionControlOverrides ?? {}).length
		}).toEqual({
			compositionId: 'auno-motion-composition-beat-001',
			timelineItemId: 'beat-001-motion-composition',
			timelineItemType: 'composition',
			timelineTrackId: 'track-auno-motion',
			from: 60,
			durationInFrames: 90,
			compositionDurationInFrames: 90,
			internalTrackIds: ['auno-motion-composition-beat-001-track'],
			controlIds: ['paper-jitter', 'shadow-depth', 'hold-ratio', 'assembly-order', 'primary-color'],
			controlDefaults: ['1', '1', '0.18', 'back-to-front', '#cc3333'],
			nestedItems: [
				{ id: 'auno-motion-composition-beat-001-paper-back', type: 'shape' },
				{ id: 'auno-motion-composition-beat-001-paper-shadow', type: 'shape' },
				{ id: 'auno-motion-composition-beat-001-paper-hero', type: 'shape' }
			],
			overrideCount: 0
		});
	});
});
