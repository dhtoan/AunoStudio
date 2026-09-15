package models

import (
	"time"

	"github.com/uptrace/bun"
)

type AunoAutoVideoProject struct {
	bun.BaseModel `bun:"table:auno_auto_video_projects"`

	ProjectID            string    `bun:"project_id,pk" json:"project_id"`
	WorkspaceID          string    `bun:"workspace_id,notnull" json:"workspace_id"`
	GenerationVersion    int64     `bun:"generation_version,notnull,default:1" json:"generation_version"`
	TemplateID           string    `bun:"template_id,notnull,default:''" json:"template_id,omitempty"`
	SourceManifestJSON   string    `bun:"source_manifest_json,notnull,default:'{}'" json:"-"`
	StoryboardJSON       string    `bun:"storyboard_json,notnull,default:'{}'" json:"-"`
	ProviderManifestJSON string    `bun:"provider_manifest_json,notnull,default:'{}'" json:"-"`
	GenerationGraphJSON  string    `bun:"generation_graph_json,notnull,default:'{}'" json:"-"`
	CreatedAt            time.Time `bun:"created_at,nullzero,notnull,default:current_timestamp" json:"created_at"`
	UpdatedAt            time.Time `bun:"updated_at,nullzero,notnull,default:current_timestamp" json:"updated_at"`
}
