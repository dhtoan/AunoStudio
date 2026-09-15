import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { cp, mkdir, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

const repository = fileURLToPath(new URL("..", import.meta.url));
for (const surface of ["web", "marketing", "docs"]) {
  test(`${surface} build receives source-map credentials through Turbo's strict environment`, async (t) => {
    const root = await mkdtemp(path.join(tmpdir(), "openpost-build-environment-"));
    t.after(() => rm(root, { recursive: true, force: true }));
    const application = path.join(root, "apps", surface);
    await mkdir(application, { recursive: true });
    await writeFile(
      path.join(root, "package.json"),
      JSON.stringify({
        name: "build-env-fixture",
        private: true,
        packageManager: "bun@1.3.11",
        workspaces: ["apps/*"],
      }),
    );
    await writeFile(path.join(root, "bunfig.toml"), "");
    await cp(path.join(repository, "turbo.json"), path.join(root, "turbo.json"));
    await cp(
      path.join(repository, "apps", surface, "turbo.json"),
      path.join(application, "turbo.json"),
    );
    await writeFile(
      path.join(application, "package.json"),
      JSON.stringify({ name: `fixture-${surface}`, scripts: { build: "node build.cjs" } }),
    );
    await writeFile(
      path.join(application, "build.cjs"),
      'require("node:fs").writeFileSync("received.json", JSON.stringify({ enabled: process.env.POSTHOG_SOURCEMAPS_ENABLED, credential: process.env.POSTHOG_PERSONAL_API_KEY }));',
    );
    execFileSync("bun", ["install", "--lockfile-only", "--ignore-scripts"], {
      cwd: root,
      stdio: "pipe",
    });
    execFileSync(
      path.join(repository, "node_modules", ".bin", "turbo"),
      ["run", "build", "--env-mode=strict", "--force"],
      {
        cwd: root,
        stdio: "pipe",
        env: {
          ...process.env,
          POSTHOG_SOURCEMAPS_ENABLED: "1",
          POSTHOG_PERSONAL_API_KEY: "fixture-upload-credential",
        },
      },
    );
    assert.deepEqual(JSON.parse(await readFile(path.join(application, "received.json"), "utf8")), {
      enabled: "1",
      credential: "fixture-upload-credential",
    });
  });
}
