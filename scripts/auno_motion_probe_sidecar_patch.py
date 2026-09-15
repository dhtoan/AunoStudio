from pathlib import Path


def patch(path: str, replacements: list[tuple[str, str]]) -> None:
    file = Path(path)
    text = file.read_text()
    for old, new in replacements:
        if new in text:
            continue
        if old not in text:
            raise SystemExit(f'missing anchor in {path}: {old[:80]}')
        text = text.replace(old, new, 1)
    file.write_text(text)


patch('apps/web/src/routes/auto-video/+page.svelte', [
    (
        "import { MOTION_STYLES, planMotionGraph, validateMotionGraph, type MotionStyleId } from '@auno/motion';",
        "import { MOTION_STYLES, createMotionProbePlan, motionProbeSignature, planMotionGraph, validateMotionGraph, type MotionStyleId } from '@auno/motion';"
    ),
    (
        "\t\t\tconst motionDiagnostics = validateMotionGraph(motionGraph);\n\t\t\tconst now = Date.now();",
        "\t\t\tconst motionDiagnostics = validateMotionGraph(motionGraph);\n\t\t\tconst motionProbePlan = createMotionProbePlan(motionGraph, baseProject.metadata.fps);\n\t\t\tconst motionProbePlanSignature = motionProbeSignature(motionProbePlan);\n\t\t\tconst now = Date.now();"
    ),
    (
        "\t\t\t\t\t\tdiagnostics: motionDiagnostics\n",
        "\t\t\t\t\t\tdiagnostics: motionDiagnostics,\n\t\t\t\t\t\tprobePlan: motionProbePlan,\n\t\t\t\t\t\tprobeSignature: motionProbePlanSignature\n"
    )
])

patch('apps/web/src/lib/video-editor/components/auno-auto-video-panel.svelte', [
    (
        "import { MOTION_STYLES, planMotionGraph, validateMotionGraph, type MotionStyleId } from '@auno/motion';",
        "import { MOTION_STYLES, createMotionProbePlan, motionProbeSignature, planMotionGraph, validateMotionGraph, type MotionStyleId } from '@auno/motion';"
    ),
    (
        "\t\t\tconst motionDiagnostics = validateMotionGraph(graph);\n\t\t\tapplyMotionGraphToLiveTimeline({",
        "\t\t\tconst motionDiagnostics = validateMotionGraph(graph);\n\t\t\tconst motionProbePlan = createMotionProbePlan(graph, project.metadata.fps);\n\t\t\tconst motionProbePlanSignature = motionProbeSignature(motionProbePlan);\n\t\t\tapplyMotionGraphToLiveTimeline({"
    ),
    (
        "\t\t\t\t\t\tdiagnostics: motionDiagnostics\n",
        "\t\t\t\t\t\tdiagnostics: motionDiagnostics,\n\t\t\t\t\t\tprobePlan: motionProbePlan,\n\t\t\t\t\t\tprobeSignature: motionProbePlanSignature\n"
    ),
    (
        "\t\t\t\tconst motionDiagnostics = validateMotionGraph(graph);\n\t\t\t\tapplyMotionGraphToLiveTimeline({",
        "\t\t\t\tconst motionDiagnostics = validateMotionGraph(graph);\n\t\t\t\tconst motionProbePlan = createMotionProbePlan(graph, project.metadata.fps);\n\t\t\t\tconst motionProbePlanSignature = motionProbeSignature(motionProbePlan);\n\t\t\t\tapplyMotionGraphToLiveTimeline({"
    ),
    (
        "\t\t\t\t\t\t\tdiagnostics: motionDiagnostics\n",
        "\t\t\t\t\t\t\tdiagnostics: motionDiagnostics,\n\t\t\t\t\t\t\tprobePlan: motionProbePlan,\n\t\t\t\t\t\t\tprobeSignature: motionProbePlanSignature\n"
    )
])
