<script lang="ts">
  import type { PreviewModel, PreviewPlatform } from "./model";
  import PreviewActions from "./PreviewActions.svelte";
  import PreviewAttachment from "./PreviewAttachment.svelte";
  import PreviewAvatar from "./PreviewAvatar.svelte";
  import PreviewMedia from "./PreviewMedia.svelte";

  interface Props {
    model: PreviewModel;
    platform: Extract<PreviewPlatform, "lemmy" | "piefed">;
    compact?: boolean;
  }

  let { model, platform, compact = false }: Props = $props();
  const primary = $derived(model.segments[0] ?? { id: "primary", text: "" });
  const media = $derived(primary.media?.length ? primary.media : model.media);
  const title = $derived(model.title || primary.text || "Untitled post");
  const body = $derived(
    model.title ? primary.text : (model.subtitle ?? ""),
  );
</script>

<article
  class={["community-preview", `platform-${platform}`, compact && "compact"]}
>
  <header>
    <PreviewAvatar identity={model.identity} size={40} />
    <div class="community-meta">
      {#if model.subtitle}
        <strong class="community-name">{model.subtitle}</strong>
      {/if}
      <span class="author-line">
        {model.identity.displayName} · {model.createdAtLabel}
      </span>
    </div>
  </header>

  <h2>{title}</h2>
  {#if body}
    <p class="post-body">{body}</p>
  {/if}
  {#if model.card}
    <PreviewAttachment card={model.card} {platform} />
  {/if}
  {#if media.length > 0}
    <PreviewMedia media={media.slice(0, 1)} layout="single" />
  {/if}

  <PreviewActions {platform} {compact} />
</article>

<style>
  .community-preview {
    --native-bg: #fff;
    --native-surface: #f6f7f8;
    --native-fg: #1a1a1b;
    --native-muted: #7c7c7d;
    --native-border: #e5e5e6;
    width: min(100%, 40rem);
    overflow: hidden;
    border: 1px solid var(--native-border);
    border-radius: 0.5rem;
    background: var(--native-bg);
    color: var(--native-fg);
    font-family:
      -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial,
      sans-serif;
  }

  .community-preview header {
    display: flex;
    align-items: center;
    gap: 0.6rem;
    padding: 0.75rem 1rem 0;
  }

  .community-meta {
    display: flex;
    flex-direction: column;
    gap: 0.1rem;
    min-width: 0;
  }

  .community-name {
    overflow: hidden;
    font-size: 0.8rem;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .author-line {
    color: var(--native-muted);
    font-size: 0.75rem;
  }

  .community-preview h2 {
    margin: 0;
    padding: 0.6rem 1rem 0;
    font-size: 1.05rem;
    line-height: 1.35;
  }

  .post-body {
    margin: 0;
    padding: 0.5rem 1rem 0;
    font-size: 0.9rem;
    line-height: 1.5;
    white-space: pre-wrap;
  }

  .community-preview :global(.preview-actions) {
    border-top: 1px solid var(--native-border);
    margin-top: 0.75rem;
  }
</style>
