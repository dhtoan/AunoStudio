---
name: cuelume
description: Add or audit OpenPost interaction sounds with Cuelume. Use for UI sound wiring, duplicate or missing cues, sound preferences, and semantic success or error feedback.
---

# Cuelume in OpenPost

Use the pinned `cuelume` package for short browser interaction sounds. The official agent guide is [cuelume-site.pages.dev/agents.md](https://cuelume-site.pages.dev/agents.md).

## OpenPost rules

- Keep `soundPreferences` as the single owner of `bind()`, `setEnabled()`, persistence, and imperative playback.
- Put declarative cues in shared UI components. Route-specific markup should add a cue only when no shared control owns the interaction.
- Emit one gesture cue per completed action. Use `data-cuelume-toggle="release"` for an ordinary button click so pointer, touch, and keyboard activation share one event.
- Let the most specific control own a composed interaction. A dropdown, popover, tab, checkbox, radio, or select trigger uses `toggle`; its child Button must not add another event type.
- Use `tick` for light navigation and menu choices, `toggle` for state changes and tabs, and `release` for ordinary actions.
- Call `soundPreferences.play('success')` or `play('error')` only after a user-started operation reaches that outcome. Keep autosave, passive refresh, text entry, and background work quiet.
- Keep the visible sound preference. Sound must never replace a label, state change, notice, or error message.

## API

```ts
import { bind, play, setEnabled, setVolume, sounds, type SoundName } from 'cuelume';
```

- `bind(root?)` installs delegated handlers and is idempotent per root.
- `play(name, { volume }?)` plays an imperative cue and fails silently when audio is unavailable.
- `setEnabled(enabled)` and `setVolume(volume)` change future playback. OpenPost owns persistence.
- Declarative attributes are `data-cuelume-hover`, `data-cuelume-press`, `data-cuelume-release`, and `data-cuelume-toggle`.

## Verify

For every changed interaction:

1. Add a browser component test that asserts the owning element has one declarative event attribute.
2. Test pointer and keyboard activation, the muted preference, and rapid repeated use.
3. Check composed triggers for stacked attributes from different event types.
4. Exercise the real route in a browser and confirm one audible cue, the visible state change, and a clean console.
5. Run the frontend type, lint, test, UI consistency, and build gates in proportion to the change.
