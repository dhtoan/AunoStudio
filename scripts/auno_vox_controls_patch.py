from pathlib import Path

# 1) Extend published control property union.
path = Path('apps/web/src/lib/video-editor/project/types.ts')
text = path.read_text()
anchor = "\t| 'motion.intensity'\n\t| 'motion.depth'\n\t| 'motion.speed';"
replacement = "\t| 'motion.intensity'\n\t| 'motion.depth'\n\t| 'motion.speed'\n\t| 'motion.paperJitter'\n\t| 'motion.shadowDepth'\n\t| 'motion.holdRatio'\n\t| 'motion.assemblyOrder';"
if anchor not in text:
    raise SystemExit('types control property anchor missing')
text = text.replace(anchor, replacement, 1)
path.write_text(text)

# 2) Extend composition control resolver and schema semantics.
path = Path('apps/web/src/lib/video-editor/sequences/composition-controls.ts')
text = path.read_text()
text = text.replace(
"\t\tcase 'motion.intensity':\n\t\tcase 'motion.depth':\n\t\tcase 'motion.speed':\n\t\t\treturn null;",
"\t\tcase 'motion.intensity':\n\t\tcase 'motion.depth':\n\t\tcase 'motion.speed':\n\t\tcase 'motion.paperJitter':\n\t\tcase 'motion.shadowDepth':\n\t\tcase 'motion.holdRatio':\n\t\tcase 'motion.assemblyOrder':\n\t\t\treturn null;",
1)
text = text.replace(
"\t\tcase 'motion.intensity':\n\t\tcase 'motion.depth':\n\t\tcase 'motion.speed':\n\t\t\treturn item;",
"\t\tcase 'motion.intensity':\n\t\tcase 'motion.depth':\n\t\tcase 'motion.speed':\n\t\tcase 'motion.paperJitter':\n\t\tcase 'motion.shadowDepth':\n\t\tcase 'motion.holdRatio':\n\t\tcase 'motion.assemblyOrder':\n\t\t\treturn item;",
1)
old = '''function applyMotionControlOverrides(items: readonly TimelineItem[], schema: CompositionControlSchema, overrides: CompositionControlOverrides): TimelineItem[] {
\tconst intensity = boundedNumber(schema.controls.find((control) => control.property === 'motion.intensity'), overrides, 1);
\tconst depth = boundedNumber(schema.controls.find((control) => control.property === 'motion.depth'), overrides, 1);
\tconst speed = boundedNumber(schema.controls.find((control) => control.property === 'motion.speed'), overrides, 1);
\tif (intensity === 1 && depth === 1 && speed === 1) return Array.from(items);
\treturn items.map((item) => {
\t\tif (!item.keyframes) return item;
\t\tconst keyframes = Object.fromEntries(Object.entries(item.keyframes).map(([property, track]) => [property, tuneTrack(track, property, item.durationInFrames, intensity, depth, speed)])) as typeof item.keyframes;
\t\treturn { ...item, keyframes };
\t});
}
'''
new = '''function selectedValue(
\tcontrol: CompositionControlDefinition | undefined,
\toverrides: CompositionControlOverrides,
\tfallback: string
): string {
\tif (!control) return fallback;
\tconst value = overrides[control.id];
\tif (value === undefined) return fallback;
\treturn control.options?.some((option) => option.value === value) ? value : fallback;
}

function tunePaperJitter(track: KeyframeTrack | undefined, amount: number): KeyframeTrack | undefined {
\tif (!track?.ids?.some((id) => id.startsWith('auno:paper-jitter:'))) return track;
\tconst settled = track.values[track.values.length - 1] ?? 0;
\treturn {
\t\t...track,
\t\tvalues: track.values.map((value, index) =>
\t\t\ttrack.ids?.[index]?.startsWith('auno:paper-jitter:')
\t\t\t\t? settled + (value - settled) * amount
\t\t\t\t: value
\t\t)
\t};
}

function tuneShadowDepth(track: KeyframeTrack | undefined, property: string, depth: number): KeyframeTrack | undefined {
\tif (!track) return track;
\tif (property === 'opacity') return { ...track, values: track.values.map((value) => value * depth) };
\tif (property !== 'x' && property !== 'y') return track;
\tconst origin = track.values[0] ?? 0;
\treturn { ...track, values: track.values.map((value) => origin + (value - origin) * depth) };
}

function applyAssemblyTiming(
\ttrack: KeyframeTrack | undefined,
\tdurationInFrames: number,
\tholdRatio: number,
\toffsetFrames: number
): KeyframeTrack | undefined {
\tif (!track?.ids?.length) return track;
\tconst end = Math.max(1, durationInFrames - 1);
\tconst desiredAssembly = Math.min(end - 1, Math.max(1, Math.round(durationInFrames * (1 - holdRatio))));
\tconst frames = [...track.frames];
\tlet assemblyIndex = -1;
\tlet holdIndex = -1;
\tfor (let index = 0; index < track.ids.length; index += 1) {
\t\tconst id = track.ids[index] ?? '';
\t\tif (id.startsWith('auno:assembly:') && id.endsWith(':hold')) holdIndex = index;
\t\telse if (id.startsWith('auno:assembly:')) assemblyIndex = index;
\t}
\tif (assemblyIndex < 0) return track;
\tframes[assemblyIndex] = Math.min(end - 1, Math.max(1, desiredAssembly + offsetFrames));
\tif (holdIndex >= 0) frames[holdIndex] = end;
\tfor (let index = 1; index < frames.length; index += 1) {
\t\tframes[index] = Math.min(end, Math.max(frames[index], frames[index - 1]));
\t}
\treturn { ...track, frames };
}

function assemblyOffset(itemId: string, order: string): number {
\tconst hero = itemId.endsWith('-paper-hero');
\tconst shadow = itemId.endsWith('-paper-shadow');
\tconst back = itemId.endsWith('-paper-back');
\tif (order === 'hero-first') return hero ? -4 : shadow ? 0 : back ? 4 : 0;
\treturn back ? -4 : shadow ? 0 : hero ? 4 : 0;
}

function applyMotionControlOverrides(items: readonly TimelineItem[], schema: CompositionControlSchema, overrides: CompositionControlOverrides): TimelineItem[] {
\tconst intensity = boundedNumber(schema.controls.find((control) => control.property === 'motion.intensity'), overrides, 1);
\tconst depth = boundedNumber(schema.controls.find((control) => control.property === 'motion.depth'), overrides, 1);
\tconst speed = boundedNumber(schema.controls.find((control) => control.property === 'motion.speed'), overrides, 1);
\tconst paperJitter = boundedNumber(schema.controls.find((control) => control.property === 'motion.paperJitter'), overrides, 1);
\tconst shadowDepth = boundedNumber(schema.controls.find((control) => control.property === 'motion.shadowDepth'), overrides, 1);
\tconst holdRatio = boundedNumber(schema.controls.find((control) => control.property === 'motion.holdRatio'), overrides, 0.18);
\tconst assemblyControl = schema.controls.find((control) => control.property === 'motion.assemblyOrder');
\tconst assemblyOrder = selectedValue(assemblyControl, overrides, assemblyControl?.defaultValue ?? 'back-to-front');
\tconst hasPaperOverrides = schema.controls.some((control) =>
\t\t['motion.paperJitter', 'motion.shadowDepth', 'motion.holdRatio', 'motion.assemblyOrder'].includes(control.property) &&
\t\toverrides[control.id] !== undefined
\t);
\tif (intensity === 1 && depth === 1 && speed === 1 && !hasPaperOverrides) return Array.from(items);
\treturn items.map((item) => {
\t\tif (!item.keyframes) return item;
\t\tconst paperElement = item.id.includes('-paper-');
\t\tconst shadow = item.id.endsWith('-paper-shadow');
\t\tconst offset = paperElement ? assemblyOffset(item.id, assemblyOrder) : 0;
\t\tconst keyframes = Object.fromEntries(
\t\t\tObject.entries(item.keyframes).map(([property, sourceTrack]) => {
\t\t\t\tlet track = tuneTrack(sourceTrack, property, item.durationInFrames, intensity, depth, speed);
\t\t\t\tif (paperElement) track = tunePaperJitter(track, paperJitter);
\t\t\t\tif (shadow) track = tuneShadowDepth(track, property, shadowDepth);
\t\t\t\tif (paperElement) track = applyAssemblyTiming(track, item.durationInFrames, holdRatio, offset);
\t\t\t\treturn [property, track];
\t\t\t})
\t\t) as typeof item.keyframes;
\t\treturn { ...item, keyframes };
\t});
}
'''
if old not in text:
    raise SystemExit('applyMotionControlOverrides anchor missing')
text = text.replace(old, new, 1)
old_enum = "property: z.enum(['text.text', 'text.color', 'shape.fillColor', 'shape.strokeColor', 'shape.shapeType', 'motion.intensity', 'motion.depth', 'motion.speed']),"
new_enum = "property: z.enum(['text.text', 'text.color', 'shape.fillColor', 'shape.strokeColor', 'shape.shapeType', 'motion.intensity', 'motion.depth', 'motion.speed', 'motion.paperJitter', 'motion.shadowDepth', 'motion.holdRatio', 'motion.assemblyOrder']),"
if old_enum not in text:
    raise SystemExit('zod property enum anchor missing')
text = text.replace(old_enum, new_enum, 1)
old_kind = "const kind: CompositionControlKind = entry.property === 'text.text' ? 'text' : entry.property === 'shape.shapeType' ? 'select' : entry.property.startsWith('motion.') ? 'number' : 'color';"
new_kind = "const kind: CompositionControlKind = entry.property === 'text.text' ? 'text' : entry.property === 'shape.shapeType' || entry.property === 'motion.assemblyOrder' ? 'select' : entry.property.startsWith('motion.') ? 'number' : 'color';"
if old_kind not in text:
    raise SystemExit('kind inference anchor missing')
text = text.replace(old_kind, new_kind, 1)
path.write_text(text)

# 3) Complete property labels without adding new localization obligations.
path = Path('apps/web/src/lib/video-editor/components/composition-controls-authoring.svelte')
text = path.read_text()
old = '''\t\t\tcase 'shape.strokeColor':
\t\t\t\treturn m.video_editor_motion_published_stroke_color();
\t\t}
'''
new = '''\t\t\tcase 'shape.strokeColor':
\t\t\t\treturn m.video_editor_motion_published_stroke_color();
\t\t\tcase 'shape.shapeType':
\t\t\t\treturn 'shape type';
\t\t\tcase 'motion.intensity':
\t\t\t\treturn 'motion intensity';
\t\t\tcase 'motion.depth':
\t\t\t\treturn 'motion depth';
\t\t\tcase 'motion.speed':
\t\t\t\treturn 'motion speed';
\t\t\tcase 'motion.paperJitter':
\t\t\t\treturn 'paper jitter';
\t\t\tcase 'motion.shadowDepth':
\t\t\t\treturn 'shadow depth';
\t\t\tcase 'motion.holdRatio':
\t\t\t\treturn 'hold ratio';
\t\t\tcase 'motion.assemblyOrder':
\t\t\t\treturn 'assembly order';
\t\t}
'''
if old not in text:
    raise SystemExit('propertyLabel anchor missing')
text = text.replace(old, new, 1)
path.write_text(text)

# 4) Build functional Vox paper composition items and controls.
path = Path('apps/web/src/lib/auno/motion/motion-composition.ts')
text = path.read_text()
marker = "\t\t.map((scene, index) => {\n\t\t\tconst durationInFrames = Math.max(2, Math.round(scene.durationSeconds * options.fps));"
if marker not in text:
    raise SystemExit('motion composition map anchor missing')
replacement = marker + '''
\t\t\tif (options.graph.style === 'documentary-paper-collage') {
\t\t\t\treturn buildDocumentaryPaperOverlay({
\t\t\t\t\tscene,
\t\t\t\t\twidth: options.width,
\t\t\t\t\theight: options.height,
\t\t\t\t\tfps: options.fps,
\t\t\t\t\tdurationInFrames,
\t\t\t\t\taccent,
\t\t\t\t\tsecondary
\t\t\t\t});
\t\t\t}'''
text = text.replace(marker, replacement, 1)
helper_anchor = "export interface MotionCompositionOverlay {\n\tcomposition: SubComposition;\n\titem: TimelineItem;\n}\n"
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
	const baseTransform = { width: width * 0.62, height: height * 0.58, scaleX: 1, scaleY: 1 };
	const back: TimelineItem = {
		id: backId,
		trackId,
		from: 0,
		durationInFrames,
		label: 'Auno paper backing',
		type: 'shape',
		shapeType: 'rectangle',
		fillEnabled: true,
		fillType: 'solid',
		fillColor: '#D7C3A3',
		strokeEnabled: false,
		transform: { ...baseTransform, x: width * 0.5, y: height * 0.5, rotation: -1.2, opacity: 0.96 },
		keyframes: {
			x: paperKeyframes(`${backId}:x`, width * 0.47, width * 0.5, durationInFrames),
			y: paperKeyframes(`${backId}:y`, height * 0.53, height * 0.5, durationInFrames),
			rotation: paperKeyframes(`${backId}:rotation`, -2.4, -1.2, durationInFrames),
			opacity: paperKeyframes(`${backId}:opacity`, 0, 0.96, durationInFrames)
		}
	};
	const shadow: TimelineItem = {
		id: shadowId,
		trackId,
		from: 0,
		durationInFrames,
		label: 'Auno paper shadow',
		type: 'shape',
		shapeType: 'rectangle',
		fillEnabled: true,
		fillType: 'solid',
		fillColor: secondary,
		strokeEnabled: false,
		transform: { ...baseTransform, x: width * 0.518, y: height * 0.525, rotation: 0.7, opacity: 0.22 },
		keyframes: {
			x: paperKeyframes(`${shadowId}:x`, width * 0.49, width * 0.518, durationInFrames),
			y: paperKeyframes(`${shadowId}:y`, height * 0.55, height * 0.525, durationInFrames),
			rotation: paperKeyframes(`${shadowId}:rotation`, 1.8, 0.7, durationInFrames),
			opacity: paperKeyframes(`${shadowId}:opacity`, 0, 0.22, durationInFrames)
		}
	};
	const hero: TimelineItem = {
		id: heroId,
		trackId,
		from: 0,
		durationInFrames,
		label: 'Auno paper hero',
		type: 'shape',
		shapeType: 'rectangle',
		fillEnabled: true,
		fillType: 'solid',
		fillColor: accent,
		strokeEnabled: true,
		strokeColor: secondary,
		strokeWidth: Math.max(2, Math.round(width * 0.002)),
		transform: { ...baseTransform, x: width * 0.5, y: height * 0.49, rotation: 0, opacity: 0.9 },
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
		tracks: [internalTrack(trackId)],
		transitions: [],
		fps,
		width,
		height,
		durationInFrames,
		backgroundColor: '#00000000'
	};
	const item: TimelineItem = {
		id: `${scene.sourceSceneId}-motion-composition`,
		trackId: MOTION_TRACK_ID,
		from: Math.round(scene.startSeconds * fps),
		durationInFrames,
		label: `Motion Composition · ${scene.sourceSceneId}`,
		type: 'composition',
		compositionId,
		compositionWidth: width,
		compositionHeight: height,
		compositionControlOverrides: {},
		transform: { x: width / 2, y: height / 2, width, height, opacity: 1 }
	};
	return { composition, item };
}
'''
if helper_anchor not in text:
    raise SystemExit('overlay interface anchor missing')
text = text.replace(helper_anchor, helper_anchor + helper, 1)
path.write_text(text)
