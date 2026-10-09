# Repeated scene post-warmup save contract

Base: `0be70751e0896388e46a33969bef51c15dcdb3ae`.
Head: `8afb11402d850558e29e742887f381fa7434b051`.
Worktree: `/workspace/scratch/150320e8a2fd/rollout-runtime-post-warmup-save-contract`.
Local commit only; no remote, capture, production/runtime/model, gallery or workflow changes.

## Actual cause and scope

Inspected the actual recovered f07 `meguru-qa.json` before editing. Its old whole-span verdict remains FAIL (`unchanged save`); no raw file was changed. Only warmup/city records a normal `enterWorld → loadMapRecords → seedMapRecords → saveState` commit: writes20→23, in backup/writer/primary order. The exact whole-span state delta adds empty city marks/paths/zones, revision6→7 and savedAt. All38 synchronous draw/flag proofs are clean. All three later cycles plus cleanup have writes23→23 and empty state/storage/call deltas. This demonstrates a known setup change, not a presentation mutation.

Raw source: main `docs/qa/character-3d-full-v0/export/f07fef280059b41e6ab22c2475b0cc5fd3c7c9ca/scene-save-and-native-metrics-diagnostic/meguru/meguru-qa.json` (501718bytes; SHA256 `bce649d5e8feb3e616fce90306f9dff1c434e74e786242a83cd0506e5056d42d`). Source FAIL retained. Fresh browser scene verdict remains **OPEN**.

## Changes

Four QA files:
- `tools/character-3d/runtime-integration.cjs`: retain initial whole-span raw snapshots/deltas/calls and `initialUnchanged`; record setup before/after and freeze strict save baseline after actual warmup. Node `validateSceneSetup` accepts genuinely unchanged setup or only missing empty city map entries, one revision increment, advancing savedAt, exactly three normal ordered commit calls with seed/load/enter provenance, unchanged writer/other storage, exact previous-save backup and natural city stored primary. Unknown fields, storage, calls or incomplete provenance fail. Derived diagnostic deltas match JSON serialization when an absent `before` is omitted; raw state/storage is never normalized or reset.
- `validateRepeated` still enforces exact roster/readiness/resource/hidden-city/cleanup gates. Every synchronous boundary is fatal if dirty, even when later restored. Three strict cycles and cleanup compare raw state/storage/getter/write counters, and individual cycle phases allow only deliberate region placement. Draw/flag/step/region restoration remains fatal.
- `tests/character-3d-runtime-scene-diagnostics-test.cjs`: browser callback fixture exercises recorded one-time seed, later recurring writes, unknown warmup/provenance/storage, incomplete evidence, dirty restored boundary, temporary asynchronous phase mutation and failed adapter restoration. Callback results serialize as actual browser/JSON results do.
- `tests/character-3d-runtime-integration-test.cjs`: pure resource-gate fixture supplies required setup, synchronous and strict phase evidence; old resource negative cases retained.
- `tools/character-3d/runtime-integration-remove-it.cjs`: five new bounded controls, existing diagnostic scope includes them; two prior observability test-name anchors updated for the renamed positive setup test.

## Focused evidence

All commands run in the worktree. Logs/scripts are under `/workspace/scratch/150320e8a2fd/`.

| Command | Result | Log |
| --- | --- | --- |
| `node --test tests/character-3d-runtime-scene-diagnostics-test.cjs tests/character-3d-runtime-save-boundary-test.cjs` |21PASS,0FAIL|`runtime-post-warmup-final.log`|
| `node --test --test-name-pattern='repeated scene gate' tests/character-3d-runtime-integration-test.cjs` |1PASS,0FAIL|`runtime-post-warmup-repeated.log`|
| `node tools/character-3d/runtime-integration-remove-it.cjs --scene-save-contract-only` |5/5 meaningful assertion RED, exact restore, focused GREEN|`runtime-post-warmup-controls.log`|
| `node tools/character-3d/runtime-integration-remove-it.cjs --scene-save-observability-only` |4/4 affected observability controls RED, exact restore, GREEN|`runtime-post-warmup-observability-controls.log`|
| `node /workspace/scratch/150320e8a2fd/runtime-post-warmup-f07-audit.cjs` |Actual raw setup accepted by new contract; initial FAIL/bytes retained; strict23→23 replay and38clean proofs|`runtime-post-warmup-f07-audit.log`|
| `node /workspace/scratch/150320e8a2fd/runtime-post-warmup-identity-audit.cjs` |14unchanged exported function bodies exact, production diff empty|`runtime-post-warmup-identity-audit.log`|
| `git diff --check 0be70751e0896388e46a33969bef51c15dcdb3ae HEAD` |exit0; clean worktree|commit verification output|

TDD RED baseline: `runtime-post-warmup-before.log` contains the three meaningful old-contract failures (known setup seed incorrectly rejected; no explicit setup proof; dirty-restored constituent boundary incorrectly permitted). Early fixture-development and serialization logs are not final gates.

The five new mutator controls remove/change: postwarmup baseline timing; setup validator; dirty-restored boundary guard; draw/flag restoration guard; per-phase state-placement guard. Every control changes only the QA script and restores its exact bytes. Final restored script SHA256 `45fe3afb7406298808113ae2fd7d7f2b5fb12e4fb7bea54a02e07c087072d8ea`.

The read-only f07 audit reconstructs the postwarmup raw snapshot from actual initial raw plus actual warmup delta/storage writes, verifies it equals the actual final raw after all recorded clean cycles, then evaluates the new contract. This is a recorded-data replay, not a new browser run or new source PASS. The original document and FAIL remain untouched.

Unchanged exact-function audit covers functionalRows, validateFunctional, validateCityCache, installSaveCounter, functionalRun, saveDelta, saveSnapshot, observeSaveBoundary, recordFunctionalResult, retainRepeatedResult, repeatScene, installAppearanceProbe, appearanceWindows, isolatedAnimation. Existing production45 actual PASS can be reused; no45 sweep or images rerun. Production/Pilot/World/Home/save implementations are untouched.

## Remaining gate

Independent review and a fresh scene-only CI run are required. No browser execution occurred locally. Old f07 FAIL is not relabeled; new actual repeated scene is OPEN. Unknown warmup commits will continue to fail with raw evidence. No writes/getters were suppressed, reset, substituted or preseeded.
