# Auno Studio Notices

Auno Studio Web 2.0 includes and modifies software from third-party open-source projects.

## OpenPost

Auno Studio is based on and modifies OpenPost:

- Source: https://github.com/getopenpost/openpost
- Imported foundation commit: `d18b313e48ebd7311188d23c33044a9e9f1f77b7`
- License: GNU Affero General Public License v3.0 only (AGPL-3.0-only)

The OpenPost license is preserved at the repository root as `LICENSE` and under `licenses/openpost/LICENSE`.

Auno Studio's OpenPost-derived application code is distributed subject to the applicable AGPL-3.0-only requirements. This notice does not replace the license text or legal review for a particular deployment/distribution model.

## Bang Motion

Auno Studio's Auno Motion Engine adapts selected motion-design principles and may contain substantially derived implementation ideas from Bang Motion:

- Source: https://github.com/bangtutorial/bang-motion
- Pinned reference commit: `0f1bd1103835890354496d009af62885fe0a05d5`
- License: MIT
- Copyright: Copyright (c) 2026 Bang Tutorial

The exact pinned upstream reference snapshot is preserved under `third_party/bang-motion/` for provenance and review. The Bang Motion MIT notice is preserved both in that snapshot and at `licenses/bang-motion/LICENSE`. Production runtime imports do not depend on the vendored reference tree: Auno Motion runtime code lives under Auno-owned modules such as `packages/auno-motion/`, and the Bang Motion standalone HTML deliverable is not the Auno Studio project format.

## AI/media models and runtimes

AI/media models listed in the Auno Studio architecture are not considered newly bundled merely because they appear in a design document. Code and model-weight licenses must be recorded in `docs/compliance/third-party-inventory.md` before Auno adds new bundled weights, automatic downloads, or release artifacts beyond capabilities already inherited from the imported OpenPost foundation.
