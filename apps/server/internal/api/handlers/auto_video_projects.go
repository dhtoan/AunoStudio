package handlers

import (
	"context"
	"encoding/json"
	"errors"
	"net/http"
	"strings"

	"github.com/danielgtaylor/huma/v2"
	"github.com/openpost/backend/internal/api/middleware"
	"github.com/openpost/backend/internal/services/autovideoprojects"
	"github.com/uptrace/bun"
)

type AutoVideoProjectHandler struct {
	db      *bun.DB
	auth    middleware.Authenticator
	service *autovideoprojects.Service
}

func NewAutoVideoProjectHandler(db *bun.DB, auth middleware.Authenticator) *AutoVideoProjectHandler {
	return &AutoVideoProjectHandler{db: db, auth: auth, service: autovideoprojects.New(db)}
}

type AutoVideoProjectResponse struct {
	ProjectID         string         `json:"project_id"`
	WorkspaceID       string         `json:"workspace_id"`
	GenerationVersion int64          `json:"generation_version"`
	TemplateID        string         `json:"template_id,omitempty"`
	SourceManifest    map[string]any `json:"source_manifest"`
	Storyboard        map[string]any `json:"storyboard"`
	ProviderManifest  map[string]any `json:"provider_manifest"`
	GenerationGraph   map[string]any `json:"generation_graph"`
	CreatedAt         string         `json:"created_at"`
	UpdatedAt         string         `json:"updated_at"`
}

type GetAutoVideoProjectInput struct {
	PathID      string `path:"id" doc:"Native video project ID"`
	WorkspaceID string `query:"workspace_id" required:"true" doc:"Workspace ID"`
}

type UpsertAutoVideoProjectInput struct {
	PathID string `path:"id" doc:"Native video project ID"`
	Body   struct {
		WorkspaceID       string         `json:"workspace_id" minLength:"1"`
		GenerationVersion int64          `json:"generation_version" minimum:"1"`
		TemplateID        string         `json:"template_id,omitempty" maxLength:"160"`
		SourceManifest    map[string]any `json:"source_manifest"`
		Storyboard        map[string]any `json:"storyboard"`
		ProviderManifest  map[string]any `json:"provider_manifest"`
		GenerationGraph   map[string]any `json:"generation_graph"`
	}
}

type DeleteAutoVideoProjectInput struct {
	PathID string `path:"id" doc:"Native video project ID"`
	Body   struct {
		WorkspaceID string `json:"workspace_id" minLength:"1"`
	}
}

type AutoVideoProjectOutput struct {
	Body AutoVideoProjectResponse
}

type DeleteAutoVideoProjectOutput struct {
	Body struct {
		Deleted bool `json:"deleted"`
	}
}

func (h *AutoVideoProjectHandler) RegisterRoutes(api huma.API) {
	auth := huma.Middlewares{middleware.AuthMiddleware(api, h.auth)}
	huma.Register(api, huma.Operation{
		OperationID: "get-auno-auto-video-project",
		Method:      http.MethodGet,
		Path:        "/auno/auto-video/projects/{id}",
		Summary:     "Get Auno Auto Video generation metadata",
		Tags:        []string{"Auno Auto Video"},
		Middlewares: auth,
		Errors:      []int{400, 403, 404, 503},
	}, h.get)
	huma.Register(api, huma.Operation{
		OperationID: "upsert-auno-auto-video-project",
		Method:      http.MethodPut,
		Path:        "/auno/auto-video/projects/{id}",
		Summary:     "Save Auno Auto Video generation metadata",
		Description: "Stores AI provenance and regeneration state separately from the native video project document.",
		Tags:        []string{"Auno Auto Video"},
		Middlewares: auth,
		Errors:      []int{400, 403, 404, 503},
	}, h.upsert)
	huma.Register(api, huma.Operation{
		OperationID: "delete-auno-auto-video-project",
		Method:      http.MethodDelete,
		Path:        "/auno/auto-video/projects/{id}",
		Summary:     "Delete Auno Auto Video generation metadata",
		Tags:        []string{"Auno Auto Video"},
		Middlewares: auth,
		Errors:      []int{400, 403, 404, 503},
	}, h.delete)
}

func (h *AutoVideoProjectHandler) get(ctx context.Context, input *GetAutoVideoProjectInput) (*AutoVideoProjectOutput, error) {
	if err := h.checkEdit(ctx, input.WorkspaceID); err != nil {
		return nil, err
	}
	record, err := h.service.Get(ctx, input.WorkspaceID, input.PathID)
	if err != nil {
		return nil, autoVideoProjectError(err)
	}
	response, err := autoVideoProjectResponse(record)
	if err != nil {
		return nil, huma.Error503ServiceUnavailable("Auto Video metadata could not be read")
	}
	return &AutoVideoProjectOutput{Body: response}, nil
}

func (h *AutoVideoProjectHandler) upsert(ctx context.Context, input *UpsertAutoVideoProjectInput) (*AutoVideoProjectOutput, error) {
	if err := h.checkEdit(ctx, input.Body.WorkspaceID); err != nil {
		return nil, err
	}
	source, err := json.Marshal(input.Body.SourceManifest)
	if err != nil {
		return nil, huma.Error400BadRequest("invalid source manifest")
	}
	storyboard, err := json.Marshal(input.Body.Storyboard)
	if err != nil {
		return nil, huma.Error400BadRequest("invalid storyboard")
	}
	providers, err := json.Marshal(input.Body.ProviderManifest)
	if err != nil {
		return nil, huma.Error400BadRequest("invalid provider manifest")
	}
	graph, err := json.Marshal(input.Body.GenerationGraph)
	if err != nil {
		return nil, huma.Error400BadRequest("invalid generation graph")
	}
	record, err := h.service.Upsert(ctx, autovideoprojects.UpsertInput{
		WorkspaceID:       input.Body.WorkspaceID,
		ProjectID:         input.PathID,
		GenerationVersion: input.Body.GenerationVersion,
		TemplateID:        input.Body.TemplateID,
		SourceManifest:    source,
		Storyboard:        storyboard,
		ProviderManifest:  providers,
		GenerationGraph:   graph,
	})
	if err != nil {
		return nil, autoVideoProjectError(err)
	}
	response, err := autoVideoProjectResponse(record)
	if err != nil {
		return nil, huma.Error503ServiceUnavailable("Auto Video metadata could not be read")
	}
	return &AutoVideoProjectOutput{Body: response}, nil
}

func (h *AutoVideoProjectHandler) delete(ctx context.Context, input *DeleteAutoVideoProjectInput) (*DeleteAutoVideoProjectOutput, error) {
	if err := h.checkEdit(ctx, input.Body.WorkspaceID); err != nil {
		return nil, err
	}
	if err := h.service.Delete(ctx, input.Body.WorkspaceID, input.PathID); err != nil {
		return nil, autoVideoProjectError(err)
	}
	output := &DeleteAutoVideoProjectOutput{}
	output.Body.Deleted = true
	return output, nil
}

func (h *AutoVideoProjectHandler) checkEdit(ctx context.Context, workspaceID string) error {
	if h == nil || h.db == nil || h.service == nil {
		return huma.Error503ServiceUnavailable("Auto Video metadata is unavailable")
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

func autoVideoProjectError(err error) error {
	if errors.Is(err, autovideoprojects.ErrInvalid) {
		return huma.Error400BadRequest("invalid Auto Video metadata")
	}
	if errors.Is(err, autovideoprojects.ErrNotFound) {
		return huma.Error404NotFound("Auto Video metadata was not found")
	}
	return huma.Error503ServiceUnavailable("Auto Video metadata is unavailable")
}

func autoVideoProjectResponse(record *autovideoprojects.Record) (AutoVideoProjectResponse, error) {
	response := AutoVideoProjectResponse{
		ProjectID:         record.ProjectID,
		WorkspaceID:       record.WorkspaceID,
		GenerationVersion: record.GenerationVersion,
		TemplateID:        record.TemplateID,
		CreatedAt:         record.CreatedAt.UTC().Format(timeFormatRFC3339Nano),
		UpdatedAt:         record.UpdatedAt.UTC().Format(timeFormatRFC3339Nano),
	}
	for raw, target := range map[string]*map[string]any{
		string(record.SourceManifest):   &response.SourceManifest,
		string(record.Storyboard):       &response.Storyboard,
		string(record.ProviderManifest): &response.ProviderManifest,
		string(record.GenerationGraph):  &response.GenerationGraph,
	} {
		if err := json.Unmarshal([]byte(raw), target); err != nil {
			return AutoVideoProjectResponse{}, err
		}
	}
	return response, nil
}
