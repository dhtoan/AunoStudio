# OpenPost Upstream

Auno Studio Web 2.0 uses OpenPost as its application, editor, project, media, publishing, and self-hosting foundation.

- Upstream repository: https://github.com/getopenpost/openpost
- Developer remote name: `upstream-openpost`
- Upstream branch: `main`
- Imported base commit: `d18b313e48ebd7311188d23c33044a9e9f1f77b7`

The Auno Studio merge commit keeps the imported OpenPost commit as an explicit second parent so upstream ancestry remains visible in repository history.

## Updating the foundation

```bash
git remote add upstream-openpost https://github.com/getopenpost/openpost.git 2>/dev/null || \
  git remote set-url upstream-openpost https://github.com/getopenpost/openpost.git
git fetch upstream-openpost main --tags
git merge upstream-openpost/main
```

Keep Auno-owned functionality in focused Auno modules/packages where practical. Avoid mass-renaming OpenPost internal package names, Go module paths, or `OPENPOST_*` compatibility configuration solely for branding.
