//go:build !dev

package main

import (
	"testing"

	"github.com/stretchr/testify/require"
)

func TestAunoE2EPlannerGeneratorIsUnavailableInProduction(t *testing.T) {
	disabled, err := aunoE2EPlannerGenerator(false)
	require.NoError(t, err)
	require.Nil(t, disabled)

	enabled, err := aunoE2EPlannerGenerator(true)
	require.Error(t, err)
	require.Nil(t, enabled)
	require.Contains(t, err.Error(), "production")
}
