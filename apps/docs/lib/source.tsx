import { defineDocs } from "fumadocs-mdx/macro";
import { loader } from "fumadocs-core/source";
import { openapiPlugin } from "fumadocs-openapi/server";
import { icons } from "lucide-react";
import { createElement } from "react";

const providerIcons: Record<string, string> = {
  linkedin: "/assets/logos/linkedin.svg",
  x: "/assets/logos/x.svg",
  youtube: "/assets/logos/youtube.svg",
  tiktok: "/assets/logos/tiktok.svg",
  pinterest: "/assets/logos/pinterest.svg",
  facebook: "/assets/logos/facebook.svg",
  instagram: "/assets/logos/instagram.svg",
  threads: "/assets/logos/threads.svg",
  bluesky: "/assets/logos/bluesky.svg",
  telegram: "/assets/logos/telegram.svg",
  mastodon: "/assets/logos/mastodon.svg",
  pixelfed: "/assets/logos/pixelfed.svg",
  peertube: "/assets/logos/peertube.svg",
  lemmy: "/assets/logos/lemmy.svg",
  piefed: "/assets/logos/piefed.svg",
  discord: "/assets/logos/discord.svg",
};

const serviceIcons: Record<string, string> = {
  casaos: "/assets/logos/casaos.svg",
  coolify: "/assets/logos/coolify.svg",
  docker: "/assets/logos/docker.svg",
  dockge: "/assets/logos/dockge.svg",
  dokploy: "/assets/logos/dokploy.svg",
  nixos: "/assets/logos/nixos.svg",
  portainer: "/assets/logos/portainer.svg",
  zimaos: "/assets/logos/zimaos.png",
};

const clientIcons = new Set([
  "antigravity",
  "chatgpt",
  "claude",
  "codex",
  "cursor",
  "devin",
  "gemini",
  "github-copilot",
  "grok",
  "hermes",
  "openclaw",
  "opencode",
  "perplexity",
  "vscode",
]);
const monochromeClients = new Set([
  "chatgpt",
  "cursor",
  "devin",
  "github-copilot",
  "grok",
  "opencode",
]);

const docs = defineDocs({ dir: "content/docs" });
export const source = loader({
  baseUrl: "/",
  source: docs.toFumadocsSource(),
  plugins: [openapiPlugin()],
  icon: documentationIcon,
});

export function documentationIcon(name: string | undefined) {
  if (name && clientIcons.has(name))
    return (
      <img
        src={`/clients/${name}.${name === "hermes" ? "png" : "svg"}`}
        alt=""
        width={16}
        height={16}
        className={
          monochromeClients.has(name)
            ? "docs-client-icon docs-client-monochrome"
            : "docs-client-icon"
        }
      />
    );
  if (name && providerIcons[name])
    return (
      <img src={providerIcons[name]} alt="" width={16} height={16} className="docs-provider-icon" />
    );
  if (name && serviceIcons[name])
    return (
      <img src={serviceIcons[name]} alt="" width={16} height={16} className="docs-service-icon" />
    );
  if (name && name in icons) return createElement(icons[name as keyof typeof icons]);
}
