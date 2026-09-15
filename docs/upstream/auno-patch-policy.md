# Auno Patch Policy

Auno Studio stays intentionally close to OpenPost upstream so future synchronization remains practical.

- Prefer Auno-owned packages and modules for new product functionality.
- Patch OpenPost core only when no stable extension seam exists.
- Keep every unavoidable core patch small and document its reason and upstream sync risk.
- Do not rewrite historical OpenPost migrations.
- Reserve migration versions `9000` through `9099` for Auno-owned migrations and include `_auno_` in their filenames.
- Do not mass-rename OpenPost internal package names, Go module paths, API types, or `OPENPOST_*` compatibility environment variables only for branding.
- Product-facing branding may use Auno Studio while internal OpenPost identifiers stay intact when that reduces merge conflicts.
