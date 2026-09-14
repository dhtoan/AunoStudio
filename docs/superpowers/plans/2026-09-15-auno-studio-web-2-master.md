# Auno Studio Web 2.0 Master Execution Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Coordinate the four independently testable implementation phases that transform the minimal `dhtoan/AunoStudio` repository into Auno Studio Web 2.0 and gate the final `2.0.0` release against the approved architecture.

**Architecture:** This is an execution index, not a substitute for the four subsystem plans. Phase 1 establishes the OpenPost foundation and production deployment; Phase 2 adds native Auto Video; Phase 3 adds provider routing, voice, captions, and music; Phase 4 adds Bang Motion-derived Auno Motion. Every phase is implemented on its own isolated branch/worktree, reviewed, verified, and merged before the next phase begins.

**Tech Stack:** OpenPost monorepo (Svelte 5/SvelteKit + Bun + Go/Echo/Huma/Bun ORM), SQLite/PostgreSQL, local/S3-compatible storage, DB-backed jobs, Docker Compose/aaPanel, OpenPost local AI runtimes, Gemini official API/OAuth/ADC, Auno Auto Video, Auno Motion, Playwright/Vitest/Go test/GitHub Actions.

**Spec:** `docs/superpowers/specs/2026-09-15-auno-studio-web-2-design.md`

## Global Constraints

- The approved architecture spec is authoritative; implementation plans may add detail but may not contradict locked design decisions.
- Execute phases in order: Phase 1 → Phase 2 → Phase 3 → Phase 4 → stable-release gate.
- Do not begin a later phase until the prior phase is merged to `main` and its verification document is committed.
- Use an isolated git worktree for every implementation phase; invoke `superpowers:using-git-worktrees` at execution time.
- Use test-driven development for all implementation work; invoke `superpowers:test-driven-development` before writing production feature/bugfix code.
- Use `superpowers:verification-before-completion` before claiming any task/phase is complete.
- Use `superpowers:requesting-code-review` at each phase merge gate.
- OpenPost remains the editor/project/publishing foundation throughout all phases.
- The old Auno Photo/Video editor stack is not imported or maintained.
- Default self-host deployment remains one Auno Studio container + SQLite + local media; PostgreSQL/S3/AI workers remain optional.
- Do not add Redis/RabbitMQ/Kafka.
- Do not ship reverse-engineered Google/Antigravity OAuth.
- AI outputs remain editable native project state or editable OpenPost compositions.
- OpenPost AGPL compliance, Bang Motion MIT attribution, and model-weight license audit remain release gates.
- Never tag stable `2.0.0` based only on unit tests; the full Docker/DB/browser/backup/export/publish acceptance matrix must pass.

## Plan Map

| Order | Plan | Working release | Purpose |
| --- | --- | --- | --- |
| 1 | `docs/superpowers/plans/2026-09-15-phase-1-openpost-foundation.md` | `2.0.0-alpha.1` | Import OpenPost history, brand/deploy/database/storage/license/CI foundation |
| 2 | `docs/superpowers/plans/2026-09-15-phase-2-native-auto-video.md` | `2.0.0-alpha.2` | Structured Auto Video, source ledger, durable jobs, native project compiler, regeneration |
| 3 | `docs/superpowers/plans/2026-09-15-phase-3-ai-media-providers.md` | `2.0.0-beta.1` | Gemini/provider routing, voice, captions, music, AI settings, optional workers |
| 4 | `docs/superpowers/plans/2026-09-15-phase-4-auno-motion-engine.md` | `2.0.0-rc.1` | Bang Motion adaptation, Motion Styles, editable compositions, deterministic visual QA |
| 5 | This master plan stable gate | `2.0.0` | Cross-phase acceptance, backup/restore, distribution/compliance, final release |

## Design-to-Plan Coverage Matrix

| Approved design requirement | Owning plan/task family |
| --- | --- |
| OpenPost as the Auno Studio foundation | Phase 1 |
| Hard cutover to OpenPost Photo/Video Editors | Phase 1 |
| Auno Home/Create shell and rebranding | Phase 1 |
| Docker/aaPanel, SQLite default, Postgres optional | Phase 1 |
| Local/S3/R2/MinIO storage | Phase 1 |
| OpenPost upstream-sync discipline | Phase 1 |
| AGPL/third-party inventory baseline | Phase 1 |
| Text/URL/files/media Auto Video inputs | Phase 2 |
| Review/News/Guide/Compare/Top N | Phase 2 |
| Strict storyboard schema | Phase 2 |
| Source ledger and SSRF-safe URL fetch | Phase 2 |
| DB-backed resumable jobs | Phase 2 |
| Native OpenPost timeline compiler | Phase 2 |
| AI sidecar, project independence | Phase 2 |
| Scoped regeneration/manual-edit preservation | Phase 2 |
| Video Editor Auno AI panel seam | Phase 2 |
| Gemini official auth + provider routing | Phase 3 |
| Auto/Free-Local/Cloud routing modes | Phase 3 |
| Never automatically use paid provider | Phase 3 |
| Voice generation and regeneration | Phase 3 |
| Captions/local transcription | Phase 3 |
| Music Lite + ACE-Step Pro | Phase 3 |
| Model/runtime manager and degraded AI status | Phase 3 |
| Optional headless AI workers | Phase 3 |
| Bang Motion code/reference integration | Phase 4 |
| Motion Style/style brief | Phase 4 |
| Anti-slide rules | Phase 4 |
| Motion Scene Graph | Phase 4 |
| Native keyframe compilation | Phase 4 |
| Editable Motion Composition | Phase 4 |
| Editorial Fashion style | Phase 4 |
| Deterministic preview/export | Phase 4 |
| Motion visual QA | Phase 4 |
| Backup/restore, final install/upgrade/release acceptance | Master stable gate |

---

## Task 1: Execute and merge Phase 1 — OpenPost foundation

**Files:**
- Plan: `docs/superpowers/plans/2026-09-15-phase-1-openpost-foundation.md`
- Evidence: `docs/releases/2.0.0-alpha.1-phase1-verification.md`

**Interfaces:**
- Consumes: minimal AunoStudio repository + approved design.
- Produces: OpenPost-based Auno Studio foundation on `main`, upstream history/remote policy, Auno brand shell, Docker/aaPanel baseline, SQLite/local default, optional Postgres/S3, license inventory, working editors/publishing foundation.

- [ ] **Step 1: Create the phase worktree using the exact branch named by Phase 1**

```bash
git fetch origin main
git worktree add ../AunoStudio-phase1 -b feat/phase-1-openpost-foundation origin/main
```

- [ ] **Step 2: Execute every unchecked Phase 1 task in order**

Use `superpowers:subagent-driven-development` for task isolation/review, or `superpowers:executing-plans` if the user explicitly chooses inline execution.

- [ ] **Step 3: Run the Phase 1 exit gate exactly as written in the Phase 1 plan**

Do not replace real Docker/health/browser verification with statements based on code inspection.

- [ ] **Step 4: Request code review and resolve blocking findings**

Invoke `superpowers:requesting-code-review`; re-run affected tests after every accepted fix.

- [ ] **Step 5: Merge only after verification evidence is committed**

```bash
git checkout main
git pull --ff-only origin main
git merge --no-ff feat/phase-1-openpost-foundation
git push origin main
```

- [ ] **Step 6: Mark the Phase 1 release checkpoint**

Create release/tag `2.0.0-alpha.1` only if the Phase 1 plan's release-image build and smoke tests passed. This checkpoint is allowed to omit Auto Video because that is explicitly Phase 2 scope.

---

## Task 2: Execute and merge Phase 2 — Native Auto Video

**Files:**
- Plan: `docs/superpowers/plans/2026-09-15-phase-2-native-auto-video.md`
- Evidence: `docs/releases/2.0.0-alpha.2-phase2-verification.md`

**Interfaces:**
- Consumes: merged Phase 1 foundation.
- Produces: source ingestion, five-format storyboard planning, durable generation jobs, native OpenPost project compilation, sidecar/source ledger, scoped regeneration, `/auto-video` wizard, editor panel seam.

- [ ] **Step 1: Create a fresh worktree from the merged Phase 1 `main`**

```bash
git fetch origin main
git worktree add ../AunoStudio-phase2 -b feat/phase-2-native-auto-video origin/main
```

- [ ] **Step 2: Execute the Phase 2 plan task-by-task**

Do not begin provider-specific Gemini/TTS/music implementation during Phase 2. Use fakes/current `ai.Generator` seam and keep the scope native-project generation.

- [ ] **Step 3: Run Phase 1 and Phase 2 regression gates**

At minimum, the exact Phase 2 final gate plus Phase 1 foundation E2E must pass.

- [ ] **Step 4: Request review, fix blockers, rerun verification**

Use `superpowers:requesting-code-review` and `superpowers:verification-before-completion`.

- [ ] **Step 5: Merge and tag checkpoint**

```bash
git checkout main
git pull --ff-only origin main
git merge --no-ff feat/phase-2-native-auto-video
git push origin main
```

Tag/release `2.0.0-alpha.2` only after native-project independence from the AI sidecar is proven.

---

## Task 3: Execute and merge Phase 3 — AI media providers

**Files:**
- Plan: `docs/superpowers/plans/2026-09-15-phase-3-ai-media-providers.md`
- Evidence: `docs/releases/2.0.0-beta.1-phase3-verification.md`

**Interfaces:**
- Consumes: merged Phase 2 Auto Video system and OpenPost local-AI engines.
- Produces: Gemini official provider/auth, routing preferences, voice/captions/music, AI settings/model status, optional server AI workers, editable native media tracks.

- [ ] **Step 1: Create a fresh Phase 3 worktree**

```bash
git fetch origin main
git worktree add ../AunoStudio-phase3 -b feat/phase-3-ai-media-providers origin/main
```

- [ ] **Step 2: Execute Phase 3 in order**

Do not replace OpenPost Kokoro/ACE-Step/transcription services with Auno copies. New work wraps/reuses their stable interfaces.

- [ ] **Step 3: Stop distribution of any unaudited model before it becomes a default**

The Phase 3 compliance gate is executable product behavior: if a model-weight audit lacks commercial/redistribution clarity, its `default/automatic` flag stays false and tests enforce that decision.

- [ ] **Step 4: Run Phase 1–3 regression/security/degraded-mode gates**

All prior E2E plus Phase 3 AI tests must pass with optional AI workers absent as well as with supported workers configured.

- [ ] **Step 5: Request review, merge, and create beta checkpoint**

```bash
git checkout main
git pull --ff-only origin main
git merge --no-ff feat/phase-3-ai-media-providers
git push origin main
```

Create `2.0.0-beta.1` only after the AI credential/security/license evidence is committed.

---

## Task 4: Execute and merge Phase 4 — Auno Motion Engine

**Files:**
- Plan: `docs/superpowers/plans/2026-09-15-phase-4-auno-motion-engine.md`
- Evidence: `docs/releases/2.0.0-rc.1-phase4-verification.md`

**Interfaces:**
- Consumes: full Auto Video + voice/captions/music system.
- Produces: pinned Bang Motion provenance, nine Motion Styles, style briefs, anti-slide validator, native keyframe compiler, editable OpenPost Motion Compositions, deterministic frame/visual QA, Editorial Fashion.

- [ ] **Step 1: Create fresh Phase 4 worktree**

```bash
git fetch origin main
git worktree add ../AunoStudio-phase4 -b feat/phase-4-auno-motion-engine origin/main
```

- [ ] **Step 2: Execute Phase 4 plan in order**

Bang Motion's original HTML/GSAP/Three starter is reference/provenance. Production authored state ends in OpenPost native timeline/composition structures.

- [ ] **Step 3: Run all motion determinism/visual tests twice**

Run screenshot/determinism suite on a clean browser cache twice to catch hidden order/time/cache dependencies before declaring the phase complete.

- [ ] **Step 4: Request review and perform full Phase 1–4 regression**

No release candidate if earlier Photo/Video Editor, Media, Composer, Publications, auth, database, or Docker flows regress.

- [ ] **Step 5: Merge and create release candidate checkpoint**

```bash
git checkout main
git pull --ff-only origin main
git merge --no-ff feat/phase-4-auno-motion-engine
git push origin main
```

Create `2.0.0-rc.1` only after its verification document is committed and code review is resolved.

---

## Task 5: Prove clean installation on the exact release candidate image

**Files:**
- Create: `docs/releases/2.0.0-install-verification.md`
- Create or modify: `tests/release/auno-clean-install.sh`

**Interfaces:**
- Consumes: `2.0.0-rc.1` container image and release Compose manifests.
- Produces: reproducible evidence that a new aaPanel-style self-host install reaches a usable application with default SQLite/local storage.

- [ ] **Step 1: Write the clean-install script first**

The script must:

```text
create a temporary .env with generated secrets
create fresh Docker volume
boot release candidate through deploy/aapanel/docker-compose.yml
wait for /health and /ready
create/login test account through existing E2E bootstrap
create workspace
upload one image and one video
open Photo Editor and Video Editor smoke paths
create a simple Auto Video with deterministic test provider
restart main container
verify project still loads
tear down volumes/containers
```

Use production image, not dev server.

- [ ] **Step 2: Run from an empty Docker state**

```bash
bash tests/release/auno-clean-install.sh
```

Expected: exit 0 with no manual repair/migration step.

- [ ] **Step 3: Repeat with default AI workers absent**

Expected: app readiness succeeds, local/browser AI capability detection degrades correctly, editors/publishing remain usable.

- [ ] **Step 4: Record exact image digest and evidence**

Write `docs/releases/2.0.0-install-verification.md` with release image digest, Compose SHA, command output summary, and date.

- [ ] **Step 5: Commit**

```bash
git add tests/release/auno-clean-install.sh docs/releases/2.0.0-install-verification.md
git commit -m "test: verify clean Auno Studio 2.0 installation"
```

---

## Task 6: Prove SQLite → PostgreSQL configuration and migration matrix

**Files:**
- Create: `tests/release/auno-database-matrix.sh`
- Create: `docs/releases/2.0.0-database-verification.md`

**Interfaces:**
- Consumes: release candidate SQLite/Postgres deployment profiles and application migration chain.
- Produces: fresh/upgrade evidence for both supported databases.

- [ ] **Step 1: Implement the database matrix script**

Cases:

```text
fresh SQLite → migrate → app ready
prior alpha/beta SQLite fixture → migrate → app ready/projects load
fresh PostgreSQL → migrate → app ready
prior beta PostgreSQL fixture → migrate → app ready/projects load
```

Use sanitized generated fixtures owned by the repository, not production data.

- [ ] **Step 2: Run matrix**

```bash
bash tests/release/auno-database-matrix.sh
```

- [ ] **Step 3: Run migration idempotency tests again**

```bash
cd apps/server
go test ./internal/database/migrations -run TestMigrationChainAppliesCleanlyAndIsIdempotent -v
go test ./internal/database/migrations -run TestMigrationChainAppliesCleanlyOnPostgres -v
cd ../..
```

- [ ] **Step 4: Record evidence and commit**

```bash
git add tests/release/auno-database-matrix.sh docs/releases/2.0.0-database-verification.md
git commit -m "test: verify Auno database release matrix"
```

---

## Task 7: Prove backup and restore with projects, media, sidecars, and secrets

**Files:**
- Create: `scripts/auno-backup.sh`
- Create: `scripts/auno-restore.sh`
- Create: `tests/release/auno-backup-restore.sh`
- Create: `docs/deployment/backup-restore.md`
- Create: `docs/releases/2.0.0-backup-restore-verification.md`

**Interfaces:**
- Consumes: default SQLite/local deployment and documented optional PostgreSQL path.
- Produces: supported backup/restore commands and tested recovery evidence.

- [ ] **Step 1: Write failing release test around desired CLI scripts**

Fixture content must include:

```text
user/workspace
uploaded image/video
auto-video sidecar/source ledger
native video project revisions
generated voice/caption/music project assets
one scheduled/draft publication
```

Test sequence:

```text
create fixture
backup
tear down original instance/volume
create fresh empty instance
restore
boot
verify all fixture IDs/content
```

- [ ] **Step 2: Implement SQLite/local backup with service-consistent snapshot**

Backup includes:

```text
SQLite DB using SQLite backup-safe method, not blind copy during writes
/data/media
relevant configuration needed for recovery
operator-owned encryption/signing keys referenced by a manifest but never printed to stdout
```

The script must exclude `/auno-models` model caches and transient `/data/temp`.

- [ ] **Step 3: Add PostgreSQL guidance/script mode**

Use `pg_dump`/`pg_restore` for DB; media backup is storage-provider specific. For R2/S3, document object versioning/lifecycle plus DB dump rather than pretending local tar captures cloud objects.

- [ ] **Step 4: Run destructive restore test**

```bash
bash tests/release/auno-backup-restore.sh
```

- [ ] **Step 5: Commit evidence**

```bash
git add scripts/auno-backup.sh scripts/auno-restore.sh tests/release/auno-backup-restore.sh docs/deployment/backup-restore.md docs/releases/2.0.0-backup-restore-verification.md
git commit -m "feat: add verified backup and restore workflow"
```

---

## Task 8: Prove export → Media → Composer → schedule/publish handoff

**Files:**
- Create: `tests/auno/export-publish-handoff.spec.ts`
- Create: `docs/releases/2.0.0-publishing-verification.md`

**Interfaces:**
- Consumes: OpenPost Video Editor export, Media Library, Composer, Publications scheduler.
- Produces: final end-to-end proof that Auno additions did not break OpenPost's publishing foundation.

- [ ] **Step 1: Write E2E using a provider delivery test double**

Flow:

```text
open generated Auto Video native project
export short fixture
send export to Auno Studio Media
open Composer with exported media attached
create draft
schedule publication through test provider/account
verify Publications shows scheduled item
execute delivery worker/test double
verify published/delivered status projection
```

Do not publish to a real social account in CI.

- [ ] **Step 2: Run**

```bash
bunx playwright test tests/auno/export-publish-handoff.spec.ts
```

- [ ] **Step 3: Verify localized/public copy says Auno Studio, not misleading OpenPost product branding**

Legal/third-party notices remain untouched.

- [ ] **Step 4: Record and commit**

```bash
git add tests/auno/export-publish-handoff.spec.ts docs/releases/2.0.0-publishing-verification.md
git commit -m "test: verify editor to publishing handoff"
```

---

## Task 9: Prove source/license/compliance release package

**Files:**
- Create: `docs/compliance/release-source-offer.md`
- Create: `tests/release/check-release-source.sh`
- Modify: `NOTICE.md`
- Modify: `docs/compliance/third-party-inventory.md`

**Interfaces:**
- Consumes: final release candidate source, AGPL OpenPost basis, MIT Bang Motion, model inventories.
- Produces: technical compliance artifact/source packaging process for legal review.

- [ ] **Step 1: Write release-source validation script**

It must assert the release source archive/repository includes:

```text
root AGPL license
OpenPost attribution/source reference
Bang Motion MIT license + pinned commit
Auno modifications/source needed to build deployed covered program
Docker/build scripts
version/commit identifiers
third-party/model inventory
```

- [ ] **Step 2: Produce corresponding-source candidate using the exact release commit**

Do not include secrets, `.env`, OAuth tokens, or model caches.

- [ ] **Step 3: Run technical compliance check**

```bash
bash tests/release/check-release-source.sh
```

- [ ] **Step 4: Obtain external legal review before public/commercial stable deployment**

Record only the outcome/required engineering changes in repository documentation; do not commit privileged legal advice or confidential correspondence.

If legal review requests engineering changes, implement them on a dedicated branch with tests and re-run all affected release gates.

- [ ] **Step 5: Commit non-privileged release process docs**

```bash
git add docs/compliance/release-source-offer.md tests/release/check-release-source.sh NOTICE.md docs/compliance/third-party-inventory.md
git commit -m "docs: define Auno Studio release source package"
```

---

## Task 10: Run the final 2.0.0 acceptance matrix

**Files:**
- Create: `docs/releases/2.0.0-final-verification.md`

**Interfaces:**
- Consumes: all release/test artifacts from Tasks 1–9.
- Produces: a single auditable stable-release decision.

- [ ] **Step 1: Run repository quality/security tests**

```bash
bun install --frozen-lockfile
bun run format:check
bun run check
bun run test
cd apps/server && go test ./... && cd ../..
```

Run the full GitHub Actions workflow on the candidate commit; local success does not replace CI success.

- [ ] **Step 2: Run all Auno E2E**

```bash
bunx playwright test tests/auno
```

- [ ] **Step 3: Run all release scripts**

```bash
bash tests/release/auno-clean-install.sh
bash tests/release/auno-database-matrix.sh
bash tests/release/auno-backup-restore.sh
bash tests/release/check-release-source.sh
```

- [ ] **Step 4: Run deployment/brand/license/AI guards**

```bash
sh scripts/check-aapanel-compose.sh
sh scripts/check-ai-degraded-readiness.sh
bun scripts/check-storage-config.mjs
bun scripts/check-third-party-notices.mjs
bun scripts/check-bang-motion-vendor.mjs
bun scripts/check-auno-brand-surface.mjs
bun scripts/check-auno-image-metadata.mjs
```

- [ ] **Step 5: Map every approved V1 acceptance criterion to evidence**

`docs/releases/2.0.0-final-verification.md` must contain an 18-row table matching Section 19 of the architecture spec exactly. Each row contains:

```text
criterion
status PASS/FAIL
command/test/evidence path
candidate commit SHA
```

Any `FAIL` blocks stable release. There is no `waived` state for architecture acceptance criteria without a new approved design change.

- [ ] **Step 6: Verify clean git state and candidate SHA**

```bash
git status --short
git rev-parse HEAD
```

Expected: clean working tree.

- [ ] **Step 7: Commit final verification document**

```bash
git add docs/releases/2.0.0-final-verification.md
git commit -m "docs: record Auno Studio 2.0 final verification"
```

Because the verification document commit changes the candidate SHA, re-run fail-closed repository policy and CI on this final commit before tagging.

---

## Task 11: Final review, release tag, and post-release smoke check

**Files:**
- Modify: `CHANGELOG.md`
- Modify: `README.md`
- Release metadata through existing release workflow

**Interfaces:**
- Consumes: final verified commit with all criteria PASS.
- Produces: `2.0.0` release, versioned Docker image, source artifacts, documentation links.

- [ ] **Step 1: Request final code/release review**

Invoke `superpowers:requesting-code-review` against the full delta from the imported OpenPost base/last RC. Resolve blocking findings and rerun relevant gates.

- [ ] **Step 2: Update release-facing documentation only after verification**

`CHANGELOG.md` summarizes:

```text
OpenPost-based Auno Studio foundation
native Auto Video
voice/captions/music provider system
Auno Motion Engine + Bang Motion attribution
Docker/aaPanel deployment
SQLite/PostgreSQL + Local/S3-compatible support
known browser/GPU capability requirements
```

README must state clearly that optional AI features depend on browser/device/provider configuration while core editors/publishing do not.

- [ ] **Step 3: Tag the exact verified commit**

```bash
git tag -a 2.0.0 -m "Auno Studio Web 2.0.0"
git push origin 2.0.0
```

- [ ] **Step 4: Verify published artifacts by digest**

Pull the versioned Docker image generated by the release workflow and compare its OCI revision label/digest to the tagged commit. Do not substitute `latest` for release verification.

- [ ] **Step 5: Run post-release clean-install smoke test using the published image**

Repeat the health/readiness/login/editor/Auto Video smoke path with the registry image rather than the locally built candidate.

- [ ] **Step 6: Only then mark 2.0.0 stable**

If published-artifact smoke test fails, do not silently move the tag; create a corrective patch release candidate according to normal release policy.

## Stable 2.0.0 Exit Criteria

Stable release requires all architecture acceptance criteria and all of the following operational gates:

- Phase 1, 2, 3, and 4 verification documents exist and are based on merged code.
- Clean aaPanel-style Docker installation succeeds with SQLite/local storage and no optional AI workers.
- PostgreSQL fresh/upgrade paths pass.
- Local and configured S3-compatible storage paths pass supported tests.
- Backup/restore recovers workspace, media, native project revisions, Auto Video sidecars, generated assets, and publication state.
- Export → Media → Composer → schedule/publish handoff passes against a test provider.
- Optional AI outage does not fail core app readiness.
- Generated voice/captions/music and Motion Compositions remain editable after reload/restart.
- Preview/export deterministic motion probes pass.
- No secret-bearing data is exposed in browser bundles/status APIs/provider errors.
- Release source/notice/license inventory passes technical checks and legal review-required engineering changes are resolved.
- Published versioned image digest maps to the final verified release commit.
- Published-image post-release smoke test passes.

## Execution Choice

Once this documentation-only planning work is accepted, implementation should start at **Phase 1 Task 1 only**. Do not dispatch Phase 2–4 implementation concurrently because each depends on the merged data/project/provider seams of the previous phase.

Recommended execution mode: **Subagent-Driven Development** — one fresh implementation subagent per task with two-stage review and a phase-level integration gate.

Alternative: **Inline Execution** — execute each phase with `superpowers:executing-plans` in batches and stop at review checkpoints.
