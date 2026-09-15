CREATE TABLE IF NOT EXISTS auno_documentary_runs (
  id TEXT PRIMARY KEY,
  workspace_id TEXT NOT NULL,
  project_id TEXT,
  schema_version BIGINT NOT NULL DEFAULT 1,
  generation_version BIGINT NOT NULL DEFAULT 1,
  current_step TEXT NOT NULL DEFAULT 'source',
  state_json TEXT NOT NULL DEFAULT '{}',
  provider_manifest_json TEXT NOT NULL DEFAULT '{}',
  created_at TIMESTAMP NOT NULL DEFAULT current_timestamp,
  updated_at TIMESTAMP NOT NULL DEFAULT current_timestamp,
  FOREIGN KEY (workspace_id) REFERENCES workspaces(id) ON DELETE CASCADE,
  FOREIGN KEY (project_id) REFERENCES video_projects(id) ON DELETE SET NULL
);

CREATE INDEX IF NOT EXISTS auno_documentary_runs_workspace_updated_idx
  ON auno_documentary_runs (workspace_id, updated_at);
