# Runtime scene baseline review

Reviewed clean head `c0f71010210d081344ea2f848e24bb9b31f6bd8c` against `aa03582df17b597c5fbe4fa663a0840941783880` in `/workspace/scratch/150320e8a2fd/rollout-runtime-scene-baseline`. Exact scope is three QA files: scene helper, its diagnostic tests and scoped controls. Read final diff/report/logs and the actual renderer/runtime eligibility code. No implementation edits, captures or broad reruns.

**Code/spec result: C0 / I0.** No critical or important finding. The correction establishes a ready QA baseline; actual city/cleanup/resource/save/metrics outcome remains OPEN.

## Spec and quality

- Production renderer eligibility is player and party always, plus residents strictly within1500 of the player (`meguru-3d.mjs`). The helper uses that same actor set from the current simulation view and actual production `runtime.actorInfo`, including the actual bridge player key. Resolved models must be exact; there is no stand-in, candidate overlay or invented model identity.
- The callback holds its existing QA simulation step, captures the current player position/yaw, explicitly draws that view and waits up to240 frames for the eligible count, exact role/model/stage composition, attached actors and matching scene-holder count. It does not freeze the initial partial live count, accept a greater-or-equal count, use an arbitrary sleep or assume one RAF finishes deferred builds. Nonexact model, duplicate or empty roster failure remains explicit; actors with no production3D lookup stay outside the3D roster, matching renderer behavior.
- Subsequent characters-on and forest phases require the same exact composition and holder/count readiness. Normal forest reconstruction is followed by the captured player position/yaw and normal party placement so the repeated view has the same eligibility context. Model IDs/stages and exact composition are retained in phase diagnostics. The stable diagnostic player key affects the report only; it does not mutate the actual player.
- `validateRepeated` independently compares the ready baseline and each cycle's on/forest composition. All previous three-cycle, off/city live0/holders0, natural city2D, forest recovery/balance, fallback0/failed-template0, six cache/GPU plateaus, created/removed/live, whole-interval save/storage/getter/write and restoration checks remain. Readiness and restoration errors still fail and retain diagnostics. No artificial city reset is introduced.
- The temporary browser actorInfo reference is loaded only for this scene probe and removed in finally. Functional/save/animation/appearance exports remain unchanged. The inspected diff plus the eleven-function identity audit preserve exact bytes relative to aa035 and6df, including functionalRun/validateFunctional, so existing6df45-role evidence remains source-scoped and separate.
- No production model, registration, runtime, renderer, gameplay/save, World/Home/Expression/2D, workflow, gallery or exporter file changes. Existing combined-marker routing and no-capture behavior remain.

## Verification

Independent focused command:

```sh
node --test --test-reporter=tap tests/character-3d-runtime-scene-diagnostics-test.cjs
```

**6/6 PASS, 124.733611 ms.** The actual extracted callback waits for declared deferred7→11 completion before recording baseline; the same-count wrong-template case times out. Existing retained-timeout, restore, failed JSON, city-cleanup rejection and marker checks still pass. These are synthetic QA-logic checks, not actual browser success.

Reused worker26/26 PASS, the two assertion RED controls and exact restore logs. The stale-count control substitutes initial7 for eligible count; the composition control removes the exact roster predicate. Both fail meaningful targeted tests and restore the helper. Final helper SHA256 independently matches `8673725a4e5bf6720ec294a2f8a965b9d063b01b9df12c9f2279f7123c6a343c`; `git diff --check` is clean. No all45 template sweep or control replay was needed.

## Evidence limits

No actionable minor. Actualaa035 diagnostics show expected7 versus live11/holders11 through240 frames, before city, without fallback/template failures. That establishes an unready old count baseline; it does not distinguish stale prior-view sampling from partial construction. This correction resolves that QA contract in focused tests.

The parent-owned browser rerun must still prove the actual ready eligible composition and later city cleanup, resource plateau, strict save invariance, lifecycle and native measurements. No later gate is assumed PASS, no actual scene fix is claimed from Node tests, and the original ae9 save-failure attribution remains separate. Source image recovery/approval is outside this review.
