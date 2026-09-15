package handlers

import (
	"context"
	"strings"
	"time"

	"github.com/danielgtaylor/huma/v2"
	"github.com/openpost/backend/internal/api/middleware"
	"github.com/openpost/backend/internal/services/documentary"
)

func (h *DocumentaryHandler) generateIdeas(ctx context.Context, input *GenerateDocumentaryStepInput) (*DocumentaryRunOutput, error) {
	run, err := h.generationRun(ctx, input, true)
	if err != nil {
		return nil, err
	}
	source, parts, err := h.sourceForPlanning(ctx, input.Body.WorkspaceID, run.Source)
	if err != nil {
		return nil, err
	}
	result, err := h.planner.GenerateIdeas(ctx, documentary.IdeasInput{
		RunID: run.ID, Language: run.Language, Niche: run.Niche, CustomTopic: run.CustomTopic, Source: source, Parts: parts,
	})
	if err != nil {
		return nil, documentaryPlannerHTTPError(err)
	}
	documentary.InvalidateFrom(run, documentary.StepIdeas)
	run.Ideas = result.Ideas
	run.SelectedIdeaID = ""
	run.CurrentStep = documentary.StepIdeas
	markDocumentaryStep(run, documentary.StepIdeas, documentary.Fingerprint(run.Niche, run.CustomTopic, documentarySourceFingerprint(run.Source)))
	setDocumentaryProvider(run, "ideas", result.Model)
	return h.persistGeneration(ctx, input, run)
}

func (h *DocumentaryHandler) generateScript(ctx context.Context, input *GenerateDocumentaryStepInput) (*DocumentaryRunOutput, error) {
	run, err := h.generationRun(ctx, input, true)
	if err != nil {
		return nil, err
	}
	if err := documentary.ValidateDuration(run.TargetDurationSeconds); err != nil {
		return nil, documentaryHTTPError(err)
	}
	idea := selectedDocumentaryIdea(run)
	if idea == nil && strings.TrimSpace(run.CustomTopic) == "" {
		return nil, huma.Error400BadRequest("select a documentary idea or provide a custom topic first")
	}
	source, parts, err := h.sourceForPlanning(ctx, input.Body.WorkspaceID, run.Source)
	if err != nil {
		return nil, err
	}
	result, err := h.planner.GenerateScript(ctx, documentary.ScriptInput{
		RunID: run.ID, Language: run.Language, Idea: idea, CustomTopic: run.CustomTopic,
		TargetDurationSeconds: run.TargetDurationSeconds, Source: source, Parts: parts,
	})
	if err != nil {
		return nil, documentaryPlannerHTTPError(err)
	}
	documentary.InvalidateFrom(run, documentary.StepScript)
	run.Script = &result.Script
	run.CurrentStep = documentary.StepScript
	markDocumentaryStep(run, documentary.StepScript, result.Script.Fingerprint)
	setDocumentaryProvider(run, "script", result.Model)
	return h.persistGeneration(ctx, input, run)
}

func (h *DocumentaryHandler) generateBeats(ctx context.Context, input *GenerateDocumentaryStepInput) (*DocumentaryRunOutput, error) {
	run, err := h.generationRun(ctx, input, false)
	if err != nil {
		return nil, err
	}
	if run.Script == nil {
		return nil, huma.Error400BadRequest("generate or enter a documentary script first")
	}
	var result documentary.BeatsResult
	if h.planner != nil {
		result, err = h.planner.GenerateBeats(ctx, documentary.BeatsInput{
			RunID: run.ID, Script: *run.Script, TargetDurationSeconds: run.TargetDurationSeconds,
		})
	} else {
		var beats []documentary.Beat
		beats, err = documentary.SegmentBeats(run.ID, *run.Script, run.TargetDurationSeconds)
		result = documentary.BeatsResult{Beats: beats, Model: "deterministic:documentary-beats-v1"}
	}
	if err != nil {
		return nil, documentaryPlannerHTTPError(err)
	}
	documentary.InvalidateFrom(run, documentary.StepBeats)
	run.Beats = result.Beats
	run.CurrentStep = documentary.StepBeats
	markDocumentaryStep(run, documentary.StepBeats, documentary.Fingerprint(run.Script.Fingerprint, strings.Join(documentaryBeatIDs(run.Beats), ",")))
	setDocumentaryProvider(run, "beats", result.Model)
	return h.persistGeneration(ctx, input, run)
}

func (h *DocumentaryHandler) generateVisuals(ctx context.Context, input *GenerateDocumentaryStepInput) (*DocumentaryRunOutput, error) {
	run, err := h.generationRun(ctx, input, true)
	if err != nil {
		return nil, err
	}
	if len(run.Beats) == 0 {
		return nil, huma.Error400BadRequest("generate documentary beats first")
	}
	source, parts, err := h.sourceForPlanning(ctx, input.Body.WorkspaceID, run.Source)
	if err != nil {
		return nil, err
	}
	result, err := h.planner.GenerateVisuals(ctx, documentary.VisualsInput{
		RunID: run.ID, Language: run.Language, Beats: run.Beats, Source: source, Parts: parts,
	})
	if err != nil {
		return nil, documentaryPlannerHTTPError(err)
	}
	documentary.InvalidateFrom(run, documentary.StepVisuals)
	run.VisualPlans = result.Plans
	planByBeat := make(map[string]documentary.VisualPlan, len(result.Plans))
	for _, plan := range result.Plans {
		planByBeat[plan.BeatID] = plan
	}
	for index := range run.Beats {
		if plan, ok := planByBeat[run.Beats[index].ID]; ok {
			run.Beats[index].VisualIntent = plan.VisualIntent
			run.Beats[index].RequiredSubjectIDs = append([]string(nil), plan.RequiredSubjectIDs...)
		}
	}
	run.CurrentStep = documentary.StepVisuals
	markDocumentaryStep(run, documentary.StepVisuals, documentary.Fingerprint(strings.Join(documentaryVisualFingerprints(result.Plans), ",")))
	setDocumentaryProvider(run, "visuals", result.Model)
	return h.persistGeneration(ctx, input, run)
}

func (h *DocumentaryHandler) regenerateVisual(ctx context.Context, input *GenerateDocumentaryVisualStepInput) (*DocumentaryRunOutput, error) {
	stepInput := &GenerateDocumentaryStepInput{PathID: input.PathID}
	stepInput.Body.WorkspaceID = input.Body.WorkspaceID
	stepInput.Body.GenerationVersion = input.Body.GenerationVersion
	run, err := h.generationRun(ctx, stepInput, true)
	if err != nil {
		return nil, err
	}
	beatIndex := -1
	for index := range run.Beats {
		if run.Beats[index].ID == input.PathBeatID {
			beatIndex = index
			break
		}
	}
	if beatIndex < 0 {
		return nil, huma.Error404NotFound("documentary beat was not found")
	}
	source, parts, err := h.sourceForPlanning(ctx, input.Body.WorkspaceID, run.Source)
	if err != nil {
		return nil, err
	}
	result, err := h.planner.GenerateVisuals(ctx, documentary.VisualsInput{
		RunID: run.ID, Language: run.Language, Beats: []documentary.Beat{run.Beats[beatIndex]}, Source: source, Parts: parts,
	})
	if err != nil {
		return nil, documentaryPlannerHTTPError(err)
	}
	if len(result.Plans) != 1 {
		return nil, documentaryPlannerHTTPError(documentary.ErrInvalidResponse)
	}
	plan := result.Plans[0]
	replaced := false
	for index := range run.VisualPlans {
		if run.VisualPlans[index].BeatID == plan.BeatID {
			run.VisualPlans[index] = plan
			replaced = true
			break
		}
	}
	if !replaced {
		run.VisualPlans = append(run.VisualPlans, plan)
	}
	run.Beats[beatIndex].VisualIntent = plan.VisualIntent
	run.Beats[beatIndex].RequiredSubjectIDs = append([]string(nil), plan.RequiredSubjectIDs...)
	run.CurrentStep = documentary.StepVisuals
	setDocumentaryProvider(run, "visuals", result.Model)
	return h.persistGeneration(ctx, stepInput, run)
}

func (h *DocumentaryHandler) generateThumbnails(ctx context.Context, input *GenerateDocumentaryStepInput) (*DocumentaryRunOutput, error) {
	run, err := h.generationRun(ctx, input, true)
	if err != nil {
		return nil, err
	}
	if run.Script == nil {
		return nil, huma.Error400BadRequest("generate or enter a documentary script first")
	}
	source, parts, err := h.sourceForPlanning(ctx, input.Body.WorkspaceID, run.Source)
	if err != nil {
		return nil, err
	}
	title := run.CustomTopic
	if idea := selectedDocumentaryIdea(run); idea != nil {
		title = idea.Title
	}
	result, err := h.planner.GenerateThumbnails(ctx, documentary.ThumbnailsInput{
		RunID: run.ID, Language: run.Language, Title: title, Script: *run.Script, Source: source, Parts: parts,
	})
	if err != nil {
		return nil, documentaryPlannerHTTPError(err)
	}
	run.Thumbnails = result.Plans
	run.CurrentStep = documentary.StepThumbnails
	markDocumentaryStep(run, documentary.StepThumbnails, documentary.Fingerprint(run.Script.Fingerprint, title))
	setDocumentaryProvider(run, "thumbnails", result.Model)
	return h.persistGeneration(ctx, input, run)
}

func (h *DocumentaryHandler) generationRun(
	ctx context.Context,
	input *GenerateDocumentaryStepInput,
	requirePlanner bool,
) (*documentary.Run, error) {
	if err := h.checkEdit(ctx, input.Body.WorkspaceID); err != nil {
		return nil, err
	}
	if requirePlanner && h.planner == nil {
		return nil, huma.Error503ServiceUnavailable("Documentary planning is not configured")
	}
	userID := middleware.GetUserID(ctx)
	if !h.limiter.Allow("auno-documentary:"+userID, documentaryRequestsPerMinute, time.Minute) {
		return nil, huma.Error429TooManyRequests("Documentary planning limit reached; try again in one minute")
	}
	run, err := h.store.Get(ctx, input.Body.WorkspaceID, input.PathID)
	if err != nil {
		return nil, documentaryHTTPError(err)
	}
	if run.GenerationVersion != input.Body.GenerationVersion {
		return nil, documentaryHTTPError(documentary.ErrConflict)
	}
	return run, nil
}

func (h *DocumentaryHandler) persistGeneration(
	ctx context.Context,
	input *GenerateDocumentaryStepInput,
	run *documentary.Run,
) (*DocumentaryRunOutput, error) {
	updated, err := h.store.Upsert(ctx, input.Body.WorkspaceID, *run, input.Body.GenerationVersion)
	if err != nil {
		return nil, documentaryHTTPError(err)
	}
	return &DocumentaryRunOutput{Body: *updated}, nil
}
