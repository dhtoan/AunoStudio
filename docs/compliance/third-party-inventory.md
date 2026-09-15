# Third-party and model inventory

This file is the release-facing inventory for code, model weights, and external runtimes intentionally added to Auno Studio beyond ordinary package-manager dependency metadata.

| Component | Source | Code license | Model/weight license | Redistribution | Commercial status | Attribution / release status |
| --- | --- | --- | --- | --- | --- | --- |
| OpenPost | https://github.com/getopenpost/openpost @ `d18b313e48ebd7311188d23c33044a9e9f1f77b7` | AGPL-3.0-only | N/A | Subject to AGPL terms | Allowed subject to license obligations | **Bundled foundation**. Preserve license/source obligations and notices. |
| Bang Motion | https://github.com/bangtutorial/bang-motion @ `0f1bd1103835890354496d009af62885fe0a05d5` | MIT | N/A | MIT notice required for copied/substantially derived code | Permissive | **Pinned integrated reference** for Auno Motion Engine principles. License stored at `licenses/bang-motion/LICENSE`; runtime lives in Auno-owned modules. |
| Kokoro / kokoro-js | upstream package/model sources used by imported OpenPost | Audit package + model separately | Must be recorded before new Auno redistribution | Pending Auno model audit | Pending model audit | OpenPost already contains integration code. Do not add new bundled weights until audit is recorded. |
| VieNeu-TTS | candidate upstream project/model | Candidate source reported Apache-2.0; re-check at integration commit | Must audit exact selected weight/model card | Pending | Pending | Candidate only; not bundled by Auno Studio at this checkpoint. |
| ACE-Step | implementation already present in imported OpenPost plus upstream runtime/model project | Audit exact shipped runtime/package | Audit exact selected model weights | Pending release audit | Pending release audit | Reuse imported OpenPost integration first; do not silently add server-side weights. |
| whisper.cpp / Whisper models | optional future headless transcription | Audit exact source revision | Audit exact model weights | Pending | Pending | Browser/local OpenPost transcription remains preferred for V1. |
| Magenta.js / Tone.js | possible Music Lite option | Audit exact package versions when added | Audit any selected pretrained checkpoints separately | Pending | Pending | Not bundled at this checkpoint. |

## Release rule

A component cannot move from “candidate/evaluation” to bundled/automatic-download status until the table records the exact source/revision, code license, exact model/weight license when applicable, redistribution terms, commercial-use status, and required attribution.

Known non-commercial model weights are excluded from the default commercial Auno Studio workflow unless a later explicit licensing decision changes that scope.
