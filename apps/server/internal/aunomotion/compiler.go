package aunomotion

import (
	"fmt"
	"math"
)

const motionTrackID = "track-auno-motion"

// CompileCompositionOverlays mirrors the stable identifiers and native shape
// emitted by the web Motion Composition compiler for headless generation.
func CompileCompositionOverlays(graph SceneGraph, width, height int, fps float64) []NativeOverlay {
	if width <= 0 || height <= 0 || fps <= 0 {
		return nil
	}
	accent := paletteColor(graph.Brief.Palette, 2, "#ffffff")
	secondary := paletteColor(graph.Brief.Palette, 1, "#111111")
	overlays := make([]NativeOverlay, 0)
	compositionIndex := 0

	for _, scene := range graph.Scenes {
		if scene.VisualIntent != "motion-composition" || scene.SourceSceneID == "" {
			continue
		}
		durationFrames := maxInt(2, int(math.Round(scene.DurationSeconds*fps)))
		if graph.Style == "documentary-paper-collage" {
			overlays = append(overlays, compileDocumentaryPaperOverlay(scene, accent, secondary, width, height, fps, durationFrames))
			continue
		}

		compositionID := "auno-motion-composition-" + scene.SourceSceneID
		trackID := compositionID + "-track"
		primaryID := compositionID + "-primary"
		accentID := compositionID + "-accent"
		direction := 1.0
		if compositionIndex%2 == 1 {
			direction = -1
		}
		compositionIndex++

		primary := NativeItem{
			ID: primaryID, TrackID: trackID, From: 0, DurationInFrames: durationFrames,
			Label: "Motion field", Type: "shape", ShapeType: "circle",
			FillEnabled: true, FillType: "solid", FillColor: accent,
			Transform: NativeTransform{
				X: float64(width) * choose(direction > 0, 0.74, 0.26),
				Y: float64(height) * 0.48,
				Width: float64(width) * 0.54, Height: float64(width) * 0.54,
				Opacity: 0.2, ScaleX: 1, ScaleY: 1,
			},
			Keyframes: map[string]NativeKeyframeTrack{
				"x":       track(primaryID+":x", float64(width)*choose(direction > 0, 0.82, 0.18), float64(width)*choose(direction > 0, 0.60, 0.40), durationFrames),
				"y":       track(primaryID+":y", float64(height)*0.42, float64(height)*0.56, durationFrames),
				"scaleX":  track(primaryID+":scaleX", 0.82, 1.12, durationFrames),
				"scaleY":  track(primaryID+":scaleY", 0.82, 1.12, durationFrames),
				"opacity": track(primaryID+":opacity", 0.06, 0.22, durationFrames),
			},
		}
		accentShape := NativeItem{
			ID: accentID, TrackID: trackID, From: 0, DurationInFrames: durationFrames,
			Label: "Motion accent", Type: "shape", ShapeType: "rectangle",
			StrokeEnabled: true, StrokeColor: secondary,
			StrokeWidth: math.Max(2, math.Round(float64(width)*0.004)),
			Transform: NativeTransform{
				X: float64(width) / 2, Y: float64(height) / 2,
				Width: float64(width) * 0.72, Height: float64(height) * 0.46,
				Opacity: 0.34,
			},
			Keyframes: map[string]NativeKeyframeTrack{
				"rotation": track(accentID+":rotation", -2.5*direction, 2.5*direction, durationFrames),
				"opacity":  track(accentID+":opacity", 0.12, 0.36, durationFrames),
			},
		}

		composition := NativeComposition{
			ID:         compositionID,
			Name:       "Auno Motion · " + scene.SourceSceneID,
			EditorKind: "composite-2d",
			CompositionControls: NativeCompositionControls{Version: 1, Controls: []NativeControl{
				{ID: "intensity", Name: "Intensity", TargetItemID: primaryID, Property: "motion.intensity", Kind: "number", DefaultValue: "1", Min: float64Ptr(0), Max: float64Ptr(1), Step: float64Ptr(0.05)},
				{ID: "depth", Name: "Depth", TargetItemID: primaryID, Property: "motion.depth", Kind: "number", DefaultValue: "1", Min: float64Ptr(0), Max: float64Ptr(1), Step: float64Ptr(0.05)},
				{ID: "speed", Name: "Speed", TargetItemID: primaryID, Property: "motion.speed", Kind: "number", DefaultValue: "1", Min: float64Ptr(0.25), Max: float64Ptr(2), Step: float64Ptr(0.05)},
				{ID: "primary-color", Name: "Primary color", TargetItemID: primaryID, Property: "shape.fillColor", Kind: "color", DefaultValue: accent},
				{ID: "secondary-color", Name: "Secondary color", TargetItemID: accentID, Property: "shape.strokeColor", Kind: "color", DefaultValue: secondary},
				{
					ID: "background-variant", Name: "Background variant", TargetItemID: accentID,
					Property: "shape.shapeType", Kind: "select", DefaultValue: "rectangle",
					Options: []NativeControlOption{
						{Value: "rectangle", Label: "Frame"},
						{Value: "ellipse", Label: "Oval"},
						{Value: "circle", Label: "Circle"},
					},
				},
			}},
			Items: []NativeItem{primary, accentShape},
			Tracks: []NativeTrack{{ID: trackID, Name: "Motion layers", Kind: "video", Height: 72, Visible: true, Order: 0}},
			Transitions: []any{}, FPS: fps, Width: width, Height: height,
			DurationInFrames: durationFrames, BackgroundColor: "#00000000",
		}
		item := NativeTimelineItem{
			ID: scene.SourceSceneID + "-motion-composition", TrackID: motionTrackID,
			From: int(math.Round(scene.StartSeconds * fps)), DurationInFrames: durationFrames,
			Label: "Motion Composition · " + scene.SourceSceneID, Type: "composition",
			CompositionID: compositionID, CompositionWidth: width, CompositionHeight: height,
			CompositionControlOverrides: map[string]string{"primary-color": accent, "secondary-color": secondary},
			Transform: NativeTransform{X: float64(width) / 2, Y: float64(height) / 2, Width: float64(width), Height: float64(height), Opacity: 1},
		}
		overlays = append(overlays, NativeOverlay{Composition: composition, TimelineItem: item})
	}
	return overlays
}

func compileDocumentaryPaperOverlay(scene Scene, accent, secondary string, width, height int, fps float64, durationFrames int) NativeOverlay {
	compositionID := "auno-motion-composition-" + scene.SourceSceneID
	trackID := compositionID + "-track"
	backID := compositionID + "-paper-back"
	shadowID := compositionID + "-paper-shadow"
	heroID := compositionID + "-paper-hero"
	baseWidth := float64(width) * 0.62
	baseHeight := float64(height) * 0.58

	back := NativeItem{
		ID: backID, TrackID: trackID, From: 0, DurationInFrames: durationFrames,
		Label: "Auno paper backing", Type: "shape", ShapeType: "rectangle",
		FillEnabled: true, FillType: "solid", FillColor: "#D7C3A3",
		Transform: NativeTransform{X: float64(width) * 0.5, Y: float64(height) * 0.5, Width: baseWidth, Height: baseHeight, Rotation: -1.2, Opacity: 0.96, ScaleX: 1, ScaleY: 1},
		Keyframes: map[string]NativeKeyframeTrack{
			"x":        paperTrack(backID+":x", float64(width)*0.47, float64(width)*0.5, durationFrames),
			"y":        paperTrack(backID+":y", float64(height)*0.53, float64(height)*0.5, durationFrames),
			"rotation": paperTrack(backID+":rotation", -2.4, -1.2, durationFrames),
			"opacity":  paperTrack(backID+":opacity", 0, 0.96, durationFrames),
		},
	}
	shadow := NativeItem{
		ID: shadowID, TrackID: trackID, From: 0, DurationInFrames: durationFrames,
		Label: "Auno paper shadow", Type: "shape", ShapeType: "rectangle",
		FillEnabled: true, FillType: "solid", FillColor: secondary,
		Transform: NativeTransform{X: float64(width) * 0.518, Y: float64(height) * 0.525, Width: baseWidth, Height: baseHeight, Rotation: 0.7, Opacity: 0.22, ScaleX: 1, ScaleY: 1},
		Keyframes: map[string]NativeKeyframeTrack{
			"x":        paperTrack(shadowID+":x", float64(width)*0.49, float64(width)*0.518, durationFrames),
			"y":        paperTrack(shadowID+":y", float64(height)*0.55, float64(height)*0.525, durationFrames),
			"rotation": paperTrack(shadowID+":rotation", 1.8, 0.7, durationFrames),
			"opacity":  paperTrack(shadowID+":opacity", 0, 0.22, durationFrames),
		},
	}
	hero := NativeItem{
		ID: heroID, TrackID: trackID, From: 0, DurationInFrames: durationFrames,
		Label: "Auno paper hero", Type: "shape", ShapeType: "rectangle",
		FillEnabled: true, FillType: "solid", FillColor: accent,
		StrokeEnabled: true, StrokeColor: secondary, StrokeWidth: math.Max(2, math.Round(float64(width)*0.002)),
		Transform: NativeTransform{X: float64(width) * 0.5, Y: float64(height) * 0.49, Width: baseWidth, Height: baseHeight, Rotation: 0, Opacity: 0.9, ScaleX: 1, ScaleY: 1},
		Keyframes: map[string]NativeKeyframeTrack{
			"x":        paperTrack(heroID+":x", float64(width)*0.54, float64(width)*0.5, durationFrames),
			"y":        paperTrack(heroID+":y", float64(height)*0.46, float64(height)*0.49, durationFrames),
			"rotation": paperTrack(heroID+":rotation", 2.1, 0, durationFrames),
			"opacity":  paperTrack(heroID+":opacity", 0, 0.9, durationFrames),
		},
	}

	composition := NativeComposition{
		ID: compositionID, Name: "Auno Motion · " + scene.SourceSceneID, EditorKind: "composite-2d",
		CompositionControls: NativeCompositionControls{Version: 1, Controls: []NativeControl{
			{ID: "paper-jitter", Name: "Paper jitter", TargetItemID: heroID, Property: "motion.paperJitter", Kind: "number", DefaultValue: "1", Min: float64Ptr(0), Max: float64Ptr(1), Step: float64Ptr(0.05)},
			{ID: "shadow-depth", Name: "Shadow depth", TargetItemID: shadowID, Property: "motion.shadowDepth", Kind: "number", DefaultValue: "1", Min: float64Ptr(0), Max: float64Ptr(1.5), Step: float64Ptr(0.05)},
			{ID: "hold-ratio", Name: "Hold ratio", TargetItemID: heroID, Property: "motion.holdRatio", Kind: "number", DefaultValue: "0.18", Min: float64Ptr(0.05), Max: float64Ptr(0.8), Step: float64Ptr(0.05)},
			{ID: "assembly-order", Name: "Assembly order", TargetItemID: heroID, Property: "motion.assemblyOrder", Kind: "select", DefaultValue: "back-to-front", Options: []NativeControlOption{{Value: "back-to-front", Label: "Back to front"}, {Value: "hero-first", Label: "Hero first"}}},
			{ID: "primary-color", Name: "Paper accent", TargetItemID: heroID, Property: "shape.fillColor", Kind: "color", DefaultValue: accent},
		}},
		Items: []NativeItem{back, shadow, hero},
		Tracks: []NativeTrack{{ID: trackID, Name: "Motion layers", Kind: "video", Height: 72, Visible: true, Order: 0}},
		Transitions: []any{}, FPS: fps, Width: width, Height: height,
		DurationInFrames: durationFrames, BackgroundColor: "#00000000",
	}
	item := NativeTimelineItem{
		ID: scene.SourceSceneID + "-motion-composition", TrackID: motionTrackID,
		From: int(math.Round(scene.StartSeconds * fps)), DurationInFrames: durationFrames,
		Label: "Motion Composition · " + scene.SourceSceneID, Type: "composition",
		CompositionID: compositionID, CompositionWidth: width, CompositionHeight: height,
		CompositionControlOverrides: map[string]string{},
		Transform: NativeTransform{X: float64(width) / 2, Y: float64(height) / 2, Width: float64(width), Height: float64(height), Opacity: 1},
	}
	return NativeOverlay{Composition: composition, TimelineItem: item}
}

func track(scope string, from, to float64, durationFrames int) NativeKeyframeTrack {
	end := maxInt(1, durationFrames-1)
	return NativeKeyframeTrack{
		Frames:   []int{0, end},
		Values:   []float64{from, to},
		IDs:      []string{fmt.Sprintf("auno:%s:0", scope), fmt.Sprintf("auno:%s:1", scope)},
		Easings: []string{"ease-in-out", "ease-in-out"},
	}
}

func paperTrack(scope string, from, to float64, durationFrames int) NativeKeyframeTrack {
	end := maxInt(1, durationFrames-1)
	assembled := int(math.Round(float64(durationFrames) * 0.82))
	if end <= 1 {
		assembled = 1
	} else {
		assembled = maxInt(1, minInt(end-1, assembled))
	}
	return NativeKeyframeTrack{
		Frames:   []int{0, assembled, end},
		Values:   []float64{from, to, to},
		IDs:      []string{fmt.Sprintf("auno:paper-jitter:%s:0", scope), fmt.Sprintf("auno:assembly:%s:1", scope), fmt.Sprintf("auno:assembly:%s:hold", scope)},
		Easings: []string{"hold", "ease-out", "hold"},
	}
}

func paletteColor(palette []string, index int, fallback string) string {
	if index >= 0 && index < len(palette) && palette[index] != "" {
		return palette[index]
	}
	return fallback
}

func maxInt(left, right int) int {
	if left > right {
		return left
	}
	return right
}

func minInt(left, right int) int {
	if left < right {
		return left
	}
	return right
}

func choose(condition bool, yes, no float64) float64 {
	if condition {
		return yes
	}
	return no
}

func float64Ptr(value float64) *float64 {
	return &value
}
