# Runtime scene diagnostics review

Reviewed clean head `49616900044159eb2dfb370f715a3a8315f9f308` against base `6df4db58dc505b272fe365748b3f55b9c7780ff0` in `/workspace/scratch/150320e8a2fd/rollout-runtime-scene-diagnostics`. Exact scope is five QA/workflow files. Read final diff, report, actual6df failure log, tests/control implementation and final/identity/restore logs. No implementation edits or broad reruns were made.

**Code/spec result: C0 / I0.** No actionable critical or important issue. The patch retains failed scene diagnostics; it does not establish a working actual scene or a root cause.

## Spec and quality

- The callback retains the original240-frame bounds and all readiness predicates. Diagnostics observe initial fixture count, named phase, expected condition, before/last actor/resource snapshot, frames/timestamps and ready/timeout status. The snapshot records actual player/party/resident identity, positions, live/attachment state and live/holder/cache/GPU counters. It neither changes presentation selection nor resets the city presenter.
- Readiness failure now returns the partial result with original message/stack, phase and failed snapshot. Finally restores simulation step and region, records restoration errors, and retains save/storage/getter/write-count and restoration proofs. A recorded readiness or restoration error is rejected before the original complete-loop checks.
- Completed loops still require exactly three cycles, zero off/city live and holders, natural city2D, recovered forest actor count, holder/live balance, no fallback/template failure, six resource plateaus, created-minus-removed balance and unchanged saved state/storage/getter/write counts. No production or save behavior is changed.
- `retainRepeatedResult` attaches the raw result before validation. A failed validation writes `meguru-qa.json` with verdict.pass=false and then throws; there is no failure-to-PASS path. The phase console relay makes a timeout visible in CI before validation. Actual browser/callback transport failures outside the retained callback remain possible and are not represented as successful evidence.
- The combined explicit `[qa:runtime] [qa:scene]` condition skips only the existing browser production45 functional step. Scene and native metrics remain enabled, as does focused dedicated validation. Runtime alone and integration alone (including integration+scene without runtime) still request45. Existing runtime job exclusions continue to prevent source image, gallery, stage or other capture replay.
- Functional/save/animation/appearance code remains unchanged; all11 exported functions named in `runtime-scene-identity.log` retain exact6df function bytes. The exact diff changes no model, production registry, renderer/runtime, gameplay, save, World/Home, Expression or 2D files. Reusing source6df functional evidence is valid for these unchanged inputs and should continue to carry its original source provenance.

## Verification

Independent focused command:

```sh
node --test --test-reporter=tap tests/character-3d-runtime-scene-diagnostics-test.cjs
```

**4/4 PASS, 99.622772 ms.** These execute the actual extracted callback with declared synthetic renderer state, demonstrate a bounded warmup/on timeout with retained expected/actual composition and restoration, completed-loop behavior and strict city-live rejection, failed JSON persistence, and exact combined-marker step routing. They are QA-logic checks, not WebGL/browser evidence.

Reused worker24/24 PASS in2136.47612 ms, two assertion RED controls and restored focused GREEN. The controls remove readiness-error rejection or failed raw JSON persistence. Final helper SHA256 independently matches the restore log: `767f40542f49fe7a344abe7e15d0ceed2e58640b2dea4ce36b3092e4bfd343ff`. Diff check is clean; no template sweep or controls were replayed.

## Minor and open evidence

Minor wording correction: the report/test name describes rethrowing the original error. The implementation propagates `validateRepeated`'s readiness assertion; the original browser timeout message and stack remain in `checks.repeated.error` in the persisted raw result. This preserves the needed diagnostics and failure behavior.

The inspected actual6df log records all45 functional roles PASS, including Author, before the repeated-scene timeout. Its exact callback lines identify warmup characters-on, before entering city. This supplies no actual city-cleanup failure evidence. The stale baseline composition explanation is still a hypothesis; the patch deliberately preserves the fixture-count predicate for diagnosis.

**Actual scene/metrics gate OPEN.** The parent-owned combined-marker CI rerun must establish phase/composition, strict save/cleanup/cache results and later metrics. Source6df functional45 PASS remains separate evidence. This review claims neither an actual scene fix nor attribution of the earlier ae9 save failure. Existing source image approval is outside this QA change.
