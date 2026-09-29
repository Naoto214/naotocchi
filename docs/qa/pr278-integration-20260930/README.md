# PR #278 main integration QA — 2026-09-30 JST

This directory records an isolated ordinary merge of main `05b31dfd4c2c2ebecc5890ffc2a23efbcfd1d032` into Expression `544c585a11efc383643d292a313042660fe14264` (tree `79bb613ddb99f55a0c2ecfbbb40b45fd2d64b00c`) on `integration/pr278-main-20260930`. No rebase/force push, main write, Ready/PR merge, artwork generation, migration, or aesthetic review is authorized.

## Meaning-preserving resolutions

| File | Resolution |
| --- | --- |
| index.html | C: Expression/emotion loaders and styles + main boot rescue, ARIA and current dependencies. Existing bump-versions tool synchronizes asset-content tokens. No image bytes changed. |
| package.json | C: union of both parents' formal test commands (123 file invocations, including 3 introductory scripts). Main sharp dependency and lock retained; npm ci passed. |
| script.js | C: main hatch infinite guard before Expression clear; life charm rescue before actual death clear; Expression stop plus minigame history management; exactly-once offline processing before emotion sync and explicit portrait redraw. |

Audited 9 diff3 ranges correspond to7 conflict blocks in this git ort merge: adjacent index ranges are coalesced (4→2); package1 and script4 remain. This is not a missing conflict.

Auto-merged checkpoint keeps both histories; dialog-layout-probe keeps Expression fallback bounds and main start checks; runtime-harness keeps Expression APIs/modules and main deterministic/session/registry controls; home-conversation-browser keeps fallback bounds and main V2 fixtures/route guards. `semantic-audit.json` records the pre-test audit.

## Additional changes required by validation

- Preview generation reuses one VM runtime while creating 248 independent fresh states; resolves reproducible heap exhaustion caused by retaining 248 enlarged runtimes.
- Short tab return redraws the current Expression even when no offline delta triggers render. One red/green regression added. Existing test expectations unchanged.
- Removed extra empty EOF lines in two incoming main documents solely for diff --check.
- See `failure-analysis.md` and `review.md`; failed/intermediate logs remain as history, not final success evidence.

## Final verification evidence

**Terminal result: npm test 2780 PASS / 0 FAIL / 0 SKIP; focused 1306 / 0 / 0; main regression 211 / 0 / 0.** The three introductory npm test scripts also passed.

Final official suite: `npm-test-verified.log` and `.exit`; final focused: `focused-verified.log`; final main regression: `main-regression-verified.log`. These supersede initial and intermediate runs. `verification-summary.json` holds terminal counts once gates complete.

`image-baseline.json` records fresh SHA256 and Git blob IDs before merge for 3289 images. `image-verification.json` checks all 3289, 2932 PNG, 248 normal assets and approved26 (including final antlion08 ten and published provenance). No image difference accepted. All remaining character PNG are included; no new image generation.

`save-compatibility.json`: all 248 generated schema5 states load with correct line/stage/name/expression/hunger. Existing formal tests additionally cover legacy schema, corrupt saves, migration, recovery, backup, saveRevision, pendingGrandGoal and session takeover. No new migration or ID/category changes.

`site-mechanical.json`: all 248 sheets regenerated in memory from production assets; 31 lines, 248 hunger assignments, 19 categories, 15 food icons; preview references checked without a missing path. No Site publication or renewed human approval.

`placement.json`: all 248 placements match approved Expression source;247 retained and mushroom07 approved B[-23,-9]. `names.log` checks 8 known name-regression cases; 248 save fixtures verify every stage label. `z-order.log` verifies body→sweat→representative mark.

`home-smoke.json`: Chromium 153 real runtime, memory-only preview saves, 10 states and hatch/infinite guard/rescue/death/short-tab return. Official boot-rescue/back-navigation browser logs cover rescue and back through menus/meguru/minigame. WebKit was unavailable locally and is explicitly skipped in those browser logs; this is not a WebKit pass. Dependency binaries are outside the repo; use NODE_PATH for Playwright and PW_CHROMIUM for an executable when reproducing the QA smoke.

`main-preservation.json`: all main-only existing files were exact before the two documented whitespace cleanups; one main deletion also retained. Main RH-11 TEXT_STYLE alias note is retained explicitly. Expression documents/resolvers/manifests/provenance remain protected.

## Handoff constraints

Only after terminal local gates and review are green may this exact merge commit be saved to the isolated remote branch and fast-forwarded to the existing Expression branch. Fresh remote heads/tree/PR/Actions/checks/statuses must then be checked. Draft/open/unmerged remain required. Remote verification is reported after push; it cannot be included self-referentially in this commit.

General same-URL image-cache/publication architecture remains a separate unresolved RH-11-related item. Human Expression approval remains complete. No additional size/pixel/beauty gate has been introduced.

Logs that contained trailing whitespace have readable whitespace-normalized `.log` copies and byte-exact `.log.raw.gz` originals. No test output content was removed.
