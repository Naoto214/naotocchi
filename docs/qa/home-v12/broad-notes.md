# Home v12 broad verification

The broad run began at **2026-10-24 03:18:27 UTC** while root was still editing Home layout and density behavior. It therefore records integration findings rather than a frozen final release result.

## Inputs and execution

- Materialized the unmodified `character-3d` tree with sparse checkout.
- Restored 2,974 missing runtime asset files from the existing v11 private-site source only after each file's Git blob hash matched current HEAD. Restored the remaining 17 asset source/metadata files directly from HEAD.
- Rechecked all **2,991 tracked asset files** against HEAD: **zero missing files or hash mismatches**. Exact results are in `logs/full-suite-asset-verification.json`.
- Restored specifically referenced missing documentation, original reference images and nested legacy-review metadata from HEAD. No broad documentation/image directory download was performed. Path inventories are in the `full-suite-*inputs.json` logs.
- `NODE_OPTIONS=--test-concurrency=2` is rejected by this Node runtime. Instead, every `package.json` test segment is run in its original order with explicit `node --test --test-concurrency=2` for Node test-runner commands. Ordinary smoke/dialogue/visual-QA scripts run unchanged. The runner continues after a failed segment so no later tests are silently excluded.
- Commands, UTC start/end times and exit codes are recorded in `logs/full-suite-results.json`; complete output is split into `logs/full-suite-01.log` through `full-suite-09.log`.
- No test assertions, application source, generated version tokens or unrelated files were changed by this verification task. Root independently changed the v8 exact size expectation to match the requested 85% rendering scale and fixed the small-cast arrival sizing regression.

## Findings during the run

The initial Home segment reported two density-related assertions while root's layout work was in progress: `new terrain cast size is constant when visitors arrive and leave` (147.56 versus 112.1456) and `all 26 registered companions and a partner still visit one at a time; formal maximum is 2` (149.6 versus 176). Root owns the implementation correction and final compatible-size verification.

The broad general segment initially reported three missing legacy-review-input failures in `character-3d-rollout-inventory-test.cjs`. After exact HEAD input restoration, that entire file passed **6/6** in `logs/full-suite-input-rerun.log`.

Two version-token assertions went red because application source was being changed during integration. Root must regenerate version tokens after final source edits and verify them. No assertion was relaxed or bypassed.

## Completed run

All nine package segments completed at **2026-10-24 03:37:02 UTC**. The run used the package test command captured at its start; newly added v12 regression files are validated separately by the integration task.

| Segment | Coverage | Result |
| --- | --- | --- |
| 1 | Existing Home suites | 140 passed / 142; 2 mid-edit sizing assertions |
| 2 | Individuality | 26 / 26 passed |
| 3 | Social expression and relationship free life | 24 / 24 passed |
| 4 | Smoke script | Passed |
| 5 | Dialogue script | Passed |
| 6 | Visual-QA route script | Passed; no browser rendering claimed |
| 7 | General gameplay, world, art, assets, saves and integration | 3,220 passed / 3,225; 5 known failures below |
| 8 | Relationship/conversation suites | 138 / 138 passed |
| 9 | Full conversation rollout | 9 / 9 passed |

**Total: 3,564 Node tests, 3,557 passed, 7 failed, 0 skipped, 0 cancelled, 0 TODO**, plus three passing standalone scripts. The initial run is intentionally retained as red evidence. It is not a claim that a single frozen final-source full run passed.

The seven failure names and dispositions are:

| Failure | Classification and closure |
| --- | --- |
| `new terrain cast size is constant when visitors arrive and leave` | Real intermediate layout regression; root reported removing the small-cast density shrink. Final-source verification belongs to root. |
| `all 26 registered companions and a partner still visit one at a time; formal maximum is 2` | Existing exact 176px expectation conflicted with requested 85% sizing. Root reported changing the precise expectation to 149.6px while retaining all other assertions; final-source verification belongs to root. |
| `every script and stylesheet carries a token whose hash matches the file (bump-versions formula)` | Source edits made version tokens stale; regenerate and rerun after final edits. |
| `the real index.html and references turn red when a token goes stale, a token is dropped or a path changes case` | Same stale-token integration state; regenerate and rerun after final edits. |
| `legacy coverage references the reviewed rightmost four tiles without claiming raw photos or later gates` | Missing exact HEAD review input at initial execution; restored. Entire file rerun passed 6/6. |
| `legacy coverage rejects unreviewed, missing, changed, or wrongly mapped boards` | Same missing-input cause; entire file rerun passed 6/6. |
| `legacy board reuse requires the exact companion model at stage zero` | Same missing-input cause; entire file rerun passed 6/6. |

No further failures appeared in the complete run. The long phase 3B regional tests were executed without reduction or exclusion; those simulations explain most of segment 7's 17-minute duration. Browser rendering, real iPhone behavior, and card-game/naopoyo follow-up regressions remain root-owned checks.


## Focused closure and external-game regressions

The final-source `home-household-test.cjs` rerun passed **21/21**, closing the intermediate arrival/departure sizing regression. Root owns the separate final v8, version-token and v12 regression reruns; these are deliberately not duplicated here.

After root merged current main into the Draft branch at `9a5e3be62ceb6804b2ba4708e7e905d9cc001446`, the following nonbrowser checks ran unchanged:

| Check | Result | Evidence |
| --- | --- | --- |
| Official chapter 1, every `*.test.mjs` | **88/88 passed** | `logs/final-chapter1-merged.log` |
| Existing rescue, every `*.test.mjs` | **205/205 passed** | `logs/final-rescue-restored.log` |
| CARD GAME, every `*.test.mjs` | **411/412 passed**, one unavailable historical-input audit | `logs/final-card-restored.tap` |
| Publication unittest discovery | **16/16 passed** | `logs/final-publication-merged.log` |
| Home household sizing closure | **21/21 passed** | `logs/final-household-closure.log` |

The one remaining CARD GAME failure is `regeneration is deterministic and read-only in check mode`. Its unchanged catalog-builder test invokes the historical `check-design-data.py --catalog` pipeline, which stops with `ValueError: Expected one document for 35: []`. The sparse checkout lacks that numbered historical document and the larger archived checkpoint pipeline. This is an unavailable-input result, not evidence that regeneration succeeds or that a gameplay regression exists. No failing test was skipped, relaxed or altered. Root explicitly bounded this Home task to direct reference restoration, rather than rebuilding hundreds of historical card-pipeline files.

All **36 restored direct catalog/rulebook/sprite references, historical-source snapshots and helper files** match merged HEAD Git blob hashes, with zero mismatches (`logs/card-reference-verification.json`). The premerge card design-style assertion is corrected by the existing PR #435 changes brought in by root; the postmerge card suite has only the archival-input failure above. The source tampering/determinism test added by PR #435 passes.

The merge reapplied sparse-checkout exclusions and removed the earlier materialized assets. They were restored again from the v11 site source only after exact merged-HEAD blob matching: 2,974 copies plus 17 tracked metadata/source inputs. The intermediate missing-PNG rescue run is retained in `logs/final-rescue-merged.log`; the complete restored-input rerun passes 205/205. This task made no application or test-source changes and used no browser or Sites preview.

## Current-main divergence audit

Read-only comparison of base `e7fef44b` to reviewed remote main `92ac6546` (PR #435) showed exactly three paths changed by both main and the premerge Home branch: `index.html`, `script.js`, and `tools/pages/allowlist.json` (`logs/main-divergence-audit.json`). Remote main did not modify any `home-*` model, layout or navigation file.

The divergence was material to whole-site integration: main promotes the Naopoyo portal to chapter 1, reads its separately saved progress through `conversation-away.js` and `script.js`, extends the runtime publication allowlist, and repairs card design-source/appearance audits. A wholesale premerge branch deployment would have retained the old official portal and omitted those newer integrations. The Home v12 motion/layout implementation itself had no corresponding remote-file changes.

Root subsequently merged main into the Draft branch, resolving the cache-token and allowlist overlap while retaining both applications. Chapter 1 and publication results above validate that merged branch's nonbrowser entry/release contracts. No production branch merge or production deployment was performed by this verification task. Browser appearance, touch behavior and full historical card regeneration remain outside these reported results.
