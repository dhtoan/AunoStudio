import assert from "node:assert/strict";
import test from "node:test";

import { publishedProviderAssetSlugs } from "./asset-surfaces.ts";
import {
  backendProviderCatalog,
  providerCountCopyProblems,
  validateProviderCatalogFacts,
} from "./provider-catalog-facts.mjs";

test("extracts literal and constant-backed providers from the Go catalogue", () => {
  const source = `
const mastodonProvider = "mastodon"

var providerCatalog = []ProviderInfo{
  {Platform: "x"},
  {Platform: mastodonProvider},
}

func next() {}
`;
  assert.deepEqual(backendProviderCatalog(source), ["x", "mastodon"]);
});

test("rejects public total copy that drifts from the catalogue", () => {
  assert.deepEqual(
    providerCountCopyProblems(
      "Preview nine platforms. Ten social networks are available.",
      10,
      "copy.md",
    ),
    ['copy.md says "Preview nine platforms"; canonical provider count is 10'],
  );
});

test("published provider assets stay aligned with the backend catalogue", async () => {
  const source = await import("node:fs/promises").then(({ readFile }) =>
    readFile(new URL("../apps/server/internal/api/handlers/oauth.go", import.meta.url), "utf8"),
  );
  assert.deepEqual(new Set(publishedProviderAssetSlugs), new Set(backendProviderCatalog(source)));
});
