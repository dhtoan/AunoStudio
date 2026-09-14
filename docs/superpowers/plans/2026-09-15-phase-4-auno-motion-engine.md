# Phase 4 — Auno Motion Engine Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Adapt Bang Motion's motion-design rules and selected code into Auno Studio as an editable, deterministic Motion Engine that plans coherent motion styles, compiles ordinary motion into native OpenPost timeline structures, represents complex scenes as editable OpenPost compositions, and adds visual QA without introducing a separate HTML/MP4 editor pipeline.

**Architecture:** Vendor a pinned Bang Motion source snapshot for provenance and port reusable algorithms/rules into an Auno-owned pure TypeScript package. Use OpenPost's existing `TimelineItem`/keyframe/motion/background model for ordinary effects and its existing `composition` item + `SubComposition` + `CompositionControlSchema` infrastructure for Motion Compositions. Mirror only the minimal scene-graph/compilation contract in Go so headless Auto Video can create the same native project shape. No generated scene is converted to an opaque HTML page or MP4 before the user edits it.

**Tech Stack:** TypeScript, Zod, Svelte 5, OpenPost Video Editor timeline/composition types, OpenPost composite-2d composition controls, Go 1.26.6 for headless compiler support, Playwright screenshot testing, Vitest, Go test, Bang Motion source snapshot pinned to commit `0f1bd1103835890354496d009af62885fe0a05d5` (MIT).

**Spec:** `docs/superpowers/specs/2026-09-15-auno-studio-web-2-design.md`

## Global Constraints

- Phases 1–3 must be merged and green before this plan starts.
- Bang Motion is integrated as Auno Motion Engine, not exposed as a standalone HTML generator.
- Do not use Bang Motion's `index.html` deliverable as the Auno project format.
- Do not pre-render generated scenes to MP4 merely to make them editable in OpenPost.
- Ordinary text/image/shape/video/audio/keyframe motion compiles into native OpenPost items.
- Complex grouped/procedural motion uses OpenPost's existing `composition` item and `SubComposition` model before inventing a new timeline item kind.
- Motion Compositions must expose editable controls through OpenPost's composition-control system.
- Same project state + seed + time must produce the same visual frame in preview and export.
- Motion styles are not legacy Auno presets; Preset V2 remains out of scope.
- V1 Motion Styles: Editorial Fashion, Luxury Product, Visual Journalism, White Catalog, Continuous Action, Cartoon Collage, Vintage Sketch, Breaking News, Minimal Data.
- Bang Motion MIT notice and pinned upstream commit must remain in the repository.
- Bang Motion starter/reference code is provenance/reference material; runtime production code lives under `@auno/motion` and Auno/OpenPost editor modules.
- Avoid a new Three.js runtime in V1 when OpenPost's native backgrounds, keyframes, motion modifiers, text motion, effects, and compositions can express the result. A future custom WebGL runtime requires a separate design review.
- Structural anti-slide checks are deterministic rules; subjective visual quality is handled by screenshot review/vision QA rather than hidden magic thresholds.
- All behavior changes follow red → green → refactor with small commits.

## Existing OpenPost Seams to Use

The imported editor already supports:

```text
TimelineItem types:
  video, audio, image, lottie, text, subtitle, shape,
  adjustment, controller, composition, background

Project timeline:
  tracks[]
  items[]
  transitions[]
  compositions[]

SubComposition:
  id
  name
  editorKind: 'sequence' | 'composite-2d'
  items
  tracks
  transitions
  compositionControls

Timeline composition item:
  compositionId
  compositionControlOverrides
```

Relevant OpenPost files:

```text
apps/web/src/lib/video-editor/project/types.ts
apps/web/src/lib/video-editor/sequences/composition-controls.ts
apps/web/src/lib/video-editor/sequences/sequence-store.svelte.ts
apps/web/src/lib/video-editor/sequences/composition-controls.test.ts
```

Use these before extending core types.

---

## Task 1: Vendor the exact Bang Motion snapshot and preserve its MIT notice

**Files:**
- Create: `third_party/bang-motion/` snapshot
- Create: `third_party/bang-motion/UPSTREAM.md`
- Create: `licenses/bang-motion/LICENSE`
- Modify: `NOTICE.md`
- Modify: `docs/compliance/third-party-inventory.md`
- Create: `scripts/check-bang-motion-vendor.mjs`

**Interfaces:**
- Consumes: upstream repository `bangtutorial/bang-motion` commit `0f1bd1103835890354496d009af62885fe0a05d5`.
- Produces: immutable reference snapshot and license/provenance metadata; no runtime imports from `third_party/`.

- [ ] **Step 1: Write vendor-integrity check before copying source**

```js
import fs from 'node:fs';
import path from 'node:path';

const root = 'third_party/bang-motion';
for (const file of ['SKILL.md', 'README.md', 'LICENSE', 'references/architecture.md', 'references/techniques.md']) {
  if (!fs.existsSync(path.join(root, file))) throw new Error(`missing ${file}`);
}
const upstream = fs.readFileSync(path.join(root, 'UPSTREAM.md'), 'utf8');
if (!upstream.includes('0f1bd1103835890354496d009af62885fe0a05d5')) throw new Error('Bang Motion SHA is not pinned');
```

- [ ] **Step 2: Run and confirm red**

```bash
bun scripts/check-bang-motion-vendor.mjs
```

- [ ] **Step 3: Vendor the pinned snapshot**

```bash
rm -rf /tmp/auno-bang-motion
git clone https://github.com/bangtutorial/bang-motion.git /tmp/auno-bang-motion
cd /tmp/auno-bang-motion
git checkout 0f1bd1103835890354496d009af62885fe0a05d5
cd -
mkdir -p third_party/bang-motion
rsync -a --exclude .git /tmp/auno-bang-motion/ third_party/bang-motion/
```

- [ ] **Step 4: Add `UPSTREAM.md`**

```markdown
# Bang Motion Upstream

Repository: https://github.com/bangtutorial/bang-motion
Pinned commit: `0f1bd1103835890354496d009af62885fe0a05d5`
License: MIT

This directory is a provenance/reference snapshot. Auno Studio runtime code must not import files from this directory directly. Reusable behavior is ported into `packages/auno-motion/` with tests and attribution.
```

Copy the exact upstream LICENSE to `licenses/bang-motion/LICENSE` and retain it in `third_party/bang-motion/LICENSE`.

- [ ] **Step 5: Update notices/inventory and verify**

```bash
bun scripts/check-bang-motion-vendor.mjs
bun scripts/check-third-party-notices.mjs
```

- [ ] **Step 6: Commit**

```bash
git add third_party/bang-motion licenses/bang-motion NOTICE.md docs/compliance/third-party-inventory.md scripts/check-bang-motion-vendor.mjs
git commit -m "chore: vendor pinned Bang Motion reference source"
```

---

## Task 2: Define the pure Motion Style and Scene Graph contract

**Files:**
- Create: `packages/auno-motion/package.json`
- Create: `packages/auno-motion/tsconfig.json`
- Create: `packages/auno-motion/src/schema.ts`
- Create: `packages/auno-motion/src/schema.test.ts`
- Modify: `apps/web/package.json`

**Interfaces:**
- Consumes: Zod; Auto Video scene IDs/source IDs.
- Produces:
  - `MOTION_SCHEMA_VERSION = 1`
  - `MotionStyleId`
  - `StyleBrief`
  - `MotionSceneGraph`
  - `MotionScene`
  - `CameraPlan`
  - `MotionTransition`
  - `motionSceneGraphSchema`.

- [ ] **Step 1: Write schema tests first**

```ts
it('accepts an editable deterministic motion graph', () => {
  expect(motionSceneGraphSchema.parse({
    schemaVersion: 1,
    style: 'editorial-fashion',
    seed: 42,
    brief: {
      palette: ['#F2E7D5', '#111827'],
      typography: 'editorial-serif-clean-sans',
      cameraLanguage: 'slow-push-lateral-glide',
      motionSignature: 'fabric-flow',
      backgroundLanguage: 'layered-soft-gradient',
      transitionLanguage: ['depth-push', 'match-movement']
    },
    scenes: []
  }).seed).toBe(42);
});
```

Also reject:

```text
NaN/negative seed
unknown style id
more than two text hierarchy levels in one planned scene
transition duration <= 0
camera scale <= 0
```

- [ ] **Step 2: Confirm red**

```bash
bun test packages/auno-motion/src/schema.test.ts
```

- [ ] **Step 3: Implement exact contract**

Core structures:

```ts
export type MotionStyleId =
  | 'editorial-fashion'
  | 'luxury-product'
  | 'visual-journalism'
  | 'white-catalog'
  | 'continuous-action'
  | 'cartoon-collage'
  | 'vintage-sketch'
  | 'breaking-news'
  | 'minimal-data';

export type MotionScene = {
  id: string;
  sourceSceneId: string;
  startSeconds: number;
  durationSeconds: number;
  camera: CameraPlan;
  background: BackgroundPlan;
  subjects: MotionSubject[];
  texts: MotionText[];
  graphics: MotionGraphic[];
  annotations: MotionAnnotation[];
  movements: MovementPlan[];
  transitionOut?: MotionTransition;
};
```

Every animated node carries stable `id`; no runtime-generated random IDs during render.

- [ ] **Step 4: Install/verify**

```bash
bun install
bun test packages/auno-motion/src/schema.test.ts
```

- [ ] **Step 5: Commit**

```bash
git add packages/auno-motion apps/web/package.json bun.lock
git commit -m "feat: define Auno Motion scene graph contract"
```

---

## Task 3: Port deterministic time/seed primitives from Bang Motion principles

**Files:**
- Create: `packages/auno-motion/src/determinism.ts`
- Create: `packages/auno-motion/src/determinism.test.ts`
- Create: `packages/auno-motion/src/easing.ts`
- Create: `packages/auno-motion/src/easing.test.ts`

**Interfaces:**
- Consumes: numeric seed and absolute project time.
- Produces:
  - `seededUnit(seed, channel): number`
  - `oscillateAtTime(seed, channel, seconds, frequency): number`
  - `absoluteProgress(seconds, start, duration): number`
  - stable easing functions used by compilers/tests.

- [ ] **Step 1: Write determinism tests**

```ts
it('returns the same value for the same seed/channel/time', () => {
  expect(oscillateAtTime(42, 'dust-1', 1.5, 2)).toBe(oscillateAtTime(42, 'dust-1', 1.5, 2));
});

it('does not depend on call order', () => {
  const a = oscillateAtTime(42, 'particle', 2, 4);
  oscillateAtTime(999, 'other', 100, 9);
  expect(oscillateAtTime(42, 'particle', 2, 4)).toBe(a);
});
```

- [ ] **Step 2: Confirm red**

```bash
bun test packages/auno-motion/src/determinism.test.ts
```

- [ ] **Step 3: Port the principle, not the original browser clock**

Implementation must be a pure function of explicit parameters. It may hash seed+channel and combine with sine/noise-like math, but must never read:

```text
Date.now()
performance.now()
Math.random()
setInterval state
accumulated position += velocity * dt
```

- [ ] **Step 4: Add a static guard test**

Test scans `packages/auno-motion/src` and fails if production files contain forbidden nondeterministic calls outside a specifically allow-listed build/test utility.

- [ ] **Step 5: Verify and commit**

```bash
bun test packages/auno-motion/src/determinism.test.ts packages/auno-motion/src/easing.test.ts
git add packages/auno-motion/src/determinism* packages/auno-motion/src/easing*
git commit -m "feat: add deterministic motion primitives"
```

---

## Task 4: Implement the nine Motion Style catalog entries

**Files:**
- Create: `packages/auno-motion/src/styles.ts`
- Create: `packages/auno-motion/src/styles.test.ts`
- Create: `packages/auno-motion/src/catalog/*.ts` only when a style definition exceeds one focused file

**Interfaces:**
- Consumes: `MotionStyleId`, `StyleBrief`.
- Produces:
  - `MOTION_STYLES`
  - `getMotionStyle(id)`
  - `defaultStyleBrief(id, context)`.

- [ ] **Step 1: Write catalog completeness test**

```ts
expect(Object.keys(MOTION_STYLES).sort()).toEqual([
  'breaking-news',
  'cartoon-collage',
  'continuous-action',
  'editorial-fashion',
  'luxury-product',
  'minimal-data',
  'visual-journalism',
  'vintage-sketch',
  'white-catalog'
]);
```

- [ ] **Step 2: Confirm red**

```bash
bun test packages/auno-motion/src/styles.test.ts
```

- [ ] **Step 3: Encode each style as constraints/menu choices, not a fixed slide template**

Each style defines:

```text
allowed camera moves
preferred background families
transition families
text entrance families
highlight families
motion intensity range
default scene density
```

Required V1 examples:

```text
Visual Journalism → real-media first, source labels, annotation/highlight emphasis
White Catalog → bright grid/catalog surfaces, cutout/product framing
Continuous Action → persistent hero subject, camera travel between facts
Editorial Fashion → premium color, fabric/soft-depth movement, sparse editorial text
Breaking News → high information contrast, data/news instruments, no playful bounce
Minimal Data → numeric emphasis, restrained camera, charts/big-number scenes
```

Do not copy Bang Motion's demo colors as Auno defaults; style brief derives palette from user/brand/context.

- [ ] **Step 4: Verify and commit**

```bash
bun test packages/auno-motion/src/styles.test.ts
git add packages/auno-motion/src/styles* packages/auno-motion/src/catalog
git commit -m "feat: add Auno Motion Style catalog"
```

---

## Task 5: Build style-brief generation and project-level coherence rules

**Files:**
- Create: `packages/auno-motion/src/style-brief.ts`
- Create: `packages/auno-motion/src/style-brief.test.ts`
- Create: `apps/server/internal/services/autovideo/motion_plan.go`
- Create: `apps/server/internal/services/autovideo/motion_plan_test.go`

**Interfaces:**
- Consumes: Auto Video storyboard/project context; Motion Style catalog; `ai.Generator` for optional structured style-brief generation.
- Produces:
  - `createStyleBrief(input): StyleBrief`
  - Auto Video sidecar `motion_style`, `motion_brief_json`, `motion_seed`.

- [ ] **Step 1: Write style-brief tests**

Assertions:

```text
one project produces one brief reused by all scenes
brand palette input wins over demo/default colors
brief always includes >=2 transition families for projects with >=4 scenes
same inputs + explicit seed produce stable fallback brief
```

- [ ] **Step 2: Confirm red**

```bash
bun test packages/auno-motion/src/style-brief.test.ts
cd apps/server && go test ./internal/services/autovideo -run MotionPlan -v
```

- [ ] **Step 3: Implement deterministic fallback first**

If AI style planning is unavailable, `defaultStyleBrief` from the selected Motion Style creates a complete valid brief. Motion generation never fails merely because the style-brief LLM call failed.

- [ ] **Step 4: Add strict optional AI style brief**

Extend Auto Video planner with a strict JSON schema matching `StyleBrief`; user/brand palette and selected style are explicit inputs. Validate and fall back deterministically on invalid output.

- [ ] **Step 5: Persist style metadata in sidecar, not native timeline duplicate**

Native project receives concrete keyframes/backgrounds/controls. Sidecar retains style name/brief/seed for regeneration.

- [ ] **Step 6: Verify and commit**

```bash
bun test packages/auno-motion/src/style-brief.test.ts
cd apps/server && go test ./internal/services/autovideo -run MotionPlan -v && cd ../..
git add packages/auno-motion/src/style-brief* apps/server/internal/services/autovideo/motion_plan*
git commit -m "feat: add coherent Auto Video style briefs"
```

---

## Task 6: Implement anti-slide structural validation

**Files:**
- Create: `packages/auno-motion/src/validate.ts`
- Create: `packages/auno-motion/src/validate.test.ts`

**Interfaces:**
- Consumes: `MotionSceneGraph`.
- Produces: `validateMotionGraph(graph): MotionValidationIssue[]` with stable issue codes.

- [ ] **Step 1: Write validator tests for concrete rules**

Issue codes:

```text
motion.no_visual_throughline
motion.too_many_text_levels
motion.camera_repetition
motion.transition_variety
motion.no_motion_window
motion.text_too_small
motion.invalid_scene_timing
```

Exact V1 rules:

- projects with >=3 scenes require at least one repeated/persistent subject or visual token across adjacent scenes;
- max two text hierarchy levels per scene;
- no three consecutive scenes use the same `camera.viewpoint` value;
- projects with >=4 scene transitions require at least two transition families;
- no full second of a scene may contain neither camera movement nor authored element movement unless the scene explicitly sets `intentionalHold=true`;
- planned text minimum equivalent is 30 px on a 1080-wide stage;
- scenes may not overlap or run backward in project time.

- [ ] **Step 2: Confirm red**

```bash
bun test packages/auno-motion/src/validate.test.ts
```

- [ ] **Step 3: Implement pure validator**

Validator never mutates graph and never auto-fixes. Planner may use issue codes to regenerate/repair separately.

- [ ] **Step 4: Add validator to generation gate**

Auto Video Motion planning accepts a graph only when there are no `error` severity issues. Warnings such as intentional sparse motion remain visible in generation diagnostics but do not block project creation.

- [ ] **Step 5: Verify and commit**

```bash
bun test packages/auno-motion/src/validate.test.ts
git add packages/auno-motion/src/validate*
git commit -m "feat: enforce anti-slide motion structure"
```

---

## Task 7: Compile simple motion to native OpenPost keyframes/modifiers

**Files:**
- Create: `apps/web/src/lib/auno-motion/native-compiler.ts`
- Create: `apps/web/src/lib/auno-motion/native-compiler.test.ts`
- Modify: Phase 2 frontend compiler contract helpers only if shared utility extraction is needed

**Interfaces:**
- Consumes: `MotionScene`, OpenPost `TimelineItem`/keyframe types.
- Produces: `compileNativeMotion(scene, context): NativeMotionResult` containing native item/keyframe patches.

- [ ] **Step 1: Write exact mapping tests**

Cases:

```text
camera push → transform/vector keyframes on grouped composition or relevant items
text entrance → textMotion/keyframes, not rasterized text
image parallax → transform keyframes
opacity/scale/highlight → native scalar/vector keyframes and shape/text items
transition → native transition where OpenPost supports family; otherwise paired keyframes
```

- [ ] **Step 2: Confirm red**

```bash
bun --cwd apps/web x vitest run src/lib/auno-motion/native-compiler.test.ts
```

- [ ] **Step 3: Implement mapping using OpenPost types**

Import types from `apps/web/src/lib/video-editor/project/types.ts`; do not redefine copies in the web package.

Every keyframe time is derived from absolute scene time/frame and explicit duration; do not use browser clock time.

- [ ] **Step 4: Keep compiler output deterministic**

Sort authored items by stable ID before writing generated mutations so identical input produces identical JSON ordering/fingerprints.

- [ ] **Step 5: Verify and commit**

```bash
bun --cwd apps/web x vitest run src/lib/auno-motion/native-compiler.test.ts
bun --cwd apps/web run check
git add apps/web/src/lib/auno-motion/native-compiler*
git commit -m "feat: compile Auno motion to native editor keyframes"
```

---

## Task 8: Represent complex scenes as editable OpenPost Motion Compositions

**Files:**
- Create: `apps/web/src/lib/auno-motion/composition-compiler.ts`
- Create: `apps/web/src/lib/auno-motion/composition-compiler.test.ts`
- Create: `apps/web/src/lib/auno-motion/composition-controls.ts`
- Create: `apps/web/src/lib/auno-motion/composition-controls.test.ts`
- Reuse: `apps/web/src/lib/video-editor/sequences/composition-controls.ts`
- Reuse: `apps/web/src/lib/video-editor/project/types.ts`

**Interfaces:**
- Consumes: `MotionScene`, OpenPost `SubComposition`, `CompositionControlSchema`, composition timeline item.
- Produces:
  - `compileMotionComposition(scene, context): { composition, timelineItem }`
  - controls: `intensity`, `depth`, `speed`, `primaryColor`, `secondaryColor`, `backgroundVariant` plus style-specific text/media source controls where supported.

- [ ] **Step 1: Write composition-shape tests first**

```ts
expect(result.timelineItem.type).toBe('composition');
expect(result.timelineItem.compositionId).toBe(result.composition.id);
expect(result.composition.editorKind).toBe('composite-2d');
expect(result.composition.compositionControls?.controls.map((c) => c.id))
  .toContain('intensity');
```

Also assert composition's nested text/image/shape/background items remain ordinary OpenPost items.

- [ ] **Step 2: Confirm red**

```bash
bun --cwd apps/web x vitest run src/lib/auno-motion/composition-compiler.test.ts
```

- [ ] **Step 3: Implement with existing composition infrastructure**

Do not add a new `TimelineItem['type']`. Use:

```text
timeline item type = composition
composition.editorKind = composite-2d
composition.compositionControls = Auno control schema
item.compositionControlOverrides = per-instance overrides
```

This is the Phase 4 V1 Motion Composition runtime.

- [ ] **Step 4: Expose bounded controls**

Example domains:

```text
intensity 0..1
depth 0..1
speed 0.25..2
colors as validated hex
backgroundVariant from a style-owned option list
```

Apply overrides through OpenPost's existing `applyCompositionControlOverrides` path. Do not invent an Auno-only override mechanism.

- [ ] **Step 5: Verify existing composition-control tests remain green**

```bash
bun --cwd apps/web x vitest run src/lib/auno-motion/composition-controls.test.ts src/lib/video-editor/sequences/composition-controls.test.ts
bun --cwd apps/web run check
```

- [ ] **Step 6: Commit**

```bash
git add apps/web/src/lib/auno-motion/composition-compiler* apps/web/src/lib/auno-motion/composition-controls*
git commit -m "feat: compile complex motion as editable compositions"
```

---

## Task 9: Add a headless Go motion compiler compatible with the web compiler

**Files:**
- Create: `apps/server/internal/aunomotion/types.go`
- Create: `apps/server/internal/aunomotion/compiler.go`
- Create: `apps/server/internal/aunomotion/compiler_test.go`
- Create: `apps/server/internal/aunomotion/testdata/motion_composition.json`
- Create: `apps/web/src/lib/auno-motion/cross-runtime-contract.test.ts`
- Modify: `apps/server/internal/services/autovideo/compiler.go`

**Interfaces:**
- Consumes: JSON Motion Scene Graph and native OpenPost project JSON format.
- Produces: same logical item/composition shape as web compiler for server/headless generation.

- [ ] **Step 1: Write the Go fixture test**

A known `MotionScene` compiles to checked-in fixture with:

```text
native timeline composition item
matching SubComposition
stable IDs
composition controls
nested native items
absolute frame timings
```

- [ ] **Step 2: Write web cross-runtime test**

Load the same logical fixture into TypeScript and assert both runtimes agree on:

```text
scene/composition IDs
track IDs
timeline item types
start/duration frames
control IDs/default values
nested item count/types
```

Do not require byte-for-byte JSON if Go/TypeScript serialization orders object keys differently.

- [ ] **Step 3: Implement minimal Go mirror**

Mirror only fields required to author project JSON. Do not duplicate the entire OpenPost TypeScript model in Go.

- [ ] **Step 4: Plug it into Auto Video compile step**

If `motionStyle != standard`, Auto Video uses the motion compiler. Standard/plain projects continue through the Phase 2 compiler. Both end as the same OpenPost project schema.

- [ ] **Step 5: Verify and commit**

```bash
cd apps/server && go test ./internal/aunomotion ./internal/services/autovideo -run 'Motion|Compile' -v && cd ../..
bun --cwd apps/web x vitest run src/lib/auno-motion/cross-runtime-contract.test.ts
git add apps/server/internal/aunomotion apps/server/internal/services/autovideo/compiler.go apps/web/src/lib/auno-motion/cross-runtime-contract.test.ts
git commit -m "feat: add headless Auno Motion compiler"
```

---

## Task 10: Add Motion Style selection and style brief to Auto Video UI

**Files:**
- Create: `apps/web/src/lib/components/auno-motion/motion-style-card.svelte`
- Create: `apps/web/src/lib/components/auno-motion/motion-style-picker.svelte`
- Create: `apps/web/src/lib/components/auno-motion/style-brief-editor.svelte`
- Modify: `apps/web/src/lib/components/auno-auto-video/setup-step.svelte`
- Modify: `apps/web/src/lib/auno-auto-video/wizard-state.svelte.ts`
- Modify: related tests

**Interfaces:**
- Consumes: `MOTION_STYLES`, style-brief API/sidecar fields.
- Produces: real Motion Style selector replacing Phase 2's disabled `standard` control.

- [ ] **Step 1: Change wizard tests first**

Default style becomes `editorial-fashion` only when Auto Video context is explicitly Aunomay/fashion; generic projects default to `minimal-data` for data/list formats or a format-aware recommendation. User choice always wins.

Add a deterministic recommendation function and test it:

```ts
expect(recommendMotionStyle({ format: 'news' })).toBe('visual-journalism');
expect(recommendMotionStyle({ format: 'compare' })).toBe('white-catalog');
```

- [ ] **Step 2: Implement cards with lightweight previews**

Animated preview runs only on hover/focus/tap and uses CSS/native keyframes generated from the style catalog; it must not initialize ACE-Step/large AI models.

- [ ] **Step 3: Add Advanced → Customize Style**

Editor fields:

```text
palette
camera language
motion intensity
background family
transition families
```

Validation runs through `StyleBrief` schema before save.

- [ ] **Step 4: Verify and commit**

```bash
bun --cwd apps/web x vitest run src/lib/auno-auto-video src/lib/auno-motion
bun --cwd apps/web run check
git add apps/web/src/lib/components/auno-motion apps/web/src/lib/components/auno-auto-video/setup-step.svelte apps/web/src/lib/auno-auto-video
git commit -m "feat: add Motion Style selection to Auto Video"
```

---

## Task 11: Add Motion controls to the existing Auno Video Editor panel

**Files:**
- Create: `apps/web/src/lib/video-editor/auno/motion-controls.svelte`
- Create: `apps/web/src/lib/video-editor/auno/motion-controls-data.ts`
- Create: `apps/web/src/lib/video-editor/auno/motion-controls-data.test.ts`
- Modify: `apps/web/src/lib/video-editor/auno/auto-video-panel.svelte`

**Interfaces:**
- Consumes: selected composition item, `CompositionControlSchema`, current override values, Auno sidecar style metadata.
- Produces: user controls for Motion Composition without exposing code.

- [ ] **Step 1: Write control-model tests**

```ts
expect(toMotionControlModel(composition, item)).toMatchObject({
  style: 'editorial-fashion',
  controls: expect.arrayContaining([
    expect.objectContaining({ id: 'intensity' }),
    expect.objectContaining({ id: 'speed' })
  ])
});
```

- [ ] **Step 2: Confirm red**

```bash
bun --cwd apps/web x vitest run src/lib/video-editor/auno/motion-controls-data.test.ts
```

- [ ] **Step 3: Implement UI through OpenPost composition override actions**

Visible controls:

```text
Motion Style
Camera / movement summary
Intensity
Depth
Speed
Background variant
Colors
Regenerate motion
```

The user does not see GSAP/Three.js/source-code fields.

- [ ] **Step 4: `Regenerate motion` invalidates motion only**

Backend regeneration keeps narration, voice, captions, music, and manually edited non-motion items unchanged unless the user selects full-scene replacement.

- [ ] **Step 5: Verify and commit**

```bash
bun --cwd apps/web x vitest run src/lib/video-editor/auno
bun --cwd apps/web run check
git add apps/web/src/lib/video-editor/auno
git commit -m "feat: expose editable Motion Composition controls"
```

---

## Task 12: Add Aunomay Editorial Fashion motion behavior

**Files:**
- Create: `packages/auno-motion/src/catalog/editorial-fashion.ts`
- Create: `packages/auno-motion/src/catalog/editorial-fashion.test.ts`
- Create: `apps/server/internal/aunomotion/editorial_fashion_test.go`

**Interfaces:**
- Consumes: generic `editorial-fashion` style; project brand palette/media/product subject descriptors.
- Produces: fashion-specific scene planning constraints usable by Aunomay content without hard-coding Aunomay product URLs into the engine.

- [ ] **Step 1: Write structural tests**

Expected rules:

```text
persistent product/model subject where source media supports it
sparse text (max 2 hierarchy levels)
soft depth push / lateral glide preferred
fabric-flow or layered soft-gradient background families
no hard-news ticker transition family
CTA scene keeps product visually present
9:16 safe zones preserve full-body/product framing when available
```

- [ ] **Step 2: Confirm red**

```bash
bun test packages/auno-motion/src/catalog/editorial-fashion.test.ts
```

- [ ] **Step 3: Implement as style constraints, not a single template**

Use a menu of camera/transition/background choices with seeded deterministic selection. Two projects with different seeds may vary while remaining inside Editorial Fashion's constraints.

- [ ] **Step 4: Add server contract test**

Headless compile of an Editorial Fashion graph must yield native/editable composition/items and no rasterized scene asset.

- [ ] **Step 5: Verify and commit**

```bash
bun test packages/auno-motion/src/catalog/editorial-fashion.test.ts
cd apps/server && go test ./internal/aunomotion -run EditorialFashion -v && cd ../..
git add packages/auno-motion/src/catalog/editorial-fashion* apps/server/internal/aunomotion/editorial_fashion_test.go
git commit -m "feat: add Editorial Fashion motion style"
```

---

## Task 13: Add deterministic preview/export frame probes

**Files:**
- Create: `apps/web/src/lib/auno-motion/frame-probe.ts`
- Create: `apps/web/src/lib/auno-motion/frame-probe.test.ts`
- Create: `tests/auno/motion-determinism.spec.ts`

**Interfaces:**
- Consumes: editor/project seek API and export renderer seek path.
- Produces: deterministic fixed-time frame probe API and screenshot regression test.

- [ ] **Step 1: Write pure frame-time tests**

Probe percentages:

```text
0%
25%
50%
75%
100% minus one frame
```

For 30 fps / 10 seconds:

```ts
expect(frameProbeFrames(300)).toEqual([0, 75, 150, 225, 299]);
```

- [ ] **Step 2: Confirm red**

```bash
bun --cwd apps/web x vitest run src/lib/auno-motion/frame-probe.test.ts
```

- [ ] **Step 3: Add browser determinism E2E**

Load a fixed generated project, seek to each frame, screenshot preview, reload page/project, seek again, and compare image snapshots under Playwright threshold suitable for deterministic Chromium rendering.

- [ ] **Step 4: Compare preview and export render path**

Use the existing OpenPost renderer's frame seek API/test helper. For each probe frame, compare the preview canvas/frame result to the renderer frame result. If exact pixel equality is impossible because codecs differ, compare the pre-encode canvas/image bitmap with a strict image-diff threshold before video encoding.

- [ ] **Step 5: Verify and commit**

```bash
bun --cwd apps/web x vitest run src/lib/auno-motion/frame-probe.test.ts
bunx playwright test tests/auno/motion-determinism.spec.ts
git add apps/web/src/lib/auno-motion/frame-probe* tests/auno/motion-determinism.spec.ts
git commit -m "test: prove deterministic motion frames"
```

---

## Task 14: Add automated visual QA for obvious motion failures

**Files:**
- Create: `apps/web/src/lib/auno-motion/visual-qa.ts`
- Create: `apps/web/src/lib/auno-motion/visual-qa.test.ts`
- Create: `tests/auno/motion-visual-qa.spec.ts`
- Modify: Auto Video generation diagnostics UI to show structural warnings

**Interfaces:**
- Consumes: planned graph, DOM/canvas layout measurements at fixed frames, screenshot probes.
- Produces: deterministic issue codes plus visual snapshot artifacts.

- [ ] **Step 1: Write unit tests for measurable failures**

Issue codes:

```text
visual.blank_scene
visual.text_clipped
visual.text_overlap
visual.missing_subject
visual.low_contrast
visual.invalid_transform
visual.composition_error
```

Measurable rules:

- scene root has no visible authored item → blank;
- text bounding box exits stage safe bounds → clipped;
- two primary text boxes overlap beyond configured threshold → overlap;
- required subject ID absent → missing subject;
- transform contains NaN/Infinity/non-positive dimensions → invalid transform.

Do not pretend unit code can objectively judge aesthetics.

- [ ] **Step 2: Confirm red**

```bash
bun --cwd apps/web x vitest run src/lib/auno-motion/visual-qa.test.ts
```

- [ ] **Step 3: Implement runtime probe hooks only in test/debug mode**

Expose safe structured measurements to Playwright; no persistent dev toolbar in production output.

- [ ] **Step 4: Add screenshot-based test for every Motion Style**

Generate one fixed 9:16 project per style with seeded inputs and capture 25/50/75% frames. Store approved snapshots in the standard Playwright snapshot location.

- [ ] **Step 5: Verify and commit**

```bash
bun --cwd apps/web x vitest run src/lib/auno-motion/visual-qa.test.ts
bunx playwright test tests/auno/motion-visual-qa.spec.ts
git add apps/web/src/lib/auno-motion/visual-qa* tests/auno/motion-visual-qa.spec.ts
git commit -m "test: add Auno Motion visual QA"
```

---

## Task 15: Add motion-aware regeneration ownership and dependency isolation

**Files:**
- Modify: `apps/server/internal/services/autovideo/ownership.go`
- Modify: `apps/server/internal/services/autovideo/regenerate.go`
- Create: `apps/server/internal/services/autovideo/motion_regenerate_test.go`

**Interfaces:**
- Consumes: Phase 2 ownership graph; motion composition IDs/control fingerprints; Phase 3 audio/caption assets.
- Produces: `RegenerateMotion` operation that changes motion structures only.

- [ ] **Step 1: Write dependency-isolation test first**

Create a scene with:

```text
visual items
motion composition
voice media ID
caption item
music media ID
```

Regenerate motion and assert:

```text
motion composition revision changes
voice media ID unchanged
caption cues unchanged
music media ID unchanged
manual text edit unchanged
other scene IDs/content unchanged
```

- [ ] **Step 2: Confirm red**

```bash
cd apps/server
go test ./internal/services/autovideo -run MotionRegenerate -v
```

- [ ] **Step 3: Implement motion ownership group**

Extend generation graph ownership entry with capability category:

```go
type OwnedItem struct {
    ItemID string `json:"item_id"`
    SceneID string `json:"scene_id"`
    Category string `json:"category"` // visual | motion | voice | caption | music
    GeneratedHash string `json:"generated_hash"`
}
```

This is a sidecar schema evolution; add migration logic in service decoding so old Phase 2 entries with empty category are treated as `visual`, not broken.

- [ ] **Step 4: Mutate only category `motion` entries**

Use `videoprojects.ApplyMutationInput` and normal revision conflict behavior.

- [ ] **Step 5: Verify and commit**

```bash
cd apps/server
go test ./internal/services/autovideo -run 'MotionRegenerate|RegenerateScene' -v
git add apps/server/internal/services/autovideo/ownership.go apps/server/internal/services/autovideo/regenerate.go apps/server/internal/services/autovideo/motion_regenerate_test.go
git commit -m "feat: isolate motion regeneration from media dependencies"
```

---

## Task 16: Full Motion Style end-to-end gate

**Files:**
- Create: `tests/auno/auto-video-motion.spec.ts`
- Modify: `.github/workflows/ci.yml`

**Interfaces:**
- Consumes: all Phase 4 components.
- Produces: browser/release proof that Bang Motion-derived behavior lands as native editable OpenPost project structures.

- [ ] **Step 1: Write Editorial Fashion E2E**

Flow:

```text
Create Auto Video
→ select Editorial Fashion
→ generate fixed storyboard/media
→ native Video Editor opens
→ project contains composition item
→ composition has composite-2d editorKind and editable controls
→ change intensity
→ project mutation/revision occurs
→ reload
→ value persists
→ export preview path renders without error
```

- [ ] **Step 2: Write one smoke generation per other Motion Style**

Assert native items/compositions exist and no generated scene is represented only by a pre-rendered MP4 media item.

- [ ] **Step 3: Run regression suite**

```bash
bun test packages/auno-motion/src
cd apps/server && go test ./internal/aunomotion ./internal/services/autovideo -run 'Motion|AutoVideo' -v && cd ../..
bun --cwd apps/web x vitest run src/lib/auno-motion src/lib/video-editor/auno
bun --cwd apps/web run check
bunx playwright test tests/auno/motion-determinism.spec.ts tests/auno/motion-visual-qa.spec.ts tests/auno/auto-video-motion.spec.ts
```

- [ ] **Step 4: Add CI affected-surface coverage**

Any change to:

```text
packages/auno-motion/**
apps/server/internal/aunomotion/**
apps/web/src/lib/auno-motion/**
third_party/bang-motion/**
```

must trigger motion package tests, frontend tests/checks, and relevant Playwright motion tests.

- [ ] **Step 5: Commit**

```bash
git add tests/auno/auto-video-motion.spec.ts .github/workflows/ci.yml
git commit -m "test: gate Auno Motion Engine end to end"
```

---

## Task 17: Phase 4/final V1 verification and release-candidate gate

**Files:**
- Create: `docs/releases/2.0.0-rc.1-phase4-verification.md`
- Modify: `docs/compliance/third-party-inventory.md`

**Interfaces:**
- Consumes: all four phases and all release gates.
- Produces: evidence for `2.0.0-rc.1`; no stable tag yet.

- [ ] **Step 1: Run the complete repository test matrix**

```bash
bun install --frozen-lockfile
bun run format:check
bun run check
bun run test
cd apps/server && go test ./... && cd ../..
bunx playwright test tests/auno
```

- [ ] **Step 2: Run deployment/database/storage gates**

```bash
sh scripts/check-aapanel-compose.sh
sh scripts/check-ai-degraded-readiness.sh
bun scripts/check-storage-config.mjs
cd apps/server
go test ./internal/database/migrations -run TestMigrationChainAppliesCleanlyAndIsIdempotent -v
go test ./internal/database/migrations -run TestMigrationChainAppliesCleanlyOnPostgres -v
cd ../..
```

- [ ] **Step 3: Run licensing/vendor/security gates**

```bash
bun scripts/check-third-party-notices.mjs
bun scripts/check-bang-motion-vendor.mjs
bun scripts/check-auno-brand-surface.mjs
```

Run the repository's secret scanner/security policy job locally where supported or through CI before approving release candidate.

- [ ] **Step 4: Build and boot the real candidate image**

Build `ghcr.io/dhtoan/aunostudio:2.0.0-rc.1` through the release workflow or equivalent local canonical build, then verify:

```text
/health success
/ready success
login/workspace
Photo Editor
Video Editor
Auto Video with voice/captions/music
Motion Style project
export → Media → Composer
container restart → project/job recovery
```

- [ ] **Step 5: Verify Bang Motion attribution and source availability**

Ensure pinned snapshot/commit, MIT license, NOTICE entry, and OpenPost AGPL corresponding-source release process are included in candidate artifacts/documentation.

- [ ] **Step 6: Record evidence and commit**

```bash
git add docs/releases/2.0.0-rc.1-phase4-verification.md docs/compliance/third-party-inventory.md
git commit -m "docs: record Auno Studio 2.0 release candidate verification"
```

Invoke `superpowers:requesting-code-review`. Do not tag `2.0.0` until all blocking review findings and the master acceptance matrix are green.

## Phase 4 Exit Criteria

- Bang Motion source is pinned, vendored for provenance, MIT-attributed, and does not become a runtime HTML generator.
- Auno Motion has one versioned pure scene-graph/style contract.
- Motion randomness/time is deterministic and forbidden runtime clock/random calls are test-guarded.
- All nine Motion Styles exist and use coherent project-level style briefs.
- Anti-slide validator enforces concrete structural rules.
- Simple motion compiles to native OpenPost keyframes/modifiers/items.
- Complex motion compiles to OpenPost native `composition` items with editable `SubComposition` controls.
- No new timeline item kind is introduced merely to support Auno Motion.
- Headless Go compiler and browser compiler agree on the authored native shape.
- Auto Video UI exposes Motion Styles and advanced style-brief customization.
- Video Editor exposes editable Motion Composition controls.
- Editorial Fashion provides Aunomay-oriented motion language without hard-coded product URLs/data.
- Preview and export frame probes are deterministic.
- Visual QA catches measurable blank/clipped/invalid failures and maintains screenshot coverage across all styles.
- Motion regeneration does not regenerate voice/captions/music or overwrite manual edits.
- All Phase 1–4 release gates are green before `2.0.0-rc.1` is considered ready for final stable acceptance.
