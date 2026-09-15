from pathlib import Path


def patch(path: str, pairs: list[tuple[str, str]]) -> None:
    file = Path(path)
    text = file.read_text()
    for old, new in pairs:
        if old not in text:
            raise SystemExit(f'missing anchor in {path}: {old[:120]!r}')
        text = text.replace(old, new, 1)
    file.write_text(text)

route = 'apps/web/src/routes/auto-video/+page.svelte'
patch(route, [
    (
        "\timport { Button } from '$lib/components/ui/button';\n",
        "\timport { Button } from '$lib/components/ui/button';\n\timport MotionStyleCustomizer from '$lib/components/auno-motion/motion-style-customizer.svelte';\n"
    ),
    (
        "\timport { MOTION_STYLES, createMotionProbePlan, motionProbeSignature, planMotionGraph, recommendMotionStyle, validateMotionGraph, type MotionStyleId } from '@auno/motion';\n",
        "\timport { MOTION_STYLES, createMotionProbePlan, motionProbeSignature, planMotionGraph, recommendMotionStyle, validateMotionGraph, type MotionStyleCustomization, type MotionStyleId } from '@auno/motion';\n"
    ),
    (
        "\tlet motionStyle = $state<MotionStyleId>(recommendMotionStyle({ format: 'review' }));\n\tlet motionStyleUserSelected = $state(false);\n",
        "\tlet motionStyle = $state<MotionStyleId>(recommendMotionStyle({ format: 'review' }));\n\tlet motionStyleUserSelected = $state(false);\n\tlet motionCustomization = $state<MotionStyleCustomization>({});\n"
    ),
    (
        "\t\t\tconst motionGraph = planMotionGraph({\n\t\t\t\tprojectId: baseProject.id,\n\t\t\t\tstyle: motionStyle,\n\t\t\t\tscenes: storyboard.scenes\n\t\t\t});\n",
        "\t\t\tconst motionGraph = planMotionGraph({\n\t\t\t\tprojectId: baseProject.id,\n\t\t\t\tstyle: motionStyle,\n\t\t\t\tscenes: storyboard.scenes,\n\t\t\t\tcustomization: motionCustomization\n\t\t\t});\n"
    ),
    (
        "\t\t\t\t\t\tbrief: motionGraph.brief,\n\t\t\t\t\t\tdiagnostics: motionDiagnostics,\n",
        "\t\t\t\t\t\tbrief: motionGraph.brief,\n\t\t\t\t\t\tcustomization: Object.keys(motionCustomization).length ? motionCustomization : undefined,\n\t\t\t\t\t\tdiagnostics: motionDiagnostics,\n"
    ),
    (
        "\t\t\t</div>\n\n\t\t\t<div class=\"flex flex-wrap items-center gap-3\">\n\t\t\t\t<Button onclick={generateStoryboard}",
        "\t\t\t</div>\n\n\t\t\t<MotionStyleCustomizer bind:customization={motionCustomization} />\n\n\t\t\t<div class=\"flex flex-wrap items-center gap-3\">\n\t\t\t\t<Button onclick={generateStoryboard}"
    )
])

panel = 'apps/web/src/lib/video-editor/components/auno-auto-video-panel.svelte'
patch(panel, [
    (
        "\t\t\tconst graph = planMotionGraph({\n\t\t\t\tprojectId,\n\t\t\t\tstyle: motionStyle,\n\t\t\t\tseed: previousMotion?.style === motionStyle ? previousMotion.seed : undefined,\n\t\t\t\tscenes: sidecar.storyboard.scenes\n\t\t\t});\n",
        "\t\t\tconst graph = planMotionGraph({\n\t\t\t\tprojectId,\n\t\t\t\tstyle: motionStyle,\n\t\t\t\tseed: previousMotion?.style === motionStyle ? previousMotion.seed : undefined,\n\t\t\t\tscenes: sidecar.storyboard.scenes,\n\t\t\t\tcustomization: previousMotion?.customization\n\t\t\t});\n"
    ),
    (
        "\t\t\t\t\t\tbrief: graph.brief,\n\t\t\t\t\t\tdiagnostics: motionDiagnostics,\n",
        "\t\t\t\t\t\tbrief: graph.brief,\n\t\t\t\t\t\tcustomization: previousMotion?.customization,\n\t\t\t\t\t\tdiagnostics: motionDiagnostics,\n"
    ),
    (
        "\t\t\t\tconst graph = planMotionGraph({\n\t\t\t\t\tprojectId,\n\t\t\t\t\tstyle,\n\t\t\t\t\tseed: savedMotion.seed,\n\t\t\t\t\tscenes: nextSidecar.storyboard.scenes\n\t\t\t\t});\n",
        "\t\t\t\tconst graph = planMotionGraph({\n\t\t\t\t\tprojectId,\n\t\t\t\t\tstyle,\n\t\t\t\t\tseed: savedMotion.seed,\n\t\t\t\t\tscenes: nextSidecar.storyboard.scenes,\n\t\t\t\t\tcustomization: savedMotion.customization\n\t\t\t\t});\n"
    ),
    (
        "\t\t\t\t\t\t\tbrief: graph.brief,\n\t\t\t\t\t\t\tdiagnostics: motionDiagnostics,\n",
        "\t\t\t\t\t\t\tbrief: graph.brief,\n\t\t\t\t\t\t\tcustomization: savedMotion.customization,\n\t\t\t\t\t\t\tdiagnostics: motionDiagnostics,\n"
    )
])
