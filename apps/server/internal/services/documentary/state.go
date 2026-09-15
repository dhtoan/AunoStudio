package documentary

import (
	"context"
	"database/sql"
	"encoding/json"
	"errors"
	"strings"
	"time"

	"github.com/google/uuid"
	"github.com/openpost/backend/internal/models"
	"github.com/uptrace/bun"
)

const (
	maxDocumentaryStateBytes    = 4 * 1024 * 1024
	maxProviderManifestBytes    = 64 * 1024
)

var (
	ErrNotFound = errors.New("documentary run not found")
	ErrConflict = errors.New("documentary run version conflict")
)

type Store struct {
	db  *bun.DB
	now func() time.Time
}

func NewStore(db *bun.DB) *Store {
	return &Store{db: db, now: time.Now}
}

func (s *Store) Create(ctx context.Context, workspaceID string, seed Run) (*Run, error) {
	workspaceID = strings.TrimSpace(workspaceID)
	if s == nil || s.db == nil || workspaceID == "" {
		return nil, ErrInvalid
	}
	if err := ensureDocumentaryWorkspace(ctx, s.db, workspaceID); err != nil {
		return nil, err
	}

	now := s.now().UTC()
	seed.SchemaVersion = SchemaVersion
	seed.ID = uuid.NewString()
	seed.WorkspaceID = workspaceID
	seed.ProjectID = ""
	seed.Mode = ModeDocumentaryLongForm
	seed.Style = StyleDocumentaryPaperCollage
	if seed.CurrentStep == "" {
		seed.CurrentStep = StepSource
	}
	seed.GenerationVersion = 1
	if seed.StepStates == nil {
		seed.StepStates = map[Step]StepState{}
	}
	if seed.ProviderManifest == nil {
		seed.ProviderManifest = map[string]string{}
	}
	seed.CreatedAt = now
	seed.UpdatedAt = now
	if err := ValidateRun(&seed); err != nil {
		return nil, err
	}

	stateJSON, providerJSON, err := encodeDocumentaryRun(seed)
	if err != nil {
		return nil, err
	}
	model := &models.AunoDocumentaryRun{
		ID:                   seed.ID,
		WorkspaceID:          workspaceID,
		SchemaVersion:        SchemaVersion,
		GenerationVersion:    1,
		CurrentStep:          string(seed.CurrentStep),
		StateJSON:            stateJSON,
		ProviderManifestJSON: providerJSON,
		CreatedAt:            now,
		UpdatedAt:            now,
	}
	if _, err := s.db.NewInsert().Model(model).Exec(ctx); err != nil {
		return nil, err
	}
	return s.Get(ctx, workspaceID, seed.ID)
}

func (s *Store) Get(ctx context.Context, workspaceID, runID string) (*Run, error) {
	workspaceID = strings.TrimSpace(workspaceID)
	runID = strings.TrimSpace(runID)
	if s == nil || s.db == nil || workspaceID == "" || runID == "" {
		return nil, ErrInvalid
	}
	var model models.AunoDocumentaryRun
	if err := s.db.NewSelect().Model(&model).
		Where("id = ? AND workspace_id = ?", runID, workspaceID).
		Scan(ctx); err != nil {
		if errors.Is(err, sql.ErrNoRows) {
			return nil, ErrNotFound
		}
		return nil, err
	}
	return decodeDocumentaryRun(&model)
}

func (s *Store) Upsert(
	ctx context.Context,
	workspaceID string,
	run Run,
	expectedGenerationVersion int64,
) (*Run, error) {
	workspaceID = strings.TrimSpace(workspaceID)
	run.ID = strings.TrimSpace(run.ID)
	if s == nil || s.db == nil || workspaceID == "" || run.ID == "" || expectedGenerationVersion < 1 {
		return nil, ErrInvalid
	}
	current, err := s.Get(ctx, workspaceID, run.ID)
	if err != nil {
		return nil, err
	}
	if current.GenerationVersion != expectedGenerationVersion {
		return nil, ErrConflict
	}

	run.SchemaVersion = SchemaVersion
	run.WorkspaceID = workspaceID
	run.Mode = ModeDocumentaryLongForm
	run.Style = StyleDocumentaryPaperCollage
	run.GenerationVersion = expectedGenerationVersion + 1
	run.CreatedAt = current.CreatedAt
	run.UpdatedAt = s.now().UTC()
	if run.StepStates == nil {
		run.StepStates = map[Step]StepState{}
	}
	if run.ProviderManifest == nil {
		run.ProviderManifest = map[string]string{}
	}
	if err := ValidateRun(&run); err != nil {
		return nil, err
	}
	stateJSON, providerJSON, err := encodeDocumentaryRun(run)
	if err != nil {
		return nil, err
	}

	result, err := s.db.NewUpdate().Model((*models.AunoDocumentaryRun)(nil)).
		Set("project_id = ?", nullableString(run.ProjectID)).
		Set("schema_version = ?", SchemaVersion).
		Set("generation_version = ?", run.GenerationVersion).
		Set("current_step = ?", string(run.CurrentStep)).
		Set("state_json = ?", stateJSON).
		Set("provider_manifest_json = ?", providerJSON).
		Set("updated_at = ?", run.UpdatedAt).
		Where("id = ? AND workspace_id = ? AND generation_version = ?", run.ID, workspaceID, expectedGenerationVersion).
		Exec(ctx)
	if err != nil {
		return nil, err
	}
	rows, err := result.RowsAffected()
	if err != nil {
		return nil, err
	}
	if rows == 0 {
		if _, getErr := s.Get(ctx, workspaceID, run.ID); errors.Is(getErr, ErrNotFound) {
			return nil, ErrNotFound
		}
		return nil, ErrConflict
	}
	return s.Get(ctx, workspaceID, run.ID)
}

func (s *Store) AttachProject(
	ctx context.Context,
	workspaceID, runID, projectID string,
	expectedGenerationVersion int64,
) (*Run, error) {
	workspaceID = strings.TrimSpace(workspaceID)
	runID = strings.TrimSpace(runID)
	projectID = strings.TrimSpace(projectID)
	if workspaceID == "" || runID == "" || projectID == "" || expectedGenerationVersion < 1 {
		return nil, ErrInvalid
	}
	if err := ensureDocumentaryProject(ctx, s.db, workspaceID, projectID); err != nil {
		return nil, err
	}
	run, err := s.Get(ctx, workspaceID, runID)
	if err != nil {
		return nil, err
	}
	run.ProjectID = projectID
	return s.Upsert(ctx, workspaceID, *run, expectedGenerationVersion)
}

func (s *Store) Delete(ctx context.Context, workspaceID, runID string) error {
	workspaceID = strings.TrimSpace(workspaceID)
	runID = strings.TrimSpace(runID)
	if s == nil || s.db == nil || workspaceID == "" || runID == "" {
		return ErrInvalid
	}
	result, err := s.db.NewDelete().Model((*models.AunoDocumentaryRun)(nil)).
		Where("id = ? AND workspace_id = ?", runID, workspaceID).
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

func encodeDocumentaryRun(run Run) (string, string, error) {
	state := run
	state.ProviderManifest = nil
	stateBytes, err := json.Marshal(state)
	if err != nil || len(stateBytes) == 0 || len(stateBytes) > maxDocumentaryStateBytes {
		return "", "", ErrInvalid
	}
	providers := run.ProviderManifest
	if providers == nil {
		providers = map[string]string{}
	}
	providerBytes, err := json.Marshal(providers)
	if err != nil || len(providerBytes) > maxProviderManifestBytes {
		return "", "", ErrInvalid
	}
	return string(stateBytes), string(providerBytes), nil
}

func decodeDocumentaryRun(model *models.AunoDocumentaryRun) (*Run, error) {
	if model == nil || len(model.StateJSON) == 0 || len(model.StateJSON) > maxDocumentaryStateBytes {
		return nil, ErrInvalid
	}
	var run Run
	if err := json.Unmarshal([]byte(model.StateJSON), &run); err != nil {
		return nil, ErrInvalid
	}
	providers := map[string]string{}
	if model.ProviderManifestJSON != "" {
		if len(model.ProviderManifestJSON) > maxProviderManifestBytes || json.Unmarshal([]byte(model.ProviderManifestJSON), &providers) != nil {
			return nil, ErrInvalid
		}
	}
	run.SchemaVersion = model.SchemaVersion
	run.ID = model.ID
	run.WorkspaceID = model.WorkspaceID
	run.ProjectID = model.ProjectID
	run.Mode = ModeDocumentaryLongForm
	run.Style = StyleDocumentaryPaperCollage
	run.CurrentStep = Step(model.CurrentStep)
	run.GenerationVersion = model.GenerationVersion
	run.ProviderManifest = providers
	run.CreatedAt = model.CreatedAt
	run.UpdatedAt = model.UpdatedAt
	if run.StepStates == nil {
		run.StepStates = map[Step]StepState{}
	}
	if err := ValidateRun(&run); err != nil {
		return nil, err
	}
	return &run, nil
}

func ensureDocumentaryWorkspace(ctx context.Context, db *bun.DB, workspaceID string) error {
	var workspace models.Workspace
	if err := db.NewSelect().Model(&workspace).
		Column("id").
		Where("id = ?", workspaceID).
		Scan(ctx); err != nil {
		if errors.Is(err, sql.ErrNoRows) {
			return ErrNotFound
		}
		return err
	}
	return nil
}

func ensureDocumentaryProject(ctx context.Context, db *bun.DB, workspaceID, projectID string) error {
	if db == nil {
		return ErrInvalid
	}
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

func nullableString(value string) any {
	value = strings.TrimSpace(value)
	if value == "" {
		return nil
	}
	return value
}
