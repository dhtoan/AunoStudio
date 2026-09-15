# Vox Long-form Documentary Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a persistent Documentary Long-form mode to Auno Auto Video that implements the approved Vox Style workflow through an editable native OpenPost project, while completing the remaining Phase 4 deterministic preview/export, runtime visual-QA, E2E, provenance, and release-candidate gates.

**Architecture:** Documentary planning is a dedicated provider-neutral Go service with a durable run record that exists before a native video project is created. The web wizard consumes that run state, generates native beat-level OpenPost items/compositions, and reuses Auno Motion, project persistence, Media Library, and editor ownership semantics. Vox Style is exposed in UI while its runtime ID remains `documentary-paper-collage`; all long-form media enrichment is optional and degraded-mode safe.

**Tech Stack:** Go 1.26.6, Echo/Huma/Bun ORM, SQLite/PostgreSQL, Svelte 5/SvelteKit, TypeScript, Bun, Vitest, Playwright Chromium, `@auno/motion`, OpenPost Video Editor native `TimelineItem`/`SubComposition` structures, local/cloud project storage, provider-neutral `ai.Generator`, existing local TTS and ACE-Step music seams.

**Spec:** `docs/superpowers/specs/2026-09-15-vox-long-form-documentary-design.md`

## Global Constraints

- Documentary Long-form is an Auto Video mode, not a second editor or application.
- Product-facing label may be `Vox Style`; runtime ID is exactly `documentary-paper-collage`.
- Do not ship VOX logos, copyrighted VOX assets, copied article layouts, or brand-specific trade dress.
- V1 Documentary Long-form defaults to `1920x1080`, `16:9`, and the existing project FPS default.
- Allowed V1 documentary durations are exactly `30`, `60`, `120`, `180`, and `300` seconds.
- Existing short-form server validation remains `10..180` seconds and the existing five short-form formats remain unchanged.
- AI generation must end as editable native OpenPost project state wherever possible; do not make opaque MP4 scenes the authoritative project representation.
- Complex generated motion uses existing OpenPost `composition` items and `SubComposition` with editable controls; do not add a new timeline item kind.
- Source material is untrusted data and never overrides system/planner instructions.
- The workflow must remain usable with text planning only; TTS, image generation, video generation, and music are optional enrichments.
- No paid external AI/media API is called from browser E2E tests; use deterministic fixtures/adapters.
- Actual TTS duration is authoritative for beat timing after speech generation.
- Stable IDs and deterministic motion must be functions of authored state, explicit seed, element ID, and project time; production motion code may not depend on `Date.now()`, `performance.now()`, or `Math.random()` for visual output.
- A five-minute fixture with at least 100 beats is a release requirement.
- Motion regeneration changes only motion-owned structures and preserves voice, captions, music, manually edited non-motion items, and unrelated scenes.
- Preview/export comparison happens before codec encoding whenever codec output prevents exact pixel equality.
- Visual QA reports measurable failures only; it does not pretend to score subjective aesthetics.
- Keep OpenPost AGPL obligations and Bang Motion MIT attribution intact.
- Follow red → green → refactor. No production behavior change is added before a focused failing regression test.
- Do not tag stable `2.0.0` or declare `2.0.0-rc.1` ready until all release gates in Task 20 are green and evidence is recorded.

## File and Boundary Map

```text
apps/server/internal/services/documentary/
  types.go             domain types and stable enums
  validation.go        duration/source/state validation
  planner.go           provider-neutral planner facade
  ideas.go             exactly-ten idea generation
  script.go            continuous documentary script generation
  beats.go             deterministic beat segmentation
  visuals.go           visual and animation plan generation
  thumbnails.go        thumbnail plan generation
  dependencies.go      step fingerprints and downstream invalidation
  state.go             durable run persistence

apps/server/internal/api/handlers/
  auto_video_documentary.go  authenticated Huma routes; media/source resolution

apps/web/src/lib/auno/documentary/
  types.ts             browser contract
  api.ts               typed request helpers
  state.ts             local run editor state and stale-step helpers
  compiler.ts          native OpenPost project compiler
  enrichment.ts        long-form voice/caption/media enrichment
  beat-window.ts       bounded rendering window for 100+ beats

apps/web/src/lib/components/auno-documentary/
  documentary-wizard.svelte
  documentary-step-nav.svelte
  documentary-ideas.svelte
  documentary-script.svelte
  documentary-beat-editor.svelte
  documentary-prompt-pack.svelte
  documentary-thumbnails.svelte

packages/auno-motion/src/
  documentary-paper-collage.ts  Vox-style deterministic behavior

apps/web/src/lib/auno/motion/
  runtime-probe.ts       preview/export frame measurement contract
  runtime-visual-qa.ts   runtime canvas/DOM measurements

tests/app/auno/
  deterministic browser fixtures and E2E gates
```

---

## Task 1: Complete the Phase 4 deterministic preview/export probe contract

**Files:**
- Create: `apps/web/src/lib/auno/motion/frame-probe.test.ts`
- Create: `apps/web/src/lib/auno/motion/runtime-probe.ts`
- Create: `apps/web/src/lib/auno/motion/runtime-probe.test.ts`
- Modify: `apps/web/src/lib/video-editor/preview/capture-frame.ts`
- Modify: the existing export frame-render owner under `apps/web/src/lib/video-editor/export/` after locating the single pre-encode frame function

**Interfaces:**
- Consumes: `MotionProbePlan`, `frameProbeFrames(totalFrames)`, editor seek state, preview canvas, and export pre-encode canvas/image bitmap.
- Produces:
  - `type FramePixelProbe = { frame: number; width: number; height: number; rgba: Uint8ClampedArray }`
  - `captureCanvasProbe(canvas: HTMLCanvasElement, frame: number): FramePixelProbe`
  - `compareFramePixelProbes(a, b, tolerance): FramePixelDiff`
  - one export-only debug/test callback invoked immediately before encoder submission.

- [ ] **Step 1: Write pure probe and pixel-diff tests**

```ts
import { describe, expect, it } from 'vitest';
import { frameProbeFrames } from '@auno/motion';
import { compareFramePixelProbes } from './runtime-probe';

describe('motion frame probes', () => {
  it('uses 0/25/50/75/last for a 10 second 30 fps project', () => {
    expect(frameProbeFrames(300)).toEqual([0, 75, 150, 225, 299]);
  });

  it('reports exact equality for identical pre-encode pixels', () => {
    const rgba = new Uint8ClampedArray([0, 0, 0, 255, 255, 255, 255, 255]);
    const a = { frame: 75, width: 2, height: 1, rgba };
    const b = { frame: 75, width: 2, height: 1, rgba: new Uint8ClampedArray(rgba) };
    expect(compareFramePixelProbes(a, b, 0)).toEqual({ changedPixels: 0, maxChannelDelta: 0, ratio: 0 });
  });
});
```

- [ ] **Step 2: Run focused tests and confirm red**

Run:

```bash
bun --cwd apps/web x vitest run src/lib/auno/motion/frame-probe.test.ts src/lib/auno/motion/runtime-probe.test.ts
```

Expected: FAIL because `runtime-probe.ts` and pixel comparison do not exist.

- [ ] **Step 3: Implement the test/debug-only capture contract**

```ts
export interface FramePixelProbe {
  frame: number;
  width: number;
  height: number;
  rgba: Uint8ClampedArray;
}

export interface FramePixelDiff {
  changedPixels: number;
  maxChannelDelta: number;
  ratio: number;
}

export function captureCanvasProbe(canvas: HTMLCanvasElement, frame: number): FramePixelProbe {
  const context = canvas.getContext('2d', { willReadFrequently: true });
  if (!context) throw new Error('2D preview canvas is unavailable');
  return {
    frame,
    width: canvas.width,
    height: canvas.height,
    rgba: context.getImageData(0, 0, canvas.width, canvas.height).data
  };
}
```

`compareFramePixelProbes` must reject different frame/dimensions, compare RGB/A channels, count a pixel changed only when one channel exceeds the supplied integer tolerance, and return `ratio = changedPixels / pixelCount`.

Add an export render callback shaped as:

```ts
export type ExportFrameProbeHook = (probe: FramePixelProbe) => void | Promise<void>;
```

The hook is accepted only by the existing test/debug render entry point; production export behavior and serialized project state remain unchanged.

- [ ] **Step 4: Re-run focused tests and frontend check**

```bash
bun --cwd apps/web x vitest run src/lib/auno/motion/frame-probe.test.ts src/lib/auno/motion/runtime-probe.test.ts src/lib/video-editor/preview/capture-frame.test.ts
bun run check -- frontend
```

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add apps/web/src/lib/auno/motion/frame-probe.test.ts apps/web/src/lib/auno/motion/runtime-probe.ts apps/web/src/lib/auno/motion/runtime-probe.test.ts apps/web/src/lib/video-editor/preview/capture-frame.ts apps/web/src/lib/video-editor/export
git commit -m "test: add deterministic preview export probe hooks"
```

---

## Task 2: Add runtime visual-QA measurements and merge them with static QA

**Files:**
- Create: `apps/web/src/lib/auno/motion/runtime-visual-qa.ts`
- Create: `apps/web/src/lib/auno/motion/runtime-visual-qa.test.ts`
- Modify: `apps/web/src/lib/auno/motion/visual-qa.ts`
- Create: `apps/web/src/lib/auno/motion/visual-qa.test.ts`

**Interfaces:**
- Consumes: authored static diagnostics plus runtime visible bounds, text rectangles, required subject IDs, sampled foreground/background colors, composition status, asset readiness.
- Produces:
  - `RuntimeVisualMeasurement`
  - `measureRuntimeVisualQA(input): AutoVideoVisualDiagnostic[]`
  - `mergeVisualDiagnostics(staticIssues, runtimeIssues)`.

- [ ] **Step 1: Write failing measurable-runtime tests**

```ts
it('reports a required subject that is not visible at the probe frame', () => {
  const issues = measureRuntimeVisualQA({
    sceneId: 'beat-7',
    stage: { x: 0, y: 0, width: 1920, height: 1080 },
    visibleItems: [],
    requiredSubjectIds: ['subject-doc'],
    textRects: [],
    assets: []
  });
  expect(issues.map((issue) => issue.code)).toContain('visual.missing_subject');
});

it('reports low contrast only from measured colors', () => {
  const issues = measureRuntimeVisualQA({
    sceneId: 'beat-2',
    stage: { x: 0, y: 0, width: 1920, height: 1080 },
    visibleItems: ['label'],
    requiredSubjectIds: [],
    textRects: [],
    assets: [],
    contrastSamples: [{ itemId: 'label', foreground: '#777777', background: '#808080' }]
  });
  expect(issues.map((issue) => issue.code)).toContain('visual.low_contrast');
});
```

- [ ] **Step 2: Confirm red**

```bash
bun --cwd apps/web x vitest run src/lib/auno/motion/runtime-visual-qa.test.ts src/lib/auno/motion/visual-qa.test.ts
```

Expected: FAIL because runtime measurement API does not exist.

- [ ] **Step 3: Implement deterministic measurement rules**

Use WCAG relative luminance for a measured text/background pair and flag contrast below `3.0` for large display text and `4.5` otherwise only when the caller supplies the text-size class. Do not infer colors from screenshots in unit code. Add asset readiness issue `visual.asset_not_ready` only when the beat declares that asset as required at that frame. Preserve existing issue codes for blank scene, clipping, overlap, invalid transform, and composition errors.

- [ ] **Step 4: Verify focused QA tests**

```bash
bun --cwd apps/web x vitest run src/lib/auno/motion/runtime-visual-qa.test.ts src/lib/auno/motion/visual-qa.test.ts
bun run check -- frontend
```

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add apps/web/src/lib/auno/motion/runtime-visual-qa.ts apps/web/src/lib/auno/motion/runtime-visual-qa.test.ts apps/web/src/lib/auno/motion/visual-qa.ts apps/web/src/lib/auno/motion/visual-qa.test.ts
git commit -m "test: add runtime motion visual measurements"
```

---

## Task 3: Define the documentary domain, duration contract, and stable dependency fingerprints

**Files:**
- Create: `apps/server/internal/services/documentary/types.go`
- Create: `apps/server/internal/services/documentary/validation.go`
- Create: `apps/server/internal/services/documentary/dependencies.go`
- Create: `apps/server/internal/services/documentary/validation_test.go`
- Create: `apps/server/internal/services/documentary/dependencies_test.go`

**Interfaces:**
- Produces constants `ModeDocumentaryLongForm`, `StyleDocumentaryPaperCollage`, `SchemaVersion = 1`.
- Produces `Run`, `Idea`, `Script`, `Beat`, `VisualPlan`, `ThumbnailPlan`, `VoiceManifest`, `StepState`, and stable `Fingerprint(parts ...string) string`.
- Produces `ValidateDuration(seconds int) error` accepting only `30,60,120,180,300`.

- [ ] **Step 1: Write failing domain tests**

```go
func TestValidateDurationAllowsOnlyDocumentaryPresets(t *testing.T) {
    for _, seconds := range []int{30, 60, 120, 180, 300} {
        require.NoError(t, ValidateDuration(seconds))
    }
    for _, seconds := range []int{10, 45, 90, 301} {
        require.ErrorIs(t, ValidateDuration(seconds), ErrInvalid)
    }
}

func TestFingerprintIsStableAndOrderSensitive(t *testing.T) {
    require.Equal(t, Fingerprint("script", "300", "abc"), Fingerprint("script", "300", "abc"))
    require.NotEqual(t, Fingerprint("script", "300", "abc"), Fingerprint("abc", "300", "script"))
}
```

- [ ] **Step 2: Confirm red**

```bash
cd apps/server && go test ./internal/services/documentary -run 'ValidateDuration|Fingerprint' -v
```

Expected: compile failure because the package does not exist.

- [ ] **Step 3: Implement exact domain types and validation**

```go
const (
    SchemaVersion = 1
    ModeDocumentaryLongForm = "documentary-long-form"
    StyleDocumentaryPaperCollage = "documentary-paper-collage"
)

var ErrInvalid = errors.New("invalid documentary input")

func ValidateDuration(seconds int) error {
    switch seconds {
    case 30, 60, 120, 180, 300:
        return nil
    default:
        return ErrInvalid
    }
}
```

`Run` stores `ID`, `WorkspaceID`, nullable `ProjectID`, `CurrentStep`, `GenerationVersion`, optional source, niche/topic, ideas, selected idea, duration, language, script, voice, beats, visual plans, thumbnail plans, per-step fingerprint/status map, provider manifest, timestamps. Source is optional so a user can start from a topic only.

`Fingerprint` uses SHA-256 over length-prefixed strings and returns lower-case hex; never use timestamps or random values.

- [ ] **Step 4: Verify**

```bash
cd apps/server && go test ./internal/services/documentary -v
```

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add apps/server/internal/services/documentary
git commit -m "feat: define long form documentary domain"
```

---

## Task 4: Persist documentary runs before native project creation

**Files:**
- Create: `apps/server/internal/database/migrations/9001_auno_documentary_runs.sql`
- Create: `apps/server/internal/models/auno_documentary.go`
- Create: `apps/server/internal/services/documentary/state.go`
- Create: `apps/server/internal/services/documentary/state_test.go`
- Modify: `apps/server/internal/database/migrations/migrations_test.go`

**Interfaces:**
- Produces `type Store struct` with `Create`, `Get`, `Upsert`, `Delete`, `AttachProject`.
- Documentary run ID is independent of `video_projects.id`; `project_id` is nullable and uses `ON DELETE SET NULL`.

- [ ] **Step 1: Write persistence tests first**

Test an in-memory SQLite DB after migrations and assert a run can be created with no project, reloaded, updated, and later attached to an existing project. Assert another workspace cannot address it through the service query.

- [ ] **Step 2: Confirm red**

```bash
cd apps/server && go test ./internal/services/documentary -run 'Store|Persist|AttachProject' -v
```

Expected: FAIL because the store/table do not exist.

- [ ] **Step 3: Add migration and model**

```sql
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
```

Cap normalized state JSON at 4 MiB and provider manifest at 64 KiB. `Create` generates UUID server-side. `Upsert` requires matching workspace/run IDs and increments generation version only when the caller supplies the next expected version.

- [ ] **Step 4: Verify persistence and migration parser**

```bash
cd apps/server && go test ./internal/services/documentary ./internal/database/migrations -v
```

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add apps/server/internal/database/migrations/9001_auno_documentary_runs.sql apps/server/internal/models/auno_documentary.go apps/server/internal/services/documentary/state.go apps/server/internal/services/documentary/state_test.go apps/server/internal/database/migrations/migrations_test.go
git commit -m "feat: persist documentary generation runs"
```

---

## Task 5: Add the provider-neutral documentary planner facade and API routes

**Files:**
- Create: `apps/server/internal/services/documentary/planner.go`
- Create: `apps/server/internal/api/handlers/auto_video_documentary.go`
- Create: `apps/server/internal/api/handlers/auto_video_documentary_test.go`
- Modify: `apps/server/internal/api/routes.go`
- Modify: `apps/server/cmd/openpost/auno_ai_routing.go`
- Modify: `apps/server/cmd/openpost/main.go`

**Interfaces:**
- `documentary.Planner` methods: `GenerateIdeas`, `GenerateScript`, `GenerateBeats`, `GenerateVisuals`, `GenerateThumbnails`.
- Routes under `/auno/auto-video/documentary/runs`.
- Reuses existing workspace edit authorization, `sourcecontext.Loader`, `resolveAutoVideoMediaSource`, `mediastore.BlobStorage`, and the same Gemini/OpenRouter selection policy as short-form Auto Video.

- [ ] **Step 1: Write route contract tests**

Assert unauthenticated requests are rejected, workspace edit access is required, a run can be created with no source, and `target_duration_seconds: 300` is accepted for documentary create/update while existing short-form `/auno/auto-video/storyboard` still rejects values above 180.

- [ ] **Step 2: Confirm red**

```bash
cd apps/server && go test ./internal/api/handlers -run Documentary -v
```

Expected: FAIL because documentary routes/handler do not exist.

- [ ] **Step 3: Implement planner facade and route wiring**

```go
type Planner interface {
    GenerateIdeas(context.Context, IdeasInput) (IdeasResult, error)
    GenerateScript(context.Context, ScriptInput) (ScriptResult, error)
    GenerateBeats(context.Context, BeatsInput) (BeatsResult, error)
    GenerateVisuals(context.Context, VisualsInput) (VisualsResult, error)
    GenerateThumbnails(context.Context, ThumbnailsInput) (ThumbnailsResult, error)
}
```

Register:

```text
POST   /auno/auto-video/documentary/runs
GET    /auno/auto-video/documentary/runs/{run_id}
PUT    /auno/auto-video/documentary/runs/{run_id}
DELETE /auno/auto-video/documentary/runs/{run_id}
POST   /auno/auto-video/documentary/runs/{run_id}/ideas
POST   /auno/auto-video/documentary/runs/{run_id}/script
POST   /auno/auto-video/documentary/runs/{run_id}/beats
POST   /auno/auto-video/documentary/runs/{run_id}/visuals
POST   /auno/auto-video/documentary/runs/{run_id}/thumbnails
```

If the run has a media source, resolve it through the existing same-package `resolveAutoVideoMediaSource`; if source is omitted, pass no multimodal parts. Add `DocumentaryPlanner documentary.Planner` to `RouteDeps` and initialize it from the same provider/model selected by `aunoAutoVideoPlanner` without introducing a second credential path.

- [ ] **Step 4: Verify handler and generated contract boundary**

```bash
cd apps/server && go test ./internal/api/handlers ./internal/services/documentary -v
cd ../.. && bun run check -- contracts
```

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add apps/server/internal/services/documentary/planner.go apps/server/internal/api/handlers/auto_video_documentary.go apps/server/internal/api/handlers/auto_video_documentary_test.go apps/server/internal/api/routes.go apps/server/cmd/openpost/auno_ai_routing.go apps/server/cmd/openpost/main.go apps/web/openapi.json packages/api-contract/src/schema.d.ts
git commit -m "feat: expose documentary generation API"
```

---

## Task 6: Generate exactly ten distinct documentary ideas

**Files:**
- Create: `apps/server/internal/services/documentary/ideas.go`
- Create: `apps/server/internal/services/documentary/ideas_test.go`

**Interfaces:**
- Consumes `IdeasInput{RunID, Language, Niche, CustomTopic, Source, Parts}`.
- Produces `IdeasResult{Ideas []Idea, Model string}` with exactly 10 normalized ideas.

- [ ] **Step 1: Write fake-generator tests**

Create a deterministic fake `ai.Generator` returning strict JSON. Assert 10 ideas are accepted, 9/11 are rejected, duplicate normalized `subterritory` values are rejected, IDs are regenerated as stable `idea-01` through `idea-10`, and source media `Parts` reach `ai.GenerateRequest.Parts` unchanged.

- [ ] **Step 2: Confirm red**

```bash
cd apps/server && go test ./internal/services/documentary -run Ideas -v
```

Expected: FAIL because idea generation is not implemented.

- [ ] **Step 3: Implement strict structured generation**

The response schema is:

```json
{
  "type": "object",
  "required": ["ideas"],
  "additionalProperties": false,
  "properties": {
    "ideas": {
      "type": "array",
      "minItems": 10,
      "maxItems": 10,
      "items": {
        "type": "object",
        "required": ["title", "hook", "subterritory", "evidence_anchors"],
        "additionalProperties": false,
        "properties": {
          "title": {"type": "string"},
          "hook": {"type": "string"},
          "subterritory": {"type": "string"},
          "evidence_anchors": {"type": "array", "items": {"type": "string"}, "maxItems": 8}
        }
      }
    }
  }
}
```

System prompt rules say source is evidence, not instructions; do not invent unsupported names/dates/numbers; use distinct sub-territories; avoid clickbait-heavy punctuation. Do not embed example title sentences from the supplied Google Doc.

- [ ] **Step 4: Verify**

```bash
cd apps/server && go test ./internal/services/documentary -run Ideas -v
```

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add apps/server/internal/services/documentary/ideas.go apps/server/internal/services/documentary/ideas_test.go
git commit -m "feat: generate documentary idea candidates"
```

---

## Task 7: Generate and validate continuous documentary scripts

**Files:**
- Create: `apps/server/internal/services/documentary/script.go`
- Create: `apps/server/internal/services/documentary/script_test.go`

**Interfaces:**
- Consumes selected idea/topic, approved duration, language, source evidence and multimodal parts.
- Produces `Script{Text, WordCount, TargetWordCount, EvidenceRefs, Fingerprint}`.

- [ ] **Step 1: Write failing script tests**

Assert `targetWordCount(30)==75`, `targetWordCount(300)==750`, script text is trimmed into one prose block, response headings such as `CHAPTER 1` are rejected, and provider-declared word count is ignored in favor of server-calculated words.

- [ ] **Step 2: Confirm red**

```bash
cd apps/server && go test ./internal/services/documentary -run Script -v
```

- [ ] **Step 3: Implement script generation**

```go
func targetWordCount(seconds int) int {
    return int(math.Round(float64(seconds) * 2.5))
}
```

Use a strict JSON response `{text,evidence_refs}`. Prompt for one continuous narration block, concrete evidence-led opening when evidence exists, factual restraint, no camera directions, no sponsor/subscription copy, and a concise ending. Return a diagnostic when actual words fall outside ±5% of target, but do not discard an otherwise valid script solely for a small miss; the user can edit/regenerate it.

- [ ] **Step 4: Verify**

```bash
cd apps/server && go test ./internal/services/documentary -run Script -v
```

- [ ] **Step 5: Commit**

```bash
git add apps/server/internal/services/documentary/script.go apps/server/internal/services/documentary/script_test.go
git commit -m "feat: generate documentary narration scripts"
```

---

## Task 8: Segment scripts into stable 2–3 second beats and invalidate downstream state correctly

**Files:**
- Create: `apps/server/internal/services/documentary/beats.go`
- Create: `apps/server/internal/services/documentary/beats_test.go`
- Modify: `apps/server/internal/services/documentary/dependencies.go`
- Modify: `apps/server/internal/services/documentary/dependencies_test.go`

**Interfaces:**
- Produces stable beat IDs and cumulative estimated timings.
- Produces `InvalidateFrom(run *Run, changed Step) Run` that marks only dependent downstream outputs stale.

- [ ] **Step 1: Write segmentation/invalidation tests**

Use a deterministic 150-word fixture and assert total beat duration equals 60 seconds within one frame-equivalent tolerance at 30 fps, all non-final planned beats are in the 2–3 second target window after proportional distribution, IDs are stable for identical input, and changing duration stales script/voice/beats/visuals/animation but not source/topic/ideas.

- [ ] **Step 2: Confirm red**

```bash
cd apps/server && go test ./internal/services/documentary -run 'Beat|Invalidate' -v
```

- [ ] **Step 3: Implement deterministic clause segmentation**

Split on sentence boundaries first; split long sentences on comma/semicolon/colon/conjunction boundaries only when the resulting clause has at least three words. Pack clauses toward a 2.5-second estimate using 2.5 words/second, then rescale beat durations so their sum exactly equals the target duration. Beat ID format is `beat-<two-or-three-digit-index>-<8 hex chars>` where the suffix comes from `Fingerprint(runID, scriptFingerprint, normalizedNarration)`.

Dependency order is fixed:

```text
source/topic -> ideas -> selected idea/duration -> script -> voice -> beats -> visuals -> animation
                                                      \-> thumbnails (script/topic dependent)
```

- [ ] **Step 4: Verify**

```bash
cd apps/server && go test ./internal/services/documentary -run 'Beat|Invalidate' -v
```

- [ ] **Step 5: Commit**

```bash
git add apps/server/internal/services/documentary/beats.go apps/server/internal/services/documentary/beats_test.go apps/server/internal/services/documentary/dependencies.go apps/server/internal/services/documentary/dependencies_test.go
git commit -m "feat: segment documentary narration into beats"
```

---

## Task 9: Generate visual plans, animation briefs, prompt packs, and three thumbnails

**Files:**
- Create: `apps/server/internal/services/documentary/visuals.go`
- Create: `apps/server/internal/services/documentary/visuals_test.go`
- Create: `apps/server/internal/services/documentary/thumbnails.go`
- Create: `apps/server/internal/services/documentary/thumbnails_test.go`
- Create: `apps/server/internal/services/documentary/promptpack.go`
- Create: `apps/server/internal/services/documentary/promptpack_test.go`

**Interfaces:**
- `DocumentaryVisualIntent` accepts exactly the approved intent catalog.
- Each `VisualPlan` has hero description, up to three supports, optional short label, prompt, `RequiredSubjectIDs`, optional `MediaID`, and structured `AnimationBrief`.
- `SerializePromptPack(plans []VisualPlan) string` returns independent blocks separated by one blank line.
- `GenerateThumbnails` returns exactly three candidates.

- [ ] **Step 1: Write failing output-contract tests**

Assert invalid visual intent is rejected, support count >3 is rejected, labels over four words are rejected for beat visuals, serialized prompt pack has `len(plans)-1` double-newline separators and no numbering headers, and thumbnail output length is exactly three with at most two text elements of at most three words each.

- [ ] **Step 2: Confirm red**

```bash
cd apps/server && go test ./internal/services/documentary -run 'Visual|PromptPack|Thumbnail' -v
```

- [ ] **Step 3: Implement original Auno structured prompts**

Use the approved palette/material language as structured constraints, not copied long prompt prose. `AnimationBrief` fields:

```go
type AnimationBrief struct {
    Camera string `json:"camera"`                  // locked | micro-push
    Cadence string `json:"cadence"`                // stepped
    AssemblyOrder string `json:"assembly_order"`  // back-to-front | hero-first
    HoldRatio float64 `json:"hold_ratio"`          // default 0.30
    AmbientLife []string `json:"ambient_life"`
}
```

Default `HoldRatio` is `0.30`, camera `locked`, cadence `stepped`, and ambient life is limited to paper-corner lift, shadow breathe, halftone flicker, or string quiver where relevant.

- [ ] **Step 4: Verify**

```bash
cd apps/server && go test ./internal/services/documentary -run 'Visual|PromptPack|Thumbnail' -v
```

- [ ] **Step 5: Commit**

```bash
git add apps/server/internal/services/documentary/visuals.go apps/server/internal/services/documentary/visuals_test.go apps/server/internal/services/documentary/thumbnails.go apps/server/internal/services/documentary/thumbnails_test.go apps/server/internal/services/documentary/promptpack.go apps/server/internal/services/documentary/promptpack_test.go
git commit -m "feat: plan documentary visuals and thumbnails"
```

---

## Task 10: Add browser documentary contracts, API client, and stale-state model

**Files:**
- Create: `apps/web/src/lib/auno/documentary/types.ts`
- Create: `apps/web/src/lib/auno/documentary/api.ts`
- Create: `apps/web/src/lib/auno/documentary/state.ts`
- Create: `apps/web/src/lib/auno/documentary/state.test.ts`
- Modify: `apps/web/src/lib/auno/auto-video/types.ts`

**Interfaces:**
- Browser types mirror server JSON without redefining OpenPost project types.
- Adds internal Auto Video storyboard format `'documentary'` for editor sidecar interoperability while keeping short-form selector types separate.
- Produces `DocumentaryRunEditor` pure state helpers and `documentaryRunToMotionScenes(run)`.

- [ ] **Step 1: Write failing state-model tests**

Assert a reloaded run preserves current step/selected idea, changing script marks voice/beats/visuals/animation stale but leaves thumbnails stale only when their script/topic fingerprint changed, and converting beats to motion scenes preserves IDs/timing/visual intents.

- [ ] **Step 2: Confirm red**

```bash
bun --cwd apps/web x vitest run src/lib/auno/documentary/state.test.ts
```

- [ ] **Step 3: Implement browser types and API calls**

Use generated API contract types where available. `api.ts` exposes:

```ts
createDocumentaryRun(input)
getDocumentaryRun(workspaceId, runId)
updateDocumentaryRun(input)
generateDocumentaryIdeas(workspaceId, runId)
generateDocumentaryScript(workspaceId, runId)
generateDocumentaryBeats(workspaceId, runId)
generateDocumentaryVisuals(workspaceId, runId)
generateDocumentaryThumbnails(workspaceId, runId)
```

Do not store credentials or provider secrets in browser state.

- [ ] **Step 4: Verify**

```bash
bun --cwd apps/web x vitest run src/lib/auno/documentary/state.test.ts
bun run check -- frontend
```

- [ ] **Step 5: Commit**

```bash
git add apps/web/src/lib/auno/documentary apps/web/src/lib/auno/auto-video/types.ts
git commit -m "feat: add documentary browser state contracts"
```

---

## Task 11: Add Documentary Long-form mode and modular wizard UI

**Files:**
- Create: `apps/web/src/lib/components/auno-documentary/documentary-wizard.svelte`
- Create: `apps/web/src/lib/components/auno-documentary/documentary-step-nav.svelte`
- Create: `apps/web/src/lib/components/auno-documentary/documentary-ideas.svelte`
- Create: `apps/web/src/lib/components/auno-documentary/documentary-script.svelte`
- Create: `apps/web/src/lib/components/auno-documentary/documentary-prompt-pack.svelte`
- Create: `apps/web/src/lib/components/auno-documentary/documentary-thumbnails.svelte`
- Create: `apps/web/src/lib/auno/documentary/wizard-model.ts`
- Create: `apps/web/src/lib/auno/documentary/wizard-model.test.ts`
- Modify: `apps/web/src/routes/auto-video/+page.svelte`

**Interfaces:**
- `Auto Video` mode selector: `short-form | documentary-long-form`.
- Documentary defaults: landscape canvas, Vox Style, English US, duration 60 unless user selects another approved preset.
- Wizard resumes a durable run by run ID.

- [ ] **Step 1: Write pure wizard-model tests**

Assert documentary mode selects `landscape`, `documentary-paper-collage`, and allowed duration list `[30,60,120,180,300]`; a completed `ideas` step enables `duration`; stale downstream steps show stale state rather than silently deleting previous output.

- [ ] **Step 2: Confirm red**

```bash
bun --cwd apps/web x vitest run src/lib/auno/documentary/wizard-model.test.ts
```

- [ ] **Step 3: Implement wizard and isolate existing short-form UI**

At the top of `/auto-video`, render:

```text
What are you creating?
[ Short-form ] [ Documentary Long-form ]
```

When documentary is selected, render `DocumentaryWizard`; do not execute short-form storyboard generation. Keep the existing short-form flow unchanged inside the short-form branch.

Fix the existing short-form TXT client/server mismatch in the same route: change `content.slice(0, 200_000)` to `content.slice(0, 50_000)` and visible copy to `planner text capped at 50k characters`, matching server `maxSourceLength=50000`.

Documentary source is optional. Its source picker reuses the existing 25 MB Media Library/upload paths, but `Skip source` creates the run without a source object.

- [ ] **Step 4: Verify UI model and frontend checks**

```bash
bun --cwd apps/web x vitest run src/lib/auno/documentary/wizard-model.test.ts
bun run check -- frontend
bun run check -- ui-consistency
```

- [ ] **Step 5: Commit**

```bash
git add apps/web/src/lib/components/auno-documentary apps/web/src/lib/auno/documentary/wizard-model.ts apps/web/src/lib/auno/documentary/wizard-model.test.ts apps/web/src/routes/auto-video/+page.svelte
git commit -m "feat: add long form documentary wizard"
```

---

## Task 12: Add the beat editor with bounded rendering for 100+ beats

**Files:**
- Create: `apps/web/src/lib/auno/documentary/beat-window.ts`
- Create: `apps/web/src/lib/auno/documentary/beat-window.test.ts`
- Create: `apps/web/src/lib/components/auno-documentary/documentary-beat-editor.svelte`
- Create: `apps/web/src/lib/auno/documentary/fixtures.ts`

**Interfaces:**
- `visibleBeatWindow(total, anchor, radius=18)` returns a stable `[start,end)` with at most 37 rows for normal radius.
- Beat editor supports edit narration, split, merge with adjacent, change visual intent, replace media ID, regenerate one visual plan.

- [ ] **Step 1: Write failing 120-beat tests**

```ts
it('bounds a 120 beat project to a small rendering window', () => {
  expect(visibleBeatWindow(120, 60, 18)).toEqual({ start: 42, end: 79 });
  expect(79 - 42).toBeLessThanOrEqual(37);
});
```

Also assert split preserves total duration and merge preserves start/end range.

- [ ] **Step 2: Confirm red**

```bash
bun --cwd apps/web x vitest run src/lib/auno/documentary/beat-window.test.ts
```

- [ ] **Step 3: Implement the beat editor**

Render only the computed window plus top/bottom spacers. Use stable beat IDs as Svelte keys. Do not mount hidden media previews for off-window beats. Persist edits in batches through the durable run update function after a short explicit user edit boundary, not once per animation frame.

- [ ] **Step 4: Verify**

```bash
bun --cwd apps/web x vitest run src/lib/auno/documentary/beat-window.test.ts
bun run check -- frontend
```

- [ ] **Step 5: Commit**

```bash
git add apps/web/src/lib/auno/documentary/beat-window.ts apps/web/src/lib/auno/documentary/beat-window.test.ts apps/web/src/lib/auno/documentary/fixtures.ts apps/web/src/lib/components/auno-documentary/documentary-beat-editor.svelte
git commit -m "feat: add scalable documentary beat editor"
```

---

## Task 13: Add the tenth Auno Motion Style and deterministic paper-motion primitives

**Files:**
- Modify: `packages/auno-motion/src/types.ts`
- Modify: `packages/auno-motion/src/styles.ts`
- Modify: `packages/auno-motion/src/planner.ts`
- Modify: `packages/auno-motion/src/recommend.ts`
- Modify: `packages/auno-motion/src/index.ts`
- Create: `packages/auno-motion/src/documentary-paper-collage.ts`
- Create: `packages/auno-motion/src/documentary-paper-collage.test.ts`
- Create: `packages/auno-motion/src/determinism-guard.test.ts`

**Interfaces:**
- Adds style ID `documentary-paper-collage`, UI label `Vox Style`.
- Produces pure primitives `paperSlideAt`, `paperDropSettleAt`, `stampHitAt`, `pinPopAt`, `labelStripAt`, `stringDrawAt`, `markerUnderlineAt`, `arrowDrawAt`, `paperCornerLiftAt`, `shadowBreatheAt`, `halftoneFlickerAt`.

- [ ] **Step 1: Write failing catalog and determinism tests**

Assert style catalog now has exactly 10 IDs; Vox default camera has `xTravel <= 0.004`, `yTravel <= 0.004`, `rotationDegrees <= 0.1`, transition language only hard-cut/crossfade, and every primitive returns the same value for the same seed/element/time regardless of call order.

Static guard reads production files under `packages/auno-motion/src` and fails on `Math.random(`, `Date.now(`, or `performance.now(` outside tests.

- [ ] **Step 2: Confirm red**

```bash
bun test packages/auno-motion/src/documentary-paper-collage.test.ts packages/auno-motion/src/determinism-guard.test.ts
```

- [ ] **Step 3: Implement the style and quantized motion**

Vox default brief:

```ts
{
  palette: ['#D7C3A3', '#171411', '#69635B', '#C92828', '#B78A28'],
  typography: 'condensed-editorial-typewriter-label',
  cameraLanguage: 'locked-documentary-tabletop',
  motionSignature: 'paper-assembly-stop-motion',
  backgroundLanguage: 'archival-newsprint-paper',
  transitionLanguage: ['hard-cut', 'crossfade']
}
```

Implement `steppedProgress(seconds, start, duration, fps, holdFrames=2)` by quantizing absolute frame progress; primitives derive amplitude/phase from `seededUnit(seed, elementId + channel)` and never accumulate state.

Add a planner refinement for Vox that keeps camera locked by default and places most motion in composition elements. `recommendMotionStyle({format:'documentary'})` returns `documentary-paper-collage`.

- [ ] **Step 4: Verify**

```bash
bun test packages/auno-motion/src/documentary-paper-collage.test.ts packages/auno-motion/src/determinism-guard.test.ts
bun run check -- frontend
```

- [ ] **Step 5: Commit**

```bash
git add packages/auno-motion/src
git commit -m "feat: add documentary paper collage motion style"
```

---

## Task 14: Add functional Vox Motion Composition controls and fix composition authoring labels

**Files:**
- Modify: `apps/web/src/lib/video-editor/project/types.ts`
- Modify: `apps/web/src/lib/video-editor/sequences/composition-controls.ts`
- Modify: `apps/web/src/lib/video-editor/sequences/composition-controls.test.ts`
- Modify: `apps/web/src/lib/video-editor/components/composition-controls-authoring.svelte`
- Modify: `apps/web/src/lib/auno/motion/motion-composition.ts`
- Create: `apps/web/src/lib/auno/motion/motion-composition.test.ts`

**Interfaces:**
- Adds bounded control properties `motion.paperJitter`, `motion.shadowDepth`, `motion.holdRatio`, `motion.assemblyOrder`.
- Existing generic override UI continues to use `number`/`select`; controls must alter resolved native subcomposition items, not be decorative metadata.

- [ ] **Step 1: Write failing override tests**

Create a Vox composition, apply overrides `{ 'paper-jitter':'0.2', 'shadow-depth':'0.8', 'hold-ratio':'0.4', 'assembly-order':'hero-first' }`, and assert generated internal keyframe ranges/timings differ from defaults while staying within the item duration. Also assert invalid select values are rejected and numeric values are clamped.

- [ ] **Step 2: Confirm red**

```bash
bun --cwd apps/web x vitest run src/lib/video-editor/sequences/composition-controls.test.ts src/lib/auno/motion/motion-composition.test.ts
```

- [ ] **Step 3: Implement control semantics**

Extend `CompositionControlProperty` and its Zod enum. `paperJitter` scales only Auno paper-element x/y/rotation micro-offset tracks; `shadowDepth` scales authored shadow/opacity separation; `holdRatio` moves the final assembly keyframe to `round(duration * (1-holdRatio))`; `assemblyOrder` accepts only `back-to-front` or `hero-first` and deterministically remaps child entrance offsets.

Fix `propertyLabel()` in `composition-controls-authoring.svelte` so it handles all existing `shape.shapeType`, `motion.intensity`, `motion.depth`, `motion.speed` plus the new properties; never return `undefined` for a published control.

- [ ] **Step 4: Verify**

```bash
bun --cwd apps/web x vitest run src/lib/video-editor/sequences/composition-controls.test.ts src/lib/auno/motion/motion-composition.test.ts
bun run check -- frontend
```

- [ ] **Step 5: Commit**

```bash
git add apps/web/src/lib/video-editor/project/types.ts apps/web/src/lib/video-editor/sequences/composition-controls.ts apps/web/src/lib/video-editor/sequences/composition-controls.test.ts apps/web/src/lib/video-editor/components/composition-controls-authoring.svelte apps/web/src/lib/auno/motion/motion-composition.ts apps/web/src/lib/auno/motion/motion-composition.test.ts
git commit -m "feat: expose editable Vox motion controls"
```

---

## Task 15: Compile documentary beats and real source media into a native OpenPost project

**Files:**
- Create: `apps/web/src/lib/auno/documentary/compiler.ts`
- Create: `apps/web/src/lib/auno/documentary/compiler.test.ts`
- Modify: `apps/web/src/lib/auno/auto-video/types.ts`
- Modify: `apps/web/src/lib/auno/auto-video/sidecar.ts`

**Interfaces:**
- `compileDocumentaryRunToProject(run, assets): { project, sidecar, motionGraph }`.
- Native project uses landscape 1920×1080 and stable tracks for labels, annotations, motion, visuals, captions, voice, music.
- Sidecar `generationGraph.documentary` stores compact `{runId, beatIds, style}` manifest.

- [ ] **Step 1: Write failing native-shape tests**

Build a three-beat fixture: one placeholder beat, one image media beat, one video media beat. Assert project has no scene represented only by a generated flattened MP4; image/video beats produce native media items referencing their `mediaId`; placeholder beat produces native background/text/composition; marker frames match cumulative beat timing; ownership categories are correct.

- [ ] **Step 2: Confirm red**

```bash
bun --cwd apps/web x vitest run src/lib/auno/documentary/compiler.test.ts
```

- [ ] **Step 3: Implement native compilation**

Create a blank landscape project and explicit tracks:

```text
track-auno-labels       order 0
track-auno-annotations  order 1
track-auno-motion       order 2
track-video-main        order 3
track-auno-captions     order 4
track-audio             order 5
track-auno-music        order 6
```

For each beat, derive `from` and `durationInFrames` from absolute beat timing. Use media metadata supplied in `assets` to author valid native image/video items through the same helper/field shape used by existing editor media insertion; do not invent a parallel media schema. When no media exists, compile archival native background + label/shape placeholder. Build a `MotionSceneGraph` with Vox style and apply `applyMotionGraphToProject`.

- [ ] **Step 4: Verify**

```bash
bun --cwd apps/web x vitest run src/lib/auno/documentary/compiler.test.ts src/lib/auno/motion/motion-composition.test.ts
bun run check -- frontend
```

- [ ] **Step 5: Commit**

```bash
git add apps/web/src/lib/auno/documentary/compiler.ts apps/web/src/lib/auno/documentary/compiler.test.ts apps/web/src/lib/auno/auto-video/types.ts apps/web/src/lib/auno/auto-video/sidecar.ts
git commit -m "feat: compile documentary beats to native projects"
```

---

## Task 16: Generate long-form voice in bounded chunks, reflow beats from actual audio, and create captions

**Files:**
- Create: `apps/web/src/lib/auno/documentary/enrichment.ts`
- Create: `apps/web/src/lib/auno/documentary/enrichment.test.ts`
- Modify: `apps/web/src/lib/video-editor/auno/auno-auto-video-panel.svelte`

**Interfaces:**
- `planVoiceChunks(beats, maxEstimatedSeconds=25): DocumentaryVoiceChunk[]`.
- `redistributeBeatDurations(beats, chunkMeasurements): DocumentaryBeat[]` preserves beat order and exact measured chunk totals.
- `generateDocumentaryVoice` reuses existing local TTS/cloud-local asset import seams.

- [ ] **Step 1: Write failing chunk/reflow tests**

Assert a 60-second fixture becomes at least three chunks with each estimated duration <=25 seconds; measured chunk duration 24.4 seconds is exactly distributed over mapped beats proportionally; all beat starts are cumulative with no negative gaps; total final beat duration equals total measured narration duration within 1 ms.

- [ ] **Step 2: Confirm red**

```bash
bun --cwd apps/web x vitest run src/lib/auno/documentary/enrichment.test.ts
```

- [ ] **Step 3: Implement enrichment and degraded mode**

Use existing `generateLocalSpeech`, `importCloudProjectAssetFile`, and local `importGeneratedAudio` paths. Import each chunk as an editable audio item and retain `{chunkId, mediaId, itemId, beatIds, durationSeconds}`. After measurement, update beat timing, reapply the same Vox motion seed/customization, then build captions from approved script/beat timings without ASR.

If local TTS is unavailable, return a `NarrationPackage` containing script, voice direction metadata, and chunk text ranges; do not block project creation.

The Video Editor Auno panel detects the documentary manifest and offers `Generate documentary voice` instead of calling existing per-scene short-form TTS 100+ times.

- [ ] **Step 4: Verify**

```bash
bun --cwd apps/web x vitest run src/lib/auno/documentary/enrichment.test.ts src/lib/video-editor/auno
bun run check -- frontend
```

- [ ] **Step 5: Commit**

```bash
git add apps/web/src/lib/auno/documentary/enrichment.ts apps/web/src/lib/auno/documentary/enrichment.test.ts apps/web/src/lib/video-editor/auno/auno-auto-video-panel.svelte
git commit -m "feat: add long form documentary voice reflow"
```

---

## Task 17: Add capability-level degraded media behavior and optional generated-asset import seams

**Files:**
- Create: `apps/web/src/lib/auno/documentary/capabilities.ts`
- Create: `apps/web/src/lib/auno/documentary/capabilities.test.ts`
- Create: `apps/web/src/lib/auno/documentary/assets.ts`
- Create: `apps/web/src/lib/auno/documentary/assets.test.ts`
- Modify: `apps/server/internal/api/handlers/auto_video.go`
- Modify: `apps/web/src/lib/components/auno-documentary/documentary-wizard.svelte`

**Interfaces:**
- Capability levels: `text-only`, `tts-image`, `full-media`.
- `documentaryNextActions(capabilities, run)` always includes a viable text-only action.
- Generated image/video assets enter Media Library/project through existing upload/import boundaries and keep native editable placeholder/composition until explicitly replaced.

- [ ] **Step 1: Write failing degraded-mode tests**

Assert text-only mode offers prompt-pack export + placeholder project creation; TTS/image mode offers voice + image generation/import but not video animation; full-media adds optional animation variants. Assert no mode hides project creation.

- [ ] **Step 2: Confirm red**

```bash
bun --cwd apps/web x vitest run src/lib/auno/documentary/capabilities.test.ts src/lib/auno/documentary/assets.test.ts
```

- [ ] **Step 3: Implement capability mapping**

Extend `/auno/ai/capabilities` with non-secret booleans for configured documentary text planner and optional server image/video generation only when such provider support actually exists. Keep existing browser TTS/music flags. Do not claim ElevenLabs/OmniFlash availability unless an actual configured adapter exists.

`assets.ts` imports completed generated media through the existing media upload/project asset interfaces and returns media IDs; it never places provider URLs directly into project JSON.

- [ ] **Step 4: Verify**

```bash
bun --cwd apps/web x vitest run src/lib/auno/documentary/capabilities.test.ts src/lib/auno/documentary/assets.test.ts
cd apps/server && go test ./internal/api/handlers -run AunoAI -v
cd ../.. && bun run check -- contracts && bun run check -- frontend
```

- [ ] **Step 5: Commit**

```bash
git add apps/web/src/lib/auno/documentary/capabilities.ts apps/web/src/lib/auno/documentary/capabilities.test.ts apps/web/src/lib/auno/documentary/assets.ts apps/web/src/lib/auno/documentary/assets.test.ts apps/server/internal/api/handlers/auto_video.go apps/web/src/lib/components/auno-documentary/documentary-wizard.svelte apps/web/openapi.json packages/api-contract/src/schema.d.ts
git commit -m "feat: add documentary degraded media modes"
```

---

## Task 18: Close remaining Phase 4 provenance and deterministic-contract release debt

**Files:**
- Populate: `third_party/bang-motion/` with pinned upstream reference snapshot at `0f1bd1103835890354496d009af62885fe0a05d5`
- Preserve: `third_party/bang-motion/UPSTREAM.md`
- Preserve: `licenses/bang-motion/LICENSE`
- Create: `scripts/check-bang-motion-vendor.mjs`
- Create: `scripts/check-third-party-notices.mjs`
- Modify: `NOTICE.md`
- Modify: `docs/compliance/third-party-inventory.md`
- Create: `packages/auno-motion/src/easing.ts`
- Create: `packages/auno-motion/src/easing.test.ts`
- Create: `apps/server/internal/aunomotion/compiler_test.go`
- Create: `apps/web/src/lib/auno/motion/cross-runtime-contract.test.ts`

**Interfaces:**
- Vendor snapshot is provenance/reference only; runtime imports from `third_party/bang-motion` are forbidden.
- Go/web complex Motion Composition compiler shapes agree on IDs, tracks, duration, controls, and nested item kinds.

- [ ] **Step 1: Write integrity and parity tests first**

`check-bang-motion-vendor.mjs` must fail if `SKILL.md`, `README.md`, `LICENSE`, `references/architecture.md`, or `references/techniques.md` is absent or if `UPSTREAM.md` does not contain the pinned SHA.

Cross-runtime fixture asserts composition ID, timeline item ID/type, duration frames, control IDs/defaults, internal track ID, nested item count/types. Object key serialization order is not compared.

- [ ] **Step 2: Confirm red**

```bash
bun scripts/check-bang-motion-vendor.mjs
cd apps/server && go test ./internal/aunomotion -v
cd ../.. && bun --cwd apps/web x vitest run src/lib/auno/motion/cross-runtime-contract.test.ts
```

Expected: vendor check fails before snapshot and parity test fails before fixture coverage.

- [ ] **Step 3: Vendor exact reference source and add deterministic easing**

Copy the exact pinned upstream snapshot while excluding `.git`. Keep upstream LICENSE both in the snapshot and `licenses/bang-motion/LICENSE`. Runtime production code remains under Auno modules.

`easing.ts` contains pure functions only, e.g. `clamp01`, `easeOutCubic`, `easeInOutCubic`, and `steppedEase(progress, steps)`. Add notice checker that verifies OpenPost and Bang Motion sections and required license paths exist.

- [ ] **Step 4: Verify provenance/parity**

```bash
bun scripts/check-bang-motion-vendor.mjs
bun scripts/check-third-party-notices.mjs
bun test packages/auno-motion/src/easing.test.ts packages/auno-motion/src/determinism-guard.test.ts
cd apps/server && go test ./internal/aunomotion -v
cd ../.. && bun --cwd apps/web x vitest run src/lib/auno/motion/cross-runtime-contract.test.ts
```

- [ ] **Step 5: Commit**

```bash
git add third_party/bang-motion licenses/bang-motion NOTICE.md docs/compliance/third-party-inventory.md scripts/check-bang-motion-vendor.mjs scripts/check-third-party-notices.mjs packages/auno-motion/src/easing.ts packages/auno-motion/src/easing.test.ts apps/server/internal/aunomotion/compiler_test.go apps/web/src/lib/auno/motion/cross-runtime-contract.test.ts
git commit -m "chore: complete motion provenance and parity gates"
```

---

## Task 19: Add deterministic browser comparison, visual-QA coverage, full Vox E2E, and affected-surface CI

**Files:**
- Create: `tests/app/auno/fixtures/documentary-fixture.ts`
- Create: `tests/app/auno/motion-determinism.spec.ts`
- Create: `tests/app/auno/motion-visual-qa.spec.ts`
- Create: `tests/app/auno/vox-documentary.spec.ts`
- Create: `.github/workflows/auno-phase4-release.yml`

**Interfaces:**
- Browser suite uses existing `tests/app/playwright.config.ts` and deterministic local fixtures; no paid network model calls.
- The fixed long-form fixture contains at least 120 beats.

- [ ] **Step 1: Write E2E specs before adding any test-only app hooks they require**

`motion-determinism.spec.ts` must:

```text
open fixed native motion project
seek each persisted project probe frame
capture preview pre-encode pixels
capture export renderer pre-encode pixels for same frame
assert dimensions/frame numbers equal
assert changed-pixel ratio <= 0.0001 and max channel delta <= 1
reload project
capture preview frames again
assert same tolerance
```

`motion-visual-qa.spec.ts` exercises all ten Motion Styles at 25/50/75% and specifically Vox cold-open, map/document, connection-board, evidence-number, final beats. It reads only structured runtime QA hooks and screenshots failures for diagnostics.

`vox-documentary.spec.ts` uses deterministic API fixtures to prove mode → 10 ideas → idea selection → duration → script → beats → visual plans → native project → composition override → reload persistence → 120-beat scrolling → export entry point.

- [ ] **Step 2: Run and confirm red**

```bash
bunx playwright test --config tests/app/playwright.config.ts tests/app/auno/motion-determinism.spec.ts tests/app/auno/motion-visual-qa.spec.ts tests/app/auno/vox-documentary.spec.ts --workers=1
```

Expected: FAIL until required test-only fixture routes/hooks are wired.

- [ ] **Step 3: Add the minimum deterministic fixture/test hooks and CI workflow**

Any debug hook must be guarded by the existing dev/test build boundary and absent from production state/API responses. Do not add a permanent user-facing debug toolbar.

The workflow triggers on pull request/push path changes under:

```text
packages/auno-motion/**
apps/server/internal/aunomotion/**
apps/server/internal/services/autovideo/**
apps/server/internal/services/documentary/**
apps/server/internal/api/handlers/auto_video*.go
apps/server/internal/models/auno_*.go
apps/server/internal/database/migrations/900*.sql
apps/web/src/lib/auno/**
apps/web/src/lib/components/auno-documentary/**
apps/web/src/routes/auto-video/**
tests/app/auno/**
third_party/bang-motion/**
NOTICE.md
docs/compliance/third-party-inventory.md
```

Jobs: motion-package, backend-documentary, frontend-auno, browser-auno, compliance. Use repository-owned root commands and `tests/app/playwright.config.ts`.

- [ ] **Step 4: Verify E2E and workflow syntax/checks**

```bash
bunx playwright test --config tests/app/playwright.config.ts tests/app/auno/motion-determinism.spec.ts tests/app/auno/motion-visual-qa.spec.ts tests/app/auno/vox-documentary.spec.ts --workers=1
bun run check -- workflows
bun run check -- frontend
cd apps/server && go test ./internal/services/documentary ./internal/aunomotion ./internal/services/autovideo -v
```

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add tests/app/auno .github/workflows/auno-phase4-release.yml
git commit -m "test: gate Vox documentary and motion end to end"
```

---

## Task 20: Run the full Phase 4/Vox release-candidate gate and record real evidence

**Files:**
- Create only after gates pass: `docs/releases/2.0.0-rc.1-phase4-verification.md`
- Modify after gates pass: `docs/compliance/third-party-inventory.md`
- Add changelog fragment under `changes/` using the repository's current fragment naming convention discovered by `scripts/changelog-fragments.mjs`

**Interfaces:**
- Produces release evidence for candidate `2.0.0-rc.1`; it does not create/tag stable `2.0.0`.

- [ ] **Step 1: Install exactly from the lock and run complete static/test gates**

```bash
bun install --frozen-lockfile
bun run format:check
bun run check
bun run lint
bun run test
cd apps/server && go test ./... && cd ../..
```

All commands must exit 0. Fix product/test defects rather than weakening gates.

- [ ] **Step 2: Run Auno browser gates**

```bash
bunx playwright test --config tests/app/playwright.config.ts tests/app/auno --workers=1
```

All Auno Motion/Vox tests must pass with the pinned Chromium behavior from the app config.

- [ ] **Step 3: Run deployment, storage, database, provenance, and security gates**

```bash
sh scripts/check-aapanel-compose.sh
sh scripts/check-ai-degraded-readiness.sh
bun scripts/check-storage-config.mjs
bun scripts/check-bang-motion-vendor.mjs
bun scripts/check-third-party-notices.mjs
cd apps/server && go test ./internal/database/migrations -v && cd ../..
bun run check -- workflows
bun run check -- release-version
bash scripts/bun-audit.sh
```

If any named Auno-specific deployment script is still absent when execution reaches this task, create it in the earlier owning deployment task only after confirming the current repository equivalent; do not silently skip the requirement. The gate recorded in evidence must name the actual repository command that proved aaPanel compose, degraded-AI readiness, and storage configuration.

- [ ] **Step 4: Build the real candidate artifact and prove revision/readiness**

Use the repository's canonical server/web release path described in `docs/agents/deployable-inventory.md`, building candidate image `ghcr.io/dhtoan/aunostudio:2.0.0-rc.1` or the exact Auno registry target configured by the release files at execution time. Record the immutable image digest.

Boot the candidate against SQLite + local storage and verify:

```text
/api/v1/version reports the candidate tag and exact source SHA
/api/v1/ready succeeds
login/workspace succeeds
Photo Editor opens
Video Editor opens
Short-form Auto Video still creates a project
Documentary Long-form run survives restart
120-beat Vox project reopens after restart
voice/captions degraded path remains usable without optional provider
Motion Composition controls persist after reload
export completes and output appears in Media/project export storage
```

Restart the container between run creation and resume proof. Do not treat a successful build as deployment/revision proof.

- [ ] **Step 5: Record verification evidence only after every blocking gate is green**

Create `docs/releases/2.0.0-rc.1-phase4-verification.md` containing:

```text
source commit SHA
candidate image digest
UTC verification time
exact command matrix and exit status
browser suite result counts
SQLite migration result
PostgreSQL migration result when run by CI service
preview/export probe tolerance and result
120-beat fixture result
restart/resume result
license/provenance checks
known non-blocking limitations
```

Update the third-party inventory only with facts proven by the candidate. Add the user-visible Vox/Documentary feature to the changelog fragment.

- [ ] **Step 6: Final release-focused checks and commit evidence**

```bash
bun run check -- docs
bun run check -- release-version
bun run release -- check
```

Then:

```bash
git add docs/releases/2.0.0-rc.1-phase4-verification.md docs/compliance/third-party-inventory.md changes
git commit -m "docs: record Auno Studio 2.0 release candidate verification"
```

Do not create a stable `2.0.0` tag in this task. Invoke `superpowers:requesting-code-review` and resolve all blocking findings before stable acceptance.

---

## Implementation Order and Checkpoints

Execute Tasks 1–2 first because the user explicitly requested the remaining preview/export deterministic comparison and runtime Visual QA work. Tasks 3–12 deliver durable long-form planning and UI. Tasks 13–17 deliver Vox native motion/media behavior. Task 18 closes provenance/parity debt that blocks Phase 4 release. Task 19 provides browser/CI evidence. Task 20 is the only task allowed to claim release-candidate readiness.

Checkpoint after Task 2: deterministic hooks and runtime QA contract exist and focused tests pass.

Checkpoint after Task 12: a documentary run can persist/resume through ideas, script, beats, visual plans, and 100+ beat editing without native project creation yet.

Checkpoint after Task 17: the full Vox workflow compiles into editable native project state and media enrichment remains optional.

Checkpoint after Task 19: deterministic browser comparison, ten-style visual QA, 120-beat Vox E2E, and affected-surface CI are green.

Checkpoint after Task 20: only then may `2.0.0-rc.1` be described as verified.

## Plan Self-Review Record

- **Spec coverage:** Source/no-source, topic/niche, exactly ten ideas, duration presets, continuous script, provider-neutral voice, 2–3 second beats, visual prompt pack, optional animation assets, three thumbnails, native project compilation, selective regeneration, 100+ beat performance, provider degradation, deterministic preview/export, runtime Visual QA, restart persistence, and release proof all have owning tasks.
- **No-placeholder scan:** The plan contains no implementation `TBD`/`TODO`; route names, types, duration values, test commands, thresholds, IDs, and release evidence fields are explicit.
- **Type consistency:** Server uses `documentary-paper-collage`, `documentary-long-form`, and schema version 1 consistently; browser adapters mirror those values; Vox UI label does not become a provider/runtime identifier.
- **Repository consistency:** Browser E2E lives under existing `tests/app/` and uses `tests/app/playwright.config.ts`; a new `.github/workflows/auno-phase4-release.yml` is created because no existing workflow directory/file owns this Auno-specific gate; persistent long-form run state is separate from project-keyed `auno_auto_video_projects` because it must exist before native project creation.
