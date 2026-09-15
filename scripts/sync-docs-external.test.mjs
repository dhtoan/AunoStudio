import { describe, expect, test } from "bun:test";
import { normalizeModuleForDocs } from "./sync-docs-external.mjs";

describe("external Nix module documentation", () => {
  test("keeps the public image example on the moving latest tag", () => {
    const source = `
    image = lib.mkOption {
      type = lib.types.str;
      default = "ghcr.io/getopenpost/openpost@sha256:${"a".repeat(64)}";
    };
`;

    const normalized = normalizeModuleForDocs(source);

    expect(normalized).toContain('default = "ghcr.io/getopenpost/openpost:latest";');
    expect(normalized).not.toContain("@sha256:");
  });
});
