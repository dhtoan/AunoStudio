package ai

import (
	"context"
	"errors"
	"strings"
	"time"

	openai "github.com/openai/openai-go/v3"
	"github.com/openai/openai-go/v3/option"
	"github.com/openai/openai-go/v3/packages/param"
)

const (
	defaultGeminiOpenAIBaseURL = "https://generativelanguage.googleapis.com/v1beta/openai/"
	defaultGeminiTimeout       = 30 * time.Second
	defaultGeminiMaxRetries    = 2
)

type GeminiConfig struct {
	APIKey     string
	BaseURL    string
	HTTPClient HTTPClient
	Timeout    time.Duration
	MaxRetries int
}

type Gemini struct {
	client openai.Client
}

var _ Generator = (*Gemini)(nil)

func NewGemini(config GeminiConfig) (*Gemini, error) {
	apiKey := strings.TrimSpace(config.APIKey)
	if apiKey == "" {
		return nil, errors.New("Gemini API key is required")
	}
	baseURL := strings.TrimSpace(config.BaseURL)
	if baseURL == "" {
		baseURL = defaultGeminiOpenAIBaseURL
	}
	timeout := durationOrDefault(config.Timeout, defaultGeminiTimeout)
	maxRetries := config.MaxRetries
	if maxRetries == 0 {
		maxRetries = defaultGeminiMaxRetries
	}
	if timeout <= 0 || maxRetries < 0 {
		return nil, errors.New("Gemini timeout must be positive and retries must not be negative")
	}
	options := []option.RequestOption{
		option.WithAPIKey(apiKey),
		option.WithBaseURL(baseURL),
		option.WithRequestTimeout(timeout),
		option.WithMaxRetries(maxRetries),
	}
	if config.HTTPClient != nil {
		options = append(options, option.WithHTTPClient(config.HTTPClient))
	}
	return &Gemini{client: openai.NewClient(options...)}, nil
}

func (g *Gemini) Generate(ctx context.Context, request GenerateRequest) (GenerateResult, error) {
	chatRequest, requestOptions, err := buildGeminiRequest(request)
	if err != nil {
		return GenerateResult{}, err
	}
	var response openRouterChatCompletion
	requestOptions = append(requestOptions, option.WithResponseBodyInto(&response))
	_, err = g.client.Chat.Completions.New(ctx, chatRequest, requestOptions...)
	if err != nil {
		return GenerateResult{}, sanitizeGeminiError(err)
	}
	text := extractOpenRouterText(response)
	if text == "" {
		return GenerateResult{}, ErrEmptyResponse
	}
	model := strings.TrimSpace(response.Model)
	if model == "" {
		model = strings.TrimSpace(request.Model)
	}
	return GenerateResult{
		Text:      text,
		Model:     model,
		RequestID: response.ID,
		Usage:     openRouterUsage(response.Usage),
	}, nil
}

func buildGeminiRequest(request GenerateRequest) (openai.ChatCompletionNewParams, []option.RequestOption, error) {
	model := strings.TrimSpace(request.Model)
	if model == "" {
		return openai.ChatCompletionNewParams{}, nil, errors.New("AI model is required")
	}
	if strings.TrimSpace(request.UserPrompt) == "" && len(request.Parts) == 0 && len(request.Images) == 0 && len(request.Files) == 0 && len(request.Audio) == 0 && len(request.Videos) == 0 {
		return openai.ChatCompletionNewParams{}, nil, errors.New("AI user prompt, image, or file is required")
	}
	if request.MaxOutputTokens < 0 {
		return openai.ChatCompletionNewParams{}, nil, errors.New("AI maximum output tokens must not be negative")
	}
	if request.WebSearch.Enabled {
		return openai.ChatCompletionNewParams{}, nil, errors.New("Gemini compatibility provider web search is not enabled")
	}

	messages := make([]openai.ChatCompletionMessageParamUnion, 0, 2)
	if systemPrompt := strings.TrimSpace(request.SystemPrompt); systemPrompt != "" {
		messages = append(messages, openai.SystemMessage(systemPrompt))
	}
	content := make([]openai.ChatCompletionContentPartUnionParam, 0, len(request.Parts)*2+len(request.Images)+len(request.Files)+len(request.Audio)+len(request.Videos)+1)
	if userPrompt := strings.TrimSpace(request.UserPrompt); userPrompt != "" {
		content = append(content, openai.TextContentPart(userPrompt))
	}
	for _, part := range request.Parts {
		items, err := openRouterMultimodalPartContent(part)
		if err != nil {
			return openai.ChatCompletionNewParams{}, nil, err
		}
		content = append(content, items...)
	}
	for _, image := range request.Images {
		item, err := openRouterImageContent(image)
		if err != nil {
			return openai.ChatCompletionNewParams{}, nil, err
		}
		content = append(content, item)
	}
	for _, file := range request.Files {
		item, err := openRouterFileContent(file)
		if err != nil {
			return openai.ChatCompletionNewParams{}, nil, err
		}
		content = append(content, item)
	}
	for _, audio := range request.Audio {
		item, err := openRouterAudioContent(audio)
		if err != nil {
			return openai.ChatCompletionNewParams{}, nil, err
		}
		content = append(content, item)
	}
	for _, video := range request.Videos {
		item, err := openRouterVideoContent(video)
		if err != nil {
			return openai.ChatCompletionNewParams{}, nil, err
		}
		content = append(content, item)
	}
	messages = append(messages, openai.UserMessage(content))

	chatRequest := openai.ChatCompletionNewParams{
		Messages: messages,
		Model:    model,
	}
	if request.ResponseSchema != nil {
		responseFormat, err := openRouterResponseFormat(*request.ResponseSchema)
		if err != nil {
			return openai.ChatCompletionNewParams{}, nil, err
		}
		chatRequest.ResponseFormat.OfJSONSchema = &responseFormat
	}
	if request.MaxOutputTokens > 0 {
		chatRequest.MaxCompletionTokens = param.NewOpt(request.MaxOutputTokens)
	}
	return chatRequest, []option.RequestOption{option.WithJSONSet("stream", false)}, nil
}

func sanitizeGeminiError(err error) error {
	if errors.Is(err, context.Canceled) {
		return context.Canceled
	}
	if errors.Is(err, context.DeadlineExceeded) {
		return context.DeadlineExceeded
	}
	return &ProviderError{Provider: "Gemini", StatusCode: openRouterStatusCode(err)}
}
