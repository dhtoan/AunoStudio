# Auno Studio Vox Long-form Documentary — Architecture Design

**Status:** Approved direction; written spec awaiting final review  
**Date:** 2026-09-15  
**Repository:** `dhtoan/AunoStudio`  
**Target release line:** Auno Studio Web 2.x  
**Source reference:** Google Doc `VOX STYLE - AICONG` supplied by the product owner  

## 1. Purpose

Auno Studio will add a long-form documentary creation workflow that can take a topic or source material and produce an editable documentary project from idea selection through script, narration, beat planning, visual generation, animation planning, thumbnail planning, and native Video Editor handoff.

The product-facing style name may be **Vox Style** because that is the requested preset name. The internal runtime ID is deliberately generic:

```text
documentary-paper-collage
```

Auno Studio must not depend on VOX logos, copyrighted media assets, copied article layouts, or brand-specific trade dress. The implementation derives reusable editorial principles from the supplied reference: evidence-led documentary pacing, paper collage, archival surfaces, halftone cutouts, constrained accent colors, locked or near-locked camera, stop-motion assembly, sparse labels, and beat-level visual storytelling.

The central product rule remains unchanged:

> AI generation produces an editable native project, not a dead MP4.

Generated documentary beats must remain editable as ordinary OpenPost timeline items and Auno Motion Compositions wherever possible.

## 2. Scope

### 2.1 Included in the first complete Vox workflow

The workflow includes:

1. optional source material;
2. niche/topic selection;
3. generation of exactly ten candidate video ideas;
4. idea selection;
5. duration selection;
6. continuous documentary narration script;
7. voice generation or provider handoff;
8. beat breakdown with timecodes;
9. image prompt generation for every beat;
10. optional image generation when a configured provider supports it;
11. a universal motion/animation treatment for generated beat visuals;
12. optional animation/video generation when a configured provider supports it;
13. thumbnail prompt generation;
14. native OpenPost project compilation;
15. editable Auno Motion controls and regeneration;
16. deterministic preview/export and visual-QA coverage.

### 2.2 V1 duration scope

The Vox workflow supports these user-facing duration presets:

```text
30 seconds
1 minute
2 minutes
3 minutes
5 minutes
```

The first implementation raises the Auto Video server ceiling from 180 seconds to 300 seconds only for `documentary-long-form` mode. Existing short-form validation remains unchanged.

The data model must not encode an assumption that five minutes is the permanent maximum. A later design can extend the ceiling without changing project schema.

### 2.3 Default format

V1 Vox projects default to:

```text
aspect ratio: 16:9
resolution profile: 1920x1080 logical canvas
fps: existing Auno/OpenPost project default unless user overrides it
mode: documentary-long-form
motion style: documentary-paper-collage
```

Vertical 9:16 documentary projects are not a V1 Vox requirement.

## 3. Relationship to existing Auto Video

Vox is not a second editor and not a separate application.

The existing creation hub continues to expose **AI Auto Video**. Inside Auto Video, the user chooses a mode:

```text
Short-form
Documentary Long-form
```

Short-form continues to use the existing Review, News, Guide, Compare, and Top N flow.

Documentary Long-form uses the new stateful documentary workflow and creates the same native OpenPost Video Project schema at handoff.

Conceptually:

```text
AI Auto Video
├── Short-form
│   ├── Review
│   ├── News
│   ├── Guide
│   ├── Compare
│   └── Top N
└── Documentary Long-form
    └── Vox Style / documentary-paper-collage
```

The two modes share:

- source ingestion;
- AI provider routing;
- media library;
- TTS infrastructure;
- project persistence;
- Auno Motion Engine;
- ownership metadata;
- native Video Editor handoff;
- export pipeline.

They do not share one oversized planner function. Long-form planning lives behind a dedicated documentary service boundary.

## 4. User workflow

The supplied reference is written as a conversational state machine. Auno Studio converts that idea into a persistent wizard so the user can leave, reload, edit an earlier step, or regenerate one step without losing the entire project.

### State 0 — Source Material

Accepted input:

- none / skip;
- text;
- URL;
- Markdown;
- TXT;
- PDF;
- images;
- video clips;
- Media Library assets.

Source material is untrusted reference material. It never overrides system/planner rules.

### State 1 — Niche / Topic

Default choices:

```text
Crime & Investigation
History
Money & Power
Disaster & Survival
Mystery & Unsolved
Technology
Sports
Custom topic
```

The categories are convenience presets, not hard-coded planner limitations.

### State 2 — Ten Ideas

The planner generates exactly ten candidates.

Each candidate stores:

```ts
interface DocumentaryIdea {
  id: string;
  title: string;
  hook: string;
  subterritory: string;
  evidenceAnchors: string[];
}
```

Rules:

- candidates should cover distinct sub-territories;
- title should be concise and documentary-oriented rather than clickbait-heavy;
- each idea should contain at least one concrete evidence anchor when source material supports it, such as a date, name, number, place, document, or event;
- unsupported facts must not be invented.

The user selects one idea or replaces it with a custom topic.

### State 3 — Duration

The user selects 30s, 1m, 2m, 3m, or 5m.

The planner derives a narration word target using a configurable narration-rate profile. The default Vox profile targets approximately 150 words/minute, but actual TTS duration is authoritative once voice has been generated.

### State 4 — Documentary Script

The planner creates one continuous narration script.

Structural requirements:

- cold open starts with a concrete event, location, date, object, action, or other evidence anchor when available;
- calm documentary tone;
- short declarative sentences mixed with occasional explanatory sentences;
- temporal and causal continuity;
- each sentence or natural clause is suitable for later beat segmentation;
- uncertain source details are omitted or carefully qualified rather than invented;
- real tragedy is handled with restraint;
- no sponsor copy or forced subscribe CTA by default;
- ending closes on a concise unresolved or consequential statement when appropriate.

The implementation must not copy example sentences from the source reference into generated outputs.

### State 5 — Voice

Voice is provider-neutral.

Preferred path:

1. use the selected Auno TTS provider;
2. generate narration in bounded chunks to reduce long-generation failures;
3. stitch chunks as editable source assets while retaining per-chunk timing metadata;
4. use measured audio duration to retime beats;
5. preserve script-to-audio provenance.

The default Vox voice direction is represented as metadata rather than vendor-specific numeric settings:

```text
calm
deadpan documentary
mid-range register
restrained emotion
mild gravitas
steady cadence
```

A future ElevenLabs provider may map that profile to vendor-specific controls. The core workflow must not require ElevenLabs.

If no TTS provider is available, the project remains usable: Auno Studio exports a clean narration package and continues with estimated beat timing.

### State 6 — Beat Breakdown

The script is split into visual beats.

Target rules:

```text
beat duration: usually 2–3 seconds
one visual idea per beat
short sentence: normally one beat
long sentence: split on natural clause boundaries
```

Expected beat-count ranges are diagnostics, not hard failures:

```text
30s: about 12–15
1m: about 22–30
2m: about 45–60
3m: about 70–90
5m: about 115–150
```

Actual TTS timings override word-count estimates.

```ts
interface DocumentaryBeat {
  id: string;
  index: number;
  narration: string;
  startSeconds: number;
  durationSeconds: number;
  coreIdea: string;
  evidenceRefs: string[];
  visualIntent: DocumentaryVisualIntent;
  requiredSubjectIds?: string[];
}
```

### State 7 — Visual Prompt Pack

Every beat receives a self-contained image/visual plan.

The visual planner chooses one dominant hero concept and a small number of supporting elements. It must visualize the beat's idea rather than illustrate every noun in the narration.

Preferred visual intents include:

```text
archival-photo
halftone-subject
paper-document
map
map-route
timeline
newspaper-clipping
object-evidence
number-card
quote-strip
diagram
connection-board
location-card
motion-composition
```

Visual language:

- aged newsprint / archival paper surfaces;
- monochrome or desaturated halftone photography;
- hand-cut/torn edges;
- tape, pins, stamps, typewriter or condensed label strips;
- optional red string/arrows/underlines when narratively useful;
- restrained tan/ink/gray base;
- one hot red signal accent;
- restrained mustard secondary accent;
- visible print grain and paper fibers;
- matte flat lighting and soft layer separation;
- generous negative space;
- no unnecessary logos or watermarks.

The prompt pack can be downloaded as plain text with one independent prompt block per beat for external batch generators.

### State 8 — Animation Treatment

The default Vox motion treatment is an editable native interpretation of paper-collage assembly.

It does not require generating one opaque six- or ten-second MP4 for each beat.

Motion rules:

```text
camera: locked or near-locked
cadence: stepped / stop-motion influenced
element movement: rigid paper pieces
entrance ordering: back-to-front / narrative order
settle: small handcrafted overshoot/hold
post-assembly: subtle paper life only
```

A representative beat composition can use this temporal structure:

```text
0–70% of beat: assemble/reveal authored elements
70–100%: hold as a living paper poster
```

For short beats the compiler scales this proportionally rather than forcing a ten-second animation.

If an external video-generation provider is configured, the same visual/motion brief can be supplied to that provider. Generated video is treated as an optional asset/reference, not the only editable representation of the beat.

### State 9 — Thumbnail Pack

Generate three candidate thumbnail concepts.

Rules:

- same documentary paper-collage world;
- higher contrast than normal beat frames;
- one dominant subject/object/place;
- at most two text elements;
- very short headline text;
- one strong red or mustard attention device;
- readable at small thumbnail size;
- 16:9;
- no watermark or unrelated logo.

Thumbnail prompts and generated thumbnail assets, when available, are stored with the documentary run but are not inserted into the video timeline automatically.

## 5. Persistent documentary workflow model

The workflow must survive reload and allow selective regeneration.

```ts
type DocumentaryStep =
  | 'source'
  | 'topic'
  | 'ideas'
  | 'duration'
  | 'script'
  | 'voice'
  | 'beats'
  | 'visuals'
  | 'animation'
  | 'thumbnails'
  | 'project';

interface DocumentaryRun {
  schemaVersion: 1;
  id: string;
  workspaceId: string;
  mode: 'documentary-long-form';
  style: 'documentary-paper-collage';
  currentStep: DocumentaryStep;
  source: AutoVideoSource;
  niche?: string;
  ideas?: DocumentaryIdea[];
  selectedIdeaId?: string;
  customTopic?: string;
  targetDurationSeconds?: number;
  script?: DocumentaryScript;
  voice?: DocumentaryVoiceManifest;
  beats?: DocumentaryBeat[];
  visualPlans?: DocumentaryVisualPlan[];
  thumbnails?: DocumentaryThumbnailPlan[];
  projectId?: string;
  createdAt: number;
  updatedAt: number;
}
```

Every step has a stable fingerprint derived from its upstream dependencies.

If the user changes an earlier step, only dependent later outputs become stale.

Examples:

```text
change duration → script, voice, beats, visuals, animation become stale
change script text → voice, beats, visuals, animation become stale
regenerate one visual beat → narration/voice/other beats remain valid
change motion controls → only motion-owned structures change
change thumbnail → timeline remains untouched
```

## 6. Documentary service boundaries

Do not grow `autovideo/service.go` into one monolith.

Recommended server boundaries:

```text
apps/server/internal/services/documentary/
├── service.go
├── types.go
├── ideas.go
├── script.go
├── beats.go
├── visuals.go
├── thumbnails.go
├── state.go
└── validation.go
```

The documentary service consumes the same provider-neutral `ai.Generator` interfaces already used by Auto Video.

Auto Video owns mode selection and final handoff. Documentary owns long-form planning state.

The source resolver, multimodal media loading, workspace authorization, media storage, and native project service remain shared infrastructure.

## 7. AI and media provider contracts

The workflow must work at three capability levels.

### Level A — Text planner only

Available:

- ideas;
- script;
- beats;
- visual prompts;
- animation brief;
- thumbnails;
- editable placeholder project.

### Level B — Planner + TTS + image generation

Additionally:

- measured narration audio;
- generated visual assets imported into Media Library/project;
- beats retimed from actual speech duration.

### Level C — Full media generation

Additionally:

- optional image-to-video or animation-provider outputs;
- generated variants retained as editable media choices;
- native composition remains the authoritative editable representation when feasible.

No provider is allowed to make the core project schema vendor-specific.

## 8. Vox Motion Style

### 8.1 Catalog entry

Add a tenth Auno Motion Style:

```text
runtime id: documentary-paper-collage
UI label: Vox Style
```

Default brief:

```text
palette: archival tan, ink black, halftone gray, hot red, restrained mustard
typography: condensed editorial + typewriter label
camera language: locked-documentary-tabletop
motion signature: paper-assembly-stop-motion
background language: archival-newsprint-paper
transition language: hard-cut, restrained-crossfade
```

### 8.2 Camera

Default camera behavior is intentionally much more restrained than current short-form styles:

- zero or near-zero pan;
- zero or near-zero rotation;
- no orbit;
- no continuous zoom for every beat;
- rare micro push only when explicitly selected;
- composition movement comes primarily from paper elements, annotations, and evidence reveals.

### 8.3 Motion primitives

Add deterministic primitives suitable for the style:

```text
paper-slide-in
paper-drop-settle
stamp-hit
pin-pop
label-strip-slide
string-draw
marker-underline
arrow-draw
paper-corner-lift
shadow-breathe
halftone-flicker
```

All primitives must be pure functions of project time, stable seed, element ID, and authored parameters.

### 8.4 Editable controls

Vox Motion Compositions expose bounded controls through the existing OpenPost composition-control system:

```text
intensity
depth
speed
paper jitter
shadow depth
accent color
secondary accent
assembly order
hold ratio
background variant
```

No new timeline item type is introduced.

## 9. Native project compilation

Each documentary beat compiles into one logical scene group on the existing timeline.

Recommended tracks:

```text
Auno labels / titles
Auno annotations
Auno motion compositions
Beat visual/media
Captions
Voice
Music / ambience
```

A beat may contain:

- imported image/video source;
- native background;
- native text labels;
- native shapes;
- editable Motion Composition;
- voice segment;
- caption cues;
- optional ambience/music.

A beat is never represented only by a pre-rendered generated MP4 unless the user explicitly replaces the editable structure with such an asset.

## 10. Voice and timing

Word-count timing is planning-only.

Once TTS is generated:

1. capture actual duration per audio chunk;
2. map script sentences/clauses to audio ranges;
3. redistribute beat durations without changing beat order;
4. reflow native motion with the same style and seed;
5. regenerate caption timing from the approved script/audio map;
6. preserve manually edited non-motion items.

For long-form projects, TTS generation should run in bounded chunks so one provider failure does not invalidate the entire narration.

## 11. Long-form performance constraints

A five-minute Vox project can contain 100+ beats, so short-form assumptions must not cause editor slowdown.

Required implementation constraints:

- do not create one Svelte component per hidden beat in the wizard;
- virtualize long beat lists where necessary;
- batch sidecar persistence;
- compile motion by affected beat/scene, not full-project replacement for every edit;
- avoid cloning the entire project for a single control change;
- lazy-load generated media thumbnails;
- do not decode every audio/image asset at project open;
- preserve OpenPost project revision/conflict semantics;
- deterministic IDs must allow incremental replacement.

## 12. Ownership and selective regeneration

Extend the existing ownership categories rather than introducing a separate ownership mechanism.

Existing categories remain:

```text
visual
motion
voice
caption
music
```

Documentary metadata adds logical provenance such as:

```text
idea
script
beat
thumbnail
```

These metadata categories are not timeline ownership categories.

Examples:

- regenerate script → invalidates dependent generated voice/beats/visual plans but preserves user-owned source media;
- regenerate beat visual → replaces only generated visual items for that beat;
- regenerate motion → replaces only `motion` category entries;
- regenerate thumbnails → no timeline mutation;
- manual timeline edits remain protected by the existing user-modified ownership rules.

## 13. UI design

### 13.1 Mode selection

Auto Video setup adds:

```text
What are you creating?
[ Short-form ] [ Documentary Long-form ]
```

Choosing Documentary Long-form reveals Vox Style as the default V1 documentary style.

### 13.2 Documentary wizard

Desktop uses a two-column layout:

```text
left: step navigation / state / regeneration controls
right: current step editor / preview
```

On mobile the same content becomes one stacked flow.

The user can revisit completed steps. Stale downstream states are clearly marked before destructive regeneration.

### 13.3 Beat editor

The beat table exposes:

```text
Beat
Time
Narration
Core idea
Visual intent
Asset status
```

User actions:

```text
edit narration
split beat
merge adjacent beats
change visual intent
regenerate visual plan
attach/replace media
open beat in Video Editor after project creation
```

### 13.4 Provider-degraded states

Missing TTS/image/video providers do not produce a dead-end wizard.

The UI explains which capability is unavailable and offers the next viable action:

```text
continue with estimated timing
export narration package
export image prompt pack
import generated images later
create project with placeholders
```

## 14. Prompt and content safety

Source material remains untrusted.

Planner rules:

- source instructions cannot override system policy or workflow contract;
- factual claims should be grounded in source material when source is supplied;
- do not invent names, dates, statistics, quotes, or crimes;
- when no source is supplied, the planner should frame outputs as proposed story concepts rather than verified reporting unless a research-capable provider supplies citations;
- sensitive real-world tragedies use restrained visuals;
- no gore-focused visual generation;
- generated prompts must not request third-party logos by default.

## 15. Intellectual-property boundary

The supplied document is used as product-requirement/reference material.

Implementation must not copy long prompt passages verbatim into shipped source code when equivalent behavior can be represented as structured rules.

Auno Studio ships:

- original rule schemas;
- original planner prompts written for Auno Studio;
- original Motion Style definitions;
- original native composition implementation.

The UI label `Vox Style` is treated as the product owner's requested descriptive preset name. The internal engine remains `documentary-paper-collage`, and the product does not imply affiliation, sponsorship, or endorsement by Vox Media.

## 16. Data compatibility

Existing short-form sidecars remain valid.

Do not change the meaning of current `AutoVideoSidecar` fields.

Documentary state can be stored either as a versioned optional extension on the sidecar or in a dedicated documentary record keyed by project/run ID. The preferred implementation is a dedicated durable record while planning, followed by a compact documentary manifest in the project sidecar at handoff.

A lost documentary manifest must not make the native project unopenable.

## 17. Error handling and recovery

Every AI/media step is independently retryable.

The workflow stores:

```text
step status
input fingerprint
provider/model
attempt metadata
last successful output
error category
```

Failures are classified at least as:

```text
validation
provider unavailable
provider rejected
rate limited
timeout
media import failed
project conflict
```

Retry must not silently delete a previous successful output until the replacement succeeds.

## 18. Determinism, preview/export, and visual QA

Vox participates in the Phase 4 deterministic gate.

The same native project state, seed, and frame must produce matching preview and pre-encode export rendering within the established image-diff tolerance.

Runtime visual-QA measurements include:

- blank beat;
- invalid transform;
- text outside safe bounds;
- primary text overlap;
- required subject missing when a beat declares one;
- composition reference error;
- invalid duration/gap;
- generated asset not ready when required by a visible beat.

For the paper-collage style, screenshot coverage must include at least:

```text
cold open beat
map/document beat
connection-board beat
number/evidence beat
final beat
```

## 19. Testing strategy

### Unit

- documentary state transitions;
- dependency invalidation;
- duration/word-target logic;
- beat segmentation;
- stable IDs;
- Vox style catalog completeness;
- deterministic paper-motion primitives;
- ownership isolation;
- prompt-pack serialization.

### Server

- 300-second documentary duration accepted;
- short-form duration rules unchanged;
- planner structured schemas;
- persisted documentary run reload;
- multimodal source loading;
- selective regeneration;
- project revision conflicts;
- headless motion compile parity.

### Web

- mode selection;
- ten-idea selection;
- wizard reload/resume;
- stale-state UX;
- beat editor split/merge;
- provider-degraded continuation;
- project handoff.

### E2E

A fixed deterministic fixture must prove:

```text
Documentary Long-form
→ Vox Style
→ topic/source
→ 10 ideas
→ choose idea
→ 5-minute-capable script path
→ voice or deterministic fixture audio
→ beat breakdown
→ visual plans
→ native project
→ editable composition control
→ reload persistence
→ deterministic preview/export probe
→ successful export path
```

E2E fixtures do not call paid external AI/media APIs. Provider responses are supplied by deterministic local fixtures or test adapters.

## 20. Release gates

The Vox feature is not release-ready merely because the wizard renders.

Required gates:

1. existing Phase 1–4 tests remain green;
2. documentary unit/server/web tests are green;
3. a long-form fixture with at least 100 beats remains usable under defined performance thresholds;
4. preview/export deterministic probes pass;
5. visual QA passes approved Vox snapshots;
6. ownership tests prove motion regeneration does not replace narration/captions/music/manual edits;
7. Docker candidate boots and resumes an in-progress documentary run after restart;
8. a completed Vox project reopens after restart;
9. export works from the candidate container;
10. provider-degraded mode remains functional without optional media providers.

## 21. Delivery slices

Implementation is split into dependency-ordered slices but remains one approved product feature.

### Slice A — Documentary Core

- mode selection;
- durable documentary run;
- topic/ideas/duration/script;
- beat breakdown;
- 300-second duration contract;
- provider-neutral planner schemas.

### Slice B — Vox Motion and Visual Planning

- tenth Motion Style;
- paper-collage primitives;
- visual plans/prompts;
- thumbnail plans;
- native beat compositions;
- editor controls.

### Slice C — Media Enrichment

- chunked TTS;
- actual-duration beat reflow;
- image-generation provider seam;
- optional animation/video-generation provider seam;
- Media Library/project import;
- degraded fallbacks.

### Slice D — Long-form Hardening

- list virtualization/incremental persistence;
- deterministic preview/export probes;
- runtime Visual QA;
- 100+ beat fixture;
- E2E and release gates.

## 22. Non-goals for the first Vox release

Not required for first release:

- autonomous web research without a research-capable provider;
- hard dependency on ElevenLabs;
- hard dependency on OmniFlash or any specific video model;
- a second rendering engine;
- a separate Vox-only editor;
- frame-by-frame raster pre-rendering of the full documentary before editing;
- videos longer than five minutes;
- collaborative script approval workflows beyond existing project/workspace capabilities;
- automatic YouTube publishing changes outside existing OpenPost publishing flows.

## 23. Acceptance criteria

The Vox workflow is complete when all of the following are true:

- Documentary Long-form is a first-class Auto Video mode.
- User can start from no source or supported source material.
- Exactly ten distinct idea candidates can be generated and one selected.
- 30s/1m/2m/3m/5m duration presets work.
- A continuous documentary script is generated and editable.
- Voice can be generated through the provider-neutral TTS path or safely skipped/exported.
- Script becomes editable timed beats.
- Every beat has an editable visual plan and exportable prompt.
- Vox Style exists as `documentary-paper-collage` in Auno Motion.
- Paper-collage motion compiles to native OpenPost items/compositions.
- Thumbnail concepts are generated independently of the timeline.
- Project opens in the normal Auno Video Editor.
- User can edit/regenerate one beat without regenerating unrelated content.
- Motion regeneration preserves voice/captions/music/manual edits.
- Long-form project remains responsive at the V1 five-minute/100+ beat scale.
- Preview/export deterministic checks pass.
- Visual QA detects defined measurable failures.
- Candidate container survives restart with workflow/project state intact.
- No optional provider is required for the project to remain usable and editable.
