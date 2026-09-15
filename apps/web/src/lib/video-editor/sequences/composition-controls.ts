import {
	COMPOSITION_CONTROLS_VERSION,
	type CompositionControlDefinition,
	type CompositionControlKind,
	type CompositionControlOverrides,
	type CompositionControlProperty,
	type CompositionControlSchema,
	type KeyframeTrack,
	type TimelineItem
} from '../project/types';
import type { JsonValue } from '../project-bundle/snapshot-types';
import { z } from 'zod';

export interface CompositionControlCandidate {
	targetItemId: string;
	targetLabel: string;
	property: CompositionControlProperty;
	kind: CompositionControlKind;
	defaultValue: string;
}

function storedItems(items: readonly TimelineItem[]): TimelineItem[] {
	return Array.isArray(items) ? items : Array.from(items);
}

function readControlValue(item: TimelineItem, property: CompositionControlProperty): string | null {
	switch (property) {
		case 'text.text':
			return item.type === 'text' && !item.textSpans?.length ? (item.text ?? '') : null;
		case 'text.color':
			return item.type === 'text' && !item.textSpans?.length ? (item.color ?? '#ffffff') : null;
		case 'shape.fillColor':
			return item.type === 'shape' && item.fillType !== 'linear'
				? (item.fillColor ?? '#f97316')
				: null;
		case 'shape.strokeColor':
			return item.type === 'shape' && item.strokeEnabled ? (item.strokeColor ?? '#ffffff') : null;
		case 'shape.shapeType':
			return item.type === 'shape' ? item.shapeType : null;
		case 'motion.intensity':
		case 'motion.depth':
		case 'motion.speed':
		case 'motion.paperJitter':
		case 'motion.shadowDepth':
		case 'motion.holdRatio':
		case 'motion.assemblyOrder':
			return null;
	}
}

export function getCompositionControlSourceValue(
	items: readonly TimelineItem[],
	control: Pick<CompositionControlDefinition, 'targetItemId' | 'property' | 'defaultValue'>
): string {
	const target = items.find((item) => item.id === control.targetItemId);
	return (target && readControlValue(target, control.property)) ?? control.defaultValue;
}

export function getCompositionControlCandidates(
	items: readonly TimelineItem[]
): CompositionControlCandidate[] {
	return items.flatMap((item) => {
		const properties: Array<[CompositionControlProperty, CompositionControlKind]> =
			item.type === 'text'
				? [
						['text.text', 'text'],
						['text.color', 'color']
					]
				: item.type === 'shape'
					? [
							['shape.fillColor', 'color'],
							['shape.strokeColor', 'color']
						]
					: [];
		return properties.flatMap(([property, kind]) => {
			const defaultValue = readControlValue(item, property);
			return defaultValue === null
				? []
				: [{ targetItemId: item.id, targetLabel: item.label, property, kind, defaultValue }];
		});
	});
}

function applyControlValue(
	item: TimelineItem,
	property: CompositionControlProperty,
	value: string
): TimelineItem {
	switch (property) {
		case 'text.text':
			return item.type === 'text' && !item.textSpans?.length && item.text !== value
				? { ...item, text: value }
				: item;
		case 'text.color':
			return item.type === 'text' && !item.textSpans?.length && item.color !== value
				? { ...item, color: value }
				: item;
		case 'shape.fillColor':
			return item.type === 'shape' && item.fillType !== 'linear' && item.fillColor !== value
				? { ...item, fillColor: value }
				: item;
		case 'shape.strokeColor':
			return item.type === 'shape' && item.strokeColor !== value
				? { ...item, strokeColor: value }
				: item;
		case 'shape.shapeType':
			return item.type === 'shape' && ['rectangle', 'circle', 'ellipse'].includes(value)
				? { ...item, shapeType: value as 'rectangle' | 'circle' | 'ellipse' }
				: item;
		case 'motion.intensity':
		case 'motion.depth':
		case 'motion.speed':
		case 'motion.paperJitter':
		case 'motion.shadowDepth':
		case 'motion.holdRatio':
		case 'motion.assemblyOrder':
			return item;
	}
}

function boundedNumber(
	control: CompositionControlDefinition | undefined,
	overrides: CompositionControlOverrides,
	fallback: number
): number {
	if (!control) return fallback;
	const raw = overrides[control.id] ?? control.defaultValue;
	const parsed = Number(raw);
	if (!Number.isFinite(parsed)) return fallback;
	const min = control.min ?? parsed;
	const max = control.max ?? parsed;
	return Math.min(Math.max(parsed, Math.min(min, max)), Math.max(min, max));
}

function selectedValue(
	control: CompositionControlDefinition | undefined,
	overrides: CompositionControlOverrides,
	fallback: string
): string {
	if (!control) return fallback;
	const value = overrides[control.id] ?? control.defaultValue;
	return control.options?.some((option) => option.value === value) ? value : fallback;
}

function tuneTrack(
	track: KeyframeTrack | undefined,
	property: string,
	durationInFrames: number,
	options: {
		intensity: number;
		depth: number;
		speed: number;
		paperJitter: number;
		holdRatio?: number;
		frameOffset: number;
	}
): KeyframeTrack | undefined {
	if (!track) return track;
	const end = Math.max(1, durationInFrames - 1);
	const first = track.values[0] ?? 0;
	const values = track.values.map((value) => {
		let next = first + (value - first) * options.intensity;
		if (property === 'scaleX' || property === 'scaleY') next = 1 + (next - 1) * options.depth;
		if (property === 'x' || property === 'y' || property === 'rotation') {
			next = first + (next - first) * (1 + options.paperJitter * 0.18);
		}
		return next;
	});
	const assemblyEnd =
		options.holdRatio === undefined
			? end
			: Math.max(1, Math.min(end, Math.round(end * (1 - options.holdRatio))));
	const frames = track.frames.map((frame, index) => {
		const speedFrame = Math.round(frame / options.speed);
		const holdFrame = index === track.frames.length - 1 ? Math.min(speedFrame, assemblyEnd) : speedFrame;
		return Math.max(0, Math.min(end, holdFrame + options.frameOffset));
	});
	for (let index = 1; index < frames.length; index += 1) {
		frames[index] = Math.min(end, Math.max(frames[index]!, frames[index - 1]!));
	}
	return { ...track, frames, values };
}

function applyMotionControlOverrides(
	items: readonly TimelineItem[],
	schema: CompositionControlSchema,
	overrides: CompositionControlOverrides
): TimelineItem[] {
	const intensityControl = schema.controls.find((control) => control.property === 'motion.intensity');
	const depthControl = schema.controls.find((control) => control.property === 'motion.depth');
	const speedControl = schema.controls.find((control) => control.property === 'motion.speed');
	const jitterControl = schema.controls.find((control) => control.property === 'motion.paperJitter');
	const shadowControl = schema.controls.find((control) => control.property === 'motion.shadowDepth');
	const holdControl = schema.controls.find((control) => control.property === 'motion.holdRatio');
	const assemblyControl = schema.controls.find((control) => control.property === 'motion.assemblyOrder');

	const intensity = boundedNumber(intensityControl, overrides, 1);
	const depth = boundedNumber(depthControl, overrides, 1);
	const speed = boundedNumber(speedControl, overrides, 1);
	const paperJitter = boundedNumber(jitterControl, overrides, 0);
	const shadowDepth = boundedNumber(shadowControl, overrides, 0);
	const holdRatio = holdControl ? boundedNumber(holdControl, overrides, 0.3) : undefined;
	const assemblyOrder = selectedValue(assemblyControl, overrides, 'back-to-front');
	const animated = items.filter((item) => Boolean(item.keyframes));

	const noGenericChange = intensity === 1 && depth === 1 && speed === 1;
	const noVoxControls = !jitterControl && !shadowControl && !holdControl && !assemblyControl;
	if (noGenericChange && noVoxControls) return Array.from(items);

	return items.map((item) => {
		const animatedIndex = animated.findIndex((candidate) => candidate.id === item.id);
		const orderIndex = animatedIndex < 0
			? 0
			: assemblyOrder === 'hero-first'
				? animatedIndex
				: Math.max(0, animated.length - animatedIndex - 1);
		const frameOffset = assemblyControl ? orderIndex * 2 : 0;
		let next = item;
		if (shadowControl?.targetItemId === item.id && item.transform) {
			next = {
				...next,
				transform: {
					...item.transform,
					opacity: Math.max(0.02, Math.min(0.28, 0.02 + shadowDepth * 0.22))
				}
			};
		}
		if (!item.keyframes) return next;
		const keyframes = Object.fromEntries(
			Object.entries(item.keyframes).map(([property, track]) => [
				property,
				tuneTrack(track, property, item.durationInFrames, {
					intensity,
					depth,
					speed,
					paperJitter,
					holdRatio,
					frameOffset
				})
			])
		) as typeof item.keyframes;
		return { ...next, keyframes };
	});
}

export function applyCompositionControlOverrides(
	items: readonly TimelineItem[],
	schema: CompositionControlSchema | undefined,
	overrides: CompositionControlOverrides | undefined
): TimelineItem[] {
	if (!schema?.controls.length || !overrides || Object.keys(overrides).length === 0) {
		return storedItems(items);
	}
	const controlsByItemId = new Map<string, CompositionControlDefinition[]>();
	for (const control of schema.controls) {
		if (overrides[control.id] === undefined) continue;
		const controls = controlsByItemId.get(control.targetItemId);
		if (controls) controls.push(control);
		else controlsByItemId.set(control.targetItemId, [control]);
	}
	let changed = false;
	const resolved = items.map((item) => {
		const controls = controlsByItemId.get(item.id);
		if (!controls) return item;
		let next = item;
		for (const control of controls) {
			if (control.property.startsWith('motion.')) continue;
			next = applyControlValue(next, control.property, overrides[control.id]!);
		}
		changed ||= next !== item;
		return next;
	});
	const motionResolved = applyMotionControlOverrides(resolved, schema, overrides);
	return changed || motionResolved.some((item, index) => item !== resolved[index])
		? motionResolved
		: storedItems(items);
}

const compositionControlProperties = [
	'text.text',
	'text.color',
	'shape.fillColor',
	'shape.strokeColor',
	'shape.shapeType',
	'motion.intensity',
	'motion.depth',
	'motion.speed',
	'motion.paperJitter',
	'motion.shadowDepth',
	'motion.holdRatio',
	'motion.assemblyOrder'
] as const;

const compositionControlInputSchema = z.object({
	version: z.literal(COMPOSITION_CONTROLS_VERSION),
	controls: z
		.array(
			z.object({
				id: z.string().trim().min(1).max(100),
				name: z.string().trim().min(1).max(120),
				targetItemId: z.string().trim().min(1).max(100),
				property: z.enum(compositionControlProperties),
				kind: z.enum(['text', 'color', 'number', 'select']),
				defaultValue: z.string().max(100_000).optional(),
				min: z.number().finite().optional(),
				max: z.number().finite().optional(),
				step: z.number().finite().positive().optional(),
				options: z.array(z.object({ value: z.string().max(100), label: z.string().max(120) })).max(100).optional()
			})
		)
		.max(1_000)
});

function expectedControlKind(property: CompositionControlProperty): CompositionControlKind {
	if (property === 'text.text') return 'text';
	if (property === 'shape.shapeType' || property === 'motion.assemblyOrder') return 'select';
	if (property.startsWith('motion.')) return 'number';
	return 'color';
}

export function sanitizeCompositionControlSchema(
	value: JsonValue | CompositionControlSchema | undefined,
	items: readonly TimelineItem[]
): CompositionControlSchema | undefined {
	const parsed = compositionControlInputSchema.safeParse(value);
	if (!parsed.success) return undefined;
	const itemById = new Map(items.map((item) => [item.id, item]));
	const seenIds = new Set<string>();
	const seenTargets = new Set<string>();
	const controls: CompositionControlDefinition[] = [];
	for (const entry of parsed.data.controls) {
		const { id, name, targetItemId } = entry;
		const target = itemById.get(targetItemId);
		if (!target) continue;
		const sourceValue = readControlValue(target, entry.property);
		const kind = expectedControlKind(entry.property);
		const targetKey = `${targetItemId}:${entry.property}`;
		const motionControl = entry.property.startsWith('motion.');
		if (
			(!motionControl && sourceValue === null) ||
			entry.kind !== kind ||
			seenIds.has(id) ||
			seenTargets.has(targetKey)
		) {
			continue;
		}
		if (
			kind === 'number' &&
			(!Number.isFinite(Number(entry.defaultValue)) || entry.min === undefined || entry.max === undefined)
		) {
			continue;
		}
		if (
			kind === 'select' &&
			(!entry.options?.length || !entry.options.some((option) => option.value === entry.defaultValue))
		) {
			continue;
		}
		seenIds.add(id);
		seenTargets.add(targetKey);
		controls.push({
			id,
			name,
			targetItemId,
			property: entry.property,
			kind,
			defaultValue: entry.defaultValue ?? sourceValue ?? '',
			...(kind === 'number' ? { min: entry.min, max: entry.max, step: entry.step } : {}),
			...(kind === 'select' ? { options: entry.options } : {})
		});
	}
	return controls.length > 0 ? { version: COMPOSITION_CONTROLS_VERSION, controls } : undefined;
}
