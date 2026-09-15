import type { MotionSceneGraph } from '@auno/motion';
import {
	COMPOSITION_CONTROLS_VERSION,
	type KeyframeTrack,
	type SubComposition,
	type TimelineItem,
	type TimelineTrack
} from '$lib/video-editor/project/types';

const MOTION_TRACK_ID = 'track-auno-motion';

function keyframes(from: number, to: number, durationInFrames: number): KeyframeTrack {
	return {
		frames: [0, Math.max(1, durationInFrames - 1)],
		values: [from, to],
		ids: [crypto.randomUUID(), crypto.randomUUID()],
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
						options.width * (direction > 0 ? 0.82 : 0.18),
						options.width * (direction > 0 ? 0.6 : 0.4),
						durationInFrames
					),
					y: keyframes(options.height * 0.42, options.height * 0.56, durationInFrames),
					scaleX: keyframes(0.82, 1.12, durationInFrames),
					scaleY: keyframes(0.82, 1.12, durationInFrames),
					opacity: keyframes(0.06, 0.22, durationInFrames)
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
					rotation: keyframes(-2.5 * direction, 2.5 * direction, durationInFrames),
					opacity: keyframes(0.12, 0.36, durationInFrames)
				}
			};
			const composition: SubComposition = {
				id: compositionId,
				name: `Auno Motion · ${scene.sourceSceneId}`,
				editorKind: 'composite-2d',
				compositionControls: {
					version: COMPOSITION_CONTROLS_VERSION,
					controls: [
						{
							id: 'accent-color',
							name: 'Accent color',
							targetItemId: primaryShapeId,
							property: 'shape.fillColor',
							kind: 'color',
							defaultValue: accent
						},
						{
							id: 'frame-color',
							name: 'Frame color',
							targetItemId: accentShapeId,
							property: 'shape.strokeColor',
							kind: 'color',
							defaultValue: secondary
						}
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
					'accent-color': accent,
					'frame-color': secondary
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
