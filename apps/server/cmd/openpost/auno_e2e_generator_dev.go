//go:build dev

package main

import (
	"context"
	"encoding/json"
	"fmt"
	"strings"

	"github.com/openpost/backend/internal/ai"
)

type aunoE2EGenerator struct{}

type aunoE2EVisualBeat struct {
	ID           string `json:"id"`
	Index        int    `json:"index"`
	Narration    string `json:"narration"`
	VisualIntent string `json:"visual_intent"`
}

func aunoE2EPlannerGenerator(enabled bool) (ai.Generator, error) {
	if !enabled {
		return nil, nil
	}
	return aunoE2EGenerator{}, nil
}

func (aunoE2EGenerator) Generate(_ context.Context, request ai.GenerateRequest) (ai.GenerateResult, error) {
	if request.ResponseSchema == nil {
		return ai.GenerateResult{}, fmt.Errorf("Auno E2E fixture requires a response schema")
	}
	var text string
	var err error
	switch request.ResponseSchema.Name {
	case "documentary_ideas":
		text, err = aunoE2EIdeas()
	case "documentary_script":
		text, err = aunoE2EScript(request.UserPrompt)
	case "documentary_visual_plans":
		text, err = aunoE2EVisualPlans(request.UserPrompt)
	default:
		err = fmt.Errorf("Auno E2E fixture does not support schema %q", request.ResponseSchema.Name)
	}
	if err != nil {
		return ai.GenerateResult{}, err
	}
	return ai.GenerateResult{Text: text, Model: "auno-e2e-fixture", RequestID: "auno-e2e-fixture"}, nil
}

func aunoE2EIdeas() (string, error) {
	type idea struct {
		Title           string   `json:"title"`
		Hook            string   `json:"hook"`
		Subterritory    string   `json:"subterritory"`
		EvidenceAnchors []string `json:"evidence_anchors"`
	}
	ideas := make([]idea, 10)
	for index := range ideas {
		number := index + 1
		ideas[index] = idea{
			Title:           fmt.Sprintf("Documentary evidence trail %02d", number),
			Hook:            fmt.Sprintf("Record %02d reveals one verifiable turn in the investigation.", number),
			Subterritory:    fmt.Sprintf("evidence-territory-%02d", number),
			EvidenceAnchors: []string{},
		}
	}
	payload := struct {
		Ideas []idea `json:"ideas"`
	}{Ideas: ideas}
	encoded, err := json.Marshal(payload)
	return string(encoded), err
}

func aunoE2EScript(userPrompt string) (string, error) {
	var input struct {
		TargetWordCount int `json:"target_word_count"`
	}
	if err := json.Unmarshal([]byte(userPrompt), &input); err != nil {
		return "", fmt.Errorf("decode documentary script fixture input: %w", err)
	}
	target := input.TargetWordCount
	if target <= 0 {
		target = 750
	}
	words := make([]string, 0, target)
	for index := 0; len(words) < target; index++ {
		sentence := []string{
			"Record",
			fmt.Sprintf("%03d", index+1),
			"traces",
			"one",
			"verified",
			"event.",
		}
		remaining := target - len(words)
		if remaining < len(sentence) {
			sentence = sentence[:remaining]
		}
		words = append(words, sentence...)
	}
	payload := struct {
		Text         string   `json:"text"`
		EvidenceRefs []string `json:"evidence_refs"`
	}{Text: strings.Join(words, " "), EvidenceRefs: []string{}}
	encoded, err := json.Marshal(payload)
	return string(encoded), err
}

func aunoE2EVisualPlans(userPrompt string) (string, error) {
	var input struct {
		Beats []aunoE2EVisualBeat `json:"beats"`
	}
	if err := json.Unmarshal([]byte(userPrompt), &input); err != nil {
		return "", fmt.Errorf("decode documentary visual fixture input: %w", err)
	}
	if len(input.Beats) == 0 {
		return "", fmt.Errorf("documentary visual fixture requires beats")
	}
	type animation struct {
		Camera        string   `json:"camera"`
		Cadence       string   `json:"cadence"`
		AssemblyOrder string   `json:"assembly_order"`
		HoldRatio     float64  `json:"hold_ratio"`
		AmbientLife   []string `json:"ambient_life"`
	}
	type plan struct {
		BeatID             string    `json:"beat_id"`
		VisualIntent       string    `json:"visual_intent"`
		Hero               string    `json:"hero"`
		Supports           []string  `json:"supports"`
		Label              string    `json:"label"`
		Prompt             string    `json:"prompt"`
		RequiredSubjectIDs []string  `json:"required_subject_ids"`
		Animation          animation `json:"animation"`
	}
	intents := []string{"motion-composition", "paper-document", "map", "number-card", "connection-board"}
	plans := make([]plan, 0, len(input.Beats))
	for index, beat := range input.Beats {
		beatID := strings.TrimSpace(beat.ID)
		if beatID == "" {
			return "", fmt.Errorf("documentary visual fixture beat %d is missing id", index)
		}
		intent := intents[index%len(intents)]
		plans = append(plans, plan{
			BeatID:             beatID,
			VisualIntent:       intent,
			Hero:               fmt.Sprintf("Evidence panel %03d", beat.Index+1),
			Supports:           []string{"paper evidence", "red annotation"},
			Label:              fmt.Sprintf("Evidence %03d", beat.Index+1),
			Prompt:             fmt.Sprintf("Original archival editorial evidence composition for %s with aged paper, restrained red annotations, and clear negative space.", beatID),
			RequiredSubjectIDs: []string{},
			Animation: animation{
				Camera:        "locked",
				Cadence:       "stepped",
				AssemblyOrder: "back-to-front",
				HoldRatio:     0.2,
				AmbientLife:   []string{"paper-corner-lift"},
			},
		})
	}
	payload := struct {
		Plans []plan `json:"plans"`
	}{Plans: plans}
	encoded, err := json.Marshal(payload)
	return string(encoded), err
}
