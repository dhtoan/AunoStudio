package handlers

import (
	"context"
	"net/http"
	"reflect"
	"strings"

	"github.com/danielgtaylor/huma/v2"
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
		ClearSource       bool            `json:"clear_source,omitempty"`
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

type GenerateDocumentaryVisualStepInput struct {
	PathID     string `path:"run_id" doc:"Documentary run ID"`
	PathBeatID string `path:"beat_id" doc:"Documentary beat ID"`
	Body       struct {
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

func documentaryOperation(id, method, path, summary string, auth huma.Middlewares) huma.Operation {
	return huma.Operation{
		OperationID: id,
		Method:      method,
		Path:        path,
		Summary:     summary,
		Description: "Persistent Auno Documentary Long-form workflow. Generated outputs remain editable and are stored separately from the native video project until handoff.",
		Tags:        []string{"Auno Auto Video"},
		Middlewares: auth,
		Errors:      []int{400, 403, 404, 409, 429, 502, 503},
	}
}

func (h *DocumentaryHandler) RegisterRoutes(api huma.API) {
	auth := huma.Middlewares{middleware.AuthMiddleware(api, h.auth)}
	huma.Register(api, documentaryOperation("create-auno-documentary-run", http.MethodPost, "/auno/auto-video/documentary/runs", "Create an Auno documentary run", auth), h.create)
	huma.Register(api, documentaryOperation("get-auno-documentary-run", http.MethodGet, "/auno/auto-video/documentary/runs/{run_id}", "Get an Auno documentary run", auth), h.get)
	huma.Register(api, documentaryOperation("update-auno-documentary-run", http.MethodPut, "/auno/auto-video/documentary/runs/{run_id}", "Update an Auno documentary run", auth), h.update)
	huma.Register(api, documentaryOperation("delete-auno-documentary-run", http.MethodDelete, "/auno/auto-video/documentary/runs/{run_id}", "Delete an Auno documentary run", auth), h.delete)
	huma.Register(api, documentaryOperation("generate-auno-documentary-ideas", http.MethodPost, "/auno/auto-video/documentary/runs/{run_id}/ideas", "Generate documentary idea candidates", auth), h.generateIdeas)
	huma.Register(api, documentaryOperation("generate-auno-documentary-script", http.MethodPost, "/auno/auto-video/documentary/runs/{run_id}/script", "Generate documentary narration", auth), h.generateScript)
	huma.Register(api, documentaryOperation("generate-auno-documentary-beats", http.MethodPost, "/auno/auto-video/documentary/runs/{run_id}/beats", "Generate documentary beat timing", auth), h.generateBeats)
	huma.Register(api, documentaryOperation("generate-auno-documentary-visuals", http.MethodPost, "/auno/auto-video/documentary/runs/{run_id}/visuals", "Generate documentary visual plans", auth), h.generateVisuals)
	huma.Register(api, documentaryOperation("regenerate-auno-documentary-beat-visual", http.MethodPost, "/auno/auto-video/documentary/runs/{run_id}/visuals/{beat_id}", "Regenerate one documentary beat visual", auth), h.regenerateVisual)
	huma.Register(api, documentaryOperation("generate-auno-documentary-thumbnails", http.MethodPost, "/auno/auto-video/documentary/runs/{run_id}/thumbnails", "Generate documentary thumbnail plans", auth), h.generateThumbnails)
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
	if projectID := strings.TrimSpace(patch.ProjectID); projectID != "" && projectID != current.ProjectID {
		if strings.TrimSpace(current.ProjectID) != "" {
			return nil, huma.Error400BadRequest("documentary run is already linked to another project")
		}
		next.ProjectID = projectID
	}
	if input.Body.ClearSource && current.Source != nil {
		next.Source = nil
		documentary.InvalidateFrom(&next, documentary.StepSource)
	} else if patch.Source != nil && !reflect.DeepEqual(current.Source, patch.Source) {
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
		markDocumentaryStepStale(&next, documentary.StepScript)
	}
	if patch.Script != nil && !reflect.DeepEqual(current.Script, patch.Script) {
		previous := documentary.Script{}
		if current.Script != nil {
			previous = *current.Script
		}
		normalized, normalizeErr := documentary.NormalizeEditedScript(
			current.ID,
			next.TargetDurationSeconds,
			previous,
			patch.Script.Text,
		)
		if normalizeErr != nil {
			return nil, documentaryHTTPError(normalizeErr)
		}
		next.Script = &normalized
		documentary.InvalidateFrom(&next, documentary.StepScript)
		markDocumentaryStep(&next, documentary.StepScript, normalized.Fingerprint)
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
