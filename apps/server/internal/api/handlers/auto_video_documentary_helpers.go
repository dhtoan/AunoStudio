package handlers

import (
	"context"
	"errors"
	"log"
	"net/http"
	"strings"

	"github.com/danielgtaylor/huma/v2"
	"github.com/openpost/backend/internal/ai"
	"github.com/openpost/backend/internal/api/middleware"
	"github.com/openpost/backend/internal/services/autovideo"
	"github.com/openpost/backend/internal/services/documentary"
	"github.com/openpost/backend/internal/services/sourcecontext"
)

func (h *DocumentaryHandler) checkEdit(ctx context.Context, workspaceID string) error {
	if h == nil || h.db == nil || h.store == nil {
		return huma.Error503ServiceUnavailable("Documentary workflow is unavailable")
	}
	workspaceID = strings.TrimSpace(workspaceID)
	if workspaceID == "" {
		return huma.Error400BadRequest("workspace_id is required")
	}
	allowed, err := workspaceEditAllowed(ctx, h.db, workspaceID, middleware.GetUserID(ctx))
	if err != nil {
		return huma.Error503ServiceUnavailable("failed to verify workspace access")
	}
	if !allowed {
		return huma.Error403Forbidden("workspace access denied")
	}
	return nil
}

func (h *DocumentaryHandler) resolveNewSource(ctx context.Context, workspaceID string, source autovideo.Source) (autovideo.Source, error) {
	kind := strings.ToLower(strings.TrimSpace(source.Kind))
	if kind != "url" {
		if source.MediaID != "" {
			resolved, _, err := resolveAutoVideoMediaSource(ctx, h.db, h.storage, workspaceID, source)
			if err != nil {
				return autovideo.Source{}, documentaryMediaHTTPError(err)
			}
			return resolved, nil
		}
		return source, nil
	}
	if h.sourceLoader == nil {
		return autovideo.Source{}, huma.Error503ServiceUnavailable("URL source extraction is unavailable")
	}
	rawURL := strings.TrimSpace(source.URL)
	if rawURL == "" {
		rawURL = strings.TrimSpace(source.Value)
	}
	document, err := h.sourceLoader.Load(ctx, rawURL)
	if err != nil {
		return autovideo.Source{}, documentarySourceHTTPError(err)
	}
	source.URL = document.CanonicalURL
	source.Value = document.Text
	if strings.TrimSpace(document.Title) != "" {
		source.Label = document.Title
	}
	return source, nil
}

func (h *DocumentaryHandler) sourceForPlanning(
	ctx context.Context,
	workspaceID string,
	source *autovideo.Source,
) (*autovideo.Source, []ai.MultimodalPart, error) {
	if source == nil {
		return nil, nil, nil
	}
	copySource := *source
	if strings.TrimSpace(copySource.MediaID) == "" {
		return &copySource, nil, nil
	}
	resolved, parts, err := resolveAutoVideoMediaSource(ctx, h.db, h.storage, workspaceID, copySource)
	if err != nil {
		return nil, nil, documentaryMediaHTTPError(err)
	}
	return &resolved, parts, nil
}

func documentaryHTTPError(err error) error {
	switch {
	case errors.Is(err, documentary.ErrInvalid):
		return huma.Error400BadRequest("invalid documentary workflow state")
	case errors.Is(err, documentary.ErrNotFound):
		return huma.Error404NotFound("documentary run was not found")
	case errors.Is(err, documentary.ErrConflict):
		return huma.Error409Conflict("documentary run changed; reload it before saving again")
	default:
		return huma.Error503ServiceUnavailable("documentary workflow is unavailable")
	}
}

func documentaryPlannerHTTPError(err error) error {
	if errors.Is(err, documentary.ErrInvalid) || errors.Is(err, documentary.ErrInvalidResponse) {
		return huma.Error400BadRequest("documentary input or generated output is invalid")
	}
	var providerErr *ai.ProviderError
	if errors.As(err, &providerErr) && providerErr.StatusCode == http.StatusTooManyRequests {
		return huma.Error429TooManyRequests("documentary AI provider is rate limited; try again later")
	}
	if errors.Is(err, context.DeadlineExceeded) || errors.Is(err, context.Canceled) {
		return huma.Error503ServiceUnavailable("documentary planning timed out")
	}
	log.Printf("Auno documentary planning failed (%T)", err)
	return huma.Error502BadGateway("documentary planning failed")
}

func documentarySourceHTTPError(err error) error {
	if errors.Is(err, sourcecontext.ErrInvalidURL) || errors.Is(err, sourcecontext.ErrCredentialsNotAllowed) ||
		errors.Is(err, sourcecontext.ErrCustomPortNotAllowed) || errors.Is(err, sourcecontext.ErrURLNotPublic) ||
		errors.Is(err, sourcecontext.ErrUnsupportedContentType) || errors.Is(err, sourcecontext.ErrResponseTooLarge) ||
		errors.Is(err, sourcecontext.ErrUnreadable) {
		return huma.Error400BadRequest("documentary source URL is not a supported public document")
	}
	return huma.Error502BadGateway("documentary source URL could not be loaded")
}

func documentaryMediaHTTPError(err error) error {
	if errors.Is(err, errAutoVideoMediaInvalid) {
		return huma.Error400BadRequest("documentary media source is invalid, unavailable, too large, or unsupported")
	}
	return huma.Error503ServiceUnavailable("documentary media source could not be read")
}

func selectedDocumentaryIdea(run *documentary.Run) *documentary.Idea {
	if run == nil || strings.TrimSpace(run.SelectedIdeaID) == "" {
		return nil
	}
	for index := range run.Ideas {
		if run.Ideas[index].ID == run.SelectedIdeaID {
			return &run.Ideas[index]
		}
	}
	return nil
}

func markDocumentaryStep(run *documentary.Run, step documentary.Step, fingerprint string) {
	if run.StepStates == nil {
		run.StepStates = map[documentary.Step]documentary.StepState{}
	}
	run.StepStates[step] = documentary.StepState{Fingerprint: fingerprint, Status: documentary.StepStatusReady}
}

func markDocumentaryStepStale(run *documentary.Run, step documentary.Step) {
	if run.StepStates == nil {
		run.StepStates = map[documentary.Step]documentary.StepState{}
	}
	state := run.StepStates[step]
	state.Status = documentary.StepStatusStale
	run.StepStates[step] = state
}

func setDocumentaryProvider(run *documentary.Run, step, model string) {
	if run.ProviderManifest == nil {
		run.ProviderManifest = map[string]string{}
	}
	run.ProviderManifest[step] = model
}

func documentarySourceFingerprint(source *autovideo.Source) string {
	if source == nil {
		return "no-source"
	}
	return documentary.Fingerprint(source.ID, source.Kind, source.URL, source.MediaID, source.Value)
}

func documentaryBeatIDs(beats []documentary.Beat) []string {
	ids := make([]string, 0, len(beats))
	for _, beat := range beats {
		ids = append(ids, beat.ID)
	}
	return ids
}

func documentaryVisualFingerprints(plans []documentary.VisualPlan) []string {
	fingerprints := make([]string, 0, len(plans))
	for _, plan := range plans {
		fingerprints = append(fingerprints, plan.Fingerprint)
	}
	return fingerprints
}
