package handlers

import (
	"context"
	"errors"
	"log"
	"net/http"
	"os"
	"strings"
	"time"

	"github.com/danielgtaylor/huma/v2"
	"github.com/openpost/backend/internal/ai"
	"github.com/openpost/backend/internal/api/middleware"
	"github.com/openpost/backend/internal/services/autovideo"
	"github.com/openpost/backend/internal/services/ratelimit"
	"github.com/openpost/backend/internal/services/sourcecontext"
	"github.com/uptrace/bun"
)

const autoVideoRequestsPerMinute = 10

type AutoVideoHandler struct {
	db           *bun.DB
	auth         middleware.Authenticator
	planner      autovideo.Planner
	sourceLoader sourcecontext.Loader
	limiter      *ratelimit.Limiter
}

type autoVideoSourceBody struct {
	ID    string `json:"id" required:"true"`
	Kind  string `json:"kind" required:"true"`
	Label string `json:"label" required:"true"`
	Value string `json:"value" required:"true" minLength:"1" maxLength:"50000"`
	URL   string `json:"url,omitempty"`
}

type ResolveAutoVideoSourceInput struct {
	Body struct {
		WorkspaceID string              `json:"workspace_id" required:"true" doc:"Workspace ID"`
		Source      autoVideoSourceBody `json:"source" required:"true"`
	}
}

type ResolveAutoVideoSourceOutput struct {
	Body struct {
		Source    autovideo.Source `json:"source"`
		Truncated bool             `json:"truncated"`
	}
}

type GenerateAutoVideoStoryboardInput struct {
	Body struct {
		WorkspaceID           string              `json:"workspace_id" required:"true" doc:"Workspace ID"`
		Format                string              `json:"format" required:"true" doc:"Review, news, guide, compare, or top-n"`
		Title                 string              `json:"title,omitempty" maxLength:"160" doc:"Optional project title"`
		Language              string              `json:"language" required:"true" minLength:"2" maxLength:"32" doc:"Narration language code"`
		TargetDurationSeconds int                 `json:"target_duration_seconds" required:"true" minimum:"10" maximum:"180" doc:"Target duration in seconds"`
		Source                autoVideoSourceBody `json:"source" required:"true"`
	}
}

type GenerateAutoVideoStoryboardOutput struct {
	Body struct {
		Storyboard autovideo.Storyboard `json:"storyboard"`
		Model      string               `json:"model"`
	}
}

type AunoAICapabilitiesOutput struct {
	Body struct {
		ProviderMode             string `json:"provider_mode"`
		PlannerAvailable         bool   `json:"planner_available"`
		ActiveProvider           string `json:"active_provider"`
		ActiveModel              string `json:"active_model"`
		GeminiConfigured         bool   `json:"gemini_configured"`
		OpenRouterConfigured     bool   `json:"openrouter_configured"`
		LocalStoryboardFallback  bool   `json:"local_storyboard_fallback"`
		BrowserTTS               bool   `json:"browser_tts"`
		BrowserTranscription     bool   `json:"browser_transcription"`
		BrowserMusicGeneration   bool   `json:"browser_music_generation"`
	}
}

func NewAutoVideoHandler(db *bun.DB, auth middleware.Authenticator, planner autovideo.Planner) *AutoVideoHandler {
	loader, _ := sourcecontext.New(sourcecontext.Config{})
	return &AutoVideoHandler{db: db, auth: auth, planner: planner, sourceLoader: loader, limiter: ratelimit.New()}
}

func (h *AutoVideoHandler) RegisterRoutes(api huma.API) {
	auth := huma.Middlewares{middleware.AuthMiddleware(api, h.auth)}
	huma.Register(api, huma.Operation{
		OperationID: "get-auno-ai-capabilities",
		Method:      http.MethodGet,
		Path:        "/auno/ai/capabilities",
		Summary:     "Get Auno AI capability status",
		Description: "Returns provider and local capability availability without exposing credentials or secret values.",
		Tags:        []string{"Auno AI"},
		Middlewares: auth,
	}, h.capabilities)

	huma.Register(api, huma.Operation{
		OperationID: "resolve-auno-auto-video-source",
		Method:      http.MethodPost,
		Path:        "/auno/auto-video/source/resolve",
		Summary:     "Resolve an Auno Auto Video source",
		Description: "Safely fetches and extracts a bounded public URL for use as untrusted source material.",
		Tags:        []string{"Auno Auto Video"},
		Middlewares: auth,
		Errors:      []int{400, 403, 502, 503},
	}, h.resolveSource)

	huma.Register(api, huma.Operation{
		OperationID: "generate-auno-auto-video-storyboard",
		Method:      http.MethodPost,
		Path:        "/auno/auto-video/storyboard",
		Summary:     "Generate an editable Auno Auto Video storyboard",
		Description: "Plans scene copy and visual intent only. It does not render, save, schedule, or publish media.",
		Tags:        []string{"Auno Auto Video"},
		Middlewares: auth,
		Errors:      []int{400, 403, 429, 502, 503},
	}, h.generate)
}

func (h *AutoVideoHandler) capabilities(context.Context, *struct{}) (*AunoAICapabilitiesOutput, error) {
	mode := strings.ToLower(strings.TrimSpace(os.Getenv("AUNO_AI_PROVIDER")))
	if mode == "" {
		mode = "auto"
	}
	geminiConfigured := firstConfiguredEnv("AUNO_GEMINI_API_KEY", "GEMINI_API_KEY", "GOOGLE_API_KEY")
	openRouterConfigured := strings.TrimSpace(os.Getenv("OPENROUTER_API_KEY")) != ""
	provider := "none"
	model := ""
	if h.planner != nil {
		switch {
		case mode == "gemini" && geminiConfigured:
			provider = "gemini"
		case mode == "openrouter" && openRouterConfigured:
			provider = "openrouter"
		case mode == "auto" && geminiConfigured:
			provider = "gemini"
		case mode == "auto" && openRouterConfigured:
			provider = "openrouter"
		}
	}
	if provider == "gemini" {
		model = strings.TrimSpace(os.Getenv("AUNO_GEMINI_MODEL"))
		if model == "" {
			model = "gemini-2.5-flash"
		}
	} else if provider == "openrouter" {
		model = strings.TrimSpace(os.Getenv("OPENPOST_TEXT_GENERATION_MODEL"))
		if model == "" {
			model = "openai/gpt-5.6-luna"
		}
	}
	output := &AunoAICapabilitiesOutput{}
	output.Body.ProviderMode = mode
	output.Body.PlannerAvailable = h.planner != nil
	output.Body.ActiveProvider = provider
	output.Body.ActiveModel = model
	output.Body.GeminiConfigured = geminiConfigured
	output.Body.OpenRouterConfigured = openRouterConfigured
	output.Body.LocalStoryboardFallback = true
	output.Body.BrowserTTS = true
	output.Body.BrowserTranscription = true
	output.Body.BrowserMusicGeneration = true
	return output, nil
}

func firstConfiguredEnv(keys ...string) bool {
	for _, key := range keys {
		if strings.TrimSpace(os.Getenv(key)) != "" {
			return true
		}
	}
	return false
}

func (h *AutoVideoHandler) checkWorkspace(ctx context.Context, workspaceID string) error {
	if h.db == nil {
		return huma.Error503ServiceUnavailable("Auto Video is unavailable")
	}
	workspaceID = strings.TrimSpace(workspaceID)
	allowed, err := workspaceEditAllowed(ctx, h.db, workspaceID, middleware.GetUserID(ctx))
	if err != nil {
		return huma.Error503ServiceUnavailable("failed to verify workspace access")
	}
	if !allowed {
		return huma.Error403Forbidden("workspace access denied")
	}
	return nil
}

func sourceFromBody(source autoVideoSourceBody) autovideo.Source {
	return autovideo.Source{
		ID: source.ID, Kind: source.Kind, Label: source.Label,
		Value: source.Value, URL: source.URL,
	}
}

func (h *AutoVideoHandler) resolveSource(ctx context.Context, input *ResolveAutoVideoSourceInput) (*ResolveAutoVideoSourceOutput, error) {
	if err := h.checkWorkspace(ctx, input.Body.WorkspaceID); err != nil {
		return nil, err
	}
	source := sourceFromBody(input.Body.Source)
	if strings.ToLower(strings.TrimSpace(source.Kind)) != "url" {
		output := &ResolveAutoVideoSourceOutput{}
		output.Body.Source = source
		return output, nil
	}
	if h.sourceLoader == nil {
		return nil, huma.Error503ServiceUnavailable("URL source extraction is unavailable")
	}
	rawURL := strings.TrimSpace(source.URL)
	if rawURL == "" {
		rawURL = strings.TrimSpace(source.Value)
	}
	document, err := h.sourceLoader.Load(ctx, rawURL)
	if err != nil {
		if errors.Is(err, sourcecontext.ErrInvalidURL) || errors.Is(err, sourcecontext.ErrCredentialsNotAllowed) ||
			errors.Is(err, sourcecontext.ErrCustomPortNotAllowed) || errors.Is(err, sourcecontext.ErrURLNotPublic) ||
			errors.Is(err, sourcecontext.ErrUnsupportedContentType) || errors.Is(err, sourcecontext.ErrResponseTooLarge) ||
			errors.Is(err, sourcecontext.ErrUnreadable) {
			return nil, huma.Error400BadRequest("source URL is not a supported public document")
		}
		return nil, huma.Error502BadGateway("source URL could not be loaded")
	}
	source.URL = document.CanonicalURL
	source.Value = document.Text
	if strings.TrimSpace(document.Title) != "" {
		source.Label = document.Title
	}
	output := &ResolveAutoVideoSourceOutput{}
	output.Body.Source = source
	output.Body.Truncated = document.Truncated
	return output, nil
}

func (h *AutoVideoHandler) generate(ctx context.Context, input *GenerateAutoVideoStoryboardInput) (*GenerateAutoVideoStoryboardOutput, error) {
	if err := h.checkWorkspace(ctx, input.Body.WorkspaceID); err != nil {
		return nil, err
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
		Source:                sourceFromBody(input.Body.Source),
	})
	if err != nil {
		log.Printf("Auno Auto Video planning failed for workspace %s (%T)", strings.TrimSpace(input.Body.WorkspaceID), err)
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
