import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const repositoryRoot = new URL("../", import.meta.url);

test("release containers persist the diagnostics installation identity", async () => {
  const [dockerfile, documentation] = await Promise.all([
    readFile(new URL("deploy/docker/Dockerfile", repositoryRoot), "utf8"),
    readFile(new URL("docs/reference/configuration/diagnostics.md", repositoryRoot), "utf8"),
  ]);
  const setting = "OPENPOST_DIAGNOSTICS_STATE_FILE=/data/diagnostics-installation-id";
  assert.match(dockerfile, new RegExp(`^ENV ${setting}$`, "mu"));
  assert.match(documentation, new RegExp(`^${setting}$`, "mu"));
});
