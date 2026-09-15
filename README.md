# Auno Studio

Auno Studio Web 2.0 is a self-hosted content creation, editing, publishing, and AI video studio built on the OpenPost foundation.

It keeps OpenPost's native image editor, video editor, media library, recorder, composer, scheduling, inbox, analytics, workspace model, and self-host deployment architecture, then adds Auno-owned Auto Video, AI media, and Motion Engine capabilities.

## Foundation

Auno Studio is based on [OpenPost](https://github.com/getopenpost/openpost), imported at commit `d18b313e48ebd7311188d23c33044a9e9f1f77b7` and linked as an upstream parent in this repository's history.

OpenPost is licensed under GNU AGPL-3.0-only. Auno Studio preserves the upstream license and notices. See `LICENSE`, `licenses/`, and `docs/upstream/openpost.md`.

## Architecture

The approved Auno Studio Web 2.0 architecture and implementation plans live under:

- `docs/superpowers/specs/2026-09-15-auno-studio-web-2-design.md`
- `docs/superpowers/plans/2026-09-15-auno-studio-web-2-master.md`

Primary direction:

- OpenPost remains the editor/project/publishing foundation.
- SQLite + local media remain the default self-host configuration.
- PostgreSQL and S3-compatible storage remain optional.
- AI Auto Video generates editable native project state instead of only flattened MP4 output.
- Auno Motion Engine extends native video projects with reusable motion language and editable compositions.

## Status

Auno Studio Web 2.0 is under active development toward the `2.0.0` release line.
