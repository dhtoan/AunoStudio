package documentary

import (
	"context"
	"encoding/json"
	"errors"
	"strings"
	"time"

	"github.com/openpost/backend/internal/ai"
	"github.com/openpost/backend/internal/services/autovideo"
)

const (
	documentaryGenerationTimeout = 90 * time.Second
	documentaryMaxOutputTokens   = 16000
)

var (
	ErrPlannerUnavailable = errors.New("documentary planner unavailable")
	ErrInvalidResponse    = errors.New("invalid documentary planner response")
)

type Planner interface {
	GenerateIdeas(context.Context, IdeasInput) (IdeasResult, error)
	GenerateScript(context.Context, ScriptInput) (ScriptResult, error)
	GenerateBeats(context.Context, BeatsInput) (BeatsResult, error)
	GenerateVisuals(context.Context, VisualsInput) (VisualsResult, error)
	GenerateThumbnails(context.Context, ThumbnailsInput) (ThumbnailsResult, error)
}

type Service struct {
	generator ai.Generator
	model     string
}

type IdeasInput struct {
	RunID       string
	Language    string
	Niche       string
	CustomTopic string
	Source      *autovideo.Source
	Parts       []ai.MultimodalPart
}

type IdeasResult struct {
	Ideas []Idea
	Model string
}

type ScriptInput struct {
	RunID                string
	Language             string
	Idea                 *Idea
	CustomTopic          string
	TargetDurationSeconds int
	Source               *autovideo.Source
	Parts                []ai.MultimodalPart
}

type ScriptResult struct {
	Script Script
	Model  string
}

type BeatsInput struct {
	RunID                string
	Script               Script
	TargetDurationSeconds int
}

type BeatsResult struct {
	Beats []Beat
	Model string
}

type VisualsInput struct {
	RunID    string
	Language string
	Beats    []Beat
	Source   *autovideo.Source
	Parts    []ai.MultimodalPart
}

type VisualsResult struct {
	Plans []VisualPlan
	Model string
}

type ThumbnailsInput struct {
	RunID    string
	Language string
	Title    string
	Script   Script
	Source   *autovideo.Source
	Parts    []ai.MultimodalPart
}

type ThumbnailsResult struct {
	Plans []ThumbnailPlan
	Model string
}

func New(generator ai.Generator, model string) (*Service, error) {
	model = strings.TrimSpace(model)
	if generator == nil || model == "" {
		return nil, ErrInvalid
	}
	return &Service{generator: generator, model: model}, nil
}

func (s *Service) generateStructured(
	ctx context.Context,
	systemPrompt string,
	payload any,
	parts []ai.MultimodalPart,
	schema ai.JSONSchema,
	output any,
) (string, error) {
	if s == nil || s.generator == nil || strings.TrimSpace(s.model) == "" {
		return "", ErrPlannerUnavailable
	}
	prompt, err := json.Marshal(payload)
	if err != nil {
		return "", err
	}
	generationCtx, cancel := context.WithTimeout(ctx, documentaryGenerationTimeout)
	defer cancel()
	result, err := s.generator.Generate(generationCtx, ai.GenerateRequest{
		Model:           s.model,
		SystemPrompt:    systemPrompt,
		UserPrompt:      string(prompt),
		ResponseSchema:  &schema,
		Parts:           parts,
		MaxOutputTokens: documentaryMaxOutputTokens,
	})
	if err != nil {
		return "", err
	}
	if err := json.Unmarshal([]byte(result.Text), output); err != nil {
		return "", ErrInvalidResponse
	}
	model := strings.TrimSpace(result.Model)
	if model == "" {
		model = s.model
	}
	return model, nil
}

func sourcePayload(source *autovideo.Source) any {
	if source == nil {
		return nil
	}
	return map[string]any{
		"id":        source.ID,
		"kind":      source.Kind,
		"label":     source.Label,
		"value":     source.Value,
		"mime_type": source.MIMEType,
		"media_id":  source.MediaID,
	}
}
