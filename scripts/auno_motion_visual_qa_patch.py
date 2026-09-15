from pathlib import Path


def patch(path: str, replacements: list[tuple[str, str]]) -> None:
    file = Path(path)
    text = file.read_text()
    for old, new in replacements:
        if old not in text:
            raise SystemExit(f'missing anchor in {path}: {old[:80]!r}')
        text = text.replace(old, new, 1)
    file.write_text(text)

patch('apps/web/src/routes/auto-video/+page.svelte', [
    (
        "\timport { applyMotionGraphToProject } from '$lib/auno/motion/native-compiler';\n",
        "\timport { applyMotionGraphToProject } from '$lib/auno/motion/native-compiler';\n\timport { inspectAunoMotionVisualQA } from '$lib/auno/motion/visual-qa';\n"
    ),
    (
        "\t\t\tconst motionDiagnostics = validateMotionGraph(motionGraph);\n\t\t\tconst motionProbePlan = createMotionProbePlan(motionGraph, baseProject.metadata.fps);\n",
        "\t\t\tconst motionDiagnostics = validateMotionGraph(motionGraph);\n\t\t\tconst visualDiagnostics = inspectAunoMotionVisualQA({\n\t\t\t\tstoryboard,\n\t\t\t\titems: project.timeline?.items ?? [],\n\t\t\t\twidth: project.metadata.width,\n\t\t\t\theight: project.metadata.height,\n\t\t\t\tcompositionIds: new Set((project.timeline?.compositions ?? []).map((composition) => composition.id))\n\t\t\t});\n\t\t\tconst motionProbePlan = createMotionProbePlan(motionGraph, baseProject.metadata.fps);\n"
    ),
    (
        "\t\t\t\t\t\tdiagnostics: motionDiagnostics,\n\t\t\t\t\t\tprobePlan: motionProbePlan,\n",
        "\t\t\t\t\t\tdiagnostics: motionDiagnostics,\n\t\t\t\t\t\tvisualDiagnostics,\n\t\t\t\t\t\tprobePlan: motionProbePlan,\n"
    )
])

patch('apps/web/src/lib/video-editor/components/auno-auto-video-panel.svelte', [
    (
        "\timport { applyMotionGraphToLiveTimeline } from '$lib/auno/motion/live-applier';\n",
        "\timport { applyMotionGraphToLiveTimeline } from '$lib/auno/motion/live-applier';\n\timport { inspectAunoMotionVisualQA } from '$lib/auno/motion/visual-qa';\n"
    ),
    (
        "\tconst motionIssues = $derived(sidecar?.generationGraph?.motion?.diagnostics ?? []);\n\tconst motionErrorCount = $derived(motionIssues.filter((issue) => issue.severity === 'error').length);\n",
        "\tconst motionIssues = $derived(sidecar?.generationGraph?.motion?.diagnostics ?? []);\n\tconst visualIssues = $derived(sidecar?.generationGraph?.motion?.visualDiagnostics ?? []);\n\tconst allMotionIssues = $derived([...motionIssues, ...visualIssues]);\n\tconst motionErrorCount = $derived(allMotionIssues.filter((issue) => issue.severity === 'error').length);\n"
    ),
    (
        "\t\t\tconst nextMotionOwnership = replaceOwnershipCategory(\n\t\t\t\tsidecar,\n\t\t\t\t'motion',\n\t\t\t\tappliedMotion.ownedItems.map((entry) => ({ ...entry, category: 'motion' as const }))\n\t\t\t);\n\t\t\tconst nextSidecar: AutoVideoSidecar = {\n",
        "\t\t\tconst nextMotionOwnership = replaceOwnershipCategory(\n\t\t\t\tsidecar,\n\t\t\t\t'motion',\n\t\t\t\tappliedMotion.ownedItems.map((entry) => ({ ...entry, category: 'motion' as const }))\n\t\t\t);\n\t\t\tconst visualDiagnostics = inspectAunoMotionVisualQA({\n\t\t\t\tstoryboard: sidecar.storyboard,\n\t\t\t\titems: timelineStore.items,\n\t\t\t\twidth: project.metadata.width,\n\t\t\t\theight: project.metadata.height,\n\t\t\t\tcompositionIds: new Set(appliedMotion.compositionIds)\n\t\t\t});\n\t\t\tconst nextSidecar: AutoVideoSidecar = {\n"
    ),
    (
        "\t\t\t\t\t\tdiagnostics: motionDiagnostics,\n\t\t\t\t\t\tprobePlan: motionProbePlan,\n",
        "\t\t\t\t\t\tdiagnostics: motionDiagnostics,\n\t\t\t\t\t\tvisualDiagnostics,\n\t\t\t\t\t\tprobePlan: motionProbePlan,\n"
    ),
    (
        "\t\t\t\tconst nextMotionOwnership = replaceOwnershipCategory(\n\t\t\t\t\tnextSidecar,\n\t\t\t\t\t'motion',\n\t\t\t\t\tappliedMotion.ownedItems.map((entry) => ({ ...entry, category: 'motion' as const }))\n\t\t\t\t);\n\t\t\t\tnextSidecar = {\n",
        "\t\t\t\tconst nextMotionOwnership = replaceOwnershipCategory(\n\t\t\t\t\tnextSidecar,\n\t\t\t\t\t'motion',\n\t\t\t\t\tappliedMotion.ownedItems.map((entry) => ({ ...entry, category: 'motion' as const }))\n\t\t\t\t);\n\t\t\t\tconst visualDiagnostics = inspectAunoMotionVisualQA({\n\t\t\t\t\tstoryboard: nextSidecar.storyboard,\n\t\t\t\t\titems: timelineStore.items,\n\t\t\t\t\twidth: project.metadata.width,\n\t\t\t\t\theight: project.metadata.height,\n\t\t\t\t\tcompositionIds: new Set(appliedMotion.compositionIds)\n\t\t\t\t});\n\t\t\t\tnextSidecar = {\n"
    ),
    (
        "\t\t\t\t\t\t\tdiagnostics: motionDiagnostics,\n\t\t\t\t\t\t\tprobePlan: motionProbePlan,\n",
        "\t\t\t\t\t\t\tdiagnostics: motionDiagnostics,\n\t\t\t\t\t\t\tvisualDiagnostics,\n\t\t\t\t\t\t\tprobePlan: motionProbePlan,\n"
    ),
    (
        "\t\t\t\t{#if motionIssues.length > 0}\n",
        "\t\t\t\t{#if allMotionIssues.length > 0}\n"
    ),
    (
        "\t\t\t\t\t\t\t<span class=\"text-[10px] text-[var(--video-editor-muted)]\">{motionErrorCount > 0 ? `${motionErrorCount} error` : `${motionIssues.length} warning${motionIssues.length === 1 ? '' : 's'}`}</span>\n",
        "\t\t\t\t\t\t\t<span class=\"text-[10px] text-[var(--video-editor-muted)]\">{motionErrorCount > 0 ? `${motionErrorCount} error` : `${allMotionIssues.length} warning${allMotionIssues.length === 1 ? '' : 's'}`}</span>\n"
    ),
    (
        "\t\t\t\t\t\t{#each motionIssues.slice(0, 4) as issue (`${issue.code}:${issue.sceneId ?? 'project'}`)}\n",
        "\t\t\t\t\t\t{#each allMotionIssues.slice(0, 4) as issue (`${issue.code}:${issue.sceneId ?? 'project'}`)}\n"
    ),
    (
        "\t\t\t\t\t\t{#if motionIssues.length > 4}\n\t\t\t\t\t\t\t<p class=\"text-[10px] text-[var(--video-editor-muted)]\">+{motionIssues.length - 4} more</p>\n",
        "\t\t\t\t\t\t{#if allMotionIssues.length > 4}\n\t\t\t\t\t\t\t<p class=\"text-[10px] text-[var(--video-editor-muted)]\">+{allMotionIssues.length - 4} more</p>\n"
    )
])
