# Runtime progression QA repair review

Reviewed clean head `116370ed5385b09e08bf2f5d17e9072ffc1a7edd` against `ae9c9ffe20ef945ddc8eed0f4a882d807ba92c4f` in `/workspace/scratch/150320e8a2fd/rollout-runtime-progression-fix`. Read the exact five-file diff, final report, tests/control implementation, original failure log and restored validation logs. No production or implementation edits were made during review.

**Code/spec result: C0 / I0.** No actionable critical or important finding in this diagnostic QA change. Actual browser failure resolution remains OPEN.

## Spec and quality

- Save observation stays read-only: the storage wrapper forwards every original call and records key/time/call stack. It does not suppress writes, replace the bridge getter, restore saved state to hide a change, or amend production code.
- Author staging has a synchronous boundary around entry, a wrapper around every staged draw, an explicit final-draw boundary, and a boundary around release. Each records state bytes, stored-save bytes, getter identity and write count before/after. The normal-role draw also gains storage checks. Same-value writes fail the counter check even when stored bytes match.
- Every proof, including a dirty proof or one from an action that throws, is recorded in finally. Aggregation requires every constituent to remain clean; validation independently examines constituents, so aggregate flags cannot forgive a dirty boundary. The boundary checks are deliberately synchronous. The recorded asynchronous span is separately labelled an observation, including deltas and save-call provenance, and does not claim whole-interval save invariance or independently establish that changes came from ordinary gameplay. A queued asynchronous effect cannot be attributed solely from the clean synchronous proof; its call stack/delta still requires diagnosis.
- The actual Author object, natural2D, source identity, stage0 live template, attachment and actor/pose/draw/step/list restoration gates remain. The original production full45 requirement is retained, with an independent synthetic missing-registration negative after all current roles have been promoted.
- The completed row is retained before validation. Validation errors store their error and propagate. Readiness/evaluation errors retain role, available boundaries, calls/deltas or an explicit diagnostic error. Failure-release errors are recorded alongside the primary failure or propagate if no primary failure exists. Passed, attempted and failing-role fields are distinct; any row/error/cleanup failure prevents a final PASS.
- `repeatScene`, strict city/off cleanup, warmed resource plateau and its whole-async save/storage/write check are unchanged. This patch neither resets the city presenter to manufacture cleanup nor relaxes the scene gate.
- `[qa:runtime]` enables only the existing `meguru-wave` and `dedicated` jobs. The existing Meguru integration commands request production full45 plus no-capture scene/performance checks; dedicated runs the runtime-specific tests and five changed-boundary controls. Other jobs, capture steps and broad mutation commands are excluded in this mode. The old conditions reduce to their prior behavior when the runtime marker is absent. No new jobs, images or capture routes were added.
- Exact changed paths are workflow, runtime-integration QA helper, its controls, one existing QA test, and the new save-boundary test. Production models/registrations/runtime/gameplay/renderer/save/World/Home/Expression/2D remain untouched.

## Verification

Independent focused command:

```sh
node --test --test-reporter=tap tests/character-3d-runtime-save-boundary-test.cjs
```

**6/6 PASS, 297.333824 ms.** Tests exercise actual normal `recordMapBits` progression and its queued save, the same real API called inside presentation as a rejected mutation, dirty state/write/getter checks, thrown-action proof retention, failing-row persistence, constituent rejection, and runtime-only routing (including mixed integration/nonplayer markers).

Reused worker final20/20 PASS in2151.170275 ms and five assertion RED controls with exact restore; no all45 template replay, mutation replay, full npm, browser or capture rerun performed. Controls remove state-byte checking, write-count checking, dirty-proof retention, failed-row retention or constituent checking. The final helper SHA256 independently matches the restore log: `6c6a288d4036501cb9d4d97c9a02e9fbe2e4b02fa8ccafe8e325d96525ac4c9e`. `git diff --check` is clean.

## Open evidence and minors

No blocking minor. The observed async span is diagnostic evidence, not attribution. The original `ae9c9ffe` CI failure reports only `unchanged save`; its role and causal delta are not available in the inspected raw log. The real record-API experiment establishes a plausible confounder, not the original failure's cause.

Actual promoted45 browser execution, synchronous Author proofs, failing-row/call-stack capture if a failure recurs, strict repeated scene result and performance measurements require the parent-owned `[qa:runtime]` CI run. No browser PASS or original-failure resolution is claimed by this review. Unchanged scene readiness exceptions can still prevent a returned repeated-scene diagnostic result; that existing limitation is explicitly documented and outside this bounded repair. Source image decisions remain separate.
