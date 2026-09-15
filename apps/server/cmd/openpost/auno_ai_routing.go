package main

import (
    "os"
    "strings"

    "github.com/openpost/backend/internal/ai"
    "github.com/openpost/backend/internal/config"
    "github.com/openpost/backend/internal/services/autovideo"
)

func aunoAutoVideoPlanner(cfg *config.Config, openRouterGenerator ai.Generator) (autovideo.Planner, string, string, error) {
    provider := strings.ToLower(strings.TrimSpace(os.Getenv("AUNO_AI_PROVIDER")))
    if provider == "" {
        provider = "auto"
    }
    geminiKey := firstAunoEnv("AUNO_GEMINI_API_KEY", "GEMINI_API_KEY", "GOOGLE_API_KEY")
    useGemini := provider == "gemini" || (provider == "auto" && geminiKey != "")
    if useGemini && geminiKey != "" {
        model := strings.TrimSpace(os.Getenv("AUNO_GEMINI_MODEL"))
        if model == "" {
            model = "gemini-2.5-flash"
        }
        generator, err := ai.NewGemini(ai.GeminiConfig{
            APIKey: geminiKey,
            BaseURL: strings.TrimSpace(os.Getenv("AUNO_GEMINI_BASE_URL")),
            Timeout: contentAIRequestTimeout,
            MaxRetries: 2,
        })
        if err != nil {
            return nil, "", "", err
        }
        planner, err := autovideo.New(generator, model)
        return planner, model, "gemini", err
    }
    if provider != "auto" && provider != "openrouter" && provider != "gemini" {
        return nil, "", "", nil
    }
    if openRouterGenerator == nil {
        return nil, "", "", nil
    }
    planner, err := autovideo.New(openRouterGenerator, cfg.TextGenerationModel)
    return planner, cfg.TextGenerationModel, "openrouter", err
}

func firstAunoEnv(keys ...string) string {
    for _, key := range keys {
        if value := strings.TrimSpace(os.Getenv(key)); value != "" {
            return value
        }
    }
    return ""
}
