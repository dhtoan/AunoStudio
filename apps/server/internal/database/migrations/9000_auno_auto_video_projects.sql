CREATE TABLE IF NOT EXISTS auno_auto_video_projects (
  project_id TEXT PRIMARY KEY,
  workspace_id TEXT NOT NULL,
  generation_version BIGINT NOT NULL DEFAULT 1,
  template_id TEXT NOT NULL DEFAULT '',
  source_manifest_json TEXT NOT NULL DEFAULT '{}',
  storyboard_json TEXT NOT NULL DEFAULT '{}',
  provider_manifest_json TEXT NOT NULL DEFAULT '{}',
  generation_graph_json TEXT NOT NULL DEFAULT '{}',
  created_at TIMESTAMP NOT NULL DEFAULT current_timestamp,
  updated_at TIMESTAMP NOT NULL DEFAULT current_timestamp,
  FOREIGN KEY (project_id) REFERENCES video_projects(id) ON DELETE CASCADE,
  FOREIGN KEY (workspace_id) REFERENCES workspaces(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS auno_auto_video_projects_workspace_updated_idx
  ON auno_auto_video_projects (workspace_id, updated_at);
