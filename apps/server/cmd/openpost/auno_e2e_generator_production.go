//go:build !dev

package main

import (
	"fmt"

	"github.com/openpost/backend/internal/ai"
)

func aunoE2EPlannerGenerator(enabled bool) (ai.Generator, error) {
	if !enabled {
		return nil, nil
	}
	return nil, fmt.Errorf("Auno E2E planner fixtures are unavailable in production builds")
}
