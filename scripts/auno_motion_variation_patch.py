from pathlib import Path

path = Path('apps/web/src/lib/video-editor/components/auno-auto-video-panel.svelte')
text = path.read_text()
pairs = [
    (
        "\timport { MOTION_STYLES, createMotionProbePlan, motionProbeSignature, planMotionGraph, validateMotionGraph, type MotionStyleCustomization, type MotionStyleId } from '@auno/motion';\n",
        "\timport { MOTION_STYLES, createMotionProbePlan, hashMotionSeed, motionProbeSignature, planMotionGraph, validateMotionGraph, type MotionStyleCustomization, type MotionStyleId } from '@auno/motion';\n"
    ),
    (
        "\tasync function applyMotionStyle(): Promise<void> {\n",
        "\tasync function applyMotionStyle(newVariation = false): Promise<void> {\n"
    ),
    (
        "\t\t\tconst previousMotion = sidecar.generationGraph?.motion;\n\t\t\tconst graph = planMotionGraph({\n\t\t\t\tprojectId,\n\t\t\t\tstyle: motionStyle,\n\t\t\t\tseed: previousMotion?.style === motionStyle ? previousMotion.seed : undefined,\n",
        "\t\t\tconst previousMotion = sidecar.generationGraph?.motion;\n\t\t\tconst variationSeed = newVariation\n\t\t\t\t? hashMotionSeed(`${previousMotion?.seed ?? 0}:${sidecar.generationVersion + 1}:${motionStyle}`)\n\t\t\t\t: previousMotion?.style === motionStyle\n\t\t\t\t\t? previousMotion.seed\n\t\t\t\t\t: undefined;\n\t\t\tconst graph = planMotionGraph({\n\t\t\t\tprojectId,\n\t\t\t\tstyle: motionStyle,\n\t\t\t\tseed: variationSeed,\n"
    ),
    (
        "\t\t\tstatus = `Regenerated ${MOTION_STYLES[motionStyle].label} motion only. Voice, captions, music, manual text, and compatible composition overrides were preserved.`;\n",
        "\t\t\tstatus = `${newVariation ? 'Created a new deterministic variation of' : 'Regenerated'} ${MOTION_STYLES[motionStyle].label} motion only. Voice, captions, music, manual text, and compatible composition overrides were preserved.`;\n"
    ),
    (
        "\t\t\t\t<div class=\"grid grid-cols-[minmax(0,1fr)_auto] gap-1.5\">\n",
        "\t\t\t\t<div class=\"grid grid-cols-[minmax(0,1fr)_auto] gap-1.5\">\n"
    ),
    (
        "\t\t\t\t\t<Button type=\"button\" size=\"sm\" variant=\"outline\" disabled={motionBusy || mediaBusy !== null || busyScene !== null} onclick={applyMotionStyle}>\n\t\t\t\t\t\t{motionBusy ? 'Regenerating…' : sidecar.generationGraph?.motion ? 'Regenerate motion' : 'Apply motion'}\n\t\t\t\t\t</Button>\n\t\t\t\t</div>\n\n\t\t\t\t<MotionStyleCustomizer",
        "\t\t\t\t\t<Button type=\"button\" size=\"sm\" variant=\"outline\" disabled={motionBusy || mediaBusy !== null || busyScene !== null} onclick={() => applyMotionStyle(false)}>\n\t\t\t\t\t\t{motionBusy ? 'Regenerating…' : sidecar.generationGraph?.motion ? 'Regenerate motion' : 'Apply motion'}\n\t\t\t\t\t</Button>\n\t\t\t\t</div>\n\t\t\t\t{#if sidecar.generationGraph?.motion}\n\t\t\t\t\t<Button type=\"button\" size=\"sm\" variant=\"ghost\" class=\"w-full\" disabled={motionBusy || mediaBusy !== null || busyScene !== null} onclick={() => applyMotionStyle(true)}>\n\t\t\t\t\t\tNew motion variation\n\t\t\t\t\t</Button>\n\t\t\t\t{/if}\n\n\t\t\t\t<MotionStyleCustomizer"
    )
]
for old, new in pairs:
    if old not in text:
        raise SystemExit(f'missing anchor: {old[:100]!r}')
    text = text.replace(old, new, 1)
path.write_text(text)
