import assert from "node:assert/strict";
import test from "node:test";
import { spawnSync } from "node:child_process";
import { copyFileSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { requireConventionalCommitMessage, selectWorkflowRun } from "./release-lifecycle.mjs";

test("local preparation and workflow selection share lifecycle decisions", () => {
  assert.equal(
    requireConventionalCommitMessage("feat(release): deepen lifecycle\n\nBody"),
    "feat(release): deepen lifecycle",
  );
  assert.throws(() => requireConventionalCommitMessage("release work"), /Conventional Commit/u);
  assert.deepEqual(
    selectWorkflowRun(
      [
        {
          databaseId: 12,
          attempt: 2,
          headBranch: "main",
          status: "queued",
          conclusion: null,
        },
      ],
      { workflow: "CI", branch: "main", revision: "abc" },
    ),
    { id: "12", attempt: 2 },
  );
  assert.throws(
    () =>
      selectWorkflowRun(
        [
          {
            databaseId: 12,
            attempt: 2,
            headBranch: "main",
            status: "completed",
            conclusion: "failure",
          },
        ],
        { workflow: "CI", branch: "main", revision: "abc" },
      ),
    /CI failed for abc/u,
  );
});

for (const localCommits of [0, 2]) {
  test(`release preparation checks ${localCommits} local commits before staging or pushing`, () => {
    const directory = mkdtempSync(path.join(tmpdir(), "openpost-release-preparation-"));
    try {
      mkdirSync(path.join(directory, "scripts"));
      mkdirSync(path.join(directory, "apps/mobile"), { recursive: true });
      mkdirSync(path.join(directory, "changes"));
      mkdirSync(path.join(directory, "packages/changelog/src"), { recursive: true });
      copyFileSync(
        "packages/changelog/src/index.js",
        path.join(directory, "packages/changelog/src/index.js"),
      );
      for (const file of [
        "release.mjs",
        "check-mcp-registry.mjs",
        "mobile-release.mjs",
        "release-command-environment.mjs",
        "release-lifecycle.mjs",
        "release-surfaces.mjs",
        "prepare-release-changelog.mjs",
        "merge-changelog-fragments.mjs",
        "changelog-fragments.mjs",
      ]) {
        copyFileSync(`scripts/${file}`, path.join(directory, "scripts", file));
      }
      const originalChangelog = "# Changelog\n\n## [Unreleased]\n\n## [1.0.0] - 2026-01-01\n";
      const fragment = "### Fixed\n\n- Preserve this release note after a failed check.\n";
      writeFileSync(path.join(directory, "CHANGELOG.md"), originalChangelog);
      writeFileSync(path.join(directory, "changes/fix.md"), fragment);
      writeFileSync(
        path.join(directory, "apps/mobile/app.json"),
        JSON.stringify({ expo: { version: "0.2.0", android: { versionCode: 2 } } }),
      );
      writeFileSync(
        path.join(directory, "apps/mobile/package.json"),
        JSON.stringify({ name: "mobile", version: "0.2.0" }),
      );
      // Keep the real preparation and file generation, replacing only external processes and HTTP.
      writeFileSync(
        path.join(directory, "preload.mjs"),
        `import { appendFileSync, readFileSync, existsSync } from "node:fs";
      const spawn = Bun.spawnSync.bind(Bun);
      globalThis.fetch = async () => new Response("{}", { status: 200 });
      Bun.spawnSync = (argv) => {
        const command = argv.join(" ");
        appendFileSync("commands.jsonl", JSON.stringify(argv) + "\\n");
        let stdout = "";
        let exitCode = 0;
        if (command === "git branch --show-current") stdout = "main";
        else if (command === "git status --porcelain") stdout = " M source.ts";
        else if (command === "git rev-list --left-right --count HEAD...origin/main") stdout = "${localCommits}\\t0";
        else if (command === "git tag --list v* --sort=-v:refname") stdout = "v1.0.0";
        else if (command.startsWith("git tag --points-at")) stdout = "";
        else if (command.startsWith("git ls-tree")) stdout = "apps/mobile/app.json";
        else if (command.startsWith("git show")) stdout = JSON.stringify({ expo: { version: "0.2.0", android: { versionCode: 2 } } });
        else if (command.startsWith("gh repo view")) stdout = "WRITE";
        else if (command.startsWith("gh secret list")) stdout = "DEPLOY_WEBHOOK_SECRET";
        else if (command === "bun scripts/next-release-version.mjs v1.0.0") stdout = "v1.0.1";
        else if (command === "bun scripts/prepare-release-changelog.mjs v1.0.1") return spawn(argv);
        else if (command === "bun run check") {
          const mobile = JSON.parse(readFileSync("apps/mobile/app.json", "utf8"));
          if (mobile.expo.android.versionCode !== 3) throw new Error("Candidate was checked before preparation");
          if (existsSync("changes/fix.md") || !readFileSync("CHANGELOG.md", "utf8").includes("Preserve this release note")) throw new Error("Candidate changelog was not prepared");
          exitCode = 42;
        }
        else if (command.startsWith("git add") || command.startsWith("git push")) throw new Error("Unchecked candidate reached Git mutation");
        else if (!(command.startsWith("bash -lc command -v") ||
          command.startsWith("gh auth") || command.startsWith("gh workflow") ||
          command.startsWith("git fetch") || command.startsWith("bun run check --") ||
          command === "bun run capture:product-screenshots" || command === "bun run doctor" ||
          command === "bun install --frozen-lockfile" ||
          command === "bun scripts/prepare-release-changelog.mjs v1.0.1")) throw new Error("Unexpected command: " + command);
        return { exitCode, stdout: Buffer.from(stdout), stderr: Buffer.from("") };
      };`,
      );
      const result = spawnSync(
        "bun",
        ["--preload", "./preload.mjs", "scripts/release.mjs", "prepare", "fix: candidate"],
        { cwd: directory, encoding: "utf8", timeout: 10_000 },
      );
      assert.equal(result.status, 1, result.stderr);
      const commands = readFileSync(path.join(directory, "commands.jsonl"), "utf8")
        .trim()
        .split("\n")
        .map((line) => JSON.parse(line));
      assert.ok(commands.some((argv) => argv.join(" ") === "bun run check"));
      assert.ok(
        !commands.some(
          ([tool, action]) => tool === "git" && ["add", "commit", "push"].includes(action),
        ),
      );
      assert.equal(readFileSync(path.join(directory, "changes/fix.md"), "utf8"), fragment);
      assert.equal(readFileSync(path.join(directory, "CHANGELOG.md"), "utf8"), originalChangelog);
    } finally {
      rmSync(directory, { recursive: true, force: true });
    }
  });
}
