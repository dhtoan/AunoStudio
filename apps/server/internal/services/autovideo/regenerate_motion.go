package autovideo

import (
	"context"
	"encoding/json"
	"strings"

	"github.com/google/uuid"
	"github.com/openpost/backend/internal/aunomotion"
	"github.com/openpost/backend/internal/services/videoprojects"
	"github.com/openpost/backend/internal/services/workspaceaccess"
)

const aunoMotionTrackID = "track-auno-motion"

type MotionRegenerationInput struct {
	WorkspaceID string
	ProjectID   string
	DeviceID    string
	Graph       aunomotion.SceneGraph
	Width       int
	Height      int
	FPS         float64
}

type projectTimelineCollections struct {
	Items        []json.RawMessage
	Tracks       []json.RawMessage
	Compositions []json.RawMessage
}

func RegenerateMotion(ctx context.Context, projects *videoprojects.Service, actor workspaceaccess.ActorFacts, input MotionRegenerationInput) (*videoprojects.MutationResult, error) {
	if projects == nil || strings.TrimSpace(input.WorkspaceID) == "" || strings.TrimSpace(input.ProjectID) == "" || input.Width <= 0 || input.Height <= 0 || input.FPS <= 0 {
		return nil, ErrInvalidInput
	}
	project, err := projects.Get(ctx, actor, input.WorkspaceID, input.ProjectID)
	if err != nil {
		return nil, err
	}
	collections, err := readTimelineCollections(json.RawMessage(project.DocumentJSON))
	if err != nil {
		return nil, err
	}
	overlays := CompileMotion(MotionCompileInput{Graph: input.Graph, Width: input.Width, Height: input.Height, FPS: input.FPS})
	items, err := mergeMotionItems(collections.Items, overlays)
	if err != nil {
		return nil, err
	}
	compositions, err := mergeMotionCompositions(collections.Compositions, overlays)
	if err != nil {
		return nil, err
	}
	tracks, err := ensureMotionTrack(collections.Tracks, len(overlays) > 0)
	if err != nil {
		return nil, err
	}
	itemValue, err := json.Marshal(items)
	if err != nil {
		return nil, err
	}
	compositionValue, err := json.Marshal(compositions)
	if err != nil {
		return nil, err
	}
	trackValue, err := json.Marshal(tracks)
	if err != nil {
		return nil, err
	}
	return projects.ApplyMutation(ctx, actor, videoprojects.ApplyMutationInput{
		WorkspaceID: input.WorkspaceID,
		ProjectID: input.ProjectID,
		MutationID: "auno-motion-" + uuid.NewString(),
		BaseRevision: project.HeadRevision,
		DeviceID: strings.TrimSpace(input.DeviceID),
		Operations: []videoprojects.MutationOperation{
			{Kind: videoprojects.MutationSet, Target: "timeline:items", Path: "/timeline/items", Value: itemValue},
			{Kind: videoprojects.MutationSet, Target: "timeline:compositions", Path: "/timeline/compositions", Value: compositionValue},
			{Kind: videoprojects.MutationSet, Target: "timeline:tracks", Path: "/timeline/tracks", Value: trackValue},
		},
	})
}

func readTimelineCollections(document json.RawMessage) (projectTimelineCollections, error) {
	var root map[string]json.RawMessage
	if err := json.Unmarshal(document, &root); err != nil {
		return projectTimelineCollections{}, ErrInvalidInput
	}
	var timeline map[string]json.RawMessage
	if err := json.Unmarshal(root["timeline"], &timeline); err != nil {
		return projectTimelineCollections{}, ErrInvalidInput
	}
	out := projectTimelineCollections{}
	for key, destination := range map[string]*[]json.RawMessage{"items": &out.Items, "tracks": &out.Tracks, "compositions": &out.Compositions} {
		raw := timeline[key]
		if len(raw) == 0 {
			*destination = []json.RawMessage{}
			continue
		}
		if err := json.Unmarshal(raw, destination); err != nil {
			return projectTimelineCollections{}, ErrInvalidInput
		}
	}
	return out, nil
}

func rawID(raw json.RawMessage) (string, error) {
	var identity struct{ ID string `json:"id"` }
	if err := json.Unmarshal(raw, &identity); err != nil {
		return "", err
	}
	return identity.ID, nil
}

func mergeMotionItems(existing []json.RawMessage, overlays []aunomotion.NativeOverlay) ([]json.RawMessage, error) {
	preserved := make([]json.RawMessage, 0, len(existing)+len(overlays))
	overrides := map[string]json.RawMessage{}
	for _, raw := range existing {
		id, err := rawID(raw)
		if err != nil {
			return nil, ErrInvalidInput
		}
		if strings.HasSuffix(id, "-motion-composition") {
			var item map[string]json.RawMessage
			if json.Unmarshal(raw, &item) == nil && len(item["compositionControlOverrides"]) > 0 {
				overrides[id] = append(json.RawMessage(nil), item["compositionControlOverrides"]...)
			}
			continue
		}
		preserved = append(preserved, raw)
	}
	for _, overlay := range overlays {
		raw, err := json.Marshal(overlay.TimelineItem)
		if err != nil {
			return nil, err
		}
		if previous := overrides[overlay.TimelineItem.ID]; len(previous) > 0 {
			var item map[string]json.RawMessage
			if err := json.Unmarshal(raw, &item); err != nil {
				return nil, err
			}
			item["compositionControlOverrides"] = previous
			raw, err = json.Marshal(item)
			if err != nil {
				return nil, err
			}
		}
		preserved = append(preserved, raw)
	}
	return preserved, nil
}

func mergeMotionCompositions(existing []json.RawMessage, overlays []aunomotion.NativeOverlay) ([]json.RawMessage, error) {
	preserved := make([]json.RawMessage, 0, len(existing)+len(overlays))
	for _, raw := range existing {
		id, err := rawID(raw)
		if err != nil {
			return nil, ErrInvalidInput
		}
		if strings.HasPrefix(id, "auno-motion-composition-") {
			continue
		}
		preserved = append(preserved, raw)
	}
	for _, overlay := range overlays {
		raw, err := json.Marshal(overlay.Composition)
		if err != nil {
			return nil, err
		}
		preserved = append(preserved, raw)
	}
	return preserved, nil
}

func ensureMotionTrack(existing []json.RawMessage, needed bool) ([]json.RawMessage, error) {
	tracks := make([]json.RawMessage, 0, len(existing)+1)
	for _, raw := range existing {
		id, err := rawID(raw)
		if err != nil {
			return nil, ErrInvalidInput
		}
		if id != aunoMotionTrackID {
			tracks = append(tracks, raw)
		}
	}
	if !needed {
		return tracks, nil
	}
	motionTrack, err := json.Marshal(map[string]any{
		"id": aunoMotionTrackID, "name": "Auno Motion", "kind": "video", "height": 72,
		"locked": false, "visible": true, "muted": false, "solo": false, "order": 1,
	})
	if err != nil {
		return nil, err
	}
	return append(tracks, motionTrack), nil
}
