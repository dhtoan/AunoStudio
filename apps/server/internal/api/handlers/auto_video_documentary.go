package handlers

import (
	"context"
	"errors"
	"log"
	"net/http"
	"reflect"
	"strings"
	"time"

	"github.com/danielgtaylor/huma/v2"
	"github.com/openpost/backend/internal/ai"
	"github.com/openpost/backend/internal/api/middleware"
	"github.com/openpost/backend/internal/services/autovideo"
	"github.com/openpost/backend/internal/services/documentary"
	"github.com/openpost/backend/internal/services/mediastore"
	"github.com/openpost/backend/internal/services/ratelimit"
	"github.com/openpost/backend/internal/services/sourcecontext"
	"github.com/uptrace/bun"
)

const documentaryRequestsPerMinute = 10

type DocumentaryHandler struct {
	db           *bun.DB
	auth         middleware.Authenticator
	planner      documentary.Planner
	store        *documentary.Store
	storage      mediastore.BlobStorage
	sourceLoader sourcecontext.Loader
	limiter      *ratelimit.Limiter
}

func NewDocumentaryHandler(
	db *bun.DB,
	auth middleware.Authenticator,
	planner documentary.Planner,
	storage mediastore.BlobStorage,
) *DocumentaryHandler {
	loader, _ := sourcecontext.New(sourcecontext.Config{})
	return &DocumentaryHandler{
		db:           db,
		auth:         auth,
		planner:      planner,
		store:        documentary.NewStore(db),
		storage:      storage,
		sourceLoader: loader,
		limiter:      ratelimit.New(),
	}
}

type CreateDocumentaryRunInput struct {
	Body struct {
		WorkspaceID string               `json:"workspace_id" required:"true" minLength:"1"`
		Source      *autoVideoSourceBody `json:"source,omitempty"`
		Niche       string               `json:"niche,omitempty" maxLength:"120"`
		CustomTopic string               `json:"custom_topic,omitempty" maxLength:"500"`
		Language    string               `json:"language,omitempty" maxLength:"32"`
	}
}

type GetDocumentaryRunInput struct {
	PathID      string `path:"run_id" doc:"Documentary run ID"`
	WorkspaceID string `query:"workspace_id" required:"true" doc:"Workspace ID"`
}

type UpdateDocumentaryRunInput struct {
	PathID string `path:"run_id" doc:"Documentary run ID"`
	Body   struct {
		WorkspaceID       string          `json:"workspace_id" required:"true" minLength:"1"`
		GenerationVersion int64           `json:"generation_version" required:"true" minimum:"1"`
		Run               documentary.Run `json:"run" required:"true"`
	}
}

type DeleteDocumentaryRunInput struct {
	PathID string `path:"run_id" doc:"Documentary run ID"`
	Body   struct {
		WorkspaceID string `json:"workspace_id" required:"true" minLength:"1"`
	}
}

type GenerateDocumentaryStepInput struct {
	PathID string `path:"run_id" doc:"Documentary run ID"`
	Body   struct {
		WorkspaceID       string `json:"workspace_id" required:"true" minLength:"1"`
		GenerationVersion int64  `json:"generation_version" required:"true" minimum:"1"`
	}
}

type DocumentaryRunOutput struct {
	Body documentary.Run
}

type DeleteDocumentaryRunOutput struct {
	Body struct {
		Deleted bool `json:"deleted"`
	}
}

func (h *DocumentaryHandler) RegisterRoutes(api huma.API) {
	auth := huma.Middlewares{middleware.AuthMiddleware(api, h.auth)}
	operations := []struct {
		id      string
		method  string
		path    string
		summary string
		handler any
	}{
		{"create-auno-documentary-run", http.MethodPost, "/auno/auto-video/documentary/runs", "Create an Auno documentary run", h.create},
		{"get-auno-documentary-run", http.MethodGet, "/auno/auto-video/documentary/runs/{run_id}", "Get an Auno documentary run", h.get},
		{"update-auno-documentary-run", http.MethodPut, "/auno/auto-video/documentary/runs/{run_id}", "Update an Auno documentary run", h.update},
		{"delete-auno-documentary-run", http.MethodDelete, "/auno/auto-video/documentary/runs/{run_id}", "Delete an Auno documentary run", h.delete},
		{"generate-auno-documentary-ideas", http.MethodPost, "/auno/auto-video/documentary/runs/{run_id}/ideas", "Generate documentary idea candidates", h.generateIdeas},
		{"generate-auno-documentary-script", http.MethodPost, "/auno/auto-video/documentary/runs/{run_id}/script", "Generate documentary narration", h.generateScript},
		{"generate-auno-documentary-beats", http.MethodPost, "/auno/auto-video/documentary/runs/{run_id}/beats", "Generate documentary beat timing", h.generateBeats},
		{"generate-auno-documentary-visuals", http.MethodPost, "/auno/auto-video/documentary/runs/{run_id}/visuals", "Generate documentary visual plans", h.generateVisuals},
		{"generate-auno-documentary-thumbnails", http.MethodPost, "/auno/auto-video/documentary/runs/{run_id}/thumbnails", "Generate documentary thumbnail plans", h.generateThumbnails},
	}
	for _, operation := range operations {
		huma.Register(api, huma.Operation{
			OperationID: operation.id,
			Method:      operation.method,
			Path:        operation.path,
			Summary:     operation.summary,
			Description: "Persistent Auno Documentary Long-form workflow. Generated outputs remain editable and are stored separately from the native video project until handoff.",
			Tags:        []string{"Auno Auto Video"},
			Middlewares: auth,
			Errors:      []int{400, 403, 404, 409, 429, 502, 503},
		}, operation.handler)
	}
}

func (h *DocumentaryHandler) create(ctx context.Context, input *CreateDocumentaryRunInput) (*DocumentaryRunOutput, error) {
	if err := h.checkEdit(ctx, input.Body.WorkspaceID); err != nil {
		return nil, err
	}
	language := strings.TrimSpace(input.Body.Language)
	if language == "" {
		language = "en-US"
	}
	var source *autovideo.Source
	if input.Body.Source != nil {
		resolved, err := h.resolveNewSource(ctx, input.Body.WorkspaceID, sourceFromBody(*input.Body.Source))
		if err != nil {
			return nil, err
		}
		source = &resolved
	}
	run, err := h.store.Create(ctx, input.Body.WorkspaceID, documentary.Run{
		CurrentStep:      documentary.StepSource,
		Source:           source,
		Niche:            strings.TrimSpace(input.Body.Niche),
		CustomTopic:      strings.TrimSpace(input.Body.CustomTopic),
		Language:         language,
		ProviderManifest: map[string]string{},
	})
	if err != nil {
		return nil, documentaryHTTPError(err)
	}
	return &DocumentaryRunOutput{Body: *run}, nil
}

func (h *DocumentaryHandler) get(ctx context.Context, input *GetDocumentaryRunInput) (*DocumentaryRunOutput, error) {
	if err := h.checkEdit(ctx, input.WorkspaceID); err != nil {
		return nil, err
	}
	run, err := h.store.Get(ctx, input.WorkspaceID, input.PathID)
	if err != nil {
		return nil, documentaryHTTPError(err)
	}
	return &DocumentaryRunOutput{Body: *run}, nil
}

func (h *DocumentaryHandler) update(ctx context.Context, input *UpdateDocumentaryRunInput) (*DocumentaryRunOutput, error) {
	if err := h.checkEdit(ctx, input.Body.WorkspaceID); err != nil {
		return nil, err
	}
	current, err := h.store.Get(ctx, input.Body.WorkspaceID, input.PathID)
	if err != nil {
		return nil, documentaryHTTPError(err)
	}
	if current.GenerationVersion != input.Body.GenerationVersion {
		return nil, documentaryHTTPError(documentary.ErrConflict)
	}
	next := *current
	patch := input.Body.Run
	if patch.Source != nil && !reflect.DeepEqual(current.Source, patch.Source) {
		resolved, resolveErr := h.resolveNewSource(ctx, input.Body.WorkspaceID, *patch.Source)
		if resolveErr != nil {
			return nil, resolveErr
		}
		next.Source = &resolved
		documentary.InvalidateFrom(&next, documentary.StepSource)
	}
	if current.Niche != patch.Niche || current.CustomTopic != patch.CustomTopic {
		next.Niche = strings.TrimSpace(patch.Niche)
		next.CustomTopic = strings.TrimSpace(patch.CustomTopic)
		documentary.InvalidateFrom(&next, documentary.StepTopic)
	}
	if current.SelectedIdeaID != patch.SelectedIdeaID {
		next.SelectedIdeaID = strings.TrimSpace(patch.SelectedIdeaID)
		documentary.InvalidateFrom(&next, documentary.StepIdeas)
	}
	if patch.TargetDurationSeconds != 0 && current.TargetDurationSeconds != patch.TargetDurationSeconds {
		if err := documentary.ValidateDuration(patch.TargetDurationSeconds); err != nil {
			return nil, documentaryHTTPError(err)
		}
		next.TargetDurationSeconds = patch.TargetDurationSeconds
		documentary.InvalidateFrom(&next, documentary.StepDuration)
	}
	if language := strings.TrimSpace(patch.Language); language != "" && language != current.Language {
		next.Language = language
		documentary.InvalidateFrom(&next, documentary.StepScript)
	}
	if patch.Script != nil && !reflect.DeepEqual(current.Script, patch.Script) {
		next.Script = patch.Script
		documentary.InvalidateFrom(&next, documentary.StepScript)
	}
	if patch.Voice != nil && !reflect.DeepEqual(current.Voice, patch.Voice) {
		next.Voice = patch.Voice
		documentary.InvalidateFrom(&next, documentary.StepVoice)
	}
	if patch.Beats != nil && !reflect.DeepEqual(current.Beats, patch.Beats) {
		next.Beats = append([]documentary.Beat(nil), patch.Beats...)
		documentary.InvalidateFrom(&next, documentary.StepBeats)
	}
	if patch.VisualPlans != nil && !reflect.DeepEqual(current.VisualPlans, patch.VisualPlans) {
		next.VisualPlans = append([]documentary.VisualPlan(nil), patch.VisualPlans...)
		documentary.InvalidateFrom(&next, documentary.StepVisuals)
	}
	if patch.Thumbnails != nil {
		next.Thumbnails = append([]documentary.ThumbnailPlan(nil), patch.Thumbnails...)
	}
	if patch.StepStates != nil {
		next.StepStates = patch.StepStates
	}
	if patch.CurrentStep != "" {
		if err := documentary.ValidateStep(patch.CurrentStep); err != nil {
			return nil, documentaryHTTPError(err)
		}
		next.CurrentStep = patch.CurrentStep
	}
	updated, err := h.store.Upsert(ctx, input.Body.WorkspaceID, next, input.Body.GenerationVersion)
	if err != nil {
		return nil, documentaryHTTPError(err)
	}
	return &DocumentaryRunOutput{Body: *updated}, nil
}

func (h *DocumentaryHandler) delete(ctx context.Context, input *DeleteDocumentaryRunInput) (*DeleteDocumentaryRunOutput, error) {
	if err := h.checkEdit(ctx, input.Body.WorkspaceID); err != nil {
		return nil, err
	}
	if err := h.store.Delete(ctx, input.Body.WorkspaceID, input.PathID); err != nil {
		return nil, documentaryHTTPError(err)
	}
	output := &DeleteDocumentaryRunOutput{}
	output.Body.Deleted = true
	return output, nil
}

func (h *DocumentaryHandler) generateIdeas(ctx context.Context, input *GenerateDocumentaryStepInput) (*DocumentaryRunOutput, error) {
	run, err := h.generationRun(ctx, input)
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
	run.CurrentStep = documentary.StepIdeas
	markDocumentaryStep(run, documentary.StepIdeas, documentary.Fingerprint(run.Niche, run.CustomTopic, documentarySourceFingerprint(run.Source)))
	setDocumentaryProvider(run, "ideas", result.Model)
	return h.persistGeneration(ctx, input, run)
}

func (h *DocumentaryHandler) generateScript(ctx context.Context, input *GenerateDocumentaryStepInput) (*DocumentaryRunOutput, error) {
	run, err := h.generationRun(ctx, input)
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
	run, err := h.generationRun(ctx, input)
	if err != nil {
		return nil, err
	}
	if run.Script == nil {
		return nil, huma.Error400BadRequest("generate or enter a documentary script first")
	}
	result, err := h.planner.GenerateBeats(ctx, documentary.BeatsInput{
		RunID: run.ID, Script: *run.Script, TargetDurationSeconds: run.TargetDurationSeconds,
	})
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
	run, err := h.generationRun(ctx, input)
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

func (h *DocumentaryHandler) generateThumbnails(ctx context.Context, input *GenerateDocumentaryStepInput) (*DocumentaryRunOutput, error) {
	run, err := h.generationRun(ctx, input)
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

func (h *DocumentaryHandler) generationRun(ctx context.Context, input *GenerateDocumentaryStepInput) (*documentary.Run, error) {
	if err := h.checkEdit(ctx, input.Body.WorkspaceID); err != nil {
		return nil, err
	}
	if h.planner == nil {
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

func (h *DocumentaryHandler) persistGeneration(ctx context.Context, input *GenerateDocumentaryStepInput, run *documentary.Run) (*DocumentaryRunOutput, error) {
	updated, err := h.store.Upsert(ctx, input.Body.WorkspaceID, *run, input.Body.GenerationVersion)
	if err != nil {
		return nil, documentaryHTTPError(err)
	}
	return &DocumentaryRunOutput{Body: *updated}, nil
}

func (h *DocumentaryHandler) checkEdit(ctx context.Context, workspaceID string) error {
	if h == nil || h.db == nil || h.store == nil {
		return huma.Error503ServiceUnavailable("Documentary workflow is unavailable")
	}
	workspaceID = strings.TrimSpace(workspaceID)
	if workspaceID == "" {
		return huma.Error400BadRequest("workspace_id is required")
	}
	allowed, err := workspaceEditAllowed(ctx, h.db, workspaceID, middleware.GetUserID(ctx))
	if err != nil {
		return huma.Error503ServiceUnavailable("failed to verify workspace access")
	}
	if !allowed {
		return huma.Error403Forbidden("workspace access denied")
	}
	return nil
}

func (h *DocumentaryHandler) resolveNewSource(ctx context.Context, workspaceID string, source autovideo.Source) (autovideo.Source, error) {
	kind := strings.ToLower(strings.TrimSpace(source.Kind))
	if kind != "url" {
		if source.MediaID != "" {
			resolved, _, err := resolveAutoVideoMediaSource(ctx, h.db, h.storage, workspaceID, source)
			if err != nil {
				return autovideo.Source{}, documentaryMediaHTTPError(err)
			}
			return resolved, nil
		}
		return source, nil
	}
	if h.sourceLoader == nil {
		return autovideo.Source{}, huma.Error503ServiceUnavailable("URL source extraction is unavailable")
	}
	rawURL := strings.TrimSpace(source.URL)
	if rawURL == "" {
		rawURL = strings.TrimSpace(source.Value)
	}
	document, err := h.sourceLoader.Load(ctx, rawURL)
	if err != nil {
		return autovideo.Source{}, documentarySourceHTTPError(err)
	}
	source.URL = document.CanonicalURL
	source.Value = document.Text
	if strings.TrimSpace(document.Title) != "" {
		source.Label = document.Title
	}
	return source, nil
}

func (h *DocumentaryHandler) sourceForPlanning(
	ctx context.Context,
	workspaceID string,
	source *autovideo.Source,
) (*autovideo.Source, []ai.MultimodalPart, error) {
	if source == nil {
		return nil, nil, nil
	}
	copySource := *source
	if strings.TrimSpace(copySource.MediaID) == "" {
		return &copySource, nil, nil
	}
	resolved, parts, err := resolveAutoVideoMediaSource(ctx, h.db, h.storage, workspaceID, copySource)
	if err != nil {
		return nil, nil, documentaryMediaHTTPError(err)
	}
	return &resolved, parts, nil
}

func documentaryHTTPError(err error) error {
	switch {
	case errors.Is(err, documentary.ErrInvalid):
		return huma.Error400BadRequest("invalid documentary workflow state")
	case errors.Is(err, documentary.ErrNotFound):
		return huma.Error404NotFound("documentary run was not found")
	case errors.Is(err, documentary.ErrConflict):
		return huma.Error409Conflict("documentary run changed; reload it before saving again")
	default:
		return huma.Error503ServiceUnavailable("documentary workflow is unavailable")
	}
}

func documentaryPlannerHTTPError(err error) error {
	if errors.Is(err, documentary.ErrInvalid) || errors.Is(err, documentary.ErrInvalidResponse) {
		return huma.Error400BadRequest("documentary input or generated output is invalid")
	}
	var providerErr *ai.ProviderError
	if errors.As(err, &providerErr) && providerErr.StatusCode == http.StatusTooManyRequests {
		return huma.Error429TooManyRequests("documentary AI provider is rate limited; try again later")
	}
	if errors.Is(err, context.DeadlineExceeded) || errors.Is(err, context.Canceled) {
		return huma.Error503ServiceUnavailable("documentary planning timed out")
	}
	log.Printf("Auno documentary planning failed (%T)", err)
	return huma.Error502BadGateway("documentary planning failed")
}

func documentarySourceHTTPError(err error) error {
	if errors.Is(err, sourcecontext.ErrInvalidURL) || errors.Is(err, sourcecontext.ErrCredentialsNotAllowed) ||
		errors.Is(err, sourcecontext.ErrCustomPortNotAllowed) || errors.Is(err, sourcecontext.ErrURLNotPublic) ||
		errors.Is(err, sourcecontext.ErrUnsupportedContentType) || errors.Is(err, sourcecontext.ErrResponseTooLarge) ||
		errors.Is(err, sourcecontext.ErrUnreadable) {
		return huma.Error400BadRequest("documentary source URL is not a supported public document")
	}
	return huma.Error502BadGateway("documentary source URL could not be loaded")
}

func documentaryMediaHTTPError(err error) error {
	if errors.Is(err, errAutoVideoMediaInvalid) {
		return huma.Error400BadRequest("documentary media source is invalid, unavailable, too large, or unsupported")
	}
	return huma.Error503ServiceUnavailable("documentary media source could not be read")
}

func selectedDocumentaryIdea(run *documentary.Run) *documentary.Idea {
	if run == nil || strings.TrimSpace(run.SelectedIdeaID) == "" {
		return nil
	}
	for index := range run.Ideas {
		if run.Ideas[index].ID == run.SelectedIdeaID {
			return &run.Ideas[index]
		}
	}
	return nil
}

func markDocumentaryStep(run *documentary.Run, step documentary.Step, fingerprint string) {
	if run.StepStates == nil {
		run.StepStates = map[documentary.Step]documentary.StepState{}
	}
	run.StepStates[step] = documentary.StepState{Fingerprint: fingerprint, Status: documentary.StepStatusReady}
}

func setDocumentaryProvider(run *documentary.Run, step, model string) {
	if run.ProviderManifest == nil {
		run.ProviderManifest = map[string]string{}
	}
	run.ProviderManifest[step] = model
}

func documentarySourceFingerprint(source *autovideo.Source) string {
	if source == nil {
		return "no-source"
	}
	return documentary.Fingerprint(source.ID, source.Kind, source.URL, source.MediaID, source.Value)
}

func documentaryBeatIDs(beats []documentary.Beat) []string {
	ids := make([]string, 0, len(beats))
	for _, beat := range beats {
		ids = append(ids, beat.ID)
	}
	return ids
}

func documentaryVisualFingerprints(plans []documentary.VisualPlan) []string {
	fingerprints := make([]string, 0, len(plans))
	for _, plan := range plans {
		fingerprints = append(fingerprints, plan.Fingerprint)
	}
	return fingerprints
}
