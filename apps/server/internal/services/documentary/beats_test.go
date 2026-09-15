package documentary

import (
	"strings"
	"testing"

	"github.com/stretchr/testify/require"
)

func TestSegmentBeatsProducesStableTwoToThreeSecondTimeline(t *testing.T) {
	t.Parallel()

	words := make([]string, 150)
	for index := range words {
		words[index] = "evidence"
	}
	script := Script{Text: strings.Join(words, " "), Fingerprint: "script-fingerprint"}

	first, err := SegmentBeats("run-1", script, 60)
	require.NoError(t, err)
	second, err := SegmentBeats("run-1", script, 60)
	require.NoError(t, err)
	require.Equal(t, first, second)
	require.Len(t, first, 24)

	var total float64
	for index, beat := range first {
		require.GreaterOrEqual(t, beat.DurationSeconds, 2.0)
		require.LessOrEqual(t, beat.DurationSeconds, 3.0)
		require.InDelta(t, total, beat.StartSeconds, 0.000001)
		require.Equal(t, index, beat.Index)
		require.NotEmpty(t, beat.ID)
		total += beat.DurationSeconds
	}
	require.InDelta(t, 60.0, total, 0.000001)
}

func TestSegmentBeatsFiveMinutesScalesToOneHundredTwentyBeats(t *testing.T) {
	t.Parallel()

	words := make([]string, 750)
	for index := range words {
		words[index] = "archive"
	}
	beats, err := SegmentBeats("run-five", Script{Text: strings.Join(words, " "), Fingerprint: "five"}, 300)
	require.NoError(t, err)
	require.Len(t, beats, 120)
	require.True(t, strings.HasPrefix(beats[0].ID, "beat-001-"))
	require.True(t, strings.HasPrefix(beats[119].ID, "beat-120-"))
}
