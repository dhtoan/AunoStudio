package documentary

import (
	"encoding/json"
	"testing"

	"github.com/openpost/backend/internal/ai"
	"github.com/stretchr/testify/require"
)

func documentaryVisualsJSON(intent string, supports []string, label string) string {
	encoded, _ := json.Marshal(map[string]any{
		"plans": []map[string]any{{
			"beat_id":              "beat-01-abcdef12",
			"visual_intent":        intent,
			"hero":                 "A declassified paper record",
			"supports":             supports,
			"label":                label,
			"prompt":               "Aged archival paper composition with one document hero, visible fibers, restrained red notation, matte editorial lighting.",
			"required_subject_ids": []string{"document-hero"},
			"animation": map[string]any{
				"camera":         "locked",
				"cadence":        "stepped",
				"assembly_order": "back-to-front",
				"hold_ratio":     0.30,
				"ambient_life":   []string{"paper-corner-lift"},
			},
		}},
	})
	return string(encoded)
}

func TestGenerateVisualsValidatesIntentSupportsAndLabel(t *testing.T) {
	t.Parallel()

	generator := &documentaryGeneratorStub{result: ai.GenerateResult{
		Text:  documentaryVisualsJSON("paper-document", []string{"red stamp", "date strip"}, "ARCHIVE RECORD"),
		Model: "fixture-model",
	}}
	service, err := New(generator, "fixture-model")
	require.NoError(t, err)
	beat := Beat{ID: "beat-01-abcdef12", Narration: "The archive preserved one decisive record.", VisualIntent: VisualIntentPaperDocument, DurationSeconds: 2.5}

	result, err := service.GenerateVisuals(t.Context(), VisualsInput{RunID: "run-1", Language: "en-US", Beats: []Beat{beat}})
	require.NoError(t, err)
	require.Len(t, result.Plans, 1)
	require.Equal(t, VisualIntentPaperDocument, result.Plans[0].VisualIntent)
	require.Equal(t, 0.30, result.Plans[0].Animation.HoldRatio)

	generator.result.Text = documentaryVisualsJSON("unknown-style", nil, "LABEL")
	_, err = service.GenerateVisuals(t.Context(), VisualsInput{RunID: "run-1", Language: "en-US", Beats: []Beat{beat}})
	require.ErrorIs(t, err, ErrInvalidResponse)

	generator.result.Text = documentaryVisualsJSON("paper-document", []string{"1", "2", "3", "4"}, "LABEL")
	_, err = service.GenerateVisuals(t.Context(), VisualsInput{RunID: "run-1", Language: "en-US", Beats: []Beat{beat}})
	require.ErrorIs(t, err, ErrInvalidResponse)

	generator.result.Text = documentaryVisualsJSON("paper-document", nil, "ONE TWO THREE FOUR FIVE")
	_, err = service.GenerateVisuals(t.Context(), VisualsInput{RunID: "run-1", Language: "en-US", Beats: []Beat{beat}})
	require.ErrorIs(t, err, ErrInvalidResponse)
}
