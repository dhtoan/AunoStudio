import { describe, expect, it } from 'vitest';
import type { MotionSceneGraph } from '@auno/motion';
import { applyCompositionControlOverrides } from '$lib/video-editor/sequences/composition-controls';
import { buildMotionCompositionOverlays } from './motion-composition';

function graph(): MotionSceneGraph {
	return {
		schemaVersion: 1,
		style: 'documentary-paper-collage',
		seed: 12345,
		brief: {
			palette: ['#D7C3A3', '#171411', '#C92828'],
			typography: 'condensed-editorial-typewriter-label',
			cameraLanguage: 'locked-documentary-tabletop',
			motionSignature: 'paper-assembly-stop-motion',
			backgroundLanguage: 'archival-newsprint-paper',
			transitionLanguage: ['hard-cut', 'crossfade']
		},
		scenes: [
			{
				id: 'motion-beat-1',
				sourceSceneId: 'beat-1',
				visualIntent: 'motion-composition',
				startSeconds: 0,
				durationSeconds: 4,
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

describe('Vox motion composition', () => {
	it('publishes functional paper controls and applies them inside native composition items', () => {
		const [overlay] = buildMotionCompositionOverlays({ graph: graph(), width: 1920, height: 1080, fps: 30 });
		expect(overlay).toBeTruthy();
		const schema = overlay!.composition.compositionControls!;
		expect(schema.controls.map((control) => control.id)).toEqual(
			expect.arrayContaining(['paper-jitter', 'shadow-depth', 'hold-ratio', 'assembly-order'])
		);

		const defaults = applyCompositionControlOverrides(
			overlay!.composition.items,
			schema,
			{}
		);
		const tuned = applyCompositionControlOverrides(overlay!.composition.items, schema, {
			'paper-jitter': '0.2',
			'shadow-depth': '0.8',
			'hold-ratio': '0.4',
			'assembly-order': 'hero-first'
		});

		const heroDefault = defaults.find((item) => item.id.endsWith('-paper-hero'))!;
		const heroTuned = tuned.find((item) => item.id.endsWith('-paper-hero'))!;
		const shadowDefault = defaults.find((item) => item.id.endsWith('-paper-shadow'))!;
		const shadowTuned = tuned.find((item) => item.id.endsWith('-paper-shadow'))!;

		expect(heroTuned.keyframes?.x?.values).not.toEqual(heroDefault.keyframes?.x?.values);
		expect(heroTuned.keyframes?.x?.frames).not.toEqual(heroDefault.keyframes?.x?.frames);
		expect(shadowTuned.keyframes?.opacity?.values).not.toEqual(shadowDefault.keyframes?.opacity?.values);
		expect(Math.max(...(heroTuned.keyframes?.x?.frames ?? [0]))).toBeLessThan(heroTuned.durationInFrames);
	});
});
