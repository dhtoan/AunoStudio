package models

import (
	"time"

	"github.com/uptrace/bun"
)

type AunoDocumentaryRun struct {
	bun.BaseModel `bun:"table:auno_documentary_runs"`

	ID                   string    `bun:",pk" json:"id"`
	WorkspaceID          string    `bun:"workspace_id,notnull" json:"workspace_id"`
	ProjectID            string    `bun:"project_id,nullzero" json:"project_id,omitempty"`
	SchemaVersion        int       `bun:"schema_version,notnull,default:1" json:"schema_version"`
	GenerationVersion    int64     `bun:"generation_version,notnull,default:1" json:"generation_version"`
	CurrentStep          string    `bun:"current_step,notnull,default:'source'" json:"current_step"`
	StateJSON            string    `bun:"state_json,notnull,default:'{}'" json:"-"`
	ProviderManifestJSON string    `bun:"provider_manifest_json,notnull,default:'{}'" json:"-"`
	CreatedAt            time.Time `bun:"created_at,nullzero,notnull,default:current_timestamp" json:"created_at"`
	UpdatedAt            time.Time `bun:"updated_at,nullzero,notnull,default:current_timestamp" json:"updated_at"`
}
