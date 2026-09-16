import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import test from "node:test";

const workflowPath = ".github/workflows/auno-container-release.yml";

test("stable Auno tags publish a verified GHCR image and latest alias", () => {
  assert.ok(existsSync(workflowPath), `${workflowPath} must exist`);

  const workflow = readFileSync(workflowPath, "utf8");

  assert.match(workflow, /permissions:\n  contents: read\n  packages: write/u);
  assert.match(
    workflow,
    /\^v\(0\|\[1-9\]\[0-9\]\*\)\\\.\(0\|\[1-9\]\[0-9\]\*\)\\\.\(0\|\[1-9\]\[0-9\]\*\)\$/u,
  );
  assert.match(workflow, /group: auno-container-release-ghcr-io-dhtoan-aunostudio/u);
  assert.match(workflow, /cancel-in-progress: false/u);
  assert.match(workflow, /bun run build -- frontend/u);
  assert.match(workflow, /--platform linux\/amd64/u);
  assert.match(workflow, /--file deploy\/docker\/Dockerfile/u);
  assert.match(workflow, /--build-context frontend_artifact=apps\/server\/cmd\/openpost\/public/u);
  assert.match(
    workflow,
    /scripts\/smoke-production-image\.sh "\$candidate" "\$GITHUB_SHA" "\$GITHUB_REF_NAME"/u,
  );
  assert.match(workflow, /release_ref="\$\{IMAGE_NAME\}:\$\{GITHUB_REF_NAME\}"/u);
  assert.match(
    workflow,
    /version_ref="\$\{IMAGE_NAME\}:\$\{\{ steps\.version\.outputs\.version \}\}"/u,
  );
  assert.match(workflow, /latest_ref="\$\{IMAGE_NAME\}:latest"/u);
  assert.match(workflow, /latest_digest="\$\(docker buildx imagetools inspect/u);
  assert.match(workflow, /\[\[ "\$latest_digest" == "\$release_digest" \]\]/u);
  assert.match(workflow, /org\.opencontainers\.image\.version/u);
  assert.match(workflow, /org\.opencontainers\.image\.revision/u);

  const actionUses = [...workflow.matchAll(/^\s*- uses:\s*(\S+)/gmu)].map((match) => match[1]);
  assert.ok(actionUses.length > 0, "the workflow must use pinned release actions");
  for (const action of actionUses) {
    assert.match(action, /@[a-f0-9]{40}$/u, `${action} must be pinned to a full commit SHA`);
  }

  const smoke = workflow.indexOf("scripts/smoke-production-image.sh");
  const firstPush = workflow.indexOf("docker push");
  assert.ok(smoke >= 0 && firstPush > smoke, "the image must pass smoke tests before publication");
});
