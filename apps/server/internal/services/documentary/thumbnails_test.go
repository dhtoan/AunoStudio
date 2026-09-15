package documentary

import (
	"encoding/json"
	"testing"

	"github.com/openpost/backend/internal/ai"
	"github.com/stretchr/testify/require"
)

func documentaryThumbnailsJSON(count int, textElements []string) string {
	plans := make([]map[string]any, 0, count)
	for index := 0; index < count; index++ {
		plans = append(plans, map[string]any{
			"hero":          "One dominant archival object",
			"headline":      "THE RECORD",
			"text_elements": textElements,
			"prompt":        "High-contrast 16:9 archival paper collage with one dominant object and restrained red evidence mark.",
		})
	}
	encoded, _ := json.Marshal(map[string]any{"thumbnails": plans})
	return string(encoded)
}

func TestGenerateThumbnailsRequiresExactlyThreeBoundedCandidates(t *testing.T) {
	t.Parallel()

	generator := &documentaryGeneratorStub{result: ai.GenerateResult{
		Text:  documentaryThumbnailsJSON(3, []string{"THE RECORD", "1974"}),
		Model: "fixture-model",
	}}
	service, err := New(generator, "fixture-model")
	require.NoError(t, err)
	input := ThumbnailsInput{
		RunID:    "run-1",
		Language: "en-US",
		Title:    "A factual documentary",
		Script:   Script{Text: "A factual narration.", Fingerprint: "script-fp"},
	}

	result, err := service.GenerateThumbnails(t.Context(), input)
	require.NoError(t, err)
	require.Len(t, result.Plans, 3)
	require.Equal(t, "thumbnail-01", result.Plans[0].ID)

	generator.result.Text = documentaryThumbnailsJSON(2, nil)
	_, err = service.GenerateThumbnails(t.Context(), input)
	require.ErrorIs(t, err, ErrInvalidResponse)

	generator.result.Text = documentaryThumbnailsJSON(3, []string{"ONE", "TWO", "THREE"})
	_, err = service.GenerateThumbnails(t.Context(), input)
	require.ErrorIs(t, err, ErrInvalidResponse)

	generator.result.Text = documentaryThumbnailsJSON(3, []string{"ONE TWO THREE FOUR"})
	_, err = service.GenerateThumbnails(t.Context(), input)
	require.ErrorIs(t, err, ErrInvalidResponse)
}
