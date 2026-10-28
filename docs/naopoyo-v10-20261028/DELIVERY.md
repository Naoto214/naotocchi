# VERSION 10 delivery provenance

Implementation commit: `5599e8625be4aec49c913a96175d1b021d3dd1f1`.

This evidence commit changes documentation and evidence only. `evidence/validation.json` pins the SHA-256 of each changed implementation/test/build-contract file. The final pushed HEAD/tree, completed GitHub Actions runs, private Sites version/deployment and per-file HTTP SHA-256 comparison are recorded in the updated [Draft PR #436](https://github.com/Naoto214/naotocchi/pull/436), after those operations actually complete. They are not predeclared successful here.

- Puzzle: 808 passed, 0 failed/cancelled/skipped.
- CARD: 412 passed, 0 failed/cancelled/skipped.
- Pages unit: 16 passed. Package+HTTP verification: no missing/hash-mismatched files.
- Audit: 30,528 input attempts; 835 previews matched; 0 gravity-cycle rejections; 10/10 all-rescued witnesses.
- Browser: Chrome iframe viewport checks and direct held drag/Undo, documented in `evidence/browser.json`; this is not physical iPhone Safari QA.
- Runtime: full local `npm test` exited 0 (3,432 Node assertions across its four suites, plus smoke/dialogue/visual checks). Latest-HEAD CI is recorded in PR #436 after completion.

Latest observed main advanced independently from `0e0354b15ee8c29ad7e52dd0ba8c6993df80e643` to `85a59bb3de1cfb473485757bfa7a8b6cb9088034` (menu PR #458). Only menu/docs files changed; no overlapping Chapter 2 physics changes. The branch now incorporates this main commit without conflicts; it does not merge into main or overwrite the parallel work. Chapter 1, Chapter 2 and v2 runtime bytes are identical to the pre-integration V10 HEAD.

The private preview build copies the exact relative runtime dependency graph only. Browser QA harness, reproduction fixture and solution JSON are excluded. Same project ID and owner-only access policy are retained.

## Concurrent-main CI correction

At GitHub HEAD `a609b8ee641c38496331396337b0b14e4f152d8d`, two PR CI jobs failed the same pre-existing publication assertion after main PR #458 added `class="menu-label"` to the title span. Reproduced locally on the merged tree: 16 tests, one failure at `test_public_entry_has_one_official_destination`. The assertion now parses link text and checks exactly one official destination, allowing decorative wrappers/classes. All 16 tests pass; none were removed or skipped.

The concurrent main menu change also left reviewed SHA-256 entries for `index.html` and `ui.css` stale. Reviewed the two files and updated only those digests; package validation remains strict. No menu code, Chapter 1 code or production deployment workflow is changed by this correction. The main incorporation keeps the separate author’s menu implementation and other committed main work intact. The V10 runtime files remain byte-identical to `a609b8ee`.
