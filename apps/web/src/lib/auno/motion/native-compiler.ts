import type { MotionSceneGraph } from '@auno/motion';
import type {
	EasingType,
	ItemKeyframes,
	KeyframeTrack,
	Project,
	TextMotionSpec,
	TimelineItem
} from '$lib/video-editor/project/types';

function scalarTrack(
	from: number,
	to: number,
	durationInFrames: number,
	easing: EasingType = 'ease-in-out'
): KeyframeTrack {
	const end = Math.max(1, durationInFrames - 1);
	return {
		frames: [0, end],
		values: [from, to],
		ids: [crypto.randomUUID(), crypto.randomUUID()],
		easings: [easing, easing]
	};
}

function mergeKeyframes(item: TimelineItem, next: ItemKeyframes): ItemKeyframes {
	return { ...(item.keyframes ?? {}), ...next };
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

export function applyMotionGraphToProject(project: Project, graph: MotionSceneGraph): Project {
	const timeline = project.timeline;
	if (!timeline) return project;
	const fps = project.metadata.fps;
	const width = project.metadata.width;
	const height = project.metadata.height;
	const motionByScene = new Map(graph.scenes.map((scene, index) => [scene.sourceSceneId, { scene, index }]));

	const items = timeline.items.map((item) => {
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
						scene.background.rotationFrom,
						scene.background.rotationTo,
						durationInFrames
					),
					backgroundScale: scalarTrack(
						scene.background.scaleFrom,
						scene.background.scaleTo,
						durationInFrames
					),
					backgroundOffsetX: scalarTrack(
						scene.background.offsetXFrom,
						scene.background.offsetXTo,
						durationInFrames
					),
					backgroundOffsetY: scalarTrack(
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
						baseX + scene.camera.xFrom * width,
						baseX + scene.camera.xTo * width,
						durationInFrames
					),
					y: scalarTrack(
						baseY + scene.camera.yFrom * height,
						baseY + scene.camera.yTo * height,
						durationInFrames
					),
					scaleX: scalarTrack(scene.camera.scaleFrom, scene.camera.scaleTo, durationInFrames),
					scaleY: scalarTrack(scene.camera.scaleFrom, scene.camera.scaleTo, durationInFrames),
					rotation: scalarTrack(
						scene.camera.rotationFrom,
						scene.camera.rotationTo,
						durationInFrames
					)
				})
			};
		}
		return item;
	});

	const transitions = (timeline.transitions ?? []).map((transition) => {
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

	return {
		...project,
		description: `${project.description} · Motion ${graph.style}`,
		updatedAt: Date.now(),
		timeline: { ...timeline, items, transitions }
	};
}
