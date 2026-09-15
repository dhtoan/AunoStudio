from pathlib import Path


def replace_once(text: str, old: str, new: str, label: str) -> str:
    if old not in text:
        raise SystemExit(f"missing {label} anchor")
    return text.replace(old, new, 1)


gemini = Path("apps/server/internal/ai/gemini.go")
text = gemini.read_text()
text = text.replace("for index, part := range request.Parts {", "for _, part := range request.Parts {")
text = text.replace(
    'return openai.ChatCompletionNewParams{}, nil, errors.New("invalid Gemini multimodal part at index " + string(rune(index)))',
    'return openai.ChatCompletionNewParams{}, nil, err',
)
gemini.write_text(text)

routing = Path("apps/server/cmd/openpost/auno_ai_routing.go")
routing.write_text(
    '''package main

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
'''
)

main = Path("apps/server/cmd/openpost/main.go")
text = main.read_text()
old = '''\tif contentGenerator != nil {\n\t\tpostBuilder, err = postgeneration.New(contentGenerator, cfg.TextGenerationModel, aiPromptService)\n\t\tif err != nil {\n\t\t\tfatalfWithDiagnostics(diagnosticsReporter, "failed to initialize AI post builder: %v", err)\n\t\t}\n\t\tlog.Printf(\n\t\t\t"AI post builder enabled with model %s provider %s zero_data_retention=%t",\n\t\t\tcfg.TextGenerationModel,\n\t\t\tcfg.ContentAIProvider,\n\t\t\tcfg.ContentAIRequireZDR,\n\t\t)\n\t\tautoVideoPlanner, err = autovideo.New(contentGenerator, cfg.TextGenerationModel)\n\t\tif err != nil {\n\t\t\tfatalfWithDiagnostics(diagnosticsReporter, "failed to initialize Auno Auto Video planner: %v", err)\n\t\t}\n\t\tlog.Printf("Auno Auto Video planner enabled with model %s", cfg.TextGenerationModel)\n\t}\n'''
new = '''\tif contentGenerator != nil {\n\t\tpostBuilder, err = postgeneration.New(contentGenerator, cfg.TextGenerationModel, aiPromptService)\n\t\tif err != nil {\n\t\t\tfatalfWithDiagnostics(diagnosticsReporter, "failed to initialize AI post builder: %v", err)\n\t\t}\n\t\tlog.Printf(\n\t\t\t"AI post builder enabled with model %s provider %s zero_data_retention=%t",\n\t\t\tcfg.TextGenerationModel,\n\t\t\tcfg.ContentAIProvider,\n\t\t\tcfg.ContentAIRequireZDR,\n\t\t)\n\t}\n\tautoVideoPlanner, autoVideoModel, autoVideoProvider, err := aunoAutoVideoPlanner(cfg, contentGenerator)\n\tif err != nil {\n\t\tfatalfWithDiagnostics(diagnosticsReporter, "failed to initialize Auno Auto Video planner: %v", err)\n\t}\n\tif autoVideoPlanner != nil {\n\t\tlog.Printf("Auno Auto Video planner enabled with model %s via %s", autoVideoModel, autoVideoProvider)\n\t}\n'''
text = replace_once(text, old, new, "main Auto Video AI")
main.write_text(text)

env = Path(".env.example")
text = env.read_text()
anchor = "OPENROUTER_API_KEY=\n"
insert = anchor + "\n# Auno Auto Video AI routing. auto prefers Gemini when an official Gemini key is present.\nAUNO_AI_PROVIDER=auto\nAUNO_GEMINI_API_KEY=\nAUNO_GEMINI_BASE_URL=\nAUNO_GEMINI_MODEL=gemini-2.5-flash\n"
if "AUNO_AI_PROVIDER=" not in text:
    text = replace_once(text, anchor, insert, "env OpenRouter")
env.write_text(text)
