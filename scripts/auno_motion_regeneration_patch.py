from pathlib import Path

path = Path('apps/web/src/lib/video-editor/components/auno-auto-video-panel.svelte')
text = path.read_text()

old = """\timport { applyMotionGraphToLiveTimeline } from '$lib/auno/motion/live-applier';\n"""
new = """\timport { applyMotionGraphToLiveTimeline } from '$lib/auno/motion/live-applier';\n\timport { replaceOwnershipCategory } from '$lib/auno/auto-video/ownership';\n"""
if old not in text:
    raise SystemExit('missing live applier import anchor')
text = text.replace(old, new, 1)

old = """\t\t\tapplyMotionGraphToLiveTimeline({\n\t\t\t\tgraph,\n\t\t\t\twidth: project.metadata.width,\n\t\t\t\theight: project.metadata.height\n\t\t\t});\n\t\t\tconst nextSidecar: AutoVideoSidecar = {\n"""
new = """\t\t\tconst appliedMotion = applyMotionGraphToLiveTimeline({\n\t\t\t\tgraph,\n\t\t\t\twidth: project.metadata.width,\n\t\t\t\theight: project.metadata.height\n\t\t\t});\n\t\t\tconst nextMotionOwnership = replaceOwnershipCategory(\n\t\t\t\tsidecar,\n\t\t\t\t'motion',\n\t\t\t\tappliedMotion.ownedItems.map((entry) => ({ ...entry, category: 'motion' as const }))\n\t\t\t);\n\t\t\tconst nextSidecar: AutoVideoSidecar = {\n"""
if old not in text:
    raise SystemExit('missing apply motion anchor')
text = text.replace(old, new, 1)

old = """\t\t\t\tgenerationGraph: {\n\t\t\t\t\t...sidecar.generationGraph,\n\t\t\t\t\tversion: 1,\n\t\t\t\t\tblocks: sidecar.generationGraph?.blocks ?? [],\n\t\t\t\t\tmotion: {\n"""
new = """\t\t\t\tgenerationGraph: {\n\t\t\t\t\t...sidecar.generationGraph,\n\t\t\t\t\tversion: 1,\n\t\t\t\t\tblocks: sidecar.generationGraph?.blocks ?? [],\n\t\t\t\t\townedItems: nextMotionOwnership,\n\t\t\t\t\tmotion: {\n"""
if old not in text:
    raise SystemExit('missing motion generation graph anchor')
text = text.replace(old, new, 1)

old = """\t\t\tstatus = `Applied ${MOTION_STYLES[motionStyle].label} as native editable motion.`;\n"""
new = """\t\t\tstatus = `Regenerated ${MOTION_STYLES[motionStyle].label} motion only. Voice, captions, music, manual text, and compatible composition overrides were preserved.`;\n"""
if old not in text:
    raise SystemExit('missing motion status anchor')
text = text.replace(old, new, 1)

old = """\t\t\t\tapplyMotionGraphToLiveTimeline({\n\t\t\t\t\tgraph,\n\t\t\t\t\twidth: project.metadata.width,\n\t\t\t\t\theight: project.metadata.height\n\t\t\t\t});\n\t\t\t\tnextSidecar = {\n"""
new = """\t\t\t\tconst appliedMotion = applyMotionGraphToLiveTimeline({\n\t\t\t\t\tgraph,\n\t\t\t\t\twidth: project.metadata.width,\n\t\t\t\t\theight: project.metadata.height\n\t\t\t\t});\n\t\t\t\tconst nextMotionOwnership = replaceOwnershipCategory(\n\t\t\t\t\tnextSidecar,\n\t\t\t\t\t'motion',\n\t\t\t\t\tappliedMotion.ownedItems.map((entry) => ({ ...entry, category: 'motion' as const }))\n\t\t\t\t);\n\t\t\t\tnextSidecar = {\n"""
if old not in text:
    raise SystemExit('missing voice motion reflow anchor')
text = text.replace(old, new, 1)

old = """\t\t\t\t\tgenerationGraph: {\n\t\t\t\t\t\t...nextSidecar.generationGraph,\n\t\t\t\t\t\tversion: 1,\n\t\t\t\t\t\tblocks: nextSidecar.generationGraph?.blocks ?? [],\n\t\t\t\t\t\tmotion: {\n"""
new = """\t\t\t\t\tgenerationGraph: {\n\t\t\t\t\t\t...nextSidecar.generationGraph,\n\t\t\t\t\t\tversion: 1,\n\t\t\t\t\t\tblocks: nextSidecar.generationGraph?.blocks ?? [],\n\t\t\t\t\t\townedItems: nextMotionOwnership,\n\t\t\t\t\t\tmotion: {\n"""
if old not in text:
    raise SystemExit('missing voice reflow graph anchor')
text = text.replace(old, new, 1)

old = """\t\t\t\t\t<Button type=\"button\" size=\"sm\" variant=\"outline\" disabled={motionBusy || mediaBusy !== null || busyScene !== null} onclick={applyMotionStyle}>\n\t\t\t\t\t\t{motionBusy ? 'Applying…' : 'Apply motion'}\n\t\t\t\t\t</Button>\n"""
new = """\t\t\t\t\t<Button type=\"button\" size=\"sm\" variant=\"outline\" disabled={motionBusy || mediaBusy !== null || busyScene !== null} onclick={applyMotionStyle}>\n\t\t\t\t\t\t{motionBusy ? 'Regenerating…' : sidecar.generationGraph?.motion ? 'Regenerate motion' : 'Apply motion'}\n\t\t\t\t\t</Button>\n"""
if old not in text:
    raise SystemExit('missing motion button anchor')
text = text.replace(old, new, 1)

path.write_text(text)
