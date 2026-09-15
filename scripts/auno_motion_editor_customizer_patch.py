from pathlib import Path

path = Path('apps/web/src/lib/video-editor/components/auno-auto-video-panel.svelte')
text = path.read_text()

replacements = [
    (
        "\timport { MOTION_STYLES, createMotionProbePlan, motionProbeSignature, planMotionGraph, validateMotionGraph, type MotionStyleId } from '@auno/motion';\n",
        "\timport { MOTION_STYLES, createMotionProbePlan, motionProbeSignature, planMotionGraph, validateMotionGraph, type MotionStyleCustomization, type MotionStyleId } from '@auno/motion';\n"
    ),
    (
        "\timport { Button } from '$lib/components/ui/button';\n",
        "\timport { Button } from '$lib/components/ui/button';\n\timport MotionStyleCustomizer from '$lib/components/auno-motion/motion-style-customizer.svelte';\n"
    ),
    (
        "\tlet motionStyle = $state<MotionStyleId>('editorial-fashion');\n\tlet motionBusy = $state(false);\n",
        "\tlet motionStyle = $state<MotionStyleId>('editorial-fashion');\n\tlet motionCustomization = $state<MotionStyleCustomization>({});\n\tlet motionBusy = $state(false);\n"
    ),
    (
        "\t\t\tconst savedStyle = loaded?.generationGraph?.motion?.style;\n\t\t\tif (savedStyle && savedStyle in MOTION_STYLES) motionStyle = savedStyle as MotionStyleId;\n",
        "\t\t\tconst savedMotion = loaded?.generationGraph?.motion;\n\t\t\tconst savedStyle = savedMotion?.style;\n\t\t\tif (savedStyle && savedStyle in MOTION_STYLES) motionStyle = savedStyle as MotionStyleId;\n\t\t\tmotionCustomization = savedMotion?.customization ? { ...savedMotion.customization } : {};\n"
    ),
    (
        "\t\t\t\tcustomization: previousMotion?.customization\n",
        "\t\t\t\tcustomization: motionCustomization\n"
    ),
    (
        "\t\t\t\t\t\tcustomization: previousMotion?.customization,\n",
        "\t\t\t\t\t\tcustomization: Object.keys(motionCustomization).length ? motionCustomization : undefined,\n"
    ),
    (
        "\t\t\t\t</div>\n\n\t\t\t\t{#if allMotionIssues.length > 0}\n",
        "\t\t\t\t</div>\n\n\t\t\t\t<MotionStyleCustomizer bind:customization={motionCustomization} />\n\n\t\t\t\t{#if allMotionIssues.length > 0}\n"
    )
]
for old, new in replacements:
    if old not in text:
        raise SystemExit(f'missing anchor: {old[:120]!r}')
    text = text.replace(old, new, 1)
path.write_text(text)
