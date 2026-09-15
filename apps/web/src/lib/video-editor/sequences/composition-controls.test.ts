import { describe, expect, it } from 'vitest';
import type { CompositionControlSchema, TimelineItem } from '../project/types';
import {
	applyCompositionControlOverrides,
	getCompositionControlCandidates,
	getCompositionControlSourceValue,
	sanitizeCompositionControlSchema
} from './composition-controls';

const text: TimelineItem = {
	id: 'title',
	trackId: 'visual',
	from: 0,
	durationInFrames: 30,
	label: 'Title',
	type: 'text',
	text: 'Source title',
	color: '#ffffff'
};

const shape: TimelineItem = {
	id: 'accent',
	trackId: 'visual',
	from: 0,
	durationInFrames: 30,
	label: 'Accent',
	type: 'shape',
	shapeType: 'rectangle',
	fillColor: '#f97316',
	strokeEnabled: true,
	strokeColor: '#000000'
};

const schema: CompositionControlSchema = {
	version: 1,
	controls: [
		{
			id: 'copy',
			name: 'Headline',
			targetItemId: text.id,
			property: 'text.text',
			kind: 'text',
			defaultValue: 'Source title'
		},
		{
			id: 'accent-color',
			name: 'Accent color',
			targetItemId: shape.id,
			property: 'shape.fillColor',
			kind: 'color',
			defaultValue: '#f97316'
		}
	]
};

function paperItem(): TimelineItem {
	return {
		id: 'scene-paper-hero',
		trackId: 'visual',
		from: 0,
		durationInFrames: 60,
		label: 'Auno paper hero',
		type: 'shape',
		shapeType: 'rectangle',
		fillEnabled: true,
		fillType: 'solid',
		fillColor: '#d7c3a3',
		transform: { x: 0, y: 0, width: 200, height: 120, rotation: 0, opacity: 1 },
		keyframes: {
			x: {
				frames: [0, 40, 59],
				values: [-10, 0, 0],
				ids: ['auno:paper-jitter:scene-paper-hero:x:0', 'auno:assembly:scene-paper-hero:x:1', 'auno:assembly:scene-paper-hero:x:hold']
			},
			rotation: {
				frames: [0, 40, 59],
				values: [-2, 0, 0],
				ids: ['auno:paper-jitter:scene-paper-hero:rotation:0', 'auno:assembly:scene-paper-hero:rotation:1', 'auno:assembly:scene-paper-hero:rotation:hold']
			}
		}
	};
}

const paperSchema: CompositionControlSchema = {
	version: 1,
	controls: [
		{
			id: 'paper-jitter',
			name: 'Paper jitter',
			targetItemId: 'scene-paper-hero',
			property: 'motion.paperJitter',
			kind: 'number',
			defaultValue: '1',
			min: 0,
			max: 1,
			step: 0.05
		},
		{
			id: 'assembly-order',
			name: 'Assembly order',
			targetItemId: 'scene-paper-hero',
			property: 'motion.assemblyOrder',
			kind: 'select',
			defaultValue: 'back-to-front',
			options: [
				{ value: 'back-to-front', label: 'Back to front' },
				{ value: 'hero-first', label: 'Hero first' }
			]
		}
	]
};

describe('composition published controls', () => {
	it('applies per-instance values without mutating the shared source', () => {
		const resolved = applyCompositionControlOverrides([text, shape], schema, {
			copy: 'Instance title',
			'accent-color': '#22c55e'
		});
		expect(resolved[0]).toMatchObject({ text: 'Instance title' });
		expect(resolved[1]).toMatchObject({ fillColor: '#22c55e' });
		expect(text.text).toBe('Source title');
		expect(getCompositionControlSourceValue([text, shape], schema.controls[0]!)).toBe(
			'Source title'
		);
	});

	it('drops invalid, duplicate, and stale definitions when loading', () => {
		const sanitized = sanitizeCompositionControlSchema(
			{
				version: 1,
				controls: [
					...schema.controls,
					{ ...schema.controls[0], id: 'duplicate-target' },
					{ ...schema.controls[0], id: 'stale', targetItemId: 'missing' },
					{ ...schema.controls[0], id: 'wrong-kind', kind: 'color' }
				]
			},
			[text, shape]
		);
		expect(sanitized).toEqual(schema);
	});

	it('clamps Vox numeric overrides to their published bounds', () => {
		const authored = paperItem();
		const clamped = applyCompositionControlOverrides([authored], paperSchema, {
			'paper-jitter': '999'
		});
		const maximum = applyCompositionControlOverrides([authored], paperSchema, {
			'paper-jitter': '1'
		});
		expect(clamped).toEqual(maximum);
		expect(authored.keyframes?.x?.values).toEqual([-10, 0, 0]);
	});

	it('rejects invalid Vox select overrides instead of inventing an assembly mode', () => {
		const authored = paperItem();
		const invalid = applyCompositionControlOverrides([authored], paperSchema, {
			'assembly-order': 'random-chaos'
		});
		const fallback = applyCompositionControlOverrides([authored], paperSchema, {
			'assembly-order': 'back-to-front'
		});
		expect(invalid).toEqual(fallback);
	});
});
