package autovideoprojects

import (
	"context"
	"database/sql"
	"encoding/json"
	"errors"
	"strings"
	"time"

	"github.com/openpost/backend/internal/models"
	"github.com/uptrace/bun"
)

const (
	maxSourceManifestBytes   = 512 * 1024
	maxStoryboardBytes       = 1024 * 1024
	maxProviderManifestBytes = 64 * 1024
	maxGenerationGraphBytes  = 512 * 1024
	maxTemplateIDBytes       = 160
)

var (
	ErrInvalid  = errors.New("invalid auto video project sidecar")
	ErrNotFound = errors.New("auto video project sidecar not found")
)

type Service struct {
	db  *bun.DB
	now func() time.Time
}

type UpsertInput struct {
	WorkspaceID      string
	ProjectID        string
	GenerationVersion int64
	TemplateID       string
	SourceManifest   json.RawMessage
	Storyboard       json.RawMessage
	ProviderManifest json.RawMessage
	GenerationGraph  json.RawMessage
}

type Record struct {
	ProjectID         string          `json:"project_id"`
	WorkspaceID       string          `json:"workspace_id"`
	GenerationVersion int64           `json:"generation_version"`
	TemplateID        string          `json:"template_id,omitempty"`
	SourceManifest    json.RawMessage `json:"source_manifest"`
	Storyboard        json.RawMessage `json:"storyboard"`
	ProviderManifest  json.RawMessage `json:"provider_manifest"`
	GenerationGraph   json.RawMessage `json:"generation_graph"`
	CreatedAt         time.Time       `json:"created_at"`
	UpdatedAt         time.Time       `json:"updated_at"`
}

func New(db *bun.DB) *Service {
	return &Service{db: db, now: time.Now}
}

func (s *Service) Get(ctx context.Context, workspaceID, projectID string) (*Record, error) {
	workspaceID = strings.TrimSpace(workspaceID)
	projectID = strings.TrimSpace(projectID)
	if s == nil || s.db == nil || workspaceID == "" || projectID == "" {
		return nil, ErrInvalid
	}
	if err := ensureProject(ctx, s.db, workspaceID, projectID); err != nil {
		return nil, err
	}
	var model models.AunoAutoVideoProject
	if err := s.db.NewSelect().Model(&model).
		Where("project_id = ? AND workspace_id = ?", projectID, workspaceID).
		Scan(ctx); err != nil {
		if errors.Is(err, sql.ErrNoRows) {
			return nil, ErrNotFound
		}
		return nil, err
	}
	return recordFromModel(&model), nil
}

func (s *Service) Upsert(ctx context.Context, input UpsertInput) (*Record, error) {
	if s == nil || s.db == nil {
		return nil, ErrInvalid
	}
	workspaceID := strings.TrimSpace(input.WorkspaceID)
	projectID := strings.TrimSpace(input.ProjectID)
	templateID := strings.TrimSpace(input.TemplateID)
	if workspaceID == "" || projectID == "" || input.GenerationVersion < 1 || len(templateID) > maxTemplateIDBytes {
		return nil, ErrInvalid
	}
	source, err := normalizeJSONObject(input.SourceManifest, maxSourceManifestBytes)
	if err != nil {
		return nil, err
	}
	storyboard, err := normalizeJSONObject(input.Storyboard, maxStoryboardBytes)
	if err != nil {
		return nil, err
	}
	providers, err := normalizeJSONObject(input.ProviderManifest, maxProviderManifestBytes)
	if err != nil {
		return nil, err
	}
	graph, err := normalizeJSONObject(input.GenerationGraph, maxGenerationGraphBytes)
	if err != nil {
		return nil, err
	}
	if err := ensureProject(ctx, s.db, workspaceID, projectID); err != nil {
		return nil, err
	}

	now := s.now().UTC()
	model := &models.AunoAutoVideoProject{
		ProjectID:            projectID,
		WorkspaceID:          workspaceID,
		GenerationVersion:    input.GenerationVersion,
		TemplateID:           templateID,
		SourceManifestJSON:   string(source),
		StoryboardJSON:       string(storyboard),
		ProviderManifestJSON: string(providers),
		GenerationGraphJSON:  string(graph),
		CreatedAt:            now,
		UpdatedAt:            now,
	}
	_, err = s.db.NewInsert().Model(model).
		On("CONFLICT (project_id) DO UPDATE").
		Set("workspace_id = EXCLUDED.workspace_id").
		Set("generation_version = EXCLUDED.generation_version").
		Set("template_id = EXCLUDED.template_id").
		Set("source_manifest_json = EXCLUDED.source_manifest_json").
		Set("storyboard_json = EXCLUDED.storyboard_json").
		Set("provider_manifest_json = EXCLUDED.provider_manifest_json").
		Set("generation_graph_json = EXCLUDED.generation_graph_json").
		Set("updated_at = EXCLUDED.updated_at").
		Exec(ctx)
	if err != nil {
		return nil, err
	}
	return s.Get(ctx, workspaceID, projectID)
}

func (s *Service) Delete(ctx context.Context, workspaceID, projectID string) error {
	workspaceID = strings.TrimSpace(workspaceID)
	projectID = strings.TrimSpace(projectID)
	if s == nil || s.db == nil || workspaceID == "" || projectID == "" {
		return ErrInvalid
	}
	if err := ensureProject(ctx, s.db, workspaceID, projectID); err != nil {
		return err
	}
	result, err := s.db.NewDelete().Model((*models.AunoAutoVideoProject)(nil)).
		Where("project_id = ? AND workspace_id = ?", projectID, workspaceID).
		Exec(ctx)
	if err != nil {
		return err
	}
	rows, err := result.RowsAffected()
	if err != nil {
		return err
	}
	if rows == 0 {
		return ErrNotFound
	}
	return nil
}

func normalizeJSONObject(raw json.RawMessage, maxBytes int) (json.RawMessage, error) {
	if len(raw) == 0 {
		raw = json.RawMessage(`{}`)
	}
	if len(raw) > maxBytes || !json.Valid(raw) {
		return nil, ErrInvalid
	}
	var value map[string]any
	if err := json.Unmarshal(raw, &value); err != nil || value == nil {
		return nil, ErrInvalid
	}
	normalized, err := json.Marshal(value)
	if err != nil || len(normalized) > maxBytes {
		return nil, ErrInvalid
	}
	return normalized, nil
}

func ensureProject(ctx context.Context, db *bun.DB, workspaceID, projectID string) error {
	var project models.VideoProject
	if err := db.NewSelect().Model(&project).
		Column("id").
		Where("id = ? AND workspace_id = ? AND trashed_at IS NULL", projectID, workspaceID).
		Scan(ctx); err != nil {
		if errors.Is(err, sql.ErrNoRows) {
			return ErrNotFound
		}
		return err
	}
	return nil
}

func recordFromModel(model *models.AunoAutoVideoProject) *Record {
	return &Record{
		ProjectID:         model.ProjectID,
		WorkspaceID:       model.WorkspaceID,
		GenerationVersion: model.GenerationVersion,
		TemplateID:        model.TemplateID,
		SourceManifest:    json.RawMessage(model.SourceManifestJSON),
		Storyboard:        json.RawMessage(model.StoryboardJSON),
		ProviderManifest:  json.RawMessage(model.ProviderManifestJSON),
		GenerationGraph:   json.RawMessage(model.GenerationGraphJSON),
		CreatedAt:         model.CreatedAt,
		UpdatedAt:         model.UpdatedAt,
	}
}
