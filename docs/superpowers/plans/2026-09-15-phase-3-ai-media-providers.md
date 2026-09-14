# Phase 3 — AI Providers, Voice, Captions & Music Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Extend Auno Studio's provider-neutral AI system with official Gemini authentication/generation, explicit routing modes, editable voice/caption/music generation, model/runtime management, and graceful local/cloud fallbacks while reusing OpenPost's existing local AI engines instead of rebuilding them.

**Architecture:** Keep OpenPost `ai.Generator` as the text/vision generation contract and add Auno capability routing around it. Browser-local engines remain frontend services registered through OpenPost's local-AI runtime registry; server/headless capability adapters use explicit HTTP/service interfaces and durable Auto Video job checkpoints. Credentials remain server-side and encrypted. Auto Video Phase 2 is extended with `generate_voice`, `align_subtitles`, and `generate_music` stages without changing storyboard schema version 1.

**Tech Stack:** Go 1.26.6, OpenPost `ai.Generator`, Go `net/http`, `golang.org/x/oauth2`, encrypted token service, Svelte 5/SvelteKit, Kokoro/MOSS/Supertonic services already in OpenPost, Parakeet/Whisper transcription already in OpenPost, `ai-music-js` ACE-Step WebGPU support already in OpenPost, Tone.js for lightweight deterministic music rendering, Web Audio API, Vitest, Go test, Playwright, Docker Compose optional AI workers.

**Spec:** `docs/superpowers/specs/2026-09-15-auno-studio-web-2-design.md`

## Global Constraints

- Phases 1 and 2 must be merged and green before this plan starts.
- Reuse OpenPost's `apps/server/internal/ai/ai.go` `Generator` abstraction; do not create a competing text/vision generator contract.
- Reuse OpenPost's existing `apps/web/src/lib/video-editor/local-ai/**` engines, cache, progress, and runtime registry before adding new local infrastructure.
- Gemini uses official Google authentication only: API/auth key, end-user OAuth 2.0, or ADC. No Antigravity/reverse-engineered OAuth is shipped.
- Official Gemini OAuth scope for the Generative Language API is `https://www.googleapis.com/auth/generative-language.retriever`; ADC deployments may additionally use `https://www.googleapis.com/auth/cloud-platform` when required by the configured Google Cloud project.
- Raw AI credentials never reach browser bundles or API responses.
- Default self-host behavior must not automatically incur paid-provider charges.
- User-facing routing modes: `auto`, `free-local-first`, `cloud-first`.
- Self-host default: `never_use_paid_provider_automatically = true`.
- Voice, captions, and background music are all required in V1.
- Generated voice/music are editable audio assets and retain regeneration metadata.
- Generated narration should use known script/timing where possible; do not re-ASR generated TTS without a reason.
- Uploaded/user audio-video uses OpenPost local transcription first; headless whisper.cpp is optional.
- Browser-local AI unavailability degrades capability only; it must not make `/api/v1/ready` fail.
- Large model weights are downloaded/cached separately; they are not baked into the main Auno Studio container.
- Model/source/weight license records are mandatory before a new model becomes a default or automatic download.
- All behavior changes follow test-first red → green → refactor and small commits.

## Existing OpenPost Capabilities to Reuse

The imported foundation already contains:

```text
apps/server/internal/ai/ai.go
  Generator
  GenerateRequest
  strict JSONSchema
  ProviderError

apps/web/src/lib/video-editor/local-ai/
  model-cache.ts
  runtime-registry.ts
  commit-generated-audio.ts
  insert-generated-audio.ts
  tts/registry.ts
  tts/kokoro-service.ts
  tts/moss-service.ts
  tts/supertonic-service.ts
  music/ace-step-service.ts
```

Do not fork these into Auno copies. Add Auno routing/adapters around them.

---

## Task 1: Define the shared AI capability and routing contract

**Files:**
- Create: `packages/auno-ai/package.json`
- Create: `packages/auno-ai/tsconfig.json`
- Create: `packages/auno-ai/src/types.ts`
- Create: `packages/auno-ai/src/routing.ts`
- Create: `packages/auno-ai/src/routing.test.ts`
- Modify: `apps/web/package.json`

**Interfaces:**
- Consumes: no runtime providers.
- Produces:
  - `AiCapability = 'text' | 'vision' | 'tts' | 'transcription' | 'music' | 'image'`
  - `AiRoutingMode = 'auto' | 'free-local-first' | 'cloud-first'`
  - `AiProviderDescriptor`
  - `AiCapabilityStatus`
  - `rankProviders(request, providers): AiProviderDescriptor[]`.

- [ ] **Step 1: Write provider-ranking tests first**

```ts
import { describe, expect, it } from 'vitest';
import { rankProviders } from './routing';

const providers = [
  { id: 'kokoro-browser', capability: 'tts', locality: 'browser', cost: 'free', available: true },
  { id: 'cloud-tts', capability: 'tts', locality: 'cloud', cost: 'paid', available: true }
] as const;

it('keeps paid providers out when the safety switch is on', () => {
  expect(rankProviders({ capability: 'tts', mode: 'auto', neverUsePaid: true }, providers)
    .map((provider) => provider.id)).toEqual(['kokoro-browser']);
});

it('prefers local in free-local-first mode', () => {
  expect(rankProviders({ capability: 'tts', mode: 'free-local-first', neverUsePaid: false }, providers)[0]?.id)
    .toBe('kokoro-browser');
});
```

- [ ] **Step 2: Confirm red**

```bash
bun test packages/auno-ai/src/routing.test.ts
```

- [ ] **Step 3: Implement exact provider fields**

```ts
export type AiProviderDescriptor = {
  id: string;
  capability: AiCapability;
  locality: 'browser' | 'server' | 'cloud';
  cost: 'free' | 'paid' | 'unknown';
  available: boolean;
  languages?: readonly string[];
  priority: number;
};
```

Ranking rules:

```text
filter capability + available
if neverUsePaid → drop paid
free-local-first: browser → server → free cloud → paid cloud
auto: browser/server free → free cloud → configured paid
cloud-first: free cloud → paid cloud → browser/server
within bucket: priority ascending, then id lexical for determinism
```

- [ ] **Step 4: Install and verify**

```bash
bun install
bun test packages/auno-ai/src/routing.test.ts
```

- [ ] **Step 5: Commit**

```bash
git add packages/auno-ai apps/web/package.json bun.lock
git commit -m "feat: define Auno AI capability routing contract"
```

---

## Task 2: Persist AI routing preferences without storing browser model state in the database

**Files:**
- Create: `apps/server/internal/database/migrations/9001_auno_ai_preferences.sql`
- Create: `apps/server/internal/models/auno_ai.go`
- Create: `apps/server/internal/services/aunopreferences/ai.go`
- Create: `apps/server/internal/services/aunopreferences/ai_test.go`
- Modify: `apps/server/internal/database/migrations/migration_chain_test.go`

**Interfaces:**
- Consumes: Auno migration range; workspace/user identity.
- Produces:
  - `AunoAIPreferences { UserID, WorkspaceID, RoutingMode, NeverUsePaidAutomatically, PreferredTextProvider }`
  - `GetAIPreferences` / `SaveAIPreferences`.

- [ ] **Step 1: Write repository/service test**

Default expectations:

```go
require.Equal(t, "auto", prefs.RoutingMode)
require.True(t, prefs.NeverUsePaidAutomatically)
```

Saving `free-local-first` persists per user + workspace.

- [ ] **Step 2: Confirm red**

```bash
cd apps/server
go test ./internal/services/aunopreferences -run AIPreferences -v
```

- [ ] **Step 3: Add migration**

```sql
CREATE TABLE IF NOT EXISTS auno_ai_preferences (
  user_id TEXT NOT NULL,
  workspace_id TEXT NOT NULL,
  routing_mode TEXT NOT NULL DEFAULT 'auto',
  never_use_paid_automatically BOOLEAN NOT NULL DEFAULT TRUE,
  preferred_text_provider TEXT NOT NULL DEFAULT '',
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY(user_id, workspace_id)
);
```

Do not store browser model download/cache state here; the existing local-AI model cache remains browser-owned.

- [ ] **Step 4: Implement validation**

Reject routing mode outside the three exact values. Empty preferred provider means router decides.

- [ ] **Step 5: Run migration/service tests and commit**

```bash
cd apps/server
go test ./internal/services/aunopreferences ./internal/database/migrations -run 'AIPreferences|MigrationChain' -v
git add apps/server/internal/database/migrations/9001_auno_ai_preferences.sql apps/server/internal/models/auno_ai.go apps/server/internal/services/aunopreferences apps/server/internal/database/migrations/migration_chain_test.go
git commit -m "feat: persist Auno AI routing preferences"
```

---

## Task 3: Implement the official Gemini `ai.Generator` adapter

**Files:**
- Create: `apps/server/internal/ai/gemini.go`
- Create: `apps/server/internal/ai/gemini_test.go`
- Modify: `apps/server/internal/config/config.go`
- Modify: `apps/server/internal/config/config_test.go`
- Modify: `.env.example`

**Interfaces:**
- Consumes: OpenPost `ai.Generator`, `GenerateRequest`, `JSONSchema`.
- Produces:
  - `GeminiGenerator` implementing `ai.Generator`
  - `NewGeminiGenerator(GeminiConfig, httpClient) *GeminiGenerator`
  - `GeminiConfig { APIKey, Model, BaseURL, TokenSource, QuotaProject }`.

- [ ] **Step 1: Write HTTP contract tests with `httptest.Server`**

Verify:

```text
POST /v1beta/models/<model>:generateContent
x-goog-api-key header when API key configured
Authorization: Bearer <token> when OAuth/ADC token source configured
x-goog-user-project when quota project configured
systemInstruction is separate from user contents
response JSON schema is passed as structured-output config
provider HTTP error becomes ProviderError without response body retention
```

Do not hit Google in unit tests.

- [ ] **Step 2: Confirm red**

```bash
cd apps/server
go test ./internal/ai -run Gemini -v
```

- [ ] **Step 3: Add Auno Gemini config fields**

Keep new config keys Auno-owned to avoid pretending they are upstream OpenPost settings:

```text
AUNO_GEMINI_API_KEY
AUNO_GEMINI_MODEL
AUNO_GEMINI_BASE_URL
AUNO_GEMINI_QUOTA_PROJECT
AUNO_GEMINI_AUTH_MODE=api-key|oauth|adc
AUNO_GEMINI_OAUTH_CLIENT_ID
AUNO_GEMINI_OAUTH_CLIENT_SECRET
```

Default model must be configured explicitly in code as the stable low-cost Gemini model selected for the release after a live capability check. Store that release-specific model name in one constant and cover it with a config test; do not scatter model strings.

Default base URL:

```text
https://generativelanguage.googleapis.com
```

- [ ] **Step 4: Implement REST mapping**

Use the official `models.generateContent` REST contract so Auno can supply either API key or OAuth bearer token without adding another SDK abstraction.

Map text/images/files/audio/video only for media forms supported by the Gemini REST API and already represented by `GenerateRequest`. Unsupported OpenPost parts fail with `ErrUnsupportedInput` rather than silently dropping content.

For strict response schema, map OpenPost `JSONSchema` into Gemini's structured response schema field and request JSON MIME output.

- [ ] **Step 5: Normalize usage and provider errors**

Populate `GenerateResult.Usage` when Gemini returns token counts. Map 429/5xx as retryable provider errors at the Auto Video service layer; do not encode retry behavior in `GeminiGenerator` itself.

- [ ] **Step 6: Run tests and commit**

```bash
cd apps/server
go test ./internal/ai ./internal/config -run Gemini -v
git add apps/server/internal/ai/gemini* apps/server/internal/config .env.example
git commit -m "feat: add official Gemini AI provider"
```

---

## Task 4: Add official Gemini OAuth token storage and connect/disconnect flow

**Files:**
- Create: `apps/server/internal/database/migrations/9002_auno_ai_credentials.sql`
- Create: `apps/server/internal/models/auno_ai_credentials.go`
- Create: `apps/server/internal/services/aicredentials/service.go`
- Create: `apps/server/internal/services/aicredentials/service_test.go`
- Create: `apps/server/internal/api/handlers/auno_ai_oauth.go`
- Create: `apps/server/internal/api/handlers/auno_ai_oauth_test.go`
- Modify: `apps/server/internal/api/routes.go`
- Modify: application bootstrap dependency wiring

**Interfaces:**
- Consumes: existing server `TokenEncryptor`/crypto service and session/workspace auth.
- Produces endpoints:
  - `GET /api/v1/auno/ai/gemini/oauth/start?workspace_id=...`
  - `GET /api/v1/auno/ai/gemini/oauth/callback`
  - `DELETE /api/v1/auno/ai/gemini/oauth?workspace_id=...`
  - server-side token source factory for `GeminiGenerator`.

- [ ] **Step 1: Write encryption and authorization tests**

Assert DB never stores plaintext access/refresh tokens:

```go
require.NotContains(t, stored.RefreshTokenEncrypted, []byte("refresh-token-plain"))
```

Cross-user/workspace disconnect is denied.

- [ ] **Step 2: Confirm red**

```bash
cd apps/server
go test ./internal/services/aicredentials ./internal/api/handlers -run GeminiOAuth -v
```

- [ ] **Step 3: Add migration**

```sql
CREATE TABLE IF NOT EXISTS auno_ai_credentials (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  workspace_id TEXT NOT NULL,
  provider TEXT NOT NULL,
  access_token_encrypted BLOB NOT NULL,
  refresh_token_encrypted BLOB NOT NULL,
  token_expiry TIMESTAMP,
  scopes TEXT NOT NULL DEFAULT '',
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE UNIQUE INDEX IF NOT EXISTS idx_auno_ai_credentials_owner_provider
ON auno_ai_credentials(user_id, workspace_id, provider);
```

Use migration normalizer conventions if Postgres requires byte-column normalization.

- [ ] **Step 4: Implement authorization URL**

Use Google's official OAuth endpoints and exact scope:

```text
https://www.googleapis.com/auth/generative-language.retriever
```

State payload is server-signed, short-lived, and binds user ID + workspace ID + return path. Request offline access/consent when a refresh token is needed.

- [ ] **Step 5: Implement callback/token refresh**

Exchange authorization code server-side. Encrypt tokens before DB write. Never put token values in URL fragments, logs, browser localStorage, or API JSON.

- [ ] **Step 6: Implement ADC mode separately**

For `AUNO_GEMINI_AUTH_MODE=adc`, use `golang.org/x/oauth2/google` application default credentials with the official Generative Language scope and optional cloud-platform scope. ADC is operator-wide and is not stored in `auno_ai_credentials`.

- [ ] **Step 7: Run tests and commit**

```bash
cd apps/server
go test ./internal/services/aicredentials ./internal/api/handlers ./internal/database/migrations -run 'GeminiOAuth|MigrationChain' -v
git add apps/server/internal/database/migrations/9002_auno_ai_credentials.sql apps/server/internal/models/auno_ai_credentials.go apps/server/internal/services/aicredentials apps/server/internal/api/handlers/auno_ai_oauth* apps/server/internal/api/routes.go
git commit -m "feat: add official Gemini OAuth connection"
```

---

## Task 5: Add the server-side provider router and Gemini/OpenRouter selection

**Files:**
- Create: `apps/server/internal/services/aiproviders/router.go`
- Create: `apps/server/internal/services/aiproviders/router_test.go`
- Modify: server application bootstrap where content AI generator is constructed
- Modify: `apps/server/internal/services/autovideo/planner.go`

**Interfaces:**
- Consumes: AIPreferences, GeminiGenerator, existing OpenRouter generator.
- Produces:
  - `TextGeneratorRouter.Generate(ctx, ProviderRequest) (ai.GenerateResult, ProviderSelection, error)`
  - `ProviderSelection { ProviderID, Model, CostClass, FallbackReason }`.

- [ ] **Step 1: Write exact routing tests**

Cases:

```text
Gemini configured + mode auto + marked free → Gemini first
Gemini 429 + free fallback OpenRouter unavailable → normalized failure
neverUsePaid=true → paid candidate never called
cloud-first → configured cloud candidates before local/headless candidates
invalid credential → do not retry five times; return configuration error
```

- [ ] **Step 2: Confirm red**

```bash
cd apps/server
go test ./internal/services/aiproviders -run Router -v
```

- [ ] **Step 3: Implement router with explicit provider metadata**

Server provider cost class is configuration, not guessed from model name. Define defaults:

```text
Gemini API key/OAuth candidate: cost=unknown unless operator marks free/paid in config
OpenRouter: cost=paid unless configured otherwise
```

When `neverUsePaid=true`, `unknown` may be used only if operator explicitly marks the provider `allow_when_cost_unknown=true`; default false.

- [ ] **Step 4: Record provider manifest into Auto Video sidecar**

For each planner generation store only:

```text
provider id
model
latency ms
token usage if returned
cost class
fallback reason
```

Never store OAuth/API keys or full provider response body.

- [ ] **Step 5: Run tests and commit**

```bash
cd apps/server
go test ./internal/services/aiproviders ./internal/services/autovideo -run 'Router|Planner' -v
git add apps/server/internal/services/aiproviders apps/server/internal/services/autovideo/planner.go apps/server/cmd
git commit -m "feat: route Auto Video text generation across providers"
```

---

## Task 6: Expose AI capability status and routing preferences API

**Files:**
- Create: `apps/server/internal/api/handlers/auno_ai.go`
- Create: `apps/server/internal/api/handlers/auno_ai_test.go`
- Modify: `apps/server/internal/api/routes.go`

**Interfaces:**
- Consumes: AIPreferences service, provider router, Gemini credential service.
- Produces endpoints:
  - `GET /api/v1/auno/ai/status?workspace_id=...`
  - `GET /api/v1/auno/ai/preferences?workspace_id=...`
  - `PUT /api/v1/auno/ai/preferences`

- [ ] **Step 1: Write handler tests**

Status response may contain:

```json
{
  "text": [{ "id":"gemini", "available":true, "auth":"oauth", "cost":"unknown" }],
  "server_transcription": [],
  "server_music": [],
  "degraded": false
}
```

It must never contain API key, access token, refresh token, client secret, or encrypted token bytes.

- [ ] **Step 2: Confirm red**

```bash
cd apps/server
go test ./internal/api/handlers -run AunoAI -v
```

- [ ] **Step 3: Implement and authorize**

Workspace viewer can inspect status/preferences. Only the owning user may change their preferences and OAuth connection.

- [ ] **Step 4: Run tests and commit**

```bash
cd apps/server
go test ./internal/api/handlers -run AunoAI -v
git add apps/server/internal/api/handlers/auno_ai* apps/server/internal/api/routes.go
git commit -m "feat: expose Auno AI status and preferences"
```

---

## Task 7: Build Settings → AI and combine server/browser capability detection

**Files:**
- Create: `apps/web/src/lib/auno-ai/status.ts`
- Create: `apps/web/src/lib/auno-ai/status.test.ts`
- Create: `apps/web/src/lib/components/auno-ai/ai-settings.svelte`
- Create: `apps/web/src/lib/components/auno-ai/provider-card.svelte`
- Create: `apps/web/src/lib/components/auno-ai/model-manager.svelte`
- Modify: `apps/web/src/routes/settings/+page.svelte`
- Modify: `apps/web/src/routes/settings/settings-data.ts`

**Interfaces:**
- Consumes: `/api/v1/auno/ai/status`, preferences API, Gemini OAuth endpoints, OpenPost `inspectLocalAiRuntimes()`, local TTS support methods, ACE-Step support inspection.
- Produces: Settings `AI` tab and unified capability model.

- [ ] **Step 1: Write status-merging tests**

```ts
it('does not mark the app unhealthy when ACE-Step is unavailable', () => {
  const status = mergeAiStatus(serverStatus, { musicPro: { available: false, reason: 'webgpu-unavailable' } });
  expect(status.appReady).toBe(true);
  expect(status.capabilities.musicPro.available).toBe(false);
});
```

- [ ] **Step 2: Confirm red**

```bash
bun --cwd apps/web x vitest run src/lib/auno-ai/status.test.ts
```

- [ ] **Step 3: Implement the AI settings UI**

Sections:

```text
AI Mode
  Auto / Free & Local First / Cloud First
  Never use paid provider automatically

Text & Vision
  Gemini connection / auth mode / status
  OpenRouter status

Voice
  Kokoro / MOSS / Supertonic local support

Transcription
  local engine support
  optional server status

Music
  Music Lite
  ACE-Step WebGPU capability
  optional server status

Models
  loaded/cached local runtimes
```

- [ ] **Step 4: Connect Gemini action**

`Connect Google` navigates to the server OAuth start route. API-key/ADC mode is operator-managed in `.env` and shown read-only as configured; do not put server API-key entry fields in browser UI in V1.

- [ ] **Step 5: Model Manager reuses existing model cache/runtime registry**

Show loaded runtimes via `inspectLocalAiRuntimes()`. Add remove/unload actions using existing `unloadLocalAiRuntime`/cache clearing APIs; do not duplicate browser model caches under an Auno keyspace.

- [ ] **Step 6: Verify and commit**

```bash
bun --cwd apps/web x vitest run src/lib/auno-ai
bun --cwd apps/web run check
git add apps/web/src/lib/auno-ai apps/web/src/lib/components/auno-ai apps/web/src/routes/settings
git commit -m "feat: add Auno AI settings and capability status"
```

---

## Task 8: Add editable TTS generation to Auto Video using existing local engines

**Files:**
- Create: `apps/web/src/lib/auno-ai/tts-router.ts`
- Create: `apps/web/src/lib/auno-ai/tts-router.test.ts`
- Create: `apps/web/src/lib/auno-auto-video/voice-generation.ts`
- Create: `apps/web/src/lib/auno-auto-video/voice-generation.test.ts`
- Modify: `apps/web/src/lib/video-editor/local-ai/tts/registry.ts` only if language metadata must be exposed
- Modify: `apps/web/src/lib/video-editor/auno/auto-video-panel.svelte`

**Interfaces:**
- Consumes: existing `generateLocalSpeech`, local engine support, `commit-generated-audio.ts`, Auto Video scene narration.
- Produces:
  - `selectLocalTtsProvider(language, capabilities)`
  - `generateSceneVoice(scene, options)` returning generated audio asset + metadata.

- [ ] **Step 1: Write router tests**

English default:

```text
Kokoro if supported
→ Supertonic/MOSS if configured and language-compatible
→ no local candidate
```

Do not claim Vietnamese support for an engine unless its actual registry/model metadata confirms it.

- [ ] **Step 2: Confirm red**

```bash
bun --cwd apps/web x vitest run src/lib/auno-ai/tts-router.test.ts
```

- [ ] **Step 3: Generate and commit voice as an editable audio track**

For each scene:

```text
narration text
→ local TTS
→ GeneratedAudio Blob
→ existing commit-generated-audio path
→ native audio timeline item on VOICE track
```

Persist regeneration metadata in Auno sidecar through an API mutation:

```json
{
  "scene_id":"scene-1",
  "kind":"voice",
  "provider":"kokoro-browser",
  "voice":"af_heart",
  "speed":1,
  "language":"en-US",
  "media_id":"...",
  "duration_seconds":3.4
}
```

Do not store Blob data in the sidecar.

- [ ] **Step 4: Reconcile timing after voice generation**

Voice duration becomes authoritative minimum scene duration. Update affected scene/native item timing through project mutations; do not rebuild unrelated scenes.

- [ ] **Step 5: Add editor controls**

Auno panel adds:

```text
Voice
  script
  engine
  voice
  speed
  Regenerate voice
```

Regenerating voice invalidates only voice duration/caption timing and the affected scene duration chain.

- [ ] **Step 6: Verify and commit**

```bash
bun --cwd apps/web x vitest run src/lib/auno-ai/tts-router.test.ts src/lib/auno-auto-video/voice-generation.test.ts
bun --cwd apps/web run check
git add apps/web/src/lib/auno-ai apps/web/src/lib/auno-auto-video apps/web/src/lib/video-editor/auno apps/web/src/lib/video-editor/local-ai/tts
git commit -m "feat: generate editable Auto Video voice tracks"
```

---

## Task 9: Add a Vietnamese TTS license gate and optional VieNeu provider

**Files:**
- Create: `docs/compliance/models/vieneu-tts.md`
- Modify: `docs/compliance/third-party-inventory.md`
- Create: `apps/web/src/lib/auno-ai/vietnamese-tts.ts`
- Create: `apps/web/src/lib/auno-ai/vietnamese-tts.test.ts`
- Optional only when audit passes: `deploy/ai/vieneu/` worker files and server adapter tests

**Interfaces:**
- Consumes: TTS routing contract from Task 8.
- Produces: a documented, test-enforced decision on whether VieNeu weights are allowed as an automatic/bundled provider; optional `vieneu-local` provider only when that decision is affirmative.

- [ ] **Step 1: Audit code and weight licenses before writing provider code**

Record separately:

```text
source repository license
exact model/checkpoint name and version
weight license
commercial use permission
redistribution permission
voice-cloning restrictions / acceptable-use terms
required attribution
checksum/source URL
```

The document must end in one exact machine-readable line:

```text
AUNO_DEFAULT_PROVIDER_ELIGIBLE=yes
```

or

```text
AUNO_DEFAULT_PROVIDER_ELIGIBLE=no
```

No ambiguous prose outcome.

- [ ] **Step 2: Write the gate test**

`vietnamese-tts.test.ts` reads the shipped capability manifest and asserts the runtime may register `vieneu-local` only when eligibility is `yes`.

- [ ] **Step 3: Implement deterministic routing outcome**

If eligibility is `yes`, add VieNeu as an optional local/server provider with language `vi-VN`; if `no`, the router returns no local Vietnamese provider and continues to a configured allowed cloud provider. Do not bypass the gate by silently downloading weights.

- [ ] **Step 4: Voice-cloning behavior stays off by default**

Even when the model supports cloning, Auno V1 registers preset voices only. Voice cloning requires a separate future safety/product design and is not exposed by Auto Video.

- [ ] **Step 5: Run and commit**

```bash
bun --cwd apps/web x vitest run src/lib/auno-ai/vietnamese-tts.test.ts
git add docs/compliance apps/web/src/lib/auno-ai/vietnamese-tts* deploy/ai/vieneu || true
git commit -m "feat: gate Vietnamese TTS by model license"
```

---

## Task 10: Reuse OpenPost local transcription for uploaded media and native captions

**Files:**
- Create: `apps/web/src/lib/auno-auto-video/caption-generation.ts`
- Create: `apps/web/src/lib/auno-auto-video/caption-generation.test.ts`
- Modify: imported transcription registry only to export a stable Auno-consumable facade if necessary
- Modify: `apps/web/src/lib/video-editor/auno/auto-video-panel.svelte`

**Interfaces:**
- Consumes: OpenPost local transcription registry/engine; generated narration metadata from Task 8; native subtitle timeline item types.
- Produces:
  - `captionsFromGeneratedNarration(...)`
  - `captionsFromUploadedMedia(...)`
  - native subtitle items/cues.

- [ ] **Step 1: Write generated-narration caption tests**

Given narration words and segment timing, produce cues without calling ASR:

```ts
expect(captionsFromGeneratedNarration(input).source).toBe('script-timing');
expect(mockTranscriber.calls).toBe(0);
```

- [ ] **Step 2: Write uploaded-media transcription fallback test**

When user media has no transcript:

```text
preferred local engine available → transcribe
preferred engine unsupported language → registry fallback
all local engines unavailable → capability warning, not project failure
```

- [ ] **Step 3: Implement native subtitle insertion**

Use OpenPost subtitle/cue item structures and current subtitle styling preferences. Generated captions live on a dedicated native caption/subtitle track and remain editable.

- [ ] **Step 4: Add editor actions**

```text
Captions
  Generate / Regenerate
  Style
  Export handled by existing editor export path
```

- [ ] **Step 5: Verify**

```bash
bun --cwd apps/web x vitest run src/lib/auno-auto-video/caption-generation.test.ts
bun --cwd apps/web run check
```

- [ ] **Step 6: Commit**

```bash
git add apps/web/src/lib/auno-auto-video/caption-generation* apps/web/src/lib/video-editor/auno apps/web/src/lib/video-editor
git commit -m "feat: generate native Auto Video captions"
```

---

## Task 11: Add optional headless transcription adapter without changing browser defaults

**Files:**
- Create: `apps/server/internal/services/aitranscription/client.go`
- Create: `apps/server/internal/services/aitranscription/client_test.go`
- Create: `deploy/ai/whisper/README.md`
- Create: `deploy/aapanel/docker-compose.ai.yml`
- Modify: `.env.example`

**Interfaces:**
- Consumes: optional `AUNO_TRANSCRIPTION_SERVER_URL`; Auto Video headless worker.
- Produces:
  - `Transcriber.Transcribe(ctx, audio) (Transcript, error)` server interface
  - optional Docker profile service contract: `GET /health`, `POST /transcribe`.

- [ ] **Step 1: Write client tests against `httptest.Server`**

Verify timeout, MIME, max upload, word/segment timestamps, 429/5xx normalization, and no credentials/content in error messages.

- [ ] **Step 2: Confirm red**

```bash
cd apps/server
go test ./internal/services/aitranscription -v
```

- [ ] **Step 3: Implement the server client**

Config:

```text
AUNO_TRANSCRIPTION_SERVER_URL=
AUNO_TRANSCRIPTION_SERVER_TOKEN=
AUNO_TRANSCRIPTION_TIMEOUT_SECONDS=120
```

Empty URL means unavailable; it does not affect app readiness.

- [ ] **Step 4: Define deployment contract instead of baking a large model into Auno image**

`deploy/aapanel/docker-compose.ai.yml` adds `auno-transcribe` only under profile `ai`. The worker image/tag must be pinned in the release manifest to an audited whisper.cpp build; model volume mounts at `/models`. Main app communicates on private Docker network.

`deploy/ai/whisper/README.md` documents the exact API adapter expected. If the selected upstream whisper.cpp server endpoint differs, put a thin audited adapter container in this directory; do not teach Auno core multiple incompatible worker protocols.

- [ ] **Step 5: Verify profile isolation**

```bash
docker compose -f deploy/aapanel/docker-compose.yml -f deploy/aapanel/docker-compose.ai.yml config --services
```

Default without profile must still be `auno-studio` only; `--profile ai` adds transcription service.

- [ ] **Step 6: Commit**

```bash
git add apps/server/internal/services/aitranscription deploy/ai/whisper deploy/aapanel/docker-compose.ai.yml .env.example
git commit -m "feat: add optional headless transcription service"
```

---

## Task 12: Implement lightweight automatic Music Lite with an AI-authored music plan

**Files:**
- Create: `packages/auno-ai/src/music-plan.ts`
- Create: `packages/auno-ai/src/music-plan.test.ts`
- Create: `apps/web/src/lib/auno-ai/music-lite.ts`
- Create: `apps/web/src/lib/auno-ai/music-lite.test.ts`
- Modify: `apps/web/package.json`
- Modify: `apps/server/internal/services/autovideo/planner.go`

**Interfaces:**
- Consumes: storyboard mood/context, existing text AI planner, Web Audio browser runtime.
- Produces:
  - `MusicPlan` structured contract
  - deterministic `renderMusicLite(plan, durationSeconds, seed): Promise<GeneratedAudio>`.

- [ ] **Step 1: Define and test `MusicPlan`**

Exact V1 shape:

```ts
export type MusicPlan = {
  mood: 'luxury' | 'news' | 'corporate' | 'fashion' | 'energetic' | 'minimal' | 'cinematic' | 'calm';
  bpm: number;           // 60–160
  key: string;           // C, Cm, C#, ... validated set
  progression: string[]; // 2–8 roman-numeral chord symbols
  instruments: ('pad' | 'keys' | 'bass' | 'pluck' | 'kick' | 'snare' | 'hat')[];
  intensity: number;     // 0..1
};
```

- [ ] **Step 2: Add strict MusicPlan generation to the existing planner request**

Auto Video planner may emit an optional `musicPlan` at project level. Validate it separately; invalid music plan falls back to a deterministic mood preset and does not reject an otherwise valid storyboard.

- [ ] **Step 3: Add Tone.js as the only new Music Lite runtime dependency**

```bash
cd apps/web
bun add tone
cd ../..
```

Do not add Magenta.js in V1 unless it proves necessary after Tone-based output is tested; the design explicitly permits a lightweight composition approach and YAGNI favors a smaller runtime.

- [ ] **Step 4: Write deterministic render tests**

Mock/offline audio context where necessary and assert same plan+seed yields the same scheduled note event list. Split event scheduling from final PCM rendering so determinism can be unit-tested without brittle waveform snapshots.

- [ ] **Step 5: Implement the renderer**

Pipeline:

```text
MusicPlan
→ deterministic chord/note/drum event list
→ Tone.js instruments/effects
→ OfflineAudioContext render
→ WAV Blob
→ existing generated-audio commit path
```

No vocals/lyrics in Music Lite.

- [ ] **Step 6: Apply automatic ducking metadata**

Insert background music on an editable music track with initial gain below voice. Use existing audio automation/keyframe facilities for voice ducking where available; otherwise set conservative fixed gain in Phase 3 and leave detailed auto-ducking to the editor's existing controls.

- [ ] **Step 7: Verify and commit**

```bash
bun test packages/auno-ai/src/music-plan.test.ts
bun --cwd apps/web x vitest run src/lib/auno-ai/music-lite.test.ts
bun --cwd apps/web run check
git add packages/auno-ai apps/web/package.json bun.lock apps/web/src/lib/auno-ai/music-lite* apps/server/internal/services/autovideo/planner.go
git commit -m "feat: add lightweight automatic background music"
```

---

## Task 13: Integrate existing browser ACE-Step as Music Pro with capability degradation

**Files:**
- Create: `apps/web/src/lib/auno-ai/music-router.ts`
- Create: `apps/web/src/lib/auno-ai/music-router.test.ts`
- Modify: `apps/web/src/lib/video-editor/local-ai/music/ace-step-service.ts` only when an adapter export is required
- Modify: `apps/web/src/lib/video-editor/auno/auto-video-panel.svelte`

**Interfaces:**
- Consumes: `inspectMusicGenerationSupport()`, ACE-Step generation service, Music Lite Task 12.
- Produces: `generateBackgroundMusic({ quality:'lite'|'pro'|'auto', ... })`.

- [ ] **Step 1: Write routing tests**

```text
auto + ACE-Step supported + user asks high quality → ACE-Step
auto + ACE-Step unsupported → Music Lite
pro + ACE-Step unsupported → actionable capability error, project remains usable
lite → never loads ACE-Step
```

- [ ] **Step 2: Confirm red**

```bash
bun --cwd apps/web x vitest run src/lib/auno-ai/music-router.test.ts
```

- [ ] **Step 3: Wrap rather than fork ACE-Step**

Existing ACE-Step service already handles WebGPU capability, model cache, progress, cancellation, and runtime unload. `music-router.ts` calls it through a tiny adapter and falls back to Music Lite. Do not create `auno-ace-step-service.ts` copy.

- [ ] **Step 4: Add editor controls**

```text
Music
  Auto / Lite / Pro
  mood
  duration
  volume
  Regenerate
```

Store prompt/plan/seed/provider metadata in the sidecar and audio asset in the project.

- [ ] **Step 5: Verify and commit**

```bash
bun --cwd apps/web x vitest run src/lib/auno-ai/music-router.test.ts src/lib/video-editor/local-ai/music
bun --cwd apps/web run check
git add apps/web/src/lib/auno-ai/music-router* apps/web/src/lib/video-editor/auno apps/web/src/lib/video-editor/local-ai/music
git commit -m "feat: route Auto Video music between Lite and ACE-Step"
```

---

## Task 14: Extend Auto Video durable pipeline with voice, captions, and music checkpoints

**Files:**
- Modify: `apps/server/internal/services/autovideo/service.go`
- Modify: `apps/server/internal/services/autovideo/service_test.go`
- Create: `apps/server/internal/services/autovideo/media_steps.go`
- Create: `apps/server/internal/services/autovideo/media_steps_test.go`
- Modify: Auto Video API status types

**Interfaces:**
- Consumes: Phase 2 state machine and sidecar; server provider clients; browser-generated asset callback API.
- Produces step order:
  - `extract_content`
  - `generate_storyboard`
  - `resolve_assets`
  - `generate_voice`
  - `align_subtitles`
  - `generate_music`
  - `compile_timeline`
  - `ready`.

- [ ] **Step 1: Change state-machine tests first**

Expected status sequence includes all three new stages. Tests prove music failure can become `music_skipped` and continue to compile, while required voice failure either falls back to another allowed provider or pauses with `waiting_provider` instead of creating corrupt timing.

- [ ] **Step 2: Define browser-assist job semantics**

Interactive generation may reach:

```text
waiting_browser_voice
waiting_browser_captions
waiting_browser_music
```

The browser posts committed asset IDs/timing back through authenticated endpoints, which advance the durable sidecar. A Docker restart during a waiting state preserves the job/project.

Headless generation uses configured server/cloud providers and does not require a browser.

- [ ] **Step 3: Add callback endpoints with idempotency**

```text
POST /api/v1/auno/auto-video/{id}/voice-result
POST /api/v1/auno/auto-video/{id}/caption-result
POST /api/v1/auno/auto-video/{id}/music-result
```

Payload includes `generation_id`; replaying the same generation ID returns the existing accepted result rather than duplicating assets/timeline items.

- [ ] **Step 4: Update progress UI**

Show real pipeline labels:

```text
Reading sources
Writing storyboard
Finding media
Generating voice
Creating captions
Creating music
Building editable timeline
Ready to edit
```

- [ ] **Step 5: Verify and commit**

```bash
cd apps/server && go test ./internal/services/autovideo ./internal/api/handlers -run AutoVideo -v && cd ../..
bun --cwd apps/web x vitest run src/lib/auno-auto-video
bun --cwd apps/web run check
git add apps/server/internal/services/autovideo apps/server/internal/api/handlers/auno_auto_video* apps/web/src/lib/auno-auto-video
git commit -m "feat: add voice caption and music generation stages"
```

---

## Task 15: Add optional server AI worker profile without making it part of app readiness

**Files:**
- Modify: `deploy/aapanel/docker-compose.ai.yml`
- Create: `docs/deployment/ai-workers.md`
- Create: `scripts/check-ai-degraded-readiness.sh`
- Modify: server AI status/readiness tests

**Interfaces:**
- Consumes: optional transcription/TTS/music server endpoints.
- Produces: `--profile ai` / `--profile ai-music` deployment behavior and degraded-capability status.

- [ ] **Step 1: Write degraded-readiness test**

Boot main Auno container with URLs pointing to unavailable optional workers. Assert:

```bash
curl --fail http://127.0.0.1:8080/api/v1/health
curl --fail http://127.0.0.1:8080/api/v1/ready
```

both still succeed while `/api/v1/auno/ai/status` reports those capabilities unavailable.

- [ ] **Step 2: Add optional profile services**

Profiles:

```text
ai       → transcription and optional TTS worker adapter
ai-music → optional remote/server music worker adapter
```

No worker port is published to the host by default; services share only private Docker network.

- [ ] **Step 3: Document resource tiers**

```text
Light: main container; browser/local AI + cloud providers
Local AI: main + ai profile
Full local: main + ai + ai-music on suitable GPU host
Scale: split OpenPost web/worker + Postgres + S3/R2 + remote AI endpoints
```

- [ ] **Step 4: Verify and commit**

```bash
sh scripts/check-ai-degraded-readiness.sh
docker compose -f deploy/aapanel/docker-compose.yml -f deploy/aapanel/docker-compose.ai.yml --profile ai config >/dev/null
git add deploy/aapanel/docker-compose.ai.yml docs/deployment/ai-workers.md scripts/check-ai-degraded-readiness.sh
git commit -m "feat: add optional AI worker deployment profiles"
```

---

## Task 16: Phase 3 end-to-end generation test

**Files:**
- Create: `tests/auno/auto-video-media-ai.spec.ts`
- Modify: `.github/workflows/ci.yml`

**Interfaces:**
- Consumes: complete Phase 3 system.
- Produces: release gate proving editable voice/captions/music and safe provider behavior.

- [ ] **Step 1: Write deterministic E2E with mocked provider network and local-runtime adapters**

Flow:

```text
Create Auto Video
→ fake Gemini structured storyboard
→ local test TTS generates deterministic WAV
→ source timing produces captions without ASR
→ Music Lite produces deterministic generated audio
→ native project opens
→ VOICE track exists
→ subtitle track/items exist
→ MUSIC track exists
→ change narration text
→ Regenerate voice
→ only affected scene voice/caption/timing changes
→ other scene asset IDs unchanged
```

- [ ] **Step 2: Add policy E2E**

Set `neverUsePaid=true`, configure only a paid fake cloud provider, request generation, assert provider was not called and UI shows a configuration/capability message rather than silently charging.

- [ ] **Step 3: Add degraded capability E2E**

Simulate no WebGPU and no server music worker. Music Pro is unavailable, Music Lite remains available, editor and publishing surfaces remain usable.

- [ ] **Step 4: Run the Phase 3 gate**

```bash
bun test packages/auno-ai/src
cd apps/server && go test ./internal/ai ./internal/services/aiproviders ./internal/services/aicredentials ./internal/services/autovideo ./internal/api/handlers -run 'Gemini|AunoAI|AutoVideo' -v && cd ../..
bun --cwd apps/web x vitest run src/lib/auno-ai src/lib/auno-auto-video src/lib/video-editor/local-ai src/lib/video-editor/auno
bun --cwd apps/web run check
bunx playwright test tests/auno/auto-video-media-ai.spec.ts
```

- [ ] **Step 5: Commit**

```bash
git add tests/auno/auto-video-media-ai.spec.ts .github/workflows/ci.yml
git commit -m "test: gate Auto Video AI media generation"
```

---

## Task 17: Phase 3 verification and compliance gate

**Files:**
- Create: `docs/releases/2.0.0-beta.1-phase3-verification.md`
- Modify: `docs/compliance/third-party-inventory.md`

**Interfaces:**
- Consumes: completed Phase 3 branch and all provider/model audit records.
- Produces: evidence required before Phase 4.

- [ ] **Step 1: Verify every shipped AI dependency/model record**

Inventory must state for each enabled/default item:

```text
component/model
exact version/checksum
source URL
code license
weight license
commercial-use status
redistribution status
attribution
whether downloaded automatically
```

Anything not fully audited is not a default/automatic download.

- [ ] **Step 2: Run full repository + Phase 1/2/3 gates**

```bash
bun install --frozen-lockfile
bun run format:check
bun run check
bun run test
cd apps/server && go test ./... && cd ../..
bunx playwright test tests/auno/phase1-foundation.spec.ts tests/auno/auto-video.spec.ts tests/auno/auto-video-media-ai.spec.ts
sh scripts/check-aapanel-compose.sh
sh scripts/check-ai-degraded-readiness.sh
bun scripts/check-third-party-notices.mjs
```

- [ ] **Step 3: Security assertions**

Run secret scanner/CI policy and add focused tests proving:

```text
AI status API contains no credentials
Gemini ProviderError contains no response body or prompt
OAuth callback does not log tokens
browser bundle does not contain configured server Gemini API key
```

- [ ] **Step 4: Record evidence and commit**

```bash
git add docs/releases/2.0.0-beta.1-phase3-verification.md docs/compliance/third-party-inventory.md
git commit -m "docs: record Phase 3 AI verification evidence"
```

Invoke `superpowers:requesting-code-review`, address blocking findings, rerun the gate, then merge before Phase 4.

## Phase 3 Exit Criteria

- Gemini implements OpenPost's existing `ai.Generator` abstraction.
- Gemini supports official API/auth key, official OAuth, and ADC/operator auth modes without Antigravity workarounds.
- Credentials are server-side and encrypted where persisted.
- Routing modes and `Never use paid provider automatically` work and are tested.
- Settings → AI shows combined server/browser capability status without making optional AI part of core readiness.
- Existing OpenPost local TTS engines are reused; generated voice is a native editable audio asset with regeneration metadata.
- Vietnamese local TTS is only exposed if its exact model/license audit passes; voice cloning remains off.
- Generated narration captions use script/timing instead of unnecessary ASR.
- User media transcription reuses OpenPost local Parakeet/Whisper infrastructure with optional headless server fallback.
- Music Lite automatically generates lightweight background music from a structured plan without a huge model download.
- Existing browser ACE-Step is reused as Music Pro; unsupported WebGPU degrades cleanly.
- Auto Video durable pipeline exposes real voice/caption/music stages and survives restarts/waiting-browser states.
- No large AI model is baked into the main Docker image.
- Provider/model licenses are recorded before default/automatic distribution.
- Phase 1/2 regression gates remain green before Phase 4 begins.
