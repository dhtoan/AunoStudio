from pathlib import Path

# 1) Fix documentary ownership composition so motion, voice, and caption are all category-aware.
path = Path('apps/web/src/lib/auno/documentary/enrichment.ts')
text = path.read_text()
old = '''\tconst nextSidecar: AutoVideoSidecar = {\n\t\t...options.sidecar,\n\t\tgenerationVersion: options.sidecar.generationVersion + 1,\n\t\tupdatedAt: Date.now(),\n\t\tstoryboard: {\n\t\t\t...options.sidecar.storyboard,\n\t\t\ttargetDurationSeconds: generated.reduce((sum, entry) => sum + entry.duration, 0),\n\t\t\tscenes: options.sidecar.storyboard.scenes.map((scene) => {\n\t\t\t\tconst beat = beats.find((candidate) => candidate.id === scene.id);\n\t\t\t\treturn beat ? { ...scene, voice: beat.narration, durationSeconds: beat.durationSeconds } : scene;\n\t\t\t})\n\t\t},\n\t\tproviderManifest: { ...options.sidecar.providerManifest, voice: `${engine}:${voice}` },\n\t\tgenerationGraph: {\n\t\t\t...options.sidecar.generationGraph,\n\t\t\tversion: 1,\n\t\t\tblocks: options.sidecar.generationGraph?.blocks ?? [],\n\t\t\townedItems: replaceOwnershipCategory(\n\t\t\t\t{\n\t\t\t\t\t...options.sidecar,\n\t\t\t\t\tgenerationGraph: {\n\t\t\t\t\t\t...options.sidecar.generationGraph,\n\t\t\t\t\t\tversion: 1,\n\t\t\t\t\t\tblocks: options.sidecar.generationGraph?.blocks ?? [],\n\t\t\t\t\t\townedItems: replaceOwnershipCategory(options.sidecar, 'motion', applied.ownedItems.map((item) => ({ ...item, category: 'motion' as const })))\n\t\t\t\t\t}\n\t\t\t\t},\n\t\t\t\t'voice',\n\t\t\t\tassets.map((asset) => ({ itemId: asset.itemId, sceneId: asset.sceneId, category: 'voice' as const }))\n\t\t\t),\n\t\t\tmedia: { ...options.sidecar.generationGraph?.media, voices: assets, captions: caption },\n\t\t\tmotion: {\n\t\t\t\t...options.sidecar.generationGraph?.motion,\n\t\t\t\tschemaVersion: 1,\n\t\t\t\tstyle: DOCUMENTARY_STYLE,\n\t\t\t\tseed: graph.seed,\n\t\t\t\tbrief: graph.brief,\n\t\t\t\tcustomization\n\t\t\t}\n\t\t}\n\t};\n'''
new = '''\tconst withMotionOwnership: AutoVideoSidecar = {\n\t\t...options.sidecar,\n\t\tgenerationGraph: {\n\t\t\t...options.sidecar.generationGraph,\n\t\t\tversion: 1,\n\t\t\tblocks: options.sidecar.generationGraph?.blocks ?? [],\n\t\t\townedItems: replaceOwnershipCategory(\n\t\t\t\toptions.sidecar,\n\t\t\t\t'motion',\n\t\t\t\tapplied.ownedItems.map((item) => ({ ...item, category: 'motion' as const }))\n\t\t\t)\n\t\t}\n\t};\n\tconst withVoiceOwnership: AutoVideoSidecar = {\n\t\t...withMotionOwnership,\n\t\tgenerationGraph: {\n\t\t\t...withMotionOwnership.generationGraph!,\n\t\t\townedItems: replaceOwnershipCategory(\n\t\t\t\twithMotionOwnership,\n\t\t\t\t'voice',\n\t\t\t\tassets.map((asset) => ({ itemId: asset.itemId, sceneId: asset.sceneId, category: 'voice' as const }))\n\t\t\t)\n\t\t}\n\t};\n\tconst ownedItems = replaceOwnershipCategory(withVoiceOwnership, 'caption', [\n\t\t{ itemId: caption.itemId, category: 'caption' }\n\t]);\n\tconst nextSidecar: AutoVideoSidecar = {\n\t\t...options.sidecar,\n\t\tgenerationVersion: options.sidecar.generationVersion + 1,\n\t\tupdatedAt: Date.now(),\n\t\tstoryboard: {\n\t\t\t...options.sidecar.storyboard,\n\t\t\ttargetDurationSeconds: generated.reduce((sum, entry) => sum + entry.duration, 0),\n\t\t\tscenes: options.sidecar.storyboard.scenes.map((scene) => {\n\t\t\t\tconst beat = beats.find((candidate) => candidate.id === scene.id);\n\t\t\t\treturn beat ? { ...scene, voice: beat.narration, durationSeconds: beat.durationSeconds } : scene;\n\t\t\t})\n\t\t},\n\t\tproviderManifest: { ...options.sidecar.providerManifest, voice: `${engine}:${voice}` },\n\t\tgenerationGraph: {\n\t\t\t...options.sidecar.generationGraph,\n\t\t\tversion: 1,\n\t\t\tblocks: options.sidecar.generationGraph?.blocks ?? [],\n\t\t\townedItems,\n\t\t\tmedia: { ...options.sidecar.generationGraph?.media, voices: assets, captions: caption },\n\t\t\tmotion: {\n\t\t\t\t...options.sidecar.generationGraph?.motion,\n\t\t\t\tschemaVersion: 1,\n\t\t\t\tstyle: DOCUMENTARY_STYLE,\n\t\t\t\tseed: graph.seed,\n\t\t\t\tbrief: graph.brief,\n\t\t\t\tcustomization\n\t\t\t}\n\t\t}\n\t};\n'''
if old not in text:
    raise SystemExit('documentary sidecar ownership anchor missing')
text = text.replace(old, new, 1)
path.write_text(text)

# 2) Re-export the documentary enrichment seam from the existing Auto Video enrichment module.
path = Path('apps/web/src/lib/auno/auto-video/enrichment.ts')
text = path.read_text()
export_line = "export { generateDocumentaryVoice, narrationPackage, planVoiceChunks, redistributeBeatDurations } from '../documentary/enrichment';\n"
if export_line not in text:
    text = export_line + text
path.write_text(text)

# 3) Wire the native editor panel to durable documentary runs.
path = Path('apps/web/src/lib/video-editor/components/auno-auto-video-panel.svelte')
text = path.read_text()
text = text.replace(
'''\timport {\n\t\tloadAutoVideoSidecarRemote,\n\t\tsaveAutoVideoSidecarRemote\n\t} from '$lib/auno/auto-video/sidecar';\n''',
'''\timport {\n\t\tdocumentaryManifest,\n\t\tloadAutoVideoSidecarRemote,\n\t\tsaveAutoVideoSidecarRemote\n\t} from '$lib/auno/auto-video/sidecar';\n''',
1)
text = text.replace(
'''\t\tgenerateAutoVideoCaptions,\n\t\tgenerateAutoVideoMusic,\n\t\tgenerateAutoVideoVoices\n''',
'''\t\tgenerateAutoVideoCaptions,\n\t\tgenerateAutoVideoMusic,\n\t\tgenerateAutoVideoVoices,\n\t\tgenerateDocumentaryVoice\n''',
1)
api_import = "\timport { getDocumentaryRun, updateDocumentaryRun } from '$lib/auno/documentary/api';\n\timport type { DocumentaryRun } from '$lib/auno/documentary/types';\n"
anchor = "\timport { inspectMusicGenerationStorage } from '$lib/video-editor/local-ai/music/ace-step-service';\n"
if "getDocumentaryRun" not in text:
    if anchor not in text:
        raise SystemExit('panel import anchor missing')
    text = text.replace(anchor, anchor + api_import, 1)
state_anchor = "\tlet sidecar = $state<AutoVideoSidecar | null>(null);\n"
if "let documentaryRun" not in text:
    text = text.replace(state_anchor, state_anchor + "\tlet documentaryRun = $state<DocumentaryRun | null>(null);\n", 1)
derived_anchor = "\tconst workspaceId = $derived(workspaceCtx.currentWorkspace?.id?.trim() ?? '');\n"
if "const documentary = $derived" not in text:
    text = text.replace(derived_anchor, derived_anchor + "\tconst documentary = $derived(documentaryManifest(sidecar));\n", 1)
refresh_old = '''\t\t\tconst loaded = await loadAutoVideoSidecarRemote(workspaceId, projectId);\n\t\t\tsidecar = loaded;\n\t\t\tconst savedMotion = loaded?.generationGraph?.motion;\n'''
refresh_new = '''\t\t\tconst loaded = await loadAutoVideoSidecarRemote(workspaceId, projectId);\n\t\t\tsidecar = loaded;\n\t\t\tdocumentaryRun = null;\n\t\t\tconst manifest = documentaryManifest(loaded);\n\t\t\tif (manifest && workspaceId) {\n\t\t\t\ttry {\n\t\t\t\t\tdocumentaryRun = await getDocumentaryRun(workspaceId, manifest.runId);\n\t\t\t\t} catch (cause) {\n\t\t\t\t\tstatus = cause instanceof Error ? cause.message : String(cause);\n\t\t\t\t}\n\t\t\t}\n\t\t\tconst savedMotion = loaded?.generationGraph?.motion;\n'''
if refresh_old not in text:
    raise SystemExit('panel refresh anchor missing')
text = text.replace(refresh_old, refresh_new, 1)
voice_anchor = "\tasync function generateVoices(): Promise<void> {\n"
doc_voice = r'''	async function generateDocumentaryNarration(): Promise<boolean> {
		if (!sidecar || !documentary || !documentaryRun) return false;
		if (!workspaceId) {
			status = 'Select the workspace that owns this documentary run.';
			return true;
		}
		const result = await generateDocumentaryVoice({
			projectId,
			workspaceId,
			run: documentaryRun,
			sidecar,
			onProgress: (completed, total) => {
				voiceProgress = `${completed}/${total}`;
			}
		});
		if (result.narrationPackage) {
			status = `Local TTS is unavailable. Documentary remains editable with ${result.narrationPackage.chunks.length} bounded narration chunk(s) and voice-direction metadata.`;
			return true;
		}
		documentaryRun = await updateDocumentaryRun(workspaceId, result.run);
		await persistSidecar(result.sidecar);
		onautosave();
		status = `Generated ${result.assets.length} documentary voice chunk(s), reflowed beat timing from measured audio, regenerated Vox motion with the same seed, and rebuilt native captions.`;
		return true;
	}

'''
if 'async function generateDocumentaryNarration()' not in text:
    text = text.replace(voice_anchor, doc_voice + voice_anchor, 1)
voice_try = '''\t\ttry {\n\t\t\tconst result = await generateAutoVideoVoices({\n'''
voice_try_new = '''\t\ttry {\n\t\t\tif (await generateDocumentaryNarration()) return;\n\t\t\tconst result = await generateAutoVideoVoices({\n'''
if voice_try not in text:
    raise SystemExit('panel voice try anchor missing')
text = text.replace(voice_try, voice_try_new, 1)
caption_try = '''\t\ttry {\n\t\t\tconst result = generateAutoVideoCaptions(sidecar);\n'''
caption_try_new = '''\t\ttry {\n\t\t\tif (documentary) {\n\t\t\t\tstatus = hasCaptions\n\t\t\t\t\t? 'Documentary captions are already synchronized to the measured narration timing.'\n\t\t\t\t\t: 'Generate documentary voice first; captions are built from the approved narration after measured-duration reflow.';\n\t\t\t\treturn;\n\t\t\t}\n\t\t\tconst result = generateAutoVideoCaptions(sidecar);\n'''
if caption_try not in text:
    raise SystemExit('panel caption anchor missing')
text = text.replace(caption_try, caption_try_new, 1)
# Prevent short-form rewrite from treating documentary bridge scenes as authoritative generated narration.
rewrite_button = '''\t\t\t\t<Button type="button" size="sm" variant="outline" class="w-full" disabled={busyScene !== null || mediaBusy !== null} onclick={() => regenerate('all')}>\n\t\t\t\t\t{busyScene === 'all' ? 'Regenerating…' : 'Rewrite generated narration'}\n\t\t\t\t</Button>\n'''
rewrite_replacement = '''\t\t\t\t{#if !documentary}\n\t\t\t\t\t<Button type="button" size="sm" variant="outline" class="w-full" disabled={busyScene !== null || mediaBusy !== null} onclick={() => regenerate('all')}>\n\t\t\t\t\t\t{busyScene === 'all' ? 'Regenerating…' : 'Rewrite generated narration'}\n\t\t\t\t\t</Button>\n\t\t\t\t{:else}\n\t\t\t\t\t<div class="rounded-md border border-[var(--video-editor-border)] bg-[var(--video-editor-control)] p-2.5">\n\t\t\t\t\t\t<p class="text-[11px] font-medium text-[var(--video-editor-text)]">Documentary Long-form · Vox Style</p>\n\t\t\t\t\t\t<p class="mt-1 text-[10px] leading-relaxed text-[var(--video-editor-muted)]">Narration edits stay in the durable Documentary run. Voice generation uses bounded ≤25s chunks, then reflows beats, motion, and captions from measured audio duration.</p>\n\t\t\t\t\t</div>\n\t\t\t\t{/if}\n'''
if rewrite_button not in text:
    raise SystemExit('panel rewrite button anchor missing')
text = text.replace(rewrite_button, rewrite_replacement, 1)
# Hide per-scene short-form regenerate cards for documentary projects.
scene_block = '''\t\t\t\t<div class="space-y-2">\n\t\t\t\t\t{#each sidecar.storyboard.scenes as scene, index (scene.id)}\n'''
scene_block_new = '''\t\t\t\t{#if !documentary}\n\t\t\t\t<div class="space-y-2">\n\t\t\t\t\t{#each sidecar.storyboard.scenes as scene, index (scene.id)}\n'''
if scene_block not in text:
    raise SystemExit('panel scene block anchor missing')
text = text.replace(scene_block, scene_block_new, 1)
scene_end = '''\t\t\t\t\t{/each}\n\t\t\t\t</div>\n\n\t\t\t\t{#if status}\n'''
scene_end_new = '''\t\t\t\t\t{/each}\n\t\t\t\t</div>\n\t\t\t\t{/if}\n\n\t\t\t\t{#if status}\n'''
if scene_end not in text:
    raise SystemExit('panel scene end anchor missing')
text = text.replace(scene_end, scene_end_new, 1)
# Clarify voice button for documentary mode.
old_voice_label = "{mediaBusy === 'voice' ? `Voice ${voiceProgress}` : voiceCount > 0 ? `Voice · ${voiceCount}` : 'Voice'}"
new_voice_label = "{mediaBusy === 'voice' ? `Voice ${voiceProgress}` : documentary ? (voiceCount > 0 ? `Doc voice · ${voiceCount}` : 'Doc voice + captions') : voiceCount > 0 ? `Voice · ${voiceCount}` : 'Voice'}"
if old_voice_label not in text:
    raise SystemExit('panel voice label anchor missing')
text = text.replace(old_voice_label, new_voice_label, 1)
path.write_text(text)
