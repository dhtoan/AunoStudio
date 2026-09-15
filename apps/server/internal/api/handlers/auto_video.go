package handlers

import (
	"context"
	"errors"
	"log"
	"net/http"
	"strings"
	"time"

	"github.com/danielgtaylor/huma/v2"
	"github.com/openpost/backend/internal/ai"
	"github.com/openpost/backend/internal/api/middleware"
	"github.com/openpost/backend/internal/services/autovideo"
	"github.com/openpost/backend/internal/services/ratelimit"
	"github.com/uptrace/bun"
)

const autoVideoRequestsPerMinute = 10

type AutoVideoHandler struct {
	db      *bun.DB
	auth    middleware.Authenticator
	planner autovideo.Planner
	limiter *ratelimit.Limiter
}

type GenerateAutoVideoStoryboardInput struct {
	Body struct {
		WorkspaceID           string `json:"workspace_id" required:"true" doc:"Workspace ID"`
		Format                string `json:"format" required:"true" doc:"Review, news, guide, compare, or top-n"`
		Title                 string `json:"title,omitempty" maxLength:"160" doc:"Optional project title"`
		Language              string `json:"language" required:"true" minLength:"2" maxLength:"32" doc:"Narration language code"`
		TargetDurationSeconds int    `json:"target_duration_seconds" required:"true" minimum:"10" maximum:"180" doc:"Target duration in seconds"`
		Source                struct {
			ID    string `json:"id" required:"true"`
			Kind  string `json:"kind" required:"true"`
			Label string `json:"label" required:"true"`
			Value string `json:"value" required:"true" minLength:"1" maxLength:"50000"`
			URL   string `json:"url,omitempty"`
		} `json:"source" required:"true"`
	}
}

type GenerateAutoVideoStoryboardOutput struct {
	Body struct {
		Storyboard autovideo.Storyboard `json:"storyboard"`
		Model      string               `json:"model"`
	}
}

func NewAutoVideoHandler(db *bun.DB, auth middleware.Authenticator, planner autovideo.Planner) *AutoVideoHandler {
	return &AutoVideoHandler{db: db, auth: auth, planner: planner, limiter: ratelimit.New()}
}

func (h *AutoVideoHandler) RegisterRoutes(api huma.API) {
	huma.Register(api, huma.Operation{
		OperationID: "generate-auno-auto-video-storyboard",
		Method:      http.MethodPost,
		Path:        "/auno/auto-video/storyboard",
		Summary:     "Generate an editable Auno Auto Video storyboard",
		Description: "Plans scene copy and visual intent only. It does not render, save, schedule, or publish media.",
		Tags:        []string{"Auno Auto Video"},
		Middlewares: huma.Middlewares{middleware.AuthMiddleware(api, h.auth)},
		Errors:      []int{400, 403, 429, 502, 503},
	}, h.generate)
}

func (h *AutoVideoHandler) generate(ctx context.Context, input *GenerateAutoVideoStoryboardInput) (*GenerateAutoVideoStoryboardOutput, error) {
	if h.db == nil {
		return nil, huma.Error503ServiceUnavailable("Auto Video is unavailable")
	}
	workspaceID := strings.TrimSpace(input.Body.WorkspaceID)
	allowed, err := workspaceEditAllowed(ctx, h.db, workspaceID, middleware.GetUserID(ctx))
	if err != nil {
		return nil, huma.Error503ServiceUnavailable("failed to verify workspace access")
	}
	if !allowed {
		return nil, huma.Error403Forbidden("workspace access denied")
	}
	if h.planner == nil {
		return nil, huma.Error503ServiceUnavailable("AI Auto Video planning is not configured")
	}
	userID := middleware.GetUserID(ctx)
	if !h.limiter.Allow("auno-auto-video:"+userID, autoVideoRequestsPerMinute, time.Minute) {
		return nil, huma.Error429TooManyRequests("AI Auto Video planning limit reached; try again in one minute")
	}

	result, err := h.planner.Plan(ctx, autovideo.Input{
		Format:                input.Body.Format,
		Title:                 input.Body.Title,
		Language:              input.Body.Language,
		TargetDurationSeconds: input.Body.TargetDurationSeconds,
		Source: autovideo.Source{
			ID:    input.Body.Source.ID,
			Kind:  input.Body.Source.Kind,
			Label: input.Body.Source.Label,
			Value: input.Body.Source.Value,
			URL:   input.Body.Source.URL,
		},
	})
	if err != nil {
		log.Printf("Auno Auto Video planning failed for workspace %s (%T)", workspaceID, err)
		return nil, autoVideoPlannerError(err)
	}
	output := &GenerateAutoVideoStoryboardOutput{}
	output.Body.Storyboard = result.Storyboard
	output.Body.Model = result.Model
	return output, nil
}

func autoVideoPlannerError(err error) error {
	if errors.Is(err, autovideo.ErrInvalidInput) || errors.Is(err, autovideo.ErrInvalidResponse) {
		return huma.Error400BadRequest("Auto Video source or generated storyboard is invalid")
	}
	var providerErr *ai.ProviderError
	if errors.As(err, &providerErr) && providerErr.StatusCode == http.StatusTooManyRequests {
		return huma.Error429TooManyRequests("AI Auto Video planning is rate limited; try again later")
	}
	if errors.Is(err, context.DeadlineExceeded) || errors.Is(err, context.Canceled) {
		return huma.Error503ServiceUnavailable("AI Auto Video planning timed out")
	}
	return huma.Error502BadGateway("AI Auto Video planning failed")
}
