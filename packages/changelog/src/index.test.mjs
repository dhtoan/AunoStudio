import assert from "node:assert/strict";
import test from "node:test";

import {
  parseChangelog,
  prepareReleaseChangelog,
  releaseNotesForTag,
  validateChangelog,
} from "./index.js";

const sample = `# Changelog

## [Unreleased]

### Changed

- Shared one control system.

## [1.2.3] - 2026-07-27

### Fixed

- Repaired the release.
`;

test("parses release sections and groups", () => {
  assert.deepEqual(parseChangelog(sample), [
    {
      label: "Unreleased",
      date: "",
      intro: [],
      groups: [{ title: "Changed", items: ["Shared one control system."] }],
    },
    {
      label: "1.2.3",
      date: "2026-07-27",
      intro: [],
      groups: [{ title: "Fixed", items: ["Repaired the release."] }],
    },
  ]);
  assert.deepEqual(validateChangelog(sample), []);
});

test("moves Unreleased into the target version", () => {
  const prepared = prepareReleaseChangelog(sample, "v1.2.4", "2026-07-28");
  assert.match(prepared, /## \[Unreleased\]\n\n## \[1\.2\.4\] - 2026-07-28/u);
  assert.match(prepared, /## \[1\.2\.3\] - 2026-07-27/u);
  assert.equal(
    releaseNotesForTag(prepared, "v1.2.4"),
    "## Changed\n\n- Shared one control system.",
  );
});

test("merges late fragments into an already prepared version", () => {
  const prepared = prepareReleaseChangelog(sample, "v1.2.4", "2026-07-28");
  const withLateChanges = prepared.replace(
    "## [Unreleased]",
    `## [Unreleased]

### Changed

- Kept linked edits together.

### Added

- Published the Android app.`,
  );
  const updated = prepareReleaseChangelog(withLateChanges, "v1.2.4", "2026-07-28");

  assert.equal(updated.match(/^## \[1\.2\.4\]/gmu)?.length, 1);
  assert.deepEqual(validateChangelog(updated), []);
  assert.equal(
    releaseNotesForTag(updated, "v1.2.4"),
    [
      "## Changed",
      "",
      "- Kept linked edits together.",
      "- Shared one control system.",
      "",
      "## Added",
      "",
      "- Published the Android app.",
    ].join("\n"),
  );
  assert.equal(prepareReleaseChangelog(updated, "v1.2.4", "2026-07-28"), updated);
  assert.doesNotMatch(updated, /\n\n$/u);
});

test("rejects empty and malformed release preparation", () => {
  assert.throws(
    () =>
      prepareReleaseChangelog(
        "# Changelog\n\n## [Unreleased]\n\n## [1.2.3] - 2026-07-27\n",
        "v1.2.4",
        "2026-07-28",
      ),
    /has no entries/u,
  );
  assert.throws(
    () => prepareReleaseChangelog(sample, "latest", "2026-07-28"),
    /stable release tag/u,
  );
});
