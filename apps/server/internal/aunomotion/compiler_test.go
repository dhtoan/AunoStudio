package aunomotion

import "testing"

func TestCompileCompositionOverlaysDocumentaryPaperParity(t *testing.T) {
	graph := SceneGraph{
		SchemaVersion: 1,
		Style:         "documentary-paper-collage",
		Seed:          42,
		Brief: Brief{Palette: []string{"#111111", "#222222", "#cc3333"}},
		Scenes: []Scene{{
			ID:              "motion-beat-001",
			SourceSceneID:   "beat-001",
			VisualIntent:    "motion-composition",
			StartSeconds:    2,
			DurationSeconds: 3,
		}},
	}

	overlays := CompileCompositionOverlays(graph, 1920, 1080, 30)
	if len(overlays) != 1 {
		t.Fatalf("expected one overlay, got %d", len(overlays))
	}
	overlay := overlays[0]
	if overlay.Composition.ID != "auno-motion-composition-beat-001" {
		t.Fatalf("unexpected composition id %q", overlay.Composition.ID)
	}
	if overlay.TimelineItem.ID != "beat-001-motion-composition" || overlay.TimelineItem.Type != "composition" {
		t.Fatalf("unexpected timeline item: %#v", overlay.TimelineItem)
	}
	if overlay.TimelineItem.TrackID != "track-auno-motion" || overlay.TimelineItem.From != 60 {
		t.Fatalf("unexpected timeline placement: %#v", overlay.TimelineItem)
	}
	if overlay.Composition.DurationInFrames != 90 || overlay.TimelineItem.DurationInFrames != 90 {
		t.Fatalf("expected 90 frame duration, composition=%d item=%d", overlay.Composition.DurationInFrames, overlay.TimelineItem.DurationInFrames)
	}
	if len(overlay.Composition.Tracks) != 1 || overlay.Composition.Tracks[0].ID != "auno-motion-composition-beat-001-track" {
		t.Fatalf("unexpected internal track: %#v", overlay.Composition.Tracks)
	}
	if len(overlay.Composition.Items) != 3 {
		t.Fatalf("Vox parity requires 3 paper layers, got %d", len(overlay.Composition.Items))
	}
	wantItemIDs := []string{
		"auno-motion-composition-beat-001-paper-back",
		"auno-motion-composition-beat-001-paper-shadow",
		"auno-motion-composition-beat-001-paper-hero",
	}
	for i, id := range wantItemIDs {
		if overlay.Composition.Items[i].ID != id || overlay.Composition.Items[i].Type != "shape" {
			t.Fatalf("unexpected paper layer %d: %#v", i, overlay.Composition.Items[i])
		}
	}
	wantControls := []string{"paper-jitter", "shadow-depth", "hold-ratio", "assembly-order", "primary-color"}
	controls := overlay.Composition.CompositionControls.Controls
	if len(controls) != len(wantControls) {
		t.Fatalf("expected %d controls, got %d", len(wantControls), len(controls))
	}
	for i, id := range wantControls {
		if controls[i].ID != id {
			t.Fatalf("control %d: expected %q, got %q", i, id, controls[i].ID)
		}
	}
	if controls[0].DefaultValue != "1" || controls[2].DefaultValue != "0.18" || controls[3].DefaultValue != "back-to-front" {
		t.Fatalf("unexpected Vox control defaults: %#v", controls)
	}
	if len(overlay.TimelineItem.CompositionControlOverrides) != 0 {
		t.Fatalf("Vox paper overlay should begin with no instance overrides: %#v", overlay.TimelineItem.CompositionControlOverrides)
	}
}
