package documentary

import (
	"testing"

	"github.com/stretchr/testify/require"
)

func TestFingerprintIsStableAndOrderSensitive(t *testing.T) {
	t.Parallel()

	require.Equal(t, Fingerprint("script", "300", "abc"), Fingerprint("script", "300", "abc"))
	require.NotEqual(t, Fingerprint("script", "300", "abc"), Fingerprint("abc", "300", "script"))
}

func TestInvalidateFromDurationStalesOnlyDependentSteps(t *testing.T) {
	t.Parallel()

	run := &Run{StepStates: map[Step]StepState{}}
	for _, step := range AllSteps() {
		run.StepStates[step] = StepState{Fingerprint: string(step), Status: StepStatusReady}
	}

	InvalidateFrom(run, StepDuration)

	for _, step := range []Step{StepScript, StepVoice, StepBeats, StepVisuals, StepAnimation} {
		require.Equal(t, StepStatusStale, run.StepStates[step].Status, step)
	}
	for _, step := range []Step{StepSource, StepTopic, StepIdeas, StepDuration} {
		require.Equal(t, StepStatusReady, run.StepStates[step].Status, step)
	}
}

func TestInvalidateFromMotionDoesNotInvalidateNarration(t *testing.T) {
	t.Parallel()

	run := &Run{StepStates: map[Step]StepState{
		StepScript:    {Status: StepStatusReady},
		StepVoice:     {Status: StepStatusReady},
		StepBeats:     {Status: StepStatusReady},
		StepVisuals:   {Status: StepStatusReady},
		StepAnimation: {Status: StepStatusReady},
	}}

	InvalidateFrom(run, StepAnimation)

	require.Equal(t, StepStatusReady, run.StepStates[StepScript].Status)
	require.Equal(t, StepStatusReady, run.StepStates[StepVoice].Status)
	require.Equal(t, StepStatusReady, run.StepStates[StepBeats].Status)
	require.Equal(t, StepStatusReady, run.StepStates[StepVisuals].Status)
	require.Equal(t, StepStatusReady, run.StepStates[StepAnimation].Status)
}
