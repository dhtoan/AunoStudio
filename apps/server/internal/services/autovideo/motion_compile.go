package autovideo

import "github.com/openpost/backend/internal/aunomotion"

// MotionCompileInput is the narrow server/headless seam between Auto Video
// planning and Auno Motion. It intentionally reuses aunomotion's native overlay
// contract instead of defining a second project/timeline model in this service.
type MotionCompileInput struct {
	Graph  aunomotion.SceneGraph
	Width  int
	Height int
	FPS    float64
}

// CompileMotion emits native editable OpenPost Motion Composition overlays for
// worker/headless generation. The web and server compilers share the same stable
// IDs/control contract, so this never falls back to a flattened video asset.
func CompileMotion(input MotionCompileInput) []aunomotion.NativeOverlay {
	return aunomotion.CompileCompositionOverlays(input.Graph, input.Width, input.Height, input.FPS)
}

// CompileMotion exposes the same capability from the planner service when a
// caller already owns one. The operation is pure and does not use the AI model.
func (s *Service) CompileMotion(input MotionCompileInput) []aunomotion.NativeOverlay {
	return CompileMotion(input)
}
