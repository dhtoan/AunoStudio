from pathlib import Path


def replace_once(path: str, old: str, new: str) -> None:
    file = Path(path)
    text = file.read_text()
    if new in text:
        return
    if old not in text:
        raise SystemExit(f"missing patch anchor: {path}")
    file.write_text(text.replace(old, new, 1))


replace_once(
    'apps/web/src/lib/video-editor/project/types.ts',
    """export type CompositionControlProperty =
\t| 'text.text'
\t| 'text.color'
\t| 'shape.fillColor'
\t| 'shape.strokeColor';
export type CompositionControlKind = 'text' | 'color';
export interface CompositionControlDefinition {
\tid: string;
\tname: string;
\ttargetItemId: string;
\tproperty: CompositionControlProperty;
\tkind: CompositionControlKind;
\tdefaultValue: string;
}
""",
    """export type CompositionControlProperty =
\t| 'text.text'
\t| 'text.color'
\t| 'shape.fillColor'
\t| 'shape.strokeColor'
\t| 'shape.shapeType'
\t| 'motion.intensity'
\t| 'motion.depth'
\t| 'motion.speed';
export type CompositionControlKind = 'text' | 'color' | 'number' | 'select';
export interface CompositionControlOption {
\tvalue: string;
\tlabel: string;
}
export interface CompositionControlDefinition {
\tid: string;
\tname: string;
\ttargetItemId: string;
\tproperty: CompositionControlProperty;
\tkind: CompositionControlKind;
\tdefaultValue: string;
\tmin?: number;
\tmax?: number;
\tstep?: number;
\toptions?: CompositionControlOption[];
}
""",
)

controls = Path('apps/web/src/lib/video-editor/sequences/composition-controls.ts')
text = controls.read_text()
text = text.replace(
    "\ttype CompositionControlSchema,\n\ttype TimelineItem\n",
    "\ttype CompositionControlSchema,\n\ttype KeyframeTrack,\n\ttype TimelineItem\n",
    1,
)
text = text.replace(
    """\t\tcase 'shape.strokeColor':
\t\t\treturn item.type === 'shape' && item.strokeEnabled ? (item.strokeColor ?? '#ffffff') : null;
\t}
}
""",
    """\t\tcase 'shape.strokeColor':
\t\t\treturn item.type === 'shape' && item.strokeEnabled ? (item.strokeColor ?? '#ffffff') : null;
\t\tcase 'shape.shapeType':
\t\t\treturn item.type === 'shape' ? item.shapeType : null;
\t\tcase 'motion.intensity':
\t\tcase 'motion.depth':
\t\tcase 'motion.speed':
\t\t\treturn null;
\t}
}
""",
    1,
)
text = text.replace(
    """\t\tcase 'shape.strokeColor':
\t\t\treturn item.type === 'shape' && item.strokeColor !== value
\t\t\t\t? { ...item, strokeColor: value }
\t\t\t\t: item;
\t}
}

export function applyCompositionControlOverrides(
""",
    """\t\tcase 'shape.strokeColor':
\t\t\treturn item.type === 'shape' && item.strokeColor !== value
\t\t\t\t? { ...item, strokeColor: value }
\t\t\t\t: item;
\t\tcase 'shape.shapeType':
\t\t\treturn item.type === 'shape' && ['rectangle', 'circle', 'ellipse'].includes(value)
\t\t\t\t? { ...item, shapeType: value as 'rectangle' | 'circle' | 'ellipse' }
\t\t\t\t: item;
\t\tcase 'motion.intensity':
\t\tcase 'motion.depth':
\t\tcase 'motion.speed':
\t\t\treturn item;
\t}
}

function boundedNumber(control: CompositionControlDefinition | undefined, overrides: CompositionControlOverrides, fallback: number): number {
\tif (!control) return fallback;
\tconst raw = overrides[control.id];
\tif (raw === undefined) return fallback;
\tconst parsed = Number(raw);
\tif (!Number.isFinite(parsed)) return fallback;
\tconst min = control.min ?? parsed;
\tconst max = control.max ?? parsed;
\treturn Math.min(Math.max(parsed, Math.min(min, max)), Math.max(min, max));
}

function tuneTrack(track: KeyframeTrack | undefined, property: string, durationInFrames: number, intensity: number, depth: number, speed: number): KeyframeTrack | undefined {
\tif (!track) return track;
\tconst end = Math.max(1, durationInFrames - 1);
\tconst first = track.values[0] ?? 0;
\tconst values = track.values.map((value) => {
\t\tlet next = first + (value - first) * intensity;
\t\tif (property === 'scaleX' || property === 'scaleY') next = 1 + (next - 1) * depth;
\t\treturn next;
\t});
\tconst frames = track.frames.map((frame, index) => index === 0 ? Math.max(0, Math.min(end, frame)) : Math.max(0, Math.min(end, Math.round(frame / speed))));
\tfor (let index = 1; index < frames.length; index += 1) frames[index] = Math.min(end, Math.max(frames[index], frames[index - 1]));
\treturn { ...track, frames, values };
}

function applyMotionControlOverrides(items: readonly TimelineItem[], schema: CompositionControlSchema, overrides: CompositionControlOverrides): TimelineItem[] {
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

export function applyCompositionControlOverrides(
""",
    1,
)
text = text.replace(
    """\t\tfor (const control of controls) {
\t\t\tnext = applyControlValue(next, control.property, overrides[control.id]);
\t\t}
\t\tchanged ||= next !== item;
\t\treturn next;
\t});
\treturn changed ? resolved : storedItems(items);
}
""",
    """\t\tfor (const control of controls) {
\t\t\tif (control.property.startsWith('motion.')) continue;
\t\t\tnext = applyControlValue(next, control.property, overrides[control.id]);
\t\t}
\t\tchanged ||= next !== item;
\t\treturn next;
\t});
\tconst motionResolved = applyMotionControlOverrides(resolved, schema, overrides);
\treturn changed || motionResolved.some((item, index) => item !== resolved[index]) ? motionResolved : storedItems(items);
}
""",
    1,
)
text = text.replace(
    "property: z.enum(['text.text', 'text.color', 'shape.fillColor', 'shape.strokeColor']),\n\t\t\t\tkind: z.enum(['text', 'color']),\n\t\t\t\tdefaultValue: z.string().max(100_000).optional()",
    "property: z.enum(['text.text', 'text.color', 'shape.fillColor', 'shape.strokeColor', 'shape.shapeType', 'motion.intensity', 'motion.depth', 'motion.speed']),\n\t\t\t\tkind: z.enum(['text', 'color', 'number', 'select']),\n\t\t\t\tdefaultValue: z.string().max(100_000).optional(),\n\t\t\t\tmin: z.number().finite().optional(),\n\t\t\t\tmax: z.number().finite().optional(),\n\t\t\t\tstep: z.number().finite().positive().optional(),\n\t\t\t\toptions: z.array(z.object({ value: z.string().max(100), label: z.string().max(120) })).max(100).optional()",
    1,
)
text = text.replace(
    """\t\tconst sourceValue = readControlValue(target, entry.property);
\t\tconst kind: CompositionControlKind = entry.property === 'text.text' ? 'text' : 'color';
\t\tconst targetKey = `${targetItemId}:${entry.property}`;
\t\tif (
\t\t\tsourceValue === null ||
\t\t\tentry.kind !== kind ||
""",
    """\t\tconst sourceValue = readControlValue(target, entry.property);
\t\tconst kind: CompositionControlKind = entry.property === 'text.text' ? 'text' : entry.property === 'shape.shapeType' ? 'select' : entry.property.startsWith('motion.') ? 'number' : 'color';
\t\tconst targetKey = `${targetItemId}:${entry.property}`;
\t\tconst motionControl = entry.property.startsWith('motion.');
\t\tif (
\t\t\t(!motionControl && sourceValue === null) ||
\t\t\tentry.kind !== kind ||
""",
    1,
)
text = text.replace(
    """\t\tseenIds.add(id);
\t\tseenTargets.add(targetKey);
\t\tcontrols.push({
\t\t\tid,
\t\t\tname,
\t\t\ttargetItemId,
\t\t\tproperty: entry.property,
\t\t\tkind,
\t\t\tdefaultValue: entry.defaultValue ?? sourceValue
\t\t});
""",
    """\t\tif (kind === 'number' && (!Number.isFinite(Number(entry.defaultValue)) || entry.min === undefined || entry.max === undefined)) continue;
\t\tif (kind === 'select' && (!entry.options?.length || !entry.options.some((option) => option.value === entry.defaultValue))) continue;
\t\tseenIds.add(id);
\t\tseenTargets.add(targetKey);
\t\tcontrols.push({
\t\t\tid,
\t\t\tname,
\t\t\ttargetItemId,
\t\t\tproperty: entry.property,
\t\t\tkind,
\t\t\tdefaultValue: entry.defaultValue ?? sourceValue ?? '',
\t\t\t...(kind === 'number' ? { min: entry.min, max: entry.max, step: entry.step } : {}),
\t\t\t...(kind === 'select' ? { options: entry.options } : {})
\t\t});
""",
    1,
)
controls.write_text(text)

replace_once(
    'apps/web/src/lib/video-editor/components/composition-control-overrides.svelte',
    """\t\t\t\t\t\t{:else}
\t\t\t\t\t\t\t<ColorPicker
\t\t\t\t\t\t\t\tlabel={control.name}
\t\t\t\t\t\t\t\tvalue={value(control)}
\t\t\t\t\t\t\t\tvariant=\"swatch\"
\t\t\t\t\t\t\t\tlive={false}
\t\t\t\t\t\t\t\tonChange={(newValue) => setValue(control, newValue)}
\t\t\t\t\t\t\t/>
\t\t\t\t\t\t{/if}
""",
    """\t\t\t\t\t\t{:else if control.kind === 'color'}
\t\t\t\t\t\t\t<ColorPicker
\t\t\t\t\t\t\t\tlabel={control.name}
\t\t\t\t\t\t\t\tvalue={value(control)}
\t\t\t\t\t\t\t\tvariant=\"swatch\"
\t\t\t\t\t\t\t\tlive={false}
\t\t\t\t\t\t\t\tonChange={(newValue) => setValue(control, newValue)}
\t\t\t\t\t\t\t/>
\t\t\t\t\t\t{:else if control.kind === 'number'}
\t\t\t\t\t\t\t<div class=\"flex min-w-0 flex-1 items-center gap-2\">
\t\t\t\t\t\t\t\t<input type=\"range\" class=\"min-w-0 flex-1\" min={control.min ?? 0} max={control.max ?? 1} step={control.step ?? 0.05} value={Number(value(control))} onchange={(event) => setValue(control, event.currentTarget.value)} />
\t\t\t\t\t\t\t\t<span class=\"w-9 text-right tabular-nums\">{Number(value(control)).toFixed(2)}</span>
\t\t\t\t\t\t\t</div>
\t\t\t\t\t\t{:else}
\t\t\t\t\t\t\t<select class=\"h-8 min-w-0 flex-1 rounded border border-[var(--video-editor-border)] bg-[var(--video-editor-panel)] px-2 text-xs\" value={value(control)} onchange={(event) => setValue(control, event.currentTarget.value)}>
\t\t\t\t\t\t\t\t{#each control.options ?? [] as option (option.value)}<option value={option.value}>{option.label}</option>{/each}
\t\t\t\t\t\t\t</select>
\t\t\t\t\t\t{/if}
""",
)

replace_once(
    'apps/web/src/lib/auno/motion/motion-composition.ts',
    """\t\t\t\t\tcontrols: [
\t\t\t\t\t\t{
\t\t\t\t\t\t\tid: 'accent-color',
\t\t\t\t\t\t\tname: 'Accent color',
\t\t\t\t\t\t\ttargetItemId: primaryShapeId,
\t\t\t\t\t\t\tproperty: 'shape.fillColor',
\t\t\t\t\t\t\tkind: 'color',
\t\t\t\t\t\t\tdefaultValue: accent
\t\t\t\t\t\t},
\t\t\t\t\t\t{
\t\t\t\t\t\t\tid: 'frame-color',
\t\t\t\t\t\t\tname: 'Frame color',
\t\t\t\t\t\t\ttargetItemId: accentShapeId,
\t\t\t\t\t\t\tproperty: 'shape.strokeColor',
\t\t\t\t\t\t\tkind: 'color',
\t\t\t\t\t\t\tdefaultValue: secondary
\t\t\t\t\t\t}
\t\t\t\t\t]
""",
    """\t\t\t\t\tcontrols: [
\t\t\t\t\t\t{ id: 'intensity', name: 'Intensity', targetItemId: primaryShapeId, property: 'motion.intensity', kind: 'number', defaultValue: '1', min: 0, max: 1, step: 0.05 },
\t\t\t\t\t\t{ id: 'depth', name: 'Depth', targetItemId: primaryShapeId, property: 'motion.depth', kind: 'number', defaultValue: '1', min: 0, max: 1, step: 0.05 },
\t\t\t\t\t\t{ id: 'speed', name: 'Speed', targetItemId: primaryShapeId, property: 'motion.speed', kind: 'number', defaultValue: '1', min: 0.25, max: 2, step: 0.05 },
\t\t\t\t\t\t{ id: 'primary-color', name: 'Primary color', targetItemId: primaryShapeId, property: 'shape.fillColor', kind: 'color', defaultValue: accent },
\t\t\t\t\t\t{ id: 'secondary-color', name: 'Secondary color', targetItemId: accentShapeId, property: 'shape.strokeColor', kind: 'color', defaultValue: secondary },
\t\t\t\t\t\t{ id: 'background-variant', name: 'Background variant', targetItemId: accentShapeId, property: 'shape.shapeType', kind: 'select', defaultValue: 'rectangle', options: [{ value: 'rectangle', label: 'Frame' }, { value: 'ellipse', label: 'Oval' }, { value: 'circle', label: 'Circle' }] }
\t\t\t\t\t]
""",
)

replace_once(
    'apps/web/src/lib/auno/motion/motion-composition.ts',
    """\t\t\t\tcompositionControlOverrides: {
\t\t\t\t\t'accent-color': accent,
\t\t\t\t\t'frame-color': secondary
\t\t\t\t},
""",
    """\t\t\t\tcompositionControlOverrides: {
\t\t\t\t\t'primary-color': accent,
\t\t\t\t\t'secondary-color': secondary
\t\t\t\t},
""",
)
