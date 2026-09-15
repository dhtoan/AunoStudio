import type { MotionSceneGraph } from '@auno/motion';
import type {
	EasingType,
	ItemKeyframes,
	KeyframeTrack,
	Project,
	TextMotionSpec,
	TimelineItem,
	TimelineTransition
} from '$lib/video-editor/project/types';
import { aunoMotionTrack, buildMotionCompositionOverlays } from './motion-composition';

function scalarTrack(
	scope: string,
	from: number,
	to: number,
	durationInFrames: number,
	easing: EasingType = 'ease-in-out'
): KeyframeTrack {
	const end = Math.max(1, durationInFrames - 1);
	return {
		frames: [0, end],
		values: [from, to],
		ids: [`auno:${scope}:0`, `auno:${scope}:1`],
		easings: [easing, easing]
	};
}

function aunoOwnedTrack(track: KeyframeTrack | undefined): boolean {
	return Boolean(track?.ids?.length && track.ids.every((id) => id.startsWith('auno:')));
}

function mergeKeyframes(item: TimelineItem, next: ItemKeyframes): ItemKeyframes {
	const merged: ItemKeyframes = { ...(item.keyframes ?? {}) };
	for (const [property, track] of Object.entries(next)) {
		if (!track) continue;
		const existing = merged[property as keyof ItemKeyframes];
		// Regeneration owns only Auno-authored tracks. Any manual/legacy track is preserved.
		if (existing && !aunoOwnedTrack(existing)) continue;
		merged[property as keyof ItemKeyframes] = track;
	}
	return merged;
}

function textMotionForScene(
	graphSeed: number,
	sceneIndex: number,
	durationInFrames: number,
	motion: MotionSceneGraph['scenes'][number]['text']
): TextMotionSpec {
	const seed = (graphSeed + sceneIndex * 7919) >>> 0;
	const inDuration = Math.max(4, Math.min(Math.round(durationInFrames * 0.22), 24));
	const outDuration = Math.max(4, Math.min(Math.round(durationInFrames * 0.18), 20));
	return {
		in: {
			presetId: motion.inPreset,
			durationFrames: inDuration,
			staggerFrames: motion.staggerFrames,
			intensity: motion.intensity,
			order: 'forward',
			easing: 'ease-out',
			seed,
			unit: 'line'
		},
		out: {
			presetId: motion.outPreset,
			durationFrames: outDuration,
			offsetFrames: Math.max(0, durationInFrames - outDuration),
			staggerFrames: motion.staggerFrames,
			intensity: motion.intensity,
			order: 'forward',
			easing: 'ease-in',
			seed: seed + 1,
			unit: 'line'
		},
		...(motion.loopPreset
			? {
					loop: {
						presetId: motion.loopPreset,
						durationFrames: Math.max(12, Math.min(48, Math.round(durationInFrames * 0.35))),
						offsetFrames: inDuration,
						staggerFrames: 0,
						intensity: Math.min(0.7, motion.intensity * 0.5),
						order: 'forward' as const,
						easing: 'ease-in-out' as const,
						seed: seed + 2,
						unit: 'whole-clip' as const
					}
				}
			: {})
	};
}

export interface NativeMotionTimelineInput {
	items: TimelineItem[];
	transitions: TimelineTransition[];
	fps: number;
	width: number;
	height: number;
	graph: MotionSceneGraph;
}

export interface NativeMotionTimelineResult {
	items: TimelineItem[];
	transitions: TimelineTransition[];
}

export function compileMotionGraphToNativeTimeline(
	input: NativeMotionTimelineInput
): NativeMotionTimelineResult {
	const { graph, fps, width, height } = input;
	const motionByScene = new Map(
		graph.scenes.map((scene, index) => [scene.sourceSceneId, { scene, index }])
	);

	const items = input.items.map((item) => {
		const sceneId = item.id.endsWith('-background')
			? item.id.slice(0, -'-background'.length)
			: item.id.endsWith('-text')
				? item.id.slice(0, -'-text'.length)
				: '';
		const planned = motionByScene.get(sceneId);
		if (!planned) return item;
		const { scene, index } = planned;
		const durationInFrames = item.durationInFrames;

		if (item.type === 'background') {
			return {
				...item,
				background: item.background
					? { ...item.background, smoothness: scene.background.smoothness }
					: item.background,
				keyframes: mergeKeyframes(item, {
					backgroundRotation: scalarTrack(
						`${item.id}:backgroundRotation`,
						scene.background.rotationFrom,
						scene.background.rotationTo,
						durationInFrames
					),
					backgroundScale: scalarTrack(
						`${item.id}:backgroundScale`,
						scene.background.scaleFrom,
						scene.background.scaleTo,
						durationInFrames
					),
					backgroundOffsetX: scalarTrack(
						`${item.id}:backgroundOffsetX`,
						scene.background.offsetXFrom,
						scene.background.offsetXTo,
						durationInFrames
					),
					backgroundOffsetY: scalarTrack(
						`${item.id}:backgroundOffsetY`,
						scene.background.offsetYFrom,
						scene.background.offsetYTo,
						durationInFrames
					)
				})
			};
		}

		if (item.type === 'text') {
			const baseX = item.transform?.x ?? width / 2;
			const baseY = item.transform?.y ?? height / 2;
			return {
				...item,
				animationVersion: 2,
				textMotion: textMotionForScene(graph.seed, index, durationInFrames, scene.text),
				keyframes: mergeKeyframes(item, {
					x: scalarTrack(
						`${item.id}:x`,
						baseX + scene.camera.xFrom * width,
						baseX + scene.camera.xTo * width,
						durationInFrames
					),
					y: scalarTrack(
						`${item.id}:y`,
						baseY + scene.camera.yFrom * height,
						baseY + scene.camera.yTo * height,
						durationInFrames
					),
					scaleX: scalarTrack(`${item.id}:scaleX`, scene.camera.scaleFrom, scene.camera.scaleTo, durationInFrames),
					scaleY: scalarTrack(`${item.id}:scaleY`, scene.camera.scaleFrom, scene.camera.scaleTo, durationInFrames),
					rotation: scalarTrack(
						`${item.id}:rotation`,
						scene.camera.rotationFrom,
						scene.camera.rotationTo,
						durationInFrames
					)
				})
			};
		}
		return item;
	});

	const transitions = input.transitions.map((transition) => {
		const fromSceneId = transition.fromItemId.endsWith('-background')
			? transition.fromItemId.slice(0, -'-background'.length)
			: '';
		const planned = motionByScene.get(fromSceneId)?.scene.transitionOut;
		if (!planned) return transition;
		return {
			...transition,
			durationInFrames: Math.max(2, Math.round(planned.durationSeconds * fps))
		};
	});

	return { items, transitions };
}

export function applyMotionGraphToProject(project: Project, graph: MotionSceneGraph): Project {
	const timeline = project.timeline;
	if (!timeline) return project;
	const compiled = compileMotionGraphToNativeTimeline({
		items: timeline.items,
		transitions: timeline.transitions ?? [],
		fps: project.metadata.fps,
		width: project.metadata.width,
		height: project.metadata.height,
		graph
	});
	const overlays = buildMotionCompositionOverlays({
		graph,
		width: project.metadata.width,
		height: project.metadata.height,
		fps: project.metadata.fps
	});
	const overlayIds = new Set(overlays.map((entry) => entry.item.id));
	const baseItems = compiled.items.filter(
		(item) => !item.id.endsWith('-motion-composition') || overlayIds.has(item.id)
	);
	const nextItems = [
		...baseItems.filter((item) => !overlayIds.has(item.id)),
		...overlays.map((entry) => entry.item)
	];
	const compositionIds = new Set(overlays.map((entry) => entry.composition.id));
	const previousCompositions = (timeline.compositions ?? []).filter(
		(composition) =>
			!composition.id.startsWith('auno-motion-composition-') || compositionIds.has(composition.id)
	);
	const nextCompositions = [
		...previousCompositions.filter((composition) => !compositionIds.has(composition.id)),
		...overlays.map((entry) => entry.composition)
	];
	const needsMotionTrack = overlays.length > 0;
	const tracks = timeline.tracks
		.filter((track) => track.id !== 'track-auno-motion')
		.map((track) => {
			if (!needsMotionTrack) return track;
			if (track.id === 'track-video-main') return { ...track, order: 2 };
			if (track.id === 'track-audio') return { ...track, order: 3 };
			if (track.id === 'track-auno-music') return { ...track, order: 4 };
			return track;
		});
	if (needsMotionTrack) tracks.push(aunoMotionTrack());
	tracks.sort((left, right) => left.order - right.order);

	return {
		...project,
		description: `${project.description.replace(/ · Motion [^·]+$/, '')} · Motion ${graph.style}`,
		updatedAt: Date.now(),
		timeline: {
			...timeline,
			tracks,
			items: nextItems,
			transitions: compiled.transitions,
			compositions: nextCompositions
		}
	};
}
