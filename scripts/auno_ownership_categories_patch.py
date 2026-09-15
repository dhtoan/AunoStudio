from pathlib import Path


def patch(path: str, pairs: list[tuple[str, str]]) -> None:
    file = Path(path)
    text = file.read_text()
    for old, new in pairs:
        if new in text:
            continue
        if old not in text:
            raise SystemExit(f'missing anchor in {path}: {old[:100]}')
        text = text.replace(old, new, 1)
    file.write_text(text)


patch('apps/web/src/routes/auto-video/+page.svelte', [
    (
        "\t\t\t\t\tblocks: storyboard.scenes.map((scene) => ({\n",
        "\t\t\t\t\townedItems: storyboard.scenes.flatMap((scene) => [\n\t\t\t\t\t\t{ itemId: `${scene.id}-background`, sceneId: scene.id, category: 'visual' as const },\n\t\t\t\t\t\t{ itemId: `${scene.id}-text`, sceneId: scene.id, category: 'visual' as const },\n\t\t\t\t\t\t...(scene.visualIntent === 'motion-composition'\n\t\t\t\t\t\t\t? [{ itemId: `${scene.id}-motion-composition`, sceneId: scene.id, category: 'motion' as const }]\n\t\t\t\t\t\t\t: [])\n\t\t\t\t\t]),\n\t\t\t\t\tblocks: storyboard.scenes.map((scene) => ({\n"
    )
])

patch('apps/web/src/lib/auno/auto-video/enrichment.ts', [
    (
        "import type {\n\tAutoVideoCaptionAsset,",
        "import { replaceOwnershipCategory } from './ownership';\nimport type {\n\tAutoVideoCaptionAsset,"
    ),
    (
        "\t\t\tblocks: options.sidecar.generationGraph?.blocks ?? [],\n\t\t\tmedia: { ...options.sidecar.generationGraph?.media, voices: assets }",
        "\t\t\tblocks: options.sidecar.generationGraph?.blocks ?? [],\n\t\t\townedItems: replaceOwnershipCategory(\n\t\t\t\toptions.sidecar,\n\t\t\t\t'voice',\n\t\t\t\tassets.map((asset) => ({ itemId: asset.itemId, sceneId: asset.sceneId, category: 'voice' as const }))\n\t\t\t),\n\t\t\tmedia: { ...options.sidecar.generationGraph?.media, voices: assets }"
    ),
    (
        "\t\t\t\tblocks: sidecar.generationGraph?.blocks ?? [],\n\t\t\t\tmedia: { ...sidecar.generationGraph?.media, captions: asset }",
        "\t\t\t\tblocks: sidecar.generationGraph?.blocks ?? [],\n\t\t\t\townedItems: replaceOwnershipCategory(sidecar, 'caption', [\n\t\t\t\t\t{ itemId: asset.itemId, category: 'caption' as const }\n\t\t\t\t]),\n\t\t\t\tmedia: { ...sidecar.generationGraph?.media, captions: asset }"
    ),
    (
        "\t\t\t\tblocks: options.sidecar.generationGraph?.blocks ?? [],\n\t\t\t\tmedia: { ...options.sidecar.generationGraph?.media, music: asset }",
        "\t\t\t\tblocks: options.sidecar.generationGraph?.blocks ?? [],\n\t\t\t\townedItems: replaceOwnershipCategory(options.sidecar, 'music', [\n\t\t\t\t\t{ itemId: asset.itemId, category: 'music' as const }\n\t\t\t\t]),\n\t\t\t\tmedia: { ...options.sidecar.generationGraph?.media, music: asset }"
    )
])
