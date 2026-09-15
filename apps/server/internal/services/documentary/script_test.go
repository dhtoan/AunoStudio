package documentary

import (
	"encoding/json"
	"strings"
	"testing"

	"github.com/openpost/backend/internal/ai"
	"github.com/stretchr/testify/require"
)

func documentaryScriptJSON(text string) string {
	encoded, _ := json.Marshal(map[string]any{
		"text":          text,
		"evidence_refs": []string{"archive-record-1"},
	})
	return string(encoded)
}

func TestTargetWordCountUsesDocumentaryNarrationRate(t *testing.T) {
	t.Parallel()
	require.Equal(t, 75, targetWordCount(30))
	require.Equal(t, 750, targetWordCount(300))
}

func TestGenerateScriptCalculatesWordCountAndFingerprintServerSide(t *testing.T) {
	t.Parallel()

	text := strings.TrimSpace(strings.Repeat("evidence ", 75))
	generator := &documentaryGeneratorStub{result: ai.GenerateResult{Text: documentaryScriptJSON(text), Model: "fixture-model"}}
	service, err := New(generator, "fixture-model")
	require.NoError(t, err)

	result, err := service.GenerateScript(t.Context(), ScriptInput{
		RunID:                "run-1",
		Language:             "en-US",
		Idea:                 &Idea{ID: "idea-01", Title: "A factual history", Hook: "An archival record"},
		TargetDurationSeconds: 30,
	})
	require.NoError(t, err)
	require.Equal(t, 75, result.Script.WordCount)
	require.Equal(t, 75, result.Script.TargetWordCount)
	require.NotEmpty(t, result.Script.Fingerprint)
	require.Empty(t, result.Script.Diagnostics)
}

func TestGenerateScriptRejectsSectionHeadings(t *testing.T) {
	t.Parallel()

	generator := &documentaryGeneratorStub{result: ai.GenerateResult{Text: documentaryScriptJSON("CHAPTER 1\nA narration begins here."), Model: "fixture-model"}}
	service, err := New(generator, "fixture-model")
	require.NoError(t, err)

	_, err = service.GenerateScript(t.Context(), ScriptInput{
		RunID:                "run-1",
		Language:             "en-US",
		CustomTopic:          "A factual topic",
		TargetDurationSeconds: 60,
	})
	require.ErrorIs(t, err, ErrInvalidResponse)
}
