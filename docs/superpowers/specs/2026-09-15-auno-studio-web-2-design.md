# Auno Studio Web 2.0 — Architecture Design

**Status:** Approved in design review; implementation not started  
**Date:** 2026-09-15  
**Target release line:** `2.0.0-alpha.1` → `2.0.0`  
**Repository:** `dhtoan/AunoStudio`  
**Primary deployment:** self-hosted Docker on aaPanel  

## 1. Purpose

Auno Studio Web 2.0 replaces the existing Auno Studio photo/video editing foundation with OpenPost's editor and social-publishing stack, then adds Auno-owned AI Auto Video and motion-generation capabilities on top.

The central product promise is:

> AI generation produces an editable project, not a dead MP4.

Every generated scene must end as native editable project state in the OpenPost Video Editor wherever possible. Complex procedural motion that cannot reasonably be flattened into ordinary timeline items must remain editable through a native Motion Composition abstraction rather than being pre-rendered into an opaque video clip.

The current `dhtoan/AunoStudio` repository is intentionally minimal at the time of this design. This document defines the target architecture before source import and implementation begin.

## 2. Approved source foundations

Auno Studio Web 2.0 will use and adapt the following projects:

- OpenPost — https://github.com/getopenpost/openpost
  - Becomes the product foundation for app shell, workspaces, image editor, video editor, media library, recorder, composer, calendar/publications, inbox, analytics, project persistence, API/MCP/automation boundaries, and self-hosting patterns.
  - License: GNU AGPL-3.0-only. Compliance is a release requirement.
- Bang Motion — https://github.com/bangtutorial/bang-motion
  - Supplies motion-design rules and selected implementation ideas: deterministic motion, camera choreography, anti-slide rules, style briefs, kinetic typography, layered backgrounds, motion transitions, explainer styles, and visual QA concepts.
  - License: MIT. The original copyright and permission notice must be retained for copied/substantially derived portions.
- Auto Video references:
  - https://github.com/Cuongyd196/auto-video-gen
  - https://github.com/Cuongyd196/auto-compare-video
  - https://github.com/Cuongyd196/remotion-cuongit-template
  - These are references for content formats, pipeline ideas, scene generation, Remotion/FFmpeg techniques, and comparison/listicle structures. Their code and licenses must be audited before any direct import.

Candidate AI/media projects approved for evaluation include Kokoro, whisper.cpp, VieNeu-TTS, ACE-Step, Magenta.js, and Tone.js. Source-code and model-weight licenses must be reviewed separately before bundling or automatic download.

## 3. Product decisions that are locked

The following decisions are final for the 2.0 architecture unless a later approved design explicitly changes them:

1. The old Auno Studio Photo Editor is removed from the production path.
2. The old Auno Studio Video Editor is removed from the production path.
3. OpenPost's Photo/Image Editor becomes Auno Studio Photo.
4. OpenPost's Video Editor becomes Auno Studio Video.
5. Old Auno Studio photo/video project formats are not migrated.
6. Old Auno Studio photo/video presets are not migrated.
7. Useful legacy media may be imported as Media Library assets only.
8. Preset V2 is deferred; V1 uses Motion Styles, not the old preset model.
9. AI Auto Video is a project generator, not a third editor.
10. OpenPost native project state is the source of truth for editing and rendering.
11. Auno AI metadata is an optional sidecar; losing it must not break the project.
12. SQLite is the default database; PostgreSQL is optional.
13. Local media storage is the default; S3/R2/MinIO are optional.
14. Redis, RabbitMQ, and Kafka are not required for the default V1 deployment.
15. Docker Compose and aaPanel reverse proxy are first-class deployment targets.
16. Voice, subtitles, and background music are all included in V1.
17. AI provider routing is abstracted; the product is not hard-coded to one vendor.
18. Gemini must use official supported authentication paths. Antigravity OAuth workarounds are not built in.
19. Bang Motion is adapted into Auno Motion Engine; it is not exposed as a separate HTML-generator app.
20. Auno Studio should remain structurally close enough to OpenPost upstream to keep future merges practical.

## 4. High-level architecture

```text
AUNO STUDIO WEB 2.0
│
├── OpenPost Foundation
│   ├── Accounts / Auth / Workspaces
│   ├── Media Library
│   ├── Photo / Carousel Editor
│   ├── Video Editor
│   ├── Recorder
│   ├── Composer
│   ├── Publications / Calendar
│   ├── Inbox
│   ├── Analytics
│   ├── API / MCP / automation
│   └── Project persistence / revisions
│
├── Auno Auto Video
│   ├── Input ingestion
│   ├── Content extraction
│   ├── Script planning
│   ├── Storyboard planning
│   ├── Asset planning
│   ├── Voice
│   ├── Captions
│   ├── Music
│   └── Native timeline compiler
│
├── Auno AI
│   ├── Provider registry
│   ├── Text / vision / research
│   ├── TTS
│   ├── Transcription
│   ├── Music
│   └── Image / asset providers
│
├── Auno Motion Engine
│   ├── Bang Motion-derived rules
│   ├── Motion Styles
│   ├── Camera choreography
│   ├── Kinetic typography
│   ├── Background systems
│   ├── Transitions
│   ├── Motion Scene Graph
│   └── Motion Composition runtime
│
└── Infrastructure
    ├── SQLite default
    ├── PostgreSQL optional
    ├── Local storage default
    ├── S3 / R2 / MinIO optional
    ├── DB-backed persistent jobs
    └── Docker profiles for optional AI workers
```

## 5. OpenPost foundation strategy

### 5.1 Import philosophy

Auno Studio will be based on the OpenPost codebase rather than embedding OpenPost as an iframe or keeping it as a separately branded companion application.

The goal is a unified product surface called **Auno Studio** while preserving OpenPost's internal module boundaries and type names when renaming them would create unnecessary fork depth.

Public-facing brand changes include:

- logo and wordmark;
- page titles and metadata;
- favicon and PWA manifest;
- user-facing product copy;
- email branding;
- documentation;
- Docker image names;
- "Send to OpenPost"-style copy changed to Auno Studio equivalents.

Internal symbols such as `OpenPostVideoProject` or package boundaries should remain unchanged unless functionality requires a change.

### 5.2 Auno-owned boundaries

New functionality should preferentially live under focused Auno-owned packages or modules, conceptually:

```text
packages/
├── video-project/           # OpenPost
├── auno-auto-video/
├── auno-motion/
├── auno-ai/
└── auno-brand/
```

Core OpenPost patches must be minimized and documented as Auno patches with a reason, upstream seam, and regression coverage.

## 6. Information architecture and UI

### 6.1 Main application shell

Keep OpenPost workspace navigation patterns as intact as possible.

Primary product areas:

```text
Home
+ Create
Publications
Media
Inbox
Analytics
More
Settings
```

`+ Create` is the Auno Studio creation hub:

```text
AI Auto Video
Video
Photo / Carousel
Record
Social Post
```

The mapping is:

- AI Auto Video → Auno Auto Video wizard.
- Video → OpenPost Video Editor.
- Photo / Carousel → OpenPost Image Editor.
- Record → OpenPost Recorder.
- Social Post → OpenPost Composer.

### 6.2 Home

Home is action-oriented, not a dense analytics dashboard. It should prioritize:

- Create something;
- Continue editing;
- AI generation jobs;
- Publishing status;
- recent media/publications;
- compact performance summary.

### 6.3 Mobile

Do not overcrowd mobile bottom navigation. Use a floating or prominent Create action that opens a creation sheet with AI Auto Video, Video, Photo, Recorder, and Post.

### 6.4 Branding adapter

Brand values should be centralized behind an Auno brand boundary rather than scattered hard-coded strings. UI code should consume values such as product name, logo, links, and support metadata through the brand adapter.

## 7. AI Auto Video

### 7.1 Role

AI Auto Video creates an editable OpenPost Video Project.

It is not an editor and does not own final rendering.

### 7.2 Supported V1 inputs

V1 supports:

- plain text;
- URL;
- Markdown;
- TXT;
- images;
- video clips;
- PDF/article files;
- existing Workspace Media.

URL ingestion must extract normalized content and assets before calling an LLM. Raw webpage HTML is not treated as trusted instruction text.

### 7.3 V1 content formats

V1 ships five Auto Video formats:

#### Review

Typical sequence:

```text
Hook → Overview → Feature 1 → Feature 2 → Feature 3 → Pros → Cons → Verdict → CTA
```

#### News

```text
Hook → What happened → Key fact → Big number → Why it matters → Impact → What next → CTA
```

#### Guide

```text
Problem → Definition → Step 1 → Step 2 → Step 3 → Mistake → Tip → CTA
```

#### Compare

```text
Hook → A vs B → Price → Feature → Advantage → Disadvantage → Best for → Verdict
```

#### Top N

```text
Hook → #N → ... → #1 → Summary → CTA
```

Future Aunomay-specific templates such as Don't vs Do, 3 Ways to Style, One Skirt 5 Ways, Shoes Guide, Bag Pairing, Occasion Guide, Product Review, New Drop, and Before/After are extensions of the same engine, not separate editors.

### 7.4 Structured planning

The AI planner outputs strict machine-owned structured data. It must not generate arbitrary renderer code as its primary contract.

Conceptual storyboard shape:

```json
{
  "format": "news",
  "title": "...",
  "duration": 45,
  "language": "en-US",
  "scenes": [
    {
      "id": "scene-1",
      "type": "hook",
      "voice": "...",
      "visualIntent": "headline"
    }
  ]
}
```

The schema is owned by Auno Studio, versioned, validated, and independent of provider prompt wording.

### 7.5 Visual intents

Scenes can request intents such as:

```text
image
video
b-roll
icon
chart
big-number
split-screen
document
map
product
quote
motion-composition
```

Asset resolution order is:

```text
uploaded media
→ workspace media
→ extracted URL/file assets
→ existing project assets
→ configured AI/search provider
→ generated fallback graphic
```

A missing AI provider must not prevent basic project creation when a local fallback can be generated.

## 8. Timing, voice, subtitles, and music

### 8.1 Timing

AI may suggest scene durations, but final timing is reconciled after media and voice generation.

```text
AI duration estimate
→ generate / measure voice
→ recalculate scene duration
→ align visuals
→ align captions
```

This prevents narration from being clipped or padded arbitrarily.

### 8.2 Voice

Voice clips are editable generated assets with metadata, not opaque final audio.

A voice item retains at minimum:

- source text;
- language;
- provider;
- voice ID;
- speed;
- generated asset ID;
- generation version.

Editing text and regenerating voice should only invalidate the dependent timing/caption chain for the affected scene.

Preferred routing direction:

- English and supported languages: browser/local Kokoro first when practical;
- Vietnamese: VieNeu-TTS is a candidate local provider after weight/license audit;
- configured cloud TTS as fallback;
- no paid provider should be used automatically when "Never use paid provider automatically" is enabled.

### 8.3 Subtitles

For generated narration, use known source text plus provider timing/forced alignment when available rather than transcribing generated speech again unnecessarily.

For user-supplied media, use the OpenPost local transcription path first. Server-side whisper.cpp is optional for headless/batch workflows.

Captions remain native editable captions and can support burn-in, SRT/VTT, or selectable tracks according to editor/export capabilities.

### 8.4 Music

Music sources:

```text
Generate
Library
Upload
```

V1 separates light and advanced generation:

- Music Lite: browser/local lightweight composition approach such as Magenta.js + Tone.js, subject to final dependency audit.
- Music Pro: optional ACE-Step worker for higher-end generation on suitable hardware or remote GPU infrastructure.

Generated music metadata should preserve mood, BPM, key, instruments, prompt, provider, and regeneration lineage where available.

## 9. Auno AI provider system

### 9.1 Extend OpenPost's provider-neutral model boundary

Do not build an unrelated parallel AI stack. Extend OpenPost's provider-neutral AI boundary into an Auno capability registry.

Conceptually:

```text
Feature
  ↓
Auno AI service
  ↓
Capability router
  ├── browser/on-device
  ├── local Docker worker
  └── cloud provider
```

Capabilities are independent:

- text/vision/research;
- TTS;
- transcription;
- music;
- image/assets.

### 9.2 LLM providers

V1 provider architecture supports:

- Gemini through official API key/OAuth/Vertex-compatible paths;
- OpenRouter compatibility inherited from OpenPost where retained;
- OpenAI-compatible custom endpoints such as Ollama/vLLM/LM Studio where practical;
- future adapters without changing feature code.

Antigravity OAuth or similar reverse-engineered authentication must not be a built-in provider.

### 9.3 Routing modes

User-facing routing modes:

```text
Auto
Free / Local First
Cloud First
```

Self-host default should also expose:

```text
Never use paid provider automatically = ON
```

### 9.4 Model manager

Models are downloaded on demand and cached separately from user data.

- Browser models: IndexedDB/OPFS or the editor's existing local cache mechanisms.
- Server/local-worker models: a dedicated model volume such as `/auno-models`.
- Main application Docker images should not embed large model weights.

The Model Manager should show installed/available models, size, status, checksum/update/removal controls, and capability availability.

### 9.5 Degraded-mode behavior

A missing AI service must degrade its capability, not the entire application.

Examples:

- ACE-Step unavailable → app remains ready; Music Pro unavailable.
- Gemini unavailable → manual editors, media, publishing, and already-saved projects remain usable.
- Music generation failure → project may complete without music with retry controls.

## 10. Auno Motion Engine

### 10.1 Purpose

Auno Motion Engine converts storyboard intent into higher-quality motion language while still compiling to editable OpenPost project state.

Bang Motion contributes design principles and selected reusable code/techniques, not a separate runtime product.

### 10.2 Core principles imported from Bang Motion

V1 should adapt:

- style brief before generation;
- anti-slide rules;
- a persistent visual through-line;
- camera choreography;
- deterministic time;
- kinetic typography;
- layered backgrounds;
- motion blur concepts;
- parallax;
- varied transitions;
- highlight shapes;
- lower thirds;
- explainer/opening/promo patterns;
- visual snapshot QA.

### 10.3 Motion Styles

V1 Motion Styles include:

- Editorial Fashion;
- Luxury Product;
- Visual Journalism;
- White Catalog;
- Continuous Action;
- Cartoon Collage;
- Vintage Sketch;
- Breaking News;
- Minimal Data.

A Motion Style controls visual language, not a fixed old-style preset. It defines typography, camera behavior, transition language, background language, highlight shapes, and motion intensity.

### 10.4 Style brief

Before scene generation, Auno creates a project-level style brief containing at least:

- palette;
- typography direction;
- camera language;
- motion signature;
- background language;
- transition language.

This keeps scene output coherent across one video.

### 10.5 Motion Scene Graph

A motion planning layer sits between storyboard and OpenPost timeline compilation:

```text
MotionScene
├── camera
├── background
├── subjects[]
├── text[]
├── graphics[]
├── annotations[]
├── movements[]
└── transitions[]
```

The compiler translates ordinary elements to native OpenPost text/image/audio/video/keyframe/transition constructs.

### 10.6 Motion Composition

Complex procedural graphics such as Three.js worlds, shaders, particle systems, or deeply coupled camera/background behavior are represented as an editable **Motion Composition** timeline item rather than a pre-rendered MP4.

A Motion Composition exposes user-editable parameters such as:

- style;
- camera behavior;
- intensity;
- depth;
- background;
- speed;
- colors;
- particles;
- text/media slots;
- duration.

The output must be deterministic: the same project state, seed, and time produce the same frame in preview and export.

## 11. Project data model

### 11.1 OpenPost project is authoritative

Do not create a competing Auno project format.

The authored video is an OpenPost-native video project with its native timeline collections, project assets, revisions, checkpoints, and persistence mechanisms.

### 11.2 Auno AI sidecar

AI generation state is stored separately and keyed by project ID.

Conceptual sidecar fields:

```text
project_id
generation_version
template_id
source_manifest
storyboard
provider_manifest
generation_graph
created_at
updated_at
```

The sidecar must not duplicate the authoritative final timeline.

If the sidecar is missing or AI is disabled, the OpenPost project still opens, edits, and exports.

### 11.3 Source ledger

Auto Video records source provenance for URLs, uploaded files, extracted assets, and source text. Scene claims and generated decisions may reference source IDs.

This enables operations such as:

- rewrite shorter while keeping facts;
- regenerate visuals without re-researching;
- trace a claim back to its source;
- reuse extracted assets without repeating fetches.

### 11.4 Dependency graph

Generation dependencies are explicit:

```text
SOURCE
  ↓
SCRIPT
  ↓
STORYBOARD
  ↓
ASSETS ─┬─ VOICE ─→ CAPTIONS
        │
        └─ MUSIC PLAN
             ↓
          TIMING
             ↓
          TIMELINE
```

Invalidation is scoped. Replacing music must not regenerate script. Editing one scene voice must not regenerate unrelated scenes.

### 11.5 Regeneration ownership and manual edits

Each AI generation block records which timeline items it created.

Once a user manually edits a generated item, that item is marked as manually modified for regeneration purposes.

Default behavior:

```text
Regenerate scene
→ preserve manual edits
→ replace only still-owned generated items
```

The UI may offer an explicit destructive alternative such as "Replace entire scene".

### 11.6 Revisions and undo

AI regeneration must flow through the same project mutation/revision boundary used by the editor. AI workers must not silently overwrite project JSON directly in the database.

A regeneration becomes undoable/restorable history.

## 12. Project assets versus Media Library

Generated and source files required for editing belong to Project Assets first.

Examples:

- uploaded source photo;
- URL image;
- uploaded video;
- generated narration;
- generated music;
- generated image;
- proxy/derived media.

Workspace Media is for intentionally reusable assets. Project Assets should not automatically flood Media Library.

The user may explicitly promote/save an asset to Workspace Media.

## 13. Deployment architecture

### 13.1 Default profile

The default aaPanel/self-host installation is deliberately small:

```text
Internet
  ↓
aaPanel Nginx + TLS
  ↓
127.0.0.1:8080
  ↓
Auno Studio container
  ├── web/server
  ├── worker role
  ├── SQLite
  └── local media
```

The main container should remain usable without GPU, Redis, external database, or optional AI workers.

### 13.2 Persistent data layout

Conceptual layout:

```text
/data
├── db/
│   └── auno-studio.db
├── media/
├── exports/
├── thumbnails/
├── temp/
└── backups/

/auno-models
├── tts/
├── whisper/
└── music/
```

Model cache is separate from user data and backups.

### 13.3 Database

Default:

```text
SQLite
```

Optional:

```text
PostgreSQL
```

Both must use the same domain/repository abstraction and supported migration path. Business logic may not fork into separate SQLite-only and PostgreSQL-only implementations.

A later database migration workflow should support preflight, backup, schema validation, copy, integrity checks, and cutover from SQLite to PostgreSQL.

### 13.4 Storage

Storage abstraction supports:

- Local;
- Amazon S3;
- Cloudflare R2;
- MinIO/S3-compatible endpoints.

Editor/Auto Video code should refer to asset identities rather than hard-coded filesystem paths.

### 13.5 Jobs

Persistent DB-backed jobs are the default queue mechanism.

Do not require Redis/RabbitMQ/Kafka for V1.

AI generation is decomposed into resumable steps such as:

```text
auto_video.create
→ extract_content
→ generate_script
→ generate_storyboard
→ resolve_assets
→ generate_voice
→ align_subtitles
→ generate_music
→ compile_timeline
→ ready
```

Job states include queued, running, waiting-provider, retrying, completed, failed, and cancelled.

Idempotency keys are required where retries could otherwise create duplicate provider charges or duplicate generated assets.

### 13.6 Roles and scale

Small install:

```text
ROLE=all
```

Larger install:

```text
web replicas
worker replicas
PostgreSQL
S3/R2
remote/local AI workers
```

The application architecture should not need to be rewritten to move from the first model to the second.

### 13.7 Optional Docker profiles

Conceptually:

```text
default
└── auno-studio

profile: postgres
└── postgres

profile: ai
├── auno-voice
└── auno-transcribe

profile: ai-music
└── auno-music
```

## 14. Health and readiness

Keep separate process health and application readiness semantics.

- `/api/v1/health` — process is alive.
- `/api/v1/ready` — database/storage/migrations/core services are ready.

Optional AI providers do not make the whole app unready. They report capability degradation instead.

## 15. Security design

### 15.1 Existing OpenPost controls

Reuse OpenPost's authentication, MFA/passkey, token, encryption, workspace, API/MCP authorization, and provider-credential patterns instead of replacing them with a new Auno auth system.

### 15.2 Secret handling

Secrets remain server-side:

- provider credentials;
- Gemini/OpenRouter/cloud AI credentials;
- OAuth client secrets;
- S3/R2 credentials;
- encryption/signing keys;
- database credentials.

Do not expose raw provider keys to browser code.

Do not log access tokens, refresh tokens, browser cookies, full secret-bearing provider responses, or private uploaded source content in ordinary error logs.

### 15.3 URL ingestion and SSRF

Auto Video URL ingestion must block private/internal targets and unsafe schemes, including loopback, link-local, private-network ranges, Docker service names, and local-file schemes.

Requirements include:

- DNS resolution validation;
- redirect limits;
- timeout limits;
- byte limits;
- MIME validation;
- blocked private/reserved IP ranges;
- no `file://`;
- source content treated as untrusted data, not system instructions.

### 15.4 Media processing

Uploaded media requires:

- MIME and extension validation;
- size/duration limits;
- codec probing;
- sanitized filenames;
- controlled temporary directories;
- fixed argv invocation for FFmpeg/processors rather than unsafe shell interpolation;
- cleanup/TTL for generated temporary files.

### 15.5 Network exposure

Production guidance:

- TLS through aaPanel/Nginx;
- bind app port to loopback/private network by default;
- no public ports for PostgreSQL or optional AI workers unless explicitly configured;
- firewall and backup protection documented.

## 16. Licensing and compliance

### 16.1 OpenPost

Because Auno Studio imports/modifies OpenPost directly, AGPL-3.0 compliance is part of the release gate.

At minimum, releases/deployments must preserve required notices and provide a compliant path to Corresponding Source for the covered work according to the actual mode of distribution/network use.

This architecture document is not legal advice. A commercial/public deployment should receive qualified legal review before release.

### 16.2 Bang Motion

Copied or substantially derived Bang Motion source retains the MIT copyright and permission notice. Keep its license under the third-party license inventory.

### 16.3 Models and other dependencies

Code license and model-weight license are audited separately.

No model is bundled or automatically downloaded for commercial use until the project has recorded:

- model source;
- weight license;
- redistribution terms;
- commercial-use status;
- attribution obligations;
- checksum/version.

Models with known non-commercial restrictions are not default bundled providers for Auno Studio commercial workflows.

## 17. Upstream synchronization

### 17.1 OpenPost

Track OpenPost as upstream and keep Auno changes isolated where practical.

Recommended maintenance workflow:

```text
fetch OpenPost upstream
→ compare release
→ merge/rebase
→ resolve documented Auno seams
→ run full release gates
→ publish Auno Studio update
```

Avoid broad internal renames that produce permanent merge conflicts without product value.

### 17.2 Bang Motion

Vendor/adapt audited Bang Motion components with an upstream commit reference. Do not automatically pull remote code into production builds.

Updates follow:

```text
compare upstream commit
→ review rules/techniques/code
→ port selected changes
→ run motion regression tests
```

## 18. Testing strategy

### 18.1 Test layers

```text
Unit
Integration
Browser/editor end-to-end
Docker/release
```

### 18.2 Unit coverage

Required targets include:

- storyboard schema validation;
- provider routing;
- generation dependency graph;
- regeneration ownership;
- manual-edit preservation;
- URL/SSRF validation;
- timeline compilation;
- motion determinism;
- database/storage adapter behavior.

### 18.3 Integration coverage

Required scenarios include:

- Auto Video → native project;
- job retry/resume;
- project revision/history;
- SQLite;
- PostgreSQL;
- Local storage;
- S3-compatible storage;
- AI feature disabled/degraded;
- one optional AI worker enabled.

### 18.4 Browser/editor end-to-end

Core acceptance flow:

```text
Create
→ AI Auto Video
→ ingest source
→ generate storyboard
→ compile native project
→ open Video Editor
→ edit generated text
→ manually alter one generated element
→ regenerate scene
→ verify manual edit survives
→ export
→ send to Media
→ open Composer
→ schedule/publish flow
```

The full editor target should be tested on supported current desktop Chromium-class browsers used by the OpenPost editor stack.

### 18.5 Motion visual QA

Seek deterministic key frames and capture snapshots at fixed points such as 0%, 25%, 50%, 75%, and 100%.

Check for:

- blank frames;
- clipped text;
- invalid z-order;
- missing assets;
- unreadable contrast;
- broken transforms;
- motion composition failures;
- nondeterministic rendering.

### 18.6 Database migration matrix

Every migration must pass:

```text
fresh SQLite
upgrade SQLite
fresh PostgreSQL
upgrade PostgreSQL
```

Auno AI tables being unavailable or AI being disabled must not prevent an otherwise valid native OpenPost project from opening.

### 18.7 Docker release verification

Every release candidate is tested from the actual built container image, including:

```text
container start
→ migration
→ health
→ readiness
→ login
→ editor smoke test
→ Auto Video smoke test
→ restart
→ project/job recovery
```

### 18.8 Backup/restore verification

Release QA should periodically prove:

```text
create workspace
→ upload media
→ create Auto Video
→ save project
→ backup
→ recreate instance
→ restore
→ verify project/media/publication/AI sidecar state
```

## 19. V1 acceptance criteria

Auno Studio Web 2.0 may enter stable release only when all of the following are true:

1. OpenPost foundation is integrated and Auno's old Photo/Video Editors are no longer production paths.
2. Docker Compose/aaPanel installation works with one main container, SQLite, and local media by default.
3. PostgreSQL and S3-compatible storage are optional, supported configurations.
4. AI Auto Video accepts the approved V1 input types.
5. Review, News, Guide, Compare, and Top N formats work.
6. Generated videos become native editable OpenPost Video Projects instead of opaque intermediate MP4s.
7. Generated text/media/voice/captions/music remain editable or regenerable through the defined native/sidecar model.
8. Auno Motion Engine supports approved Motion Styles and deterministic Motion Composition behavior.
9. Voice, captions, and music are available in V1 with graceful provider fallback/degradation.
10. Gemini integration uses supported official authentication paths.
11. Regenerating one scene preserves unrelated scenes and manual edits by default.
12. Projects autosave, keep history/revisions, reopen after service restart, and survive supported backup/restore.
13. Export → Media Library → Composer → schedule/publish flow works end-to-end.
14. SQLite and PostgreSQL migration/test matrices pass.
15. Default deployment does not require GPU, Redis, RabbitMQ, or an external DB.
16. SSRF protections, upload limits, secrets handling, and worker isolation pass security tests.
17. OpenPost AGPL, Bang Motion MIT, and model/dependency licenses are inventoried and release-compliant.
18. Browser, Docker, migration, motion determinism, and creation-flow tests pass.

## 20. Explicit V1 non-goals

V1 does not include:

- legacy Auno Photo/Video project migration;
- old preset migration;
- Preset V2;
- a new analytics engine;
- a dedicated server render farm;
- a native mobile editor rewrite;
- a custom social publishing engine replacing OpenPost;
- a custom scheduler replacing OpenPost;
- training proprietary foundation models.

## 21. Release naming

Because this is a foundation replacement rather than an incremental editor patch, the new line starts at:

```text
2.0.0-alpha.1
→ 2.0.0-alpha.2
→ 2.0.0-beta.1
→ 2.0.0-rc.1
→ 2.0.0
```

Do not label the project stable until the V1 acceptance criteria and release gates pass.

## 22. Implementation decomposition

This design is intentionally an umbrella architecture. It is too large for one safe implementation batch, so execution must be decomposed while preserving this document as the governing design.

Recommended implementation order:

### Phase 1 — OpenPost foundation and deployment

- import/fork OpenPost into AunoStudio;
- establish upstream tracking strategy;
- apply Auno branding adapter;
- hard-cut over to OpenPost Photo/Video Editors;
- establish Docker/aaPanel baseline;
- SQLite default, PostgreSQL optional;
- Local/S3-compatible storage abstraction;
- license/notice inventory;
- baseline CI and release smoke tests.

### Phase 2 — Native Auto Video core

- source ingestion;
- source ledger;
- structured storyboard schema;
- five V1 formats;
- durable generation jobs;
- asset resolution;
- OpenPost timeline compiler;
- Auno AI sidecar;
- regeneration ownership/dependency graph;
- editor handoff and AI panel seam.

### Phase 3 — Voice, captions, music, provider routing

- provider registry expansion;
- Gemini official provider path;
- browser/local TTS;
- Vietnamese TTS candidate after model audit;
- OpenPost local transcription reuse;
- optional whisper.cpp worker;
- Music Lite;
- optional ACE-Step worker;
- model manager and degraded-capability UI.

### Phase 4 — Auno Motion Engine

- Bang Motion license/vendor audit;
- style brief;
- Motion Styles;
- Motion Scene Graph;
- native keyframe/transition mapping;
- Motion Composition abstraction;
- deterministic preview/export behavior;
- motion snapshot QA;
- Editorial Fashion/Aunomay-specific motion style tuning.

Each phase should receive its own detailed implementation plan and test gates before code is merged. Phase 1 is the first implementation plan to produce after this architecture is reviewed and accepted.

## 23. Design invariants

The following invariants are the quickest way to judge future proposals:

- **One product:** users see Auno Studio, not a collection of OpenPost/Bang Motion/AI sub-apps.
- **One editor authority:** final authored video state belongs to the OpenPost Video Project model.
- **Editable AI:** AI generates authored structure, not only final pixels.
- **Graceful AI degradation:** editors and publishing remain usable without optional AI services.
- **Light self-host default:** one container + SQLite + local media must remain viable.
- **Upstream-aware:** avoid unnecessary deep forks of OpenPost.
- **Deterministic motion:** preview and export must agree at a given project time/state.
- **License-aware:** open-source and model licenses are release gates, not afterthoughts.
- **No legacy burden:** old Auno editor projects/presets do not constrain the 2.0 architecture.

---

This document is the approved architecture baseline for Auno Studio Web 2.0. Implementation plans may add file-level detail and execution sequencing, but may not contradict the locked decisions or design invariants above without a new design review.