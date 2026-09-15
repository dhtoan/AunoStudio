//go:build dev

package main

import (
	"context"
	"encoding/json"
	"strings"
	"testing"

	"github.com/openpost/backend/internal/ai"
	"github.com/stretchr/testify/require"
)

func TestAunoE2EPlannerGeneratorIsOptInAndStructured(t *testing.T) {
	disabled, err := aunoE2EPlannerGenerator(false)
	require.NoError(t, err)
	require.Nil(t, disabled)

	generator, err := aunoE2EPlannerGenerator(true)
	require.NoError(t, err)
	require.NotNil(t, generator)

	ideas, err := generator.Generate(context.Background(), ai.GenerateRequest{
		Model:          "fixture",
		UserPrompt:     `{"run_id":"run-e2e","custom_topic":"A deterministic investigation"}`,
		ResponseSchema: &ai.JSONSchema{Name: "documentary_ideas"},
	})
	require.NoError(t, err)
	var ideaPayload struct {
		Ideas []map[string]any `json:"ideas"`
	}
	require.NoError(t, json.Unmarshal([]byte(ideas.Text), &ideaPayload))
	require.Len(t, ideaPayload.Ideas, 10)

	script, err := generator.Generate(context.Background(), ai.GenerateRequest{
		Model:          "fixture",
		UserPrompt:     `{"run_id":"run-e2e","target_word_count":750}`,
		ResponseSchema: &ai.JSONSchema{Name: "documentary_script"},
	})
	require.NoError(t, err)
	var scriptPayload struct {
		Text string `json:"text"`
	}
	require.NoError(t, json.Unmarshal([]byte(script.Text), &scriptPayload))
	require.Len(t, strings.Fields(scriptPayload.Text), 750)

	visuals, err := generator.Generate(context.Background(), ai.GenerateRequest{
		Model: "fixture",
		UserPrompt: `{"run_id":"run-e2e","beats":[` +
			`{"id":"beat-001","index":0,"narration":"One precise fact.","visual_intent":"archival-photo"},` +
			`{"id":"beat-002","index":1,"narration":"Another precise fact.","visual_intent":"archival-photo"}]}`,
		ResponseSchema: &ai.JSONSchema{Name: "documentary_visual_plans"},
	})
	require.NoError(t, err)
	var visualPayload struct {
		Plans []struct {
			BeatID string `json:"beat_id"`
		} `json:"plans"`
	}
	require.NoError(t, json.Unmarshal([]byte(visuals.Text), &visualPayload))
	require.Len(t, visualPayload.Plans, 2)
	require.Equal(t, "beat-001", visualPayload.Plans[0].BeatID)
	require.Equal(t, "beat-002", visualPayload.Plans[1].BeatID)
}
