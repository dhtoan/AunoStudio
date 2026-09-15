package documentary

import (
	"testing"

	"github.com/stretchr/testify/require"
)

func TestValidateDurationAllowsOnlyDocumentaryPresets(t *testing.T) {
	t.Parallel()

	for _, seconds := range []int{30, 60, 120, 180, 300} {
		require.NoError(t, ValidateDuration(seconds))
	}
	for _, seconds := range []int{10, 45, 90, 301} {
		require.ErrorIs(t, ValidateDuration(seconds), ErrInvalid)
	}
}

func TestValidateVisualIntentRejectsUnknownIntent(t *testing.T) {
	t.Parallel()

	require.NoError(t, ValidateVisualIntent(VisualIntentArchivalPhoto))
	require.NoError(t, ValidateVisualIntent(VisualIntentMotionComposition))
	require.ErrorIs(t, ValidateVisualIntent(VisualIntent("glowing-3d-logo")), ErrInvalid)
}
