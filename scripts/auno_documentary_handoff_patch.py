from pathlib import Path

# Server: link a durable run to one native project, once.
path = Path('apps/server/internal/api/handlers/auto_video_documentary.go')
text = path.read_text()
anchor = '''\tnext := *current\n\tpatch := input.Body.Run\n'''
insert = anchor + '''\tif projectID := strings.TrimSpace(patch.ProjectID); projectID != "" && projectID != current.ProjectID {\n\t\tif strings.TrimSpace(current.ProjectID) != "" {\n\t\t\treturn nil, huma.Error400BadRequest("documentary run is already linked to another project")\n\t\t}\n\t\tnext.ProjectID = projectID\n\t}\n'''
if 'documentary run is already linked to another project' not in text:
    if anchor not in text:
        raise SystemExit('server project link anchor missing')
    text = text.replace(anchor, insert, 1)
path.write_text(text)

# Browser wizard: create/open native cloud project.
path = Path('apps/web/src/lib/components/auno-documentary/documentary-wizard.svelte')
text = path.read_text()
script_anchor = '<script lang="ts">\n'
imports = '''\timport { goto } from '$app/navigation';\n\timport { resolveAppPath } from '$lib/app-path';\n'''
if "from '$app/navigation'" not in text:
    text = text.replace(script_anchor, script_anchor + imports, 1)
project_import_anchor = "\timport { cloneDocumentaryRun } from '$lib/auno/documentary/state';\n"
project_import = project_import_anchor + "\timport { createCloudDocumentaryProject } from '$lib/auno/documentary/project-handoff';\n"
if "documentary/project-handoff" not in text:
    if project_import_anchor not in text:
        raise SystemExit('wizard project import anchor missing')
    text = text.replace(project_import_anchor, project_import, 1)
function_anchor = '''\tasync function loadMediaLibrary(): Promise<void> {\n'''
function = r'''	async function createOrOpenProject(): Promise<void> {
		if (!run) return;
		const currentWorkspaceId = workspaceId();
		if (!currentWorkspaceId) {
			error = 'Select the workspace that owns this documentary run.';
			return;
		}
		if (run.projectId) {
			await goto(resolveAppPath(`/video-editor/${run.projectId}?storage=cloud&auno=documentary&documentary_run=${encodeURIComponent(run.id)}`));
			return;
		}
		error = '';
		busyAction = 'project';
		try {
			const handoff = await createCloudDocumentaryProject(currentWorkspaceId, run);
			const updated = await saveRun('project-link', (next) => {
				next.projectId = handoff.projectId;
				next.currentStep = 'project';
			});
			if (!updated) return;
			if (handoff.missingMediaIds.length > 0) {
				console.info(`Auno Documentary used editable placeholders for ${handoff.missingMediaIds.length} unresolved media asset(s).`);
			}
			await goto(resolveAppPath(`/video-editor/${handoff.projectId}?storage=cloud&auno=documentary&documentary_run=${encodeURIComponent(updated.id)}`));
		} catch (cause) {
			setFailure(cause);
		} finally {
			busyAction = '';
		}
	}

'''
if 'async function createOrOpenProject()' not in text:
    if function_anchor not in text:
        raise SystemExit('wizard project function anchor missing')
    text = text.replace(function_anchor, function + function_anchor, 1)
old_markup = '''\t\t\t{:else if activeStep === 'project'}\n\t\t\t\t<div class="space-y-3 rounded-lg border p-4">\n\t\t\t\t\t<h3 class="font-semibold">Native Video Editor handoff</h3>\n\t\t\t\t\t<p class="text-sm text-muted-foreground">The durable planning run is ready for the native documentary compiler. Project creation stays disabled until the Vox Motion Style and native beat compiler are wired in the next implementation tasks.</p>\n\t\t\t\t\t<Button type="button" disabled>Open in Video Editor</Button>\n\t\t\t\t</div>\n'''
new_markup = '''\t\t\t{:else if activeStep === 'project'}\n\t\t\t\t<div class="space-y-4 rounded-lg border p-4">\n\t\t\t\t\t<div>\n\t\t\t\t\t\t<h3 class="font-semibold">Native Video Editor handoff</h3>\n\t\t\t\t\t\t<p class="mt-1 text-sm text-muted-foreground">Compile every documentary beat into an editable 1920×1080 OpenPost project. Assigned Media Library images/videos remain native media clips; unresolved visuals stay editable paper placeholders.</p>\n\t\t\t\t\t</div>\n\t\t\t\t\t<div class="grid gap-2 text-xs text-muted-foreground sm:grid-cols-3">\n\t\t\t\t\t\t<div class="rounded-md bg-muted/30 p-3"><strong class="block text-foreground">{run.beats.length}</strong> native beats</div>\n\t\t\t\t\t\t<div class="rounded-md bg-muted/30 p-3"><strong class="block text-foreground">{run.visualPlans.filter((plan) => plan.mediaId).length}</strong> assigned media</div>\n\t\t\t\t\t\t<div class="rounded-md bg-muted/30 p-3"><strong class="block text-foreground">Vox Style</strong> editable motion</div>\n\t\t\t\t\t</div>\n\t\t\t\t\t{#if run.projectId}\n\t\t\t\t\t\t<InlineNotice tone="success">Native project linked: {run.projectId}</InlineNotice>\n\t\t\t\t\t{/if}\n\t\t\t\t\t<Button type="button" disabled={busyAction !== '' || run.beats.length === 0} onclick={createOrOpenProject}>\n\t\t\t\t\t\t{busyAction === 'project' || busyAction === 'project-link' ? 'Creating native project…' : run.projectId ? 'Open in Video Editor' : 'Create & open in Video Editor'}\n\t\t\t\t\t</Button>\n\t\t\t\t</div>\n'''
if 'Project creation stays disabled until the Vox Motion Style' in text:
    if old_markup not in text:
        raise SystemExit('wizard project markup anchor missing')
    text = text.replace(old_markup, new_markup, 1)
path.write_text(text)
