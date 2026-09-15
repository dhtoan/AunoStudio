package documentary

import (
	"time"

	"github.com/openpost/backend/internal/services/autovideo"
)

const (
	SchemaVersion                = 1
	ModeDocumentaryLongForm      = "documentary-long-form"
	StyleDocumentaryPaperCollage = "documentary-paper-collage"
)

type Step string

const (
	StepSource     Step = "source"
	StepTopic      Step = "topic"
	StepIdeas      Step = "ideas"
	StepDuration   Step = "duration"
	StepScript     Step = "script"
	StepVoice      Step = "voice"
	StepBeats      Step = "beats"
	StepVisuals    Step = "visuals"
	StepAnimation  Step = "animation"
	StepThumbnails Step = "thumbnails"
	StepProject    Step = "project"
)

type StepStatus string

const (
	StepStatusPending StepStatus = "pending"
	StepStatusReady   StepStatus = "ready"
	StepStatusStale   StepStatus = "stale"
)

type StepState struct {
	Fingerprint string     `json:"fingerprint,omitempty"`
	Status      StepStatus `json:"status"`
}

type Idea struct {
	ID              string   `json:"id"`
	Title           string   `json:"title"`
	Hook            string   `json:"hook"`
	Subterritory    string   `json:"subterritory"`
	EvidenceAnchors []string `json:"evidence_anchors"`
}

type Script struct {
	Text            string   `json:"text"`
	WordCount       int      `json:"word_count"`
	TargetWordCount int      `json:"target_word_count"`
	EvidenceRefs    []string `json:"evidence_refs"`
	Fingerprint     string   `json:"fingerprint"`
	Diagnostics     []string `json:"diagnostics,omitempty"`
}

type VoiceChunk struct {
	ID              string   `json:"id"`
	BeatIDs         []string `json:"beat_ids,omitempty"`
	Text            string   `json:"text"`
	MediaID         string   `json:"media_id,omitempty"`
	ItemID          string   `json:"item_id,omitempty"`
	DurationSeconds float64  `json:"duration_seconds,omitempty"`
}

type VoiceManifest struct {
	Provider                string       `json:"provider,omitempty"`
	Voice                   string       `json:"voice,omitempty"`
	Direction               []string     `json:"direction,omitempty"`
	Chunks                  []VoiceChunk `json:"chunks,omitempty"`
	MeasuredDurationSeconds float64      `json:"measured_duration_seconds,omitempty"`
	Fingerprint             string       `json:"fingerprint,omitempty"`
}

type VisualIntent string

const (
	VisualIntentArchivalPhoto      VisualIntent = "archival-photo"
	VisualIntentHalftoneSubject    VisualIntent = "halftone-subject"
	VisualIntentPaperDocument      VisualIntent = "paper-document"
	VisualIntentMap                VisualIntent = "map"
	VisualIntentMapRoute           VisualIntent = "map-route"
	VisualIntentTimeline           VisualIntent = "timeline"
	VisualIntentNewspaperClipping  VisualIntent = "newspaper-clipping"
	VisualIntentObjectEvidence     VisualIntent = "object-evidence"
	VisualIntentNumberCard         VisualIntent = "number-card"
	VisualIntentQuoteStrip         VisualIntent = "quote-strip"
	VisualIntentDiagram            VisualIntent = "diagram"
	VisualIntentConnectionBoard    VisualIntent = "connection-board"
	VisualIntentLocationCard       VisualIntent = "location-card"
	VisualIntentMotionComposition  VisualIntent = "motion-composition"
)

type Beat struct {
	ID                 string       `json:"id"`
	Index              int          `json:"index"`
	Narration          string       `json:"narration"`
	StartSeconds       float64      `json:"start_seconds"`
	DurationSeconds    float64      `json:"duration_seconds"`
	CoreIdea           string       `json:"core_idea"`
	EvidenceRefs       []string     `json:"evidence_refs"`
	VisualIntent       VisualIntent `json:"visual_intent"`
	RequiredSubjectIDs []string     `json:"required_subject_ids,omitempty"`
}

type AnimationBrief struct {
	Camera        string   `json:"camera"`
	Cadence       string   `json:"cadence"`
	AssemblyOrder string   `json:"assembly_order"`
	HoldRatio     float64  `json:"hold_ratio"`
	AmbientLife   []string `json:"ambient_life,omitempty"`
}

type VisualPlan struct {
	BeatID             string         `json:"beat_id"`
	VisualIntent       VisualIntent   `json:"visual_intent"`
	Hero               string         `json:"hero"`
	Supports           []string       `json:"supports,omitempty"`
	Label              string         `json:"label,omitempty"`
	Prompt             string         `json:"prompt"`
	RequiredSubjectIDs []string       `json:"required_subject_ids,omitempty"`
	MediaID            string         `json:"media_id,omitempty"`
	Animation          AnimationBrief `json:"animation"`
	Fingerprint        string         `json:"fingerprint,omitempty"`
}

type ThumbnailPlan struct {
	ID           string   `json:"id"`
	Hero         string   `json:"hero"`
	Headline     string   `json:"headline,omitempty"`
	TextElements []string `json:"text_elements,omitempty"`
	Prompt       string   `json:"prompt"`
	MediaID      string   `json:"media_id,omitempty"`
}

type Run struct {
	SchemaVersion         int                `json:"schema_version"`
	ID                    string             `json:"id"`
	WorkspaceID           string             `json:"workspace_id"`
	ProjectID             string             `json:"project_id,omitempty"`
	Mode                  string             `json:"mode"`
	Style                 string             `json:"style"`
	CurrentStep           Step               `json:"current_step"`
	GenerationVersion     int64              `json:"generation_version"`
	Source                *autovideo.Source  `json:"source,omitempty"`
	Niche                 string             `json:"niche,omitempty"`
	Ideas                 []Idea             `json:"ideas,omitempty"`
	SelectedIdeaID        string             `json:"selected_idea_id,omitempty"`
	CustomTopic           string             `json:"custom_topic,omitempty"`
	TargetDurationSeconds int                `json:"target_duration_seconds,omitempty"`
	Language              string             `json:"language,omitempty"`
	Script                *Script            `json:"script,omitempty"`
	Voice                 *VoiceManifest     `json:"voice,omitempty"`
	Beats                 []Beat             `json:"beats,omitempty"`
	VisualPlans           []VisualPlan       `json:"visual_plans,omitempty"`
	Thumbnails            []ThumbnailPlan    `json:"thumbnails,omitempty"`
	StepStates            map[Step]StepState `json:"step_states,omitempty"`
	ProviderManifest      map[string]string  `json:"provider_manifest,omitempty"`
	CreatedAt             time.Time          `json:"created_at"`
	UpdatedAt             time.Time          `json:"updated_at"`
}

func AllSteps() []Step {
	return []Step{
		StepSource,
		StepTopic,
		StepIdeas,
		StepDuration,
		StepScript,
		StepVoice,
		StepBeats,
		StepVisuals,
		StepAnimation,
		StepThumbnails,
		StepProject,
	}
}
