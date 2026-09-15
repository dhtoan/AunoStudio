from pathlib import Path

handler = Path('apps/server/internal/api/handlers/auto_video_documentary.go')
text = handler.read_text()
type_anchor = '''type GenerateDocumentaryStepInput struct {
\tPathID string `path:"run_id" doc:"Documentary run ID"`
\tBody   struct {
\t\tWorkspaceID       string `json:"workspace_id" required:"true" minLength:"1"`
\t\tGenerationVersion int64  `json:"generation_version" required:"true" minimum:"1"`
\t}
}
'''
type_insert = type_anchor + '''
type GenerateDocumentaryVisualStepInput struct {
\tPathID     string `path:"run_id" doc:"Documentary run ID"`
\tPathBeatID string `path:"beat_id" doc:"Documentary beat ID"`
\tBody       struct {
\t\tWorkspaceID       string `json:"workspace_id" required:"true" minLength:"1"`
\t\tGenerationVersion int64  `json:"generation_version" required:"true" minimum:"1"`
\t}
}
'''
if 'type GenerateDocumentaryVisualStepInput' not in text:
    if type_anchor not in text:
        raise SystemExit('documentary step type anchor missing')
    text = text.replace(type_anchor, type_insert, 1)
route_anchor = '\thuma.Register(api, documentaryOperation("generate-auno-documentary-visuals", http.MethodPost, "/auno/auto-video/documentary/runs/{run_id}/visuals", "Generate documentary visual plans", auth), h.generateVisuals)\n'
route_insert = route_anchor + '\thuma.Register(api, documentaryOperation("regenerate-auno-documentary-beat-visual", http.MethodPost, "/auno/auto-video/documentary/runs/{run_id}/visuals/{beat_id}", "Regenerate one documentary beat visual", auth), h.regenerateVisual)\n'
if 'regenerate-auno-documentary-beat-visual' not in text:
    if route_anchor not in text:
        raise SystemExit('selective visual route anchor missing')
    text = text.replace(route_anchor, route_insert, 1)
handler.write_text(text)

generation = Path('apps/server/internal/api/handlers/auto_video_documentary_generation.go')
text = generation.read_text()
visual_anchor = 'func (h *DocumentaryHandler) generateThumbnails(ctx context.Context, input *GenerateDocumentaryStepInput) (*DocumentaryRunOutput, error) {\n'
selective = '''func (h *DocumentaryHandler) regenerateVisual(ctx context.Context, input *GenerateDocumentaryVisualStepInput) (*DocumentaryRunOutput, error) {
\tstepInput := &GenerateDocumentaryStepInput{PathID: input.PathID}
\tstepInput.Body.WorkspaceID = input.Body.WorkspaceID
\tstepInput.Body.GenerationVersion = input.Body.GenerationVersion
\trun, err := h.generationRun(ctx, stepInput, true)
\tif err != nil {
\t\treturn nil, err
\t}
\tbeatIndex := -1
\tfor index := range run.Beats {
\t\tif run.Beats[index].ID == input.PathBeatID {
\t\t\tbeatIndex = index
\t\t\tbreak
\t\t}
\t}
\tif beatIndex < 0 {
\t\treturn nil, huma.Error404NotFound("documentary beat was not found")
\t}
\tsource, parts, err := h.sourceForPlanning(ctx, input.Body.WorkspaceID, run.Source)
\tif err != nil {
\t\treturn nil, err
\t}
\tresult, err := h.planner.GenerateVisuals(ctx, documentary.VisualsInput{
\t\tRunID: run.ID, Language: run.Language, Beats: []documentary.Beat{run.Beats[beatIndex]}, Source: source, Parts: parts,
\t})
\tif err != nil {
\t\treturn nil, documentaryPlannerHTTPError(err)
\t}
\tif len(result.Plans) != 1 {
\t\treturn nil, documentaryPlannerHTTPError(documentary.ErrInvalidResponse)
\t}
\tplan := result.Plans[0]
\treplaced := false
\tfor index := range run.VisualPlans {
\t\tif run.VisualPlans[index].BeatID == plan.BeatID {
\t\t\trun.VisualPlans[index] = plan
\t\t\treplaced = true
\t\t\tbreak
\t\t}
\t}
\tif !replaced {
\t\trun.VisualPlans = append(run.VisualPlans, plan)
\t}
\trun.Beats[beatIndex].VisualIntent = plan.VisualIntent
\trun.Beats[beatIndex].RequiredSubjectIDs = append([]string(nil), plan.RequiredSubjectIDs...)
\trun.CurrentStep = documentary.StepVisuals
\tsetDocumentaryProvider(run, "visuals", result.Model)
\treturn h.persistGeneration(ctx, stepInput, run)
}

'''
if 'func (h *DocumentaryHandler) regenerateVisual' not in text:
    if visual_anchor not in text:
        raise SystemExit('generation selective visual anchor missing')
    text = text.replace(visual_anchor, selective + visual_anchor, 1)
generation.write_text(text)

api = Path('apps/web/src/lib/auno/documentary/api.ts')
text = api.read_text()
api_anchor = "export const generateDocumentaryVisuals = (workspaceId: string, run: DocumentaryRun) =>\n\tgenerateStep(workspaceId, run, 'visuals');\n"
api_insert = api_anchor + '''export async function regenerateDocumentaryVisual(
\tworkspaceId: string,
\trun: DocumentaryRun,
\tbeatId: string
): Promise<DocumentaryRun> {
\tconst response = await fetch(
\t\t`/api/v1/auno/auto-video/documentary/runs/${encodeURIComponent(run.id)}/visuals/${encodeURIComponent(beatId)}`,
\t\t{
\t\t\tmethod: 'POST',
\t\t\tcredentials: 'include',
\t\t\theaders: requestHeaders(),
\t\t\tbody: JSON.stringify({ workspace_id: workspaceId, generation_version: run.generationVersion })
\t\t}
\t);
\treturn readRun(response, 'Regenerating documentary beat visual');
}
'''
if 'regenerateDocumentaryVisual(' not in text:
    if api_anchor not in text:
        raise SystemExit('documentary API visual anchor missing')
    text = text.replace(api_anchor, api_insert, 1)
api.write_text(text)

wizard = Path('apps/web/src/lib/components/auno-documentary/documentary-wizard.svelte')
text = wizard.read_text()
import_anchor = '\t\tgenerateDocumentaryVisuals,\n'
if 'regenerateDocumentaryVisual,' not in text:
    if import_anchor not in text:
        raise SystemExit('wizard API import anchor missing')
    text = text.replace(import_anchor, import_anchor + '\t\tregenerateDocumentaryVisual,\n', 1)
component_anchor = "\timport DocumentaryIdeas from './documentary-ideas.svelte';\n"
if "documentary-beat-editor.svelte" not in text:
    if component_anchor not in text:
        raise SystemExit('beat editor import anchor missing')
    text = text.replace(component_anchor, component_anchor + "\timport DocumentaryBeatEditor from './documentary-beat-editor.svelte';\n", 1)
function_anchor = '\tasync function generateVisuals(): Promise<void> {\n'
edit_functions = '''\tasync function saveBeats(beats: DocumentaryRun['beats']): Promise<void> {
\t\tawait saveRun('beat-edit', (next) => {
\t\t\tnext.beats = beats;
\t\t\tnext.currentStep = 'beats';
\t\t});
\t}

\tasync function saveVisualPlans(plans: DocumentaryRun['visualPlans']): Promise<void> {
\t\tawait saveRun('visual-edit', (next) => {
\t\t\tnext.visualPlans = plans;
\t\t\tnext.currentStep = 'visuals';
\t\t});
\t}

\tasync function regenerateBeatVisual(beatId: string): Promise<void> {
\t\tif (!run) return;
\t\terror = '';
\t\tbusyAction = `visual:${beatId}`;
\t\ttry {
\t\t\trun = await regenerateDocumentaryVisual(workspaceId(), run, beatId);
\t\t} catch (cause) {
\t\t\tsetFailure(cause);
\t\t} finally {
\t\t\tbusyAction = '';
\t\t}
\t}

'''
if 'async function saveBeats(' not in text:
    if function_anchor not in text:
        raise SystemExit('wizard edit function anchor missing')
    text = text.replace(function_anchor, edit_functions + function_anchor, 1)
old_beats = '''\t\t\t\t\t{#if run.beats.length > 0}
\t\t\t\t\t\t<div class="max-h-[36rem] space-y-2 overflow-y-auto pr-1">
\t\t\t\t\t\t\t{#each run.beats as beat (beat.id)}
\t\t\t\t\t\t\t\t<div class="grid gap-2 rounded-lg border bg-muted/20 p-3 sm:grid-cols-[5rem_1fr_9rem]">
\t\t\t\t\t\t\t\t\t<span class="text-xs text-muted-foreground">{beat.startSeconds.toFixed(1)}–{(beat.startSeconds + beat.durationSeconds).toFixed(1)}s</span>
\t\t\t\t\t\t\t\t\t<span class="text-sm">{beat.narration}</span>
\t\t\t\t\t\t\t\t\t<span class="text-xs text-muted-foreground sm:text-right">{beat.visualIntent}</span>
\t\t\t\t\t\t\t\t</div>
\t\t\t\t\t\t\t{/each}
\t\t\t\t\t\t</div>
\t\t\t\t\t{/if}
'''
new_beats = '''\t\t\t\t\t{#if run.beats.length > 0}
\t\t\t\t\t\t<DocumentaryBeatEditor
\t\t\t\t\t\t\tbeats={run.beats}
\t\t\t\t\t\t\tvisualPlans={run.visualPlans}
\t\t\t\t\t\t\tdisabled={busyAction !== ''}
\t\t\t\t\t\t\tonchange={saveBeats}
\t\t\t\t\t\t\tonvisualchange={saveVisualPlans}
\t\t\t\t\t\t\tonregeneratevisual={run.visualPlans.length > 0 ? regenerateBeatVisual : undefined}
\t\t\t\t\t\t/>
\t\t\t\t\t{/if}
'''
if '<DocumentaryBeatEditor' not in text:
    if old_beats not in text:
        raise SystemExit('wizard beats markup anchor missing')
    text = text.replace(old_beats, new_beats, 1)
wizard.write_text(text)
