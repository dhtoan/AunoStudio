package documentary

import (
	"context"
	"encoding/json"
	"fmt"
	"testing"

	"github.com/openpost/backend/internal/ai"
	"github.com/stretchr/testify/require"
)

type documentaryGeneratorStub struct {
	result  ai.GenerateResult
	request ai.GenerateRequest
	err     error
}

func (s *documentaryGeneratorStub) Generate(_ context.Context, request ai.GenerateRequest) (ai.GenerateResult, error) {
	s.request = request
	return s.result, s.err
}

func documentaryIdeasJSON(count int, duplicateSubterritory bool) string {
	ideas := make([]map[string]any, 0, count)
	for index := 0; index < count; index++ {
		subterritory := fmt.Sprintf("territory-%02d", index+1)
		if duplicateSubterritory && index == count-1 {
			subterritory = "territory-01"
		}
		ideas = append(ideas, map[string]any{
			"title":            fmt.Sprintf("Documentary idea %02d", index+1),
			"hook":             fmt.Sprintf("Evidence-led hook %02d", index+1),
			"subterritory":     subterritory,
			"evidence_anchors": []string{fmt.Sprintf("anchor-%02d", index+1)},
		})
	}
	encoded, _ := json.Marshal(map[string]any{"ideas": ideas})
	return string(encoded)
}

func TestGenerateIdeasRequiresExactlyTenDistinctCandidates(t *testing.T) {
	t.Parallel()

	generator := &documentaryGeneratorStub{result: ai.GenerateResult{Text: documentaryIdeasJSON(10, false), Model: "fixture-model"}}
	service, err := New(generator, "fixture-model")
	require.NoError(t, err)

	part := ai.MultimodalPart{SourceID: "source-image", Image: &ai.Image{Data: []byte{1}, MIMEType: "image/png"}}
	result, err := service.GenerateIdeas(t.Context(), IdeasInput{
		RunID:    "run-1",
		Language: "en-US",
		Niche:    "History",
		Parts:    []ai.MultimodalPart{part},
	})
	require.NoError(t, err)
	require.Len(t, result.Ideas, 10)
	require.Equal(t, "idea-01", result.Ideas[0].ID)
	require.Equal(t, "idea-10", result.Ideas[9].ID)
	require.Equal(t, "source-image", generator.request.Parts[0].SourceID)
	require.NotNil(t, generator.request.ResponseSchema)

	for _, count := range []int{9, 11} {
		generator.result.Text = documentaryIdeasJSON(count, false)
		_, err = service.GenerateIdeas(t.Context(), IdeasInput{RunID: "run-1", Language: "en-US", Niche: "History"})
		require.ErrorIs(t, err, ErrInvalidResponse)
	}

	generator.result.Text = documentaryIdeasJSON(10, true)
	_, err = service.GenerateIdeas(t.Context(), IdeasInput{RunID: "run-1", Language: "en-US", Niche: "History"})
	require.ErrorIs(t, err, ErrInvalidResponse)
}
