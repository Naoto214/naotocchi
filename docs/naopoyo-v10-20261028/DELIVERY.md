# VERSION 10 delivery provenance

Implementation commit: `5599e8625be4aec49c913a96175d1b021d3dd1f1`.

This evidence commit changes documentation and evidence only. `evidence/validation.json` pins the SHA-256 of each changed implementation/test/build-contract file. The final pushed HEAD/tree, completed GitHub Actions runs, private Sites version/deployment and per-file HTTP SHA-256 comparison are recorded in the updated [Draft PR #436](https://github.com/Naoto214/naotocchi/pull/436), after those operations actually complete. They are not predeclared successful here.

- Puzzle: 808 passed, 0 failed/cancelled/skipped.
- CARD: 412 passed, 0 failed/cancelled/skipped.
- Pages unit: 16 passed. Package+HTTP verification: no missing/hash-mismatched files.
- Audit: 30,528 input attempts; 835 previews matched; 0 gravity-cycle rejections; 10/10 all-rescued witnesses.
- Browser: Chrome iframe viewport checks and direct held drag/Undo, documented in `evidence/browser.json`; this is not physical iPhone Safari QA.
- Runtime: full command launched locally; complete latest-HEAD CI and its results must be checked before claiming all work complete. See PR #436 for final status.

Latest observed main advanced independently from `0e0354b15ee8c29ad7e52dd0ba8c6993df80e643` to `85a59bb3de1cfb473485757bfa7a8b6cb9088034` (menu PR #458). Only menu/docs files changed; no overlapping Chapter 2 physics changes. This work does not merge main or overwrite that work.

The private preview build copies the exact relative runtime dependency graph only. Browser QA harness, reproduction fixture and solution JSON are excluded. Same project ID and owner-only access policy are retained.
