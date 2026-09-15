from pathlib import Path

# 1) Extend the persisted published-control union.
path = Path('apps/web/src/lib/video-editor/project/types.ts')
text = path.read_text()
anchor = "\t| 'motion.intensity'\n\t| 'motion.depth'\n\t| 'motion.speed';"
replacement = "\t| 'motion.intensity'\n\t| 'motion.depth'\n\t| 'motion.speed'\n\t| 'motion.paperJitter'\n\t| 'motion.shadowDepth'\n\t| 'motion.holdRatio'\n\t| 'motion.assemblyOrder';"
if anchor in text:
    text = text.replace(anchor, replacement, 1)
elif "'motion.paperJitter'" not in text:
    raise SystemExit('types control property anchor missing')
path.write_text(text)

# 2) Replace only the motion override implementation, preserving current schema helpers.
path = Path('apps/web/src/lib/video-editor/sequences/composition-controls.ts')
text = path.read_text()
start = text.find('function tuneTrack(')
end = text.find('export function applyCompositionControlOverrides(', start)
if start < 0 or end < 0:
    raise SystemExit('motion resolver boundaries missing')
resolver = r'''function tuneTrack(
	track: KeyframeTrack | undefined,
	property: string,
	durationInFrames: number,
	intensity: number,
	depth: number,
	speed: number
): KeyframeTrack | undefined {
	if (!track) return track;
	const end = Math.max(1, durationInFrames - 1);
	const first = track.values[0] ?? 0;
	const values = track.values.map((value) => {
		let next = first + (value - first) * intensity;
		if (property === 'scaleX' || property === 'scaleY') next = 1 + (next - 1) * depth;
		return next;
	});
	const frames = track.frames.map((frame, index) =>
		index === 0
			? Math.max(0, Math.min(end, frame))
			: Math.max(0, Math.min(end, Math.round(frame / speed)))
	);
	for (let index = 1; index < frames.length; index += 1) {
		frames[index] = Math.min(end, Math.max(frames[index]!, frames[index - 1]!));
	}
	return { ...track, frames, values };
}

function tunePaperJitter(track: KeyframeTrack | undefined, amount: number): KeyframeTrack | undefined {
	if (!track?.ids?.some((id) => id.startsWith('auno:paper-jitter:'))) return track;
	const settled = track.values[track.values.length - 1] ?? 0;
	return {
		...track,
		values: track.values.map((value, index) =>
			track.ids?.[index]?.startsWith('auno:paper-jitter:')
				? settled + (value - settled) * amount
				: value
		)
	};
}

function tuneShadowDepth(
	track: KeyframeTrack | undefined,
	property: string,
	depth: number
): KeyframeTrack | undefined {
	if (!track) return track;
	if (property === 'opacity') return { ...track, values: track.values.map((value) => value * depth) };
	if (property !== 'x' && property !== 'y') return track;
	const settled = track.values[track.values.length - 1] ?? 0;
	return { ...track, values: track.values.map((value) => settled + (value - settled) * depth) };
}

function assemblyOffset(itemId: string, order: string): number {
	const hero = itemId.endsWith('-paper-hero');
	const shadow = itemId.endsWith('-paper-shadow');
	const back = itemId.endsWith('-paper-back');
	if (order === 'hero-first') return hero ? 0 : shadow ? 3 : back ? 6 : 0;
	return back ? 0 : shadow ? 3 : hero ? 6 : 0;
}

function tuneAssemblyTiming(
	track: KeyframeTrack | undefined,
	durationInFrames: number,
	holdRatio: number | undefined,
	offsetFrames: number | undefined
): KeyframeTrack | undefined {
	if (!track?.ids?.length || (holdRatio === undefined && offsetFrames === undefined)) return track;
	const end = Math.max(1, durationInFrames - 1);
	const frames = [...track.frames];
	let assemblyIndex = -1;
	let holdIndex = -1;
	for (let index = 0; index < track.ids.length; index += 1) {
		const id = track.ids[index] ?? '';
		if (id.startsWith('auno:assembly:') && id.endsWith(':hold')) holdIndex = index;
		else if (id.startsWith('auno:assembly:')) assemblyIndex = index;
	}
	if (assemblyIndex < 0) return track;
	const authoredAssembly = frames[assemblyIndex] ?? Math.max(1, end - 1);
	const target = holdRatio === undefined
		? authoredAssembly
		: Math.round(durationInFrames * (1 - holdRatio));
	const offset = offsetFrames ?? 0;
	if (frames.length > 0 && offsetFrames !== undefined) frames[0] = Math.min(end - 1, Math.max(0, offset));
	frames[assemblyIndex] = Math.min(end - 1, Math.max((frames[0] ?? 0) + 1, target + offset));
	if (holdIndex >= 0) frames[holdIndex] = end;
	for (let index = 1; index < frames.length; index += 1) {
		frames[index] = Math.min(end, Math.max(frames[index]!, frames[index - 1]!));
	}
	return { ...track, frames };
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
	const paperJitter = boundedNumber(jitterControl, overrides, 1);
	const shadowDepth = boundedNumber(shadowControl, overrides, 1);
	const holdRatio = holdControl && overrides[holdControl.id] !== undefined
		? boundedNumber(holdControl, overrides, 0.18)
		: undefined;
	const assemblyOrder = selectedValue(assemblyControl, overrides, assemblyControl?.defaultValue ?? 'back-to-front');
	const assemblyOverridden = Boolean(assemblyControl && overrides[assemblyControl.id] !== undefined);
	const jitterOverridden = Boolean(jitterControl && overrides[jitterControl.id] !== undefined);
	const shadowOverridden = Boolean(shadowControl && overrides[shadowControl.id] !== undefined);
	const genericChanged = intensity !== 1 || depth !== 1 || speed !== 1;
	if (!genericChanged && !jitterOverridden && !shadowOverridden && holdRatio === undefined && !assemblyOverridden) {
		return Array.from(items);
	}

	return items.map((item) => {
		if (!item.keyframes) return item;
		const paperElement = item.id.includes('-paper-');
		const shadowElement = item.id.endsWith('-paper-shadow');
		const offset = paperElement && assemblyOverridden ? assemblyOffset(item.id, assemblyOrder) : undefined;
		const keyframes = Object.fromEntries(
			Object.entries(item.keyframes).map(([property, sourceTrack]) => {
				let track = tuneTrack(sourceTrack, property, item.durationInFrames, intensity, depth, speed);
				if (paperElement && jitterOverridden && ['x', 'y', 'rotation'].includes(property)) {
					track = tunePaperJitter(track, paperJitter);
				}
				if (shadowElement && shadowOverridden) track = tuneShadowDepth(track, property, shadowDepth);
				if (paperElement) track = tuneAssemblyTiming(track, item.durationInFrames, holdRatio, offset);
				return [property, track];
			})
		) as typeof item.keyframes;
		return { ...item, keyframes };
	});
}

'''
text = text[:start] + resolver + text[end:]
path.write_text(text)

# 3) Make every published control label render a defined value.
path = Path('apps/web/src/lib/video-editor/components/composition-controls-authoring.svelte')
text = path.read_text()
needle = "\t\t\tcase 'shape.strokeColor':\n\t\t\t\treturn m.video_editor_motion_published_stroke_color();\n"
insert = needle + "\t\t\tcase 'shape.shapeType':\n\t\t\t\treturn 'shape type';\n\t\t\tcase 'motion.intensity':\n\t\t\t\treturn 'motion intensity';\n\t\t\tcase 'motion.depth':\n\t\t\t\treturn 'motion depth';\n\t\t\tcase 'motion.speed':\n\t\t\t\treturn 'motion speed';\n\t\t\tcase 'motion.paperJitter':\n\t\t\t\treturn 'paper jitter';\n\t\t\tcase 'motion.shadowDepth':\n\t\t\t\treturn 'shadow depth';\n\t\t\tcase 'motion.holdRatio':\n\t\t\t\treturn 'hold ratio';\n\t\t\tcase 'motion.assemblyOrder':\n\t\t\t\treturn 'assembly order';\n"
if "case 'motion.paperJitter':" not in text:
    if needle not in text:
        raise SystemExit('authoring property label anchor missing')
    text = text.replace(needle, insert, 1)
path.write_text(text)

# 4) Add a dedicated native paper composition for the Vox runtime style.
path = Path('apps/web/src/lib/auno/motion/motion-composition.ts')
text = path.read_text()
interface_anchor = "export interface MotionCompositionOverlay {\n\tcomposition: SubComposition;\n\titem: TimelineItem;\n}\n"
helper = r'''

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
'''
if 'function buildDocumentaryPaperOverlay(' not in text:
    if interface_anchor not in text:
        raise SystemExit('motion overlay interface anchor missing')
    text = text.replace(interface_anchor, interface_anchor + helper, 1)
map_anchor = "\t\t.map((scene, index) => {\n\t\t\tconst durationInFrames = Math.max(2, Math.round(scene.durationSeconds * options.fps));\n"
map_insert = map_anchor + "\t\t\tif (options.graph.style === 'documentary-paper-collage') {\n\t\t\t\treturn buildDocumentaryPaperOverlay({ scene, width: options.width, height: options.height, fps: options.fps, durationInFrames, accent, secondary });\n\t\t\t}\n"
if "options.graph.style === 'documentary-paper-collage'" not in text:
    if map_anchor not in text:
        raise SystemExit('motion composition map anchor missing')
    text = text.replace(map_anchor, map_insert, 1)
path.write_text(text)
