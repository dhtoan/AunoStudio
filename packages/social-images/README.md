# OpenPost social previews

This package owns social metadata and stable image URLs for the marketing and documentation sites. Every page gets a static card at `/og/<page-key>.png`; the route catalog defines marketing keys and docs paths define documentation keys.

`scripts/generate-social-images.mjs` creates the 1200 x 630 PNGs during each site build. It uses the maintained route title, the OpenPost mark, and a small route-specific motif. Provider and self-hosting pages use the matching logo from `assets/logos/` when available. The editable generic compositions stay in `assets/brand/` as design references.

`scripts/social-images/catalog.mjs` keeps the small docs-page catalog in sync with Markdown headings. Asset synchronization refreshes it automatically; `bun run check -- social-images` rejects stale catalog metadata.

Run the focused checks from the repository root:

```sh
bun run check -- social-images
bun run build -- marketing
bun run build -- docs
```

Inspect representative generated cards after changing the renderer, then run the focused checks above. Do not commit generated `apps/marketing/static/og/` or `apps/docs/public/og/` output.
