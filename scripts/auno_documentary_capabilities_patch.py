from pathlib import Path

# Backend capability response: expose only factual configured capabilities.
path = Path('apps/server/internal/api/handlers/auto_video.go')
text = path.read_text()
old = '''\t\tLocalStoryboardFallback  bool   `json:"local_storyboard_fallback"`\n\t\tBrowserTTS               bool   `json:"browser_tts"`\n\t\tBrowserTranscription     bool   `json:"browser_transcription"`\n\t\tBrowserMusicGeneration   bool   `json:"browser_music_generation"`\n'''
new = '''\t\tLocalStoryboardFallback             bool   `json:"local_storyboard_fallback"`\n\t\tBrowserTTS                          bool   `json:"browser_tts"`\n\t\tBrowserTranscription                bool   `json:"browser_transcription"`\n\t\tBrowserMusicGeneration              bool   `json:"browser_music_generation"`\n\t\tDocumentaryPlannerAvailable         bool   `json:"documentary_planner_available"`\n\t\tDocumentaryServerImageGeneration   bool   `json:"documentary_server_image_generation"`\n\t\tDocumentaryServerVideoGeneration   bool   `json:"documentary_server_video_generation"`\n'''
if old not in text:
    raise SystemExit('capability struct anchor missing')
text = text.replace(old, new, 1)
old_assign = '''\toutput.Body.LocalStoryboardFallback = true\n\toutput.Body.BrowserTTS = true\n\toutput.Body.BrowserTranscription = true\n\toutput.Body.BrowserMusicGeneration = true\n'''
new_assign = '''\toutput.Body.LocalStoryboardFallback = true\n\toutput.Body.BrowserTTS = true\n\toutput.Body.BrowserTranscription = true\n\toutput.Body.BrowserMusicGeneration = true\n\toutput.Body.DocumentaryPlannerAvailable = h.planner != nil\n\t// No server image/video generator is registered in the current Auno runtime.\n\t// Keep these false until a concrete adapter owns generation and media import.\n\toutput.Body.DocumentaryServerImageGeneration = false\n\toutput.Body.DocumentaryServerVideoGeneration = false\n'''
if old_assign not in text:
    raise SystemExit('capability assignment anchor missing')
text = text.replace(old_assign, new_assign, 1)
path.write_text(text)

# Browser wizard: load and display degraded capability level/actions.
path = Path('apps/web/src/lib/components/auno-documentary/documentary-wizard.svelte')
text = path.read_text()
if "import { onMount } from 'svelte';" not in text:
    text = text.replace("\timport { resolveAppPath } from '$lib/app-path';\n", "\timport { resolveAppPath } from '$lib/app-path';\n\timport { onMount } from 'svelte';\n", 1)
cap_import = '''\timport {\n\t\tdocumentaryCapabilityLevel,\n\t\tdocumentaryNextActions,\n\t\tloadDocumentaryCapabilities,\n\t\ttype DocumentaryCapabilities\n\t} from '$lib/auno/documentary/capabilities';\n'''
anchor = "\timport { createCloudDocumentaryProject } from '$lib/auno/documentary/project-handoff';\n"
if "documentaryCapabilityLevel" not in text:
    if anchor not in text:
        raise SystemExit('wizard capability import anchor missing')
    text = text.replace(anchor, anchor + cap_import, 1)
state_anchor = "\tlet resumeRunId = $state('');\n"
state = '''\tlet resumeRunId = $state('');\n\tlet capabilityLoading = $state(true);\n\tlet capabilities = $state<DocumentaryCapabilities>({\n\t\tdocumentaryPlanner: false,\n\t\tbrowserTTS: false,\n\t\tbrowserMusic: false,\n\t\tserverImageGeneration: false,\n\t\tserverVideoGeneration: false\n\t});\n\tconst capabilityLevel = $derived(documentaryCapabilityLevel(capabilities));\n\tconst nextActions = $derived(documentaryNextActions(capabilities, run));\n'''
if "let capabilityLoading" not in text:
    if state_anchor not in text:
        raise SystemExit('wizard capability state anchor missing')
    text = text.replace(state_anchor, state, 1)
script_end = '''\tasync function uploadSourceFile(event: Event): Promise<void> {\n'''
# Load capability once per wizard mount; failure intentionally degrades to text-only.
on_mount = r'''	onMount(() => {
		void (async () => {
			capabilityLoading = true;
			try {
				capabilities = await loadDocumentaryCapabilities();
			} catch {
				// A failed capability probe must not hide the text-only documentary workflow.
			} finally {
				capabilityLoading = false;
			}
		})();
	});

'''
if 'capabilityLoading = true;' not in text[text.find('async function uploadSourceFile'):]:
    # place before uploadSourceFile to avoid touching function bodies
    if script_end not in text:
        raise SystemExit('wizard onMount anchor missing')
    text = text.replace(script_end, on_mount + script_end, 1)
header_end = '''\t</div>\n\n\t{#if error}<InlineNotice tone="error">{error}</InlineNotice>{/if}\n'''
cap_card = '''\t</div>\n\n\t<div class="rounded-lg border bg-muted/20 p-3">\n\t\t<div class="flex flex-wrap items-center justify-between gap-2">\n\t\t\t<div>\n\t\t\t\t<p class="text-xs font-medium">Media capability</p>\n\t\t\t\t<p class="mt-0.5 text-[11px] text-muted-foreground">{capabilityLoading ? 'Checking available adapters…' : capabilityLevel}</p>\n\t\t\t</div>\n\t\t\t<div class="flex flex-wrap gap-1.5">\n\t\t\t\t{#each nextActions as action (action.id)}\n\t\t\t\t\t<span class={`rounded-full border px-2 py-1 text-[10px] ${action.available ? 'bg-background text-foreground' : 'bg-muted/40 text-muted-foreground opacity-60'}`} title={action.reason ?? action.label}>\n\t\t\t\t\t\t{action.available ? '✓' : '–'} {action.label}\n\t\t\t\t\t</span>\n\t\t\t\t{/each}\n\t\t\t</div>\n\t\t</div>\n\t\t{#if capabilityLevel === 'text-only'}\n\t\t\t<p class="mt-2 text-[11px] leading-relaxed text-muted-foreground">Optional media providers are unavailable. Prompt-pack export, editable paper placeholders, manual Media Library assignment, and native project creation remain available.</p>\n\t\t{/if}\n\t</div>\n\n\t{#if error}<InlineNotice tone="error">{error}</InlineNotice>{/if}\n'''
if 'Media capability' not in text:
    if header_end not in text:
        raise SystemExit('wizard capability card anchor missing')
    text = text.replace(header_end, cap_card, 1)
path.write_text(text)
