from pathlib import Path

path = Path('apps/web/src/routes/auto-video/+page.svelte')
text = path.read_text()

old = "import { MOTION_STYLES, createMotionProbePlan, motionProbeSignature, planMotionGraph, validateMotionGraph, type MotionStyleId } from '@auno/motion';"
new = "import { MOTION_STYLES, createMotionProbePlan, motionProbeSignature, planMotionGraph, recommendMotionStyle, validateMotionGraph, type MotionStyleId } from '@auno/motion';"
if new not in text:
    if old not in text: raise SystemExit('missing motion import anchor')
    text = text.replace(old, new, 1)

old = "\tlet motionStyle = $state<MotionStyleId>('editorial-fashion');\n\tlet storageMode = $state<'cloud' | 'local'>('cloud');"
new = "\tlet motionStyle = $state<MotionStyleId>(recommendMotionStyle({ format: 'review' }));\n\tlet motionStyleUserSelected = $state(false);\n\tlet storageMode = $state<'cloud' | 'local'>('cloud');"
if new not in text:
    if old not in text: raise SystemExit('missing motion state anchor')
    text = text.replace(old, new, 1)

anchor = "\tlet creating = $state(false);\n"
addition = anchor + "\n\t$effect(() => {\n\t\tif (!motionStyleUserSelected) motionStyle = recommendMotionStyle({ format });\n\t});\n"
if '$effect(() => {\n\t\tif (!motionStyleUserSelected)' not in text:
    if anchor not in text: raise SystemExit('missing creating state anchor')
    text = text.replace(anchor, addition, 1)

old = '<select bind:value={motionStyle} class="h-10 w-full rounded-md border bg-background px-3 text-sm">'
new = '<select bind:value={motionStyle} onchange={() => (motionStyleUserSelected = true)} class="h-10 w-full rounded-md border bg-background px-3 text-sm">'
if new not in text:
    if old not in text: raise SystemExit('missing motion style select anchor')
    text = text.replace(old, new, 1)

path.write_text(text)
