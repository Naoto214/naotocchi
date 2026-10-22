# PR #417 final release preflight (2026-10-22)

This is a preflight checkpoint, not a claim that the release has completed. Final CI, full-suite counts, merge and deployment outcome will be recorded in PR #417's description against the exact validated HEAD. The owner explicitly authorized conditional merge and production publication on 2026-10-22, superseding earlier trial-only delivery instructions.

## Authoritative inputs and merge

- Main: `7cb799420f9795b2bcf72d5a1a4d1abd2b406e94`, tree `d56a118b5c9d8603d253a8c78f2bd7ae4b4d3c54`.
- Original PR HEAD: `961e0ce811f5d768aacfa78b5e4143a02f3135bc`, tree `d8457ef3eb97cb25f07103cd9e09772f59525f1d`.
- GitHub reported `mergeable=false`, `mergeable_state=dirty`; local merge reproduced four actual conflicts. This was not inferred from Draft status or CI.
- Resolve `index.html` by loading both individuality modules and the already-merged minigame reactions before script.js; refresh only the changed script token.
- Resolve `package.json` by keeping all latest-main test commands and prepending the two individuality suites.
- Resolve `script.js` by retaining one individuality result adapter plus main's reaction hold/source capture, after the unchanged quick early return.
- Resolve the Pages allowlist hashes after retaining the reviewed union of runtime sources. No new publication mechanism.
- #414, #415 and #418 are already merged. No other open PR is merged or imported. Against main, no changes to games.js, quick.js, character-3d or any prototypes.

## Verification completed before candidate push

- Individuality core/runtime: 26/26, including the corrected quick test.
- Previous quick test called `startMinigame` on raw microgame definitions (without start methods), so it passed without completing games. Adding a completed-count assertion reproduces failure: 0 != 50. Corrected test uses `startQuickRun(id)` for all 50 solo wrappers plus mixed run, asserts 51 completions and unchanged individuality. This fixes test evidence, not production quick behavior.
- Focused safety/integration run: 200 pass and one file-level termination under concurrent full-suite memory pressure. The terminated save-compat suite passes all 24 tests, including 200 seeded corrupt-save mutations, when rerun alone. Do not report the terminated run as green. The environment cgroup recorded OOM kills.
- Earlier six image-QA missing-file failures do not reproduce in a complete checkout: the legacy package manifest and three starfish candidate PNGs are tracked with identical blob IDs in original PR and latest main. Related 262 tests pass with zero failures. Candidate PNGs equal published runtime masters byte-for-byte. No image or test expectation was changed.
- Accelerated tick-handler lifecycle: maintain health, clear transformation offers, invoke 2,000 ticks, choose each pending event once and reject repeat choices. Exactly 12 choices; midlifeSeen=[44,50,56,62,66]; age=100; stage=farewell. This is not wall-clock gameplay or natural encounter-frequency proof.
- Existing Pages packaging/HTTP verification: 4,038 files / 213,189,972 bytes, four entry points, 452 card IDs / 904 card images, zero missing files and hash mismatches. Private individuality QA hook/panel/builder/docs are not in the published artifact.
- Independent read-only review found no major functional safety blocker in the merged result adapter, harness integration, event lifecycle, official-ID progress counting, save boundaries or romance/transform preservation.

## Release gates still pending at this checkpoint

Fresh full `npm test` on original PR, latest main and integrated candidate; failure classification and any necessary resource-controlled repeats; latest-HEAD GitHub CI; final main/head identity check; conditional Draft removal and merge; existing Pages deployment; public asset/boot checks.

The original PR's 12 CI successes plus one skipped deployment are historical evidence only. Main has no branch protection or required contexts configured, but this release still requires applicable CI checks to succeed.

## Browser and device scope

Owner reported generally good iPhone Safari play, not exhaustive checklist completion. Local Chromium was unavailable and the cloud browser could not reach the local test server. Browser-only layout, tapping, reload, background return and multi-tab evidence must be described precisely. iPhone hardware operations remain unverified unless the owner explicitly confirms them. Runtime tests and HTTP inventory are not substitutes for claiming hardware QA.
