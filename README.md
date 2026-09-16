<div align="center">
  <h1>Auno Studio</h1>
  <p><strong>AI-native content creation, motion design, and social publishing in one self-hosted workspace.</strong></p>
  <p>Turn ideas, documents, links, images, and footage into editable videos and channel-ready content.</p>

  <p>
    <a href="https://github.com/dhtoan/AunoStudio/releases"><img alt="GitHub release" src="https://img.shields.io/github/v/release/dhtoan/AunoStudio?display_name=tag&include_prereleases&sort=semver&style=flat-square"></a>
    <a href="https://github.com/dhtoan/AunoStudio/actions/workflows/auno-phase4-release.yml"><img alt="Release gate" src="https://github.com/dhtoan/AunoStudio/actions/workflows/auno-phase4-release.yml/badge.svg?branch=main"></a>
    <a href="LICENSE"><img alt="License" src="https://img.shields.io/github/license/dhtoan/AunoStudio?style=flat-square"></a>
    <a href="https://github.com/dhtoan/AunoStudio/stargazers"><img alt="GitHub stars" src="https://img.shields.io/github/stars/dhtoan/AunoStudio?style=flat-square"></a>
  </p>

  <p>
    <a href="https://github.com/dhtoan/AunoStudio/releases">Releases</a>
    · <a href="apps/docs/content/docs/index.mdx">Documentation</a>
    · <a href="apps/docs/content/docs/self-hosting/index.mdx">Self-hosting</a>
    · <a href="https://github.com/dhtoan/AunoStudio/issues">Issues</a>
  </p>
</div>

## Create without losing control

Auno Studio brings AI-assisted creation into a native editing workflow. Generated content remains editable, so a first draft can become a finished production without leaving the workspace.

| | Capability | What it does |
|---|---|---|
| <img src="assets/brand/features/ideas.svg" width="40" alt=""> | **Auno Auto Video** | Builds an editable video project from a prompt, document, URL, media selection, or structured idea. |
| <img src="assets/brand/features/video-editor.svg" width="40" alt=""> | **Documentary & Vox Style** | Turns research into ideas, scripts, timed beats, evidence-aware visuals, voice chunks, and motion compositions. |
| <img src="assets/brand/features/automation.svg" width="40" alt=""> | **Auno Motion Engine** | Applies reusable motion language and deterministic compositions while keeping timing and creative controls editable. |
| <img src="assets/brand/features/image-editor.svg" width="40" alt=""> | **Photo & Video Editors** | Combines layers, multitrack timelines, captions, transitions, effects, audio, and export tools. |
| <img src="assets/brand/features/compose.svg" width="40" alt=""> | **Publishing** | Adapts, previews, schedules, and publishes content across connected social channels. |
| <img src="assets/brand/features/workspaces.svg" width="40" alt=""> | **Connected Workspace** | Keeps media, accounts, calendars, inboxes, analytics, automations, and collaborators together. |

## Built for editable output

AI output should be a starting point, not a locked render. Auno Studio creates native project state that can be refined in the editor: rearrange scenes, rewrite copy, retime voice, replace media, change motion, and export again.

- **Source-aware workflows** — carry evidence and creative intent from research into the final sequence.
- **Deterministic motion** — reproduce compositions consistently while preserving manual control.
- **Production continuity** — move from generation to editing, review, scheduling, and publishing in one system.
- **Self-hosted ownership** — run the application and retain control of project data and media.

## Get started

### Use a release

Download the latest supported source bundle from [GitHub Releases](https://github.com/dhtoan/AunoStudio/releases). This first public release is an alpha prerelease; review the [self-hosting documentation](apps/docs/content/docs/self-hosting/index.mdx) and validate it in your environment before production use.

### Run the development workspace

Requirements: [Bun 1.3.11](https://bun.sh/), Go, and the platform dependencies reported by the project doctor.

```bash
git clone https://github.com/dhtoan/AunoStudio.git
cd AunoStudio
bun install --frozen-lockfile
bun run doctor
bun run dev
```

Useful commands:

```bash
bun run check
bun run test
bun run build
```

## Technology

Auno Studio uses Go for the application backend and media services, with SvelteKit and TypeScript for the web experience. Bun powers the JavaScript workspace. SQLite and local media storage provide a simple self-hosted default, with PostgreSQL and S3-compatible storage available for larger deployments.

## Release status

`v1.0.0-alpha.1` is the first public prerelease of Auno Studio. It introduces the Auno-owned Auto Video, documentary, Vox Style, and Motion Engine workflows alongside the integrated editing and publishing workspace.

Alpha releases may include breaking API, configuration, or migration changes. Pin the exact release version, keep backups, and test upgrades before using them with important projects.

## Contributing

Bug reports and focused proposals are welcome through [GitHub Issues](https://github.com/dhtoan/AunoStudio/issues). Before opening a report, include the version, deployment method, reproduction steps, expected result, and relevant logs with secrets removed.

## License

Auno Studio is distributed under the [GNU Affero General Public License v3.0 only](LICENSE). Third-party components retain their respective licenses and notices; see [NOTICE.md](NOTICE.md) and the [licenses directory](licenses/README.md).
