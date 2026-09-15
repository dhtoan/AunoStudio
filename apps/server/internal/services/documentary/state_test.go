package documentary

import (
	"testing"

	"github.com/openpost/backend/internal/database"
	"github.com/openpost/backend/internal/models"
	"github.com/stretchr/testify/require"
)

func documentaryTestStore(t *testing.T) (*Store, string) {
	t.Helper()
	db, err := database.InitDB("file::memory:?cache=shared")
	require.NoError(t, err)
	t.Cleanup(func() { require.NoError(t, db.Close()) })
	require.NoError(t, database.CreateSchema(db))

	workspaceID := "workspace-documentary"
	_, err = db.NewInsert().Model(&models.Workspace{
		ID:   workspaceID,
		Name: "Documentary Test",
	}).Exec(t.Context())
	require.NoError(t, err)

	return NewStore(db), workspaceID
}

func TestStorePersistsRunBeforeProjectCreation(t *testing.T) {
	store, workspaceID := documentaryTestStore(t)

	created, err := store.Create(t.Context(), workspaceID, Run{
		CurrentStep: StepTopic,
		Language:    "en-US",
		Niche:       "History",
	})
	require.NoError(t, err)
	require.NotEmpty(t, created.ID)
	require.Empty(t, created.ProjectID)
	require.EqualValues(t, 1, created.GenerationVersion)

	reloaded, err := store.Get(t.Context(), workspaceID, created.ID)
	require.NoError(t, err)
	require.Equal(t, created.ID, reloaded.ID)
	require.Equal(t, "History", reloaded.Niche)
	require.Equal(t, StepTopic, reloaded.CurrentStep)
}

func TestStoreUpdatesAndAttachesProjectWithOptimisticVersion(t *testing.T) {
	store, workspaceID := documentaryTestStore(t)
	created, err := store.Create(t.Context(), workspaceID, Run{CurrentStep: StepTopic, Language: "en-US"})
	require.NoError(t, err)

	created.CustomTopic = "The hidden logistics of a historical event"
	updated, err := store.Upsert(t.Context(), workspaceID, *created, created.GenerationVersion)
	require.NoError(t, err)
	require.EqualValues(t, 2, updated.GenerationVersion)
	require.Equal(t, created.CustomTopic, updated.CustomTopic)

	_, err = store.Upsert(t.Context(), workspaceID, *updated, 1)
	require.ErrorIs(t, err, ErrConflict)

	projectID := "documentary-project"
	_, err = store.db.NewInsert().Model(&models.VideoProject{
		ID:              projectID,
		WorkspaceID:     workspaceID,
		Name:            "Documentary",
		HeadRevision:    1,
		DocumentJSON:    `{}`,
		SyncStatus:      models.VideoProjectSyncPending,
		CreatedByUserID: "test-user",
		UpdatedByUserID: "test-user",
	}).Exec(t.Context())
	require.NoError(t, err)

	attached, err := store.AttachProject(t.Context(), workspaceID, updated.ID, projectID, updated.GenerationVersion)
	require.NoError(t, err)
	require.Equal(t, projectID, attached.ProjectID)
	require.EqualValues(t, 3, attached.GenerationVersion)
}

func TestStoreScopesRunReadsToWorkspace(t *testing.T) {
	store, workspaceID := documentaryTestStore(t)
	created, err := store.Create(t.Context(), workspaceID, Run{CurrentStep: StepSource})
	require.NoError(t, err)

	_, err = store.Get(t.Context(), "another-workspace", created.ID)
	require.ErrorIs(t, err, ErrNotFound)
}
