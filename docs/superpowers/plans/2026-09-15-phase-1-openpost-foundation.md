# Phase 1 — OpenPost Foundation Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Import OpenPost as the Auno Studio Web 2.0 foundation, establish a maintainable upstream relationship, replace public-facing OpenPost branding with Auno Studio branding, keep OpenPost's image/video editors as the only production editors, and deliver a production-ready Docker/aaPanel baseline with SQLite/local defaults plus optional PostgreSQL/S3-compatible deployment.

**Architecture:** Preserve OpenPost's current Bun/SvelteKit frontend and Go backend architecture. Keep internal OpenPost module names and `OPENPOST_*` compatibility environment variables unless a product-facing rename is required. Add Auno-owned code behind isolated packages/modules, keep upstream patches small, and validate the fork with the same CI, migration, security, and container checks OpenPost already uses.

**Tech Stack:** Bun 1.3.11, Svelte 5/SvelteKit, TypeScript, Go 1.26.6, Echo/Huma, Bun ORM, SQLite, PostgreSQL, S3-compatible BlobStorage, Docker Compose, GitHub Actions, Playwright/Vitest/Go test.

**Spec:** `docs/superpowers/specs/2026-09-15-auno-studio-web-2-design.md`

## Global Constraints

- OpenPost remains the editor/project/publishing foundation; do not introduce a second editor stack.
- The old Auno Photo/Video Editor code is not imported into this repository.
- Preserve upstream OpenPost internal names where renaming would increase merge conflict cost without user value.
- Default self-host deployment must run with one application container, SQLite, and local media.
- PostgreSQL and S3/R2/MinIO are optional configurations, not default requirements.
- Do not add Redis, RabbitMQ, or Kafka.
- Default installation must not require a GPU or AI worker.
- AGPL compliance is a release gate. Do not remove upstream notices or license text.
- Auno-added code that becomes part of the combined OpenPost-derived program is treated consistently with the repository's AGPL distribution obligations.
- Do not enable OpenPost-managed diagnostics/update endpoints by default in the Auno fork unless Auno owns the endpoint.
- All behavior-changing work follows red → green → refactor and lands in small commits.

## Target File Structure After This Phase

```text
AunoStudio/
├── apps/                         # imported OpenPost apps
│   ├── server/
│   ├── web/
│   ├── cli/
│   ├── mobile/
│   ├── docs/
│   └── marketing/
├── packages/
│   ├── auno-brand/              # Auno-owned public brand contract
│   └── ...                      # imported OpenPost packages
├── deploy/
│   ├── docker/
│   └── aapanel/
│       └── docker-compose.yml
├── docs/
│   ├── deployment/
│   │   └── aapanel.md
│   ├── upstream/
│   │   └── openpost.md
│   └── superpowers/
├── licenses/
│   └── openpost/
│       └── LICENSE
├── NOTICE.md
├── docker-compose.yml
├── .env.example
└── .github/workflows/ci.yml
```

---

## Task 1: Import OpenPost with upstream history intact

**Files:**
- Preserve: `docs/superpowers/specs/2026-09-15-auno-studio-web-2-design.md`
- Preserve: `docs/superpowers/plans/2026-09-15-phase-1-openpost-foundation.md`
- Modify after merge: `README.md`
- Create: `docs/upstream/openpost.md`

- [ ] **Step 1: Create an isolated feature worktree before touching the root checkout**

```bash
git fetch origin main
git worktree add ../AunoStudio-phase1 -b feat/phase-1-openpost-foundation origin/main
cd ../AunoStudio-phase1
```

Expected: new worktree on `feat/phase-1-openpost-foundation` with the approved spec and plan present.

- [ ] **Step 2: Register OpenPost as the long-lived upstream remote**

```bash
git remote add upstream-openpost https://github.com/getopenpost/openpost.git
git fetch upstream-openpost main --tags
```

Verify:

```bash
git remote -v
git rev-parse upstream-openpost/main
```

- [ ] **Step 3: Merge upstream history instead of copying a source snapshot**

```bash
git merge upstream-openpost/main --allow-unrelated-histories --no-commit
```

Resolve the expected `README.md` collision by keeping Auno Studio as the product title while retaining an explicit upstream attribution section. Do not delete the approved `docs/superpowers/**` files.

- [ ] **Step 4: Record the exact upstream base commit**

Create `docs/upstream/openpost.md` with the SHA emitted by `git rev-parse upstream-openpost/main` at execution time and the repeatable update process:

```markdown
# OpenPost Upstream

Remote: `https://github.com/getopenpost/openpost.git`
Remote name: `upstream-openpost`
Base branch: `main`

The current Auno Studio foundation was merged from the exact commit recorded by:

```bash
git rev-parse upstream-openpost/main
```

To update:

```bash
git fetch upstream-openpost main --tags
git checkout -b chore/sync-openpost-YYYY-MM-DD origin/main
git merge upstream-openpost/main
bun install --frozen-lockfile
bun run check
bun run test
```
```

After writing the file, replace the command-output statement with the literal SHA so the document is immutable evidence of the imported base.

- [ ] **Step 5: Commit the foundation merge**

```bash
git add -A
git commit -m "chore: import OpenPost foundation with upstream history"
```

- [ ] **Step 6: Install and run the untouched upstream baseline before Auno patches**

```bash
bun install --frozen-lockfile
bun run check
bun run test
```

Backend-only fallback if the aggregate test command is too expensive for the workstation:

```bash
cd apps/server
go test ./...
cd ../..
bun --cwd apps/web run check
bun --cwd apps/web run test
```

Expected: any failure must be recorded as an upstream baseline failure before Auno-specific edits. Do not “fix” unrelated upstream failures inside this phase without a separate commit and written reason.

---

## Task 2: Lock the Auno patch boundary and migration namespace

**Files:**
- Create: `docs/upstream/auno-patch-policy.md`
- Create: `apps/server/internal/database/migrations/auno_version_policy_test.go`
- Test: `apps/server/internal/database/migrations/auno_version_policy_test.go`

OpenPost migrations are numeric and collision-sensitive. Reserve `9000–9099` for Auno Studio-owned migrations so Auno features can evolve without opportunistically consuming OpenPost's current sequence.

- [ ] **Step 1: Write the failing migration-range test**

```go
package migrations

import (
    "io/fs"
    "strconv"
    "strings"
    "testing"

    "github.com/stretchr/testify/require"
)

func TestAunoMigrationRangeIsReservedForAunoFiles(t *testing.T) {
    entries, err := fs.ReadDir(migrationFiles, ".")
    require.NoError(t, err)

    for _, entry := range entries {
        if entry.IsDir() || !strings.HasSuffix(entry.Name(), ".sql") {
            continue
        }
        version, err := parseVersion(entry.Name())
        require.NoError(t, err)
        if version < 9000 || version > 9099 {
            continue
        }
        require.Contains(t, entry.Name(), "_auno_",
            "reserved Auno migration "+strconv.FormatInt(version, 10)+" must contain _auno_ in its filename")
    }
}
```

- [ ] **Step 2: Run the test and confirm the expected initial state**

```bash
cd apps/server
go test ./internal/database/migrations -run TestAunoMigrationRangeIsReservedForAunoFiles -v
```

Expected: pass with zero Auno migrations today. The test is a policy guard for future tasks.

- [ ] **Step 3: Add `docs/upstream/auno-patch-policy.md`**

The document must state:

```text
Auno-owned packages/modules: preferred.
OpenPost core patches: only when no stable extension seam exists.
Every core patch: test + reason + upstream sync note.
Auno SQL migration range: 9000–9099 and `_auno_` filename marker.
Do not rewrite historical OpenPost migrations.
Do not mass-rename OpenPost internal symbols.
```

- [ ] **Step 4: Run the migration chain tests on SQLite**

```bash
cd apps/server
go test ./internal/database/migrations -run 'TestMigrationChain|TestAunoMigrationRange' -v
```

- [ ] **Step 5: Commit**

```bash
git add docs/upstream/auno-patch-policy.md apps/server/internal/database/migrations/auno_version_policy_test.go
git commit -m "test: reserve Auno migration namespace"
```

---

## Task 3: Add the Auno brand contract without mass-renaming OpenPost internals

**Files:**
- Create: `packages/auno-brand/package.json`
- Create: `packages/auno-brand/tsconfig.json`
- Create: `packages/auno-brand/src/index.ts`
- Create: `packages/auno-brand/src/index.test.ts`
- Modify: `apps/web/package.json`
- Modify: `apps/web/src/lib/components/Logo.svelte`
- Modify: `apps/web/src/lib/components/Logo.svelte.test.ts`

- [ ] **Step 1: Write the brand contract test first**

```ts
import { describe, expect, it } from 'vitest';
import { AUNO_BRAND } from './index';

describe('AUNO_BRAND', () => {
  it('exposes one stable product identity', () => {
    expect(AUNO_BRAND.productName).toBe('Auno Studio');
    expect(AUNO_BRAND.shortName).toBe('Auno');
    expect(AUNO_BRAND.repository).toBe('https://github.com/dhtoan/AunoStudio');
  });
});
```

- [ ] **Step 2: Run it before implementation and confirm failure**

```bash
bun test packages/auno-brand/src/index.test.ts
```

Expected: fail because the package does not exist.

- [ ] **Step 3: Create the workspace package**

`packages/auno-brand/package.json`:

```json
{
  "name": "@auno/brand",
  "private": true,
  "type": "module",
  "exports": {
    ".": "./src/index.ts"
  }
}
```

`packages/auno-brand/tsconfig.json`:

```json
{
  "extends": "../../tsconfig.json",
  "compilerOptions": {
    "noEmit": true
  },
  "include": ["src/**/*.ts"]
}
```

`packages/auno-brand/src/index.ts`:

```ts
export const AUNO_BRAND = Object.freeze({
  productName: 'Auno Studio',
  shortName: 'Auno',
  repository: 'https://github.com/dhtoan/AunoStudio',
  documentationName: 'Auno Studio Docs'
} as const);
```

- [ ] **Step 4: Wire the package into the web workspace**

Add to `apps/web/package.json` dependencies:

```json
"@auno/brand": "workspace:*"
```

Then:

```bash
bun install
bun test packages/auno-brand/src/index.test.ts
```

Expected: pass.

- [ ] **Step 5: Change the Logo component test before the component**

Update `apps/web/src/lib/components/Logo.svelte.test.ts` so the accessible image name and visible wordmark expect `Auno Studio`, not `OpenPost`.

The mark test must still prove the mark follows `--action-focal` so theme integration is preserved.

Run:

```bash
bun --cwd apps/web run test -- Logo.svelte.test.ts
```

Expected: fail against the OpenPost logo copy.

- [ ] **Step 6: Update `Logo.svelte`**

Import the brand contract and replace the public wordmark/ARIA label with `AUNO_BRAND.productName`. Replace the four-quadrant OpenPost-specific mark with a simple theme-colored Auno `A` monogram drawn in local SVG so Auno Studio does not present the OpenPost logo as its own brand.

Do not alter theme color plumbing.

- [ ] **Step 7: Re-run focused and package tests**

```bash
bun test packages/auno-brand/src/index.test.ts
bun --cwd apps/web run test -- Logo.svelte.test.ts
bun --cwd apps/web run check
```

- [ ] **Step 8: Commit**

```bash
git add packages/auno-brand apps/web/package.json bun.lock apps/web/src/lib/components/Logo.svelte apps/web/src/lib/components/Logo.svelte.test.ts
git commit -m "feat: add Auno Studio brand boundary"
```

---

## Task 4: Add an Auno Home dashboard without moving the existing composer route

**Files:**
- Create: `apps/web/src/routes/home/+page.svelte`
- Create: `apps/web/src/lib/auno/home-actions.ts`
- Create: `apps/web/src/lib/auno/home-actions.test.ts`
- Modify: `apps/web/src/lib/app-navigation.ts`
- Modify: `apps/web/src/lib/components/sidebar-left.svelte`
- Modify: `apps/web/src/lib/components/mobile-more-menu.svelte`
- Test: existing navigation tests plus new focused test

The existing OpenPost root `/` remains the Social Post composer. Auno Home is `/home`. This avoids a high-conflict route move while still delivering the approved Home surface.

- [ ] **Step 1: Write the action-model test**

```ts
import { describe, expect, it } from 'vitest';
import { phaseOneCreateActions } from './home-actions';

describe('phaseOneCreateActions', () => {
  it('routes every available creator into an existing OpenPost surface', () => {
    expect(phaseOneCreateActions.map((item) => item.href)).toEqual([
      '/video-editor',
      '/image-editor',
      '/record',
      '/'
    ]);
  });
});
```

- [ ] **Step 2: Run and confirm failure**

```bash
bun --cwd apps/web x vitest run src/lib/auno/home-actions.test.ts
```

- [ ] **Step 3: Implement `home-actions.ts` minimally**

```ts
export const phaseOneCreateActions = [
  { id: 'video', label: 'Edit video', href: '/video-editor' },
  { id: 'photo', label: 'Edit photo', href: '/image-editor' },
  { id: 'record', label: 'Record', href: '/record' },
  { id: 'post', label: 'Create social post', href: '/' }
] as const;
```

Phase 2 will insert `AI Auto Video` into the same contract once `/auto-video` exists; Phase 1 must not expose a dead link.

- [ ] **Step 4: Extend app navigation with a real `home` family**

In `apps/web/src/lib/app-navigation.ts`:

- add `home` to `PrimaryNavigationItem['id']`;
- add `home` to `AppRouteFamily`;
- map `home: ['/home']`;
- add the item `{ id: 'home', label: 'Home', href: '/home', family: 'home', mobile: false }`.

Update any exhaustive switches/tests so TypeScript remains exhaustive.

- [ ] **Step 5: Build `/home` as an action-oriented page**

The Phase 1 page contains only data already available without new backend APIs:

```text
Auno Studio
Create something
  Edit Video
  Edit Photo
  Record
  Social Post

Continue editing
  link to /video-editor

Publishing
  link to /publications

Media
  link to /media
```

Do not fake analytics counts or project counts. Later phases can replace link cards with live summaries.

- [ ] **Step 6: Add Home to desktop navigation and More on mobile**

Modify `sidebar-left.svelte` and `mobile-more-menu.svelte` to expose `/home` while preserving Publications/Inbox/Analytics/Media placement.

Change the sidebar logo href from `/` to `/home`; the Create/Post buttons remain responsible for opening `/`.

- [ ] **Step 7: Run focused navigation tests**

```bash
bun --cwd apps/web x vitest run src/lib/auno/home-actions.test.ts src/lib/app-navigation.test.ts
bun --cwd apps/web run check
```

If `src/lib/app-navigation.test.ts` does not exist in the imported upstream revision, create it and assert `/home` activation plus the existing `/video-editor` local-editor behavior before changing navigation code.

- [ ] **Step 8: Commit**

```bash
git add apps/web/src/lib/auno apps/web/src/lib/app-navigation.ts apps/web/src/lib/components/sidebar-left.svelte apps/web/src/lib/components/mobile-more-menu.svelte apps/web/src/routes/home
git commit -m "feat: add Auno Studio home surface"
```

---

## Task 5: Consolidate the Create menu around OpenPost editors

**Files:**
- Create: `apps/web/src/lib/auno/create-actions.ts`
- Create: `apps/web/src/lib/auno/create-actions.test.ts`
- Modify: `apps/web/src/lib/components/sidebar-left.svelte`
- Modify: `apps/web/src/lib/components/mobile-bottom-nav.svelte`

- [ ] **Step 1: Write the failing shared create-menu test**

```ts
import { describe, expect, it } from 'vitest';
import { createActions } from './create-actions';

describe('createActions', () => {
  it('uses the OpenPost editors as the only photo/video edit destinations', () => {
    expect(createActions).toEqual([
      { id: 'video', label: 'Video', href: '/video-editor' },
      { id: 'photo', label: 'Photo / Carousel', href: '/image-editor' },
      { id: 'record', label: 'Record', href: '/record' },
      { id: 'post', label: 'Social Post', href: '/' }
    ]);
  });
});
```

- [ ] **Step 2: Confirm red**

```bash
bun --cwd apps/web x vitest run src/lib/auno/create-actions.test.ts
```

- [ ] **Step 3: Implement the shared action list and use it in both menus**

Create `create-actions.ts` with the exact values above. Refactor the desktop dropdown in `sidebar-left.svelte` and mobile dropdown in `mobile-bottom-nav.svelte` to render the same action source instead of duplicating editor links.

Keep the existing SvelteKit `resolveAppPath()` navigation behavior.

- [ ] **Step 4: Verify no legacy Auno editor route exists**

```bash
rg -n "legacy.*editor|old.*editor|auno-photo-editor|auno-video-editor" apps packages || true
```

Expected: no production route/import from a legacy Auno editor because this repository began from OpenPost rather than the previous Auno codebase.

- [ ] **Step 5: Test and commit**

```bash
bun --cwd apps/web x vitest run src/lib/auno/create-actions.test.ts
bun --cwd apps/web run check
git add apps/web/src/lib/auno/create-actions* apps/web/src/lib/components/sidebar-left.svelte apps/web/src/lib/components/mobile-bottom-nav.svelte
git commit -m "refactor: centralize Auno create destinations"
```

---

## Task 6: Remove upstream-managed diagnostics/update defaults from the Auno self-host fork

**Files:**
- Modify: `apps/server/internal/config/config.go`
- Modify: `apps/server/internal/config/config_test.go`
- Modify: `.env.example`
- Modify: `docs/reference/configuration/diagnostics.md` if imported upstream documentation still claims OpenPost-managed defaults

Auno Studio must not silently send diagnostics to `app.openpo.st` or rely on OpenPost's update service by default.

- [ ] **Step 1: Add failing config tests**

```go
func TestAunoSelfHostDisablesManagedDiagnosticsByDefault(t *testing.T) {
    cfg := Load()
    require.False(t, cfg.DiagnosticsEnabled)
    require.Empty(t, cfg.DiagnosticsReceiverURL)
}

func TestAunoSelfHostDisablesOpenPostUpdateChecksByDefault(t *testing.T) {
    cfg := Load()
    require.False(t, cfg.UpdateCheckEnabled)
}
```

- [ ] **Step 2: Confirm the tests fail against upstream defaults**

```bash
cd apps/server
go test ./internal/config -run 'TestAunoSelfHostDisables' -v
```

Expected: diagnostics/update assertions fail on the imported OpenPost defaults.

- [ ] **Step 3: Change defaults without removing explicit operator configuration**

In `config.go`:

- self-host diagnostics default to disabled;
- default diagnostics receiver URL is empty;
- update checks default to disabled;
- explicit `OPENPOST_DIAGNOSTICS_ENABLED=true` plus an explicit receiver still works;
- explicit `OPENPOST_UPDATE_CHECK_ENABLED=true` still works if an operator has intentionally configured the supporting endpoint path.

Do not rename the existing compatibility environment variables in this phase.

- [ ] **Step 4: Update `.env.example` to make the privacy-safe behavior obvious**

Document:

```dotenv
OPENPOST_DIAGNOSTICS_ENABLED=false
OPENPOST_DIAGNOSTICS_RECEIVER_URL=
OPENPOST_UPDATE_CHECK_ENABLED=false
```

- [ ] **Step 5: Run config and security tests**

```bash
cd apps/server
go test ./internal/config ./internal/diagnostics/... -v
```

- [ ] **Step 6: Commit**

```bash
git add apps/server/internal/config .env.example docs/reference/configuration/diagnostics.md
git commit -m "fix: make Auno self-host telemetry opt-in"
```

---

## Task 7: Rebrand product metadata while preserving internal OpenPost identifiers

**Files:**
- Modify: `deploy/docker/Dockerfile`
- Modify: `apps/web/static/manifest.webmanifest` or the imported PWA manifest source used by this revision
- Modify: `apps/web/src/routes/u/[username]/+page.svelte`
- Modify: selected public/auth Svelte routes containing literal user-visible `OpenPost`
- Create: `scripts/check-auno-brand-surface.mjs`
- Create: `scripts/check-auno-brand-surface.test.mjs`

- [ ] **Step 1: Write a fail-closed brand-surface test**

The test scans only user-facing files, not Go package/module names or legal attribution, and rejects new literal `OpenPost` brand strings in:

```text
apps/web/src/routes/**
apps/web/src/lib/components/**
deploy/docker/Dockerfile OCI title/source labels where product identity is shown
```

Allow-list intentional legal/source references under `licenses/`, `NOTICE.md`, and `docs/upstream/`.

Example core assertion:

```js
if (/\bOpenPost\b/.test(source) && !allowed(pathname)) {
  failures.push(pathname);
}
```

- [ ] **Step 2: Run and confirm it fails against imported user-facing branding**

```bash
bun scripts/check-auno-brand-surface.test.mjs
bun scripts/check-auno-brand-surface.mjs
```

- [ ] **Step 3: Replace product-facing strings with Auno Studio**

Use `@auno/brand` where TypeScript/Svelte can import it. For static manifest/Docker labels, use literal `Auno Studio` and `https://github.com/dhtoan/AunoStudio`.

Do **not** rename:

```text
github.com/openpost/backend
@openpost/* workspace packages
OPENPOST_* internal compatibility config keys
OpenPost names inside required upstream legal notices
```

- [ ] **Step 4: Run brand guard + frontend check**

```bash
bun scripts/check-auno-brand-surface.mjs
bun --cwd apps/web run check
```

- [ ] **Step 5: Commit**

```bash
git add deploy/docker/Dockerfile apps/web scripts/check-auno-brand-surface*
git commit -m "feat: rebrand public surfaces as Auno Studio"
```

---

## Task 8: Create the aaPanel-friendly default Docker deployment

**Files:**
- Modify: `docker-compose.yml`
- Create: `deploy/aapanel/docker-compose.yml`
- Create: `docs/deployment/aapanel.md`
- Create: `scripts/check-aapanel-compose.sh`

- [ ] **Step 1: Write the compose validation script before changing compose**

`scripts/check-aapanel-compose.sh`:

```bash
#!/usr/bin/env sh
set -eu

docker compose -f deploy/aapanel/docker-compose.yml config >/tmp/auno-compose.yml
grep -q '127.0.0.1:8080:8080' /tmp/auno-compose.yml
grep -q '/data' /tmp/auno-compose.yml
grep -q 'auno-studio' /tmp/auno-compose.yml
```

- [ ] **Step 2: Confirm it fails because the aaPanel compose file does not exist**

```bash
sh scripts/check-aapanel-compose.sh
```

- [ ] **Step 3: Change root `docker-compose.yml` to Auno product naming and safer binding**

Required behavior:

```yaml
services:
  auno-studio:
    image: ghcr.io/dhtoan/aunostudio:${AUNO_IMAGE_TAG:-latest}
    platform: linux/amd64
    container_name: auno-studio
    restart: unless-stopped
    env_file:
      - .env
    ports:
      - "127.0.0.1:${AUNO_HOST_PORT:-8080}:8080"
    volumes:
      - auno_studio_data:/data
    healthcheck:
      test: ["CMD", "wget", "--no-verbose", "--tries=1", "--spider", "http://localhost:8080/api/v1/health"]
    environment:
      - OPENPOST_PORT=8080
      - OPENPOST_DATABASE_DRIVER=sqlite
      - OPENPOST_DATABASE_PATH=/data/db/auno-studio.db
      - OPENPOST_STORAGE_DRIVER=local
      - OPENPOST_MEDIA_PATH=/data/media
volumes:
  auno_studio_data:
```

Keep internal `OPENPOST_*` keys because the backend consumes them and the design explicitly avoids a mass internal rename.

- [ ] **Step 4: Add `deploy/aapanel/docker-compose.yml`**

It may share the same image/config contract as root compose, but must be self-contained and bind the application port to `127.0.0.1` so aaPanel/Nginx owns public TLS.

- [ ] **Step 5: Write `docs/deployment/aapanel.md` with exact production steps**

Document:

```bash
cp .env.example .env
openssl rand -base64 48   # use output for OPENPOST_JWT_SECRET
openssl rand -base64 48   # use output for OPENPOST_ENCRYPTION_KEY
openssl rand -base64 48   # use output for OPENPOST_MEDIA_SIGNING_KEY
docker compose -f deploy/aapanel/docker-compose.yml up -d
curl --fail http://127.0.0.1:8080/api/v1/health
curl --fail http://127.0.0.1:8080/api/v1/ready
```

Then give aaPanel steps: create site/domain, issue SSL, reverse proxy to `http://127.0.0.1:8080`, enable websocket/proxy headers if required, do not expose DB/AI worker ports.

- [ ] **Step 6: Validate**

```bash
sh scripts/check-aapanel-compose.sh
docker compose -f docker-compose.yml config >/dev/null
```

- [ ] **Step 7: Commit**

```bash
git add docker-compose.yml deploy/aapanel docs/deployment/aapanel.md scripts/check-aapanel-compose.sh
git commit -m "feat: add aaPanel Docker deployment"
```

---

## Task 9: Add the optional PostgreSQL profile without changing the default

**Files:**
- Modify: `deploy/aapanel/docker-compose.yml`
- Modify: `.env.example`
- Create: `scripts/check-postgres-profile.sh`
- Reuse tests: `apps/server/internal/database/migrations/migration_chain_test.go`

- [ ] **Step 1: Write the failing profile check**

```bash
#!/usr/bin/env sh
set -eu

docker compose -f deploy/aapanel/docker-compose.yml --profile postgres config >/tmp/auno-postgres-compose.yml
grep -q 'postgres:' /tmp/auno-postgres-compose.yml
grep -q 'OPENPOST_DATABASE_DRIVER: postgres' /tmp/auno-postgres-compose.yml
```

- [ ] **Step 2: Confirm failure before the profile exists**

```bash
sh scripts/check-postgres-profile.sh
```

- [ ] **Step 3: Add profile `postgres`**

Requirements:

- `postgres:17-alpine` or the exact stable/pinned version approved at execution time by the existing dependency policy;
- private Docker network only, no host port;
- named volume for `/var/lib/postgresql/data`;
- healthcheck with `pg_isready`;
- application switches to `OPENPOST_DATABASE_DRIVER=postgres` and `OPENPOST_DATABASE_URL=...` only when this profile-specific compose override is selected.

Prefer a separate `deploy/aapanel/docker-compose.postgres.yml` override if Compose profile semantics would otherwise inject Postgres-only env into the default service. The invariant is more important than keeping one YAML file.

- [ ] **Step 4: Verify default config still has no PostgreSQL service**

```bash
docker compose -f deploy/aapanel/docker-compose.yml config --services
```

Expected: only `auno-studio`.

Then:

```bash
docker compose -f deploy/aapanel/docker-compose.yml --profile postgres config --services
```

Expected: `auno-studio` and `postgres`.

- [ ] **Step 5: Run the real PostgreSQL migration chain**

Start the profile and export the DSN used by the test:

```bash
docker compose -f deploy/aapanel/docker-compose.yml --profile postgres up -d postgres
export OPENPOST_TEST_POSTGRES_URL='postgres://auno:auno@127.0.0.1:5432/auno?sslmode=disable'
```

If Postgres intentionally has no host port in production compose, use a test-only Compose override binding `127.0.0.1:5432:5432`; do not weaken production isolation.

Run:

```bash
cd apps/server
go test ./internal/database/migrations -run TestMigrationChainAppliesCleanlyOnPostgres -v
```

- [ ] **Step 6: Commit**

```bash
git add deploy/aapanel .env.example scripts/check-postgres-profile.sh
git commit -m "feat: add optional PostgreSQL deployment profile"
```

---

## Task 10: Verify Local and S3-compatible storage as supported Auno configurations

**Files:**
- Modify: `.env.example`
- Create: `docs/deployment/storage.md`
- Create: `scripts/check-storage-config.mjs`
- Reuse/extend: existing `apps/server/internal/services/mediastore/*_test.go`

OpenPost already has `local` and `s3` storage drivers. This task verifies and documents them; it does not introduce a new storage abstraction.

- [ ] **Step 1: Add a failing config-contract check**

The script reads `.env.example` and requires exact variables for:

```text
OPENPOST_STORAGE_DRIVER
OPENPOST_MEDIA_PATH
OPENPOST_S3_ENDPOINT
OPENPOST_S3_REGION
OPENPOST_S3_BUCKET
OPENPOST_S3_ACCESS_KEY_ID
OPENPOST_S3_SECRET_ACCESS_KEY
OPENPOST_S3_PUBLIC_BASE_URL
OPENPOST_S3_FORCE_PATH_STYLE
```

- [ ] **Step 2: Run it and confirm any missing documentation**

```bash
bun scripts/check-storage-config.mjs
```

- [ ] **Step 3: Update `.env.example` and write `docs/deployment/storage.md`**

Document four configurations:

```text
local
Amazon S3
Cloudflare R2 (S3-compatible endpoint)
MinIO (S3-compatible, force path style)
```

Do not invent a separate `AUNO_STORAGE_DRIVER`; keep the upstream compatibility surface.

- [ ] **Step 4: Run storage and media tests**

```bash
cd apps/server
go test ./internal/services/mediastore/... ./internal/api/handlers/... -run 'Storage|Media' -v
```

- [ ] **Step 5: Commit**

```bash
git add .env.example docs/deployment/storage.md scripts/check-storage-config.mjs
git commit -m "docs: verify Auno storage deployment matrix"
```

---

## Task 11: Establish license and attribution inventory before adding more third-party code

**Files:**
- Keep/Modify: `LICENSE`
- Create: `NOTICE.md`
- Create: `licenses/openpost/LICENSE`
- Create: `docs/compliance/third-party-inventory.md`
- Create: `scripts/check-third-party-notices.mjs`

- [ ] **Step 1: Write the notice test first**

The script asserts:

```text
root LICENSE contains GNU AFFERO GENERAL PUBLIC LICENSE
licenses/openpost/LICENSE exists and contains AGPL text
NOTICE.md names OpenPost and upstream URL
NOTICE.md states Auno Studio is a modified work based on OpenPost
third-party inventory has explicit columns for component, source, code license, model/weight license, redistribution, commercial status, attribution
```

- [ ] **Step 2: Confirm failure before notice files exist**

```bash
bun scripts/check-third-party-notices.mjs
```

- [ ] **Step 3: Populate notices**

`NOTICE.md` must include at minimum:

```text
Auno Studio includes and modifies OpenPost (https://github.com/getopenpost/openpost), licensed under GNU AGPL-3.0-only.
Auno Studio preserves the upstream license and required notices.
Bang Motion is approved for a later phase but is not yet vendored in Phase 1.
```

Do not state that legal review has occurred if it has not.

- [ ] **Step 4: Create the third-party inventory schema**

Start the inventory with OpenPost and mark Bang Motion/AI models as `approved for evaluation, not yet vendored` rather than pretending they are already shipped.

- [ ] **Step 5: Run and commit**

```bash
bun scripts/check-third-party-notices.mjs
git add LICENSE NOTICE.md licenses/openpost docs/compliance scripts/check-third-party-notices.mjs
git commit -m "docs: establish license and attribution inventory"
```

---

## Task 12: Add Auno release/build metadata without renaming the backend module

**Files:**
- Modify: `deploy/docker/Dockerfile`
- Modify: `scripts/release.mjs`
- Modify: `.github/workflows/ci.yml`
- Create: `scripts/check-auno-image-metadata.mjs`

- [ ] **Step 1: Write metadata assertions**

Require the Dockerfile/release pipeline to emit:

```text
org.opencontainers.image.title=Auno Studio
org.opencontainers.image.source=https://github.com/dhtoan/AunoStudio
image repository ghcr.io/dhtoan/aunostudio
```

Do not require binary/package internal renames.

- [ ] **Step 2: Confirm the assertions fail against the imported upstream release config**

```bash
bun scripts/check-auno-image-metadata.mjs
```

- [ ] **Step 3: Update OCI labels and release target**

Keep `./openpost` as the internal binary name in Phase 1 if renaming it would create unnecessary upstream churn. Product metadata and image identity must be Auno Studio.

- [ ] **Step 4: Build the real production image using the canonical frontend artifact path**

```bash
bun run build -- frontend
docker build \
  --platform linux/amd64 \
  --build-context frontend_artifact=apps/server/cmd/openpost/public \
  --file deploy/docker/Dockerfile \
  --tag aunostudio:phase1 .
```

- [ ] **Step 5: Inspect image labels**

```bash
docker inspect aunostudio:phase1 --format '{{json .Config.Labels}}'
```

Expected: Auno Studio title/source metadata.

- [ ] **Step 6: Commit**

```bash
git add deploy/docker/Dockerfile scripts/release.mjs .github/workflows/ci.yml scripts/check-auno-image-metadata.mjs
git commit -m "build: publish Auno Studio container metadata"
```

---

## Task 13: Add the Phase 1 release smoke test

**Files:**
- Create: `tests/auno/phase1-foundation.spec.ts`
- Modify: Playwright config only if the imported test harness requires explicit discovery of `tests/auno`
- Modify: `.github/workflows/ci.yml`

- [ ] **Step 1: Write the failing browser smoke test**

Test authenticated/self-host test mode using the same OpenPost test fixtures/harness already used by upstream. Assertions:

```ts
await expect(page.getByText('Auno Studio')).toBeVisible();
await page.goto('/home');
await expect(page.getByRole('heading', { name: /Auno Studio/i })).toBeVisible();
await page.goto('/video-editor');
await expect(page).toHaveURL(/\/video-editor/);
await page.goto('/image-editor');
await expect(page).toHaveURL(/\/image-editor/);
await page.goto('/record');
await expect(page).toHaveURL(/\/record/);
```

Use existing upstream selectors where a route requires a workspace/session setup rather than adding production-only bypasses.

- [ ] **Step 2: Run and confirm red until all Phase 1 surfaces exist**

```bash
bunx playwright test tests/auno/phase1-foundation.spec.ts
```

- [ ] **Step 3: Add the test to CI's frontend/browser surface**

Do not create a separate CI stack if the imported workflow already has a browser job. Make `tests/auno/**` part of the existing affected-surface mapping so changes to Auno shell/brand/deploy code cannot skip it accidentally.

- [ ] **Step 4: Run the full Phase 1 verification matrix**

```bash
bun install --frozen-lockfile
bun run format:check
bun run check
bun run test
cd apps/server && go test ./... && cd ../..
sh scripts/check-aapanel-compose.sh
bun scripts/check-third-party-notices.mjs
bun scripts/check-auno-brand-surface.mjs
bun scripts/check-auno-image-metadata.mjs
bunx playwright test tests/auno/phase1-foundation.spec.ts
```

- [ ] **Step 5: Build and boot the release image**

```bash
bun run build -- frontend
docker build --platform linux/amd64 --build-context frontend_artifact=apps/server/cmd/openpost/public -f deploy/docker/Dockerfile -t aunostudio:phase1 .
docker run --rm -d --name aunostudio-phase1 -p 127.0.0.1:18080:8080 -v aunostudio_phase1_data:/data aunostudio:phase1
```

Wait for readiness:

```bash
for i in $(seq 1 60); do
  curl --fail --silent http://127.0.0.1:18080/api/v1/ready && break
  sleep 1
done
curl --fail http://127.0.0.1:18080/api/v1/health
curl --fail http://127.0.0.1:18080/api/v1/ready
```

Then cleanup:

```bash
docker rm -f aunostudio-phase1
docker volume rm aunostudio_phase1_data
```

- [ ] **Step 6: Commit the gate**

```bash
git add tests/auno .github/workflows/ci.yml
git commit -m "test: add Phase 1 Auno foundation release gate"
```

---

## Task 14: Phase 1 completion review and merge gate

**Files:**
- Create: `docs/releases/2.0.0-alpha.1-phase1-verification.md`

- [ ] **Step 1: Capture objective verification results**

The document records exact commands and pass/fail output summary for:

```text
frontend checks/tests
backend tests
SQLite migration chain
PostgreSQL migration chain
brand guard
license guard
Docker config validation
production image build
health/readiness boot test
browser smoke test
```

Do not write “passes” without running the command in the implementation session.

- [ ] **Step 2: Verify the upstream relationship**

```bash
git remote -v
git log --oneline --decorate --graph -n 30
git merge-base HEAD upstream-openpost/main
```

Confirm the fork still contains upstream ancestry rather than a source-only copy.

- [ ] **Step 3: Run final clean-tree verification**

```bash
git status --short
```

Expected: empty.

- [ ] **Step 4: Commit verification evidence**

```bash
git add docs/releases/2.0.0-alpha.1-phase1-verification.md
git commit -m "docs: record Phase 1 verification evidence"
```

- [ ] **Step 5: Request code review before merge**

Invoke `superpowers:requesting-code-review`, address any verified blocking findings, then re-run the Phase 1 gate. Do not start Phase 2 until Phase 1 is merged and the production image smoke test passes.

## Phase 1 Exit Criteria

Phase 1 is complete only when all are true:

- OpenPost history is merged and `upstream-openpost` is documented.
- Existing OpenPost Image Editor, Video Editor, Recorder, Media, Publications, Inbox, Analytics, auth, workspaces, and project persistence remain functional.
- Auno Studio is the public product identity in app surfaces and OCI image metadata.
- No previous Auno editor implementation is present in production routes.
- `/home` exists and Create routes only to functioning surfaces.
- Default Compose = one app + SQLite + local storage.
- aaPanel deployment binds the app to loopback for reverse proxying.
- PostgreSQL is optional and its migration chain passes.
- S3/R2/MinIO are documented through the existing S3-compatible storage contract.
- OpenPost diagnostics/update calls are opt-in rather than silently pointing at upstream-managed services.
- AGPL/attribution inventory exists and is checked in CI.
- Real production image builds and passes `/health` + `/ready` smoke tests.
- All Phase 1 tests/checks are green before Phase 2 begins.
