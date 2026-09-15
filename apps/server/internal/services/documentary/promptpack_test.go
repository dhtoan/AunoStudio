package documentary

import (
	"strings"
	"testing"

	"github.com/stretchr/testify/require"
)

func TestSerializePromptPackUsesIndependentPromptBlocks(t *testing.T) {
	t.Parallel()

	pack := SerializePromptPack([]VisualPlan{
		{BeatID: "beat-01", Prompt: "First independent visual prompt."},
		{BeatID: "beat-02", Prompt: "Second independent visual prompt."},
		{BeatID: "beat-03", Prompt: "Third independent visual prompt."},
	})

	require.Equal(t, 2, strings.Count(pack, "\n\n"))
	require.NotContains(t, pack, "Beat 1")
	require.NotContains(t, pack, "#1")
	require.Equal(t, "First independent visual prompt.\n\nSecond independent visual prompt.\n\nThird independent visual prompt.", pack)
}
