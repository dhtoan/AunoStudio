package documentary

import (
	"errors"
	"strings"
)

var ErrInvalid = errors.New("invalid documentary input")

func ValidateDuration(seconds int) error {
	switch seconds {
	case 30, 60, 120, 180, 300:
		return nil
	default:
		return ErrInvalid
	}
}

func ValidateVisualIntent(intent VisualIntent) error {
	switch intent {
	case VisualIntentArchivalPhoto,
		VisualIntentHalftoneSubject,
		VisualIntentPaperDocument,
		VisualIntentMap,
		VisualIntentMapRoute,
		VisualIntentTimeline,
		VisualIntentNewspaperClipping,
		VisualIntentObjectEvidence,
		VisualIntentNumberCard,
		VisualIntentQuoteStrip,
		VisualIntentDiagram,
		VisualIntentConnectionBoard,
		VisualIntentLocationCard,
		VisualIntentMotionComposition:
		return nil
	default:
		return ErrInvalid
	}
}

func ValidateStep(step Step) error {
	for _, candidate := range AllSteps() {
		if candidate == step {
			return nil
		}
	}
	return ErrInvalid
}

func ValidateRun(run *Run) error {
	if run == nil || strings.TrimSpace(run.ID) == "" || strings.TrimSpace(run.WorkspaceID) == "" {
		return ErrInvalid
	}
	if run.SchemaVersion != SchemaVersion || run.Mode != ModeDocumentaryLongForm || run.Style != StyleDocumentaryPaperCollage {
		return ErrInvalid
	}
	if run.GenerationVersion < 1 {
		return ErrInvalid
	}
	if err := ValidateStep(run.CurrentStep); err != nil {
		return err
	}
	if run.TargetDurationSeconds != 0 {
		if err := ValidateDuration(run.TargetDurationSeconds); err != nil {
			return err
		}
	}
	for _, beat := range run.Beats {
		if strings.TrimSpace(beat.ID) == "" || beat.DurationSeconds <= 0 {
			return ErrInvalid
		}
		if err := ValidateVisualIntent(beat.VisualIntent); err != nil {
			return err
		}
	}
	return nil
}
