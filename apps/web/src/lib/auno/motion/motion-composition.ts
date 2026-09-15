import type { MotionSceneGraph } from '@auno/motion';
import {
	COMPOSITION_CONTROLS_VERSION,
	type KeyframeTrack,
	type SubComposition,
	type TimelineItem,
	type TimelineTrack
} from '$lib/video-editor/project/types';

const MOTION_TRACK_ID = 'track-auno-motion';

function keyframes(scope: string, from: number, to: number, durationInFrames: number): KeyframeTrack {
	return {
		frames: [0, Math.max(1, durationInFrames - 1)],
		values: [from, to],
		ids: [`auno:${scope}:0`, `auno:${scope}:1`],
		easings: ['ease-in-out', 'ease-in-out']
	};
}

function internalTrack(id: string): TimelineTrack {
	return {
		id,
		name: 'Motion layers',
		kind: 'video',
		height: 72,
		locked: false,
		visible: true,
		muted: false,
		solo: false,
		order: 0
	};
}

export interface MotionCompositionOverlay {
	composition: SubComposition;
	item: TimelineItem;
}


function paperKeyframes(scope: string, from: number, to: number, durationInFrames: number): KeyframeTrack {
	const end = Math.max(1, durationInFrames - 1);
	const assembled = Math.max(1, Math.min(end - 1, Math.round(durationInFrames * 0.82)));
	return {
		frames: [0, assembled, end],
		values: [from, to, to],
		ids: [`auno:paper-jitter:${scope}:0`, `auno:assembly:${scope}:1`, `auno:assembly:${scope}:hold`],
		easings: ['hold', 'ease-out', 'hold']
	};
}

function buildDocumentaryPaperOverlay(options: {
	scene: MotionSceneGraph['scenes'][number];
	width: number;
	height: number;
	fps: number;
	durationInFrames: number;
	accent: string;
	secondary: string;
}): MotionCompositionOverlay {
	const { scene, width, height, fps, durationInFrames, accent, secondary } = options;
	const compositionId = `auno-motion-composition-${scene.sourceSceneId}`;
	const trackId = `${compositionId}-track`;
	const backId = `${compositionId}-paper-back`;
	const shadowId = `${compositionId}-paper-shadow`;
	const heroId = `${compositionId}-paper-hero`;
	const base = { width: width * 0.62, height: height * 0.58, scaleX: 1, scaleY: 1 };
	const back: TimelineItem = {
		id: backId, trackId, from: 0, durationInFrames, label: 'Auno paper backing', type: 'shape',
		shapeType: 'rectangle', fillEnabled: true, fillType: 'solid', fillColor: '#D7C3A3', strokeEnabled: false,
		transform: { ...base, x: width * 0.5, y: height * 0.5, rotation: -1.2, opacity: 0.96 },
		keyframes: {
			x: paperKeyframes(`${backId}:x`, width * 0.47, width * 0.5, durationInFrames),
			y: paperKeyframes(`${backId}:y`, height * 0.53, height * 0.5, durationInFrames),
			rotation: paperKeyframes(`${backId}:rotation`, -2.4, -1.2, durationInFrames),
			opacity: paperKeyframes(`${backId}:opacity`, 0, 0.96, durationInFrames)
		}
	};
	const shadow: TimelineItem = {
		id: shadowId, trackId, from: 0, durationInFrames, label: 'Auno paper shadow', type: 'shape',
		shapeType: 'rectangle', fillEnabled: true, fillType: 'solid', fillColor: secondary, strokeEnabled: false,
		transform: { ...base, x: width * 0.518, y: height * 0.525, rotation: 0.7, opacity: 0.22 },
		keyframes: {
			x: paperKeyframes(`${shadowId}:x`, width * 0.49, width * 0.518, durationInFrames),
			y: paperKeyframes(`${shadowId}:y`, height * 0.55, height * 0.525, durationInFrames),
			rotation: paperKeyframes(`${shadowId}:rotation`, 1.8, 0.7, durationInFrames),
			opacity: paperKeyframes(`${shadowId}:opacity`, 0, 0.22, durationInFrames)
		}
	};
	const hero: TimelineItem = {
		id: heroId, trackId, from: 0, durationInFrames, label: 'Auno paper hero', type: 'shape',
		shapeType: 'rectangle', fillEnabled: true, fillType: 'solid', fillColor: accent, strokeEnabled: true,
		strokeColor: secondary, strokeWidth: Math.max(2, Math.round(width * 0.002)),
		transform: { ...base, x: width * 0.5, y: height * 0.49, rotation: 0, opacity: 0.9 },
		keyframes: {
			x: paperKeyframes(`${heroId}:x`, width * 0.54, width * 0.5, durationInFrames),
			y: paperKeyframes(`${heroId}:y`, height * 0.46, height * 0.49, durationInFrames),
			rotation: paperKeyframes(`${heroId}:rotation`, 2.1, 0, durationInFrames),
			opacity: paperKeyframes(`${heroId}:opacity`, 0, 0.9, durationInFrames)
		}
	};
	const composition: SubComposition = {
		id: compositionId,
		name: `Auno Motion · ${scene.sourceSceneId}`,
		editorKind: 'composite-2d',
		compositionControls: {
			version: COMPOSITION_CONTROLS_VERSION,
			controls: [
				{ id: 'paper-jitter', name: 'Paper jitter', targetItemId: heroId, property: 'motion.paperJitter', kind: 'number', defaultValue: '1', min: 0, max: 1, step: 0.05 },
				{ id: 'shadow-depth', name: 'Shadow depth', targetItemId: shadowId, property: 'motion.shadowDepth', kind: 'number', defaultValue: '1', min: 0, max: 1.5, step: 0.05 },
				{ id: 'hold-ratio', name: 'Hold ratio', targetItemId: heroId, property: 'motion.holdRatio', kind: 'number', defaultValue: '0.18', min: 0.05, max: 0.8, step: 0.05 },
				{ id: 'assembly-order', name: 'Assembly order', targetItemId: heroId, property: 'motion.assemblyOrder', kind: 'select', defaultValue: 'back-to-front', options: [{ value: 'back-to-front', label: 'Back to front' }, { value: 'hero-first', label: 'Hero first' }] },
				{ id: 'primary-color', name: 'Paper accent', targetItemId: heroId, property: 'shape.fillColor', kind: 'color', defaultValue: accent }
			]
		},
		items: [back, shadow, hero],
		tracks: [internalTrack(trackId)], transitions: [], fps, width, height, durationInFrames,
		backgroundColor: '#00000000'
	};
	const item: TimelineItem = {
		id: `${scene.sourceSceneId}-motion-composition`, trackId: MOTION_TRACK_ID,
		from: Math.round(scene.startSeconds * fps), durationInFrames,
		label: `Motion Composition · ${scene.sourceSceneId}`, type: 'composition', compositionId,
		compositionWidth: width, compositionHeight: height, compositionControlOverrides: {},
		transform: { x: width / 2, y: height / 2, width, height, opacity: 1 }
	};
	return { composition, item };
}

export function buildMotionCompositionOverlays(options: {
	graph: MotionSceneGraph;
	width: number;
	height: number;
	fps: number;
}): MotionCompositionOverlay[] {
	const accent = options.graph.brief.palette[2] ?? '#ffffff';
	const secondary = options.graph.brief.palette[1] ?? '#111111';
	return options.graph.scenes
		.filter((scene) => scene.visualIntent === 'motion-composition')
		.map((scene, index) => {
			const durationInFrames = Math.max(2, Math.round(scene.durationSeconds * options.fps));
			if (options.graph.style === 'documentary-paper-collage') {
				return buildDocumentaryPaperOverlay({ scene, width: options.width, height: options.height, fps: options.fps, durationInFrames, accent, secondary });
			}
			const compositionId = `auno-motion-composition-${scene.sourceSceneId}`;
			const trackId = `${compositionId}-track`;
			const primaryShapeId = `${compositionId}-primary`;
			const accentShapeId = `${compositionId}-accent`;
			const direction = index % 2 === 0 ? 1 : -1;
			const primary: TimelineItem = {
				id: primaryShapeId,
				trackId,
				from: 0,
				durationInFrames,
				label: 'Motion field',
				type: 'shape',
				shapeType: 'circle',
				fillEnabled: true,
				fillType: 'solid',
				fillColor: accent,
				strokeEnabled: false,
				transform: {
					x: options.width * (direction > 0 ? 0.74 : 0.26),
					y: options.height * 0.48,
					width: options.width * 0.54,
					height: options.width * 0.54,
					opacity: 0.2,
					scaleX: 1,
					scaleY: 1
				},
				keyframes: {
					x: keyframes(
						`${primaryShapeId}:x`,
						options.width * (direction > 0 ? 0.82 : 0.18),
						options.width * (direction > 0 ? 0.6 : 0.4),
						durationInFrames
					),
					y: keyframes(`${primaryShapeId}:y`, options.height * 0.42, options.height * 0.56, durationInFrames),
					scaleX: keyframes(`${primaryShapeId}:scaleX`, 0.82, 1.12, durationInFrames),
					scaleY: keyframes(`${primaryShapeId}:scaleY`, 0.82, 1.12, durationInFrames),
					opacity: keyframes(`${primaryShapeId}:opacity`, 0.06, 0.22, durationInFrames)
				}
			};
			const accentShape: TimelineItem = {
				id: accentShapeId,
				trackId,
				from: 0,
				durationInFrames,
				label: 'Motion accent',
				type: 'shape',
				shapeType: 'rectangle',
				fillEnabled: false,
				strokeEnabled: true,
				strokeColor: secondary,
				strokeWidth: Math.max(2, Math.round(options.width * 0.004)),
				transform: {
					x: options.width / 2,
					y: options.height / 2,
					width: options.width * 0.72,
					height: options.height * 0.46,
					opacity: 0.34,
					rotation: 0
				},
				keyframes: {
					rotation: keyframes(`${accentShapeId}:rotation`, -2.5 * direction, 2.5 * direction, durationInFrames),
					opacity: keyframes(`${accentShapeId}:opacity`, 0.12, 0.36, durationInFrames)
				}
			};
			const composition: SubComposition = {
				id: compositionId,
				name: `Auno Motion · ${scene.sourceSceneId}`,
				editorKind: 'composite-2d',
				compositionControls: {
					version: COMPOSITION_CONTROLS_VERSION,
					controls: [
						{ id: 'intensity', name: 'Intensity', targetItemId: primaryShapeId, property: 'motion.intensity', kind: 'number', defaultValue: '1', min: 0, max: 1, step: 0.05 },
						{ id: 'depth', name: 'Depth', targetItemId: primaryShapeId, property: 'motion.depth', kind: 'number', defaultValue: '1', min: 0, max: 1, step: 0.05 },
						{ id: 'speed', name: 'Speed', targetItemId: primaryShapeId, property: 'motion.speed', kind: 'number', defaultValue: '1', min: 0.25, max: 2, step: 0.05 },
						{ id: 'primary-color', name: 'Primary color', targetItemId: primaryShapeId, property: 'shape.fillColor', kind: 'color', defaultValue: accent },
						{ id: 'secondary-color', name: 'Secondary color', targetItemId: accentShapeId, property: 'shape.strokeColor', kind: 'color', defaultValue: secondary },
						{ id: 'background-variant', name: 'Background variant', targetItemId: accentShapeId, property: 'shape.shapeType', kind: 'select', defaultValue: 'rectangle', options: [{ value: 'rectangle', label: 'Frame' }, { value: 'ellipse', label: 'Oval' }, { value: 'circle', label: 'Circle' }] }
					]
				},
				items: [primary, accentShape],
				tracks: [internalTrack(trackId)],
				transitions: [],
				fps: options.fps,
				width: options.width,
				height: options.height,
				durationInFrames,
				backgroundColor: '#00000000'
			};
			const item: TimelineItem = {
				id: `${scene.sourceSceneId}-motion-composition`,
				trackId: MOTION_TRACK_ID,
				from: Math.round(scene.startSeconds * options.fps),
				durationInFrames,
				label: `Motion Composition · ${scene.sourceSceneId}`,
				type: 'composition',
				compositionId,
				compositionWidth: options.width,
				compositionHeight: options.height,
				compositionControlOverrides: {
					'primary-color': accent,
					'secondary-color': secondary
				},
				transform: {
					x: options.width / 2,
					y: options.height / 2,
					width: options.width,
					height: options.height,
					opacity: 1
				}
			};
			return { composition, item };
		});
}

export function aunoMotionTrack(): TimelineTrack {
	return {
		id: MOTION_TRACK_ID,
		name: 'Auno Motion',
		kind: 'video',
		height: 72,
		locked: false,
		visible: true,
		muted: false,
		solo: false,
		order: 1
	};
}
