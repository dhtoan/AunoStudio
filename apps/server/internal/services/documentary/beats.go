package documentary

import (
	"context"
	"fmt"
	"math"
	"strings"
	"unicode"
)

func (s *Service) GenerateBeats(_ context.Context, input BeatsInput) (BeatsResult, error) {
	beats, err := SegmentBeats(input.RunID, input.Script, input.TargetDurationSeconds)
	if err != nil {
		return BeatsResult{}, err
	}
	return BeatsResult{Beats: beats, Model: "deterministic:documentary-beats-v1"}, nil
}

func SegmentBeats(runID string, script Script, targetDurationSeconds int) ([]Beat, error) {
	runID = strings.TrimSpace(runID)
	text := strings.Join(strings.Fields(script.Text), " ")
	if runID == "" || text == "" {
		return nil, ErrInvalid
	}
	if err := ValidateDuration(targetDurationSeconds); err != nil {
		return nil, err
	}
	fingerprint := strings.TrimSpace(script.Fingerprint)
	if fingerprint == "" {
		fingerprint = Fingerprint(runID, text)
	}

	targetCount := max(1, int(math.Round(float64(targetDurationSeconds)/2.5)))
	units := splitDocumentaryClauses(text)
	units = rebalanceNarrationUnits(units, targetCount)
	if len(units) == 0 {
		return nil, ErrInvalid
	}

	duration := float64(targetDurationSeconds) / float64(len(units))
	digits := 2
	if len(units) >= 100 {
		digits = 3
	}
	beats := make([]Beat, 0, len(units))
	cursor := 0.0
	for index, unit := range units {
		narration := strings.TrimSpace(unit)
		suffix := Fingerprint(runID, fingerprint, narration)
		beats = append(beats, Beat{
			ID:              fmt.Sprintf("beat-%0*d-%s", digits, index+1, suffix[:8]),
			Index:           index,
			Narration:       narration,
			StartSeconds:    cursor,
			DurationSeconds: duration,
			CoreIdea:        documentaryCoreIdea(narration),
			EvidenceRefs:    append([]string(nil), script.EvidenceRefs...),
			VisualIntent:    VisualIntentArchivalPhoto,
		})
		cursor += duration
	}
	return beats, nil
}

func splitDocumentaryClauses(text string) []string {
	words := strings.Fields(text)
	if len(words) == 0 {
		return nil
	}
	result := make([]string, 0)
	current := make([]string, 0, 12)
	flush := func() {
		if len(current) == 0 {
			return
		}
		result = append(result, strings.Join(current, " "))
		current = current[:0]
	}
	for _, word := range words {
		current = append(current, word)
		last := rune(word[len(word)-1])
		if strings.ContainsRune(".!?;:", last) {
			flush()
		}
	}
	flush()
	return result
}

func rebalanceNarrationUnits(units []string, target int) []string {
	result := append([]string(nil), units...)
	for len(result) < target {
		index := largestSplittableUnit(result)
		if index < 0 {
			break
		}
		left, right := splitNarrationUnit(result[index])
		if left == "" || right == "" {
			break
		}
		next := make([]string, 0, len(result)+1)
		next = append(next, result[:index]...)
		next = append(next, left, right)
		next = append(next, result[index+1:]...)
		result = next
	}
	for len(result) > target && len(result) > 1 {
		index := smallestAdjacentPair(result)
		result[index] = strings.TrimSpace(result[index] + " " + result[index+1])
		result = append(result[:index+1], result[index+2:]...)
	}
	return result
}

func largestSplittableUnit(units []string) int {
	index := -1
	largest := 0
	for candidate, unit := range units {
		count := len(strings.Fields(unit))
		if count >= 6 && count > largest {
			index = candidate
			largest = count
		}
	}
	return index
}

func splitNarrationUnit(unit string) (string, string) {
	words := strings.Fields(unit)
	if len(words) < 6 {
		return "", ""
	}
	midpoint := len(words) / 2
	best := -1
	bestDistance := len(words)
	for index := 3; index <= len(words)-3; index++ {
		previous := strings.TrimRightFunc(words[index-1], unicode.IsPunct)
		previousRaw := words[index-1]
		current := strings.ToLower(strings.Trim(words[index], " ,.;:!?\"'"))
		boundary := strings.HasSuffix(previousRaw, ",") ||
			current == "and" || current == "but" || current == "while" || current == "because" || current == "although" || current == "when"
		_ = previous
		if !boundary {
			continue
		}
		distance := absInt(index - midpoint)
		if distance < bestDistance {
			best = index
			bestDistance = distance
		}
	}
	if best < 0 {
		best = midpoint
		if best < 3 {
			best = 3
		}
		if len(words)-best < 3 {
			best = len(words) - 3
		}
	}
	return strings.Join(words[:best], " "), strings.Join(words[best:], " ")
}

func smallestAdjacentPair(units []string) int {
	best := 0
	bestSize := len(strings.Fields(units[0])) + len(strings.Fields(units[1]))
	for index := 1; index < len(units)-1; index++ {
		size := len(strings.Fields(units[index])) + len(strings.Fields(units[index+1]))
		if size < bestSize {
			best = index
			bestSize = size
		}
	}
	return best
}

func documentaryCoreIdea(narration string) string {
	words := strings.Fields(narration)
	if len(words) > 12 {
		words = words[:12]
	}
	return strings.TrimSpace(strings.Join(words, " "))
}

func absInt(value int) int {
	if value < 0 {
		return -value
	}
	return value
}
