<div align="center">

<img src="icon.svg" width="120" alt="Bang Motion icon">

# Bang Motion

**An agent skill for building motion graphics in the browser — product openers and promos, bumpers and idents, channel intros, kinetic typography, lower thirds, and explainers.**

[![Version](https://img.shields.io/badge/version-1.0.0-2f6fd6?style=flat-square)](CHANGELOG.md)
[![License: MIT](https://img.shields.io/badge/license-MIT-3fa34d?style=flat-square)](LICENSE)
[![Agent Skills](https://img.shields.io/badge/format-Agent%20Skills-1c2a4a?style=flat-square)](#install)
[![Works with](https://img.shields.io/badge/works%20with-Claude%20Code%20%C2%B7%20Codex%20%C2%B7%20Gemini%20CLI%20%C2%B7%20Cursor-7a5af5?style=flat-square)](#install)

Output is a single `index.html` — double-click to play. Autoplay, loop, no player chrome.

</div>

---

## Why

Ask an AI agent for "a video" and you usually get **slides**: one section per idea, a photo, a title, a fade between them.
Bang Motion encodes what a working motion designer would insist on — one continuous world, a camera that actually moves, a subject that persists across scenes, numbers that live inside the scene instead of floating on top — as **structural checks an agent can verify in its own code**, backed by starters that make the right architecture the path of least resistance.

## What you get

- **General motion graphics, not just explainers**: openers, promos, bumpers, idents, intros, kinetic typography, titles — with a shared camera rig, deterministic timeline, and anti-slide rules.
- **Style born from the theme, never from the starter or the reference**: a required style brief fixes the palette (from the brand), a display face with character, the background surface, the background motion, the transitions, and a motion signature — each picked from a menu, each required to differ from the previous project. References contribute rhythm, not skin.
- **Menus, not defaults**: every place where an agent tends to grab the cheapest option (a dark nebula, streaks sliding sideways, a flat block wiping the frame, a pill with a sparkle) is replaced by a menu — eight style directions, eleven background motions, six background surfaces, nine transitions, six highlight shapes — and a rule that the same choice may not repeat across projects.
- **Five explainer styles**, each with its own starter: cartoon collage · visual journalism · white catalog · vintage sketch · continuous action (pure vector).
- **One rig, two motion modes**: a flowing world (parallax strips, one hero, world objects sweeping past) or a collage the camera travels through (push-through → glide → settle).
- **Instrument catalog** so the viewpoint keeps changing: map simulation, speedometer cab, elevation profile, map race, cabin interior, head-on approach.
- **Hard anti-slide checks**: no fading `<section>`s, a visual through-line, at most two text levels, motion every second, varied transitions.
- **Sane defaults**: 16:9, no captions, no player, autoplay + loop; `?debug=1` for a scrub bar, `?clean=1` for export.
- **Voice-over workflow**: the agent hands you the script, you record or generate it, send the audio back, and the timeline is re-timed to your voice — with a browser-only pause detector when ffmpeg isn't installed.
- **Deterministic timeline**: every frame is a pure function of time, so scrubbing is exact and frame-by-frame export drops nothing.

## The five styles

| Style | Look | Best for |
|---|---|---|
| **Cartoon collage** | cream paper, flat illustration cutouts, hand-written notes, colored highlight pills | science, education |
| **Visual journalism** | black, real photos with source tags, yellow highlighter, dashed annotations | news, current issues |
| **White catalog** | white grid, photo cutouts, mixed typography, scribbles | products, brands |
| **Vintage sketch** | sepia paper, engraving-style art, classic serifs, rust annotations | history, biography |
| **Continuous action** | flowing vector world, one subject that never leaves, numbers inside the world, changing viewpoints | speed, routes, processes |

## Quick start

**An opener:** *"Make a 30-second opener for my note-taking app, here's the logo."*
The agent writes a style brief (palette from your logo, a display font with character, one background language, a motion signature), a scene rundown, and only then the code. Two different products never come out wearing the same look.

**An explainer:** *"Make an explainer about the Whoosh high-speed train."*
1. It asks **one** question: style (five options + a recommendation), aspect ratio, duration, sound.
2. You get `index.html` (open it — it just plays) plus the voice-over script.
3. Record or generate the VO with any voice, send the audio back → the agent syncs the video to it.

## Install

Bang Motion follows the open **Agent Skills** layout: a folder with `SKILL.md` (frontmatter + instructions), `references/`, `assets/`, `scripts/`. It also ships as a Claude Code **plugin**, so it can be installed and updated with two commands.

### As a plugin (Claude Code)

```
/plugin marketplace add bangtutorial/bang-motion
```
```
/plugin install bang-motion@bang-motion
```

The skill then shows up in your skill list and stays updatable with `/plugin marketplace update bang-motion`.

### Manual (any agent)

```bash
git clone https://github.com/bangtutorial/bang-motion
```

| Agent | Where it goes |
|---|---|
| Claude Code | `~/.claude/skills/bang-motion` (Windows: `C:\Users\<you>\.claude\skills\bang-motion`) |
| Codex CLI | your Codex skills folder, or add to `AGENTS.md`: *"For motion graphics / explainers, read and follow `bang-motion/SKILL.md`."* |
| Gemini CLI · Cursor · others | copy into the project and reference `SKILL.md` from `GEMINI.md`, `.cursor/rules`, or the system prompt |
| Plain chat (no agent) | paste `SKILL.md` + `references/explainer.md` as instructions; attach a starter from `assets/` |

The skill triggers on requests like "make an explainer…", "promo video…", "opener…", or a complaint that a web animation "looks like PowerPoint".

## Requirements

| To… | You need |
|---|---|
| **Watch** the result | a browser + internet (GSAP and fonts load from CDN). Nothing else. |
| Verify frames automatically | Node + puppeteer (`scripts/snap.mjs`) — optional; `?debug=1` works by hand |
| Export MP4 | Node + puppeteer + ffmpeg (`scripts/export-frames.mjs`) — optional |
| Sync to voice-over | ffmpeg, **or** nothing: `scripts/vo-pauses.html` detects pauses in the browser |

A deliverable never requires `npm install` to be watched.

## How the rules work

- **Style brief first**: theme, brand palette, display font, background surface, background motion, transitions, motion signature, one special moment — approved before any code; the opener starter is deliberately grey, with every WebGL color bound to the CSS tokens, so leftovers are obvious.
- **Free expression inside the rules**: the rules lock structure, contrast, and novelty — not taste. Rich gradients, light, 3D depth, texture, and bold color are encouraged; only the cheapest repeated default is banned. When two options both pass, pick the braver one.
- **Living typography, obedient background**: sentence case at medium weight, one highlighted keyword per line (the highlight shape is chosen per project, not inherited), punctuation popping last, size and entry direction alternating — over a background that stays dark (or light) under the text instead of competing with it.
- **Structural bans** the agent checks in code before delivering: scenes change because the world or camera moves, not because a section fades; a subject or shared world persists; at most two text levels; background motion comes from a chosen language rather than objects streaking past; at least two transition types with one in real depth (no flat blocks wiping the frame); the background is layered, never flat; explainers start from the style's starter.
- **Viewpoint must change**: no three consecutive scenes from the same angle; each fact gets its own instrument.
- **Camera choreography**: close-up → glide → zoom out → hold; text appears only after the zoom-out finishes.
- **Every named entity is shown**: people, companies, places, and products get a picture in their scene.
- **Readable on phones**: no text under 30 px on a 1080-wide stage.

Full detail lives in `SKILL.md` and `references/`.

## Layout

```
SKILL.md                     rules & workflow (read by the agent)
.claude-plugin/              plugin + marketplace manifests (Claude Code install)
references/
  anti-ppt.md                real rejected patterns → fixes
  explainer.md               five styles, camera recipes, VO re-timing
  architecture.md            stage, camera rig, determinism, export
  techniques.md              motion blur, split text, transitions
assets/
  starter.html               opener / promo (GSAP + Three.js)
  starter-explainer.html     continuous action (vector world)
  starter-explainer-*.html   cartoon · journalism · catalog · sketch
scripts/
  snap.mjs                   verify: capture key seconds
  export-frames.mjs          export: frame-by-frame PNG → MP4
  vo-pauses.html             VO pause detection, no ffmpeg needed
  serve.py                   no-cache dev server (optional)
```

## Contributing

Issues and pull requests are welcome. The rules here come from real revisions on real projects — if you add one, say which failure it prevents. Bump `version` in `SKILL.md` and add a line to `CHANGELOG.md`.

## License

[MIT](LICENSE) © 2026 [Bang Tutorial](https://youtube.com/bangtutorial)